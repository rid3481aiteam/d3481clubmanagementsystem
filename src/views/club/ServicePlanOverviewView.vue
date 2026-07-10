<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useClubHistoryStore } from '@/stores/clubHistory'

const auth = useAuthStore()
const clubHistory = useClubHistoryStore()

const plans = computed(() => clubHistory.list.filter(item => item.service_plan && item.service_plan.trim()))

onMounted(() => {
  if (auth.clubId) clubHistory.fetchAll(auth.clubId)
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>服務計劃總覽</h1>
    </div>
    <p style="font-size:12px; color:var(--muted); margin-bottom:14px;">
      整理自「歷屆社長」頁面各年度填寫的社區服務計劃，要新增或修改請到「歷屆社長」編輯對應年份。
    </p>

    <div class="tw">
      <table class="card-table">
        <thead class="th">
          <tr>
            <th style="width:140px;">年份</th>
            <th>社區服務計劃</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in plans" :key="item.id">
            <td data-label="年份"><strong>{{ item.year_term }}</strong></td>
            <td data-label="社區服務計劃" class="note-cell card-stack">{{ item.service_plan }}</td>
          </tr>
          <tr v-if="!plans.length">
            <td colspan="2" style="text-align:center; color:var(--muted);">尚無社區服務計劃紀錄</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.note-cell {
  white-space: pre-line;
  color: var(--text);
}
</style>
