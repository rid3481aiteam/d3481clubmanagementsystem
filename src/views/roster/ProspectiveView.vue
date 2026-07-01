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
  if (editing.value) {
    await prospective.update(editing.value.id, form.value)
  } else {
    await prospective.insert(form.value)
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

    <div style="margin-bottom:14px;">
      <select v-model="statusFilter" class="fi" style="max-width:160px;">
        <option value="all">全部狀態</option>
        <option v-for="(label, key) in STATUS_LABEL" :key="key" :value="key">{{ label }}</option>
      </select>
    </div>

    <div class="tw">
      <table>
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
            <td>{{ p.name }}</td>
            <td>{{ p.job_title || '-' }}</td>
            <td>{{ p.company || '-' }}</td>
            <td>{{ p.ref_name || '-' }}</td>
            <td>{{ p.invited_date || '-' }}</td>
            <td :style="followUpClass(p.follow_up_date)">{{ p.follow_up_date || '-' }}</td>
            <td><span class="bdg" :class="STATUS_BADGE[p.status]">{{ STATUS_LABEL[p.status] }}</span></td>
            <td>{{ p.owner_name || '-' }}</td>
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
