import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type {
  AttendanceSession,
  AttendanceDetail,
  AttendanceStatus,
  MemberAttendanceRate,
  ClubMonthlyAttendanceRate,
} from '@/types'

export const useAttendanceStore = defineStore('attendance', () => {
  const session = ref<AttendanceSession | null>(null)
  const details = ref<AttendanceDetail[]>([])
  const rates = ref<MemberAttendanceRate[]>([])
  const monthlyRates = ref<ClubMonthlyAttendanceRate[]>([])
  const loading = ref(false)

  async function fetchSession(meetingId: string) {
    const { data } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('meeting_id', meetingId)
      .maybeSingle()
    session.value = data
    if (data) await fetchDetails(data.id)
    else details.value = []
  }

  async function fetchDetails(sessionId: string) {
    const { data } = await supabase
      .from('attendance_details')
      .select('*')
      .eq('session_id', sessionId)
    details.value = data ?? []
  }

  async function fetchRates(clubId: string | null) {
    let query = supabase.from('member_attendance_rate').select('*').order('member_name')
    if (clubId) query = query.eq('club_id', clubId)
    const { data } = await query
    rates.value = data ?? []
  }

  // 單一社的歷月出席率（社端「出席月報」頁、地區端社團詳情頁）
  async function fetchMonthlyRates(clubId: string) {
    const { data } = await supabase
      .from('club_monthly_attendance_rate')
      .select('*')
      .eq('club_id', clubId)
      .order('month', { ascending: false })
    monthlyRates.value = data ?? []
  }

  // 全地區某一個月，各社出席率（地區端「出席月報」頁）
  async function fetchDistrictMonthlyRates(month: string) {
    const { data } = await supabase
      .from('club_monthly_attendance_rate')
      .select('*')
      .eq('month', month)
    return (data ?? []) as ClubMonthlyAttendanceRate[]
  }

  async function save(
    meetingId: string,
    clubId: string,
    statuses: Record<string, AttendanceStatus>
  ) {
    loading.value = true
    const entries = Object.entries(statuses)
    const total = entries.length
    const present = entries.filter(([, s]) => s === 'present').length
    const absent = entries.filter(([, s]) => s === 'absent').length
    const leave = entries.filter(([, s]) => s === 'leave').length
    const exempt = entries.filter(([, s]) => s === 'exempt').length

    let sessionId = session.value?.id

    if (sessionId) {
      await supabase
        .from('attendance_sessions')
        .update({ total, present, absent, leave, exempt })
        .eq('id', sessionId)
    } else {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert({ meeting_id: meetingId, club_id: clubId, total, present, absent, leave, exempt })
        .select()
        .single()
      if (error) {
        loading.value = false
        return { error }
      }
      sessionId = data.id
    }

    await supabase.from('attendance_details').delete().eq('session_id', sessionId)
    const rows = entries.map(([member_id, status]) => ({
      session_id: sessionId,
      club_id: clubId,
      member_id,
      status,
    }))
    const { error } = await supabase.from('attendance_details').insert(rows)

    await fetchSession(meetingId)
    loading.value = false
    return { error }
  }

  return {
    session,
    details,
    rates,
    monthlyRates,
    loading,
    fetchSession,
    fetchDetails,
    fetchRates,
    fetchMonthlyRates,
    fetchDistrictMonthlyRates,
    save,
  }
})
