<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useFeaturesStore } from '@/stores/features'
import { useClubStore } from '@/stores/club'

const auth = useAuthStore()
const features = useFeaturesStore()
const club = useClubStore()

const keyword = ref('')

const filtered = computed(() => {
  if (!features.isEnabled('H2_directory_search')) return club.allClubs
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return club.allClubs
  return club.allClubs.filter(c =>
    [c.name, c.zone, c.pres_name, c.sec_name, c.email, c.phone].some(v =>
      v?.toLowerCase().includes(kw)
    )
  )
})

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
      <input v-model="keyword" class="fi" style="max-width:260px;" placeholder="搜尋社名/分區/社長/執秘" />
    </div>

    <div class="tw">
      <table>
        <thead class="th">
          <tr>
            <th>社名</th>
            <th>分區</th>
            <th>社長</th>
            <th>執秘</th>
            <th>Email</th>
            <th>電話</th>
            <th>例會時間</th>
            <th>地點</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in filtered" :key="c.id">
            <td>{{ c.name }}</td>
            <td>{{ c.zone }}</td>
            <td>{{ c.pres_name || '-' }}</td>
            <td>{{ c.sec_name || '-' }}</td>
            <td>{{ c.email || '-' }}</td>
            <td>{{ c.phone || '-' }}</td>
            <td>{{ c.freq || '-' }} {{ c.meeting_time || '' }}</td>
            <td>{{ c.venue || '-' }}</td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="8" style="text-align:center; color:var(--muted);">查無資料</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
