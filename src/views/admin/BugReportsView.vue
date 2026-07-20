<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBugReportsStore } from '@/stores/bugReports'
import { useToastStore } from '@/stores/toast'
import type { BugReportSource, BugReportStatus } from '@/types'

const bugReports = useBugReportsStore()
const toast = useToastStore()

const SOURCE_LABELS: Record<BugReportSource, string> = { user: '使用者回報', auto: '自動擷取' }
const SOURCE_BADGE: Record<BugReportSource, string> = { user: 'b-n', auto: 'b-y' }
const STATUS_LABELS: Record<BugReportStatus, string> = { open: '待處理', resolved: '已處理' }
const STATUS_BADGE: Record<BugReportStatus, string> = { open: 'b-r', resolved: 'b-gr' }

const filterStatus = ref<'all' | BugReportStatus>('open')
const filterSource = ref<'all' | BugReportSource>('all')

const filtered = computed(() => bugReports.reports.filter(r => {
  if (filterStatus.value !== 'all' && r.status !== filterStatus.value) return false
  if (filterSource.value !== 'all' && r.source !== filterSource.value) return false
  return true
}))

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

async function toggleResolved(id: string, resolved: boolean) {
  const { error } = await bugReports.markResolved(id, resolved)
  if (error) toast.show('更新失敗：' + error.message, 'err')
}

onMounted(() => {
  bugReports.fetchAll()
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>錯誤回報</h1>
      <button class="btn btn-g" @click="bugReports.fetchAll()">重新整理</button>
    </div>

    <p style="font-size:13px; color:var(--muted); margin-bottom:14px;">
      「使用者回報」是社友主動填寫的問題描述；「自動擷取」是前端偵測到 JavaScript 錯誤時自動記錄，只抓得到會拋出例外的錯誤（白畫面、API 失敗等），邏輯正確但結果錯誤的問題不會出現在這裡。
    </p>

    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px;">
      <div class="segmented">
        <button class="seg-btn" :class="{ active: filterStatus === 'open' }" @click="filterStatus = 'open'">待處理</button>
        <button class="seg-btn" :class="{ active: filterStatus === 'resolved' }" @click="filterStatus = 'resolved'">已處理</button>
        <button class="seg-btn" :class="{ active: filterStatus === 'all' }" @click="filterStatus = 'all'">全部狀態</button>
      </div>
      <div class="segmented">
        <button class="seg-btn" :class="{ active: filterSource === 'all' }" @click="filterSource = 'all'">全部來源</button>
        <button class="seg-btn" :class="{ active: filterSource === 'user' }" @click="filterSource = 'user'">使用者回報</button>
        <button class="seg-btn" :class="{ active: filterSource === 'auto' }" @click="filterSource = 'auto'">自動擷取</button>
      </div>
    </div>

    <div class="tw">
      <table class="card-table">
        <thead class="th">
          <tr>
            <th>時間</th>
            <th>來源</th>
            <th>社團</th>
            <th>回報人</th>
            <th>頁面</th>
            <th>內容</th>
            <th>狀態</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in filtered" :key="r.id">
            <td data-label="時間">{{ formatDateTime(r.created_at) }}</td>
            <td data-label="來源"><span class="bdg" :class="SOURCE_BADGE[r.source]">{{ SOURCE_LABELS[r.source] }}</span></td>
            <td data-label="社團">{{ r.clubs?.name ?? '-' }}</td>
            <td data-label="回報人">{{ r.reporter?.name ?? '-' }}</td>
            <td data-label="頁面">{{ r.page_path }}</td>
            <td data-label="內容" class="card-stack">{{ r.source === 'user' ? r.description : r.error_message }}</td>
            <td data-label="狀態"><span class="bdg" :class="STATUS_BADGE[r.status]">{{ STATUS_LABELS[r.status] }}</span></td>
            <td>
              <button v-if="r.status === 'open'" class="btn btn-g btn-sm" @click="toggleResolved(r.id, true)">標記已處理</button>
              <button v-else class="btn btn-g btn-sm" @click="toggleResolved(r.id, false)">重新開啟</button>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="8" style="text-align:center; color:var(--muted);">尚無回報紀錄</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
