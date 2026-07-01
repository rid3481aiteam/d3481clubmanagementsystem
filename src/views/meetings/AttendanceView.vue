<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMeetingsStore } from '@/stores/meetings'
import { useAttendanceStore } from '@/stores/attendance'
import { useRosterStore } from '@/stores/roster'
import { usePermissionsStore } from '@/stores/permissions'
import type { AttendanceStatus } from '@/types'

const route = useRoute()
const auth = useAuthStore()
const meetings = useMeetingsStore()
const attendance = useAttendanceStore()
const roster = useRosterStore()
const permissions = usePermissionsStore()

const canManage = computed(() => permissions.can('attendance', 'edit'))

const statuses = ref<Record<string, AttendanceStatus>>({})

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: '出席',
  absent: '缺席',
  leave: '請假',
  exempt: '免計',
}

async function load() {
  const meetingId = route.params.id as string
  await meetings.fetchOne(meetingId)
  await roster.fetchAll(auth.clubId)
  await attendance.fetchSession(meetingId)

  const map: Record<string, AttendanceStatus> = {}
  for (const m of roster.members.filter(m => m.is_active)) {
    const existing = attendance.details.find(d => d.member_id === m.id)
    map[m.id] = existing?.status ?? 'present'
  }
  statuses.value = map
}

async function handleSave() {
  const meetingId = route.params.id as string
  if (!auth.clubId) return
  await attendance.save(meetingId, auth.clubId, statuses.value)
  await attendance.fetchRates(auth.clubId)
}

onMounted(async () => {
  await load()
  await attendance.fetchRates(auth.clubId)
})

watch(() => route.params.id, load)
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>出席記錄 — {{ meetings.current?.date }} {{ meetings.current?.title }}</h1>
    </div>

    <div v-if="attendance.session" style="display:flex; gap:8px; margin-bottom:14px;">
      <span class="bdg b-n">總人數 {{ attendance.session.total }}</span>
      <span class="bdg b-gr">出席 {{ attendance.session.present }}</span>
      <span class="bdg b-r">缺席 {{ attendance.session.absent }}</span>
      <span class="bdg b-y">請假 {{ attendance.session.leave }}</span>
      <span class="bdg b-g">免計 {{ attendance.session.exempt }}</span>
      <span class="bdg b-n">出席率 {{ attendance.session.rate }}%</span>
    </div>

    <div class="tw">
      <table>
        <thead class="th">
          <tr>
            <th>姓名</th>
            <th>職稱</th>
            <th>狀態</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in roster.members.filter(m => m.is_active)" :key="m.id">
            <td>{{ m.name }}</td>
            <td>{{ m.job_title || '-' }}</td>
            <td>
              <select v-if="canManage" v-model="statuses[m.id]" class="fi" style="max-width:120px;">
                <option v-for="(label, key) in STATUS_LABEL" :key="key" :value="key">{{ label }}</option>
              </select>
              <span v-else class="bdg b-n">{{ STATUS_LABEL[statuses[m.id]] }}</span>
            </td>
          </tr>
          <tr v-if="!roster.members.filter(m => m.is_active).length">
            <td colspan="3" style="text-align:center; color:var(--muted);">尚無在職社友</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="canManage" style="margin-top:14px;">
      <button class="btn btn-gold" @click="handleSave">儲存出席記錄</button>
    </div>

    <h2 style="font-size:15px; font-weight:700; color:var(--navy); margin:28px 0 12px;">個人出席率</h2>
    <div class="tw">
      <table>
        <thead class="th">
          <tr>
            <th>姓名</th>
            <th>計算次數</th>
            <th>出席</th>
            <th>缺席</th>
            <th>請假</th>
            <th>出席率</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in attendance.rates" :key="r.member_id">
            <td>{{ r.member_name }}</td>
            <td>{{ r.counted }}</td>
            <td>{{ r.present }}</td>
            <td>{{ r.absent }}</td>
            <td>{{ r.leave }}</td>
            <td>{{ r.rate ?? '-' }}{{ r.rate !== null ? '%' : '' }}</td>
          </tr>
          <tr v-if="!attendance.rates.length">
            <td colspan="6" style="text-align:center; color:var(--muted);">尚無出席資料</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
