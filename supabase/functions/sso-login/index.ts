import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ROTARYSSO_CLIENT_ID = Deno.env.get('ROTARYSSO_CLIENT_ID')!
const ROTARYSSO_CLIENT_SECRET = Deno.env.get('ROTARYSSO_CLIENT_SECRET')!

const ROTARYSSO_ISSUER = 'https://rotarysso.vercel.app'
const DISTRICT_ADMIN_ACCOUNT_TYPE = '管理者'

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

interface RotarySsoUserInfo {
  sub: string
  email: string
  name?: string
  rotary_club?: string
  rotary_district?: string
  account_type?: string
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
