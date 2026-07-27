<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useActivityLogStore } from '@/stores/activityLog'
import { useClubStore } from '@/stores/club'

const auth = useAuthStore()
const activityLog = useActivityLogStore()
const club = useClubStore()

const isDistrictAdminView = computed(() => auth.isDistrictAdminView)

// 查詢範圍要跟著目前視角走：地區視角看全地區（含地區層級跟所有社的
// 紀錄），各社視角只看自己社——RLS 也會擋，但這裡先在查詢這層就限定
// 範圍，不讓瀏覽器收到不該看到的資料。
function load() {
  activityLog.fetchLog(isDistrictAdminView.value ? null : auth.clubId)
}

onMounted(() => {
  club.fetchAll()
  load()
})
watch(isDistrictAdminView, load)

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
      記錄{{ isDistrictAdminView ? '地區層級與各社' : '本社' }}的關鍵操作（帳號審核、資料新增/編輯/刪除等），
      只保留最近 200 筆。
    </p>

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
