<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useDistrictCalendarStore } from '@/stores/districtCalendar'
import type { DistrictCalendarEvent } from '@/types'

const calendar = useDistrictCalendarStore()

const filter = ref<'upcoming' | 'all' | 'past'>('upcoming')

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

const filtered = computed(() => {
  const today = todayStr()
  if (filter.value === 'upcoming') return calendar.events.filter(e => e.end_date >= today)
  if (filter.value === 'past') return calendar.events.filter(e => e.end_date < today)
  return calendar.events
})

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function dateRangeLabel(event: DistrictCalendarEvent) {
  return event.start_date === event.end_date
    ? formatDate(event.start_date)
    : `${formatDate(event.start_date)} - ${formatDate(event.end_date)}`
}

function escapeIcs(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function downloadIcs(event: DistrictCalendarEvent) {
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//D3481//DistrictCalendar//ZH',
    'BEGIN:VEVENT',
    `UID:${event.id}@d3481clubmanagementsystem`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${event.start_date.replace(/-/g, '')}`,
    `DTEND;VALUE=DATE:${addDays(event.end_date, 1).replace(/-/g, '')}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    event.location ? `LOCATION:${escapeIcs(event.location)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${event.title.replace(/[\\/:*?"<>|]/g, '')}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

function formatSyncTime(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

onMounted(() => {
  calendar.fetchEvents()
  calendar.fetchLatestSync()
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <div>
        <h1>地區行事曆</h1>
        <p class="ph-sub">資料來源：地區辦公室提供的 Excel，每日自動同步</p>
      </div>
    </div>

    <div
      v-if="calendar.latestSync?.status === 'error'"
      class="dc-warn"
    >
      ⚠️ 最近一次自動同步失敗（{{ formatSyncTime(calendar.latestSync.synced_at) }}），目前顯示的是上一次同步成功的資料。錯誤訊息：{{ calendar.latestSync.error_message }}
    </div>

    <div class="dc-tabs">
      <button class="btn" :class="filter === 'upcoming' ? 'btn-gold' : 'btn-g'" @click="filter = 'upcoming'">即將到來</button>
      <button class="btn" :class="filter === 'all' ? 'btn-gold' : 'btn-g'" @click="filter = 'all'">全部</button>
      <button class="btn" :class="filter === 'past' ? 'btn-gold' : 'btn-g'" @click="filter = 'past'">已過期</button>
    </div>

    <div v-if="calendar.loading" style="color:var(--muted); padding:20px;">載入中…</div>

    <div v-else-if="!filtered.length" class="dc-empty">目前沒有符合條件的行事曆項目</div>

    <div v-else class="dc-list">
      <div v-for="event in filtered" :key="event.id" class="dc-card">
        <div class="dc-date">{{ dateRangeLabel(event) }}</div>
        <div class="dc-body">
          <div class="dc-title">{{ event.title }}</div>
          <div class="dc-meta">
            <span v-if="event.time_slot">🕒 {{ event.time_slot }}</span>
            <span v-if="event.location">📍 {{ event.location }}</span>
          </div>
        </div>
        <button class="btn btn-g btn-sm" @click="downloadIcs(event)">📥 加入行事曆</button>
      </div>
    </div>

    <div v-if="calendar.latestSync && calendar.latestSync.status === 'success'" class="dc-sync-footer">
      最後同步：{{ formatSyncTime(calendar.latestSync.synced_at) }} · 共 {{ calendar.latestSync.event_count }} 筆
      <span v-if="calendar.latestSync.source_file_name">（來源檔案：{{ calendar.latestSync.source_file_name }}）</span>
    </div>
  </div>
</template>

<style scoped>
.ph-sub { font-size: 12px; color: var(--muted); margin-top: 3px; }

.dc-warn {
  background: #FDF0F0;
  border: 1px solid var(--red);
  color: var(--red);
  border-radius: var(--r-sm);
  padding: 10px 14px;
  font-size: 12px;
  margin-bottom: 16px;
}

.dc-tabs { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }

.dc-empty {
  color: var(--muted);
  text-align: center;
  padding: 40px 0;
  font-size: 13px;
}

.dc-list { display: flex; flex-direction: column; gap: 10px; }

.dc-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.dc-date {
  font-weight: 700;
  color: var(--navy);
  min-width: 72px;
  font-variant-numeric: tabular-nums;
}

.dc-body { flex: 1; min-width: 200px; }

.dc-title { font-weight: 600; white-space: pre-line; }

.dc-meta { font-size: 12px; color: var(--muted); display: flex; gap: 14px; margin-top: 4px; flex-wrap: wrap; }

.dc-sync-footer {
  margin-top: 18px;
  font-size: 11px;
  color: var(--muted);
  text-align: center;
}

@media (max-width: 600px) {
  .dc-card { flex-direction: column; align-items: flex-start; }
}
</style>
