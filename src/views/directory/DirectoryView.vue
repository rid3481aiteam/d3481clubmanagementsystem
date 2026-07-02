<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useFeaturesStore } from '@/stores/features'
import { useClubStore } from '@/stores/club'
import type { Club } from '@/types'

const auth = useAuthStore()
const features = useFeaturesStore()
const club = useClubStore()

const keyword = ref('')

const ZONE_ORDER = [
  '第一分區', '第二分區', '第三分區', '第四分區', '第五分區',
  '第六分區', '第七分區', '第八分區', '第九分區', '第十分區', '第十一分區',
]

function zoneRank(zone: string) {
  const i = ZONE_ORDER.indexOf(zone)
  return i === -1 ? ZONE_ORDER.length : i
}

const filtered = computed(() => {
  if (!features.isEnabled('H2_directory_search')) return club.allClubs
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return club.allClubs
  return club.allClubs.filter(c =>
    [c.name, c.zone, c.addr, c.venue, c.phone].some(v =>
      v?.toLowerCase().includes(kw)
    )
  )
})

const groupedClubs = computed(() => {
  const groups = new Map<string, Club[]>()
  for (const c of filtered.value) {
    const key = c.zone || '未分區'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(c)
  }
  return [...groups.entries()]
    .sort((a, b) => zoneRank(a[0]) - zoneRank(b[0]) || a[0].localeCompare(b[0]))
    .map(([zone, clubs]) => ({
      zone,
      clubs: clubs.slice().sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    }))
})

const collapsedZones = ref(new Set<string>())
function toggleZone(zone: string) {
  const s = new Set(collapsedZones.value)
  if (s.has(zone)) s.delete(zone)
  else s.add(zone)
  collapsedZones.value = s
}

onMounted(() => {
  club.fetchAll()
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>地區通訊錄</h1>
      <RouterLink
        v-if="features.isEnabled('H3_directory_admin') && auth.isDistrictAdmin"
        to="/admin/clubs"
        class="btn btn-g btn-sm"
      >管理社團</RouterLink>
    </div>

    <div v-if="features.isEnabled('H2_directory_search')" style="margin-bottom:14px;">
      <input v-model="keyword" class="fi" style="max-width:260px;" placeholder="搜尋社名/分區/地址/地點/電話" />
    </div>

    <div class="tw">
      <table>
        <thead class="th">
          <tr>
            <th>社名</th>
            <th>分區</th>
            <th>例會時間</th>
            <th>例會地點</th>
            <th>社辦公室地址</th>
            <th>電話</th>
          </tr>
        </thead>
        <tbody v-for="g in groupedClubs" :key="g.zone">
          <tr class="zone-row" @click="toggleZone(g.zone)">
            <td colspan="6">
              <span class="zone-chevron">{{ collapsedZones.has(g.zone) ? '▸' : '▾' }}</span>
              <strong>{{ g.zone }}</strong>
              <span style="color:var(--muted); font-weight:400;">（{{ g.clubs.length }} 社）</span>
            </td>
          </tr>
          <template v-if="!collapsedZones.has(g.zone)">
            <tr v-for="c in g.clubs" :key="c.id">
              <td>{{ c.name }}</td>
              <td>{{ c.zone }}</td>
              <td>{{ c.freq || '-' }} {{ c.meeting_time || '' }}</td>
              <td>{{ c.venue || '-' }}</td>
              <td>{{ c.addr || '-' }}</td>
              <td>{{ c.phone || '-' }}</td>
            </tr>
          </template>
        </tbody>
        <tbody v-if="!filtered.length">
          <tr>
            <td colspan="6" style="text-align:center; color:var(--muted);">查無資料</td>
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
.zone-row:hover td {
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
