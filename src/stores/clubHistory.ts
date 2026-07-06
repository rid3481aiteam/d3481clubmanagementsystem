import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { ClubHistoryRecord, ClubHistoryInsert, ClubHistoryUpdate } from '@/types'

export const useClubHistoryStore = defineStore('clubHistory', () => {
  const list = ref<ClubHistoryRecord[]>([])
  const loading = ref(false)

  async function fetchAll(clubId: string) {
    loading.value = true
    const { data, error } = await supabase
      .from('club_history')
      .select('*')
      .eq('club_id', clubId)
      .order('year_term', { ascending: false })

    list.value = error ? [] : data ?? []
    loading.value = false
    return { error }
  }

  async function create(payload: ClubHistoryInsert) {
    const { error } = await supabase.from('club_history').insert(payload)
    if (!error) await fetchAll(payload.club_id)
    return { error }
  }

  async function update(id: string, clubId: string, payload: ClubHistoryUpdate) {
    const { error } = await supabase.from('club_history').update(payload).eq('id', id)
    if (!error) await fetchAll(clubId)
    return { error }
  }

  async function remove(id: string, clubId: string) {
    const { error } = await supabase.from('club_history').delete().eq('id', id)
    if (!error) await fetchAll(clubId)
    return { error }
  }

  return { list, loading, fetchAll, create, update, remove }
})
