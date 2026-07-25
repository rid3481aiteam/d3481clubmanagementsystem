import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

// 全站已完全改用 RotarySSO 登入（見 051_rotarysso.sql），沒有帳密登入頁面了。
// 這支函式原本是「邀請新 Email 建帳號」（Supabase inviteUserByEmail 寄信設密碼），
// 但設完密碼叫使用者回 /login 用密碼登入時，/login 早就只剩 SSO 按鈕，帳號建了
// 卻永遠登不進去。改成單純的「幫既有帳號（一定要先自己用 SSO 登入過一次）
// 額外授權」：地區管理員用 Email 查到既有帳號，選要授予「地區工作人員」
// （district_role）還是「加入指定社」（user_club_roles 跨社協作），不再建立
// 任何新帳號。
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') return errorResponse('不支援的請求方法', 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return errorResponse('尚未登入或登入已過期', 401)

  const token = authHeader.replace('Bearer ', '')

  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  })
  const { data: { user } } = await callerClient.auth.getUser(token)
  if (!user) return errorResponse('尚未登入或登入已過期', 401)

  const { data: callerProfile } = await callerClient
    .from('user_profiles')
    .select('role, district_role')
    .eq('id', user.id)
    .single()

  if (!callerProfile) return errorResponse('找不到使用者資料', 403)

  const isDistrictAdmin = callerProfile.role === 'district_admin' || callerProfile.district_role === 'admin'
  if (!isDistrictAdmin) return errorResponse('只有地區管理員可以執行此操作', 403)

  const { email, grant_type, district_role, club_id, role } = await req.json()
  if (!email || typeof email !== 'string' || !email.trim()) return errorResponse('請輸入 Email', 400)

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: existingUserId, error: lookupError } = await adminClient.rpc(
    'find_user_id_by_email',
    { p_email: email.trim() }
  )
  if (lookupError) return errorResponse(lookupError.message, 500)
  if (!existingUserId) {
    return errorResponse('此 Email 尚未使用扶輪帳號登入過，請先請對方登入本平台一次（會產生待審核帳號），再回來授權', 400)
  }

  if (grant_type === 'district') {
    if (!['view', 'admin'].includes(district_role)) return errorResponse('地區權限不正確', 400)

    const { error } = await adminClient
      .from('user_profiles')
      .update({ district_role })
      .eq('id', existingUserId)
    if (error) return errorResponse(error.message, 400)

    return new Response(JSON.stringify({ success: true, grant_type: 'district' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (grant_type === 'club') {
    if (!club_id) return errorResponse('請選擇社團', 400)
    if (!['club_secretary', 'club_member'].includes(role)) return errorResponse('角色不正確', 400)

    const { data: existingProfile } = await adminClient
      .from('user_profiles')
      .select('club_id')
      .eq('id', existingUserId)
      .single()

    if (existingProfile?.club_id === club_id) {
      return errorResponse('此帳號已經是本社成員', 400)
    }

    const { error: grantError } = await adminClient
      .from('user_club_roles')
      .upsert(
        { user_id: existingUserId, club_id, role, is_active: true, granted_by: user.id },
        { onConflict: 'user_id,club_id' }
      )
    if (grantError) return errorResponse(grantError.message, 400)

    await adminClient.from('invite_log').insert({
      invited_by: user.id,
      invited_email: email.trim(),
      club_id,
      role,
      accepted_at: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ success: true, grant_type: 'club' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return errorResponse('授權類型不正確', 400)
})
