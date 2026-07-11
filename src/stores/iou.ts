import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { IouReceipt, IouReceiptInsert, IouReceiptUpdate } from '@/types'

export const useIouStore = defineStore('iou', () => {
  const receipts = ref<IouReceipt[]>([])
  const loading = ref(false)

  async function fetchAll(clubId: string | null) {
    if (!clubId) {
      receipts.value = []
      return
    }
    loading.value = true
    const { data } = await supabase
      .from('iou_receipts')
      .select('*')
      .eq('club_id', clubId)
      .order('donation_date', { ascending: false })
    receipts.value = data ?? []
    loading.value = false
  }

  async function insert(payload: IouReceiptInsert, userId: string | null) {
    const { error } = await supabase.from('iou_receipts').insert({ ...payload, created_by: userId })
    if (!error) await fetchAll(payload.club_id)
    return { error }
  }

  async function update(id: string, clubId: string, payload: IouReceiptUpdate) {
    const { error } = await supabase.from('iou_receipts').update(payload).eq('id', id)
    if (!error) await fetchAll(clubId)
    return { error }
  }

  async function remove(id: string, clubId: string) {
    const { error } = await supabase.from('iou_receipts').delete().eq('id', id)
    if (!error) await fetchAll(clubId)
    return { error }
  }

  return { receipts, loading, fetchAll, insert, update, remove }
})
