<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useClubHistoryStore } from '@/stores/clubHistory'

const auth = useAuthStore()
const clubHistory = useClubHistoryStore()

const plans = computed(() => clubHistory.list.filter(item => item.notable_events && item.notable_events.trim()))

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
      整理自「社的歷程」頁面各年度填寫的重要記事，要新增或修改請到「社的歷程」編輯對應年份。
    </p>

    <div class="tw">
      <table class="card-table">
        <thead class="th">
          <tr>
            <th style="width:140px;">年份</th>
            <th>重要記事</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in plans" :key="item.id">
            <td data-label="年份"><strong>{{ item.year_term }}</strong></td>
            <td data-label="重要記事" class="note-cell card-stack">{{ item.notable_events }}</td>
          </tr>
          <tr v-if="!plans.length">
            <td colspan="2" style="text-align:center; color:var(--muted);">尚無重要記事紀錄</td>
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
