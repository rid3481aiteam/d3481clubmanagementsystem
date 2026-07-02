import { defineStore } from 'pinia'
import { ref } from 'vue'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types'

export const useAccountsStore = defineStore('accounts', () => {
  const managed = ref<UserProfile[]>([])
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

  async function setActive(id: string, isActive: boolean) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: isActive })
      .eq('id', id)
    if (!error) managed.value = managed.value.map(u => (u.id === id ? { ...u, is_active: isActive } : u))
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

    if (error) {
      let message = error.message
      if (error instanceof FunctionsHttpError) {
        try {
          const body = await error.context.json()
          if (body?.error) message = body.error
        } catch {
          // 回應不是 JSON，維持預設訊息
        }
      }
      return { error: { message } }
    }

    managed.value = managed.value.filter(u => u.id !== id)
    return { error: null }
  }

  return { managed, loading, fetchManaged, setActive, setDistrictAccess, deleteAccount }
})
