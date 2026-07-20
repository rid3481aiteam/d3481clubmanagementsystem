import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type {
  ActivityInsert,
  ActivityRegistrationFormData,
  ActivityRegistrationWithClub,
  ActivityUpdate,
  ActivityWithClub,
} from '@/types'

export const useActivitiesStore = defineStore('activities', () => {
  const activities = ref<ActivityWithClub[]>([])
  const current = ref<ActivityWithClub | null>(null)
  const myRegistration = ref<ActivityRegistrationWithClub | null>(null)
  const registrations = ref<ActivityRegistrationWithClub[]>([])
  const loading = ref(false)

  // clubId 有值時只查「跟本社有關」的活動：本社主辦的（不論分類/狀態）+
  // 其他社主辦但非草稿的公開活動（友社/地區活動）。RLS 對地區管理員是放行
  // 看全地區（含其他社的例會私人報名活動），切到社端視角時要在查詢這層
  // 額外擋掉，不能只靠畫面過濾——不然瀏覽器還是會收到其他社的私人資料。
  // 不帶或傳 null 才是地區視角，看全地區（含其他社的例會，供地區管理員總覽）。
  async function fetchAll(clubId?: string | null) {
    loading.value = true
    let query = supabase
      .from('activities')
      .select('*, clubs(name)')
      .order('start_at', { ascending: false })
    if (clubId) query = query.or(`organizing_club_id.eq.${clubId},and(meeting_id.is.null,status.neq.draft)`)
    const { data } = await query
    activities.value = (data as ActivityWithClub[] | null) ?? []
    loading.value = false
  }

  async function fetchOne(id: string) {
    const { data } = await supabase
      .from('activities')
      .select('*, clubs(name)')
      .eq('id', id)
      .single()
    current.value = data as ActivityWithClub | null
    return current.value
  }

  async function insert(payload: ActivityInsert) {
    const { error } = await supabase.from('activities').insert(payload)
    return { error }
  }

  async function update(id: string, payload: ActivityUpdate) {
    const { error } = await supabase.from('activities').update(payload).eq('id', id)
    return { error }
  }

  // 查該活動的報名紀錄。scopeClubId 有值時代表「不是本社主辦、也不是地區
  // 視角」，只查得到自己所屬社的報名紀錄——地區管理員的 RLS 放行看全地區，
  // 切到社端視角看別社主辦的活動時，這裡要在查詢這層擋掉其他社的報名明細，
  // 不能只靠畫面過濾。是本社主辦或在地區視角時傳 null/不傳，看該活動全部報名。
  async function fetchRegistrationsForActivity(activityId: string, scopeClubId?: string | null) {
    loading.value = true
    let query = supabase
      .from('activity_registrations')
      .select('*, clubs(name)')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: true })
    if (scopeClubId) query = query.eq('club_id', scopeClubId)
    const { data } = await query
    registrations.value = (data as ActivityRegistrationWithClub[] | null) ?? []
    loading.value = false
  }

  // 查自己是否已報名這場活動
  async function fetchMyRegistration(activityId: string, userId: string) {
    const { data } = await supabase
      .from('activity_registrations')
      .select('*, clubs(name)')
      .eq('activity_id', activityId)
      .eq('registrant_id', userId)
      .maybeSingle()
    myRegistration.value = data as ActivityRegistrationWithClub | null
    return myRegistration.value
  }

  // 送出／改回覆內容（報名或不克參加）：已有紀錄（含已取消）就更新，沒有就新增
  async function submitResponse(
    activityId: string,
    clubId: string,
    userId: string,
    status: 'registered' | 'declined',
    formData: ActivityRegistrationFormData
  ) {
    const { data: existing } = await supabase
      .from('activity_registrations')
      .select('id')
      .eq('activity_id', activityId)
      .eq('registrant_id', userId)
      .maybeSingle()

    const { error } = existing
      ? await supabase
          .from('activity_registrations')
          .update({ status, form_data: formData })
          .eq('id', existing.id)
      : await supabase.from('activity_registrations').insert({
          activity_id: activityId,
          club_id: clubId,
          registrant_id: userId,
          form_data: formData,
          status,
        })

    if (!error) await fetchMyRegistration(activityId, userId)
    return { error }
  }

  // 例會列表用：查一批例會各自對應的活動 id（由 036 的 trigger 自動建立，舊例會可能沒有）
  async function fetchByMeetingIds(meetingIds: string[]) {
    if (!meetingIds.length) return {} as Record<string, string>
    const { data } = await supabase.from('activities').select('id, meeting_id').in('meeting_id', meetingIds)
    return Object.fromEntries((data ?? []).map(a => [a.meeting_id as string, a.id as string]))
  }

  return {
    activities,
    current,
    myRegistration,
    registrations,
    loading,
    fetchAll,
    fetchOne,
    insert,
    update,
    fetchRegistrationsForActivity,
    fetchMyRegistration,
    submitResponse,
    fetchByMeetingIds,
  }
})
