import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CLUB_TIER_ROLES = ['club_admin', 'club_secretary']
// 社員帳號不用真實 email，登入時用手機號碼；這裡合成一個內部 email 給 Supabase Auth 存放。
const MEMBER_EMAIL_DOMAIN = 'member.d3481.local'

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizePhone(raw: string) {
  return raw.replace(/\D/g, '')
}

function phoneToEmail(phone: string) {
  return `${phone}@${MEMBER_EMAIL_DOMAIN}`
}

function defaultPassword(phone: string) {
  return phone.slice(-4)
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
    .select('role, club_id, district_access')
    .eq('id', user.id)
    .single()

  if (!callerProfile) return errorResponse('找不到使用者資料', 403)

  const { phone: rawPhone, name, club_id } = await req.json()
  const phone = typeof rawPhone === 'string' ? normalizePhone(rawPhone) : ''

  if (phone.length < 8) return errorResponse('手機號碼格式不正確', 400)
  if (!name || !String(name).trim()) return errorResponse('請輸入姓名', 400)
  if (!club_id) return errorResponse('缺少社團', 400)

  const isDistrictAdmin = callerProfile.role === 'district_admin' || callerProfile.district_access === true
  const isClubTier = CLUB_TIER_ROLES.includes(callerProfile.role)

  // 地區：可為任何社建立社員帳號；各社（社長／執秘對等）：只能建立本社社員帳號
  if (!isDistrictAdmin) {
    if (!isClubTier) return errorResponse('沒有權限執行此操作', 403)
    if (callerProfile.club_id !== club_id)
      return errorResponse('只能建立本社的帳號', 403)
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data, error } = await adminClient.auth.admin.createUser({
    email: phoneToEmail(phone),
    password: defaultPassword(phone),
    email_confirm: true,
    user_metadata: { club_id, role: 'club_member', name },
  })

  if (error) {
    const message = error.message.includes('already been registered')
      ? '此手機號碼已經建立過帳號'
      : error.message
    return errorResponse(message, 400)
  }

  // handle_new_user() trigger 會依 user_metadata 自動建立 user_profiles，
  // 這裡再補上 phone 欄位（trigger 不知道 phone，避免動到既有的 email 邀請流程）。
  const { error: phoneError } = await adminClient
    .from('user_profiles')
    .update({ phone })
    .eq('id', data.user.id)

  if (phoneError) return errorResponse(phoneError.message, 400)

  return new Response(JSON.stringify({ success: true, user_id: data.user.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
