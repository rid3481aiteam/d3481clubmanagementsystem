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
    .select('role, club_id, district_role')
    .eq('id', user.id)
    .single()

  if (!callerProfile) return errorResponse('找不到使用者資料', 403)

  const { scope, topic, key_points, tone } = await req.json()

  if (scope !== 'district' && scope !== 'club') return errorResponse('scope 參數不正確', 400)
  if (!topic || typeof topic !== 'string' || !topic.trim()) return errorResponse('請輸入主題', 400)

  // 地區唯讀（第3級）跟地區管理員（第4級）都能用 EDM 產生器
  const isDistrictViewer = callerProfile.role === 'district_admin' || ['view', 'admin'].includes(callerProfile.district_role)
  const isClubTier = CLUB_TIER_ROLES.includes(callerProfile.role)

  if (scope === 'district' && !isDistrictViewer) return errorResponse('沒有權限產生地區 EDM', 403)
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

  // 每社每日上限 2 次（僅限 scope='club'，地區不受限）：用台北時區的「今天」計算區間，
  // 只算成功產生過的次數，失敗/被擋掉的請求不計入。
  if (scope === 'club') {
    const now = new Date()
    const taipeiNow = new Date(now.getTime() + 8 * 60 * 60 * 1000)
    const startTaipeiUtcMs = Date.UTC(
      taipeiNow.getUTCFullYear(),
      taipeiNow.getUTCMonth(),
      taipeiNow.getUTCDate(),
    ) - 8 * 60 * 60 * 1000
    const dayStart = new Date(startTaipeiUtcMs).toISOString()
    const dayEnd = new Date(startTaipeiUtcMs + 24 * 60 * 60 * 1000).toISOString()

    const { count, error: countError } = await callerClient
      .from('edm_generations')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', callerProfile.club_id)
      .gte('created_at', dayStart)
      .lt('created_at', dayEnd)

    if (countError) {
      console.error('edm_generations count error', countError)
      return errorResponse('查詢今日使用次數失敗，請稍後再試', 502)
    }
    if ((count ?? 0) >= 2) {
      return errorResponse('本社今日 EDM 產生次數已達上限（每日 2 次），請明天再試', 429)
    }
  }

  const audienceLabel = scope === 'district' ? '國際扶輪3481地區全體社友' : `${clubName ?? '本社'}社友`
  const toneLabel = (typeof tone === 'string' && tone.trim()) || '正式且溫暖'
  const keyPointsText = (typeof key_points === 'string' && key_points.trim()) || '（無補充重點，請依主題合理發揮）'

  const prompt = `你是國際扶輪3481地區的社群小編，請根據以下資訊撰寫一則 Facebook 貼文行銷文案，對象是${audienceLabel}，語氣${toneLabel}。

主題：${topic}
重點內容：
${keyPointsText}

請輸出 JSON，包含：
- title：一句吸引人的開頭金句，可留空字串（貼文不一定需要獨立標題）
- body：貼文正文，繁體中文，控制在 100～150 字以內，適合直接貼到 Facebook 使用，可適度使用表情符號增加親和力，結尾可附 1～3 個相關 hashtag，不要使用 Markdown 語法。`

  const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 600,
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
    // 把 Anthropic 回傳的實際錯誤類型/訊息帶回前端，方便診斷（api key 本身不會出現在錯誤內容裡）
    let detail = errText
    try {
      const parsedErr = JSON.parse(errText)
      if (parsedErr?.error?.message) detail = `${parsedErr.error.type ?? ''} ${parsedErr.error.message}`.trim()
    } catch {
      // 不是 JSON，維持原始文字
    }
    return errorResponse(`AI 服務暫時無法使用（HTTP ${anthropicResponse.status}：${detail}）`, 502)
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

  if (scope === 'club') {
    const { error: logError } = await callerClient
      .from('edm_generations')
      .insert({ club_id: callerProfile.club_id, user_id: user.id, scope })
    if (logError) console.error('edm_generations insert error', logError)
  }

  return new Response(JSON.stringify(parsed), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
