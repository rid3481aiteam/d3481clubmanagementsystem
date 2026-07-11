<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGgStore } from '@/stores/gg'
import type { GgCase, GgStatus } from '@/types'

const auth = useAuthStore()
const gg = useGgStore()

const canManage = computed(() => auth.role === 'club_admin' || auth.role === 'club_secretary')

const GG_STATUSES: GgStatus[] = ['規劃中', '申請中', '進行中', '已完成', '取消']

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function isOverdue(c: GgCase) {
  return c.status !== '已完成' && !!c.end_date && c.end_date < todayStr()
}

const activeCount = computed(() => gg.cases.filter(c => c.status === '進行中').length)
const planCount = computed(() => gg.cases.filter(c => c.status === '規劃中').length)
const doneCount = computed(() => gg.cases.filter(c => c.status === '已完成').length)
const riskCount = computed(() => gg.cases.filter(isOverdue).length)

const statusBadgeClass: Record<GgStatus, string> = {
  規劃中: 'b-y',
  申請中: 'b-y',
  進行中: 'b-n',
  已完成: 'b-gr',
  取消: 'b-r',
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const showModal = ref(false)
const editingId = ref<string | null>(null)
const form = ref(emptyForm())
const formError = ref('')
const modalTitle = computed(() => editingId.value ? '編輯GG案' : '+ 新增GG案')

function emptyForm() {
  return {
    name: '',
    partner: '',
    amount: '',
    start_date: '',
    end_date: '',
    status: '規劃中' as GgStatus,
    description: '',
  }
}

function openAdd() {
  editingId.value = null
  form.value = emptyForm()
  formError.value = ''
  showModal.value = true
}

function openEdit(c: GgCase) {
  editingId.value = c.id
  form.value = {
    name: c.name,
    partner: c.partner || '',
    amount: c.amount || '',
    start_date: c.start_date || '',
    end_date: c.end_date || '',
    status: c.status,
    description: c.description || '',
  }
  formError.value = ''
  showModal.value = true
}

async function save() {
  const name = form.value.name.trim()
  if (!name) {
    formError.value = '請填寫案件名稱'
    return
  }
  const clubId = auth.clubId
  if (!clubId) return
  const payload = {
    name,
    partner: form.value.partner.trim() || null,
    amount: form.value.amount.trim() || null,
    start_date: form.value.start_date || null,
    end_date: form.value.end_date || null,
    status: form.value.status,
    description: form.value.description.trim() || null,
  }
  const { error } = editingId.value
    ? await gg.update(editingId.value, clubId, payload)
    : await gg.insert({ ...payload, club_id: clubId }, auth.user?.id ?? null)
  if (error) {
    formError.value = error.message
    return
  }
  showModal.value = false
}

async function remove(c: GgCase) {
  const clubId = auth.clubId
  if (!clubId || !confirm(`確定刪除「${c.name}」？`)) return
  const { error } = await gg.remove(c.id, clubId)
  if (error) alert(error.message)
}

onMounted(() => {
  if (auth.clubId) gg.fetchAll(auth.clubId)
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <div>
        <h1>🌐 GG案盤點</h1>
        <p class="ph-sub">全球獎助金專案追蹤，發起並完成一個 GG 案可獲 3 顆★</p>
      </div>
      <button v-if="canManage" class="btn btn-gold" @click="openAdd">+ 新增GG案</button>
    </div>

    <div class="summary-grid">
      <div class="tw summary-card" style="border-left:3px solid var(--navy);">
        <div class="summary-label">進行中</div>
        <div class="summary-value">{{ activeCount }}</div>
        <div class="summary-sub">GG案</div>
      </div>
      <div class="tw summary-card" style="border-left:3px solid var(--gold);">
        <div class="summary-label">規劃中</div>
        <div class="summary-value" style="color:var(--gold);">{{ planCount }}</div>
        <div class="summary-sub">評估中</div>
      </div>
      <div class="tw summary-card" style="border-left:3px solid var(--green);">
        <div class="summary-label">已完成</div>
        <div class="summary-value" style="color:var(--green);">{{ doneCount }}</div>
        <div class="summary-sub">本年度</div>
      </div>
      <div class="tw summary-card" style="border-left:3px solid var(--red);">
        <div class="summary-label">逾期風險</div>
        <div class="summary-value" style="color:var(--red);">{{ riskCount }}</div>
        <div class="summary-sub">需注意</div>
      </div>
    </div>

    <div class="tw">
      <table class="card-table">
        <thead class="th">
          <tr>
            <th>案件名稱</th>
            <th>國際夥伴</th>
            <th>金額</th>
            <th>期間</th>
            <th>狀態</th>
            <th>說明</th>
            <th v-if="canManage"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in gg.cases" :key="c.id">
            <td data-label="案件名稱"><strong>{{ c.name }}</strong></td>
            <td data-label="國際夥伴">{{ c.partner || '-' }}</td>
            <td data-label="金額" style="font-weight:600; color:var(--navy);">{{ c.amount || '-' }}</td>
            <td data-label="期間">
              {{ formatDate(c.start_date) }} ～ {{ formatDate(c.end_date) }}
              <span v-if="isOverdue(c)" class="bdg b-r" style="margin-left:4px;">⚠️ 逾期</span>
            </td>
            <td data-label="狀態"><span class="bdg" :class="statusBadgeClass[c.status]">{{ c.status }}</span></td>
            <td data-label="說明" class="note-cell card-stack">{{ c.description || '-' }}</td>
            <td v-if="canManage" style="display:flex; gap:6px;">
              <button class="btn btn-g btn-sm" @click="openEdit(c)">編輯</button>
              <button class="btn btn-red btn-sm" @click="remove(c)">刪除</button>
            </td>
          </tr>
          <tr v-if="!gg.cases.length">
            <td :colspan="canManage ? 7 : 6" style="text-align:center; color:var(--muted);">尚無GG案資料</td>
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
          <p v-if="formError" style="color:var(--red); font-size:12px; margin-bottom:10px;">{{ formError }}</p>
          <div>
            <label class="fl">案件名稱 *</label>
            <input v-model="form.name" class="fi" placeholder="例：台日文化交流GG案" />
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:10px;">
            <div>
              <label class="fl">國際夥伴社</label>
              <input v-model="form.partner" class="fi" placeholder="例：D2660日本夥伴社" />
            </div>
            <div>
              <label class="fl">申請金額</label>
              <input v-model="form.amount" class="fi" placeholder="例：US$30,000" />
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:10px;">
            <div>
              <label class="fl">開始日期</label>
              <input v-model="form.start_date" type="date" class="fi" />
            </div>
            <div>
              <label class="fl">結束日期</label>
              <input v-model="form.end_date" type="date" class="fi" />
            </div>
          </div>
          <div style="margin-top:10px;">
            <label class="fl">狀態</label>
            <select v-model="form.status" class="fi">
              <option v-for="s in GG_STATUSES" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div style="margin-top:10px;">
            <label class="fl">案件說明</label>
            <textarea v-model="form.description" class="fi note-body" placeholder="計畫目的、執行方式、預期影響…"></textarea>
          </div>
        </div>
        <div class="mb-foot">
          <button class="btn btn-g" @click="showModal = false">取消</button>
          <button class="btn btn-gold" @click="save">💾 儲存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ph-sub {
  font-size: 12px;
  color: var(--muted);
  margin-top: 3px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.summary-card {
  padding: 16px;
}

.summary-label {
  color: var(--muted);
  font-size: 12px;
  margin-bottom: 6px;
}

.summary-value {
  color: var(--navy);
  font-size: 24px;
  font-weight: 700;
}

.summary-sub {
  color: var(--muted);
  font-size: 11px;
  margin-top: 2px;
}

.note-cell {
  max-width: 260px;
  white-space: pre-line;
  color: var(--text);
}

.note-body {
  min-height: 90px;
  resize: vertical;
}
</style>
