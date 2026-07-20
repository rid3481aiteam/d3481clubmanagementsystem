<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useBugReportsStore } from '@/stores/bugReports'
import { useToastStore } from '@/stores/toast'

const auth = useAuthStore()
const bugReports = useBugReportsStore()
const toast = useToastStore()
const route = useRoute()

const showModal = ref(false)
const description = ref('')
const saving = ref(false)

function open() {
  description.value = ''
  showModal.value = true
}

async function submit() {
  if (!description.value.trim() || !auth.user) return
  saving.value = true
  const { error } = await bugReports.submitUserReport(description.value.trim(), {
    reporterId: auth.user.id,
    clubId: auth.clubId,
    pagePath: route.fullPath,
    userAgent: navigator.userAgent,
  })
  saving.value = false
  if (error) {
    toast.show('回報失敗：' + error.message, 'err')
    return
  }
  showModal.value = false
  toast.show('已收到回報，謝謝協助！')
}
</script>

<template>
  <button class="btn btn-g btn-sm bug-report-btn" title="回報問題" @click="open">🐞 <span class="bug-report-label">回報問題</span></button>

  <div v-if="showModal" class="mo" @click.self="showModal = false">
    <div class="mb">
      <div class="mb-h">
        <h3>回報問題</h3>
        <button class="mb-close" @click="showModal = false">×</button>
      </div>
      <div class="mb-body">
        <div>
          <label class="fl">發生了什麼問題？*</label>
          <textarea
            v-model="description"
            class="fi"
            style="min-height:120px;"
            placeholder="請描述你遇到的狀況，例如：點了「儲存」按鈕沒有反應、看到不該出現的資料等"
          ></textarea>
        </div>
        <p style="font-size:12px; color:var(--muted); margin-top:8px;">
          會自動附上目前的頁面與帳號資訊，方便我們追查，不用額外描述。
        </p>
      </div>
      <div class="mb-foot">
        <button class="btn btn-g" @click="showModal = false">取消</button>
        <button class="btn btn-gold" :disabled="saving || !description.trim()" @click="submit">送出</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media (max-width: 900px) {
  .bug-report-label { display: none; }
  .bug-report-btn { padding-left: 8px; padding-right: 8px; }
}
</style>
