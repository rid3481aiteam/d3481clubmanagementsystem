import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const callerClient = createClient(SUPABASE_URL, authHeader.replace('Bearer ', ''), {
    global: { headers: { Authorization: authHeader } }
  })
  const { data: { user } } = await callerClient.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: callerProfile } = await callerClient
    .from('user_profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (!callerProfile) return new Response('Profile not found', { status: 403 })

  const { email, role, club_id } = await req.json()

  const isDistrictAdmin = callerProfile.role === 'district_admin'
  const isSecretary = callerProfile.role === 'club_secretary'

  if (role === 'club_secretary' && !isDistrictAdmin)
    return new Response('Only district_admin can invite secretary', { status: 403 })

  if (role === 'club_admin') {
    if (!isSecretary && !isDistrictAdmin)
      return new Response('Only club_secretary or district_admin can invite president', { status: 403 })
    if (isSecretary && callerProfile.club_id !== club_id)
      return new Response('Secretary can only invite president for own club', { status: 403 })
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { club_id, role }
  })

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })

  await adminClient.from('invite_log').insert({
    invited_by: user.id,
    invited_email: email,
    club_id,
    role
  })

  return new Response(JSON.stringify({ success: true, user_id: data.user.id }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
