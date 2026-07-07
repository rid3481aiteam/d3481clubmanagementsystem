import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user } } = await callerClient.auth.getUser(token)
  if (!user) return errorResponse('尚未登入或登入已過期', 401)

  const { data: currentClubId } = await callerClient.rpc('current_club_id')
  const { data: currentRole } = await callerClient.rpc('current_user_role')

  if (!currentClubId || !CLUB_TIER_ROLES.includes(currentRole)) {
    return errorResponse('沒有權限發送 LINE 通知', 403)
  }

  const { message } = await req.json()
  if (!message || typeof message !== 'string' || !message.trim()) {
    return errorResponse('請輸入訊息內容', 400)
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: channel } = await adminClient
    .from('club_notification_channels')
    .select('line_channel_access_token')
    .eq('club_id', currentClubId)
    .maybeSingle()

  if (!channel?.line_channel_access_token) {
    return errorResponse('尚未設定 LINE 頻道存取權杖，請先到「LINE 通知設定」頁面填入', 400)
  }

  const { data: bindings } = await adminClient
    .from('line_bindings')
    .select('line_user_id')
    .eq('club_id', currentClubId)

  const userIds = (bindings ?? []).map((b) => b.line_user_id as string)
  if (!userIds.length) {
    return errorResponse('目前還沒有社友完成 LINE 綁定，無法發送', 400)
  }

  // LINE multicast 一次最多 500 人，這是展示用途先只送第一批，正式量大再分批處理
  const lineResponse = await fetch('https://api.line.me/v2/bot/message/multicast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${channel.line_channel_access_token}`,
    },
    body: JSON.stringify({
      to: userIds.slice(0, 500),
      messages: [{ type: 'text', text: message.trim() }],
    }),
  })

  if (!lineResponse.ok) {
    const errText = await lineResponse.text()
    return errorResponse(`LINE 發送失敗（HTTP ${lineResponse.status}）：${errText}`, 502)
  }

  return new Response(JSON.stringify({ success: true, sent_to: userIds.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
