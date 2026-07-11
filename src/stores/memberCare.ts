import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { MemberCare, MemberCareInsert, MemberCareUpdate } from '@/types'

export const useMemberCareStore = defineStore('memberCare', () => {
  const records = ref<MemberCare[]>([])
  const loading = ref(false)

  async function fetchAll(clubId: string | null) {
    if (!clubId) {
      records.value = []
      return
    }
    loading.value = true
    const { data } = await supabase
      .from('member_care')
      .select('*')
      .eq('club_id', clubId)
      .order('care_date', { ascending: false })
    records.value = data ?? []
    loading.value = false
  }

  async function insert(payload: MemberCareInsert) {
    const { error } = await supabase.from('member_care').insert(payload)
    if (!error) await fetchAll(payload.club_id)
    return { error }
  }

  async function update(id: string, clubId: string, payload: MemberCareUpdate) {
    const { error } = await supabase.from('member_care').update(payload).eq('id', id)
    if (!error) await fetchAll(clubId)
    return { error }
  }

  async function remove(id: string, clubId: string) {
    const { error } = await supabase.from('member_care').delete().eq('id', id)
    if (!error) await fetchAll(clubId)
    return { error }
  }

  return { records, loading, fetchAll, insert, update, remove }
})
