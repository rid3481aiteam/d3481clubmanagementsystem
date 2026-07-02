import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useFeaturesStore } from '@/stores/features'
import { usePermissionsStore } from '@/stores/permissions'
import type { UserProfile, UserRole } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<import('@supabase/supabase-js').User | null>(null)
  const profile = ref<UserProfile | null>(null)
  const clubName = ref<string | null>(null)
  const loading = ref(true)
  const viewScope = ref<'district' | 'club'>('district')

  const isLoggedIn = computed(() => !!user.value)
  const isDistrictAdmin = computed(() => profile.value?.role === 'district_admin' || profile.value?.district_access === true)
  const clubId = computed(() => profile.value?.club_id ?? null)
  const role = computed<UserRole | null>(() => profile.value?.role ?? null)

  // 同時擁有地區權限與本社身分的人（社長/執秘/社員 + district_access）才需要視角切換
  const canSwitchView = computed(() => isDistrictAdmin.value && !!clubId.value)
  const isDistrictView = computed(() => canSwitchView.value ? viewScope.value === 'district' : isDistrictAdmin.value)

  function setViewScope(scope: 'district' | 'club') {
    if (scope === 'club' && !clubId.value) return
    viewScope.value = scope
    if (user.value) localStorage.setItem(`d3481_view_scope_${user.value.id}`, scope)
  }

  async function init() {
    loading.value = true
    const { data: { session } } = await supabase.auth.getSession()
    user.value = session?.user ?? null
    if (user.value) await fetchProfile()
    loading.value = false

    supabase.auth.onAuthStateChange(async (_event, session) => {
      user.value = session?.user ?? null
      if (user.value) await fetchProfile()
      else profile.value = null
    })
  }

  async function fetchProfile() {
    if (!user.value) return
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.value.id)
      .single()
    profile.value = data
    clubName.value = null

    const saved = user.value ? localStorage.getItem(`d3481_view_scope_${user.value.id}`) : null
    viewScope.value = saved === 'club' ? 'club' : 'district'

    if (data?.club_id) {
      const { data: club } = await supabase
        .from('clubs')
        .select('name')
        .eq('id', data.club_id)
        .single()
      clubName.value = club?.name ?? null
    }

    // 取得 profile 後立即載入功能開關與權限矩陣
    const features = useFeaturesStore()
    await features.load(data?.club_id ?? null)

    const permissions = usePermissionsStore()
    await permissions.load(data?.role ?? null)
  }

  // 社長／執秘用 email 登入；一般社員用手機號碼登入（後台建立帳號時
  // 合成的內部信箱是 <手機號碼>@member.d3481.local，見 create-member-account）。
  function resolveLoginEmail(identifier: string) {
    const trimmed = identifier.trim()
    if (trimmed.includes('@')) return trimmed
    const phone = trimmed.replace(/\D/g, '')
    return `${phone}@member.d3481.local`
  }

  async function signIn(identifier: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: resolveLoginEmail(identifier),
      password,
    })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
    user.value = null
    profile.value = null
    clubName.value = null
    viewScope.value = 'district'
  }

  async function updateName(name: string) {
    if (!user.value) return { error: new Error('尚未登入') }
    const { error } = await supabase.from('user_profiles').update({ name }).eq('id', user.value.id)
    if (!error && profile.value) profile.value = { ...profile.value, name }
    return { error }
  }

  return {
    user, profile, clubName, loading, isLoggedIn, isDistrictAdmin, clubId, role,
    viewScope, canSwitchView, isDistrictView, setViewScope,
    init, signIn, signOut, updateName,
  }
})
