<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import * as XLSX from 'xlsx'
import { useAuthStore } from '@/stores/auth'
import { useIouStore } from '@/stores/iou'
import type { IouReceipt, IouItem, IouStatus } from '@/types'

const auth = useAuthStore()
const iou = useIouStore()

const canManage = computed(() => auth.role === 'club_admin' || auth.role === 'club_secretary')

const IOU_ITEMS: IouItem[] = ['社務捐獻', '活動贊助', '服務計畫捐獻', '慈善捐款', '獎助學金', '設備物資', '其他']
const IOU_STATUSES: IouStatus[] = ['待開立', '已開立']

const monthFilter = ref('all')
const statusFilter = ref<IouStatus | 'all'>('all')
const search = ref('')

const monthOptions = computed(() => {
  const set = new Set(iou.receipts.map(r => r.donation_date.slice(0, 7)))
  return [...set].sort().reverse()
})

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split('-')
  return `${y}年${m}月`
}

const filtered = computed(() => {
  const kw = search.value.trim().toLowerCase()
  return iou.receipts.filter(r => {
    if (monthFilter.value !== 'all' && r.donation_date.slice(0, 7) !== monthFilter.value) return false
    if (statusFilter.value !== 'all' && r.status !== statusFilter.value) return false
    if (kw) {
      const hay = `${r.donor_name}${r.item}${r.receipt_payee || ''}${r.note || ''}`.toLowerCase()
      if (!hay.includes(kw)) return false
    }
    return true
  })
})

const groupedByMonth = computed(() => {
  const groups = new Map<string, IouReceipt[]>()
  for (const r of filtered.value) {
    const ym = r.donation_date.slice(0, 7)
    if (!groups.has(ym)) groups.set(ym, [])
    groups.get(ym)!.push(r)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, items]) => ({
      month,
      items,
      total: items.reduce((s, r) => s + r.amount, 0),
      pending: items.filter(r => r.status === '待開立').length,
      done: items.filter(r => r.status === '已開立').length,
    }))
})

const totalCount = computed(() => iou.receipts.length)
const pendingCount = computed(() => iou.receipts.filter(r => r.status === '待開立').length)
const doneCount = computed(() => iou.receipts.filter(r => r.status === '已開立').length)
const thisMonthCount = computed(() => {
  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return iou.receipts.filter(r => r.donation_date.startsWith(ym)).length
})

const showModal = ref(false)
const editing = ref<IouReceipt | null>(null)
const form = ref({
  donor_name: '',
  item: '' as IouItem | '',
  amount: '' as number | '',
  donation_date: '',
  receipt_payee: '',
  status: '待開立' as IouStatus,
  note: '',
})
const formError = ref('')

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function openAdd() {
  editing.value = null
  form.value = { donor_name: '', item: '', amount: '', donation_date: todayStr(), receipt_payee: '', status: '待開立', note: '' }
  formError.value = ''
  showModal.value = true
}

function openEdit(r: IouReceipt) {
  editing.value = r
  form.value = {
    donor_name: r.donor_name,
    item: r.item,
    amount: r.amount,
    donation_date: r.donation_date,
    receipt_payee: r.receipt_payee || '',
    status: r.status,
    note: r.note || '',
  }
  formError.value = ''
  showModal.value = true
}

async function save() {
  if (!form.value.donor_name.trim()) {
    formError.value = '請填寫社友姓名'
    return
  }
  if (!form.value.item) {
    formError.value = '請選擇捐獻項目'
    return
  }
  if (!form.value.amount || Number(form.value.amount) <= 0) {
    formError.value = '請填寫金額'
    return
  }
  if (!form.value.donation_date) {
    formError.value = '請填寫捐獻日期'
    return
  }
  if (!auth.clubId) return
  const payload = {
    donor_name: form.value.donor_name.trim(),
    item: form.value.item as IouItem,
    amount: Number(form.value.amount),
    donation_date: form.value.donation_date,
    receipt_payee: form.value.receipt_payee.trim() || null,
    status: form.value.status,
    note: form.value.note.trim() || null,
  }
  const { error } = editing.value
    ? await iou.update(editing.value.id, auth.clubId, payload)
    : await iou.insert({ ...payload, club_id: auth.clubId }, auth.user?.id ?? null)
  if (error) {
    formError.value = error.message
    return
  }
  showModal.value = false
}

async function remove() {
  if (!editing.value || !auth.clubId) return
  if (!confirm(`確定刪除「${editing.value.donor_name}」的這筆捐獻記錄？`)) return
  const { error } = await iou.remove(editing.value.id, auth.clubId)
  if (error) {
    formError.value = error.message
    return
  }
  showModal.value = false
}

async function toggleStatus(r: IouReceipt) {
  if (!canManage.value || !auth.clubId) return
  const next: IouStatus = r.status === '已開立' ? '待開立' : '已開立'
  await iou.update(r.id, auth.clubId, { status: next })
}

function handleExport() {
  const rows = filtered.value.map(r => ({
    日期: r.donation_date,
    社友: r.donor_name,
    項目: r.item,
    金額: r.amount,
    收據抬頭: r.receipt_payee || '',
    收據狀態: r.status,
    備註: r.note || '',
  }))
  const sheet = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, 'IOU捐獻記錄')
  XLSX.writeFile(wb, 'IOU捐獻記錄.xlsx')
}

onMounted(() => {
  iou.fetchAll(auth.clubId)
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <div>
        <h1>💰 IOU 捐獻收據追蹤</h1>
        <p class="ph-sub">追蹤社友其他捐獻（非社費）的收據開立狀態，按月分組瀏覽</p>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-g" @click="handleExport">📤 匯出</button>
        <button v-if="canManage" class="btn btn-gold" @click="openAdd">+ 新增捐獻記錄</button>
      </div>
    </div>

    <div class="iou-notice">
      📝 <b>使用說明：</b>本頁追蹤社友針對社務、活動、服務計畫等的<b>非社費捐獻</b>，重點是<b>收據是否已開立給捐款人</b>。收到錢且開好收據，麻煩把狀態改成「已開立」。
    </div>

    <div class="summary-grid">
      <div class="tw summary-card">
        <div class="summary-label">捐獻總筆數</div>
        <div class="summary-value">{{ totalCount }}</div>
      </div>
      <div class="tw summary-card" style="border-left:3px solid var(--gold);">
        <div class="summary-label">待開收據</div>
        <div class="summary-value" style="color:var(--gold);">{{ pendingCount }}</div>
      </div>
      <div class="tw summary-card" style="border-left:3px solid var(--green);">
        <div class="summary-label">已開收據</div>
        <div class="summary-value" style="color:var(--green);">{{ doneCount }}</div>
      </div>
      <div class="tw summary-card" style="border-left:3px solid var(--navy);">
        <div class="summary-label">本月新增</div>
        <div class="summary-value">{{ thisMonthCount }}</div>
      </div>
    </div>

    <div class="iou-filters">
      <span class="fl" style="margin:0;">📅 月份篩選：</span>
      <select v-model="monthFilter" class="fi" style="width:auto; min-width:140px;">
        <option value="all">全部月份</option>
        <option v-for="m in monthOptions" :key="m" :value="m">{{ formatMonthLabel(m) }}</option>
      </select>
      <span class="fl" style="margin:0 0 0 14px;">狀態：</span>
      <select v-model="statusFilter" class="fi" style="width:auto; min-width:110px;">
        <option value="all">全部</option>
        <option v-for="s in IOU_STATUSES" :key="s" :value="s">{{ s }}</option>
      </select>
      <input v-model="search" class="fi" placeholder="🔍 搜尋社友、項目..." style="flex:1; max-width:240px; margin-left:14px;" />
    </div>

    <div v-if="!iou.receipts.length" class="iou-empty">
      尚無捐獻記錄{{ canManage ? '，點右上角「+ 新增捐獻記錄」開始記錄' : '' }}
    </div>
    <div v-else-if="!groupedByMonth.length" class="iou-empty">無符合條件的記錄</div>

    <div v-for="g in groupedByMonth" :key="g.month" class="iou-month">
      <div class="iou-month-head">
        <div class="iou-month-title">📅 {{ formatMonthLabel(g.month) }}（{{ g.items.length }}筆）</div>
        <div class="iou-month-stats">
          <span>合計 <b style="color:var(--navy);">NT${{ g.total.toLocaleString() }}</b></span>
          <span v-if="g.pending" style="color:var(--gold);">⏳ 待開 <b>{{ g.pending }}</b></span>
          <span v-if="g.done" style="color:var(--green);">✅ 已開 <b>{{ g.done }}</b></span>
        </div>
      </div>
      <div class="iou-row iou-row-head" :class="{ 'no-actions': !canManage }">
        <div>日期</div>
        <div>社友</div>
        <div>項目</div>
        <div style="text-align:right;">金額</div>
        <div>收據抬頭</div>
        <div style="text-align:center;">收據狀態</div>
        <div v-if="canManage" style="text-align:center;">操作</div>
      </div>
      <div v-for="r in g.items" :key="r.id" class="iou-row" :class="{ 'no-actions': !canManage }">
        <div data-label="日期">{{ r.donation_date }}</div>
        <div data-label="社友" style="font-weight:600;">{{ r.donor_name }}</div>
        <div data-label="項目" style="color:var(--muted);">{{ r.item }}</div>
        <div data-label="金額" style="text-align:right; font-weight:600;">NT${{ r.amount.toLocaleString() }}</div>
        <div data-label="收據抬頭" style="color:var(--muted); font-size:11px;">{{ r.receipt_payee || '-' }}</div>
        <div data-label="收據狀態" style="text-align:center;">
          <span
            class="bdg iou-status"
            :class="r.status === '已開立' ? 'b-gr' : 'b-y'"
            :style="canManage ? 'cursor:pointer;' : ''"
            @click="toggleStatus(r)"
          >{{ r.status === '已開立' ? '✅' : '⏳' }} {{ r.status }}</span>
        </div>
        <div v-if="canManage" style="text-align:center;">
          <button class="btn btn-g btn-sm" @click="openEdit(r)">✏️ 編輯</button>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="mo" @click.self="showModal = false">
      <div class="mb">
        <div class="mb-h">
          <h3>{{ editing ? '編輯捐獻記錄' : '+ 新增捐獻記錄' }}</h3>
          <button class="mb-close" @click="showModal = false">×</button>
        </div>
        <div class="mb-body">
          <p v-if="formError" style="color:var(--red); font-size:12px; margin-bottom:10px;">{{ formError }}</p>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <label class="fl">社友姓名 *</label>
              <input v-model="form.donor_name" class="fi" placeholder="如：王大明" />
            </div>
            <div>
              <label class="fl">捐獻日期 *</label>
              <input v-model="form.donation_date" type="date" class="fi" />
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:10px;">
            <div>
              <label class="fl">捐獻項目 *</label>
              <select v-model="form.item" class="fi">
                <option value="" disabled>— 請選擇 —</option>
                <option v-for="it in IOU_ITEMS" :key="it" :value="it">{{ it }}</option>
              </select>
            </div>
            <div>
              <label class="fl">金額 NT$ *</label>
              <input v-model.number="form.amount" type="number" class="fi" placeholder="如：5000" />
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:10px;">
            <div>
              <label class="fl">收據抬頭</label>
              <input v-model="form.receipt_payee" class="fi" placeholder="如：王大明 / ○○公司" />
            </div>
            <div>
              <label class="fl">收據狀態 *</label>
              <select v-model="form.status" class="fi">
                <option v-for="s in IOU_STATUSES" :key="s" :value="s">{{ s === '待開立' ? '⏳ 待開立' : '✅ 已開立' }}</option>
              </select>
            </div>
          </div>
          <div style="margin-top:10px;">
            <label class="fl">備註 / 收據號碼</label>
            <input v-model="form.note" class="fi" placeholder="如：收據號 R-2026-001" />
          </div>
        </div>
        <div class="mb-foot">
          <button v-if="editing" class="btn btn-red" @click="remove">🗑 刪除</button>
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

.iou-notice {
  background: #FDF8EE;
  border: 1px solid var(--gold);
  border-radius: 8px;
  padding: 10px 16px;
  margin-bottom: 14px;
  font-size: 12px;
  color: #7A5A10;
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

.iou-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.iou-empty {
  text-align: center;
  padding: 40px;
  color: var(--muted);
  background: #fff;
  border-radius: 10px;
  border: 1px dashed var(--border);
  margin-bottom: 18px;
}

.iou-month {
  margin-bottom: 18px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid var(--border);
  overflow: hidden;
}

.iou-month-head {
  padding: 10px 16px;
  background: #FDF8EE;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.iou-month-title {
  font-weight: 700;
  font-size: 13px;
  color: var(--navy);
}

.iou-month-stats {
  display: flex;
  gap: 14px;
  font-size: 11px;
  color: var(--muted);
}

.iou-row {
  display: grid;
  grid-template-columns: 90px 1fr 1fr 100px 1fr 110px 90px;
  gap: 8px;
  padding: 8px 16px;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
  font-size: 12px;
}

.iou-row.no-actions {
  grid-template-columns: 90px 1fr 1fr 100px 1fr 110px;
}

.iou-row:last-child {
  border-bottom: none;
}

.iou-row-head {
  background: #FAFAFA;
  font-size: 10px;
  color: var(--muted);
  font-weight: 700;
  border-bottom: 1px solid var(--border);
}

.iou-status {
  font-size: 11px;
}

@media (max-width: 800px) {
  .iou-row-head {
    display: none;
  }
  .iou-row {
    grid-template-columns: 1fr;
    gap: 4px;
    padding: 10px 16px;
  }
  .iou-row > div[data-label]::before {
    content: attr(data-label);
    display: inline-block;
    min-width: 70px;
    color: var(--muted);
    font-size: 10px;
    margin-right: 6px;
  }
}
</style>
