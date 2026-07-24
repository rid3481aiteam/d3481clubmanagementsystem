<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useKnowledgeBaseStore } from '@/stores/knowledgeBase'
import { useToastStore } from '@/stores/toast'
import { extractPdfText } from '@/lib/pdfExtract'
import PageHelp from '@/components/help/PageHelp.vue'
import type { KnowledgeArticle } from '@/types'

const auth = useAuthStore()
const kb = useKnowledgeBaseStore()
const toast = useToastStore()

const helpItems = [
  '這裡是全地區共用的扶輪知識庫，收錄扶輪術語、規章、參考指南等 PDF 文件，所有社都看得到、搜得到。',
  '搜尋框會同時比對標題、簡介跟文件內文，只要文件裡有出現關鍵字就搜得到，不限標題（掃描圖片檔沒有文字層，只能靠標題/標籤搜到）。',
  '上傳文件只有地區管理員能做，上傳時系統會自動把 PDF 內文抽出來建立搜尋索引，不用另外輸入全文。',
  '點文件標題會在新分頁開啟原始 PDF，可以線上閱讀或下載。',
]

const keyword = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => kb.fetchAll(keyword.value), 300)
}

const showUpload = ref(false)
const uploadFile = ref<File | null>(null)
const uploadTitle = ref('')
const uploadCategory = ref('')
const uploadTags = ref('')
const uploadDescription = ref('')
const extracting = ref(false)
const uploading = ref(false)
const uploadError = ref<string | null>(null)

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  uploadFile.value = file
  if (file && !uploadTitle.value.trim()) {
    uploadTitle.value = file.name.replace(/\.pdf$/i, '')
  }
}

function resetUploadForm() {
  uploadFile.value = null
  uploadTitle.value = ''
  uploadCategory.value = ''
  uploadTags.value = ''
  uploadDescription.value = ''
  uploadError.value = null
}

async function submitUpload() {
  if (!uploadFile.value || !uploadTitle.value.trim()) return
  uploadError.value = null
  extracting.value = true
  let contentText = ''
  try {
    contentText = await extractPdfText(uploadFile.value)
  } catch {
    // 抽取失敗（例如檔案損毀、掃描圖片沒有文字層）不擋上傳，只是這份文件搜不到內文
    contentText = ''
  }
  extracting.value = false

  uploading.value = true
  const tags = uploadTags.value.split(/[,、]/).map(t => t.trim()).filter(Boolean)
  const { error } = await kb.upload(
    uploadFile.value,
    {
      title: uploadTitle.value.trim(),
      category: uploadCategory.value.trim() || null,
      tags,
      description: uploadDescription.value.trim() || null,
      contentText,
    },
    auth.user?.id ?? null,
  )
  uploading.value = false
  if (error) {
    uploadError.value = error.message
    return
  }
  toast.show('已上傳')
  showUpload.value = false
  resetUploadForm()
  await kb.fetchAll(keyword.value)
}

async function removeArticle(item: KnowledgeArticle) {
  if (!confirm(`刪除「${item.title}」？這個動作無法復原。`)) return
  const { error } = await kb.remove(item.id, item.file_path)
  if (error) { toast.show('刪除失敗：' + error.message, 'err'); return }
  toast.show('已刪除')
}

async function openArticle(item: KnowledgeArticle) {
  const url = await kb.getSignedUrl(item.file_path)
  if (url) window.open(url, '_blank', 'noopener')
  else toast.show('無法開啟檔案，請稍後再試', 'err')
}

onMounted(() => {
  kb.fetchAll()
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <div style="display:flex; align-items:center; gap:8px;">
        <h1>知識庫</h1>
        <PageHelp title="知識庫怎麼用" :items="helpItems" />
        <span class="bdg b-y">測試中功能</span>
      </div>
      <button v-if="auth.isDistrictAdmin" class="btn btn-gold" @click="showUpload = true">+ 上傳文件</button>
    </div>

    <input
      v-model="keyword"
      class="fi"
      style="margin-bottom:16px;"
      placeholder="搜尋標題、簡介或文件內文……"
      @input="onSearchInput"
    />

    <div v-if="kb.loading" style="color:var(--muted); font-size:13px;">搜尋中...</div>

    <div v-else style="display:flex; flex-direction:column; gap:12px;">
      <div v-for="item in kb.articles" :key="item.id" class="tw" style="padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
          <div style="min-width:0;">
            <a href="#" style="font-size:15px; font-weight:700; color:var(--navy);" @click.prevent="openArticle(item)">
              {{ item.title }}
            </a>
            <span v-if="item.category" class="bdg b-n" style="margin-left:8px;">{{ item.category }}</span>
            <p v-if="item.description" style="font-size:12.5px; color:var(--muted); margin-top:6px;">{{ item.description }}</p>
            <div v-if="item.tags.length" style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
              <span v-for="tag in item.tags" :key="tag" class="bdg b-g">{{ tag }}</span>
            </div>
          </div>
          <button v-if="auth.isDistrictAdmin" class="btn btn-red btn-sm" @click="removeArticle(item)">刪除</button>
        </div>
      </div>
      <div v-if="!kb.articles.length" style="text-align:center; color:var(--muted); padding:32px 0;">
        {{ keyword.trim() ? '沒有符合的文件' : '知識庫目前還沒有文件' }}
      </div>
    </div>

    <div v-if="showUpload" class="mo" @click.self="showUpload = false">
      <div class="mb">
        <div class="mb-h">
          <h3>上傳知識庫文件</h3>
          <button class="mb-close" @click="showUpload = false">×</button>
        </div>
        <div class="mb-body">
          <div>
            <label class="fl">PDF 檔案 *</label>
            <input type="file" accept="application/pdf" class="fi" @change="onFileChange" />
          </div>
          <div>
            <label class="fl">標題 *</label>
            <input v-model="uploadTitle" class="fi" />
          </div>
          <div>
            <label class="fl">分類</label>
            <input v-model="uploadCategory" class="fi" placeholder="例如：扶輪用語、社務規章" />
          </div>
          <div>
            <label class="fl">標籤（用逗號分隔）</label>
            <input v-model="uploadTags" class="fi" placeholder="例如：新社員, 詞彙對照" />
          </div>
          <div>
            <label class="fl">簡介</label>
            <textarea v-model="uploadDescription" class="fi" style="min-height:70px;"></textarea>
          </div>
          <p v-if="extracting" style="font-size:12.5px; color:var(--muted);">正在讀取 PDF 內文以建立搜尋索引...</p>
          <p v-if="uploadError" style="font-size:12.5px; color:var(--red);">{{ uploadError }}</p>
        </div>
        <div class="mb-foot">
          <button class="btn btn-g" @click="showUpload = false">取消</button>
          <button class="btn btn-gold" :disabled="!uploadFile || !uploadTitle.trim() || extracting || uploading" @click="submitUpload">
            {{ extracting ? '讀取中...' : uploading ? '上傳中...' : '上傳' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
