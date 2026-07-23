<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRosterStore } from '@/stores/roster'
import { useOfficersStore, currentYearTerm } from '@/stores/officers'
import type { ClubOfficer, ClubOfficerRole, RosterMember } from '@/types'

const auth = useAuthStore()
const roster = useRosterStore()
const officers = useOfficersStore()

const canManage = computed(() => auth.role === 'club_admin' || auth.role === 'club_secretary')

const yearTerm = ref(currentYearTerm())
const availableYearTerms = ref<string[]>([])
const yearTermOptions = computed(() => {
  const set = new Set(availableYearTerms.value)
  set.add(currentYearTerm())
  set.add(yearTerm.value)
  return [...set].sort((a, b) => b.localeCompare(a))
})

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
  note: string
}

const POSITION_PRESETS = ['主委', '副主委', '委員', '總幹事', '執行長', '顧問', '司儀', '召集人']

function notePriority(note: string): number {
  if (note === '主委') return 0
  if (note === '副主委') return 1
  return 2
}

const singleNames = ref<Record<string, string>>({})
const draftSingleNames = ref<Record<string, string>>({})
const draftCommitteeMembers = ref<CommitteeDraft[]>([])
const newCommitteeName = ref('')
const newMemberNote = ref('委員')
const newMemberValues = ref<string[]>([])
const draftPrimaryOfficers = ref<CommitteeDraft[]>([])
const newPrimaryPositionName = ref('')
const newPrimaryOfficerNote = ref('')
const newPrimaryOfficerValues = ref<string[]>([])
const saving = ref(false)
const editing = ref(false)

const committeeMembers = computed(() => officers.list.filter(o => o.role === 'committee_member'))
const primaryOfficerEntries = computed(() => officers.list.filter(o => o.role === 'primary_officer'))
const activeMembers = computed(() => roster.members.filter(m => m.is_active))
const activeMemberKeys = computed(() => activeMembers.value.map(memberValue))

function collectGroupNames(entries: ClubOfficer[], drafts: CommitteeDraft[]) {
  const names = new Set<string>()
  for (const m of entries) if (m.committee_name) names.add(m.committee_name)
  for (const d of drafts) if (d.committee_name) names.add(d.committee_name)
  return [...names].sort((a, b) => a.localeCompare(b, 'zh-Hant'))
}

const existingCommitteeNames = computed(() => collectGroupNames(committeeMembers.value, draftCommitteeMembers.value))
const existingPrimaryPositionNames = computed(() => collectGroupNames(primaryOfficerEntries.value, draftPrimaryOfficers.value))

interface OfficerGroup {
  name: string
  members: ClubOfficer[]
}

function groupByName(entries: ClubOfficer[]): OfficerGroup[] {
  const map = new Map<string, ClubOfficer[]>()
  for (const m of entries) {
    const key = m.committee_name || '未分類'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(m)
  }
  return [...map.entries()]
    .map(([name, members]) => ({
      name,
      members: [...members].sort((a, b) => notePriority(a.note || '') - notePriority(b.note || '')),
    }))
    // 按名稱排序，讓開頭相同的職位/委員會（例如「財務」「財務助理」）排在一起
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'))
}

const committeeGroups = computed(() => groupByName(committeeMembers.value))
const primaryOfficerGroups = computed(() => groupByName(primaryOfficerEntries.value))

function useGroupExpansion(getNames: () => string[]) {
  const expanded = ref<Set<string>>(new Set())
  return {
    isExpanded: (name: string) => expanded.value.has(name),
    toggle: (name: string) => {
      const next = new Set(expanded.value)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      expanded.value = next
    },
    expandAll: () => { expanded.value = new Set(getNames()) },
    collapseAll: () => { expanded.value = new Set() },
  }
}

const committeeExpansion = useGroupExpansion(() => committeeGroups.value.map(g => g.name))

function formatGroupMembers(members: ClubOfficer[]): string {
  return members
    .map(m => memberDisplayName(m.name) + (m.note ? `（${m.note}）` : ''))
    .join('、')
}

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

function toDraft(m: ClubOfficer): CommitteeDraft {
  return { key: m.id, id: m.id, committee_name: m.committee_name || '', name: m.name, note: m.note || '' }
}

function startEdit() {
  draftSingleNames.value = { ...singleNames.value }
  draftCommitteeMembers.value = committeeMembers.value.map(toDraft)
  draftPrimaryOfficers.value = primaryOfficerEntries.value.map(toDraft)
  newCommitteeName.value = ''
  newMemberNote.value = '委員'
  newMemberValues.value = []
  newPrimaryPositionName.value = ''
  newPrimaryOfficerNote.value = ''
  newPrimaryOfficerValues.value = []
  editing.value = true
}

function cancelEdit() {
  draftSingleNames.value = {}
  draftCommitteeMembers.value = []
  draftPrimaryOfficers.value = []
  newCommitteeName.value = ''
  newMemberNote.value = '委員'
  newMemberValues.value = []
  newPrimaryPositionName.value = ''
  newPrimaryOfficerNote.value = ''
  newPrimaryOfficerValues.value = []
  editing.value = false
}

async function load() {
  if (!auth.clubId) return
  await roster.fetchAll(auth.clubId)
  await officers.fetchAll(auth.clubId, yearTerm.value)
  availableYearTerms.value = await officers.fetchYearTerms(auth.clubId)
  const map: Record<string, string> = {}
  for (const { role } of SINGLE_ROLES) {
    map[role] = officers.list.find(o => o.role === role)?.name ?? ''
  }
  singleNames.value = map
  committeeExpansion.collapseAll()
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

  const committeeOk = await saveOfficerGroup('committee_member', draftCommitteeMembers.value, committeeMembers.value)
  if (!committeeOk) {
    saving.value = false
    return
  }
  const primaryOk = await saveOfficerGroup('primary_officer', draftPrimaryOfficers.value, primaryOfficerEntries.value)
  if (!primaryOk) {
    saving.value = false
    return
  }

  await syncRosterAnnualPositions()
  saving.value = false
  editing.value = false
  await load()
}

async function saveOfficerGroup(role: ClubOfficerRole, drafts: CommitteeDraft[], existingEntries: ClubOfficer[]): Promise<boolean> {
  if (!auth.clubId) return false
  const keptIds = new Set(drafts.flatMap(m => (m.id ? [m.id] : [])))
  for (const existing of existingEntries) {
    if (!keptIds.has(existing.id)) await officers.remove(existing.id)
  }
  for (const draft of drafts) {
    const payload = {
      club_id: auth.clubId,
      year_term: yearTerm.value,
      role,
      name: draft.name.trim(),
      committee_name: draft.committee_name.trim() || null,
      note: draft.note.trim() || null,
    }
    if (!payload.name) continue
    if (draft.id) {
      const existing = existingEntries.find(m => m.id === draft.id)
      if (existing && (existing.name !== payload.name || (existing.committee_name || '') !== (payload.committee_name || '') || (existing.note || '') !== (payload.note || ''))) {
        const { error } = await officers.update(draft.id, payload)
        if (error) {
          alert('儲存失敗：' + error.message)
          return false
        }
      }
    } else {
      const { error } = await officers.insert(payload)
      if (error) {
        alert('儲存失敗：' + error.message)
        return false
      }
    }
  }
  return true
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

function addCommitteeMembers() {
  if (!editing.value || !newCommitteeName.value.trim() || !newMemberValues.value.length) return
  const committeeName = newCommitteeName.value.trim()
  const note = newMemberNote.value.trim() || '委員'
  for (const value of newMemberValues.value) {
    draftCommitteeMembers.value.push({
      key: `new-${Date.now()}-${value}-${Math.random().toString(36).slice(2, 7)}`,
      id: null,
      name: value,
      committee_name: committeeName,
      note,
    })
  }
  newMemberValues.value = []
  newCommitteeName.value = ''
  newMemberNote.value = '委員'
}

function removeCommitteeMember(key: string) {
  draftCommitteeMembers.value = draftCommitteeMembers.value.filter(m => m.key !== key)
}

function addPrimaryOfficers() {
  if (!editing.value || !newPrimaryPositionName.value.trim() || !newPrimaryOfficerValues.value.length) return
  const positionName = newPrimaryPositionName.value.trim()
  const note = newPrimaryOfficerNote.value.trim()
  for (const value of newPrimaryOfficerValues.value) {
    draftPrimaryOfficers.value.push({
      key: `new-${Date.now()}-${value}-${Math.random().toString(36).slice(2, 7)}`,
      id: null,
      name: value,
      committee_name: positionName,
      note,
    })
  }
  newPrimaryOfficerValues.value = []
  newPrimaryPositionName.value = ''
  newPrimaryOfficerNote.value = ''
}

function removePrimaryOfficer(key: string) {
  draftPrimaryOfficers.value = draftPrimaryOfficers.value.filter(m => m.key !== key)
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
        <select v-model="yearTerm" class="fi" style="width:170px; display:inline-block;" :disabled="editing">
          <option v-for="t in yearTermOptions" :key="t" :value="t">{{ t }}{{ t === currentYearTerm() ? '（本年度）' : '' }}</option>
        </select>
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

    <datalist id="committee-name-options">
      <option v-for="n in existingCommitteeNames" :key="n" :value="n" />
    </datalist>
    <datalist id="primary-position-options">
      <option v-for="n in existingPrimaryPositionNames" :key="n" :value="n" />
    </datalist>
    <datalist id="position-presets">
      <option v-for="p in POSITION_PRESETS" :key="p" :value="p" />
    </datalist>

    <div class="tw" style="padding:20px; margin-bottom:20px;">
      <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:14px;">主要幹部</h2>
      <div style="display:flex; flex-direction:column; gap:12px; max-width:480px;">
        <div v-for="r in SINGLE_ROLES" :key="r.role">
          <label class="fl">{{ r.label }}</label>
          <select v-if="editing" v-model="draftSingleNames[r.role]" class="fi">
            <option value="">請選擇</option>
            <option v-for="n in memberOptions(draftSingleNames[r.role])" :key="n" :value="n">{{ memberOptionLabel(n) }}</option>
          </select>
          <div v-else class="readonly-field">{{ memberOptionLabel(singleNames[r.role] || '') || '-' }}</div>
        </div>

        <template v-if="!editing">
          <div v-for="g in primaryOfficerGroups" :key="g.name">
            <label class="fl">{{ g.name }}</label>
            <div class="readonly-field">{{ formatGroupMembers(g.members) }}</div>
          </div>
        </template>
      </div>

      <template v-if="editing">
        <table class="card-table" style="margin-top:20px;">
          <thead class="th">
            <tr>
              <th>職位名稱</th>
              <th>備註</th>
              <th>英文名稱</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in draftPrimaryOfficers" :key="m.key">
              <td data-label="職位名稱"><input v-model="m.committee_name" list="primary-position-options" class="fi table-input" placeholder="例如：財務、糾察、理事" /></td>
              <td data-label="備註"><input v-model="m.note" list="position-presets" class="fi table-input" placeholder="選填，例如：助理" /></td>
              <td data-label="英文名稱">
                <select v-model="m.name" class="fi table-input">
                  <option value="">請選擇</option>
                  <option v-for="n in memberOptions(m.name)" :key="n" :value="n">{{ memberOptionLabel(n) }}</option>
                </select>
              </td>
              <td>
                <button class="btn btn-red btn-sm" @click="removePrimaryOfficer(m.key)">移除</button>
              </td>
            </tr>
            <tr v-if="!draftPrimaryOfficers.length">
              <td colspan="4" style="text-align:center; color:var(--muted);">尚無其他主要幹部資料</td>
            </tr>
          </tbody>
        </table>

        <div v-if="canManage" style="margin-top:16px; padding-top:16px; border-top:1px solid var(--border);">
          <label class="fl" style="margin-bottom:8px; display:block;">新增其他主要幹部</label>
          <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end; margin-bottom:12px;">
            <div>
              <label class="fl">職位名稱</label>
              <input v-model="newPrimaryPositionName" class="fi" list="primary-position-options" placeholder="例如：財務、糾察、理事" style="min-width:200px;" />
            </div>
            <div>
              <label class="fl">備註</label>
              <input v-model="newPrimaryOfficerNote" class="fi" list="position-presets" placeholder="選填" style="width:120px;" />
            </div>
          </div>
          <label class="fl">勾選要加入這個職位的成員（可多選）</label>
          <div style="max-height:180px; overflow-y:auto; display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:6px; margin:8px 0 12px; border:1px solid var(--border); border-radius:var(--r); padding:10px;">
            <label v-for="n in activeMemberKeys" :key="n" style="display:flex; align-items:center; gap:6px; font-size:13px;">
              <input type="checkbox" :value="n" v-model="newPrimaryOfficerValues" />
              {{ memberOptionLabel(n) }}
            </label>
          </div>
          <button class="btn btn-g" :disabled="!newPrimaryPositionName.trim() || !newPrimaryOfficerValues.length" @click="addPrimaryOfficers">
            + 加入所選成員（{{ newPrimaryOfficerValues.length }}）
          </button>
        </div>
      </template>
    </div>

    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
      <h2 style="font-size:14px; font-weight:700; color:var(--navy);">委員會成員</h2>
      <div v-if="!editing && committeeGroups.length" style="display:flex; gap:8px;">
        <button class="btn btn-g btn-sm" @click="committeeExpansion.expandAll">全部展開</button>
        <button class="btn btn-g btn-sm" @click="committeeExpansion.collapseAll">全部收合</button>
      </div>
    </div>
    <div class="tw">
      <table class="card-table">
        <thead class="th">
          <tr v-if="editing">
            <th>委員會</th>
            <th>職稱</th>
            <th>英文名稱</th>
            <th></th>
          </tr>
          <tr v-else>
            <th>職稱</th>
            <th>英文名稱</th>
          </tr>
        </thead>
        <tbody v-if="editing">
          <tr v-for="m in draftCommitteeMembers" :key="m.key">
            <td data-label="委員會"><input v-model="m.committee_name" list="committee-name-options" class="fi table-input" /></td>
            <td data-label="職稱"><input v-model="m.note" list="position-presets" class="fi table-input" placeholder="委員" /></td>
            <td data-label="英文名稱">
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
            <td colspan="4" style="text-align:center; color:var(--muted);">尚無委員會成員資料</td>
          </tr>
        </tbody>
        <template v-else>
          <tbody v-for="g in committeeGroups" :key="g.name">
            <tr class="zone-row" @click="committeeExpansion.toggle(g.name)">
              <td colspan="2">
                <span class="zone-chevron">{{ committeeExpansion.isExpanded(g.name) ? '▾' : '▸' }}</span>
                <strong>{{ g.name }}</strong>
                <span style="color:var(--muted); font-weight:400;">（{{ g.members.length }} 人）</span>
              </td>
            </tr>
            <template v-if="committeeExpansion.isExpanded(g.name)">
              <tr v-for="m in g.members" :key="m.id">
                <td data-label="職稱">
                  <span class="bdg" :class="m.note === '主委' ? 'b-y' : m.note === '副主委' ? 'b-n' : 'b-g'">{{ m.note || '委員' }}</span>
                </td>
                <td data-label="英文名稱">{{ memberDisplayName(m.name) }}</td>
              </tr>
            </template>
          </tbody>
          <tbody v-if="!committeeGroups.length">
            <tr>
              <td colspan="2" style="text-align:center; color:var(--muted);">尚無委員會成員資料</td>
            </tr>
          </tbody>
        </template>
      </table>
    </div>

    <div v-if="canManage && editing" class="tw" style="padding:16px 20px; margin-top:14px;">
      <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:10px;">新增委員會成員</h2>
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end; margin-bottom:12px;">
        <div>
          <label class="fl">委員會名稱</label>
          <input v-model="newCommitteeName" class="fi" list="committee-name-options" placeholder="例如：會員發展委員會" style="min-width:200px;" />
        </div>
        <div>
          <label class="fl">職稱</label>
          <input v-model="newMemberNote" class="fi" list="position-presets" style="width:120px;" />
        </div>
      </div>
      <label class="fl">勾選要加入這個委員會的成員（可多選）</label>
      <div style="max-height:180px; overflow-y:auto; display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:6px; margin:8px 0 12px; border:1px solid var(--border); border-radius:var(--r); padding:10px;">
        <label v-for="n in activeMemberKeys" :key="n" style="display:flex; align-items:center; gap:6px; font-size:13px;">
          <input type="checkbox" :value="n" v-model="newMemberValues" />
          {{ memberOptionLabel(n) }}
        </label>
      </div>
      <button class="btn btn-g" :disabled="!newCommitteeName.trim() || !newMemberValues.length" @click="addCommitteeMembers">
        + 加入所選成員（{{ newMemberValues.length }}）
      </button>
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

.zone-row {
  cursor: pointer;
  background: var(--gold-p);
}
.zone-row:hover td {
  background: var(--gold-p);
}
.zone-row td {
  font-size: 13px;
  color: var(--navy);
  padding: 8px 14px;
}
.zone-chevron {
  display: inline-block;
  width: 14px;
  color: var(--muted);
}
</style>
