<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useActivityLogStore } from '@/stores/activityLog'
import { useClubStore } from '@/stores/club'

const auth = useAuthStore()
const activityLog = useActivityLogStore()
const club = useClubStore()

const isDistrictAdminView = computed(() => auth.isDistrictAdminView)

// 資料庫本身最多只保留 30 天（見 072_activity_log_retention.sql，
// 考量免費方案 500MB 容量上限，超過 30 天的紀錄會被自動清除），
// 所以這裡不提供「全部」選項——選了也查不到 30 天以前的資料，
// 提供這個選項只會誤導使用者以為系統留著更久的紀錄。
const RANGE_OPTIONS = [
  { value: '7', label: '最近 7 天' },
  { value: '30', label: '最近 30 天（資料庫最多保留這麼久）' },
]
const range = ref('7')

// 查詢範圍要跟著目前視角走：地區視角看全地區（含地區層級跟所有社的
// 紀錄），各社視角只看自己社——RLS 也會擋，但這裡先在查詢這層就限定
// 範圍，不讓瀏覽器收到不該看到的資料。
function load() {
  activityLog.fetchLog(isDistrictAdminView.value ? null : auth.clubId, Number(range.value))
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
      為了控制資料庫容量，系統只保留最近 30 天的紀錄，超過會自動清除，請盡量在事情發生後盡快查閱。
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
