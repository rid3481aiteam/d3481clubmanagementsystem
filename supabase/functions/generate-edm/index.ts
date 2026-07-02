import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CLUB_TIER_ROLES = ['club_admin', 'club_secretary']

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') return errorResponse('不支援的請求方法', 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return errorResponse('尚未登入或登入已過期', 401)

  const token = authHeader.replace('Bearer ', '')

  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  })
  const { data: { user } } = await callerClient.auth.getUser(token)
  if (!user) return errorResponse('尚未登入或登入已過期', 401)

  const { data: callerProfile } = await callerClient
    .from('user_profiles')
    .select('role, club_id, district_access')
    .eq('id', user.id)
    .single()

  if (!callerProfile) return errorResponse('找不到使用者資料', 403)

  const { scope, topic, key_points, tone } = await req.json()

  if (scope !== 'district' && scope !== 'club') return errorResponse('scope 參數不正確', 400)
  if (!topic || typeof topic !== 'string' || !topic.trim()) return errorResponse('請輸入主題', 400)

  const isDistrictAdmin = callerProfile.role === 'district_admin' || callerProfile.district_access === true
  const isClubTier = CLUB_TIER_ROLES.includes(callerProfile.role)

  if (scope === 'district' && !isDistrictAdmin) return errorResponse('沒有權限產生地區 EDM', 403)
  if (scope === 'club' && !isClubTier) return errorResponse('沒有權限產生社內 EDM', 403)

  let clubName: string | null = null
  if (scope === 'club') {
    const { data: club } = await callerClient
      .from('clubs')
      .select('name')
      .eq('id', callerProfile.club_id)
      .single()
    clubName = club?.name ?? null
  }

  const audienceLabel = scope === 'district' ? '國際扶輪3481地區全體社友' : `${clubName ?? '本社'}社友`
  const toneLabel = (typeof tone === 'string' && tone.trim()) || '正式且溫暖'
  const keyPointsText = (typeof key_points === 'string' && key_points.trim()) || '（無補充重點，請依主題合理發揮）'

  const prompt = `你是國際扶輪3481地區的公關文案助手，請根據以下資訊撰寫一封 EDM（電子報/通知信）文案，對象是${audienceLabel}，語氣${toneLabel}。

主題：${topic}
重點內容：
${keyPointsText}

請輸出 JSON，包含：
- title：一句吸引人的信件標題
- body：信件正文，繁體中文，適合直接複製貼上或轉成 PDF 使用，開頭可有簡短問候語，結尾可有簡短署名（例如「國際扶輪3481地區」或「${clubName ?? '本社'}」），不要使用 Markdown 語法。`

  const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              body: { type: 'string' },
            },
            required: ['title', 'body'],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!anthropicResponse.ok) {
    const errText = await anthropicResponse.text()
    console.error('Anthropic API error', anthropicResponse.status, errText)
    return errorResponse('AI 服務暫時無法使用，請稍後再試', 502)
  }

  const result = await anthropicResponse.json()
  const textBlock = (result.content ?? []).find((b: { type: string }) => b.type === 'text')
  if (!textBlock) return errorResponse('AI 未回傳內容，請重試', 502)

  let parsed: { title: string; body: string }
  try {
    parsed = JSON.parse(textBlock.text)
  } catch {
    return errorResponse('AI 回傳格式錯誤，請重試', 502)
  }

  return new Response(JSON.stringify(parsed), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
