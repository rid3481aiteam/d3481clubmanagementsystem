import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types'

export const useAccountsStore = defineStore('accounts', () => {
  const managed = ref<UserProfile[]>([])
  const loading = ref(false)

  async function fetchManaged(targetRole: 'club_secretary' | 'club_admin') {
    loading.value = true
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', targetRole)
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

  return { managed, loading, fetchManaged, setActive }
})
