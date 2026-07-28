<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useActivityLogStore } from '@/stores/activityLog'
import { useClubStore } from '@/stores/club'

const auth = useAuthStore()
const activityLog = useActivityLogStore()
const club = useClubStore()

const isDistrictAdminView = computed(() => auth.isDistrictAdminView)

// 只是畫面預設的顯示範圍，資料庫本身不會自動清除任何紀錄——選「全部」
// 隨時查得到更早的操作紀錄。
const RANGE_OPTIONS = [
  { value: '7', label: '最近 7 天' },
  { value: '30', label: '最近 30 天' },
  { value: 'all', label: '全部' },
]
const range = ref('7')

// 查詢範圍要跟著目前視角走：地區視角看全地區（含地區層級跟所有社的
// 紀錄），各社視角只看自己社——RLS 也會擋，但這裡先在查詢這層就限定
// 範圍，不讓瀏覽器收到不該看到的資料。
function load() {
  const sinceDays = range.value === 'all' ? null : Number(range.value)
  activityLog.fetchLog(isDistrictAdminView.value ? null : auth.clubId, sinceDays)
}

onMounted(() => {
  club.fetchAll()
  load()
})
watch(isDistrictAdminView, load)
watch(range, load)

function clubName(clubId: string) {
  return club.allClubs.find(c => c.id === clubId)?.name ?? '-'
}
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>操作紀錄</h1>
    </div>

    <p style="color:var(--muted); font-size:13px; margin-bottom:16px;">
      記錄{{ isDistrictAdminView ? '地區層級與各社' : '本社' }}的關鍵操作（帳號審核、資料新增/編輯/刪除等）。
      這裡的顯示範圍只是畫面篩選，資料不會被刪除，需要時可以切換看更早的紀錄。
    </p>

    <div style="margin-bottom:14px;">
      <label class="fl">顯示範圍</label>
      <select v-model="range" class="fi" style="min-width:140px;">
        <option v-for="o in RANGE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
    </div>

    <div class="tw">
      <table class="card-table">
        <thead class="th">
          <tr>
            <th>時間</th>
            <th>操作者</th>
            <th v-if="isDistrictAdminView">社團</th>
            <th>動作描述</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in activityLog.list" :key="i.id">
            <td data-label="時間">{{ new Date(i.created_at).toLocaleString() }}</td>
            <td data-label="操作者">{{ i.actor_name }}</td>
            <td v-if="isDistrictAdminView" data-label="社團">
              <span v-if="!i.club_id" class="bdg b-n">地區層級</span>
              <span v-else>{{ clubName(i.club_id) }}</span>
            </td>
            <td data-label="動作描述">{{ i.description }}</td>
          </tr>
          <tr v-if="!activityLog.list.length">
            <td :colspan="isDistrictAdminView ? 4 : 3" style="text-align:center; color:var(--muted);">尚無操作紀錄</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
