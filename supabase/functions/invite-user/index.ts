import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CLUB_TIER_ROLES = ['club_admin', 'club_secretary']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  const token = authHeader.replace('Bearer ', '')

  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  })
  const { data: { user } } = await callerClient.auth.getUser(token)
  if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  const { data: callerProfile } = await callerClient
    .from('user_profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (!callerProfile) return new Response('Profile not found', { status: 403, headers: corsHeaders })

  const { email, role, club_id } = await req.json()

  if (!['club_secretary', 'club_admin', 'club_member'].includes(role))
    return new Response('Invalid role', { status: 400, headers: corsHeaders })

  const isDistrictAdmin = callerProfile.role === 'district_admin'
  const isClubTier = CLUB_TIER_ROLES.includes(callerProfile.role)

  // 地區：可為任何社邀請任何角色（新社團建立第一組帳號用）
  // 各社（社長／執秘皆對等）：只能邀請本社帳號，角色不限，由各社自行決定
  if (!isDistrictAdmin) {
    if (!isClubTier) return new Response('Forbidden', { status: 403, headers: corsHeaders })
    if (callerProfile.club_id !== club_id)
      return new Response('Can only invite accounts for your own club', { status: 403, headers: corsHeaders })
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { club_id, role }
  })

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })

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
