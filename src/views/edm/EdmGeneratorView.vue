<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEdmStore } from '@/stores/edm'
import type { EdmScope } from '@/stores/edm'

const route = useRoute()
const auth = useAuthStore()
const edm = useEdmStore()

const scope = computed<EdmScope>(() => (route.name === 'admin-edm' ? 'district' : 'club'))
const scopeLabel = computed(() => (scope.value === 'district' ? '地區' : auth.clubName || '本社'))

const topic = ref('')
const keyPoints = ref('')
const tone = ref('')

const copied = ref(false)

async function handleGenerate() {
  if (!topic.value.trim()) return
  copied.value = false
  await edm.generate(scope.value, topic.value, keyPoints.value, tone.value)
}

async function copyToClipboard() {
  const text = `${edm.title}\n\n${edm.body}`
  await navigator.clipboard.writeText(text)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function downloadPdf() {
  window.print()
}
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>EDM 產生器（{{ scopeLabel }}）</h1>
    </div>

    <div class="tw edm-form no-print" style="padding:18px; margin-bottom:20px;">
      <div>
        <label class="fl">主題 *</label>
        <input v-model="topic" class="fi" placeholder="例如：本月例會通知、地區年度活動預告" />
      </div>
      <div>
        <label class="fl">重點內容</label>
        <textarea v-model="keyPoints" class="fi edm-textarea" placeholder="條列想放進信件的重點，例如時間地點、活動內容、聯絡方式..."></textarea>
      </div>
      <div>
        <label class="fl">語氣（選填）</label>
        <input v-model="tone" class="fi" placeholder="預設：正式且溫暖，也可填「活潑」「簡潔」等" />
      </div>
      <div style="display:flex; align-items:center; gap:12px;">
        <button class="btn btn-gold" :disabled="edm.loading || !topic.trim()" @click="handleGenerate">
          {{ edm.loading ? 'AI 生成中...' : 'AI 生成文案' }}
        </button>
        <span v-if="edm.error" style="color:var(--red, #c0392b); font-size:13px;">{{ edm.error }}</span>
      </div>
    </div>

    <div v-if="edm.title || edm.body" class="tw edm-result" style="padding:18px;">
      <div class="no-print" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h2 style="font-size:14px; font-weight:700; color:var(--navy);">預覽（可直接編輯）</h2>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-g btn-sm" @click="copyToClipboard">{{ copied ? '已複製' : '複製文字' }}</button>
          <button class="btn btn-g btn-sm" @click="downloadPdf">下載 PDF</button>
        </div>
      </div>

      <div>
        <label class="fl no-print">標題</label>
        <input v-model="edm.title" class="fi edm-title no-print" />
      </div>
      <div>
        <label class="fl no-print">內容</label>
        <textarea v-model="edm.body" class="fi edm-textarea edm-body no-print"></textarea>
      </div>

      <div class="print-only">
        <h2>{{ edm.title }}</h2>
        <p>{{ edm.body }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.edm-form > div,
.edm-result > div {
  margin-bottom: 14px;
}

.edm-form > div:last-child {
  margin-bottom: 0;
}

.edm-textarea {
  min-height: 120px;
  resize: vertical;
}

.edm-title {
  font-weight: 700;
}

.edm-body {
  min-height: 260px;
  white-space: pre-wrap;
}

.print-only {
  display: none;
}

@media print {
  .no-print {
    display: none !important;
  }

  .print-only {
    display: block;
  }

  .print-only h2 {
    margin-bottom: 16px;
  }

  .print-only p {
    white-space: pre-wrap;
    line-height: 1.8;
  }
}
</style>
