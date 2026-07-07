import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// 這支 function 是給 LINE 平台直接呼叫的公開 webhook，部署時要加 --no-verify-jwt
// （LINE 不會帶 Supabase 的 Authorization JWT），改用 x-line-signature 驗證來源。
// 每個社的 Channel Secret 存在 club_notification_channels，用網址上的 ?club= 決定要用哪組。

const BIND_HELP_TEXT = '請直接輸入你在社友名冊登記的手機號碼（例如 0912345678）進行綁定。'
const WELCOME_TEXT = '歡迎加入！請直接輸入你在社友名冊登記的手機號碼，完成綁定後就能收到本社的活動/例會通知。（這是測試中的功能，僅供展示用）'

function normalizePhone(value: string | null | undefined) {
  return (value ?? '').replace(/\D/g, '')
}

async function verifySignature(secret: string, bodyText: string, signature: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(bodyText))
  const expected = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
  return expected === signature
}

async function replyMessage(accessToken: string, replyToken: string, text: string) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok')

  const url = new URL(req.url)
  const clubId = url.searchParams.get('club')
  if (!clubId) return new Response('missing club', { status: 400 })

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: channel } = await adminClient
    .from('club_notification_channels')
    .select('line_channel_secret, line_channel_access_token')
    .eq('club_id', clubId)
    .maybeSingle()

  if (!channel?.line_channel_secret || !channel?.line_channel_access_token) {
    return new Response('channel not configured', { status: 404 })
  }

  const bodyText = await req.text()
  const signature = req.headers.get('x-line-signature') ?? ''
  const validSignature = await verifySignature(channel.line_channel_secret, bodyText, signature)
  if (!validSignature) return new Response('bad signature', { status: 401 })

  const payload = JSON.parse(bodyText) as { events?: Array<Record<string, unknown>> }
  const accessToken = channel.line_channel_access_token

  const { data: roster } = await adminClient
    .from('roster')
    .select('id, name, phone, personal_phone')
    .eq('club_id', clubId)

  for (const event of payload.events ?? []) {
    const replyToken = event.replyToken as string | undefined
    if (!replyToken) continue

    if (event.type === 'follow') {
      await replyMessage(accessToken, replyToken, WELCOME_TEXT)
      continue
    }

    if (event.type !== 'message') continue
    const message = event.message as { type?: string; text?: string } | undefined
    if (message?.type !== 'text') continue

    const source = event.source as { userId?: string } | undefined
    const lineUserId = source?.userId
    const digits = normalizePhone(message.text)

    if (!lineUserId || digits.length < 8) {
      await replyMessage(accessToken, replyToken, BIND_HELP_TEXT)
      continue
    }

    const member = (roster ?? []).find(
      (r) => normalizePhone(r.phone) === digits || normalizePhone(r.personal_phone) === digits
    )

    if (!member) {
      await replyMessage(
        accessToken,
        replyToken,
        '查無這支手機號碼，請確認輸入的是社友名冊登記的號碼，或聯絡本社執秘協助綁定。'
      )
      continue
    }

    await adminClient.from('line_bindings').upsert(
      {
        club_id: clubId,
        roster_id: member.id,
        member_name: member.name,
        phone: digits,
        line_user_id: lineUserId,
        bound_at: new Date().toISOString(),
      },
      { onConflict: 'line_user_id' }
    )

    await replyMessage(accessToken, replyToken, `綁定成功！${member.name}，之後本社發布的活動/例會通知會透過這裡通知你。`)
  }

  return new Response('ok')
})
