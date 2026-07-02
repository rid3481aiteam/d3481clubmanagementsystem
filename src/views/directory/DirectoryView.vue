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
    [c.name, c.zone, c.addr, c.venue, c.phone, c.sec_name, c.email].some(v =>
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
      <input v-model="keyword" class="fi" style="max-width:260px;" placeholder="搜尋社名/分區/執秘/地址/地點/電話" />
    </div>

    <div v-for="g in groupedClubs" :key="g.zone" class="zone-block">
      <div class="zone-head" @click="toggleZone(g.zone)">
        <span class="zone-chevron">{{ collapsedZones.has(g.zone) ? '▸' : '▾' }}</span>
        <strong>{{ g.zone }}</strong>
        <span class="zone-count">（{{ g.clubs.length }} 社）</span>
      </div>

      <div v-if="!collapsedZones.has(g.zone)" class="club-grid">
        <div v-for="c in g.clubs" :key="c.id" class="club-card">
          <div class="club-card-name">{{ c.name }}</div>
          <div class="club-card-rows">
            <template v-if="c.sec_name">
              <span class="k">執秘</span><span class="v">{{ c.sec_name }}</span>
            </template>
            <template v-if="c.phone">
              <span class="k">電話</span><span class="v">{{ c.phone }}</span>
            </template>
            <template v-if="c.email">
              <span class="k">Email</span>
              <a class="v" :href="`mailto:${c.email}`">{{ c.email }}</a>
            </template>
            <template v-if="c.freq || c.meeting_time">
              <span class="k">例會</span><span class="v strong">{{ c.freq || '' }} {{ c.meeting_time || '' }}</span>
            </template>
            <template v-if="c.venue">
              <span class="k">地點</span><span class="v">{{ c.venue }}</span>
            </template>
            <template v-if="c.addr">
              <span class="k">地址</span><span class="v">{{ c.addr }}</span>
            </template>
            <template v-if="c.venue_tel">
              <span class="k">訂位</span><span class="v">{{ c.venue_tel }}</span>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!filtered.length" class="empty">查無資料</div>
  </div>
</template>

<style scoped>
.zone-block {
  margin-bottom: 18px;
}

.zone-head {
  cursor: pointer;
  background: var(--gold-p);
  border-left: 3px solid var(--gold);
  padding: 8px 14px;
  border-radius: var(--r);
  font-size: 13px;
  color: var(--navy);
  margin-bottom: 10px;
}

.zone-count {
  color: var(--muted);
  font-weight: 400;
}

.zone-chevron {
  display: inline-block;
  width: 14px;
  color: var(--muted);
}

.club-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.club-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 14px 16px;
}

.club-card-name {
  font-weight: 700;
  font-size: 14px;
  color: var(--navy);
  margin-bottom: 8px;
}

.club-card-rows {
  display: grid;
  grid-template-columns: 3.5em 1fr;
  gap: 5px 8px;
  font-size: 12px;
}

.k { color: var(--muted); }
.v { color: var(--text); word-break: break-word; }
.v.strong { font-weight: 600; color: var(--navy); }
a.v { text-decoration: none; color: var(--navy); }

.empty {
  text-align: center;
  color: var(--muted);
  padding: 40px 0;
}

@media (max-width: 480px) {
  .club-grid { grid-template-columns: 1fr; }
}
</style>
