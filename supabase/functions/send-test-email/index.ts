import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

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

// denomailer 對 Subject 的 RFC 2047 編碼有 bug：超過約 74 個編碼字元（中文約 8 個字）
// 就整個截斷、不做正確的 header folding，導致收件端顯示成沒解碼的原始 MIME 亂碼
// （見 https://github.com/EC-Nordbund/denomailer/issues/90，這支函式固定的測試信主旨
// 中文字數也會超過這個門檻，一樣會中招）。這裡自己正確實作 RFC 2047 多段
// encoded-word + header folding，直接把編碼好的結果傳給 denomailer；開頭刻意加一個
// 空白字元，是因為 denomailer 的 quotedPrintableEncodeInline() 只要偵測到字串
// 「以 =? 開頭」就會誤判成「已經編碼過」再整包錯誤地重新編碼一次——加這個空白能讓它
// 判斷成「不需要編碼」而原樣送出，等於繞過那個 bug。跟 notify-meeting-created 裡同一支
// 函式重複貼一份，是因為這個專案的 Edge Function 目前都是各自獨立部署、沒有共用程式碼
// 的機制（沒有 `_shared` 資料夾）。
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
    return errorResponse('沒有權限測試 Email 通知', 403)
  }

  const { to_email } = await req.json()
  if (!to_email || typeof to_email !== 'string' || !to_email.trim()) {
    return errorResponse('請輸入收件 Email', 400)
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: channel } = await adminClient
    .from('club_notification_channels')
    .select('email_from, email_app_password')
    .eq('club_id', currentClubId)
    .maybeSingle()

  if (!channel?.email_from || !channel?.email_app_password) {
    return errorResponse('尚未設定 Gmail 帳號／應用程式密碼，請先在上方儲存憑證', 400)
  }

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

  try {
    await client.send({
      from: channel.email_from,
      to: to_email.trim(),
      subject: encodeSubjectHeader('【測試信】D3481 社務管理平台 Email 通知設定'),
      content: 'auto',
      html: '<p>這是一封測試信，如果您收到這封信，代表本社的 Email 通知設定正確可以正常寄信。</p>',
    })
  } catch (err) {
    return errorResponse(
      `寄送失敗，請確認 Gmail 帳號與應用程式密碼是否正確：${err instanceof Error ? err.message : String(err)}`,
      502,
    )
  } finally {
    try {
      await client.close()
    } catch {
      // 連線關閉失敗不影響寄信結果
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
