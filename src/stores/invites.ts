import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types'

export interface InviteLogEntry {
  id: string
  invited_by: string | null
  invited_email: string
  club_id: string | null
  role: UserRole
  invited_at: string
  accepted_at: string | null
}

export const useInvitesStore = defineStore('invites', () => {
  const log = ref<InviteLogEntry[]>([])
  const loading = ref(false)

  async function fetchLog() {
    loading.value = true
    const { data } = await supabase
      .from('invite_log')
      .select('*')
      .order('invited_at', { ascending: false })
    log.value = data ?? []
    loading.value = false
  }

  async function inviteUser(email: string, role: UserRole, clubId: string | null) {
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: { email, role, club_id: clubId },
    })
    if (!error) await fetchLog()
    return { data, error }
  }

  return { log, loading, fetchLog, inviteUser }
})
