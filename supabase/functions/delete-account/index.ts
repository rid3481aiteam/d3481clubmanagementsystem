import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CLUB_TIER_ROLES = ['club_admin', 'club_secretary']
const DELETABLE_ROLES = ['club_admin', 'club_secretary', 'club_member']

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// 永久刪除帳號（auth.users + 級聯刪除 user_profiles），跟「停用」不同：
// 停用只是關掉登入權限，帳號跟 Email 都還在；這支是真的刪除，Email 才能重新邀請。
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
    .select('role, club_id')
    .eq('id', user_id)
    .single()

  if (!targetProfile) return errorResponse('找不到該帳號', 404)
  if (!DELETABLE_ROLES.includes(targetProfile.role))
    return errorResponse('只能刪除社長／執秘／社員帳號', 400)

  const isDistrictAdmin = callerProfile.role === 'district_admin' || callerProfile.district_role === 'admin'
  const isClubTier = CLUB_TIER_ROLES.includes(callerProfile.role)

  // 地區：可刪除任何社的帳號；各社（社長／執秘對等）：只能刪除本社帳號
  if (!isDistrictAdmin) {
    if (!isClubTier) return errorResponse('沒有權限執行此操作', 403)
    if (callerProfile.club_id !== targetProfile.club_id)
      return errorResponse('只能刪除本社的帳號', 403)
  }

  const { error } = await adminClient.auth.admin.deleteUser(user_id)
  if (error) return errorResponse(error.message, 400)

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
