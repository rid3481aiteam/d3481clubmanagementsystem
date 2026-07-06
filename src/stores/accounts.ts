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
  const members = ref<UserProfile[]>([])
  const collaborators = ref<UserClubRole[]>([])
  const loading = ref(false)

  async function fetchManaged() {
    loading.value = true
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .in('role', ['club_admin', 'club_secretary'])
    managed.value = data ?? []
    loading.value = false
  }

  async function fetchPending() {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .not('requested_role', 'is', null)
    pending.value = data ?? []
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

  async function dismissPending(id: string) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ requested_role: null })
      .eq('id', id)
    if (!error) pending.value = pending.value.filter(u => u.id !== id)
    return { error }
  }

  async function fetchMembers() {
    loading.value = true
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'club_member')
      .order('name')
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
    managed, pending, members, collaborators, loading,
    fetchManaged, fetchPending, approveRole, dismissPending,
    fetchMembers, createMember, resetMemberPassword,
    setActive, setDistrictRole, deleteAccount,
    fetchClubCollaborators, updateCollaboratorRole, revokeCollaborator,
  }
})
