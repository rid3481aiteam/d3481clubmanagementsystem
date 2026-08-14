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

        <!-- Desktop (>1024px): 完整表格 -->
        <table class="dc-table">
          <thead>
            <tr>
              <th class="dc-col-date">日期</th>
              <th class="dc-col-slot">時段</th>
              <th class="dc-col-title">活動名稱</th>
              <th class="dc-col-loc">地點</th>
              <th class="dc-col-full">完整日期</th>
              <th class="dc-col-count">倒數天數</th>
              <th class="dc-col-ics">加入行事曆</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="event in group.events"
              :key="event.id"
              :class="{ 'dc-table-row-past': badgeFor(event).isPast }"
            >
              <td>{{ formatShort(event.start_date) }}</td>
              <td>{{ event.time_slot }}</td>
              <td class="dc-table-title">{{ event.title }}</td>
              <td>{{ event.location || '未公布' }}</td>
              <td>{{ dateRangeText(event) }}</td>
              <td>
                <span
                  class="dc-badge"
                  :style="{ background: badgeFor(event).bg, color: badgeFor(event).color }"
                >{{ badgeFor(event).text }}</span>
              </td>
              <td>
                <button v-if="!badgeFor(event).isPast" class="dc-ics-btn" @click="downloadIcs(event)">📥 加入行事曆</button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Tablet / Mobile (<1024px): 卡片 -->
        <div class="dc-cards">
          <div
            v-for="event in group.events"
            :key="event.id"
            class="dc-card"
            :class="{ 'dc-card-past': badgeFor(event).isPast }"
          >
            <div class="dc-card-top">
              <div class="dc-card-date">
                <span class="dc-card-date-num">{{ formatShort(event.start_date) }}</span>
                <span class="dc-card-timeslot">{{ event.time_slot }}</span>
              </div>
              <span
                class="dc-badge dc-card-badge"
                :style="{ background: badgeFor(event).bg, color: badgeFor(event).color }"
              >{{ badgeFor(event).text }}</span>
            </div>
            <div class="dc-card-title">{{ event.title }}</div>
            <div class="dc-card-loc">📍 {{ event.location || '未公布' }}</div>
            <button
              v-if="!badgeFor(event).isPast"
              class="dc-card-ics"
              aria-label="加入行事曆"
              @click="downloadIcs(event)"
            >
              <span class="dc-card-ics-icon">📥</span>
              <span class="dc-card-ics-label">加入行事曆</span>
            </button>
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
  overflow-x: auto;
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
  white-space: nowrap;
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
  position: sticky;
  top: 0;
  z-index: 1;
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

.dc-badge {
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
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

/* ---- Desktop 表格（>=1024px 顯示，見下方 @media 覆寫）---- */
.dc-table {
  display: none;
  width: 100%;
  table-layout: fixed;
  background: var(--card);
  border: 1px solid var(--border);
  border-top: none;
  border-radius: 0 0 8px 8px;
  border-collapse: collapse;
  overflow: hidden;
}

.dc-table .dc-col-date  { width: 64px; }
.dc-table .dc-col-slot  { width: 90px; }
.dc-table .dc-col-title { width: auto; }
.dc-table .dc-col-loc   { width: 160px; }
.dc-table .dc-col-full  { width: 130px; }
.dc-table .dc-col-count { width: 90px; }
.dc-table .dc-col-ics   { width: 110px; }

.dc-table th, .dc-table td {
  padding: 10px 14px;
  text-align: left;
  border-top: 1px solid var(--border);
  font-size: 12px;
  vertical-align: middle;
  overflow-wrap: anywhere;
}

.dc-table thead th {
  border-top: none;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .4px;
}

.dc-table-title { font-weight: 600; color: var(--navy); white-space: pre-line; }

.dc-table-row-past { opacity: .55; }

/* ---- Tablet / Mobile 卡片（預設，<1024px）---- */
.dc-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  background: var(--card);
  border: 1px solid var(--border);
  border-top: none;
  border-radius: 0 0 8px 8px;
  padding: 10px;
}

.dc-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  min-width: 0;
}

.dc-card-past { opacity: .55; }

.dc-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.dc-card-date { display: flex; align-items: baseline; gap: 6px; min-width: 0; }

.dc-card-date-num { font-size: 13px; font-weight: 700; color: var(--navy); }

.dc-card-timeslot { font-size: 10px; color: var(--muted); }

.dc-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--navy);
  line-height: 1.4;
  white-space: pre-line;
  overflow-wrap: anywhere;
  margin-top: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dc-card-loc {
  font-size: 11px;
  color: var(--muted);
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dc-card-ics {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 8px;
  min-width: 44px;
  min-height: 44px;
  background: none;
  border: 1px solid var(--border);
  color: var(--muted);
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
}

.dc-card-ics-icon { font-size: 16px; }

.dc-card-ics-label { display: none; }

/* ---- Tablet：640–1024px，兩欄卡片，地點/按鈕文字回來 ---- */
@media (min-width: 640px) {
  .dc-cards { grid-template-columns: 1fr 1fr; }

  .dc-card-title { -webkit-line-clamp: unset; }

  .dc-card-ics { justify-content: flex-start; width: auto; padding: 4px 10px; margin-left: auto; }

  .dc-card-ics-label { display: inline; }
}

/* ---- Mobile：<640px，篩選頁籤等寬三等分 ---- */
@media (max-width: 639.98px) {
  .ph { flex-direction: column; align-items: flex-start; }
  .dc-tabs { width: 100%; }
  .dc-tab { flex: 1 1 33.333%; text-align: center; }
}

/* ---- Desktop：>=1024px，顯示表格、隱藏卡片 ---- */
@media (min-width: 1024px) {
  .dc-table { display: table; }
  .dc-cards { display: none; }
}
</style>
