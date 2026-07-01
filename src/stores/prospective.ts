import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { ProspectiveMember, ProspectiveMemberInsert } from '@/types'

export const useProspectiveStore = defineStore('prospective', () => {
  const prospects = ref<ProspectiveMember[]>([])
  const loading = ref(false)

  async function fetchAll(clubId: string | null) {
    loading.value = true
    let query = supabase.from('prospective_members').select('*').order('follow_up_date', { ascending: true, nullsFirst: false })
    if (clubId) query = query.eq('club_id', clubId)
    const { data } = await query
    prospects.value = data ?? []
    loading.value = false
  }

  async function insert(payload: ProspectiveMemberInsert) {
    const { error } = await supabase.from('prospective_members').insert(payload)
    return { error }
  }

  async function update(id: string, payload: Partial<ProspectiveMemberInsert>) {
    const { error } = await supabase.from('prospective_members').update(payload).eq('id', id)
    return { error }
  }

  return { prospects, loading, fetchAll, insert, update }
})
