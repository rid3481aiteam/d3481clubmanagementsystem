<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRosterStore } from '@/stores/roster'
import { useOfficersStore, currentYearTerm } from '@/stores/officers'
import type { ClubOfficerRole } from '@/types'

const auth = useAuthStore()
const roster = useRosterStore()
const officers = useOfficersStore()

const canManage = computed(() => auth.role === 'club_admin' || auth.role === 'club_secretary')

const yearTerm = ref(currentYearTerm())

const SINGLE_ROLES: { role: ClubOfficerRole; label: string }[] = [
  { role: 'president', label: '社長' },
  { role: 'president_elect', label: '社長當選人' },
  { role: 'vice_president', label: '副社長' },
  { role: 'secretary', label: '秘書' },
]

const singleNames = ref<Record<string, string>>({})
const newCommitteeName = ref('')
const newMemberName = ref('')
const saving = ref(false)

const committeeMembers = computed(() => officers.list.filter(o => o.role === 'committee_member'))
const activeMemberNames = computed(() => roster.members.filter(m => m.is_active).map(m => m.name))

function memberOptions(current: string) {
  if (current && !activeMemberNames.value.includes(current)) return [current, ...activeMemberNames.value]
  return activeMemberNames.value
}

async function load() {
  if (!auth.clubId) return
  await roster.fetchAll(auth.clubId)
  await officers.fetchAll(auth.clubId, yearTerm.value)
  const map: Record<string, string> = {}
  for (const { role } of SINGLE_ROLES) {
    map[role] = officers.list.find(o => o.role === role)?.name ?? ''
  }
  singleNames.value = map
}

async function saveSingleRoles() {
  if (!auth.clubId) return
  saving.value = true
  for (const { role } of SINGLE_ROLES) {
    const name = singleNames.value[role]?.trim() ?? ''
    const existing = officers.list.find(o => o.role === role)
    if (!name) {
      if (existing) await officers.remove(existing.id)
      continue
    }
    if (existing) {
      if (existing.name !== name) await officers.update(existing.id, { name })
    } else {
      await officers.insert({ club_id: auth.clubId, year_term: yearTerm.value, role, name, committee_name: null, note: null })
    }
  }
  saving.value = false
  await load()
}

async function addCommitteeMember() {
  if (!auth.clubId || !newMemberName.value.trim()) return
  await officers.insert({
    club_id: auth.clubId,
    year_term: yearTerm.value,
    role: 'committee_member',
    name: newMemberName.value.trim(),
    committee_name: newCommitteeName.value.trim() || null,
    note: null,
  })
  newCommitteeName.value = ''
  newMemberName.value = ''
  await load()
}

async function removeCommitteeMember(id: string) {
  await officers.remove(id)
  await load()
}

onMounted(load)
watch(yearTerm, load)
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>社的年度成員</h1>
      <div>
        <label class="fl" style="display:inline-block; margin-right:6px;">年度</label>
        <input v-model="yearTerm" class="fi" style="width:120px; display:inline-block;" placeholder="2025-2026" />
      </div>
    </div>

    <div class="tw" style="padding:20px; margin-bottom:20px;">
      <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:14px;">主要幹部</h2>
      <div style="display:flex; flex-direction:column; gap:12px; max-width:400px;">
        <div v-for="r in SINGLE_ROLES" :key="r.role">
          <label class="fl">{{ r.label }}</label>
          <select v-model="singleNames[r.role]" class="fi" :disabled="!canManage">
            <option value="">請選擇</option>
            <option v-for="n in memberOptions(singleNames[r.role])" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>
      </div>
      <button v-if="canManage" class="btn btn-gold" style="margin-top:14px;" :disabled="saving" @click="saveSingleRoles">
        {{ saving ? '儲存中…' : '儲存主要幹部' }}
      </button>
    </div>

    <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">委員會成員</h2>
    <div class="tw">
      <table>
        <thead class="th">
          <tr>
            <th>委員會</th>
            <th>姓名</th>
            <th v-if="canManage"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in committeeMembers" :key="m.id">
            <td>{{ m.committee_name || '-' }}</td>
            <td>{{ m.name }}</td>
            <td v-if="canManage">
              <button class="btn btn-red btn-sm" @click="removeCommitteeMember(m.id)">移除</button>
            </td>
          </tr>
          <tr v-if="!committeeMembers.length">
            <td :colspan="canManage ? 3 : 2" style="text-align:center; color:var(--muted);">尚無委員會成員資料</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="canManage" style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap; align-items:flex-end;">
      <div>
        <label class="fl">委員會名稱</label>
        <input v-model="newCommitteeName" class="fi" placeholder="例如：會員發展委員會" style="min-width:200px;" />
      </div>
      <div>
        <label class="fl">姓名</label>
        <select v-model="newMemberName" class="fi" style="min-width:160px;">
          <option value="">請選擇</option>
          <option v-for="n in activeMemberNames" :key="n" :value="n">{{ n }}</option>
        </select>
      </div>
      <button class="btn btn-g" @click="addCommitteeMember">+ 新增委員</button>
    </div>
  </div>
</template>
