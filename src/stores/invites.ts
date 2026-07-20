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

  // clubId 有值時只查該社（社端視角用，即使查詢的人是地區管理員、RLS 放行看
  // 全地區 invite_log，這裡也要在查詢這層限定範圍，避免其他社的邀請紀錄
  // 被傳到瀏覽器）；不帶或傳 null 才是地區管理員在地區視角看全地區紀錄
  async function fetchLog(clubId?: string | null) {
    loading.value = true
    let query = supabase
      .from('invite_log')
      .select('*')
      .order('invited_at', { ascending: false })
    if (clubId) query = query.eq('club_id', clubId)
    const { data } = await query
    log.value = data ?? []
    loading.value = false
  }

  async function inviteUser(email: string, role: UserRole, clubId: string | null, name?: string) {
    const { data, error } = await supabase.functions.invoke<{ success: boolean; cross_club_grant?: boolean; user_id: string }>(
      'invite-user',
      { body: { email, role, club_id: clubId, name } }
    )

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
