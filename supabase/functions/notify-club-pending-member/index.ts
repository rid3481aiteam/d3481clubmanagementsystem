import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// 跟 invite-user/notify-meeting-created 用同一個正式站網址
const SITE_URL = 'https://d3481clubmanagementsystem.pages.dev'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function jsonResponse(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// denomailer 對 Subject 的 RFC 2047 編碼有 bug（見 send-test-email/notify-meeting-created
// 同一支函式開頭的說明），這裡自己正確實作再交給 denomailer，繞過那個 bug。跟其他寄信
// Edge Function 重複貼一份，是因為這個專案的 Edge Function 目前都是各自獨立部署、沒有
// 共用程式碼的機制（沒有 `_shared` 資料夾）。
function encodeSubjectHeader(subject: string): string {
  const MAX_PAYLOAD = 60
  const units: string[] = []
  for (const ch of subject) {
    let unit = ''
    for (const byte of new TextEncoder().encode(ch)) {
      if (byte === 0x20) {
        unit += '_'
      } else if (byte >= 0x21 && byte <= 0x7e && byte !== 0x3d && byte !== 0x3f && byte !== 0x5f) {
        unit += String.fromCharCode(byte)
      } else {
        unit += '=' + byte.toString(16).toUpperCase().padStart(2, '0')
      }
    }
    units.push(unit)
  }

  const words: string[] = []
  let current = ''
  for (const unit of units) {
    if (current && current.length + unit.length > MAX_PAYLOAD) {
      words.push(current)
      current = unit
    } else {
      current += unit
    }
  }
  if (current) words.push(current)

  return ' ' + words.map((w) => `=?utf-8?Q?${w}?=`).join('\r\n ')
}

// denomailer 內建的 quoted-printable 內文編碼也有 bug（同上，見其他寄信 Edge Function
// 開頭的說明），這裡自己正確實作，透過 SendConfig 的 mimeContent 繞過它內建、有問題的
// 編碼路徑。
function quotedPrintableEncodeBody(text: string): string {
  const LINE_MAX = 74
  const rawLines = text.split(/\r\n|\n/)
  const outLines: string[] = []

  for (const rawLine of rawLines) {
    const units: string[] = []
    for (const ch of rawLine) {
      const bytes = Array.from(new TextEncoder().encode(ch))
      if (
        bytes.length === 1 &&
        bytes[0] !== 0x3d &&
        ((bytes[0] >= 0x20 && bytes[0] <= 0x7e) || bytes[0] === 0x09)
      ) {
        units.push(String.fromCharCode(bytes[0]))
      } else {
        units.push(bytes.map((b) => '=' + b.toString(16).toUpperCase().padStart(2, '0')).join(''))
      }
    }
    if (units.length) {
      const last = units[units.length - 1]
      if (last === ' ') units[units.length - 1] = '=20'
      else if (last === '\t') units[units.length - 1] = '=09'
    }

    let current = ''
    for (const unit of units) {
      if (current.length + unit.length > LINE_MAX - 1) {
        outLines.push(current + '=')
        current = ''
      }
      current += unit
    }
    outLines.push(current)
  }

  return outLines.join('\r\n')
}

// 地區管理員在「帳號審核」把社友申請「發送」轉交給某社後呼叫。這封信是
// 錦上添花，不是主要通知管道——該社「進階設定」的 pendingCount 紅色徽章
// 才是保底的通知（不管這支函式成不成功都會顯示）。四個條件（M1 開關、
// 地區 Gmail 憑證、該社 account_notify_email、找得到申請人）缺一個就
// 靜靜跳過，回傳 sent:false 但仍是 200，呼叫端（accounts.ts forwardToClub）
// 本來就不看這支函式的結果，寄不寄都不影響「發送」本身有沒有成功。
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

  const { data: callerProfile } = await callerClient
    .from('user_profiles')
    .select('role, district_role')
    .eq('id', user.id)
    .single()

  const isDistrictAdmin = callerProfile?.role === 'district_admin' || callerProfile?.district_role === 'admin'
  if (!isDistrictAdmin) return errorResponse('只有地區管理員可以執行此操作', 403)

  const { user_id, club_id } = await req.json()
  if (!user_id || !club_id) return errorResponse('缺少必要參數', 400)

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: flag } = await adminClient
    .from('feature_flags')
    .select('enabled')
    .is('club_id', null)
    .eq('feature_key', 'M1_pending_account_notify')
    .maybeSingle()
  if (!flag?.enabled) return jsonResponse({ success: true, sent: false, reason: 'flag_off' })

  const { data: channel } = await adminClient
    .from('district_notification_channel')
    .select('email_from, email_app_password')
    .eq('id', 'default')
    .maybeSingle()
  if (!channel?.email_from || !channel?.email_app_password) {
    return jsonResponse({ success: true, sent: false, reason: 'no_channel' })
  }

  const { data: clubRow } = await adminClient
    .from('clubs')
    .select('name, account_notify_email')
    .eq('id', club_id)
    .maybeSingle()
  if (!clubRow?.account_notify_email) return jsonResponse({ success: true, sent: false, reason: 'no_club_email' })

  const { data: applicant } = await adminClient
    .from('user_profiles')
    .select('name')
    .eq('id', user_id)
    .maybeSingle()
  const applicantName = applicant?.name || '(未知姓名)'

  const subject = encodeSubjectHeader(`【${clubRow.name}】有社友申請加入，請審核`)
  const html = `
    <p>您好：</p>
    <p>${escapeHtml(applicantName)} 申請加入 ${escapeHtml(clubRow.name)}，已由地區轉交，請到「帳號管理」審核角色：</p>
    <p><a href="${SITE_URL}/club/invite">${SITE_URL}/club/invite</a></p>
  `
  const plainText = html.replace(/<[^>]+>/g, '')
  const mimeContent = [
    { mimeType: 'text/plain; charset="utf-8"', content: quotedPrintableEncodeBody(plainText), transferEncoding: 'quoted-printable' },
    { mimeType: 'text/html; charset="utf-8"', content: quotedPrintableEncodeBody(html), transferEncoding: 'quoted-printable' },
  ]

  const client = new SMTPClient({
    connection: {
      hostname: 'smtp.gmail.com',
      port: 465,
      tls: true,
      auth: { username: channel.email_from, password: channel.email_app_password },
    },
  })

  try {
    await client.send({ from: channel.email_from, to: clubRow.account_notify_email, subject, mimeContent })
  } finally {
    try {
      await client.close()
    } catch {
      // 連線關閉失敗不影響已經送出的信件結果
    }
  }

  return jsonResponse({ success: true, sent: true })
})
