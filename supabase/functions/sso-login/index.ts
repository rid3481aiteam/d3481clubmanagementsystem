import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ROTARYSSO_CLIENT_ID = Deno.env.get('ROTARYSSO_CLIENT_ID')!
const ROTARYSSO_CLIENT_SECRET = Deno.env.get('ROTARYSSO_CLIENT_SECRET')!

const ROTARYSSO_ISSUER = 'https://rotarysso.vercel.app'
const DISTRICT_ADMIN_ACCOUNT_TYPE = '管理者'
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

interface RotarySsoUserInfo {
  sub: string
  email: string
  name?: string
  rotary_club?: string
  rotary_district?: string
  account_type?: string
}

// 全新帳號（case 3）建立後，寄信通知地區管理員有人在等審核。刻意整包包在
// try/catch 裡呼叫（見下方呼叫處），寄信失敗（Gmail 憑證還沒設定、沒開
// M1 flag、SMTP 出錯…）都不能擋到使用者本人的登入流程，最多在 log 留一筆。
async function notifyDistrictAdminsOfPendingAccount(
  adminClient: ReturnType<typeof createClient>,
  info: RotarySsoUserInfo,
) {
  const { data: flag } = await adminClient
    .from('feature_flags')
    .select('enabled')
    .is('club_id', null)
    .eq('feature_key', 'M1_pending_account_notify')
    .maybeSingle()
  if (!flag?.enabled) return

  const { data: channel } = await adminClient
    .from('district_notification_channel')
    .select('email_from, email_app_password, notify_to')
    .eq('id', 'default')
    .maybeSingle()
  if (!channel?.email_from || !channel?.email_app_password || !channel?.notify_to) return

  // notify_to 是地區管理員在設定頁自己填的指定收件人（逗號分隔），不是系統動態
  // 判斷「誰是地區管理員」——使用者明確要求發給指定人就好，不用整批地區管理員都收到。
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const recipientEmails = channel.notify_to
    .split(',')
    .map((e: string) => e.trim())
    .filter((e: string) => EMAIL_RE.test(e))
  if (!recipientEmails.length) return

  const applicantName = info.name || info.email
  const subject = encodeSubjectHeader(`【D3481】有新的 RotarySSO 帳號待審核（${applicantName}）`)
  const detailLines = [
    `申請人：${escapeHtml(applicantName)}（${escapeHtml(info.email)}）`,
    `SSO 自稱社別：${escapeHtml(info.rotary_club || '未提供')}`,
    `扶輪地區：${escapeHtml(info.rotary_district || '未提供')}`,
    `扶輪身分別：${escapeHtml(info.account_type || '未提供')}`,
  ]
  const html = `
    <p>您好：</p>
    <p>有人剛透過 RotarySSO 登入本平台，正在等待指派社別／審核角色：</p>
    <p>${detailLines.join('<br>')}</p>
    <p>請到「帳號管理」頁審核：<a href="${SITE_URL}/club/invite">${SITE_URL}/club/invite</a></p>
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
    for (const email of recipientEmails) {
      await client.send({ from: channel.email_from, to: email, subject, mimeContent })
    }
  } finally {
    try {
      await client.close()
    } catch {
      // 連線關閉失敗不影響已經送出的信件結果
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') return errorResponse('不支援的請求方法', 405)

  const { code, redirect_uri } = await req.json()
  if (!code || !redirect_uri) return errorResponse('缺少授權碼', 400)

  const tokenResp = await fetch(`${ROTARYSSO_ISSUER}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri,
      client_id: ROTARYSSO_CLIENT_ID,
      client_secret: ROTARYSSO_CLIENT_SECRET,
    }),
  })

  if (!tokenResp.ok) {
    const body = await tokenResp.text()
    console.error('RotarySSO token exchange failed:', tokenResp.status, body)
    return errorResponse('登入驗證失敗，請重新登入', 400)
  }

  const { access_token } = await tokenResp.json()

  const userinfoResp = await fetch(`${ROTARYSSO_ISSUER}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${access_token}` },
  })

  if (!userinfoResp.ok) {
    console.error('RotarySSO userinfo failed:', userinfoResp.status, await userinfoResp.text())
    return errorResponse('無法取得扶輪帳號資料', 400)
  }

  const info = await userinfoResp.json() as RotarySsoUserInfo
  if (!info.sub || !info.email) return errorResponse('扶輪帳號缺少必要資料', 400)

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const districtRolePatch = info.account_type === DISTRICT_ADMIN_ACCOUNT_TYPE
    ? { district_role: 'admin' }
    : {}

  // 1. 這個 sso_sub 之前登入過，已經連結過本地帳號
  const { data: linkedProfile } = await adminClient
    .from('user_profiles')
    .select('id')
    .eq('sso_sub', info.sub)
    .maybeSingle()

  let targetUserId: string

  if (linkedProfile) {
    targetUserId = linkedProfile.id
    const { error } = await adminClient
      .from('user_profiles')
      .update({
        name: info.name,
        sso_account_type: info.account_type,
        sso_rotary_club: info.rotary_club,
        sso_rotary_district: info.rotary_district,
        ...districtRolePatch,
      })
      .eq('id', targetUserId)
    if (error) return errorResponse(error.message, 500)
  } else {
    // 2. 第一次用 SSO 登入，先看這個 email 是不是既有帳號（社長／執秘多半
    // 用真實 email 註冊過），有的話直接銜接，保留原本的 club_id/role，
    // 不會因為改用 SSO 登入就變成待審核。
    const { data: existingUserId, error: lookupError } = await adminClient.rpc(
      'find_user_id_by_email',
      { p_email: info.email }
    )
    if (lookupError) return errorResponse(lookupError.message, 500)

    if (existingUserId) {
      targetUserId = existingUserId
      const { error } = await adminClient
        .from('user_profiles')
        .update({
          sso_sub: info.sub,
          sso_account_type: info.account_type,
          sso_rotary_club: info.rotary_club,
          sso_rotary_district: info.rotary_district,
          ...districtRolePatch,
        })
        .eq('id', targetUserId)
      if (error) return errorResponse(error.message, 500)
    } else {
      // 3. 全新帳號：club_id 一律留空，交給地區管理員在「帳號管理」頁
      // 手動指派社別，不自動用 rotary_club 文字比對 clubs.name。
      const { data: created, error } = await adminClient.auth.admin.createUser({
        email: info.email,
        email_confirm: true,
        user_metadata: {
          name: info.name,
          sso_sub: info.sub,
          sso_account_type: info.account_type,
          sso_rotary_club: info.rotary_club,
          sso_rotary_district: info.rotary_district,
        },
      })
      if (error) {
        const message = error.message.includes('already been registered')
          ? '此 Email 已經有帳號，請聯絡地區管理員協助處理'
          : error.message
        return errorResponse(message, 400)
      }
      targetUserId = created.user.id

      try {
        await notifyDistrictAdminsOfPendingAccount(adminClient, info)
      } catch (notifyErr) {
        console.error('notifyDistrictAdminsOfPendingAccount failed:', notifyErr)
      }
    }
  }

  const { data: link, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: info.email,
  })
  if (linkError) return errorResponse(linkError.message, 500)

  return new Response(
    JSON.stringify({ email: info.email, token_hash: link.properties.hashed_token }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
