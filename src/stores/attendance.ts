import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type {
  AttendanceSession,
  AttendanceDetail,
  AttendanceStatus,
  MemberAttendanceRate,
  ClubMonthlyAttendanceRate,
  MeetingAttendanceSummary,
} from '@/types'

export const useAttendanceStore = defineStore('attendance', () => {
  const session = ref<AttendanceSession | null>(null)
  const details = ref<AttendanceDetail[]>([])
  const rates = ref<MemberAttendanceRate[]>([])
  const monthlyRates = ref<ClubMonthlyAttendanceRate[]>([])
  const meetingSummaries = ref<MeetingAttendanceSummary[]>([])
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

  // 該社某月的例會出席清單（社端「出席月報」頁的「本月例會」表格）
  async function fetchMeetingsForMonth(clubId: string, month: string) {
    const [y, m] = month.split('-').map(Number)
    const start = `${month}-01`
    const nextMonth = new Date(y, m, 1)
    const end = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-${String(nextMonth.getDate()).padStart(2, '0')}`

    const { data } = await supabase
      .from('meetings')
      .select('id, date, title, speaker_name, attendance_sessions(id, total, present, rate, attendance_details(id))')
      .eq('club_id', clubId)
      .gte('date', start)
      .lt('date', end)
      .order('date')

    meetingSummaries.value = (data ?? []).map((m: any) => {
      const s = Array.isArray(m.attendance_sessions) ? m.attendance_sessions[0] : m.attendance_sessions
      return {
        id: m.id,
        date: m.date,
        title: m.title,
        speaker_name: m.speaker_name,
        expected: s?.total ?? null,
        actual: s?.present ?? null,
        rate: s?.rate ?? null,
        hasDetail: !!(s?.attendance_details?.length),
      }
    })
  }

  // 快速新增／補登某一天的例會出席人數（不逐人登記），給沒有走「新增例會」
  // 流程的社在「出席月報」頁直接補資料用。找到當天已有例會就更新彙總數字，
  // 但如果那場例會已經有逐人出席明細（透過「活動」頁的出席記錄登記過），
  // 就拒絕覆蓋，請使用者改去該例會的出席記錄頁編輯，避免誤刪真實的逐人記錄。
  async function quickAddSession(
    clubId: string,
    date: string,
    expected: number,
    actual: number,
    title?: string
  ) {
    const { data: existingMeeting } = await supabase
      .from('meetings')
      .select('id')
      .eq('club_id', clubId)
      .eq('date', date)
      .maybeSingle()

    let meetingId = existingMeeting?.id as string | undefined

    if (!meetingId) {
      const { data: newMeeting, error: meetingError } = await supabase
        .from('meetings')
        .insert({ club_id: clubId, date, title: title || null })
        .select()
        .single()
      if (meetingError) return { error: meetingError }
      meetingId = newMeeting.id
    }

    const { data: existingSession } = await supabase
      .from('attendance_sessions')
      .select('id')
      .eq('meeting_id', meetingId)
      .maybeSingle()

    const absent = Math.max(expected - actual, 0)

    if (existingSession) {
      const { count } = await supabase
        .from('attendance_details')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', existingSession.id)
      if ((count ?? 0) > 0) {
        return { error: { message: '這一天已有逐人出席記錄，請至「活動」頁該例會的出席記錄編輯詳細出席名單' } }
      }
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ total: expected, present: actual, absent, leave: 0, exempt: 0 })
        .eq('id', existingSession.id)
      return { error }
    }

    const { error } = await supabase.from('attendance_sessions').insert({
      meeting_id: meetingId,
      club_id: clubId,
      total: expected,
      present: actual,
      absent,
      leave: 0,
      exempt: 0,
    })
    return { error }
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
    meetingSummaries,
    loading,
    fetchSession,
    fetchDetails,
    fetchRates,
    fetchMonthlyRates,
    fetchDistrictMonthlyRates,
    fetchMeetingsForMonth,
    quickAddSession,
    save,
  }
})
