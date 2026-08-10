<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAnnouncementsStore } from '@/stores/announcements'
import { useToastStore } from '@/stores/toast'
import type { ClubAnnouncement } from '@/types'

const auth = useAuthStore()
const announcements = useAnnouncementsStore()
const toast = useToastStore()

const TITLE_MAX_LENGTH = 100

const showModal = ref(false)
const editingId = ref<string | null>(null)
const form = ref(emptyForm())
const formError = ref('')
const saving = ref(false)
const modalTitle = computed(() => editingId.value ? '編輯社內公告' : '新增社內公告')

function toDateTimeLocal(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${hh}:${mm}`
}

function emptyForm() {
  return {
    title: '',
    body: '',
    is_published: true,
    published_at: toDateTimeLocal(new Date()),
    expires_at: '',
  }
}

function toLocalInputValue(value: string | null) {
  if (!value) return ''
  return toDateTimeLocal(new Date(value))
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 狀態改成綜合判斷：草稿（未勾選發布）／排程中（發布時間還沒到）／
// 已發布（發布時間 ≤ now < 到期時間）／已過期（到期時間已過）
function announcementStatus(item: ClubAnnouncement) {
  if (!item.is_published) return { label: '草稿', cls: 'b-g' }
  const now = Date.now()
  const publishedAt = new Date(item.published_at).getTime()
  const expiresAt = item.expires_at ? new Date(item.expires_at).getTime() : null
  if (now < publishedAt) return { label: '排程中', cls: 'b-y' }
  if (expiresAt !== null && now >= expiresAt) return { label: '已過期', cls: 'b-n' }
  return { label: '已發布', cls: 'b-gr' }
}

// 已知的資料庫 constraint 錯誤，轉成中文訊息，不直接把後端原文（資料表/約束名稱）丟給使用者
function friendlyError(message: string): string {
  if (message.includes('club_announcements_expires_after_publish')) return '到期時間必須晚於發布時間'
  if (message.includes('club_announcements_title_present')) return '請輸入標題'
  if (message.includes('club_announcements_body_present')) return '請輸入內容'
  return '儲存失敗，請稍後再試'
}

function openAdd() {
  editingId.value = null
  form.value = emptyForm()
  formError.value = ''
  showModal.value = true
}

function openEdit(item: ClubAnnouncement) {
  editingId.value = item.id
  form.value = {
    title: item.title,
    body: item.body,
    is_published: item.is_published,
    published_at: toLocalInputValue(item.published_at),
    expires_at: toLocalInputValue(item.expires_at),
  }
  formError.value = ''
  showModal.value = true
}

async function save() {
  const clubId = auth.clubId
  const title = form.value.title.trim()
  const body = form.value.body.trim()
  if (!title) { formError.value = '請輸入標題'; return }
  if (!body) { formError.value = '請輸入內容'; return }
  if (!clubId) return
  if (form.value.expires_at && form.value.expires_at <= form.value.published_at) {
    formError.value = '到期時間必須晚於發布時間'
    return
  }

  const payload = {
    title,
    body,
    is_published: form.value.is_published,
    published_at: new Date(form.value.published_at).toISOString(),
    expires_at: form.value.expires_at ? new Date(form.value.expires_at).toISOString() : null,
  }

  saving.value = true
  const { error } = editingId.value
    ? await announcements.updateClubAnnouncement(editingId.value, clubId, payload)
    : await announcements.createClubAnnouncement({ ...payload, club_id: clubId, created_by: auth.user?.id ?? null })
  saving.value = false

  if (error) {
    formError.value = friendlyError(error.message)
    return
  }
  showModal.value = false
  toast.show(editingId.value ? '已更新' : '已新增')
}

async function remove(item: ClubAnnouncement) {
  const clubId = auth.clubId
  if (!clubId || !confirm(`刪除「${item.title}」？`)) return
  const { error } = await announcements.deleteClubAnnouncement(item.id, clubId)
  if (error) { toast.show('刪除失敗：' + friendlyError(error.message), 'err'); return }
  toast.show('已刪除')
}

onMounted(() => {
  if (auth.clubId) announcements.fetchClubForAdmin(auth.clubId)
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>社內公告</h1>
      <button class="btn btn-gold" @click="openAdd">+ 新增公告</button>
    </div>

    <div class="tw" style="overflow-x:auto;">
      <table class="card-table">
        <thead class="th">
          <tr>
            <th>標題</th>
            <th>狀態</th>
            <th>發布時間</th>
            <th>到期時間</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in announcements.adminClubAnnouncements" :key="item.id">
            <td data-label="標題" class="card-stack">
              <strong class="ellipsis-cell" :title="item.title">{{ item.title }}</strong>
              <div class="announcement-preview">{{ item.body }}</div>
            </td>
            <td data-label="狀態">
              <span class="bdg" :class="announcementStatus(item).cls">{{ announcementStatus(item).label }}</span>
            </td>
            <td data-label="發布時間">{{ formatDateTime(item.published_at) }}</td>
            <td data-label="到期時間">{{ formatDateTime(item.expires_at) }}</td>
            <td>
              <div style="display:flex; gap:6px;">
                <button class="btn btn-g btn-sm" @click="openEdit(item)">編輯</button>
                <button class="btn btn-red btn-sm" @click="remove(item)">刪除</button>
              </div>
            </td>
          </tr>
          <tr v-if="!announcements.adminClubAnnouncements.length">
            <td colspan="5" style="text-align:center; color:var(--muted);">尚無社內公告</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="mo" @click.self="showModal = false">
      <div class="mb">
        <div class="mb-h">
          <h3>{{ modalTitle }}</h3>
          <button class="mb-close" @click="showModal = false">×</button>
        </div>
        <form @submit.prevent="save">
          <div class="mb-body">
            <p v-if="formError" style="color:var(--red); font-size:12px; margin-bottom:10px;">{{ formError }}</p>
            <div>
              <label class="fl" for="announcement-title">標題 *</label>
              <input id="announcement-title" v-model="form.title" class="fi" required :maxlength="TITLE_MAX_LENGTH" />
            </div>
            <div>
              <label class="fl" for="announcement-body">內容 *</label>
              <textarea id="announcement-body" v-model="form.body" class="fi announcement-body" required></textarea>
            </div>
            <div>
              <label class="fl" for="announcement-published-at">發布時間 *</label>
              <input id="announcement-published-at" v-model="form.published_at" type="datetime-local" class="fi" required />
            </div>
            <div>
              <label class="fl" for="announcement-expires-at">到期時間</label>
              <input id="announcement-expires-at" v-model="form.expires_at" type="datetime-local" class="fi" />
            </div>
            <label class="publish-toggle">
              <input v-model="form.is_published" type="checkbox" />
              <span>立即發布（取消勾選則存為草稿，社友看不到）</span>
            </label>
          </div>
          <div class="mb-foot">
            <button type="button" class="btn btn-g" @click="showModal = false">取消</button>
            <button type="submit" class="btn btn-gold" :disabled="saving">{{ saving ? '儲存中…' : '儲存' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.announcement-preview {
  max-width: 520px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 3px;
  color: var(--muted);
  font-size: 12px;
}

.announcement-body {
  min-height: 140px;
  resize: vertical;
}

.publish-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text);
}

.ellipsis-cell {
  display: block;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
