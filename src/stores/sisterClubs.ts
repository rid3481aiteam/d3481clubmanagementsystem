import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { SisterClub, SisterClubInsert, SisterClubUpdate } from '@/types'

export const useSisterClubsStore = defineStore('sisterClubs', () => {
  const list = ref<SisterClub[]>([])
  const loading = ref(false)

  async function fetchAll(clubId: string) {
    loading.value = true
    const { data, error } = await supabase
      .from('sister_clubs')
      .select('*')
      .eq('club_id', clubId)
      .order('established_date', { ascending: false })

    list.value = error ? [] : data ?? []
    loading.value = false
    return { error }
  }

  async function create(payload: SisterClubInsert) {
    const { error } = await supabase.from('sister_clubs').insert(payload)
    if (!error) await fetchAll(payload.club_id)
    return { error }
  }

  async function update(id: string, clubId: string, payload: SisterClubUpdate) {
    const { error } = await supabase.from('sister_clubs').update(payload).eq('id', id)
    if (!error) await fetchAll(clubId)
    return { error }
  }

  async function remove(id: string, clubId: string) {
    const { error } = await supabase.from('sister_clubs').delete().eq('id', id)
    if (!error) await fetchAll(clubId)
    return { error }
  }

  return { list, loading, fetchAll, create, update, remove }
})
