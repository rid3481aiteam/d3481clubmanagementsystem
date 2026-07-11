import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAnnouncementsStore } from '@/stores/announcements'
import type { MemberAttendanceRate, ProspectiveMember } from '@/types'

interface DistrictClubStat {
  clubId: string
  clubName: string
  zone: string
  rate: number | null
  sessionCount: number
  joinedCount: number
  resignedCount: number
}

function currentYearTerm(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  return m >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}

function currentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return {
    start: formatLocalDate(start),
    end: formatLocalDate(end),
  }
}

function formatLocalDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const useDashboardStore = defineStore('dashboard', () => {
  const meetingCount = ref(0)
  const avgRate = ref<number | null>(null)
  const monthlyRate = ref<number | null>(null)
  const memberCount = ref(0)
  const needsCare = ref<MemberAttendanceRate[]>([])
  const followUps = ref<ProspectiveMember[]>([])
  const districtClubStats = ref<DistrictClubStat[]>([])
  const loading = ref(false)

  function resetDistrictData() {
    districtClubStats.value = []
  }

  async function loadDistrict() {
    loading.value = true
    const announcements = useAnnouncementsStore()
    announcements.districtAnnouncements = []
    announcements.clubAnnouncements = []

    const monthRange = currentMonthRange()
    const yearTerm = currentYearTerm()

    const { data: clubs } = await supabase
      .from('clubs')
      .select('id, name, zone, sort_order')
      .order('sort_order')
      .order('name')

    const clubRows = clubs ?? []

    const { data: monthlyMeetings } = await supabase
      .from('meetings')
      .select('id')
      .gte('date', monthRange.start)
      .lt('date', monthRange.end)
    meetingCount.value = (monthlyMeetings ?? []).length

    const { data: yearMeetings } = await supabase
      .from('meetings')
      .select('id, club_id')
      .eq('year_term', yearTerm)
    const meetingRows = yearMeetings ?? []
    const meetingToClub = new Map(meetingRows.map(m => [m.id, m.club_id]))
    const meetingIds = meetingRows.map(m => m.id)

    const rateBuckets = new Map<string, number[]>()
    if (meetingIds.length) {
      const { data: sessions } = await supabase
        .from('attendance_sessions')
        .select('meeting_id, rate')
        .in('meeting_id', meetingIds)
      for (const s of sessions ?? []) {
        const clubId = meetingToClub.get(s.meeting_id)
        if (!clubId || s.rate === null) continue
        if (!rateBuckets.has(clubId)) rateBuckets.set(clubId, [])
        rateBuckets.get(clubId)!.push(s.rate)
      }
    }

    const { data: joinedProspects } = await supabase
      .from('prospective_members')
      .select('club_id')
      .eq('status', 'joined')

    const joinedCounts = new Map<string, number>()
    for (const p of joinedProspects ?? []) {
      joinedCounts.set(p.club_id, (joinedCounts.get(p.club_id) ?? 0) + 1)
    }

    const { data: resignedMembers } = await supabase
      .from('roster')
      .select('club_id')
      .eq('member_status', 'resigned')

    const resignedCounts = new Map<string, number>()
    for (const m of resignedMembers ?? []) {
      resignedCounts.set(m.club_id, (resignedCounts.get(m.club_id) ?? 0) + 1)
    }

    districtClubStats.value = clubRows.map(c => {
      const rates = rateBuckets.get(c.id) ?? []
      return {
        clubId: c.id,
        clubName: c.name,
        zone: c.zone || '未分區',
        rate: rates.length ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 10) / 10 : null,
        sessionCount: rates.length,
        joinedCount: joinedCounts.get(c.id) ?? 0,
        resignedCount: resignedCounts.get(c.id) ?? 0,
      }
    })

    avgRate.value = null
    memberCount.value = 0
    needsCare.value = []
    followUps.value = []
    loading.value = false
  }

  async function load(clubId: string | null) {
    loading.value = true
    resetDistrictData()
    const announcements = useAnnouncementsStore()
    const yearTerm = currentYearTerm()
    const monthRange = currentMonthRange()

    let monthlyMeetingsQuery = supabase
      .from('meetings')
      .select('id')
      .gte('date', monthRange.start)
      .lt('date', monthRange.end)
    if (clubId) monthlyMeetingsQuery = monthlyMeetingsQuery.eq('club_id', clubId)
    const { data: monthlyMeetings } = await monthlyMeetingsQuery
    meetingCount.value = (monthlyMeetings ?? []).length

    let yearMeetingsQuery = supabase.from('meetings').select('id').eq('year_term', yearTerm)
    if (clubId) yearMeetingsQuery = yearMeetingsQuery.eq('club_id', clubId)
    const { data: yearMeetings } = await yearMeetingsQuery
    const meetingIds = (yearMeetings ?? []).map(m => m.id)

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

    if (clubId) {
      const { data: monthlyRow } = await supabase
        .from('club_monthly_attendance_rate')
        .select('rate')
        .eq('club_id', clubId)
        .eq('month', monthRange.start.slice(0, 7))
        .maybeSingle()
      monthlyRate.value = monthlyRow?.rate ?? null
    } else {
      monthlyRate.value = null
    }

    let rosterQuery = supabase.from('roster').select('id', { count: 'exact', head: true }).eq('is_active', true)
    if (clubId) rosterQuery = rosterQuery.eq('club_id', clubId)
    const { count } = await rosterQuery
    memberCount.value = count ?? 0

    // 需關懷社友（出席率 <80% 前 10 名，涵蓋原本另外顯示的「低出席率警示（<75%）」）
    let careQuery = supabase.from('member_attendance_rate').select('*').lt('rate', 80).order('rate')
    if (clubId) careQuery = careQuery.eq('club_id', clubId)
    const { data: careRows } = await careQuery.limit(10)
    needsCare.value = careRows ?? []

    let prospectQuery = supabase
      .from('prospective_members')
      .select('*')
      .in('status', ['not_invited', 'invited', 'no_reply'])
      .order('follow_up_date', { ascending: true, nullsFirst: false })
    if (clubId) prospectQuery = prospectQuery.eq('club_id', clubId)
    const { data: prospects } = await prospectQuery.limit(10)
    followUps.value = prospects ?? []

    if (clubId) {
      await Promise.all([
        announcements.fetchDistrictForClub(),
        announcements.fetchClubForDashboard(clubId),
      ])
    } else {
      announcements.districtAnnouncements = []
      announcements.clubAnnouncements = []
    }

    loading.value = false
  }

  return {
    meetingCount,
    avgRate,
    monthlyRate,
    memberCount,
    needsCare,
    followUps,
    districtClubStats,
    loading,
    load,
    loadDistrict,
  }
})
