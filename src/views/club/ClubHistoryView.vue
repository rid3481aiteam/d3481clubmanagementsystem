<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useClubHistoryStore } from '@/stores/clubHistory'
import type { ClubHistoryRecord } from '@/types'

const auth = useAuthStore()
const clubHistory = useClubHistoryStore()

const canManage = computed(() => auth.role === 'club_admin' || auth.role === 'club_secretary')

const showModal = ref(false)
const editingId = ref<string | null>(null)
const form = ref(emptyForm())
const modalTitle = computed(() => editingId.value ? '編輯歷屆社長紀錄' : '新增歷屆社長紀錄')

function emptyForm() {
  return {
    year_term: '',
    president_name: '',
    secretary_name: '',
    service_plan: '',
  }
}

function openAdd() {
  editingId.value = null
  form.value = emptyForm()
  showModal.value = true
}

function openEdit(item: ClubHistoryRecord) {
  editingId.value = item.id
  form.value = {
    year_term: item.year_term,
    president_name: item.president_name ?? '',
    secretary_name: item.secretary_name ?? '',
    service_plan: item.service_plan ?? '',
  }
  showModal.value = true
}

async function save() {
  const clubId = auth.clubId
  const yearTerm = form.value.year_term.trim()
  if (!clubId || !yearTerm) return

  const payload = {
    year_term: yearTerm,
    president_name: form.value.president_name.trim() || null,
    secretary_name: form.value.secretary_name.trim() || null,
    service_plan: form.value.service_plan.trim() || null,
  }

  const { error } = editingId.value
    ? await clubHistory.update(editingId.value, clubId, payload)
    : await clubHistory.create({ ...payload, club_id: clubId, created_by: auth.user?.id ?? null })

  if (error) {
    alert(error.message)
    return
  }
  showModal.value = false
}

async function remove(item: ClubHistoryRecord) {
  const clubId = auth.clubId
  if (!clubId || !confirm(`刪除「${item.year_term}」的紀錄？`)) return
  const { error } = await clubHistory.remove(item.id, clubId)
  if (error) alert(error.message)
}

onMounted(() => {
  if (auth.clubId) clubHistory.fetchAll(auth.clubId)
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>歷屆社長</h1>
      <button v-if="canManage" class="btn btn-gold" @click="openAdd">+ 新增年度紀錄</button>
    </div>

    <div class="tw">
      <table class="card-table">
        <thead class="th">
          <tr>
            <th>年份</th>
            <th>社長</th>
            <th>當年秘書</th>
            <th>社區服務計劃</th>
            <th v-if="canManage"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in clubHistory.list" :key="item.id">
            <td data-label="年份"><strong>{{ item.year_term }}</strong></td>
            <td data-label="社長">{{ item.president_name || '-' }}</td>
            <td data-label="當年秘書">{{ item.secretary_name || '-' }}</td>
            <td data-label="社區服務計劃" class="note-cell card-stack">{{ item.service_plan || '-' }}</td>
            <td v-if="canManage" style="display:flex; gap:6px;">
              <button class="btn btn-g btn-sm" @click="openEdit(item)">編輯</button>
              <button class="btn btn-red btn-sm" @click="remove(item)">刪除</button>
            </td>
          </tr>
          <tr v-if="!clubHistory.list.length">
            <td :colspan="canManage ? 5 : 4" style="text-align:center; color:var(--muted);">尚無歷屆社長紀錄</td>
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
            <label class="fl">年份 *</label>
            <input v-model="form.year_term" class="fi" placeholder="例如：2025-2026" />
          </div>
          <div>
            <label class="fl">社長</label>
            <input v-model="form.president_name" class="fi" />
          </div>
          <div>
            <label class="fl">當年秘書</label>
            <input v-model="form.secretary_name" class="fi" />
          </div>
          <div>
            <label class="fl">社區服務計劃</label>
            <textarea v-model="form.service_plan" class="fi note-body" placeholder="這個年度做了哪些社區服務計劃"></textarea>
          </div>
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
.note-cell {
  max-width: 360px;
  white-space: pre-line;
  color: var(--text);
}

.note-body {
  min-height: 100px;
  resize: vertical;
}
</style>
