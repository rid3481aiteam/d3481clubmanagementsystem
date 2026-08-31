<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { useAttendanceStore } from '@/stores/attendance'
import { useMembershipReportsStore } from '@/stores/membershipReports'
import { useFeaturesStore } from '@/stores/features'
import type { ClubMonthlyAttendanceRate, ClubMonthlyMembershipReport } from '@/types'

const attendance = useAttendanceStore()
const reports = useMembershipReportsStore()
const features = useFeaturesStore()

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
const monthReports = ref<ClubMonthlyMembershipReport[]>([])
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
  const reportByClub = new Map(monthReports.value.map(r => [r.club_id, r]))
  return clubs.value.map(c => {
    const rate = rateByClub.get(c.id) ?? null
    const report = reportByClub.get(c.id) ?? null
    const baselineTotal = (report?.baseline_male ?? 0) + (report?.baseline_female ?? 0)
    const currentTotal = (report?.current_male ?? 0) + (report?.current_female ?? 0)
    const ageTotal = (report?.age_under_40 ?? 0) + (report?.age_41_plus ?? 0)
    return {
      clubId: c.id,
      clubName: c.name,
      zone: c.zone || '未分區',
      rate,
      report,
      baselineTotal,
      currentTotal,
      netGrowth: report ? currentTotal - baselineTotal : null,
      ageTotal,
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

// 全區合計（比照使用者提供的 RI 半年報 Excel 最下面的「合計」列）：只加總
// 社友人數相關欄位，例會次數／出席率不加總——Excel 原本那幾欄在合計列
// 也是留空，因為「出席率」本來就不是能直接相加的數字，各社例會次數
// 不一也加總沒有意義。目前系統還沒有「衛星社」的資料，等衛星社建進來
// 之後，這裡預留可以再拆成「扶輪社合計／衛星社合計／合計」三列。
const totals = computed(() => {
  let baseline_male = 0, baseline_female = 0, current_male = 0, current_female = 0
  let age_under_40 = 0, age_41_plus = 0
  for (const r of rows.value) {
    baseline_male += r.report?.baseline_male ?? 0
    baseline_female += r.report?.baseline_female ?? 0
    current_male += r.report?.current_male ?? 0
    current_female += r.report?.current_female ?? 0
    age_under_40 += r.report?.age_under_40 ?? 0
    age_41_plus += r.report?.age_41_plus ?? 0
  }
  const baselineTotal = baseline_male + baseline_female
  const currentTotal = current_male + current_female
  return {
    baseline_male, baseline_female, baselineTotal,
    current_male, current_female, currentTotal,
    netGrowth: currentTotal - baselineTotal,
    age_under_40, age_41_plus, ageTotal: age_under_40 + age_41_plus,
  }
})

const expandedZones = ref(new Set<string>())
function toggleZone(zone: string) {
  const s = new Set(expandedZones.value)
  if (s.has(zone)) s.delete(zone)
  else s.add(zone)
  expandedZones.value = s
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
  const [rateRows, reportRows] = await Promise.all([
    attendance.fetchDistrictMonthlyRates(selectedMonth.value),
    reports.fetchDistrictMonth(selectedMonth.value),
  ])
  monthlyRates.value = rateRows
  monthReports.value = reportRows
  loading.value = false
}

function handleExport() {
  const withMembership = features.isEnabled('B6_membership_report')
  const exportRows = groupedRows.value.flatMap(g => g.list.map(r => {
    const base: Record<string, string | number> = { 分區: g.zone, 社名: r.clubName }
    if (withMembership) {
      base['RI半年報基準-男'] = r.report?.baseline_male ?? '-'
      base['RI半年報基準-女'] = r.report?.baseline_female ?? '-'
      base['RI半年報基準-合計'] = r.baselineTotal
      base[`${selectedMonth.value}月底-男`] = r.report?.current_male ?? '-'
      base[`${selectedMonth.value}月底-女`] = r.report?.current_female ?? '-'
      base[`${selectedMonth.value}月底-合計`] = r.currentTotal
      base['淨成長'] = r.netGrowth ?? '-'
      base['40歲以下'] = r.report?.age_under_40 ?? '-'
      base['41歲以上'] = r.report?.age_41_plus ?? '-'
      base['年齡合計'] = r.ageTotal
    }
    base['例會次數'] = r.rate?.meeting_count ?? 0
    base['出席率'] = r.rate?.rate != null ? `${r.rate.rate}%` : '-'
    return base
  }))

  if (withMembership) {
    const t = totals.value
    exportRows.push({
      分區: '', 社名: '合計',
      'RI半年報基準-男': t.baseline_male, 'RI半年報基準-女': t.baseline_female, 'RI半年報基準-合計': t.baselineTotal,
      [`${selectedMonth.value}月底-男`]: t.current_male, [`${selectedMonth.value}月底-女`]: t.current_female, [`${selectedMonth.value}月底-合計`]: t.currentTotal,
      淨成長: t.netGrowth,
      '40歲以下': t.age_under_40, '41歲以上': t.age_41_plus, 年齡合計: t.ageTotal,
      例會次數: '-', 出席率: '-',
    })
  }

  const sheet = XLSX.utils.json_to_sheet(exportRows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, '全區月報')
  XLSX.writeFile(wb, `全區月報_${selectedMonth.value}.xlsx`)
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
      <button class="btn btn-g" @click="handleExport">📊 匯出全區月報Excel</button>
    </div>

    <div style="display:flex; align-items:center; gap:10px; margin-bottom:20px;">
      <label style="font-size:13px; color:var(--muted); font-weight:600;">選擇月份</label>
      <input type="month" class="fi" v-model="selectedMonth" style="max-width:180px;" />
    </div>

    <div class="tw" style="overflow-x:auto;">
      <table class="card-table">
        <thead class="th">
          <tr>
            <th class="hdr-purple" rowspan="2" style="vertical-align:middle;">社名</th>
            <template v-if="features.isEnabled('B6_membership_report')">
              <th class="hdr-navy" colspan="3">RI 半年報基準人數</th>
              <th class="hdr-purple" colspan="3">{{ selectedMonth }} 月底人數</th>
              <th class="hdr-yellow" rowspan="2" style="vertical-align:middle;">淨成長</th>
              <th class="hdr-green" colspan="3">{{ selectedMonth }} 年齡分布</th>
            </template>
            <th class="hdr-purple" rowspan="2" style="vertical-align:middle;">例會次數</th>
            <th class="hdr-purple" rowspan="2" style="vertical-align:middle;">出席率</th>
          </tr>
          <tr>
            <template v-if="features.isEnabled('B6_membership_report')">
              <th class="hdr-navy">男</th><th class="hdr-navy">女</th><th class="hdr-navy">合計</th>
              <th class="hdr-purple">男</th><th class="hdr-purple">女</th><th class="hdr-purple">合計</th>
              <th class="hdr-green">40歲以下</th><th class="hdr-green">41歲以上</th><th class="hdr-green">合計</th>
            </template>
          </tr>
        </thead>
        <tbody v-for="g in groupedRows" :key="g.zone">
          <tr class="zone-row" @click="toggleZone(g.zone)">
            <td :colspan="features.isEnabled('B6_membership_report') ? 13 : 3">
              <span class="zone-chevron">{{ expandedZones.has(g.zone) ? '▾' : '▸' }}</span>
              <strong>{{ g.zone }}</strong>
              <span style="color:var(--muted); font-weight:400;">（{{ g.list.length }} 社）</span>
            </td>
          </tr>
          <template v-if="expandedZones.has(g.zone)">
            <tr v-for="r in g.list" :key="r.clubId">
              <td data-label="社名">{{ r.clubName }}</td>
              <template v-if="features.isEnabled('B6_membership_report')">
                <td data-label="基準-男">{{ r.report?.baseline_male ?? '-' }}</td>
                <td data-label="基準-女">{{ r.report?.baseline_female ?? '-' }}</td>
                <td data-label="基準-合計">{{ r.baselineTotal }}</td>
                <td data-label="當月-男">{{ r.report?.current_male ?? '-' }}</td>
                <td data-label="當月-女">{{ r.report?.current_female ?? '-' }}</td>
                <td data-label="當月-合計">{{ r.currentTotal }}</td>
                <td data-label="淨成長">{{ r.netGrowth ?? '-' }}</td>
                <td data-label="40歲以下">{{ r.report?.age_under_40 ?? '-' }}</td>
                <td data-label="41歲以上">{{ r.report?.age_41_plus ?? '-' }}</td>
                <td data-label="年齡合計">{{ r.ageTotal }}</td>
              </template>
              <td data-label="例會次數">{{ r.rate?.meeting_count ?? 0 }}</td>
              <td data-label="出席率">
                <span class="bdg" :class="r.rate?.rate != null && r.rate.rate < 75 ? 'b-r' : 'b-gr'">
                  {{ r.rate?.rate != null ? r.rate.rate + '%' : '-' }}
                </span>
              </td>
            </tr>
          </template>
        </tbody>
        <tbody v-if="!clubs.length">
          <tr>
            <td :colspan="features.isEnabled('B6_membership_report') ? 13 : 3" style="text-align:center; color:var(--muted);">尚無社團資料</td>
          </tr>
        </tbody>
        <tfoot v-if="clubs.length">
          <tr class="totals-row">
            <td>合計</td>
            <template v-if="features.isEnabled('B6_membership_report')">
              <td>{{ totals.baseline_male }}</td>
              <td>{{ totals.baseline_female }}</td>
              <td>{{ totals.baselineTotal }}</td>
              <td>{{ totals.current_male }}</td>
              <td>{{ totals.current_female }}</td>
              <td>{{ totals.currentTotal }}</td>
              <td>{{ totals.netGrowth }}</td>
              <td>{{ totals.age_under_40 }}</td>
              <td>{{ totals.age_41_plus }}</td>
              <td>{{ totals.ageTotal }}</td>
            </template>
            <td>-</td>
            <td>-</td>
          </tr>
        </tfoot>
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
  padding: 14px 14px;
  min-height: 44px;
}
.zone-chevron {
  display: inline-block;
  width: 14px;
  color: var(--muted);
}

.totals-row td {
  font-weight: 700;
  color: var(--navy);
  background: var(--gold-p);
  padding: 14px 14px;
}

/* 比照使用者提供的 RI 半年報 Excel 表頭配色 */
.hdr-purple { background: #5B3F86; color: #fff; }
.hdr-navy   { background: #060FBA; color: #fff; }
.hdr-yellow { background: #FFFF00; color: #000; }
.hdr-green  { background: #08BE26; color: #fff; }
</style>
