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
  // 地區管理員（第 4 級）：可編輯社團/公告/帳號/權限矩陣等
  const isDistrictAdmin = computed(() => profile.value?.role === 'district_admin' || profile.value?.district_role === 'admin')
  // 地區唯讀（第 3 級）或地區管理員都算「有地區權限」：可進地區後台看彙總分析/社團總覽/公告/總監獎/EDM，但不能編輯
  const isDistrictViewer = computed(() => isDistrictAdmin.value || profile.value?.district_role === 'view')
  const clubId = computed(() => profile.value?.club_id ?? null)
  const role = computed<UserRole | null>(() => profile.value?.role ?? null)

  // 同時擁有地區權限（不論唯讀還是管理員）與本社身分的人才需要視角切換
  const canSwitchView = computed(() => isDistrictViewer.value && !!clubId.value)
  // 目前實際檢視的視角是不是地區（唯讀＋管理員都算，用來決定畫面顯示地區儀表板還是各社儀表板）
  const isDistrictView = computed(() => canSwitchView.value ? viewScope.value === 'district' : isDistrictViewer.value)
  // 目前是不是「地區視角 + 有編輯權限」，畫面上的編輯/新增/刪除按鈕要用這個判斷，不能只看 isDistrictView
  const isDistrictAdminView = computed(() => isDistrictView.value && isDistrictAdmin.value)

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
    user, profile, clubName, loading, isLoggedIn, isDistrictAdmin, isDistrictViewer, clubId, role,
    viewScope, canSwitchView, isDistrictView, isDistrictAdminView, setViewScope,
    init, signIn, signOut, updateName,
  }
})
