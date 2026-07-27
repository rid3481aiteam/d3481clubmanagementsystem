import { defineStore } from 'pinia'
import { ref } from 'vue'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types'

// role／district_role 互斥：社角色授權（grant_type='club'）只有 role 有值，
// 地區權限授權（grant_type='district'）只有 district_role 有值。
export interface InviteLogEntry {
  id: string
  invited_by: string | null
  invited_email: string
  club_id: string | null
  role: UserRole | null
  district_role: 'view' | 'admin' | null
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

  // 全站改用 RotarySSO 登入後，這裡不再是「邀請新帳號」，而是「幫已經自己
  // 用 SSO 登入過的既有帳號，額外授權」——district 授予地區工作人員權限
  // （district_role），club 授予跨社協作權限（user_club_roles）。
  type GrantPayload =
    | { grant_type: 'district'; district_role: 'view' | 'admin' }
    | { grant_type: 'club'; club_id: string; role: UserRole }

  async function grantAccess(email: string, payload: GrantPayload) {
    const { data, error } = await supabase.functions.invoke<{ success: boolean; grant_type: string }>(
      'invite-user',
      { body: { email, ...payload } }
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

  return { log, loading, fetchLog, grantAccess }
})
