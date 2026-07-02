import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Club } from '@/types'

export const useClubStore = defineStore('club', () => {
  const current = ref<Club | null>(null)
  const allClubs = ref<Club[]>([])
  const loading = ref(false)

  async function fetchCurrent(clubId: string) {
    loading.value = true
    const { data } = await supabase
      .from('clubs')
      .select('*')
      .eq('id', clubId)
      .single()
    current.value = data
    loading.value = false
  }

  async function fetchAll() {
    loading.value = true
    const { data } = await supabase
      .from('clubs')
      .select('*')
      .order('name')
    allClubs.value = data ?? []
    loading.value = false
  }

  async function upsertClub(payload: Partial<Club>) {
    const { error } = await supabase.from('clubs').upsert(payload)
    if (!error) await fetchAll()
    return { error }
  }

  async function swapOrder(a: Club, b: Club) {
    const { error: e1 } = await supabase.from('clubs').update({ sort_order: b.sort_order }).eq('id', a.id)
    const { error: e2 } = await supabase.from('clubs').update({ sort_order: a.sort_order }).eq('id', b.id)
    if (!e1 && !e2) await fetchAll()
    return { error: e1 || e2 }
  }

  async function checkDeletable(id: string) {
    const [rosterRes, accountRes] = await Promise.all([
      supabase.from('roster').select('id', { count: 'exact', head: true }).eq('club_id', id),
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('club_id', id),
    ])
    return { rosterCount: rosterRes.count ?? 0, accountCount: accountRes.count ?? 0 }
  }

  async function deleteClub(id: string) {
    const { error } = await supabase.from('clubs').delete().eq('id', id)
    if (!error) await fetchAll()
    return { error }
  }

  return { current, allClubs, loading, fetchCurrent, fetchAll, upsertClub, swapOrder, checkDeletable, deleteClub }
})
