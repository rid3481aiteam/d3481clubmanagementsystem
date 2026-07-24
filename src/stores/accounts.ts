import { defineStore } from 'pinia'
import { ref } from 'vue'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserProfile, UserRole, UserClubRole } from '@/types'

function unwrapFunctionError(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    return error.context.json()
      .then((body: { error?: string }) => ({ message: body?.error ?? (error as Error).message }))
      .catch(() => ({ message: (error as Error).message }))
  }
  return Promise.resolve({ message: (error as Error).message })
}

export const useAccountsStore = defineStore('accounts', () => {
  const managed = ref<UserProfile[]>([])
  const pending = ref<UserProfile[]>([])
  const pendingCount = ref(0)
  const members = ref<UserProfile[]>([])
  const collaborators = ref<UserClubRole[]>([])
  const loading = ref(false)

  // 目前查詢範圍：null = 地區視角（不限社別）；有值 = 社端視角，只查該社。
  // 一定要在 query 這層就限定範圍，不能只靠畫面上過濾——地區管理員的 RLS
  // 本來就放行看全地區的 user_profiles，就算切到自己社的視角，
  // 不加這層限制的話瀏覽器還是會收到其他社的帳號資料。
  const scopeClubId = ref<string | null>(null)

  function setScope(clubId: string | null) {
    scopeClubId.value = clubId
  }

  async function fetchManaged() {
    loading.value = true
    let query = supabase
      .from('user_profiles')
      .select('*')
      .in('role', ['club_admin', 'club_secretary'])
    if (scopeClubId.value) query = query.eq('club_id', scopeClubId.value)
    const { data } = await query
    managed.value = data ?? []
    loading.value = false
  }

  // 「待審核」涵蓋兩種人：自助註冊填了 requested_title/requested_role 等管理員
  // 升級角色的人，以及 RotarySSO 首次登入、club_id 還是 NULL 等管理員指派社別的人。
  // 社端視角只可能碰到前者（後者一定要地區管理員才能指派社別，見 assignClub）。
  async function fetchPending() {
    let query = supabase.from('user_profiles').select('*')
    query = scopeClubId.value
      ? query.eq('club_id', scopeClubId.value).not('requested_role', 'is', null)
      : query.or('requested_role.not.is.null,club_id.is.null')
    const { data } = await query
    pending.value = data ?? []
    pendingCount.value = pending.value.length
  }

  // 給導覽列徽章用的輕量版：不用 SSO 待審整包資料（含姓名/職稱等），
  // 只查數量，讓管理員不用點進帳號管理頁就能在導覽列看到「有人在等審核」。
  async function fetchPendingCount(scopeId: string | null) {
    let query = supabase.from('user_profiles').select('id', { count: 'exact', head: true })
    query = scopeId
      ? query.eq('club_id', scopeId).not('requested_role', 'is', null)
      : query.or('requested_role.not.is.null,club_id.is.null')
    const { count } = await query
    pendingCount.value = count ?? 0
  }

  async function approveRole(id: string, role: UserRole) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ role, requested_role: null })
      .eq('id', id)
    if (!error) {
      pending.value = pending.value.filter(u => u.id !== id)
      await Promise.all([fetchManaged(), fetchMembers()])
    }
    return { error }
  }

  // 一鍵啟動待審帳號：指派社別（若尚未指派）＋套用角色，合併成一次寫入、
  // 一顆按鈕（原本 assignClub／approveRole 分兩步，管理員要按兩次）。
  // clubId 留空代表這筆待審帳號已經有 club_id（各社管理員視角只審角色），
  // protect_user_profile_privileged_fields trigger 已經放行地區管理員改 club_id，不用另開 Edge Function。
  async function activatePending(id: string, role: UserRole, clubId?: string) {
    const payload: Record<string, unknown> = { role, requested_role: null }
    if (clubId) payload.club_id = clubId
    const { error } = await supabase
      .from('user_profiles')
      .update(payload)
      .eq('id', id)
    if (!error) {
      pending.value = pending.value.filter(u => u.id !== id)
      pendingCount.value = pending.value.length
      await Promise.all([fetchManaged(), fetchMembers()])
    }
    return { error }
  }

  async function dismissPending(id: string) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ requested_role: null })
      .eq('id', id)
    if (!error) {
      pending.value = pending.value.filter(u => u.id !== id)
      pendingCount.value = pending.value.length
    }
    return { error }
  }

  async function fetchMembers() {
    loading.value = true
    let query = supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'club_member')
      .order('name')
    if (scopeClubId.value) query = query.eq('club_id', scopeClubId.value)
    const { data } = await query
    members.value = data ?? []
    loading.value = false
  }

  async function createMember(phone: string, name: string, clubId: string) {
    const { data, error } = await supabase.functions.invoke('create-member-account', {
      body: { phone, name, club_id: clubId },
    })
    if (error) return { data, error: await unwrapFunctionError(error) }
    await fetchMembers()
    return { data, error: null }
  }

  async function resetMemberPassword(id: string) {
    const { data, error } = await supabase.functions.invoke('reset-member-password', {
      body: { user_id: id },
    })
    if (error) return { data, error: await unwrapFunctionError(error) }
    return { data, error: null }
  }

  async function setActive(id: string, isActive: boolean) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: isActive })
      .eq('id', id)
    if (!error) {
      managed.value = managed.value.map(u => (u.id === id ? { ...u, is_active: isActive } : u))
      members.value = members.value.map(u => (u.id === id ? { ...u, is_active: isActive } : u))
    }
    return { error }
  }

  async function setDistrictRole(id: string, districtRole: 'view' | 'admin' | null) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ district_role: districtRole })
      .eq('id', id)
    if (!error) {
      managed.value = managed.value.map(u => (
        u.id === id ? { ...u, district_role: districtRole } : u
      ))
    }
    return { error }
  }

  // 跨社協作帳號：home club 在別的社，但被目前這個社（current_club_id()）
  // 額外授權管理的人。跟 fetchManaged/fetchMembers 分開查，因為 user_profiles
  // 的 RLS 只回傳 home club 是目前社的人，查不到這種人。
  //
  // 分兩次查而不是用 PostgREST 的 user_profiles(...) 內嵌語法：
  // user_club_roles.user_id 只有 FK 指到 auth.users，沒有直接指到
  // user_profiles，PostgREST 找不到這個關聯會讓內嵌查詢整個失敗
  // （之前這裡沒檢查 error，失敗時就悄悄變成空陣列）。
  async function fetchClubCollaborators() {
    const { data: grants } = await supabase
      .from('user_club_roles')
      .select('*')
      .order('created_at', { ascending: false })

    const userIds = [...new Set((grants ?? []).map(g => g.user_id))]
    let profilesById: Record<string, { name: string; is_active: boolean }> = {}
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, name, is_active')
        .in('id', userIds)
      profilesById = Object.fromEntries(
        (profiles ?? []).map(p => [p.id, { name: p.name, is_active: p.is_active }])
      )
    }

    collaborators.value = (grants ?? []).map(g => ({
      ...g,
      user_profiles: profilesById[g.user_id] ?? null,
    }))
  }

  async function updateCollaboratorRole(userId: string, clubId: string, role: UserRole) {
    const { error } = await supabase
      .from('user_club_roles')
      .update({ role })
      .eq('user_id', userId)
      .eq('club_id', clubId)
    if (!error) await fetchClubCollaborators()
    return { error }
  }

  async function revokeCollaborator(userId: string, clubId: string) {
    const { error } = await supabase
      .from('user_club_roles')
      .delete()
      .eq('user_id', userId)
      .eq('club_id', clubId)
    if (!error) collaborators.value = collaborators.value.filter(
      c => !(c.user_id === userId && c.club_id === clubId)
    )
    return { error }
  }

  async function deleteAccount(id: string) {
    const { error } = await supabase.functions.invoke('delete-account', {
      body: { user_id: id },
    })

    if (error) return { error: await unwrapFunctionError(error) }

    managed.value = managed.value.filter(u => u.id !== id)
    members.value = members.value.filter(u => u.id !== id)
    return { error: null }
  }

  return {
    managed, pending, pendingCount, members, collaborators, loading,
    setScope,
    fetchManaged, fetchPending, fetchPendingCount, approveRole, activatePending, dismissPending,
    fetchMembers, createMember, resetMemberPassword,
    setActive, setDistrictRole, deleteAccount,
    fetchClubCollaborators, updateCollaboratorRole, revokeCollaborator,
  }
})
