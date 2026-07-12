import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Meeting, MeetingInsert, MeetingUpdate } from '@/types'

export const useMeetingsStore = defineStore('meetings', () => {
  const meetings = ref<Meeting[]>([])
  const current = ref<Meeting | null>(null)
  const loading = ref(false)

  async function fetchAll(clubId: string | null) {
    loading.value = true
    let query = supabase.from('meetings').select('*').order('date', { ascending: false })
    if (clubId) query = query.eq('club_id', clubId)
    const { data } = await query
    meetings.value = data ?? []
    loading.value = false
  }

  async function fetchOne(id: string) {
    const { data } = await supabase.from('meetings').select('*').eq('id', id).single()
    current.value = data
    return data
  }

  async function insert(payload: MeetingInsert) {
    const { error } = await supabase.from('meetings').insert(payload)
    return { error }
  }

  async function update(id: string, payload: MeetingUpdate) {
    const { error } = await supabase.from('meetings').update(payload).eq('id', id)
    return { error }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('meetings').delete().eq('id', id)
    return { error }
  }

  return { meetings, current, loading, fetchAll, fetchOne, insert, update, remove }
})
