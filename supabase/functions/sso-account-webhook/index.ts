import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// RotarySSO 帳戶事件通知的接收端（account.registered/approved/rejected）。
// 對接規格見「SSO 帳戶事件通知 對接規格 v1」。這支是給 SSO 平台直接呼叫的
// 公開 webhook，部署時要加 --no-verify-jwt（SSO 不會帶 Supabase 的登入
// JWT，改用 X-Rotarysso-Signature 驗證來源，比照 line-webhook 的既有模式）。
//
// 自動重試排程目前尚未在 SSO 端上線（一次送達失敗＝永久沒送到，SSO 端
// 建議下游盡量不要回 5xx）。這支函式的寫法因此是「先落地事件、驗證
// 通過就回 200，後續業務邏輯本身不太可能失敗（單純的 upsert／update，
// 沒有呼叫外部服務）」，不做額外的非同步佇列。

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ROTARYSSO_WEBHOOK_SECRET = Deno.env.get('ROTARYSSO_WEBHOOK_SECRET')!
const ROTARYSSO_CLIENT_ID = Deno.env.get('ROTARYSSO_CLIENT_ID')!

const TIME_WINDOW_SECONDS = 300

interface SsoEventPayload {
  version: string
  event: string
  event_id: string
  occurred_at: string
  client_id: string
  user: {
    sub: string
    email: string
    name: string | null
    rotary_district: string | null
    rotary_club: string | null
    account_type: string | null
  }
}

// 規格 3.1／3.3 節的驗簽演算法：HMAC-SHA256(金鑰, timestamp + "." + body)，
// 常數時間比較，時間窗先檢查再算 HMAC。
async function verifySignature(
  secret: string,
  timestampHeader: string | null,
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!timestampHeader) return false
  const ts = Number(timestampHeader)
  if (!Number.isFinite(ts)) return false

  const nowSec = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSec - ts) > TIME_WINDOW_SECONDS) return false

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false
  const provided = signatureHeader.slice('sha256='.length)
  if (!/^[0-9a-f]{64}$/i.test(provided)) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ts}.${rawBody}`))
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')

  if (provided.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}

function jsonOk(body: Record<string, unknown> = { ok: true }) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  // 一定要先拿原始 body 字串再驗簽，先 JSON.parse 再 stringify 回去會
  // 改變空白／鍵序，簽章一定不符（規格 3.2 節第 1 步）。
  const rawBody = await req.text()
  const signedOk = await verifySignature(
    ROTARYSSO_WEBHOOK_SECRET,
    req.headers.get('X-Rotarysso-Timestamp'),
    rawBody,
    req.headers.get('X-Rotarysso-Signature'),
  )
  if (!signedOk) return new Response('invalid signature', { status: 401 })

  let payload: SsoEventPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('invalid json', { status: 401 })
  }

  // 事件類型只認 payload.event，不依賴任何標頭（規格 2.1／3.2 節第 8 步）。
  if (payload.client_id !== ROTARYSSO_CLIENT_ID) {
    return new Response('client_id mismatch', { status: 403 })
  }

  const eventId = req.headers.get('X-Rotarysso-Event-Id') ?? payload.event_id
  if (!eventId) return new Response('missing event id', { status: 401 })

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // 第一層去重（規格 4.2 節）：同一次通知的重試帶同一個 event_id。
  // sso_event_log.event_id 是 PRIMARY KEY，撞到就是重複，回 200 讓 SSO
  // 不再重送，不重複處理業務邏輯。
  const { error: dedupeError } = await adminClient.from('sso_event_log').insert({ event_id: eventId })
  if (dedupeError) {
    if (dedupeError.code === '23505') {
      return jsonOk({ ok: true, duplicate: true })
    }
    console.error('sso_event_log insert failed:', dedupeError)
    return new Response('internal error', { status: 500 })
  }

  // 未知 version／event 一律回 200 記錄下來，不擋（規格 2.4 節：回 4xx
  // 會讓事件被標記終止、回 5xx 會觸發五次無效重試，兩者都沒有幫助）。
  if (payload.version !== '1') {
    console.warn('unknown SSO payload version:', payload.version, eventId)
    return jsonOk()
  }
  if (!['account.registered', 'account.approved', 'account.rejected'].includes(payload.event)) {
    console.warn('unknown SSO event type:', payload.event, eventId)
    return jsonOk()
  }
  if (!payload.user?.sub || !payload.user?.email) {
    console.error('SSO payload missing user.sub/email:', eventId)
    return new Response('invalid payload', { status: 401 })
  }

  const status = payload.event === 'account.registered'
    ? 'registered'
    : payload.event === 'account.approved'
      ? 'approved'
      : 'rejected'

  const sub = payload.user.sub

  if (status === 'rejected') {
    // 理論上被拒絕的帳戶在 SSO 端已停用，不該再有任何登入行為對得上這
    // 個 sub；但重新啟用會沿用同一個 sub 且只送 account.approved，所以
    // 這裡看到 rejected 本身是正常事件，不是矛盾狀態，不用特別告警。
  }

  // 第二層去重＋事件順序（規格 4.3 節）：occurred_at 比已存的值舊或
  // 相等就不更新狀態，避免晚到的舊事件把已核准的記錄改回待審。
  const { data: existing } = await adminClient
    .from('sso_pending_account')
    .select('last_occurred_at')
    .eq('sso_sub', sub)
    .maybeSingle()

  const isNewer = !existing || new Date(payload.occurred_at).getTime() > new Date(existing.last_occurred_at).getTime()

  if (!isNewer) {
    console.log('stale SSO event ignored:', eventId, sub, payload.occurred_at)
    return jsonOk()
  }

  const { error: upsertError } = await adminClient.from('sso_pending_account').upsert(
    {
      sso_sub: sub,
      status,
      last_event_id: eventId,
      last_occurred_at: payload.occurred_at,
      email: payload.user.email,
      name: payload.user.name,
      rotary_district: payload.user.rotary_district,
      rotary_club: payload.user.rotary_club,
      account_type: payload.user.account_type,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'sso_sub' },
  )
  if (upsertError) {
    console.error('sso_pending_account upsert failed:', upsertError)
    return new Response('internal error', { status: 500 })
  }

  // 6.2 節：核准事件到達時回頭查正式帳號（可能比登入還晚到），若已存在
  // 且尚未套用過，把驗證過的資料補進去。只補資訊欄位＋標記時間，不動
  // club_id／role，那兩個仍走既有人工比對流程（見 069 migration 說明）。
  if (status === 'approved') {
    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('id, sso_verified_at')
      .eq('sso_sub', sub)
      .maybeSingle()

    if (profile && !profile.sso_verified_at) {
      const appliedAt = new Date().toISOString()
      const { error: applyError } = await adminClient
        .from('user_profiles')
        .update({
          sso_account_type: payload.user.account_type,
          sso_rotary_club: payload.user.rotary_club,
          sso_rotary_district: payload.user.rotary_district,
          sso_verified_at: appliedAt,
        })
        .eq('id', profile.id)

      if (applyError) {
        console.error('apply approved SSO data to user_profiles failed:', applyError)
      } else {
        await adminClient.from('sso_pending_account').update({ consumed_at: appliedAt }).eq('sso_sub', sub)
      }
    }
  }

  return jsonOk()
})
