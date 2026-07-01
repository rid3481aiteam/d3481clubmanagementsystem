import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { MemberAttendanceRate, ProspectiveMember } from '@/types'

function currentYearTerm(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  return m >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}

export const useDashboardStore = defineStore('dashboard', () => {
  const meetingCount = ref(0)
  const avgRate = ref<number | null>(null)
  const memberCount = ref(0)
  const lowAttendance = ref<MemberAttendanceRate[]>([])
  const followUps = ref<ProspectiveMember[]>([])
  const loading = ref(false)

  async function load(clubId: string | null) {
    loading.value = true
    const yearTerm = currentYearTerm()

    let meetingsQuery = supabase.from('meetings').select('id').eq('year_term', yearTerm)
    if (clubId) meetingsQuery = meetingsQuery.eq('club_id', clubId)
    const { data: meetings } = await meetingsQuery
    const meetingIds = (meetings ?? []).map(m => m.id)
    meetingCount.value = meetingIds.length

    if (meetingIds.length) {
      const { data: sessions } = await supabase
        .from('attendance_sessions')
        .select('rate')
        .in('meeting_id', meetingIds)
      const rates = (sessions ?? []).map(s => s.rate).filter((r): r is number => r !== null)
      avgRate.value = rates.length
        ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 10) / 10
        : null
    } else {
      avgRate.value = null
    }

    let rosterQuery = supabase.from('roster').select('id', { count: 'exact', head: true }).eq('is_active', true)
    if (clubId) rosterQuery = rosterQuery.eq('club_id', clubId)
    const { count } = await rosterQuery
    memberCount.value = count ?? 0

    let rateQuery = supabase.from('member_attendance_rate').select('*').lt('rate', 75).order('rate')
    if (clubId) rateQuery = rateQuery.eq('club_id', clubId)
    const { data: lowRates } = await rateQuery.limit(10)
    lowAttendance.value = lowRates ?? []

    let prospectQuery = supabase
      .from('prospective_members')
      .select('*')
      .in('status', ['not_invited', 'invited', 'no_reply'])
      .order('follow_up_date', { ascending: true, nullsFirst: false })
    if (clubId) prospectQuery = prospectQuery.eq('club_id', clubId)
    const { data: prospects } = await prospectQuery.limit(10)
    followUps.value = prospects ?? []

    loading.value = false
  }

  return { meetingCount, avgRate, memberCount, lowAttendance, followUps, loading, load }
})
