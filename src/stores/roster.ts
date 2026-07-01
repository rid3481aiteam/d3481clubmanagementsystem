import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { RosterMember, RosterMemberInsert, RosterMemberUpdate } from '@/types'

export const useRosterStore = defineStore('roster', () => {
  const members = ref<RosterMember[]>([])
  const loading = ref(false)

  async function fetchAll(clubId: string | null) {
    loading.value = true
    let query = supabase.from('roster').select('*').order('name')
    if (clubId) query = query.eq('club_id', clubId)
    const { data } = await query
    members.value = data ?? []
    loading.value = false
  }

  async function insert(payload: RosterMemberInsert) {
    const { error } = await supabase.from('roster').insert(payload)
    return { error }
  }

  async function update(id: string, payload: RosterMemberUpdate) {
    const { error } = await supabase.from('roster').update(payload).eq('id', id)
    return { error }
  }

  async function setActive(id: string, isActive: boolean) {
    return update(id, { is_active: isActive })
  }

  return { members, loading, fetchAll, insert, update, setActive }
})
