import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types'

export type PermResource = 'roster' | 'prospective_members' | 'meetings' | 'attendance' | 'activities' | 'membership_reports'
export type PermAction = 'view' | 'edit'
export type PermMap = Record<string, boolean>

export interface RolePermission {
  id: string
  role: UserRole
  resource: string
  action: string
  allowed: boolean
}

export const usePermissionsStore = defineStore('permissions', () => {
  const perms = ref<PermMap>({})
  const loading = ref(false)
  const allPermissions = ref<RolePermission[]>([])

  async function load(role: UserRole | null) {
    if (!role) {
      perms.value = {}
      return
    }
    loading.value = true
    const { data } = await supabase
      .from('role_permissions')
      .select('resource, action, allowed')
      .eq('role', role)
    const next: PermMap = {}
    for (const r of data ?? []) next[`${r.resource}:${r.action}`] = r.allowed
    perms.value = next
    loading.value = false
  }

  function can(resource: PermResource, action: PermAction): boolean {
    return perms.value[`${resource}:${action}`] ?? false
  }

  async function fetchAll() {
    const { data } = await supabase
      .from('role_permissions')
      .select('*')
      .order('resource')
      .order('role')
      .order('action')
    allPermissions.value = data ?? []
  }

  async function setPermission(id: string, allowed: boolean, userId: string | null) {
    const { error } = await supabase
      .from('role_permissions')
      .update({ allowed, updated_by: userId })
      .eq('id', id)
    if (!error) await fetchAll()
    return { error }
  }

  return { perms, loading, allPermissions, load, can, fetchAll, setPermission }
})
