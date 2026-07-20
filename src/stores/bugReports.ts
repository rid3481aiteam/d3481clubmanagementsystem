import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { BugReport, BugReportWithReporter } from '@/types'

export const useBugReportsStore = defineStore('bugReports', () => {
  const reports = ref<BugReportWithReporter[]>([])
  const loading = ref(false)

  // reporter_id 只有 FK 指到 auth.users，沒有直接指到 user_profiles，
  // PostgREST 用 user_profiles(...) 內嵌語法會找不到關聯整個失敗，
  // 分兩次查再自己拼起來（跟 accounts.ts fetchClubCollaborators 同做法）
  async function fetchAll() {
    loading.value = true
    const { data: rows } = await supabase
      .from('bug_reports')
      .select('*, clubs(name)')
      .order('created_at', { ascending: false })

    const reporterIds = [...new Set((rows ?? []).map(r => r.reporter_id).filter(Boolean))] as string[]
    let profilesById: Record<string, { name: string }> = {}
    if (reporterIds.length) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, name')
        .in('id', reporterIds)
      profilesById = Object.fromEntries((profiles ?? []).map(p => [p.id, { name: p.name }]))
    }

    reports.value = (rows ?? []).map(r => ({
      ...r,
      reporter: r.reporter_id ? (profilesById[r.reporter_id] ?? null) : null,
    })) as BugReportWithReporter[]
    loading.value = false
  }

  async function submitUserReport(description: string, context: {
    reporterId: string
    clubId: string | null
    pagePath: string
    userAgent: string
  }) {
    const { error } = await supabase.from('bug_reports').insert({
      reporter_id: context.reporterId,
      club_id: context.clubId,
      source: 'user',
      description,
      page_path: context.pagePath,
      user_agent: context.userAgent,
    })
    return { error }
  }

  async function submitAutoReport(context: {
    reporterId: string | null
    clubId: string | null
    pagePath: string
    userAgent: string
    errorMessage: string
    errorStack: string | null
  }) {
    const { error } = await supabase.from('bug_reports').insert({
      reporter_id: context.reporterId,
      club_id: context.clubId,
      source: 'auto',
      error_message: context.errorMessage.slice(0, 2000),
      error_stack: context.errorStack?.slice(0, 4000) ?? null,
      page_path: context.pagePath,
      user_agent: context.userAgent,
    })
    return { error }
  }

  async function markResolved(id: string, resolved: boolean) {
    const { error } = await supabase
      .from('bug_reports')
      .update({ status: resolved ? 'resolved' : 'open', resolved_at: resolved ? new Date().toISOString() : null })
      .eq('id', id)
    if (!error) {
      reports.value = reports.value.map(r =>
        r.id === id ? { ...r, status: resolved ? 'resolved' : 'open', resolved_at: resolved ? new Date().toISOString() : null } : r
      )
    }
    return { error }
  }

  return { reports, loading, fetchAll, submitUserReport, submitAutoReport, markResolved }
})

export type { BugReport }
