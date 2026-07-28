import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { ActivityLogEntry } from '@/types'

export const useActivityLogStore = defineStore('activityLog', () => {
  const list = ref<ActivityLogEntry[]>([])
  const loading = ref(false)

  // clubId 有值 = 各社視角只查自己社；null = 地區視角看全地區（含地區
  // 層級跟所有社的紀錄，RLS 本來就只放行地區管理員這樣查）。
  //
  // sinceDays 只是畫面預設的顯示範圍（減少一次撈太多筆），不是資料庫
  // 保留期限——資料庫本身不會自動清除任何紀錄，選「全部」還是查得到
  // 更早的操作紀錄。
  async function fetchLog(clubId: string | null, sinceDays: number | null = 7) {
    loading.value = true
    let query = supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(500)
    if (clubId) query = query.eq('club_id', clubId)
    if (sinceDays !== null) {
      const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', since)
    }
    const { data } = await query
    list.value = data ?? []
    loading.value = false
  }

  // clubId 傳 null 代表要記地區層級操作（RPC 內部會驗證呼叫者是不是
  // 地區管理員，不是這裡能決定的）。失敗不拋出——記錄失敗不該讓使用者
  // 原本要做的操作也跟著失敗，只在 console 留一筆方便事後排查。
  async function log(action: string, description: string, clubId: string | null = null) {
    const { error } = await supabase.rpc('log_activity', {
      p_action: action,
      p_description: description,
      p_club_id: clubId,
    })
    if (error) console.error('log_activity failed:', action, error)
  }

  return { list, loading, fetchLog, log }
})
