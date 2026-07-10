<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useDistrictCalendarStore } from '@/stores/districtCalendar'
import type { DistrictCalendarEvent } from '@/types'

const calendar = useDistrictCalendarStore()

const filter = ref<'upcoming' | 'all' | 'past'>('upcoming')

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function daysUntil(dateStr: string) {
  const d = new Date(dateStr)
  const t = new Date(todayStr())
  return Math.ceil((d.getTime() - t.getTime()) / 86400000)
}

// 比照原始規劃（vivianrotary-cloud/3481rotarymember 的 rotary3481_platform_12.html）呈現方式：
// 依緊急程度分級上色——已過期灰階、進行中紅、7天內金、30天內綠，其餘用淺藍底。
function badgeFor(event: DistrictCalendarEvent) {
  const startDays = daysUntil(event.start_date)
  const endDays = daysUntil(event.end_date)
  const isPast = endDays < 0
  const isToday = startDays <= 0 && endDays >= 0
  const isSoon = startDays > 0 && startDays <= 7
  const isNear = startDays > 7 && startDays <= 30

  const bg = isPast ? '#E5E7EB' : isToday ? '#B03030' : isSoon ? '#B8892A' : isNear ? '#2A6B48' : '#EEF6FF'
  const color = isPast ? '#6B7280' : (isToday || isSoon || isNear) ? '#fff' : 'var(--navy)'
  const text = isPast ? '已過' : isToday ? '進行中' : startDays > 0 ? `剩 ${startDays} 天` : '已結束'

  return { bg, color, text, isPast }
}

const filtered = computed(() => {
  const today = todayStr()
  const events = [...calendar.events].sort((a, b) => a.start_date.localeCompare(b.start_date))
  if (filter.value === 'upcoming') return events.filter(e => (e.end_date || e.start_date) >= today)
  if (filter.value === 'past') return events.filter(e => (e.end_date || e.start_date) < today)
  return events
})

const monthGroups = computed(() => {
  const byMonth = new Map<string, DistrictCalendarEvent[]>()
  for (const e of filtered.value) {
    const key = e.start_date.slice(0, 7)
    if (!byMonth.has(key)) byMonth.set(key, [])
    byMonth.get(key)!.push(e)
  }
  return [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, events]) => ({ month, events }))
})

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split('-')
  return `${y} 年 ${parseInt(m, 10)} 月`
}

function formatShort(dateStr: string) {
  return `${dateStr.slice(5, 7)}/${dateStr.slice(8, 10)}`
}

function formatRaw(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`)
  return `${dateStr.replace(/-/g, '.')}(${WEEKDAYS[d.getDay()]})`
}

function dateRangeText(event: DistrictCalendarEvent) {
  return event.start_date === event.end_date
    ? formatRaw(event.start_date)
    : `${formatRaw(event.start_date)} ~ ${formatRaw(event.end_date)}`
}

function escapeIcs(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
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
    'DESCRIPTION:國際扶輪3481地區行事曆',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `3481地區_${event.title.replace(/[\\/:*?"<>|\r\n]/g, '').slice(0, 20)}.ics`
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
        <h1>📅 地區重要行事曆</h1>
        <p class="ph-sub">資料來源：地區辦公室提供 · 共 {{ calendar.events.length }} 項活動 · 每日自動同步</p>
      </div>
      <div class="dc-tabs">
        <button
          v-for="opt in [{ key: 'upcoming', label: '即將到來' }, { key: 'all', label: '全部' }, { key: 'past', label: '已過期' }]"
          :key="opt.key"
          class="dc-tab"
          :class="{ 'dc-tab-on': filter === opt.key }"
          @click="filter = opt.key as typeof filter"
        >{{ opt.label }}</button>
      </div>
    </div>

    <div class="dc-info">
      💡 此行事曆由地區辦公室提供。點各筆活動的「📥 加入行事曆」可下載 .ics 檔，匯入手機 Google / Apple 行事曆。
    </div>

    <div v-if="calendar.latestSync?.status === 'error'" class="dc-warn">
      ⚠️ 最近一次自動同步失敗（{{ formatSyncTime(calendar.latestSync.synced_at) }}），目前顯示的是上一次同步成功的資料。錯誤訊息：{{ calendar.latestSync.error_message }}
    </div>

    <div v-if="calendar.loading" style="color:var(--muted); padding:20px;">載入中…</div>

    <div v-else-if="!filtered.length" class="dc-empty">無相符的活動</div>

    <div v-else>
      <div v-for="group in monthGroups" :key="group.month" class="dc-month">
        <div class="dc-month-head">
          {{ formatMonthLabel(group.month) }}
          <span class="dc-month-count">{{ group.events.length }} 項</span>
        </div>
        <div class="dc-month-body">
          <div
            v-for="event in group.events"
            :key="event.id"
            class="dc-row"
            :class="{ 'dc-row-past': badgeFor(event).isPast }"
          >
            <div class="dc-row-date">
              <div class="dc-row-date-num">{{ formatShort(event.start_date) }}</div>
              <div class="dc-row-duration">{{ event.time_slot }}</div>
            </div>
            <div class="dc-row-body">
              <div class="dc-row-title">{{ event.title }}</div>
              <div class="dc-row-meta">📍 {{ event.location || '未公布' }}　·　{{ dateRangeText(event) }}</div>
            </div>
            <div class="dc-row-side">
              <span
                class="dc-badge"
                :style="{ background: badgeFor(event).bg, color: badgeFor(event).color }"
              >{{ badgeFor(event).text }}</span>
              <button v-if="!badgeFor(event).isPast" class="dc-ics-btn" @click="downloadIcs(event)">📥 加入行事曆</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="calendar.latestSync && calendar.latestSync.status === 'success'" class="dc-sync-footer">
      最後同步：{{ formatSyncTime(calendar.latestSync.synced_at) }}
      <span v-if="calendar.latestSync.source_file_name">（來源檔案：{{ calendar.latestSync.source_file_name }}）</span>
    </div>
  </div>
</template>

<style scoped>
.ph-sub { font-size: 12px; color: var(--muted); margin-top: 3px; }

.dc-tabs {
  display: flex;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
}

.dc-tab {
  border: none;
  border-left: 1px solid var(--border);
  padding: 6px 12px;
  background: #fff;
  color: var(--muted);
  cursor: pointer;
  font-size: 11px;
  font-family: inherit;
}

.dc-tab:first-child { border-left: none; }

.dc-tab-on { background: var(--navy); color: #fff; }

.dc-info {
  background: #EEF6FF;
  border: 1px solid var(--navy);
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 14px;
  font-size: 11px;
  color: var(--navy);
}

.dc-warn {
  background: #FDF0F0;
  border: 1px solid var(--red);
  color: var(--red);
  border-radius: var(--r-sm);
  padding: 10px 14px;
  font-size: 12px;
  margin-bottom: 16px;
}

.dc-empty {
  text-align: center;
  color: var(--muted);
  padding: 40px;
  background: var(--card);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.dc-month { margin-bottom: 18px; }

.dc-month-head {
  background: var(--navy);
  color: #fff;
  padding: 8px 14px;
  border-radius: 8px 8px 0 0;
  font-weight: 700;
  font-size: 13px;
}

.dc-month-count {
  font-weight: 400;
  font-size: 11px;
  color: rgba(255, 255, 255, .7);
  margin-left: 6px;
}

.dc-month-body {
  background: var(--card);
  border: 1px solid var(--border);
  border-top: none;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
}

.dc-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}

.dc-month-body .dc-row:first-child { border-top: none; }

.dc-row-past { opacity: .55; }

.dc-row-date { text-align: center; min-width: 54px; }

.dc-row-date-num { font-size: 11px; color: var(--muted); font-weight: 600; }

.dc-row-duration { font-size: 10px; color: var(--muted); }

.dc-row-body { min-width: 0; }

.dc-row-title { font-size: 13px; font-weight: 600; color: var(--navy); line-height: 1.4; white-space: pre-line; }

.dc-row-meta { font-size: 11px; color: var(--muted); margin-top: 3px; white-space: pre-line; }

.dc-row-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}

.dc-badge {
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.dc-ics-btn {
  background: none;
  border: 1px solid var(--border);
  color: var(--muted);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
}

.dc-sync-footer {
  margin-top: 18px;
  font-size: 11px;
  color: var(--muted);
  text-align: center;
}

@media (max-width: 600px) {
  .ph { flex-direction: column; align-items: flex-start; }
  .dc-row { grid-template-columns: 1fr; }
  .dc-row-date { text-align: left; }
  .dc-row-side { align-items: flex-start; flex-direction: row; }
}
</style>
