import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL')!

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

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
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
    return errorResponse('沒有權限發送例會通知', 403)
  }

  const { meeting_id } = await req.json()
  if (!meeting_id) return errorResponse('缺少 meeting_id', 400)

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: meeting } = await adminClient
    .from('meetings')
    .select('*')
    .eq('id', meeting_id)
    .single()

  if (!meeting) return errorResponse('找不到這場例會', 404)
  if (meeting.club_id !== currentClubId) return errorResponse('只能發送本社例會的通知', 403)

  const { data: club } = await adminClient
    .from('clubs')
    .select('name')
    .eq('id', meeting.club_id)
    .single()

  const { data: members } = await adminClient
    .from('roster')
    .select('name, email')
    .eq('club_id', meeting.club_id)
    .eq('member_status', 'normal')

  const allMembers = members ?? []
  const recipients = allMembers.filter((m) => m.email && m.email.trim())

  if (!recipients.length) {
    return new Response(
      JSON.stringify({
        success: true,
        sent: 0,
        skipped_no_email: allMembers.length,
        message: '本社名冊裡沒有登記 Email 的社友，未發送任何通知',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const clubName = club?.name ?? '本社'
  const dateLabel = new Date(meeting.date).toLocaleDateString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long',
  })

  const subjectParts = [`【${clubName}】例會通知`]
  if (meeting.session_no) subjectParts.push(`第${meeting.session_no}次`)
  subjectParts.push(dateLabel)
  const subject = subjectParts.join(' ')

  const detailLines = [
    `日期：${dateLabel}`,
    meeting.title ? `主題：${escapeHtml(meeting.title)}` : null,
    meeting.speaker_name
      ? `講師：${escapeHtml(meeting.speaker_name)}${meeting.speaker_title ? `（${escapeHtml(meeting.speaker_title)}）` : ''}`
      : null,
    meeting.venue ? `地點：${escapeHtml(meeting.venue)}` : null,
    meeting.note ? `備註：${escapeHtml(meeting.note)}` : null,
  ].filter((line): line is string => !!line)

  const html = `
    <p>親愛的社友，您好：</p>
    <p>${escapeHtml(clubName)}新增了一場例會，詳情如下：</p>
    <p>${detailLines.join('<br>')}</p>
    <p>國際扶輪 3481 地區</p>
  `

  // Resend batch API 一次最多 100 封，分批送
  const batches: (typeof recipients)[] = []
  for (let i = 0; i < recipients.length; i += 100) batches.push(recipients.slice(i, i + 100))

  let sent = 0
  const batchErrors: string[] = []

  for (const batch of batches) {
    const payload = batch.map((m) => ({
      from: RESEND_FROM_EMAIL,
      to: [m.email],
      subject,
      html,
    }))

    const resendResponse = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!resendResponse.ok) {
      const errText = await resendResponse.text()
      batchErrors.push(`HTTP ${resendResponse.status}：${errText}`)
      continue
    }
    sent += batch.length
  }

  if (sent === 0 && batchErrors.length) {
    return errorResponse(`寄信失敗：${batchErrors.join('; ')}`, 502)
  }

  return new Response(
    JSON.stringify({
      success: true,
      sent,
      skipped_no_email: allMembers.length - recipients.length,
      partial_errors: batchErrors.length ? batchErrors : undefined,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
