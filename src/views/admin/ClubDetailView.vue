<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useRosterStore } from '@/stores/roster'
import { useOfficersStore, currentYearTerm } from '@/stores/officers'
import { useAttendanceStore } from '@/stores/attendance'
import { useMembershipReportsStore } from '@/stores/membershipReports'
import { useFeaturesStore } from '@/stores/features'
import type { Club, Meeting, ClubOfficerRole } from '@/types'

const route = useRoute()
const roster = useRosterStore()
const officers = useOfficersStore()
const attendance = useAttendanceStore()
const membershipReports = useMembershipReportsStore()
const features = useFeaturesStore()
const club = ref<Club | null>(null)
const lastMeeting = ref<Meeting | null>(null)
const avgRate = ref<number | null>(null)
const yearTerm = currentYearTerm()

const SINGLE_ROLES: { role: ClubOfficerRole; label: string }[] = [
  { role: 'president', label: '社長' },
  { role: 'president_elect', label: '社長當選人' },
  { role: 'vice_president', label: '副社長' },
  { role: 'secretary', label: '秘書' },
]

// 名冊本身（姓名、聯絡方式等）現在只有該社自己人看得到，地區視角這裡
// 只拿不含個人身分的聚合統計（見 073_roster_district_isolation.sql
// 的 club_active_member_count／club_classification_breakdown）。
const activeMemberCount = ref(0)
const classificationBreakdown = ref<{ classification: string; member_count: number }[]>([])

function officerName(role: ClubOfficerRole) {
  return officers.list.find(o => o.role === role)?.name || '-'
}

async function load() {
  const id = route.params.id as string
  const { data } = await supabase.from('clubs').select('*').eq('id', id).single()
  club.value = data

  activeMemberCount.value = await roster.fetchActiveMemberCount(id)
  classificationBreakdown.value = await roster.fetchClassificationBreakdown(id)
  await officers.fetchAll(id, yearTerm)
  await attendance.fetchMonthlyRates(id)
  await membershipReports.fetchAll(id)

  const { data: meeting } = await supabase
    .from('meetings')
    .select('*')
    .eq('club_id', id)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()
  lastMeeting.value = meeting

  const { data: meetings } = await supabase
    .from('meetings')
    .select('id')
    .eq('club_id', id)
    .eq('year_term', yearTerm)
  const meetingIds = (meetings ?? []).map(m => m.id)
  if (meetingIds.length) {
    const { data: sessions } = await supabase
      .from('attendance_sessions')
      .select('rate')
      .in('meeting_id', meetingIds)
    const rates = (sessions ?? []).map(s => s.rate).filter((r): r is number => r !== null)
    avgRate.value = rates.length
      ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 10) / 10
      : null
  } else {
    avgRate.value = null
  }
}

onMounted(load)
watch(() => route.params.id, load)
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>{{ club?.name ?? '社團' }}｜社團資訊</h1>
      <RouterLink to="/admin/clubs" class="btn btn-g btn-sm">返回社團總覽</RouterLink>
    </div>

    <div v-if="club" style="display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap;">
      <span class="bdg b-n">{{ club.zone }}</span>
    </div>

    <div class="grid">
      <div class="tw card">
        <h3>社友人數</h3>
        <p class="stat">{{ activeMemberCount }} <span class="unit">人</span></p>
      </div>

      <div class="tw card">
        <h3>出席率（{{ yearTerm }}）</h3>
        <p class="stat">{{ avgRate ?? '-' }} <span class="unit" v-if="avgRate !== null">%</span></p>
      </div>

      <div class="tw card">
        <h3>例會時間地點</h3>
        <p>{{ club?.freq || '-' }} {{ club?.meeting_time || '' }}</p>
        <p style="color:var(--muted); font-size:12px; margin-top:4px;">{{ club?.venue || '-' }}</p>
      </div>

      <div class="tw card">
        <h3>最後一次例會</h3>
        <template v-if="lastMeeting">
          <p>{{ lastMeeting.date }}{{ lastMeeting.title ? '｜' + lastMeeting.title : '' }}</p>
          <p style="color:var(--muted); font-size:12px; margin-top:4px;" v-if="lastMeeting.speaker_name">
            講者：{{ lastMeeting.speaker_name }}
          </p>
        </template>
        <p v-else style="color:var(--muted);">尚無例會紀錄</p>
      </div>
    </div>

    <h2 class="section-h">領域分布</h2>
    <div class="tw" style="padding:16px 20px; margin-bottom:24px;">
      <div v-if="classificationBreakdown.length" style="display:flex; gap:8px; flex-wrap:wrap;">
        <span class="bdg b-n" v-for="item in classificationBreakdown" :key="item.classification">{{ item.classification }}（{{ item.member_count }}）</span>
      </div>
      <p v-else style="color:var(--muted); font-size:13px;">尚無社友資料</p>
    </div>

    <h2 class="section-h">社的年度成員（{{ yearTerm }}）</h2>
    <div class="tw" style="padding:16px 20px; margin-bottom:24px;">
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <span class="bdg b-g" v-for="r in SINGLE_ROLES" :key="r.role">{{ r.label }}：{{ officerName(r.role) }}</span>
      </div>
    </div>

    <h2 class="section-h">歷月出席月報</h2>
    <div class="tw" style="margin-bottom:24px; overflow-x:auto;">
      <table class="card-table">
        <thead class="th">
          <tr>
            <th class="hdr-purple">月份</th>
            <th class="hdr-purple">例會場次</th>
            <th class="hdr-purple">應出席 / 實際出席</th>
            <th class="hdr-purple">出席率</th>
            <th v-if="features.isEnabled('B6_membership_report')" class="hdr-purple">當月社友合計</th>
            <th v-if="features.isEnabled('B6_membership_report')" class="hdr-yellow">淨成長</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in attendance.monthlyRates" :key="r.month">
            <td data-label="月份">{{ r.month }}</td>
            <td data-label="例會場次">{{ r.meeting_count }}</td>
            <td data-label="應出席 / 實際出席">{{ r.expected }} / {{ r.actual }}</td>
            <td data-label="出席率">
              <span class="bdg" :class="r.rate !== null && r.rate < 75 ? 'b-r' : 'b-gr'">
                {{ r.rate !== null ? r.rate + '%' : '-' }}
              </span>
            </td>
            <template v-if="features.isEnabled('B6_membership_report')">
              <td data-label="當月社友合計">
                <template v-if="membershipReports.reports.find(m => m.month === r.month)">
                  {{ (membershipReports.reports.find(m => m.month === r.month)!.current_male ?? 0)
                    + (membershipReports.reports.find(m => m.month === r.month)!.current_female ?? 0) }}
                </template>
                <template v-else>-</template>
              </td>
              <td data-label="淨成長">
                <template v-if="membershipReports.reports.find(m => m.month === r.month)">
                  {{ ((membershipReports.reports.find(m => m.month === r.month)!.current_male ?? 0)
                    + (membershipReports.reports.find(m => m.month === r.month)!.current_female ?? 0))
                    - ((membershipReports.reports.find(m => m.month === r.month)!.baseline_male ?? 0)
                    + (membershipReports.reports.find(m => m.month === r.month)!.baseline_female ?? 0)) }}
                </template>
                <template v-else>-</template>
              </td>
            </template>
          </tr>
          <tr v-if="!attendance.monthlyRates.length">
            <td colspan="6" style="text-align:center; color:var(--muted);">該社尚無出席資料</td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}
.card { padding: 16px 18px; }
.card h3 { font-size: 12px; color: var(--muted); font-weight: 600; margin-bottom: 8px; }
.stat { font-size: 24px; font-weight: 700; color: var(--navy); }
.unit { font-size: 12px; font-weight: 400; color: var(--muted); }
.section-h { font-size: 14px; font-weight: 700; color: var(--navy); margin-bottom: 8px; }

/* 比照使用者提供的 RI 半年報 Excel 表頭配色 */
.hdr-purple { background: #5B3F86; color: #fff; }
.hdr-navy   { background: #060FBA; color: #fff; }
.hdr-yellow { background: #FFFF00; color: #000; }
.hdr-green  { background: #08BE26; color: #fff; }
</style>
