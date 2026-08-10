<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMemberCareStore } from '@/stores/memberCare'
import { useRosterStore } from '@/stores/roster'
import { useToastStore } from '@/stores/toast'
import type { MemberCare, CareType, RosterMember } from '@/types'

const auth = useAuthStore()
const care = useMemberCareStore()
const roster = useRosterStore()
const toast = useToastStore()

const canManage = computed(() => auth.role === 'club_admin' || auth.role === 'club_secretary')

const NOTE_MAX_LENGTH = 300
const CARE_TYPES: CareType[] = ['生日', '生病', '喜事', '喪事', '其他']
const TYPE_BADGE: Record<CareType, string> = {
  生日: 'b-gr',
  喜事: 'b-y',
  生病: 'b-r',
  喪事: 'b-n',
  其他: 'b-g',
}

// 比照全站既有慣例（AttendanceView/OfficersView）：有英文名時顯示「英文名（中文名）」
function memberLabel(m: Pick<RosterMember, 'name' | 'nick_name'>) {
  const en = m.nick_name?.trim()
  return en ? `${en}（${m.name}）` : m.name
}

const memberName = computed(() => {
  const map = new Map(roster.members.map(m => [m.id, memberLabel(m)]))
  return (id: string) => map.get(id) || '（社友已移除）'
})

const activeMembers = computed(() => roster.members.filter(m => m.is_active))

const typeFilter = ref<CareType | 'all'>('all')
const memberFilter = ref<string | 'all'>('all')
const filtered = computed(() => {
  let list = care.records
  if (typeFilter.value !== 'all') list = list.filter(r => r.care_type === typeFilter.value)
  if (memberFilter.value !== 'all') list = list.filter(r => r.member_id === memberFilter.value)
  return list
})

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

const showModal = ref(false)
const editing = ref<MemberCare | null>(null)
const form = ref({ member_id: '', care_type: '生日' as CareType, care_date: '', note: '' })
const formError = ref('')
const saving = ref(false)

// 日期比今天更早很多（例如打字誤植成幾十年前）的軟性提示，不阻擋儲存
const oldDateWarning = computed(() => {
  if (!form.value.care_date) return ''
  const years = (Date.now() - new Date(form.value.care_date).getTime()) / (365 * 86400000)
  return years > 20 ? '日期距今超過 20 年，請確認是否輸入錯誤。' : ''
})

function openAdd(memberId?: string) {
  editing.value = null
  form.value = { member_id: memberId || '', care_type: '生日', care_date: todayStr(), note: '' }
  formError.value = ''
  showModal.value = true
}

function openEdit(r: MemberCare) {
  editing.value = r
  form.value = { member_id: r.member_id, care_type: r.care_type, care_date: r.care_date, note: r.note || '' }
  formError.value = ''
  showModal.value = true
}

function findDuplicate() {
  return care.records.find(r =>
    r.id !== editing.value?.id &&
    r.member_id === form.value.member_id &&
    r.care_type === form.value.care_type &&
    r.care_date === form.value.care_date
  )
}

async function save() {
  if (!form.value.member_id) {
    formError.value = '請選擇社友'
    return
  }
  if (!form.value.care_date) {
    formError.value = '請填寫日期'
    return
  }
  if (form.value.care_date > todayStr()) {
    formError.value = '日期不得晚於今天'
    return
  }
  if (!auth.clubId) return

  const duplicate = findDuplicate()
  if (duplicate) {
    const name = memberName.value(form.value.member_id)
    if (!confirm(`${name} 已經有一筆「${form.value.care_type}」在 ${form.value.care_date} 的關懷紀錄，確定要再新增一筆嗎？`)) return
  }

  saving.value = true
  const payload = {
    member_id: form.value.member_id,
    care_type: form.value.care_type,
    care_date: form.value.care_date,
    note: form.value.note.trim() || null,
  }
  const { error } = editing.value
    ? await care.update(editing.value.id, auth.clubId, payload)
    : await care.insert({ ...payload, club_id: auth.clubId })
  saving.value = false
  if (error) {
    formError.value = '儲存失敗：' + error.message
    return
  }
  showModal.value = false
  toast.show(editing.value ? '已更新' : '已新增')
}

async function remove(r: MemberCare) {
  if (!auth.clubId) return
  if (!confirm(`確定刪除 ${memberName.value(r.member_id)} 這筆「${r.care_type}」關懷紀錄？`)) return
  const { error } = await care.remove(r.id, auth.clubId)
  if (error) { toast.show('刪除失敗：' + error.message, 'err'); return }
  toast.show('已刪除')
}

onMounted(() => {
  care.fetchAll(auth.clubId)
  roster.fetchAll(auth.clubId)
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>社友關懷</h1>
      <button v-if="canManage" class="btn btn-gold" @click="openAdd()">+ 新增關懷紀錄</button>
    </div>

    <div style="display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap;">
      <select v-model="memberFilter" class="fi" style="max-width:200px;">
        <option value="all">全部社友</option>
        <option v-for="m in activeMembers" :key="m.id" :value="m.id">{{ memberLabel(m) }}</option>
      </select>
      <select v-model="typeFilter" class="fi" style="max-width:160px;">
        <option value="all">全部類型</option>
        <option v-for="t in CARE_TYPES" :key="t" :value="t">{{ t }}</option>
      </select>
    </div>

    <div class="tw" style="overflow-x:auto;">
      <table class="card-table">
        <thead class="th">
          <tr>
            <th>姓名</th>
            <th>類型</th>
            <th>日期</th>
            <th>備註</th>
            <th v-if="canManage"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in filtered" :key="r.id">
            <td data-label="姓名">{{ memberName(r.member_id) }}</td>
            <td data-label="類型"><span class="bdg" :class="TYPE_BADGE[r.care_type]">{{ r.care_type }}</span></td>
            <td data-label="日期">{{ r.care_date }}</td>
            <td data-label="備註" class="ellipsis-cell" :title="r.note || ''">{{ r.note || '-' }}</td>
            <td v-if="canManage">
              <div style="display:flex; gap:6px;">
                <button class="btn btn-g btn-sm" @click="openEdit(r)">編輯</button>
                <button class="btn btn-red btn-sm" @click="remove(r)">刪除</button>
              </div>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td :colspan="canManage ? 5 : 4" style="text-align:center; color:var(--muted);">查無關懷紀錄</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="mo" @click.self="showModal = false">
      <div class="mb">
        <div class="mb-h">
          <h3>{{ editing ? '編輯關懷紀錄' : '+ 新增關懷紀錄' }}</h3>
          <button class="mb-close" @click="showModal = false">×</button>
        </div>
        <form @submit.prevent="save">
          <div class="mb-body">
            <p v-if="formError" style="color:var(--red); font-size:12px; margin-bottom:10px;">{{ formError }}</p>
            <div>
              <label class="fl" for="care-member">社友 *</label>
              <select id="care-member" v-model="form.member_id" class="fi" required>
                <option value="" disabled>請選擇</option>
                <option v-for="m in activeMembers" :key="m.id" :value="m.id">{{ memberLabel(m) }}</option>
              </select>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div>
                <label class="fl" for="care-type">類型</label>
                <select id="care-type" v-model="form.care_type" class="fi">
                  <option v-for="t in CARE_TYPES" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
              <div>
                <label class="fl" for="care-date">日期 *</label>
                <input id="care-date" v-model="form.care_date" type="date" class="fi" required :max="todayStr()" />
              </div>
            </div>
            <p v-if="oldDateWarning" style="color:#b07000; font-size:12px; margin:-4px 0 0;">{{ oldDateWarning }}</p>
            <div>
              <label class="fl" for="care-note">備註（選填）</label>
              <textarea id="care-note" v-model="form.note" class="fi" style="min-height:70px;" :maxlength="NOTE_MAX_LENGTH" placeholder="例：已致電關心，近況穩定"></textarea>
            </div>
          </div>
          <div class="mb-foot">
            <button type="button" class="btn btn-g" @click="showModal = false">取消</button>
            <button type="submit" class="btn btn-gold" :disabled="saving">{{ saving ? '儲存中…' : '💾 儲存' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ellipsis-cell {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
