<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { useMembershipReportsStore } from '@/stores/membershipReports'
import { useAttendanceStore } from '@/stores/attendance'
import type { ClubMonthlyMembershipReport, ClubMonthlyAttendanceRate } from '@/types'

const reports = useMembershipReportsStore()
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
const monthReports = ref<ClubMonthlyMembershipReport[]>([])
const monthAttendance = ref<ClubMonthlyAttendanceRate[]>([])
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
  const reportByClub = new Map(monthReports.value.map(r => [r.club_id, r]))
  const attByClub = new Map(monthAttendance.value.map(a => [a.club_id, a]))
  return clubs.value.map(c => {
    const r = reportByClub.get(c.id) ?? null
    const a = attByClub.get(c.id) ?? null
    const baselineTotal = (r?.baseline_male ?? 0) + (r?.baseline_female ?? 0)
    const currentTotal = (r?.current_male ?? 0) + (r?.current_female ?? 0)
    const ageTotal = (r?.age_under_40 ?? 0) + (r?.age_41_plus ?? 0)
    return {
      clubId: c.id,
      clubName: c.name,
      zone: c.zone || '未分區',
      report: r,
      baselineTotal,
      currentTotal,
      netGrowth: r ? currentTotal - baselineTotal : null,
      ageTotal,
      meetingCount: a?.meeting_count ?? 0,
      rate: a?.rate ?? null,
    }
  })
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
  const [reportRows, attRows] = await Promise.all([
    reports.fetchDistrictMonth(selectedMonth.value),
    attendance.fetchDistrictMonthlyRates(selectedMonth.value),
  ])
  monthReports.value = reportRows
  monthAttendance.value = attRows
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
      <h1>社友增減月報（全區）</h1>
    </div>

    <div style="display:flex; align-items:center; gap:10px; margin-bottom:20px;">
      <label style="font-size:13px; color:var(--muted); font-weight:600;">選擇月份</label>
      <input type="month" class="fi" v-model="selectedMonth" style="max-width:180px;" />
    </div>

    <div class="tw" style="overflow-x:auto;">
      <table>
        <thead class="th">
          <tr>
            <th rowspan="2" style="vertical-align:middle;">社名</th>
            <th colspan="3">RI 半年報基準人數</th>
            <th colspan="3">{{ selectedMonth }} 月底人數</th>
            <th rowspan="2" style="vertical-align:middle;">淨成長</th>
            <th colspan="3">{{ selectedMonth }} 年齡分布</th>
            <th rowspan="2" style="vertical-align:middle;">例會次數</th>
            <th rowspan="2" style="vertical-align:middle;">出席率</th>
          </tr>
          <tr>
            <th>男</th><th>女</th><th>合計</th>
            <th>男</th><th>女</th><th>合計</th>
            <th>40歲以下</th><th>41歲以上</th><th>合計</th>
          </tr>
        </thead>
        <tbody v-for="g in groupedRows" :key="g.zone">
          <tr class="zone-row" @click="toggleZone(g.zone)">
            <td colspan="13">
              <span class="zone-chevron">{{ collapsedZones.has(g.zone) ? '▸' : '▾' }}</span>
              <strong>{{ g.zone }}</strong>
              <span style="color:var(--muted); font-weight:400;">（{{ g.list.length }} 社）</span>
            </td>
          </tr>
          <template v-if="!collapsedZones.has(g.zone)">
            <tr v-for="r in g.list" :key="r.clubId">
              <td>{{ r.clubName }}</td>
              <td>{{ r.report?.baseline_male ?? '-' }}</td>
              <td>{{ r.report?.baseline_female ?? '-' }}</td>
              <td>{{ r.baselineTotal }}</td>
              <td>{{ r.report?.current_male ?? '-' }}</td>
              <td>{{ r.report?.current_female ?? '-' }}</td>
              <td>{{ r.currentTotal }}</td>
              <td>{{ r.netGrowth ?? '-' }}</td>
              <td>{{ r.report?.age_under_40 ?? '-' }}</td>
              <td>{{ r.report?.age_41_plus ?? '-' }}</td>
              <td>{{ r.ageTotal }}</td>
              <td>{{ r.meetingCount }}</td>
              <td>
                <span class="bdg" :class="r.rate != null && r.rate < 75 ? 'b-r' : 'b-gr'">
                  {{ r.rate != null ? r.rate + '%' : '-' }}
                </span>
              </td>
            </tr>
          </template>
        </tbody>
        <tbody v-if="!clubs.length">
          <tr>
            <td colspan="13" style="text-align:center; color:var(--muted);">尚無社團資料</td>
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
