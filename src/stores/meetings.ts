import { defineStore } from 'pinia'
import { ref } from 'vue'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Meeting, MeetingInsert, MeetingUpdate } from '@/types'

export const useMeetingsStore = defineStore('meetings', () => {
  const meetings = ref<Meeting[]>([])
  const current = ref<Meeting | null>(null)
  const loading = ref(false)

  async function fetchAll(clubId: string | null) {
    loading.value = true
    let query = supabase.from('meetings').select('*').order('date', { ascending: false })
    if (clubId) query = query.eq('club_id', clubId)
    const { data } = await query
    meetings.value = data ?? []
    loading.value = false
  }

  async function fetchOne(id: string) {
    const { data } = await supabase.from('meetings').select('*').eq('id', id).single()
    current.value = data
    return data
  }

  async function insert(payload: MeetingInsert) {
    const { data, error } = await supabase.from('meetings').insert(payload).select('id').single()
    return { data, error }
  }

  // 新增例會後自動發信通知本社社友（K1_meeting_email_notify 開啟時才有意義呼叫）
  // rosterIds 有帶＝只發給勾選的名單（空陣列＝使用者沒勾任何人，不發信）；
  // 不帶＝維持發給本社全部有 Email 的正常社友。extraEmails 是額外手動輸入的非社友
  // 收件人（例如來賓、講師），會加進去一起發，不受 rosterIds 邏輯影響
  async function notifyCreated(meetingId: string, rosterIds?: string[], extraEmails?: string[]) {
    const body: Record<string, unknown> = { meeting_id: meetingId }
    if (rosterIds) body.roster_ids = rosterIds
    if (extraEmails?.length) body.extra_emails = extraEmails

    const { data, error } = await supabase.functions.invoke<{
      success: boolean
      sent: number
      skipped_no_email: number
      extra_sent?: number
      message?: string
    }>('notify-meeting-created', { body })

    if (error) {
      let msg = error.message
      if (error instanceof FunctionsHttpError) {
        try {
          const body = await error.context.json()
          if (body?.error) msg = body.error
        } catch {
          // 回應不是 JSON，維持預設訊息
        }
      }
      return { data: null, error: msg }
    }
    return { data, error: null }
  }

  async function update(id: string, payload: MeetingUpdate) {
    const { error } = await supabase.from('meetings').update(payload).eq('id', id)
    return { error }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('meetings').delete().eq('id', id)
    return { error }
  }

  return { meetings, current, loading, fetchAll, fetchOne, insert, notifyCreated, update, remove }
})
