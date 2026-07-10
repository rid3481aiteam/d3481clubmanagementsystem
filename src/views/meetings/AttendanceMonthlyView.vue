<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAttendanceStore } from '@/stores/attendance'
import { useMembershipReportsStore } from '@/stores/membershipReports'
import { usePermissionsStore } from '@/stores/permissions'
import { useFeaturesStore } from '@/stores/features'
import type { ClubMonthlyMembershipReportUpdate } from '@/types'

const auth = useAuthStore()
const attendance = useAttendanceStore()
const reports = useMembershipReportsStore()
const permissions = usePermissionsStore()
const features = useFeaturesStore()

const canEditAttendance = computed(() => permissions.can('attendance', 'edit'))
const canEditMembership = computed(() => permissions.can('membership_reports', 'edit'))

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const selectedMonth = ref(currentMonth())

const selectedRate = computed(() =>
  attendance.monthlyRates.find(r => r.month === selectedMonth.value) ?? null
)

// ── 快速新增／補登例會出席 ──────────────────────────
const quickForm = ref({ date: '', title: '', expected: null as number | null, actual: null as number | null })
const quickSaving = ref(false)
const quickError = ref<string | null>(null)

async function handleQuickAdd() {
  if (!auth.clubId || quickForm.value.expected == null || quickForm.value.actual == null || !quickForm.value.date) return
  quickSaving.value = true
  quickError.value = null
  const { error } = await attendance.quickAddSession(
    auth.clubId,
    quickForm.value.date,
    quickForm.value.expected,
    quickForm.value.actual,
    quickForm.value.title || undefined
  )
  quickSaving.value = false
  if (error) {
    quickError.value = error.message
    return
  }
  quickForm.value = { date: '', title: '', expected: null, actual: null }
  await refreshMonth()
}

// ── RI 半年報基準／當月人數 ──────────────────────────
const membershipForm = ref<ClubMonthlyMembershipReportUpdate>({
  baseline_male: null,
  baseline_female: null,
  current_male: null,
  current_female: null,
  age_under_40: null,
  age_41_plus: null,
})

function loadMembershipForm() {
  const existing = reports.reports.find(r => r.month === selectedMonth.value)
  membershipForm.value = {
    baseline_male: existing?.baseline_male ?? null,
    baseline_female: existing?.baseline_female ?? null,
    current_male: existing?.current_male ?? null,
    current_female: existing?.current_female ?? null,
    age_under_40: existing?.age_under_40 ?? null,
    age_41_plus: existing?.age_41_plus ?? null,
  }
}

const baselineTotal = computed(() => (membershipForm.value.baseline_male ?? 0) + (membershipForm.value.baseline_female ?? 0))
const currentTotal = computed(() => (membershipForm.value.current_male ?? 0) + (membershipForm.value.current_female ?? 0))
const netGrowth = computed(() => currentTotal.value - baselineTotal.value)
const ageTotal = computed(() => (membershipForm.value.age_under_40 ?? 0) + (membershipForm.value.age_41_plus ?? 0))

const membershipSaving = ref(false)
async function handleMembershipSave() {
  if (!auth.clubId) return
  membershipSaving.value = true
  const { error } = await reports.upsert(auth.clubId, selectedMonth.value, membershipForm.value, auth.user?.id ?? null)
  membershipSaving.value = false
  if (error) alert(error.message)
}

function membershipFor(month: string) {
  return reports.reports.find(r => r.month === month) ?? null
}

async function refreshMonth() {
  if (!auth.clubId) return
  await Promise.all([
    attendance.fetchMeetingsForMonth(auth.clubId, selectedMonth.value),
  ])
}

onMounted(async () => {
  if (!auth.clubId) return
  await Promise.all([
    attendance.fetchMonthlyRates(auth.clubId),
    reports.fetchAll(auth.clubId),
    attendance.fetchMeetingsForMonth(auth.clubId, selectedMonth.value),
  ])
  loadMembershipForm()
})

watch(selectedMonth, async () => {
  loadMembershipForm()
  await refreshMonth()
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>出席月報</h1>
    </div>

    <div style="display:flex; align-items:center; gap:10px; margin-bottom:20px;">
      <label style="font-size:13px; color:var(--muted); font-weight:600;">選擇月份</label>
      <input type="month" class="fi" v-model="selectedMonth" style="max-width:180px;" />
    </div>

    <div class="stat-grid" style="margin-bottom:24px;">
      <div class="stat-card c-sky">
        <div class="stat-label">{{ selectedMonth }} 出席率</div>
        <div class="stat-value">{{ selectedRate?.rate ?? '-' }}{{ selectedRate?.rate != null ? '%' : '' }}</div>
        <div v-if="selectedRate?.rate != null" class="rate-bar-wrap" style="margin-top:10px;">
          <div class="bar-track rate-bar-track">
            <div
              class="bar-fill"
              :style="{ width: selectedRate.rate + '%', background: selectedRate.rate < 60 ? 'var(--red)' : 'var(--green)' }"
            ></div>
            <div class="rate-threshold"></div>
          </div>
          <div class="rate-bar-labels">
            <span>0%</span>
            <span class="rate-threshold-label">60% 最低門檻</span>
            <span>100%</span>
          </div>
        </div>
      </div>
      <div class="stat-card c-gold">
        <div class="stat-label">例會場次</div>
        <div class="stat-value">{{ selectedRate?.meeting_count ?? 0 }}</div>
      </div>
    </div>

    <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">{{ selectedMonth }} 例會清單</h2>
    <div class="tw" style="margin-bottom:20px;">
      <table class="card-table">
        <thead class="th">
          <tr>
            <th>日期</th>
            <th>主題 / 講者</th>
            <th class="hdr-purple">應出席</th>
            <th class="hdr-purple">實際出席</th>
            <th class="hdr-purple">出席率</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in attendance.meetingSummaries" :key="m.id">
            <td data-label="日期">{{ m.date }}</td>
            <td data-label="主題 / 講者">
              {{ m.title || '-' }}
              <span v-if="m.speaker_name" style="color:var(--muted);">｜{{ m.speaker_name }}</span>
              <span v-if="!m.hasDetail && m.expected != null" class="bdg b-y" style="margin-left:6px;">未逐人登記</span>
            </td>
            <td data-label="應出席">{{ m.expected ?? '-' }}</td>
            <td data-label="實際出席">{{ m.actual ?? '-' }}</td>
            <td data-label="出席率">
              <span v-if="m.rate != null" class="bdg" :class="m.rate < 75 ? 'b-r' : 'b-gr'">{{ m.rate }}%</span>
              <span v-else>-</span>
            </td>
            <td data-label="操作"><RouterLink :to="`/meetings/${m.id}/attendance`" class="btn btn-g btn-sm">逐人出席</RouterLink></td>
          </tr>
          <tr v-if="!attendance.meetingSummaries.length">
            <td colspan="6" style="text-align:center; color:var(--muted);">本月尚無例會紀錄</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="canEditAttendance" class="tw" style="padding:16px 20px; margin-bottom:24px;">
      <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:10px;">快速新增／補登例會出席</h2>
      <p style="font-size:12px; color:var(--muted); margin-bottom:12px;">
        沒有透過「例會管理」逐人登記時，可以在這裡直接補一筆當天的應出席／實際出席人數。如果該天已經逐人登記過，請改到「例會管理」編輯。
      </p>
      <div class="form-grid">
        <label>
          <span>日期</span>
          <input type="date" class="fi" v-model="quickForm.date" />
        </label>
        <label>
          <span>主題（選填）</span>
          <input type="text" class="fi" v-model="quickForm.title" />
        </label>
        <label>
          <span>應出席人數</span>
          <input type="number" class="fi" v-model.number="quickForm.expected" />
        </label>
        <label>
          <span>實際出席人數</span>
          <input type="number" class="fi" v-model.number="quickForm.actual" />
        </label>
      </div>
      <p v-if="quickError" style="color:var(--red); font-size:12px; margin-top:8px;">{{ quickError }}</p>
      <div style="margin-top:12px;">
        <button class="btn btn-gold" :disabled="quickSaving" @click="handleQuickAdd">{{ quickSaving ? '儲存中…' : '新增／更新這一天' }}</button>
      </div>
    </div>

    <template v-if="features.isEnabled('B6_membership_report')">
      <div class="tw" style="padding:20px; margin-bottom:24px;">
        <h2 class="section-bar hdr-navy">RI 半年報基準人數</h2>
        <div class="form-grid">
          <label>
            <span>男社友人數</span>
            <input type="number" class="fi" v-model.number="membershipForm.baseline_male" :disabled="!canEditMembership" />
          </label>
          <label>
            <span>女社友人數</span>
            <input type="number" class="fi" v-model.number="membershipForm.baseline_female" :disabled="!canEditMembership" />
          </label>
          <label>
            <span>合計</span>
            <input type="number" class="fi" :value="baselineTotal" disabled />
          </label>
        </div>

        <h2 class="section-bar hdr-purple" style="margin-top:20px;">{{ selectedMonth }} 月底人數</h2>
        <div class="form-grid">
          <label>
            <span>男社友人數</span>
            <input type="number" class="fi" v-model.number="membershipForm.current_male" :disabled="!canEditMembership" />
          </label>
          <label>
            <span>女社友人數</span>
            <input type="number" class="fi" v-model.number="membershipForm.current_female" :disabled="!canEditMembership" />
          </label>
          <label>
            <span>合計</span>
            <input type="number" class="fi" :value="currentTotal" disabled />
          </label>
          <label>
            <span>淨成長</span>
            <input type="number" class="fi hdr-yellow" :value="netGrowth" disabled style="font-weight:700;" />
          </label>
        </div>

        <h2 class="section-bar hdr-green" style="margin-top:20px;">{{ selectedMonth }} 年齡分布</h2>
        <div class="form-grid">
          <label>
            <span>40歲以下人數</span>
            <input type="number" class="fi" v-model.number="membershipForm.age_under_40" :disabled="!canEditMembership" />
          </label>
          <label>
            <span>41歲以上人數</span>
            <input type="number" class="fi" v-model.number="membershipForm.age_41_plus" :disabled="!canEditMembership" />
          </label>
          <label>
            <span>合計</span>
            <input type="number" class="fi" :value="ageTotal" disabled />
          </label>
        </div>

        <div v-if="canEditMembership" style="margin-top:20px;">
          <button class="btn btn-gold" :disabled="membershipSaving" @click="handleMembershipSave">{{ membershipSaving ? '儲存中…' : '儲存社友人數' }}</button>
        </div>
      </div>
    </template>

    <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">歷月出席月報</h2>
    <div class="tw">
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
          <tr
            v-for="r in attendance.monthlyRates"
            :key="r.month"
            :style="r.month === selectedMonth ? { background: 'var(--gold-p)' } : {}"
          >
            <td data-label="月份">{{ r.month }}</td>
            <td data-label="例會場次">{{ r.meeting_count }}</td>
            <td data-label="應出席 / 實際出席">{{ r.expected }} / {{ r.actual }}</td>
            <td data-label="出席率">
              <span class="bdg" :class="r.rate !== null && r.rate < 75 ? 'b-r' : 'b-gr'">
                {{ r.rate !== null ? r.rate + '%' : '-' }}
              </span>
            </td>
            <template v-if="features.isEnabled('B6_membership_report') && membershipFor(r.month)">
              <td data-label="當月社友合計">{{ (membershipFor(r.month)!.current_male ?? 0) + (membershipFor(r.month)!.current_female ?? 0) }}</td>
              <td data-label="淨成長">
                {{ ((membershipFor(r.month)!.current_male ?? 0) + (membershipFor(r.month)!.current_female ?? 0))
                  - ((membershipFor(r.month)!.baseline_male ?? 0) + (membershipFor(r.month)!.baseline_female ?? 0)) }}
              </td>
            </template>
            <template v-else-if="features.isEnabled('B6_membership_report')">
              <td data-label="當月社友合計">-</td>
              <td data-label="淨成長">-</td>
            </template>
          </tr>
          <tr v-if="!attendance.monthlyRates.length">
            <td colspan="6" style="text-align:center; color:var(--muted);">尚無出席資料</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 14px;
}
.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
  font-weight: 600;
}

/* 比照使用者提供的 RI 半年報 Excel 表頭配色 */
.hdr-purple { background: #5B3F86; color: #fff; }
.hdr-navy   { background: #060FBA; color: #fff; }
.hdr-yellow { background: #FFFF00; color: #000; }
.hdr-green  { background: #08BE26; color: #fff; }

.section-bar {
  font-size: 13px;
  font-weight: 700;
  padding: 8px 12px;
  border-radius: var(--r-sm);
  margin-bottom: 14px;
}

/* 比照 vivian 檔案月報頁的出席率進度條：加上 60% 最低門檻標線 */
.rate-bar-track {
  position: relative;
}

.rate-threshold {
  position: absolute;
  top: -2px;
  bottom: -2px;
  left: 60%;
  width: 2px;
  background: var(--red);
}

.rate-bar-labels {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: var(--muted);
  margin-top: 4px;
}

.rate-threshold-label {
  color: var(--red);
}
</style>
