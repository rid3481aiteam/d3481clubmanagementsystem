import { defineStore } from 'pinia'
import { ref } from 'vue'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserProfile, UserRole } from '@/types'

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

  async function setDistrictAccess(id: string, districtAccess: boolean) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ district_access: districtAccess })
      .eq('id', id)
    if (!error) {
      managed.value = managed.value.map(u => (
        u.id === id ? { ...u, district_access: districtAccess } : u
      ))
    }
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
    managed, pending, members, loading,
    fetchManaged, fetchPending, approveRole, dismissPending,
    fetchMembers, createMember, resetMemberPassword,
    setActive, setDistrictAccess, deleteAccount,
  }
})
