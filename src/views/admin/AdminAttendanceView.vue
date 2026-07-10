<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAttendanceStore } from '@/stores/attendance'
import type { ClubMonthlyAttendanceRate } from '@/types'

const attendance = useAttendanceStore()

interface ClubRow {
  id: string
  name: string
  zone: string
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const selectedMonth = ref(currentMonth())
const clubs = ref<ClubRow[]>([])
const monthlyRates = ref<ClubMonthlyAttendanceRate[]>([])
const loading = ref(false)

const ZONE_ORDER = [
  '第一分區', '第二分區', '第三分區', '第四分區', '第五分區',
  '第六分區', '第七分區', '第八分區', '第九分區', '第十分區', '第十一分區',
]

function zoneRank(zone: string) {
  const i = ZONE_ORDER.indexOf(zone)
  return i === -1 ? ZONE_ORDER.length : i
}

const rows = computed(() => {
  const rateByClub = new Map(monthlyRates.value.map(r => [r.club_id, r]))
  return clubs.value.map(c => ({
    clubId: c.id,
    clubName: c.name,
    zone: c.zone || '未分區',
    row: rateByClub.get(c.id) ?? null,
  }))
})

const groupedRows = computed(() => {
  const groups = new Map<string, typeof rows.value>()
  for (const r of rows.value) {
    if (!groups.has(r.zone)) groups.set(r.zone, [])
    groups.get(r.zone)!.push(r)
  }
  return [...groups.entries()]
    .sort((a, b) => zoneRank(a[0]) - zoneRank(b[0]) || a[0].localeCompare(b[0]))
    .map(([zone, list]) => ({ zone, list }))
})

const collapsedZones = ref(new Set<string>())
function toggleZone(zone: string) {
  const s = new Set(collapsedZones.value)
  if (s.has(zone)) s.delete(zone)
  else s.add(zone)
  collapsedZones.value = s
}

async function loadClubs() {
  const { data } = await supabase
    .from('clubs')
    .select('id, name, zone, sort_order')
    .order('sort_order')
    .order('name')
  clubs.value = data ?? []
}

async function loadMonth() {
  loading.value = true
  monthlyRates.value = await attendance.fetchDistrictMonthlyRates(selectedMonth.value)
  loading.value = false
}

onMounted(async () => {
  await loadClubs()
  await loadMonth()
})

watch(selectedMonth, loadMonth)
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>出席月報（全區）</h1>
    </div>

    <div style="display:flex; align-items:center; gap:10px; margin-bottom:20px;">
      <label style="font-size:13px; color:var(--muted); font-weight:600;">選擇月份</label>
      <input type="month" class="fi" v-model="selectedMonth" style="max-width:180px;" />
    </div>

    <div class="tw">
      <table>
        <thead class="th">
          <tr>
            <th>社名</th>
            <th>例會場次</th>
            <th>出席率</th>
          </tr>
        </thead>
        <tbody v-for="g in groupedRows" :key="g.zone">
          <tr class="zone-row" @click="toggleZone(g.zone)">
            <td colspan="3">
              <span class="zone-chevron">{{ collapsedZones.has(g.zone) ? '▸' : '▾' }}</span>
              <strong>{{ g.zone }}</strong>
              <span style="color:var(--muted); font-weight:400;">（{{ g.list.length }} 社）</span>
            </td>
          </tr>
          <template v-if="!collapsedZones.has(g.zone)">
            <tr v-for="r in g.list" :key="r.clubId">
              <td>{{ r.clubName }}</td>
              <td>{{ r.row?.meeting_count ?? 0 }}</td>
              <td>
                <div style="display:flex; align-items:center; gap:8px; min-width:120px;">
                  <span
                    class="bdg"
                    :class="r.row?.rate != null && r.row.rate < 75 ? 'b-r' : 'b-gr'"
                  >
                    {{ r.row?.rate != null ? r.row.rate + '%' : '-' }}
                  </span>
                  <div v-if="r.row?.rate != null" class="bar-track" style="flex:1;">
                    <div class="bar-fill" :style="{ width: r.row.rate + '%' }"></div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
        <tbody v-if="!clubs.length">
          <tr>
            <td colspan="3" style="text-align:center; color:var(--muted);">尚無社團資料</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.zone-row {
  cursor: pointer;
  background: var(--gold-p);
}
.zone-row td {
  font-size: 13px;
  color: var(--navy);
  padding: 8px 14px;
}
.zone-chevron {
  display: inline-block;
  width: 14px;
  color: var(--muted);
}
</style>
