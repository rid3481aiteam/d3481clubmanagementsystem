import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// 跟 invite-user/index.ts 用同一個正式站網址
const SITE_URL = 'https://d3481clubmanagementsystem.pages.dev'

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

// denomailer 對 Subject 的 RFC 2047 編碼有 bug：超過約 74 個編碼字元（中文約 8 個字）
// 就整個截斷、不做正確的 header folding，導致收件端（實測 Gmail、Outlook 都會）整封信
// 顯示成沒解碼的原始 MIME 亂碼（見 https://github.com/EC-Nordbund/denomailer/issues/90）。
// 我們的主旨（社名＋場次＋日期）幾乎一定會超過這個長度，沒辦法靠縮短內容繞開。
// 這裡自己正確實作 RFC 2047 多段 encoded-word + header folding，直接把編碼好的結果
// 傳給 denomailer；開頭刻意加一個空白字元，是因為 denomailer 的
// quotedPrintableEncodeInline() 只要偵測到字串「以 =? 開頭」就會誤判成「已經編碼過」
// 再整包錯誤地重新編碼一次——加這個空白能讓它判斷成「不需要編碼」而原樣送出，等於
// 繞過那個 bug，不用改動/替換整個寄信套件。
function encodeSubjectHeader(subject: string): string {
  const MAX_PAYLOAD = 60 // 保守值，含 "=?utf-8?Q?" 跟 "?=" 頭尾後仍在 RFC 2047 建議的 75 字元單段上限內
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

// denomailer 內建的 quoted-printable 內文編碼（透過 content/html 參數觸發）也有 bug：
// 每 74 字元強制切一次軟換行時，最後一段沒有處理「切點剛好落在某個字的 =XX=XX=XX
// 位元組序列中間」的狀況，會直接把沒切完的那幾個位元組憑空弄丟，導致內文某個字被
// 腰斬（親身重現過：範本裡的「國際扶輪」被弄丟一個位元組變成「國際e6輪」）。這裡
// 自己正確實作（每個字當一個不可切割的單位再包裝成軟換行行），透過 SendConfig 的
// mimeContent 直接把編碼好的內容交給 denomailer（denomailer 對 mimeContent 只會原封
// 不動寫到 SMTP DATA 裡，不會再處理一次），繞過它內建、有問題的編碼路徑。
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
    // 行尾如果剛好是空白/tab，要編碼成 =20/=09，避免被某些 SMTP relay 沿路修剪掉
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

  const { meeting_id, roster_ids, extra_emails } = await req.json()
  if (!meeting_id) return errorResponse('缺少 meeting_id', 400)

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: meeting } = await adminClient
    .from('meetings')
    .select('*')
    .eq('id', meeting_id)
    .single()

  if (!meeting) return errorResponse('找不到這場例會', 404)
  if (meeting.club_id !== currentClubId) return errorResponse('只能發送本社例會的通知', 403)

  const { data: channel } = await adminClient
    .from('club_notification_channels')
    .select('email_from, email_app_password')
    .eq('club_id', meeting.club_id)
    .maybeSingle()

  if (!channel?.email_from || !channel?.email_app_password) {
    return errorResponse('尚未設定本社 Gmail 寄信帳號，請先到「Email 通知設定」頁面設定', 400)
  }

  const { data: club } = await adminClient
    .from('clubs')
    .select('name')
    .eq('id', meeting.club_id)
    .single()

  // roster_ids 有帶（不管是不是空陣列）代表前端用勾選名單指定收件人；
  // 沒帶（undefined）維持舊行為＝發給本社全部有 Email 的正常社友。帶空陣列時完全
  // 不查名冊（等同「不發給任何社友」），是否還有信可寄要看下面的 extra_emails。
  let allMembers: { id: string; name: string | null; email: string | null }[] = []
  if (!Array.isArray(roster_ids) || roster_ids.length) {
    let membersQuery = adminClient
      .from('roster')
      .select('id, name, email')
      .eq('club_id', meeting.club_id)
      .eq('member_status', 'normal')
    if (Array.isArray(roster_ids)) membersQuery = membersQuery.in('id', roster_ids)
    const { data: members } = await membersQuery
    allMembers = members ?? []
  }
  const rosterRecipients = allMembers.filter((m) => m.email && m.email.trim())

  // 使用者手動加的非社友收件人（例如來賓、講師），簡單驗證格式、去掉跟社友清單重複
  // 的地址（避免同一人收到兩封），caller 已經確認是本社 club_admin/club_secretary，
  // 不用像 roster_ids 那樣限制「一定要屬於本社」——本來就是使用者自己手動輸入的。
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const rosterEmailSet = new Set(rosterRecipients.map((m) => (m.email as string).trim().toLowerCase()))
  const extraEmails = Array.isArray(extra_emails)
    ? Array.from(new Set(
        (extra_emails as unknown[])
          .map((e) => (typeof e === 'string' ? e.trim() : ''))
          .filter((e) => e && EMAIL_RE.test(e) && !rosterEmailSet.has(e.toLowerCase())),
      ))
    : []

  const recipientEmails = [...rosterRecipients.map((m) => m.email as string), ...extraEmails]

  if (!recipientEmails.length) {
    return new Response(
      JSON.stringify({
        success: true,
        sent: 0,
        skipped_no_email: allMembers.length - rosterRecipients.length,
        message: Array.isArray(roster_ids) && !roster_ids.length
          ? '未勾選任何收件人，未發送通知信'
          : '本社名冊裡沒有登記 Email 的社友，未發送任何通知',
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
  const subject = encodeSubjectHeader(subjectParts.join(' '))

  // 對應的活動列（DB trigger 在新增例會時自動建立）用來組報名/回覆的連結
  const { data: activity } = await adminClient
    .from('activities')
    .select('id')
    .eq('meeting_id', meeting.id)
    .maybeSingle()
  const rsvpUrl = activity ? `${SITE_URL}/activities/${activity.id}` : SITE_URL

  const detailLines = [
    meeting.session_no ? `場次：第 ${meeting.session_no} 次` : null,
    `日期：${dateLabel}`,
    meeting.title ? `主題：${escapeHtml(meeting.title)}` : null,
    meeting.speaker_name
      ? `講師：${escapeHtml(meeting.speaker_name)}${meeting.speaker_title ? `（${escapeHtml(meeting.speaker_title)}）` : ''}`
      : null,
    meeting.speaker_phone ? `講師電話：${escapeHtml(meeting.speaker_phone)}` : null,
    meeting.speaker_email ? `講師 Email：${escapeHtml(meeting.speaker_email)}` : null,
    meeting.venue ? `地點：${escapeHtml(meeting.venue)}` : null,
    meeting.note ? `備註：${escapeHtml(meeting.note)}` : null,
  ].filter((line): line is string => !!line)

  const html = `
    <p>親愛的社友，您好：</p>
    <p>${escapeHtml(clubName)}新增了一場例會，詳情如下：</p>
    <p>${detailLines.join('<br>')}</p>
    <p>回覆是否參加：<a href="${rsvpUrl}">${rsvpUrl}</a></p>
  `
  // denomailer 的 text:'auto' 也是走同一個有 bug 的內文編碼，這裡自己比照它的 tag-strip
  // 規則產生純文字版本，一樣用 quotedPrintableEncodeBody() 編碼
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
      auth: {
        username: channel.email_from,
        password: channel.email_app_password,
      },
    },
  })

  let sent = 0
  const sendErrors: string[] = []

  for (const email of recipientEmails) {
    try {
      await client.send({
        from: channel.email_from,
        to: email,
        subject,
        mimeContent,
      })
      sent++
    } catch (err) {
      sendErrors.push(`${email}：${err instanceof Error ? err.message : String(err)}`)
    }
  }

  try {
    await client.close()
  } catch {
    // 連線關閉失敗不影響已經送出的信件結果
  }

  if (sent === 0 && sendErrors.length) {
    return errorResponse(`寄信失敗：${sendErrors[0]}`, 502)
  }

  return new Response(
    JSON.stringify({
      success: true,
      sent,
      skipped_no_email: allMembers.length - rosterRecipients.length,
      extra_sent: extraEmails.length,
      partial_errors: sendErrors.length ? sendErrors : undefined,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
