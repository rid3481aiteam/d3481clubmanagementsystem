<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMembershipReportsStore } from '@/stores/membershipReports'
import { useAttendanceStore } from '@/stores/attendance'
import { usePermissionsStore } from '@/stores/permissions'
import type { ClubMonthlyMembershipReportUpdate } from '@/types'

const auth = useAuthStore()
const reports = useMembershipReportsStore()
const attendance = useAttendanceStore()
const permissions = usePermissionsStore()

const canEdit = computed(() => permissions.can('membership_reports', 'edit'))

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const selectedMonth = ref(currentMonth())

const form = ref<ClubMonthlyMembershipReportUpdate>({
  baseline_male: null,
  baseline_female: null,
  current_male: null,
  current_female: null,
  age_under_40: null,
  age_41_plus: null,
})

function loadForm() {
  const existing = reports.reports.find(r => r.month === selectedMonth.value)
  form.value = {
    baseline_male: existing?.baseline_male ?? null,
    baseline_female: existing?.baseline_female ?? null,
    current_male: existing?.current_male ?? null,
    current_female: existing?.current_female ?? null,
    age_under_40: existing?.age_under_40 ?? null,
    age_41_plus: existing?.age_41_plus ?? null,
  }
}

const baselineTotal = computed(() => (form.value.baseline_male ?? 0) + (form.value.baseline_female ?? 0))
const currentTotal = computed(() => (form.value.current_male ?? 0) + (form.value.current_female ?? 0))
const netGrowth = computed(() => currentTotal.value - baselineTotal.value)
const ageTotal = computed(() => (form.value.age_under_40 ?? 0) + (form.value.age_41_plus ?? 0))

const monthlyAttendance = computed(() =>
  attendance.monthlyRates.find(r => r.month === selectedMonth.value) ?? null
)

const saving = ref(false)
async function handleSave() {
  if (!auth.clubId) return
  saving.value = true
  const { error } = await reports.upsert(auth.clubId, selectedMonth.value, form.value, auth.user?.id ?? null)
  saving.value = false
  if (error) alert(error.message)
}

onMounted(async () => {
  if (!auth.clubId) return
  await Promise.all([
    reports.fetchAll(auth.clubId),
    attendance.fetchMonthlyRates(auth.clubId),
  ])
  loadForm()
})

watch(selectedMonth, loadForm)
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>社友增減月報</h1>
    </div>

    <div style="display:flex; align-items:center; gap:10px; margin-bottom:20px;">
      <label style="font-size:13px; color:var(--muted); font-weight:600;">選擇月份</label>
      <input type="month" class="fi" v-model="selectedMonth" style="max-width:180px;" />
    </div>

    <div class="tw" style="padding:20px; margin-bottom:24px;">
      <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:14px;">RI 半年報基準人數</h2>
      <div class="form-grid">
        <label>
          <span>男社友人數</span>
          <input type="number" class="fi" v-model.number="form.baseline_male" :disabled="!canEdit" />
        </label>
        <label>
          <span>女社友人數</span>
          <input type="number" class="fi" v-model.number="form.baseline_female" :disabled="!canEdit" />
        </label>
        <label>
          <span>合計</span>
          <input type="number" class="fi" :value="baselineTotal" disabled />
        </label>
      </div>

      <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin:20px 0 14px;">{{ selectedMonth }} 月底人數</h2>
      <div class="form-grid">
        <label>
          <span>男社友人數</span>
          <input type="number" class="fi" v-model.number="form.current_male" :disabled="!canEdit" />
        </label>
        <label>
          <span>女社友人數</span>
          <input type="number" class="fi" v-model.number="form.current_female" :disabled="!canEdit" />
        </label>
        <label>
          <span>合計</span>
          <input type="number" class="fi" :value="currentTotal" disabled />
        </label>
        <label>
          <span>淨成長</span>
          <input type="number" class="fi" :value="netGrowth" disabled style="font-weight:700;" />
        </label>
      </div>

      <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin:20px 0 14px;">{{ selectedMonth }} 年齡分布</h2>
      <div class="form-grid">
        <label>
          <span>40歲以下人數</span>
          <input type="number" class="fi" v-model.number="form.age_under_40" :disabled="!canEdit" />
        </label>
        <label>
          <span>41歲以上人數</span>
          <input type="number" class="fi" v-model.number="form.age_41_plus" :disabled="!canEdit" />
        </label>
        <label>
          <span>合計</span>
          <input type="number" class="fi" :value="ageTotal" disabled />
        </label>
      </div>

      <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin:20px 0 14px;">{{ selectedMonth }} 例會出席（系統自動帶入）</h2>
      <div class="form-grid">
        <label>
          <span>例會次數</span>
          <input type="text" class="fi" :value="monthlyAttendance?.meeting_count ?? 0" disabled />
        </label>
        <label>
          <span>出席率</span>
          <input
            type="text"
            class="fi"
            :value="monthlyAttendance?.rate != null ? monthlyAttendance.rate + '%' : '-'"
            disabled
          />
        </label>
      </div>

      <div v-if="canEdit" style="margin-top:20px;">
        <button class="btn btn-gold" :disabled="saving" @click="handleSave">{{ saving ? '儲存中…' : '儲存本月報告' }}</button>
      </div>
    </div>

    <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">歷月報告</h2>
    <div class="tw">
      <table>
        <thead class="th">
          <tr>
            <th>月份</th>
            <th>基準合計</th>
            <th>當月合計</th>
            <th>淨成長</th>
            <th>40歲以下</th>
            <th>41歲以上</th>
            <th>例會次數</th>
            <th>出席率</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in reports.reports"
            :key="r.month"
            :style="r.month === selectedMonth ? { background: 'var(--gold-p)' } : {}"
          >
            <td>{{ r.month }}</td>
            <td>{{ (r.baseline_male ?? 0) + (r.baseline_female ?? 0) }}</td>
            <td>{{ (r.current_male ?? 0) + (r.current_female ?? 0) }}</td>
            <td>{{ ((r.current_male ?? 0) + (r.current_female ?? 0)) - ((r.baseline_male ?? 0) + (r.baseline_female ?? 0)) }}</td>
            <td>{{ r.age_under_40 ?? '-' }}</td>
            <td>{{ r.age_41_plus ?? '-' }}</td>
            <td>{{ attendance.monthlyRates.find(a => a.month === r.month)?.meeting_count ?? 0 }}</td>
            <td>{{ attendance.monthlyRates.find(a => a.month === r.month)?.rate ?? '-' }}{{ attendance.monthlyRates.find(a => a.month === r.month)?.rate != null ? '%' : '' }}</td>
          </tr>
          <tr v-if="!reports.reports.length">
            <td colspan="8" style="text-align:center; color:var(--muted);">尚無月報資料</td>
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
</style>
