import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type {
  ClubMonthlyMembershipReport,
  ClubMonthlyMembershipReportUpdate,
} from '@/types'

export const useMembershipReportsStore = defineStore('membershipReports', () => {
  const reports = ref<ClubMonthlyMembershipReport[]>([])
  const loading = ref(false)

  // 單一社的歷月報告（社端填寫頁、地區端社團詳情頁）
  async function fetchAll(clubId: string) {
    loading.value = true
    const { data } = await supabase
      .from('club_monthly_membership_reports')
      .select('*')
      .eq('club_id', clubId)
      .order('month', { ascending: false })
    reports.value = data ?? []
    loading.value = false
  }

  // 全地區某一個月，各社報告（地區端總表頁）
  async function fetchDistrictMonth(month: string) {
    const { data } = await supabase
      .from('club_monthly_membership_reports')
      .select('*')
      .eq('month', month)
    return (data ?? []) as ClubMonthlyMembershipReport[]
  }

  async function upsert(
    clubId: string,
    month: string,
    fields: ClubMonthlyMembershipReportUpdate,
    userId: string | null
  ) {
    const existing = reports.value.find(r => r.month === month)
    const { error } = existing
      ? await supabase
          .from('club_monthly_membership_reports')
          .update({ ...fields, updated_by: userId })
          .eq('id', existing.id)
      : await supabase
          .from('club_monthly_membership_reports')
          .insert({ club_id: clubId, month, ...fields, created_by: userId, updated_by: userId })
    if (!error) await fetchAll(clubId)
    return { error }
  }

  return { reports, loading, fetchAll, fetchDistrictMonth, upsert }
})
