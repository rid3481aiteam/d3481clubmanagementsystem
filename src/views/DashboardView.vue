<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'

const auth = useAuthStore()
const dashboard = useDashboardStore()

onMounted(() => {
  dashboard.load(auth.clubId)
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>儀表板</h1>
    </div>

    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:14px; margin-bottom:24px;">
      <div class="tw" style="padding:18px;">
        <div style="font-size:12px; color:var(--muted); margin-bottom:6px;">本屆例會數</div>
        <div style="font-size:26px; font-weight:700; color:var(--navy);">{{ dashboard.meetingCount }}</div>
      </div>
      <div class="tw" style="padding:18px;">
        <div style="font-size:12px; color:var(--muted); margin-bottom:6px;">平均出席率</div>
        <div style="font-size:26px; font-weight:700; color:var(--navy);">
          {{ dashboard.avgRate !== null ? dashboard.avgRate + '%' : '-' }}
        </div>
      </div>
      <div class="tw" style="padding:18px;">
        <div style="font-size:12px; color:var(--muted); margin-bottom:6px;">在職社友人數</div>
        <div style="font-size:26px; font-weight:700; color:var(--navy);">{{ dashboard.memberCount }}</div>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
      <div>
        <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">低出席率警示（&lt;75%）</h2>
        <div class="tw">
          <table>
            <thead class="th">
              <tr>
                <th>姓名</th>
                <th>出席率</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in dashboard.lowAttendance" :key="r.member_id">
                <td>{{ r.member_name }}</td>
                <td><span class="bdg b-r">{{ r.rate }}%</span></td>
              </tr>
              <tr v-if="!dashboard.lowAttendance.length">
                <td colspan="2" style="text-align:center; color:var(--muted);">目前無低出席率社友</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">待追蹤潛在社友</h2>
        <div class="tw">
          <table>
            <thead class="th">
              <tr>
                <th>姓名</th>
                <th>追蹤日</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in dashboard.followUps" :key="p.id">
                <td>{{ p.name }}</td>
                <td>{{ p.follow_up_date || '-' }}</td>
              </tr>
              <tr v-if="!dashboard.followUps.length">
                <td colspan="2" style="text-align:center; color:var(--muted);">目前無待追蹤名單</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
