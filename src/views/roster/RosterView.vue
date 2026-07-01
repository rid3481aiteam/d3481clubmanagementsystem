<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import * as XLSX from 'xlsx'
import { useAuthStore } from '@/stores/auth'
import { useRosterStore } from '@/stores/roster'
import { useFeaturesStore } from '@/stores/features'
import { usePermissionsStore } from '@/stores/permissions'
import type { RosterMember, RosterMemberInsert, RosterExcelRow } from '@/types'

const auth = useAuthStore()
const roster = useRosterStore()
const features = useFeaturesStore()
const permissions = usePermissionsStore()
const canManage = computed(() => permissions.can('roster', 'edit'))

const keyword = ref('')
const statusFilter = ref<'active' | 'inactive' | 'all'>('active')

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return roster.members.filter(m => {
    if (statusFilter.value === 'active' && !m.is_active) return false
    if (statusFilter.value === 'inactive' && m.is_active) return false
    if (!kw) return true
    return [m.name, m.nick_name, m.job_title, m.company, m.email, m.phone]
      .some(v => v?.toLowerCase().includes(kw))
  })
})

const showModal = ref(false)
const editing = ref<RosterMember | null>(null)
const form = ref<RosterMemberInsert>(emptyForm())

function emptyForm(): RosterMemberInsert {
  return {
    club_id: auth.clubId ?? '',
    name: '',
    nick_name: null,
    job_title: null,
    company: null,
    email: null,
    phone: null,
    join_date: null,
    is_active: true,
    note: null,
  }
}

function openAdd() {
  editing.value = null
  form.value = emptyForm()
  showModal.value = true
}

function openEdit(m: RosterMember) {
  editing.value = m
  form.value = { ...m }
  showModal.value = true
}

async function save() {
  if (!form.value.name.trim()) return
  if (editing.value) {
    await roster.update(editing.value.id, form.value)
  } else {
    await roster.insert(form.value)
  }
  showModal.value = false
  await roster.fetchAll(auth.clubId)
}

async function toggleActive(m: RosterMember) {
  await roster.setActive(m.id, !m.is_active)
  await roster.fetchAll(auth.clubId)
}

const fileInput = ref<HTMLInputElement | null>(null)

function triggerImport() {
  fileInput.value?.click()
}

async function handleImport(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<RosterExcelRow>(sheet)

  for (const row of rows) {
    if (!row.姓名) continue
    await roster.insert({
      club_id: auth.clubId ?? '',
      name: row.姓名,
      nick_name: row.英文名 ?? null,
      job_title: row.職稱 ?? null,
      company: row.公司 ?? null,
      email: row.Email ?? null,
      phone: row.電話 ?? null,
      join_date: row.入社日期 ?? null,
      is_active: true,
      note: null,
    })
  }
  await roster.fetchAll(auth.clubId)
  if (fileInput.value) fileInput.value.value = ''
}

function handleExport() {
  const rows: RosterExcelRow[] = filtered.value.map(m => ({
    姓名: m.name,
    英文名: m.nick_name ?? '',
    職稱: m.job_title ?? '',
    公司: m.company ?? '',
    Email: m.email ?? '',
    電話: m.phone ?? '',
    入社日期: m.join_date ?? '',
  }))
  const sheet = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, '社友名冊')
  XLSX.writeFile(wb, '社友名冊.xlsx')
}

onMounted(() => {
  roster.fetchAll(auth.clubId)
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>社友名冊</h1>
      <div v-if="canManage" style="display:flex; gap:8px;">
        <template v-if="features.isEnabled('D2_roster_excel')">
          <input ref="fileInput" type="file" accept=".xlsx,.xls" style="display:none" @change="handleImport" />
          <button class="btn btn-g btn-sm" @click="triggerImport">匯入 Excel</button>
          <button class="btn btn-g btn-sm" @click="handleExport">匯出 Excel</button>
        </template>
        <button class="btn btn-gold" @click="openAdd">+ 新增社友</button>
      </div>
    </div>

    <div style="display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap;">
      <input v-model="keyword" class="fi" style="max-width:240px;" placeholder="搜尋姓名/公司/電話/Email" />
      <select v-model="statusFilter" class="fi" style="max-width:120px;">
        <option value="active">在職</option>
        <option value="inactive">離職</option>
        <option value="all">全部</option>
      </select>
    </div>

    <div class="tw">
      <table>
        <thead class="th">
          <tr>
            <th>姓名</th>
            <th>職稱</th>
            <th>公司</th>
            <th>電話</th>
            <th>Email</th>
            <th>入社日期</th>
            <th>狀態</th>
            <th v-if="canManage"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in filtered" :key="m.id">
            <td>{{ m.name }}<span v-if="m.nick_name" style="color:var(--muted)"> ({{ m.nick_name }})</span></td>
            <td>{{ m.job_title || '-' }}</td>
            <td>{{ m.company || '-' }}</td>
            <td>{{ m.phone || '-' }}</td>
            <td>{{ m.email || '-' }}</td>
            <td>{{ m.join_date || '-' }}</td>
            <td><span class="bdg" :class="m.is_active ? 'b-gr' : 'b-g'">{{ m.is_active ? '在職' : '離職' }}</span></td>
            <td v-if="canManage" style="display:flex; gap:6px;">
              <button class="btn btn-g btn-sm" @click="openEdit(m)">編輯</button>
              <button class="btn btn-g btn-sm" @click="toggleActive(m)">{{ m.is_active ? '停用' : '恢復' }}</button>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td :colspan="canManage ? 8 : 7" style="text-align:center; color:var(--muted);">查無資料</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="mo" @click.self="showModal = false">
      <div class="mb">
        <div class="mb-h">
          <h3>{{ editing ? '編輯社友' : '新增社友' }}</h3>
          <button class="mb-close" @click="showModal = false">×</button>
        </div>
        <div class="mb-body">
          <div>
            <label class="fl">姓名 *</label>
            <input v-model="form.name" class="fi" />
          </div>
          <div>
            <label class="fl">英文名 / 暱稱</label>
            <input v-model="form.nick_name" class="fi" />
          </div>
          <div>
            <label class="fl">職稱</label>
            <input v-model="form.job_title" class="fi" />
          </div>
          <div>
            <label class="fl">公司</label>
            <input v-model="form.company" class="fi" />
          </div>
          <div>
            <label class="fl">電話</label>
            <input v-model="form.phone" class="fi" />
          </div>
          <div>
            <label class="fl">Email</label>
            <input v-model="form.email" class="fi" />
          </div>
          <div>
            <label class="fl">入社日期</label>
            <input v-model="form.join_date" type="date" class="fi" />
          </div>
          <div>
            <label class="fl">備註</label>
            <input v-model="form.note" class="fi" />
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
