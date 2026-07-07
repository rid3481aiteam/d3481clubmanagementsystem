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

  async function fetchAll() {
    loading.value = true
    const { data } = await supabase
      .from('activities')
      .select('*, clubs(name)')
      .order('start_at', { ascending: true })
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

  // 主辦社查看該活動全部報名紀錄（含跨社報名者，RLS 已限定只有主辦社/地區管理員能查到）
  async function fetchRegistrationsForActivity(activityId: string) {
    loading.value = true
    const { data } = await supabase
      .from('activity_registrations')
      .select('*, clubs(name)')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: true })
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

  // 報名／改報名內容：已有紀錄（含已取消）就更新，沒有就新增
  async function register(
    activityId: string,
    clubId: string,
    userId: string,
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
          .update({ status: 'registered', form_data: formData })
          .eq('id', existing.id)
      : await supabase.from('activity_registrations').insert({
          activity_id: activityId,
          club_id: clubId,
          registrant_id: userId,
          form_data: formData,
          status: 'registered',
        })

    if (!error) await fetchMyRegistration(activityId, userId)
    return { error }
  }

  async function cancelRegistration(registrationId: string, activityId: string, userId: string) {
    const { error } = await supabase
      .from('activity_registrations')
      .update({ status: 'cancelled' })
      .eq('id', registrationId)
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
    register,
    cancelRegistration,
    fetchByMeetingIds,
  }
})
