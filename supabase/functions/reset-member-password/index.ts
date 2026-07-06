import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

// 用完整手機號碼當預設密碼，跟 create-member-account 一致；
// Supabase Auth 的最短密碼長度下限是 6 碼，末四碼不夠長。
function defaultPassword(phone: string) {
  return phone
}

// 用手機號碼登入的帳號忘記密碼，由社長／執秘一鍵重設回預設規則
// （完整手機號碼），不用收 email 重設連結。原本限定只能重設
// club_member 角色，但用手機號碼建立的帳號一旦被「帳號總覽」的
// 權限開關升級成執秘（可編輯），登入信箱是系統合成的
// <手機號碼>@member.d3481.local，沒有真實收件匣，完全沒有救援
// 管道；改成只看「有沒有手機號碼」，不管角色是什麼。
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
    .select('role, club_id, district_role')
    .eq('id', user.id)
    .single()

  if (!callerProfile) return errorResponse('找不到使用者資料', 403)

  const { user_id } = await req.json()
  if (!user_id) return errorResponse('缺少 user_id', 400)

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: targetProfile } = await adminClient
    .from('user_profiles')
    .select('role, club_id, phone')
    .eq('id', user_id)
    .single()

  if (!targetProfile) return errorResponse('找不到該帳號', 404)
  if (!targetProfile.phone) return errorResponse('該帳號沒有手機號碼，無法重設為預設密碼', 400)

  const isDistrictAdmin = callerProfile.role === 'district_admin' || callerProfile.district_role === 'admin'

  // 用 current_club_id()/current_user_role() 而不是 callerProfile 的 home
  // club_id/role，跨社協作的執秘切到被授權的社之後，也要能管理那個社的帳號。
  const { data: currentClubId } = await callerClient.rpc('current_club_id')
  const { data: currentRole } = await callerClient.rpc('current_user_role')
  const isClubTier = CLUB_TIER_ROLES.includes(currentRole)

  if (!isDistrictAdmin) {
    if (!isClubTier) return errorResponse('沒有權限執行此操作', 403)
    if (currentClubId !== targetProfile.club_id)
      return errorResponse('只能重設本社社員的密碼', 403)
  }

  const newPassword = defaultPassword(targetProfile.phone)
  const { error } = await adminClient.auth.admin.updateUserById(user_id, { password: newPassword })
  if (error) return errorResponse(error.message, 400)

  return new Response(JSON.stringify({ success: true, new_password: newPassword }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
