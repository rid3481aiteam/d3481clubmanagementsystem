import { defineStore } from 'pinia'
import { ref } from 'vue'
import { FunctionsHttpError } from '@supabase/supabase-js'
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

  async function inviteUser(email: string, role: UserRole, clubId: string | null, name?: string) {
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: { email, role, club_id: clubId, name },
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
      return { data, error: { message } }
    }

    await fetchLog()
    return { data, error: null }
  }

  return { log, loading, fetchLog, inviteUser }
})
