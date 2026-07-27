import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { ClubOfficer, ClubOfficerInsert, ClubOfficerUpdate } from '@/types'

export function currentYearTerm(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  return m >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}

export const useOfficersStore = defineStore('officers', () => {
  const list = ref<ClubOfficer[]>([])
  const loading = ref(false)

  async function fetchAll(clubId: string, yearTerm?: string) {
    loading.value = true
    let query = supabase.from('club_officers').select('*').eq('club_id', clubId).order('created_at')
    if (yearTerm) query = query.eq('year_term', yearTerm)
    const { data } = await query
    list.value = data ?? []
    loading.value = false
  }

  async function insert(payload: ClubOfficerInsert) {
    const { error } = await supabase.from('club_officers').insert(payload)
    return { error }
  }

  async function update(id: string, payload: ClubOfficerUpdate) {
    const { error } = await supabase.from('club_officers').update(payload).eq('id', id)
    return { error }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('club_officers').delete().eq('id', id)
    return { error }
  }

  async function fetchYearTerms(clubId: string): Promise<string[]> {
    const { data } = await supabase.from('club_officers').select('year_term').eq('club_id', clubId)
    const terms = new Set((data ?? []).map(d => d.year_term))
    return [...terms].sort((a, b) => b.localeCompare(a))
  }

  // 給地區視角的「社團總覽」用：一次撈全地區當年度的社長/執秘，不分社
  // （RLS 的 club_officers_select 本來就放行 is_district_viewer() 看全部）。
  const districtByTerm = ref<ClubOfficer[]>([])
  async function fetchDistrictYearTerm(yearTerm: string) {
    const { data } = await supabase.from('club_officers').select('*').eq('year_term', yearTerm)
    districtByTerm.value = data ?? []
  }

  return { list, loading, fetchAll, insert, update, remove, fetchYearTerms, districtByTerm, fetchDistrictYearTerm }
})
