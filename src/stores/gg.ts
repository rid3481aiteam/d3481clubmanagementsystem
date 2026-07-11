import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { GgCase, GgCaseInsert, GgCaseUpdate } from '@/types'

export const useGgStore = defineStore('gg', () => {
  const cases = ref<GgCase[]>([])
  const loading = ref(false)

  async function fetchAll(clubId: string | null) {
    if (!clubId) {
      cases.value = []
      return
    }
    loading.value = true
    const { data } = await supabase
      .from('gg_cases')
      .select('*')
      .eq('club_id', clubId)
      .order('start_date', { ascending: false })
    cases.value = data ?? []
    loading.value = false
  }

  async function insert(payload: GgCaseInsert, userId: string | null) {
    const { error } = await supabase.from('gg_cases').insert({ ...payload, created_by: userId })
    if (!error) await fetchAll(payload.club_id)
    return { error }
  }

  async function update(id: string, clubId: string, payload: GgCaseUpdate) {
    const { error } = await supabase.from('gg_cases').update(payload).eq('id', id)
    if (!error) await fetchAll(clubId)
    return { error }
  }

  async function remove(id: string, clubId: string) {
    const { error } = await supabase.from('gg_cases').delete().eq('id', id)
    if (!error) await fetchAll(clubId)
    return { error }
  }

  return { cases, loading, fetchAll, insert, update, remove }
})
