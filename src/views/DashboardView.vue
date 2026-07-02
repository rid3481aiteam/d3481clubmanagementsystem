<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAnnouncementsStore } from '@/stores/announcements'
import { useDashboardStore } from '@/stores/dashboard'

const auth = useAuthStore()
const announcements = useAnnouncementsStore()
const dashboard = useDashboardStore()

function formatDate(value: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
}

function loadForCurrentView() {
  if (auth.isDistrictView) dashboard.loadDistrict()
  else dashboard.load(auth.clubId)
}

onMounted(loadForCurrentView)
watch(() => auth.isDistrictView, loadForCurrentView)
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>儀表板</h1>
    </div>

    <template v-if="auth.isDistrictView">
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:14px; margin-bottom:24px;">
        <div class="tw" style="padding:18px;">
          <div style="font-size:12px; color:var(--muted); margin-bottom:6px;">當月例會舉行數量</div>
          <div style="font-size:26px; font-weight:700; color:var(--navy);">{{ dashboard.meetingCount }}</div>
        </div>
      </div>

      <div class="district-grid">
        <div>
          <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">各社出席率</h2>
          <div class="tw">
            <table>
              <thead class="th">
                <tr>
                  <th>社名</th>
                  <th>出席率</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in dashboard.districtClubAttendance" :key="row.clubId">
                  <td>{{ row.clubName }}</td>
                  <td>
                    <span class="bdg" :class="row.rate !== null && row.rate < 75 ? 'b-r' : 'b-gr'">
                      {{ row.rate !== null ? row.rate + '%' : '-' }}
                    </span>
                  </td>
                </tr>
                <tr v-if="!dashboard.districtClubAttendance.length">
                  <td colspan="2" style="text-align:center; color:var(--muted);">尚無社團資料</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">各社申請入社 / 退社人數</h2>
          <div class="tw">
            <table>
              <thead class="th">
                <tr>
                  <th>社名</th>
                  <th>申請入社</th>
                  <th>退社</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in dashboard.districtClubMovements" :key="row.clubId">
                  <td>{{ row.clubName }}</td>
                  <td>{{ row.joinedCount }}</td>
                  <td>{{ row.resignedCount }}</td>
                </tr>
                <tr v-if="!dashboard.districtClubMovements.length">
                  <td colspan="3" style="text-align:center; color:var(--muted);">尚無社團資料</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:14px; margin-bottom:24px;">
      <div class="tw" style="padding:18px;">
        <div style="font-size:12px; color:var(--muted); margin-bottom:6px;">本月例會數</div>
        <div style="font-size:26px; font-weight:700; color:var(--navy);">{{ dashboard.meetingCount }}</div>
      </div>
      <div class="tw" style="padding:18px;">
        <div style="font-size:12px; color:var(--muted); margin-bottom:6px;">平均出席率</div>
        <div style="font-size:26px; font-weight:700; color:var(--navy);">
          {{ dashboard.avgRate !== null ? dashboard.avgRate + '%' : '-' }}
        </div>
      </div>
      <div class="tw" style="padding:18px;">
        <div style="font-size:12px; color:var(--muted); margin-bottom:6px;">社友人數</div>
        <div style="font-size:26px; font-weight:700; color:var(--navy);">{{ dashboard.memberCount }}</div>
      </div>
      </div>

      <div v-if="auth.clubId" style="margin-bottom:24px;">
      <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">地區公告欄</h2>
      <div class="tw">
        <div v-if="announcements.districtAnnouncements.length" class="announcement-list">
          <article v-for="item in announcements.districtAnnouncements" :key="item.id" class="announcement-item">
            <div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.body }}</p>
            </div>
            <time>{{ formatDate(item.published_at) }}</time>
          </article>
        </div>
        <div v-else style="padding:18px; text-align:center; color:var(--muted);">
          目前沒有地區公告
        </div>
      </div>
      </div>

      <div v-if="auth.clubId" style="margin-bottom:24px;">
      <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">社內公告欄</h2>
      <div class="tw">
        <div v-if="announcements.clubAnnouncements.length" class="announcement-list">
          <article v-for="item in announcements.clubAnnouncements" :key="item.id" class="announcement-item">
            <div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.body }}</p>
            </div>
            <time>{{ formatDate(item.published_at) }}</time>
          </article>
        </div>
        <div v-else style="padding:18px; text-align:center; color:var(--muted);">
          目前沒有社內公告
        </div>
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
    </template>
  </div>
</template>

<style scoped>
.district-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.announcement-list {
  display: grid;
}

.announcement-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.announcement-item:last-child {
  border-bottom: none;
}

.announcement-item h3 {
  font-size: 14px;
  color: var(--navy);
  margin-bottom: 4px;
}

.announcement-item p {
  color: var(--text);
  white-space: pre-line;
}

.announcement-item time {
  font-size: 12px;
  color: var(--muted);
}

@media (max-width: 700px) {
  .district-grid {
    grid-template-columns: 1fr;
  }

  .announcement-item {
    grid-template-columns: 1fr;
  }
}
</style>
