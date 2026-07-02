import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CLUB_TIER_ROLES = ['club_admin', 'club_secretary']
const SITE_URL = 'https://d3481clubmanagementsystem.pages.dev'

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// 把 Supabase Auth 回傳的英文錯誤訊息轉成中文，其餘保留原文
function translateAuthError(message: string): string {
  if (message.includes('already been registered')) return '此 Email 已經註冊過帳號'
  return message
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
    global: { headers: { Authorization: authHeader } }
  })
  const { data: { user } } = await callerClient.auth.getUser(token)
  if (!user) return errorResponse('尚未登入或登入已過期', 401)

  const { data: callerProfile } = await callerClient
    .from('user_profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (!callerProfile) return errorResponse('找不到使用者資料', 403)

  const { email, role, club_id } = await req.json()

  if (!['club_secretary', 'club_admin', 'club_member'].includes(role))
    return errorResponse('角色不正確', 400)

  const isDistrictAdmin = callerProfile.role === 'district_admin'
  const isClubTier = CLUB_TIER_ROLES.includes(callerProfile.role)

  // 地區：可為任何社邀請任何角色（新社團建立第一組帳號用）
  // 各社（社長／執秘皆對等）：只能邀請本社帳號，角色不限，由各社自行決定
  if (!isDistrictAdmin) {
    if (!isClubTier) return errorResponse('沒有權限執行此操作', 403)
    if (callerProfile.club_id !== club_id)
      return errorResponse('只能邀請本社的帳號', 403)
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { club_id, role },
    redirectTo: `${SITE_URL}/accept-invite`,
  })

  if (error) return errorResponse(translateAuthError(error.message), 400)

  await adminClient.from('invite_log').insert({
    invited_by: user.id,
    invited_email: email,
    club_id,
    role
  })

  return new Response(JSON.stringify({ success: true, user_id: data.user.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
