<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import * as XLSX from 'xlsx'
import { useAuthStore } from '@/stores/auth'
import { useSisterClubsStore } from '@/stores/sisterClubs'
import type { SisterClub } from '@/types'

const auth = useAuthStore()
const sisterClubs = useSisterClubsStore()

const canManage = computed(() => auth.role === 'club_admin' || auth.role === 'club_secretary')

const showModal = ref(false)
const editingId = ref<string | null>(null)
const form = ref(emptyForm())
const modalTitle = computed(() => editingId.value ? '編輯友好社' : '新增友好社')

function emptyForm() {
  return {
    partner_name: '',
    established_date: '',
    president_name: '',
    relationship_note: '',
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function openAdd() {
  editingId.value = null
  form.value = emptyForm()
  showModal.value = true
}

function openEdit(item: SisterClub) {
  editingId.value = item.id
  form.value = {
    partner_name: item.partner_name,
    established_date: item.established_date,
    president_name: item.president_name ?? '',
    relationship_note: item.relationship_note ?? '',
  }
  showModal.value = true
}

async function save() {
  const clubId = auth.clubId
  const partnerName = form.value.partner_name.trim()
  if (!clubId || !partnerName || !form.value.established_date) return

  const payload = {
    partner_name: partnerName,
    established_date: form.value.established_date,
    president_name: form.value.president_name.trim() || null,
    relationship_note: form.value.relationship_note.trim() || null,
  }

  const { error } = editingId.value
    ? await sisterClubs.update(editingId.value, clubId, payload)
    : await sisterClubs.create({ ...payload, club_id: clubId, created_by: auth.user?.id ?? null })

  if (error) {
    alert(error.message)
    return
  }
  showModal.value = false
}

async function remove(item: SisterClub) {
  const clubId = auth.clubId
  if (!clubId || !confirm(`刪除「${item.partner_name}」？`)) return
  const { error } = await sisterClubs.remove(item.id, clubId)
  if (error) alert(error.message)
}

function handleExport() {
  const rows = sisterClubs.list.map(item => ({
    社名: item.partner_name,
    結盟時間: formatDate(item.established_date),
    當屆社長: item.president_name || '',
    兩社情誼說明: item.relationship_note || '',
  }))
  const sheet = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, '友好社')
  XLSX.writeFile(wb, `${auth.clubName || '社'}的友好社.xlsx`)
}

onMounted(() => {
  if (auth.clubId) sisterClubs.fetchAll(auth.clubId)
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>友好社</h1>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-g" @click="handleExport">📤 匯出 Excel</button>
        <button v-if="canManage" class="btn btn-gold" @click="openAdd">+ 新增友好社</button>
      </div>
    </div>

    <div class="tw">
      <table class="card-table">
        <thead class="th">
          <tr>
            <th>社名</th>
            <th>結盟時間</th>
            <th>當屆社長</th>
            <th>兩社情誼說明</th>
            <th v-if="canManage"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in sisterClubs.list" :key="item.id">
            <td data-label="社名"><strong>{{ item.partner_name }}</strong></td>
            <td data-label="結盟時間">{{ formatDate(item.established_date) }}</td>
            <td data-label="當屆社長">{{ item.president_name || '-' }}</td>
            <td data-label="兩社情誼說明" class="note-cell card-stack">{{ item.relationship_note || '-' }}</td>
            <td v-if="canManage">
              <div style="display:flex; gap:6px;">
                <button class="btn btn-g btn-sm" @click="openEdit(item)">編輯</button>
                <button class="btn btn-red btn-sm" @click="remove(item)">刪除</button>
              </div>
            </td>
          </tr>
          <tr v-if="!sisterClubs.list.length">
            <td :colspan="canManage ? 5 : 4" style="text-align:center; color:var(--muted);">尚無友好社資料</td>
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
            <label class="fl">社名 *</label>
            <input v-model="form.partner_name" class="fi" placeholder="例如：新竹和平社" />
          </div>
          <div>
            <label class="fl">結盟時間 *</label>
            <input v-model="form.established_date" type="date" class="fi" />
          </div>
          <div>
            <label class="fl">當屆社長</label>
            <input v-model="form.president_name" class="fi" placeholder="結盟時的雙方社長" />
          </div>
          <div>
            <label class="fl">兩社情誼說明</label>
            <textarea v-model="form.relationship_note" class="fi note-body" placeholder="例如：不寫 IOU，每次餐敘為固定金額不限人數"></textarea>
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
