import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const ROTARYSSO_CLIENT_ID = Deno.env.get('ROTARYSSO_CLIENT_ID')!
const ROTARYSSO_CLIENT_SECRET = Deno.env.get('ROTARYSSO_CLIENT_SECRET')!

const ROTARYSSO_ISSUER = 'https://rotarysso.vercel.app'
const POSITIVE_TTL_MS = 60 * 60 * 1000
const NEGATIVE_TTL_MS = 60 * 1000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface RotarySsoApp {
  clientId: string
  name: string
  description: string | null
  redirectUri: string
  scope: string
  homepageUrl: string | null
  logoUrl: string | null
}

// 九宮格清單很少變，不用每次開選單都打 RotarySSO：正向快取 1 小時、失敗時
// 沿用舊資料（stale-on-error）、徹底失敗且沒有舊資料時 60 秒內不重打（防 retry
// storm）。這支函式是暖機後常駐的 Deno isolate，用 module-scope Map 當簡易
// 記憶體快取即可，不需要真的接資料庫，跟 RotarySSO 規格書建議的做法一致。
const cache = new Map<string, { data: RotarySsoApp[]; fetchedAt: number }>()
const negativeCacheUntil = new Map<string, number>()

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ success: false, error: '尚未登入或登入已過期' }, 401)

  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user } } = await callerClient.auth.getUser(authHeader.replace('Bearer ', ''))
  if (!user) return jsonResponse({ success: false, error: '尚未登入或登入已過期' }, 401)

  const { data: profile } = await callerClient
    .from('user_profiles')
    .select('sso_account_type')
    .eq('id', user.id)
    .single()

  // 舊帳號（帳密登入時代建的、還沒轉 SSO）沒有 sso_account_type，帶空字串
  // 給 RotarySSO——規格書說空字串合法，只回全體可見的 app，不會出錯。
  const accountType = profile?.sso_account_type ?? ''
  const cached = cache.get(accountType)

  if (cached && Date.now() - cached.fetchedAt < POSITIVE_TTL_MS) {
    return jsonResponse({ success: true, data: cached.data })
  }

  const negUntil = negativeCacheUntil.get(accountType)
  if (negUntil && Date.now() < negUntil) {
    return jsonResponse(cached ? { success: true, data: cached.data } : { success: false, data: null })
  }

  try {
    const basic = btoa(`${ROTARYSSO_CLIENT_ID}:${ROTARYSSO_CLIENT_SECRET}`)
    const resp = await fetch(
      `${ROTARYSSO_ISSUER}/api/apps?account_type=${encodeURIComponent(accountType)}`,
      { headers: { Authorization: `Basic ${basic}` }, signal: AbortSignal.timeout(3000) }
    )
    if (!resp.ok) throw new Error(`upstream ${resp.status}`)
    const body = await resp.json()
    if (!body.success || !Array.isArray(body.data)) throw new Error('bad shape')

    cache.set(accountType, { data: body.data, fetchedAt: Date.now() })
    return jsonResponse({ success: true, data: body.data })
  } catch (err) {
    console.error('RotarySSO /api/apps failed:', err)
    negativeCacheUntil.set(accountType, Date.now() + NEGATIVE_TTL_MS)
    // stale-on-error：上游掛掉但有舊資料，寧可用過期的清單也不要讓選單空白
    return jsonResponse(cached ? { success: true, data: cached.data } : { success: false, data: null })
  }
})
