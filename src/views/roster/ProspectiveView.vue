<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useProspectiveStore } from '@/stores/prospective'
import { usePermissionsStore } from '@/stores/permissions'
import { useToastStore } from '@/stores/toast'
import type { ProspectiveMember, ProspectiveMemberInsert, ProspectStatus } from '@/types'

const auth = useAuthStore()
const prospective = useProspectiveStore()
const permissions = usePermissionsStore()
const toast = useToastStore()

const canManage = computed(() => permissions.can('prospective_members', 'edit'))

const NAME_MAX_LENGTH = 100

const STATUS_LABEL: Record<ProspectStatus, string> = {
  not_invited: '尚未邀請',
  invited: '已邀請',
  joined: '已入社',
  no_reply: '無回應',
  declined: '婉拒',
}

const STATUS_BADGE: Record<ProspectStatus, string> = {
  not_invited: 'b-g',
  invited: 'b-n',
  joined: 'b-gr',
  no_reply: 'b-y',
  declined: 'b-r',
}

// 還在追蹤中的定義：非已入社/婉拒。「追蹤中」統計卡跟「需跟進」判斷共用同一組排除規則，避免兩張卡邏輯不一致。
function isTracking(p: ProspectiveMember) {
  return p.status !== 'joined' && p.status !== 'declined'
}

const statusFilter = ref<ProspectStatus | 'all'>('all')
const keyword = ref('')

const filtered = computed(() => {
  let list = prospective.prospects
  if (statusFilter.value !== 'all') list = list.filter(p => p.status === statusFilter.value)
  const kw = keyword.value.trim().toLowerCase()
  if (kw) list = list.filter(p => p.name.toLowerCase().includes(kw) || (p.company ?? '').toLowerCase().includes(kw))
  return list
})

const totalCount = computed(() => prospective.prospects.filter(isTracking).length)
const invitedCount = computed(() => prospective.prospects.filter(p => p.status === 'invited').length)
const joinedCount = computed(() => prospective.prospects.filter(p => p.status === 'joined').length)
// 需跟進：還在追蹤中（非已入社/婉拒）且「追蹤日已超過30天」或「從未設定過追蹤日」
const needFollowUpCount = computed(() => {
  const now = Date.now()
  return prospective.prospects.filter(p => {
    if (!isTracking(p)) return false
    if (!p.follow_up_date) return true
    const days = (now - new Date(p.follow_up_date).getTime()) / 86400000
    return days > 30
  }).length
})

function followUpClass(dateStr: string | null) {
  if (!dateStr) return ''
  const days = (new Date(dateStr).getTime() - Date.now()) / 86400000
  if (days < 0) return 'color:var(--red); font-weight:600;'
  if (days <= 7) return 'color:#b07000; font-weight:600;'
  return ''
}

const showModal = ref(false)
const editing = ref<ProspectiveMember | null>(null)
const form = ref<ProspectiveMemberInsert>(emptyForm())
const formError = ref('')
const saving = ref(false)

// 下次追蹤日期早於邀請日期時的軟性提示，不阻擋儲存
const dateOrderWarning = computed(() => {
  if (!form.value.invited_date || !form.value.follow_up_date) return ''
  if (form.value.follow_up_date < form.value.invited_date) return '下次追蹤日期早於邀請日期，請確認是否填反了。'
  return ''
})

function emptyForm(): ProspectiveMemberInsert {
  return {
    club_id: auth.clubId ?? '',
    name: '',
    job_title: null,
    company: null,
    ref_name: null,
    ref_member_id: null,
    invited_date: null,
    follow_up_date: null,
    status: 'not_invited',
    owner_name: null,
    note: null,
  }
}

function openAdd() {
  editing.value = null
  form.value = emptyForm()
  formError.value = ''
  showModal.value = true
}

function openEdit(p: ProspectiveMember) {
  editing.value = p
  form.value = { ...p }
  formError.value = ''
  showModal.value = true
}

// 狀態改成「已邀請」時，若邀請日期還沒填，帶入今天，減少漏填
function onStatusChange() {
  if (form.value.status === 'invited' && !form.value.invited_date) {
    form.value.invited_date = new Date().toISOString().slice(0, 10)
  }
}

async function save() {
  if (!form.value.name.trim()) {
    formError.value = '請輸入姓名'
    return
  }
  saving.value = true
  const payload: ProspectiveMemberInsert = {
    ...form.value,
    name: form.value.name.trim(),
    invited_date: form.value.invited_date || null,
    follow_up_date: form.value.follow_up_date || null,
  }
  const { error } = editing.value
    ? await prospective.update(editing.value.id, payload)
    : await prospective.insert(payload)
  saving.value = false
  if (error) {
    formError.value = '儲存失敗：' + error.message
    return
  }
  showModal.value = false
  toast.show(editing.value ? '已更新' : '已新增')
  await prospective.fetchAll(auth.clubId)
}

async function remove(p: ProspectiveMember) {
  if (!confirm(`確定刪除「${p.name}」這筆潛在社友追蹤紀錄？此動作無法復原。`)) return
  const { error } = await prospective.remove(p.id)
  if (error) { toast.show('刪除失敗：' + error.message, 'err'); return }
  toast.show('已刪除')
  await prospective.fetchAll(auth.clubId)
}

onMounted(() => {
  prospective.fetchAll(auth.clubId)
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>潛在社友追蹤</h1>
      <button v-if="canManage" class="btn btn-gold" @click="openAdd">+ 新增潛在社友</button>
    </div>

    <div class="summary-grid">
      <div class="tw summary-card">
        <div class="summary-label">追蹤中</div>
        <div class="summary-value">{{ totalCount }}</div>
      </div>
      <div class="tw summary-card">
        <div class="summary-label">已邀請</div>
        <div class="summary-value">{{ invitedCount }}</div>
      </div>
      <div class="tw summary-card">
        <div class="summary-label">已入社</div>
        <div class="summary-value">{{ joinedCount }}</div>
      </div>
      <div class="tw summary-card">
        <div class="summary-label">需跟進</div>
        <div class="summary-value" :style="needFollowUpCount > 0 ? 'color:var(--red)' : ''">{{ needFollowUpCount }}</div>
        <div class="summary-sub">超30天未聯繫或從未排定追蹤日</div>
      </div>
    </div>

    <div style="display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap;">
      <input v-model="keyword" class="fi" style="max-width:220px;" placeholder="搜尋姓名／公司" />
      <select v-model="statusFilter" class="fi" style="max-width:160px;">
        <option value="all">全部狀態</option>
        <option v-for="(label, key) in STATUS_LABEL" :key="key" :value="key">{{ label }}</option>
      </select>
    </div>

    <div class="tw" style="overflow-x:auto;">
      <table class="card-table">
        <thead class="th">
          <tr>
            <th>姓名</th>
            <th>職稱</th>
            <th>公司</th>
            <th>推薦人</th>
            <th>邀請日</th>
            <th>追蹤日</th>
            <th>狀態</th>
            <th>負責人</th>
            <th v-if="canManage"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in filtered" :key="p.id">
            <td data-label="姓名" class="ellipsis-cell" :title="p.name">{{ p.name }}</td>
            <td data-label="職稱">{{ p.job_title || '-' }}</td>
            <td data-label="公司">{{ p.company || '-' }}</td>
            <td data-label="推薦人">{{ p.ref_name || '-' }}</td>
            <td data-label="邀請日">{{ p.invited_date || '-' }}</td>
            <td data-label="追蹤日" :style="followUpClass(p.follow_up_date)">{{ p.follow_up_date || '-' }}</td>
            <td data-label="狀態"><span class="bdg" :class="STATUS_BADGE[p.status]">{{ STATUS_LABEL[p.status] }}</span></td>
            <td data-label="負責人">{{ p.owner_name || '-' }}</td>
            <td v-if="canManage">
              <div style="display:flex; gap:6px;">
                <button class="btn btn-g btn-sm" @click="openEdit(p)">編輯</button>
                <button class="btn btn-red btn-sm" @click="remove(p)">刪除</button>
              </div>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td :colspan="canManage ? 9 : 8" style="text-align:center; color:var(--muted);">查無資料</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="mo" @click.self="showModal = false">
      <div class="mb">
        <div class="mb-h">
          <h3>{{ editing ? '編輯潛在社友' : '新增潛在社友' }}</h3>
          <button class="mb-close" @click="showModal = false">×</button>
        </div>
        <form @submit.prevent="save">
          <div class="mb-body">
            <p v-if="formError" style="color:var(--red); font-size:12px; margin-bottom:10px;">{{ formError }}</p>
            <div>
              <label class="fl" for="prospect-name">姓名 *</label>
              <input id="prospect-name" v-model="form.name" class="fi" required :maxlength="NAME_MAX_LENGTH" />
            </div>
            <div>
              <label class="fl" for="prospect-job-title">職稱</label>
              <input id="prospect-job-title" v-model="form.job_title" class="fi" />
            </div>
            <div>
              <label class="fl" for="prospect-company">公司</label>
              <input id="prospect-company" v-model="form.company" class="fi" />
            </div>
            <div>
              <label class="fl" for="prospect-ref-name">推薦人</label>
              <input id="prospect-ref-name" v-model="form.ref_name" class="fi" />
            </div>
            <div>
              <label class="fl" for="prospect-invited-date">邀請日期</label>
              <input id="prospect-invited-date" v-model="form.invited_date" type="date" class="fi" />
            </div>
            <div>
              <label class="fl" for="prospect-follow-up-date">下次追蹤日期</label>
              <input id="prospect-follow-up-date" v-model="form.follow_up_date" type="date" class="fi" />
            </div>
            <p v-if="dateOrderWarning" style="color:#b07000; font-size:12px; margin:-4px 0 0;">{{ dateOrderWarning }}</p>
            <div>
              <label class="fl" for="prospect-status">狀態</label>
              <select id="prospect-status" v-model="form.status" class="fi" @change="onStatusChange">
                <option v-for="(label, key) in STATUS_LABEL" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>
            <div>
              <label class="fl" for="prospect-owner">負責追蹤人</label>
              <input id="prospect-owner" v-model="form.owner_name" class="fi" />
            </div>
            <div>
              <label class="fl" for="prospect-note">備註</label>
              <textarea id="prospect-note" v-model="form.note" class="fi" style="min-height:70px;"></textarea>
            </div>
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
  margin-top: 4px;
  font-size: 11px;
  color: var(--muted);
}

.ellipsis-cell {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
