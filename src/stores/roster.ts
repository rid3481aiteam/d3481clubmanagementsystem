import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { RosterMember, RosterMemberInsert, RosterMemberUpdate } from '@/types'

export const useRosterStore = defineStore('roster', () => {
  const members = ref<RosterMember[]>([])
  const loading = ref(false)

  async function fetchAll(clubId: string | null) {
    loading.value = true
    let query = supabase
      .from('roster')
      .select('*')
      .order('nick_name', { ascending: true, nullsFirst: false })
      .order('name')
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
    return update(id, { is_active: isActive, member_status: isActive ? 'normal' : 'resigned' })
  }

  // 真正刪除一筆社友（例如重複建立的資料），跟 setActive 的「退社」軟刪除不同——
  // 這筆連同出席明細（attendance_details）、社友關懷（member_care）會一併被
  // DB 的 ON DELETE CASCADE 刪掉，無法復原；一般想讓社友離社請改用退社。
  async function remove(id: string) {
    const { error } = await supabase.from('roster').delete().eq('id', id)
    return { error }
  }

  // 給地區視角看「社友人數」「領域分布」這種不含個人身分的統計用——
  // 名冊本身（姓名、聯絡方式等）已經改成只有該社自己人看得到，地區
  // 走這兩支 SECURITY DEFINER 函式，資料庫端就算好聚合結果才回傳，
  // 不會把任何一筆個別社友的原始資料送到瀏覽器。
  async function fetchActiveMemberCount(clubId: string): Promise<number> {
    const { data } = await supabase.rpc('club_active_member_count', { p_club_id: clubId })
    return data ?? 0
  }

  async function fetchClassificationBreakdown(clubId: string): Promise<{ classification: string; member_count: number }[]> {
    const { data } = await supabase.rpc('club_classification_breakdown', { p_club_id: clubId })
    return data ?? []
  }

  return {
    members, loading, fetchAll, insert, update, setActive, remove,
    fetchActiveMemberCount, fetchClassificationBreakdown,
  }
})
