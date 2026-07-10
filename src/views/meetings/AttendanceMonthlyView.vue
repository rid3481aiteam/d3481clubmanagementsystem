<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAttendanceStore } from '@/stores/attendance'

const auth = useAuthStore()
const attendance = useAttendanceStore()

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const selectedMonth = ref(currentMonth())

const selectedRow = computed(() =>
  attendance.monthlyRates.find(r => r.month === selectedMonth.value) ?? null
)

onMounted(async () => {
  if (auth.clubId) await attendance.fetchMonthlyRates(auth.clubId)
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
        <div class="stat-value">{{ selectedRow?.rate ?? '-' }}{{ selectedRow?.rate != null ? '%' : '' }}</div>
        <div v-if="selectedRow?.rate != null" class="bar-track" style="margin-top:10px;">
          <div class="bar-fill" :style="{ width: selectedRow.rate + '%' }"></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">例會場次</div>
        <div class="stat-value">{{ selectedRow?.meeting_count ?? 0 }}</div>
      </div>
      <div class="stat-card c-gold">
        <div class="stat-label">出席 / 計入人次</div>
        <div class="stat-value">{{ selectedRow?.present ?? 0 }} / {{ selectedRow?.counted ?? 0 }}</div>
      </div>
    </div>

    <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">歷月出席率</h2>
    <div class="tw">
      <table>
        <thead class="th">
          <tr>
            <th>月份</th>
            <th>例會場次</th>
            <th>出席 / 計入人次</th>
            <th>出席率</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in attendance.monthlyRates"
            :key="r.month"
            :style="r.month === selectedMonth ? { background: 'var(--gold-p)' } : {}"
          >
            <td>{{ r.month }}</td>
            <td>{{ r.meeting_count }}</td>
            <td>{{ r.present }} / {{ r.counted }}</td>
            <td>
              <span class="bdg" :class="r.rate !== null && r.rate < 75 ? 'b-r' : 'b-gr'">
                {{ r.rate !== null ? r.rate + '%' : '-' }}
              </span>
            </td>
          </tr>
          <tr v-if="!attendance.monthlyRates.length">
            <td colspan="4" style="text-align:center; color:var(--muted);">尚無出席資料</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
