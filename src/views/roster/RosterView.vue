<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import * as XLSX from 'xlsx'
import { useAuthStore } from '@/stores/auth'
import { useRosterStore } from '@/stores/roster'
import { useFeaturesStore } from '@/stores/features'
import { usePermissionsStore } from '@/stores/permissions'
import type {
  RosterMember,
  RosterMemberInsert,
  RosterExcelRow,
  RosterClubPosition,
  RosterMemberStatus,
} from '@/types'

const auth = useAuthStore()
const roster = useRosterStore()
const features = useFeaturesStore()
const permissions = usePermissionsStore()
const canManage = computed(() => permissions.can('roster', 'edit'))

const CLASSIFICATIONS = [
  '農林漁牧業',
  '礦業及土石採取業',
  '製造業',
  '電力及燃氣供應業',
  '用水供應及污染整治業',
  '營建工程業',
  '批發及零售業',
  '運輸及倉儲業',
  '住宿及餐飲業',
  '資訊及通訊傳播業',
  '金融及保險業',
  '不動產業',
  '專業、科學及技術服務業',
  '教育業',
  '醫療保健及社會工作服務業',
  '文化、運動及休閒服務業',
  '公共行政及國防',
  '其他服務業',
]

const CLUB_POSITIONS: RosterClubPosition[] = ['PP', 'IPP', 'P', 'VP', 'PE', 'S', '社友']
const MEMBER_STATUS_LABEL: Record<RosterMemberStatus, string> = {
  normal: '正常',
  leave: '請假',
  resigned: '退社',
}

const keyword = ref('')
const statusFilter = ref<RosterMemberStatus | 'all'>('normal')

function memberStatus(m: RosterMember): RosterMemberStatus {
  return m.member_status ?? (m.is_active ? 'normal' : 'resigned')
}

function normalizeStatus(value: string | undefined): RosterMemberStatus {
  if (value === '請假' || value === 'leave') return 'leave'
  if (value === '退社' || value === 'resigned' || value === '離職') return 'resigned'
  return 'normal'
}

function activeFromStatus(status: RosterMemberStatus) {
  return status !== 'resigned'
}

function withDerivedStatus(payload: RosterMemberInsert): RosterMemberInsert {
  const status = payload.member_status ?? 'normal'
  return {
    ...payload,
    member_status: status,
    is_active: activeFromStatus(status),
    phone: payload.personal_phone ?? payload.phone ?? null,
  }
}

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return roster.members.filter(m => {
    if (statusFilter.value !== 'all' && memberStatus(m) !== statusFilter.value) return false
    if (!kw) return true
    return [
      m.nick_name,
      m.name,
      m.club_position,
      m.job_title,
      m.company,
      m.classification,
      m.email,
      m.personal_phone,
      m.company_phone,
      m.phone,
    ]
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
    club_position: '社友',
    member_status: 'normal',
    job_title: null,
    company: null,
    classification: null,
    email: null,
    phone: null,
    personal_phone: null,
    company_phone: null,
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
  const payload = withDerivedStatus(form.value)
  if (editing.value) {
    await roster.update(editing.value.id, payload)
  } else {
    await roster.insert(payload)
  }
  showModal.value = false
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
    const status = normalizeStatus(row.狀態)
    const personalPhone = row.個人電話 ?? row.電話 ?? null
    await roster.insert({
      club_id: auth.clubId ?? '',
      name: row.姓名,
      nick_name: row.英文名 ?? null,
      club_position: CLUB_POSITIONS.includes(row.社內職稱 as RosterClubPosition)
        ? (row.社內職稱 as RosterClubPosition)
        : '社友',
      member_status: status,
      job_title: row.職稱 ?? null,
      company: row.公司 ?? null,
      classification: row.職業分類 ?? null,
      email: row.Email ?? null,
      phone: personalPhone,
      personal_phone: personalPhone,
      company_phone: row.公司電話 ?? null,
      join_date: row.入社日期 ?? null,
      is_active: activeFromStatus(status),
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
    社內職稱: m.club_position ?? '社友',
    狀態: MEMBER_STATUS_LABEL[memberStatus(m)],
    職稱: m.job_title ?? '',
    職業分類: m.classification ?? '',
    公司: m.company ?? '',
    Email: m.email ?? '',
    個人電話: m.personal_phone ?? m.phone ?? '',
    公司電話: m.company_phone ?? '',
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
      <input v-model="keyword" class="fi" style="max-width:240px;" placeholder="搜尋英文名/中文名/公司/電話/Email" />
      <select v-model="statusFilter" class="fi" style="max-width:120px;">
        <option value="normal">正常</option>
        <option value="leave">請假</option>
        <option value="resigned">退社</option>
        <option value="all">全部</option>
      </select>
    </div>

    <div class="tw">
      <table>
        <thead class="th">
          <tr>
            <th>英文名稱</th>
            <th>中文姓名</th>
            <th>社內職稱</th>
            <th>職業分類</th>
            <th>公司</th>
            <th>職稱</th>
            <th>個人電話</th>
            <th>公司電話</th>
            <th>Email</th>
            <th>入社日期</th>
            <th>狀態</th>
            <th v-if="canManage"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in filtered" :key="m.id">
            <td>{{ m.nick_name || '-' }}</td>
            <td>{{ m.name }}</td>
            <td>{{ m.club_position || '社友' }}</td>
            <td>{{ m.classification || '-' }}</td>
            <td>{{ m.company || '-' }}</td>
            <td>{{ m.job_title || '-' }}</td>
            <td>{{ m.personal_phone || m.phone || '-' }}</td>
            <td>{{ m.company_phone || '-' }}</td>
            <td>{{ m.email || '-' }}</td>
            <td>{{ m.join_date || '-' }}</td>
            <td>
              <span class="bdg" :class="memberStatus(m) === 'resigned' ? 'b-g' : memberStatus(m) === 'leave' ? 'b-y' : 'b-gr'">
                {{ MEMBER_STATUS_LABEL[memberStatus(m)] }}
              </span>
            </td>
            <td v-if="canManage" style="display:flex; gap:6px;">
              <button class="btn btn-g btn-sm" @click="openEdit(m)">編輯</button>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td :colspan="canManage ? 12 : 11" style="text-align:center; color:var(--muted);">查無資料</td>
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
            <label class="fl">中文姓名 *</label>
            <input v-model="form.name" class="fi" />
          </div>
          <div>
            <label class="fl">社內英文名稱</label>
            <input v-model="form.nick_name" class="fi" />
          </div>
          <div>
            <label class="fl">社內職稱</label>
            <select v-model="form.club_position" class="fi">
              <option v-for="p in CLUB_POSITIONS" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
          <div>
            <label class="fl">狀態</label>
            <select v-model="form.member_status" class="fi">
              <option value="normal">正常</option>
              <option value="leave">請假</option>
              <option value="resigned">退社</option>
            </select>
          </div>
          <div>
            <label class="fl">職稱</label>
            <input v-model="form.job_title" class="fi" />
          </div>
          <div>
            <label class="fl">職業分類</label>
            <select v-model="form.classification" class="fi">
              <option :value="null">請選擇</option>
              <option v-for="c in CLASSIFICATIONS" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div>
            <label class="fl">公司</label>
            <input v-model="form.company" class="fi" />
          </div>
          <div>
            <label class="fl">個人電話</label>
            <input v-model="form.personal_phone" class="fi" />
          </div>
          <div>
            <label class="fl">公司電話</label>
            <input v-model="form.company_phone" class="fi" />
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
