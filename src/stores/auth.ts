import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useFeaturesStore } from '@/stores/features'
import { usePermissionsStore } from '@/stores/permissions'
import type { UserProfile, UserRole, UserClubRole } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<import('@supabase/supabase-js').User | null>(null)
  const profile = ref<UserProfile | null>(null)
  const clubName = ref<string | null>(null)
  // 跨社協作授權：除了 home club 之外，這個帳號還被哪些社加進去管理
  const crossClubGrants = ref<UserClubRole[]>([])
  const clubNamesById = ref<Record<string, string>>({})
  const loading = ref(true)
  const viewScope = ref<'district' | 'club'>('district')

  const isLoggedIn = computed(() => !!user.value)
  // 地區管理員（第 4 級）：可編輯社團/公告/帳號/權限矩陣等
  const isDistrictAdmin = computed(() => profile.value?.role === 'district_admin' || profile.value?.district_role === 'admin')
  // 地區唯讀（第 3 級）或地區管理員都算「有地區權限」：可進地區後台看彙總分析/社團總覽/公告/總監獎/EDM，但不能編輯
  const isDistrictViewer = computed(() => isDistrictAdmin.value || profile.value?.district_role === 'view')

  // home club：這個帳號原本註冊/被邀請時所屬的社，不受切換影響
  const homeClubId = computed(() => profile.value?.club_id ?? null)
  // 目前正在檢視/操作中的社：預設是 home club，若切換到跨社協作的社則不同。
  // 全站絕大多數頁面查詢/寫入資料都是用這個值，才會自動套用到跨社協作的情境。
  const clubId = computed(() => profile.value?.active_club_id ?? profile.value?.club_id ?? null)
  const isViewingHomeClub = computed(() =>
    !profile.value?.active_club_id || profile.value.active_club_id === profile.value.club_id
  )
  // 目前檢視中的社對應的角色：home club 用 profile.role；跨社協作的社則查對應的授權角色
  const role = computed<UserRole | null>(() => {
    if (!profile.value) return null
    if (isViewingHomeClub.value) return profile.value.role
    return crossClubGrants.value.find(g => g.club_id === profile.value?.active_club_id)?.role ?? null
  })

  // 這個帳號可以切換檢視的所有社（home + 有效的跨社協作），只有一個就不用顯示切換元件
  const accessibleClubs = computed(() => {
    if (!profile.value) return []
    const list: { club_id: string; name: string; role: UserRole; isHome: boolean }[] = []
    if (profile.value.club_id) {
      list.push({
        club_id: profile.value.club_id,
        name: clubNamesById.value[profile.value.club_id] ?? '本社',
        role: profile.value.role,
        isHome: true,
      })
    }
    for (const g of crossClubGrants.value) {
      list.push({
        club_id: g.club_id,
        name: clubNamesById.value[g.club_id] ?? '-',
        role: g.role,
        isHome: false,
      })
    }
    return list
  })
  const canSwitchClub = computed(() => accessibleClubs.value.length > 1)

  // 同時擁有地區權限（不論唯讀還是管理員）與本社身分的人才需要視角切換
  const canSwitchView = computed(() => isDistrictViewer.value && !!clubId.value)
  // 目前實際檢視的視角是不是地區（唯讀＋管理員都算，用來決定畫面顯示地區儀表板還是各社儀表板）
  const isDistrictView = computed(() => canSwitchView.value ? viewScope.value === 'district' : isDistrictViewer.value)
  // 目前是不是「地區視角 + 有編輯權限」，畫面上的編輯/新增/刪除按鈕要用這個判斷，不能只看 isDistrictView
  const isDistrictAdminView = computed(() => isDistrictView.value && isDistrictAdmin.value)

  // SSO 首次登入、還沒被地區管理員指派社別的帳號：club_id 是 NULL 且不是地區管理員，
  // 全站畫面都應該擋下來只顯示「待審核」提示（router guard 用這個判斷）。
  const isPendingApproval = computed(() =>
    isLoggedIn.value && !profile.value?.club_id && !isDistrictAdmin.value
  )

  // 首次登入導覽：只給看得到「儀表板／例會管理／社友名冊」這組社端選單的人看
  // （地區視角另有自己的畫面，導覽內容對不上，這裡先不做），待審核帳號還進
  // 不了任何頁面也排除。onboarding_completed_at 是 null 代表還沒看過或略過。
  const needsOnboarding = computed(() =>
    isLoggedIn.value && !isPendingApproval.value && !isDistrictView.value &&
    !!profile.value && !profile.value.onboarding_completed_at
  )

  function setViewScope(scope: 'district' | 'club') {
    if (scope === 'club' && !clubId.value) return
    viewScope.value = scope
    if (user.value) localStorage.setItem(`d3481_view_scope_${user.value.id}`, scope)
  }

  // 切換目前檢視中的社（home 或任一有效的跨社協作），後端 trigger
  // （protect_user_profile_privileged_fields）會擋下沒被授權的 club_id。
  async function switchActiveClub(targetClubId: string | null) {
    if (!user.value) return { error: new Error('尚未登入') }
    const { error } = await supabase
      .from('user_profiles')
      .update({ active_club_id: targetClubId === homeClubId.value ? null : targetClubId })
      .eq('id', user.value.id)
    if (!error) await fetchProfile()
    return { error }
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

    const saved = user.value ? localStorage.getItem(`d3481_view_scope_${user.value.id}`) : null
    viewScope.value = saved === 'club' ? 'club' : 'district'

    const { data: grants } = await supabase
      .from('user_club_roles')
      .select('*')
      .eq('user_id', user.value.id)
      .eq('is_active', true)
    crossClubGrants.value = grants ?? []

    const clubIds = [...new Set([data?.club_id, ...crossClubGrants.value.map(g => g.club_id)].filter(Boolean))] as string[]
    if (clubIds.length) {
      const { data: clubs } = await supabase.from('clubs').select('id, name').in('id', clubIds)
      clubNamesById.value = Object.fromEntries((clubs ?? []).map(c => [c.id, c.name]))
    } else {
      clubNamesById.value = {}
    }
    clubName.value = clubId.value ? (clubNamesById.value[clubId.value] ?? null) : null

    // 取得 profile 後立即載入功能開關與權限矩陣（用目前檢視中的社/角色，跨社協作切換過去也要吃到對的設定）
    const features = useFeaturesStore()
    await features.load(clubId.value)

    const permissions = usePermissionsStore()
    await permissions.load(role.value)
  }

  async function signOut() {
    await supabase.auth.signOut()
    user.value = null
    profile.value = null
    clubName.value = null
    crossClubGrants.value = []
    clubNamesById.value = {}
    viewScope.value = 'district'

    // 只登出 D3481 自己的 session，RotarySSO 那邊的登入狀態還在，下次點「用扶輪
    // 帳號登入」會直接沿用同一個帳號、無法切換。這裡一併導到 RotarySSO 的登出
    // 端點把它自己的 session 也結束掉，登出後才會真的回到帳密輸入畫面。
    // 注意：不是標準 OIDC 的 post_logout_redirect_uri，RotarySSO 用的參數是
    // callbackUrl（跟它登入頁內部導頁用的參數一致，經 RotarySSO 技術團隊確認）。
    const params = new URLSearchParams({
      callbackUrl: `${window.location.origin}/login`,
    })
    window.location.href = `https://rotarysso.vercel.app/oauth/logout?${params.toString()}`
  }

  async function updateName(name: string) {
    if (!user.value) return { error: new Error('尚未登入') }
    const { error } = await supabase.from('user_profiles').update({ name }).eq('id', user.value.id)
    if (!error && profile.value) profile.value = { ...profile.value, name }
    return { error }
  }

  async function completeOnboarding() {
    if (!user.value) return
    const now = new Date().toISOString()
    const { error } = await supabase.from('user_profiles').update({ onboarding_completed_at: now }).eq('id', user.value.id)
    if (!error && profile.value) profile.value = { ...profile.value, onboarding_completed_at: now }
  }

  return {
    user, profile, clubName, loading, isLoggedIn, isDistrictAdmin, isDistrictViewer, clubId, homeClubId, role,
    accessibleClubs, canSwitchClub, switchActiveClub,
    viewScope, canSwitchView, isDistrictView, isDistrictAdminView, setViewScope,
    isPendingApproval, needsOnboarding,
    init, signOut, updateName, completeOnboarding,
  }
})
