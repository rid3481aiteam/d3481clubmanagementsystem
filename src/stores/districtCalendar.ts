import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { DistrictCalendarEvent, DistrictCalendarSyncLog } from '@/types'

export const useDistrictCalendarStore = defineStore('districtCalendar', () => {
  const events = ref<DistrictCalendarEvent[]>([])
  const latestSync = ref<DistrictCalendarSyncLog | null>(null)
  const loading = ref(false)

  async function fetchEvents() {
    loading.value = true
    const { data } = await supabase
      .from('district_calendar_events')
      .select('*')
      .order('start_date', { ascending: true })
      .order('sort_order', { ascending: true })
    events.value = data ?? []
    loading.value = false
  }

  async function fetchLatestSync() {
    const { data } = await supabase
      .from('district_calendar_sync_log')
      .select('*')
      .order('synced_at', { ascending: false })
      .limit(1)
    latestSync.value = data?.[0] ?? null
  }

  return { events, latestSync, loading, fetchEvents, fetchLatestSync }
})
