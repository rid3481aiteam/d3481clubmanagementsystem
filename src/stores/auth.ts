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

  const isLoggedIn = computed(() => !!user.value)
  const isDistrictAdmin = computed(() => profile.value?.role === 'district_admin' || profile.value?.district_access === true)
  const clubId = computed(() => profile.value?.club_id ?? null)
  const role = computed<UserRole | null>(() => profile.value?.role ?? null)

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

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
    user.value = null
    profile.value = null
    clubName.value = null
  }

  async function updateName(name: string) {
    if (!user.value) return { error: new Error('尚未登入') }
    const { error } = await supabase.from('user_profiles').update({ name }).eq('id', user.value.id)
    if (!error && profile.value) profile.value = { ...profile.value, name }
    return { error }
  }

  return { user, profile, clubName, loading, isLoggedIn, isDistrictAdmin, clubId, role, init, signIn, signOut, updateName }
})
