<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAnnouncementsStore } from '@/stores/announcements'
import type { ClubAnnouncement } from '@/types'

const auth = useAuthStore()
const announcements = useAnnouncementsStore()

const showModal = ref(false)
const editingId = ref<string | null>(null)
const form = ref(emptyForm())
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
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function openAdd() {
  editingId.value = null
  form.value = emptyForm()
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
  showModal.value = true
}

async function save() {
  const clubId = auth.clubId
  const title = form.value.title.trim()
  const body = form.value.body.trim()
  if (!clubId || !title || !body) return

  const payload = {
    title,
    body,
    is_published: form.value.is_published,
    published_at: new Date(form.value.published_at).toISOString(),
    expires_at: form.value.expires_at ? new Date(form.value.expires_at).toISOString() : null,
  }

  const { error } = editingId.value
    ? await announcements.updateClubAnnouncement(editingId.value, clubId, payload)
    : await announcements.createClubAnnouncement({ ...payload, club_id: clubId, created_by: auth.user?.id ?? null })

  if (error) {
    alert(error.message)
    return
  }
  showModal.value = false
}

async function remove(item: ClubAnnouncement) {
  const clubId = auth.clubId
  if (!clubId || !confirm(`刪除「${item.title}」？`)) return
  const { error } = await announcements.deleteClubAnnouncement(item.id, clubId)
  if (error) alert(error.message)
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

    <div class="tw">
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
              <strong>{{ item.title }}</strong>
              <div class="announcement-preview">{{ item.body }}</div>
            </td>
            <td data-label="狀態">
              <span class="bdg" :class="item.is_published ? 'b-gr' : 'b-g'">
                {{ item.is_published ? '已發布' : '草稿' }}
              </span>
            </td>
            <td data-label="發布時間">{{ formatDateTime(item.published_at) }}</td>
            <td data-label="到期時間">{{ formatDateTime(item.expires_at) }}</td>
            <td style="display:flex; gap:6px;">
              <button class="btn btn-g btn-sm" @click="openEdit(item)">編輯</button>
              <button class="btn btn-red btn-sm" @click="remove(item)">刪除</button>
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
        <div class="mb-body">
          <div>
            <label class="fl">標題 *</label>
            <input v-model="form.title" class="fi" />
          </div>
          <div>
            <label class="fl">內容 *</label>
            <textarea v-model="form.body" class="fi announcement-body"></textarea>
          </div>
          <div>
            <label class="fl">發布時間 *</label>
            <input v-model="form.published_at" type="datetime-local" class="fi" />
          </div>
          <div>
            <label class="fl">到期時間</label>
            <input v-model="form.expires_at" type="datetime-local" class="fi" />
          </div>
          <label class="publish-toggle">
            <input v-model="form.is_published" type="checkbox" />
            <span>發布到本社儀表板</span>
          </label>
        </div>
        <div class="mb-foot">
          <button class="btn btn-g" @click="showModal = false">取消</button>
          <button class="btn btn-gold" @click="save">儲存</button>
        </div>
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
</style>
