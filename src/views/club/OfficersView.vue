<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRosterStore } from '@/stores/roster'
import { useOfficersStore, currentYearTerm } from '@/stores/officers'
import type { ClubOfficerRole, RosterMember } from '@/types'

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

const ROLE_POSITION: Partial<Record<ClubOfficerRole, 'P' | 'PE' | 'VP' | 'S'>> = {
  president: 'P',
  president_elect: 'PE',
  vice_president: 'VP',
  secretary: 'S',
}
const ANNUAL_POSITIONS = new Set(['P', 'PE', 'VP', 'S'])

interface CommitteeDraft {
  key: string
  id: string | null
  committee_name: string
  name: string
}

const singleNames = ref<Record<string, string>>({})
const draftSingleNames = ref<Record<string, string>>({})
const draftCommitteeMembers = ref<CommitteeDraft[]>([])
const newCommitteeName = ref('')
const newMemberName = ref('')
const saving = ref(false)
const editing = ref(false)

const committeeMembers = computed(() => officers.list.filter(o => o.role === 'committee_member'))
const activeMembers = computed(() => roster.members.filter(m => m.is_active))
const activeMemberKeys = computed(() => activeMembers.value.map(memberValue))

function memberOptions(current: string) {
  if (current && !activeMemberKeys.value.includes(current)) return [current, ...activeMemberKeys.value]
  return activeMemberKeys.value
}

function memberValue(member: RosterMember) {
  return member.nick_name?.trim() || member.name
}

function findMember(value: string) {
  return roster.members.find(m => m.name === value || m.nick_name === value)
}

function memberOptionLabel(value: string) {
  const member = findMember(value)
  if (!member) return value
  const englishName = member.nick_name?.trim()
  if (!englishName) return member.name
  return member.name && member.name !== englishName ? `${englishName}（${member.name}）` : englishName
}

function memberDisplayName(value: string) {
  const member = findMember(value)
  return member?.nick_name?.trim() || member?.name || value
}

function startEdit() {
  draftSingleNames.value = { ...singleNames.value }
  draftCommitteeMembers.value = committeeMembers.value.map(m => ({
    key: m.id,
    id: m.id,
    committee_name: m.committee_name || '',
    name: m.name,
  }))
  newCommitteeName.value = ''
  newMemberName.value = ''
  editing.value = true
}

function cancelEdit() {
  draftSingleNames.value = {}
  draftCommitteeMembers.value = []
  newCommitteeName.value = ''
  newMemberName.value = ''
  editing.value = false
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
    const name = draftSingleNames.value[role]?.trim() ?? ''
    const existing = officers.list.find(o => o.role === role)
    if (!name) {
      if (existing) await officers.remove(existing.id)
      continue
    }
    if (existing) {
      if (existing.name !== name) {
        const { error } = await officers.update(existing.id, { name })
        if (error) {
          alert('儲存失敗：' + error.message)
          saving.value = false
          return
        }
      }
    } else {
      const { error } = await officers.insert({ club_id: auth.clubId, year_term: yearTerm.value, role, name, committee_name: null, note: null })
      if (error) {
        alert('儲存失敗：' + error.message)
        saving.value = false
        return
      }
    }
  }

  const keptCommitteeIds = new Set(draftCommitteeMembers.value.flatMap(m => (m.id ? [m.id] : [])))
  for (const existing of committeeMembers.value) {
    if (!keptCommitteeIds.has(existing.id)) await officers.remove(existing.id)
  }
  for (const draft of draftCommitteeMembers.value) {
    const payload = {
      club_id: auth.clubId,
      year_term: yearTerm.value,
      role: 'committee_member' as ClubOfficerRole,
      name: draft.name.trim(),
      committee_name: draft.committee_name.trim() || null,
      note: null,
    }
    if (!payload.name) continue
    if (draft.id) {
      const existing = committeeMembers.value.find(m => m.id === draft.id)
      if (existing && (existing.name !== payload.name || (existing.committee_name || '') !== (payload.committee_name || ''))) {
        const { error } = await officers.update(draft.id, payload)
        if (error) {
          alert('儲存失敗：' + error.message)
          saving.value = false
          return
        }
      }
    } else {
      const { error } = await officers.insert(payload)
      if (error) {
        alert('儲存失敗：' + error.message)
        saving.value = false
        return
      }
    }
  }

  await syncRosterAnnualPositions()
  saving.value = false
  editing.value = false
  await load()
}

async function syncRosterAnnualPositions() {
  const selected = new Map<string, 'P' | 'PE' | 'VP' | 'S'>()
  for (const { role } of SINGLE_ROLES) {
    const value = draftSingleNames.value[role]?.trim()
    const position = ROLE_POSITION[role]
    if (!value || !position) continue
    const member = findMember(value)
    if (member) selected.set(member.id, position)
  }

  for (const member of roster.members.filter(m => m.is_active)) {
    const nextPosition = selected.get(member.id)
    if (nextPosition) {
      if (member.club_position !== nextPosition) {
        const { error } = await roster.update(member.id, { club_position: nextPosition })
        if (error) alert(error.message)
      }
    } else if (ANNUAL_POSITIONS.has(member.club_position)) {
      const { error } = await roster.update(member.id, { club_position: '社友' })
      if (error) alert(error.message)
    }
  }
}

async function addCommitteeMember() {
  if (!auth.clubId || !editing.value || !newMemberName.value.trim()) return
  draftCommitteeMembers.value.push({
    key: `new-${Date.now()}-${newMemberName.value}`,
    id: null,
    name: newMemberName.value.trim(),
    committee_name: newCommitteeName.value.trim(),
  })
  newCommitteeName.value = ''
  newMemberName.value = ''
}

function removeCommitteeMember(key: string) {
  draftCommitteeMembers.value = draftCommitteeMembers.value.filter(m => m.key !== key)
}

onMounted(load)
watch(yearTerm, load)
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>社的年度成員</h1>
      <div style="display:flex; gap:8px; align-items:flex-end; flex-wrap:wrap;">
        <label class="fl" style="display:inline-block; margin-right:6px;">年度</label>
        <input v-model="yearTerm" class="fi" style="width:120px; display:inline-block;" :disabled="editing" placeholder="2025-2026" />
        <template v-if="canManage">
          <button v-if="!editing" class="btn btn-gold" @click="startEdit">編輯年度成員</button>
          <template v-else>
            <button class="btn btn-g btn-sm" :disabled="saving" @click="cancelEdit">取消</button>
            <button class="btn btn-gold" :disabled="saving" @click="saveSingleRoles">
              {{ saving ? '儲存中…' : '儲存年度成員' }}
            </button>
          </template>
        </template>
      </div>
    </div>

    <div class="tw" style="padding:20px; margin-bottom:20px;">
      <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:14px;">主要幹部</h2>
      <div style="display:flex; flex-direction:column; gap:12px; max-width:400px;">
        <div v-for="r in SINGLE_ROLES" :key="r.role">
          <label class="fl">{{ r.label }}</label>
          <select v-if="editing" v-model="draftSingleNames[r.role]" class="fi">
            <option value="">請選擇</option>
            <option v-for="n in memberOptions(draftSingleNames[r.role])" :key="n" :value="n">{{ memberOptionLabel(n) }}</option>
          </select>
          <div v-else class="readonly-field">{{ memberOptionLabel(singleNames[r.role] || '') || '-' }}</div>
        </div>
      </div>
    </div>

    <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">委員會成員</h2>
    <div class="tw">
      <table>
        <thead class="th">
          <tr>
            <th>委員會</th>
            <th>英文名稱</th>
            <th v-if="editing"></th>
          </tr>
        </thead>
        <tbody v-if="editing">
          <tr v-for="m in draftCommitteeMembers" :key="m.key">
            <td><input v-model="m.committee_name" class="fi table-input" /></td>
            <td>
              <select v-model="m.name" class="fi table-input">
                <option value="">請選擇</option>
                <option v-for="n in memberOptions(m.name)" :key="n" :value="n">{{ memberOptionLabel(n) }}</option>
              </select>
            </td>
            <td>
              <button class="btn btn-red btn-sm" @click="removeCommitteeMember(m.key)">移除</button>
            </td>
          </tr>
          <tr v-if="!draftCommitteeMembers.length">
            <td colspan="3" style="text-align:center; color:var(--muted);">尚無委員會成員資料</td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr v-for="m in committeeMembers" :key="m.id">
            <td>{{ m.committee_name || '-' }}</td>
            <td>{{ memberDisplayName(m.name) }}</td>
          </tr>
          <tr v-if="!committeeMembers.length">
            <td colspan="2" style="text-align:center; color:var(--muted);">尚無委員會成員資料</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="canManage && editing" style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap; align-items:flex-end;">
      <div>
        <label class="fl">委員會名稱</label>
        <input v-model="newCommitteeName" class="fi" placeholder="例如：會員發展委員會" style="min-width:200px;" />
      </div>
      <div>
        <label class="fl">英文名稱</label>
        <select v-model="newMemberName" class="fi" style="min-width:160px;">
          <option value="">請選擇</option>
          <option v-for="n in activeMemberKeys" :key="n" :value="n">{{ memberOptionLabel(n) }}</option>
        </select>
      </div>
      <button class="btn btn-g" @click="addCommitteeMember">+ 新增委員</button>
    </div>
  </div>
</template>

<style scoped>
.readonly-field {
  border: 1px solid var(--border);
  border-radius: var(--r);
  min-height: 36px;
  display: flex;
  align-items: center;
  padding: 8px 10px;
  background: #fff;
  color: var(--text);
}

.table-input {
  min-width: 180px;
}
</style>
