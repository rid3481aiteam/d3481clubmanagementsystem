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

  // 個人補出席：只補登「單一社友」某一天的出席狀態，跟上面 quickAddSession
  // （整場例會的應出席／實際出席人次）互補，不互相覆蓋。找不到當天例會／
  // 出席彙總就新建空白的。activeMemberCount 是該社目前在籍（非退社）社友
  // 人數，用來判斷這場例會的逐人明細是不是已經「登記全社」（走過「活動」
  // 頁的逐人出席）——是的話補這位社友之後要連動重算彙總人次，維持跟 save()
  // 一致的統計；如果明細筆數還不到全社人數（多半是走「快速新增」填的整場
  // 人次，或只補登過零星幾位），彙總數字維持原樣，不讓單一社友的補登去
  // 覆蓋別人手動填的整場人次。
  async function makeupMemberAttendance(
    clubId: string,
    memberId: string,
    date: string,
    status: AttendanceStatus,
    activeMemberCount: number
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
        .insert({ club_id: clubId, date })
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

    let sessionId = existingSession?.id as string | undefined
    let hadFullDetails = false

    if (!sessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from('attendance_sessions')
        .insert({ meeting_id: meetingId, club_id: clubId, total: 0, present: 0, absent: 0, leave: 0, exempt: 0 })
        .select()
        .single()
      if (sessionError) return { error: sessionError }
      sessionId = newSession.id
    } else {
      const { count } = await supabase
        .from('attendance_details')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId)
      hadFullDetails = (count ?? 0) >= activeMemberCount
    }

    const { data: existingDetail } = await supabase
      .from('attendance_details')
      .select('id')
      .eq('session_id', sessionId)
      .eq('member_id', memberId)
      .maybeSingle()

    if (existingDetail) {
      const { error } = await supabase
        .from('attendance_details')
        .update({ status })
        .eq('id', existingDetail.id)
      if (error) return { error }
    } else {
      const { error } = await supabase
        .from('attendance_details')
        .insert({ session_id: sessionId, club_id: clubId, member_id: memberId, status })
      if (error) return { error }
    }

    if (hadFullDetails) {
      const { data: allDetails } = await supabase
        .from('attendance_details')
        .select('status')
        .eq('session_id', sessionId)
      const entries = allDetails ?? []
      await supabase
        .from('attendance_sessions')
        .update({
          total: entries.length,
          present: entries.filter(d => d.status === 'present').length,
          absent: entries.filter(d => d.status === 'absent').length,
          leave: entries.filter(d => d.status === 'leave').length,
          exempt: entries.filter(d => d.status === 'exempt').length,
        })
        .eq('id', sessionId)
    }

    return { error: null }
  }

  // 批次「個人補出席」：items 可能混雜多位社友、多個日期，先依日期分組，
  // 同一天只查一次／建一次 meeting + session（避免跟單筆版本一樣，同一天
  // 被查詢好幾次），同一天底下再逐位社友沿用 makeupMemberAttendance 同一套
  // 「找到就更新、找不到就新增」邏輯；全部處理完才視需要重算一次彙總數字。
  async function batchMakeupAttendance(
    clubId: string,
    items: { memberId: string; date: string; status: AttendanceStatus }[],
    activeMemberCount: number
  ) {
    const results: { memberId: string; date: string; error: string | null }[] = []

    const byDate = new Map<string, typeof items>()
    for (const item of items) {
      const list = byDate.get(item.date) ?? []
      list.push(item)
      byDate.set(item.date, list)
    }

    for (const [date, dateItems] of byDate) {
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
          .insert({ club_id: clubId, date })
          .select()
          .single()
        if (meetingError) {
          for (const item of dateItems) results.push({ memberId: item.memberId, date, error: meetingError.message })
          continue
        }
        meetingId = newMeeting.id
      }

      const { data: existingSession } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('meeting_id', meetingId)
        .maybeSingle()

      let sessionId = existingSession?.id as string | undefined
      let hadFullDetails = false

      if (!sessionId) {
        const { data: newSession, error: sessionError } = await supabase
          .from('attendance_sessions')
          .insert({ meeting_id: meetingId, club_id: clubId, total: 0, present: 0, absent: 0, leave: 0, exempt: 0 })
          .select()
          .single()
        if (sessionError) {
          for (const item of dateItems) results.push({ memberId: item.memberId, date, error: sessionError.message })
          continue
        }
        sessionId = newSession.id
      } else {
        const { count } = await supabase
          .from('attendance_details')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', sessionId)
        hadFullDetails = (count ?? 0) >= activeMemberCount
      }

      for (const item of dateItems) {
        const { data: existingDetail } = await supabase
          .from('attendance_details')
          .select('id')
          .eq('session_id', sessionId)
          .eq('member_id', item.memberId)
          .maybeSingle()

        if (existingDetail) {
          const { error } = await supabase
            .from('attendance_details')
            .update({ status: item.status })
            .eq('id', existingDetail.id)
          results.push({ memberId: item.memberId, date, error: error?.message ?? null })
        } else {
          const { error } = await supabase
            .from('attendance_details')
            .insert({ session_id: sessionId, club_id: clubId, member_id: item.memberId, status: item.status })
          results.push({ memberId: item.memberId, date, error: error?.message ?? null })
        }
      }

      if (hadFullDetails) {
        const { data: allDetails } = await supabase
          .from('attendance_details')
          .select('status')
          .eq('session_id', sessionId)
        const entries = allDetails ?? []
        await supabase
          .from('attendance_sessions')
          .update({
            total: entries.length,
            present: entries.filter(d => d.status === 'present').length,
            absent: entries.filter(d => d.status === 'absent').length,
            leave: entries.filter(d => d.status === 'leave').length,
            exempt: entries.filter(d => d.status === 'exempt').length,
          })
          .eq('id', sessionId)
      }
    }

    return { results }
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
    makeupMemberAttendance,
    batchMakeupAttendance,
    save,
  }
})
