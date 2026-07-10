<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useProspectiveStore } from '@/stores/prospective'
import { usePermissionsStore } from '@/stores/permissions'
import type { ProspectiveMember, ProspectiveMemberInsert, ProspectStatus } from '@/types'

const auth = useAuthStore()
const prospective = useProspectiveStore()
const permissions = usePermissionsStore()

const canManage = computed(() => permissions.can('prospective_members', 'edit'))

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

const statusFilter = ref<ProspectStatus | 'all'>('all')

const filtered = computed(() => {
  if (statusFilter.value === 'all') return prospective.prospects
  return prospective.prospects.filter(p => p.status === statusFilter.value)
})

const totalCount = computed(() => prospective.prospects.length)
const invitedCount = computed(() => prospective.prospects.filter(p => p.status === 'invited').length)
const joinedCount = computed(() => prospective.prospects.filter(p => p.status === 'joined').length)
// 需跟進：還在追蹤中（非已入社/婉拒）且下次追蹤日期已經過期超過 30 天
const needFollowUpCount = computed(() => {
  const now = Date.now()
  return prospective.prospects.filter(p => {
    if (p.status === 'joined' || p.status === 'declined') return false
    if (!p.follow_up_date) return false
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
  showModal.value = true
}

function openEdit(p: ProspectiveMember) {
  editing.value = p
  form.value = { ...p }
  showModal.value = true
}

async function save() {
  if (!form.value.name.trim()) return
  const { error } = editing.value
    ? await prospective.update(editing.value.id, form.value)
    : await prospective.insert(form.value)
  if (error) {
    alert('儲存失敗：' + error.message)
    return
  }
  showModal.value = false
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
        <div class="summary-sub">超30天未聯繫</div>
      </div>
    </div>

    <div style="margin-bottom:14px;">
      <select v-model="statusFilter" class="fi" style="max-width:160px;">
        <option value="all">全部狀態</option>
        <option v-for="(label, key) in STATUS_LABEL" :key="key" :value="key">{{ label }}</option>
      </select>
    </div>

    <div class="tw">
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
            <td data-label="姓名">{{ p.name }}</td>
            <td data-label="職稱">{{ p.job_title || '-' }}</td>
            <td data-label="公司">{{ p.company || '-' }}</td>
            <td data-label="推薦人">{{ p.ref_name || '-' }}</td>
            <td data-label="邀請日">{{ p.invited_date || '-' }}</td>
            <td data-label="追蹤日" :style="followUpClass(p.follow_up_date)">{{ p.follow_up_date || '-' }}</td>
            <td data-label="狀態"><span class="bdg" :class="STATUS_BADGE[p.status]">{{ STATUS_LABEL[p.status] }}</span></td>
            <td data-label="負責人">{{ p.owner_name || '-' }}</td>
            <td v-if="canManage">
              <button class="btn btn-g btn-sm" @click="openEdit(p)">編輯</button>
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
        <div class="mb-body">
          <div>
            <label class="fl">姓名 *</label>
            <input v-model="form.name" class="fi" />
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
            <label class="fl">推薦人</label>
            <input v-model="form.ref_name" class="fi" />
          </div>
          <div>
            <label class="fl">邀請日期</label>
            <input v-model="form.invited_date" type="date" class="fi" />
          </div>
          <div>
            <label class="fl">下次追蹤日期</label>
            <input v-model="form.follow_up_date" type="date" class="fi" />
          </div>
          <div>
            <label class="fl">狀態</label>
            <select v-model="form.status" class="fi">
              <option v-for="(label, key) in STATUS_LABEL" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <div>
            <label class="fl">負責追蹤人</label>
            <input v-model="form.owner_name" class="fi" />
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
</style>
