<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMemberCareStore } from '@/stores/memberCare'
import { useRosterStore } from '@/stores/roster'
import type { MemberCare, CareType } from '@/types'

const auth = useAuthStore()
const care = useMemberCareStore()
const roster = useRosterStore()

const canManage = computed(() => auth.role === 'club_admin' || auth.role === 'club_secretary')

const CARE_TYPES: CareType[] = ['生日', '生病', '喜事', '喪事', '其他']
const TYPE_BADGE: Record<CareType, string> = {
  生日: 'b-gr',
  喜事: 'b-y',
  生病: 'b-r',
  喪事: 'b-n',
  其他: 'b-g',
}

const memberName = computed(() => {
  const map = new Map(roster.members.map(m => [m.id, m.name]))
  return (id: string) => map.get(id) || '（社友已移除）'
})

const activeMembers = computed(() => roster.members.filter(m => m.is_active))

const typeFilter = ref<CareType | 'all'>('all')
const filtered = computed(() => {
  if (typeFilter.value === 'all') return care.records
  return care.records.filter(r => r.care_type === typeFilter.value)
})

const showModal = ref(false)
const editing = ref<MemberCare | null>(null)
const form = ref({ member_id: '', care_type: '生日' as CareType, care_date: '', note: '' })
const formError = ref('')

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

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

async function save() {
  if (!form.value.member_id) {
    formError.value = '請選擇社友'
    return
  }
  if (!form.value.care_date) {
    formError.value = '請填寫日期'
    return
  }
  if (!auth.clubId) return
  const payload = {
    member_id: form.value.member_id,
    care_type: form.value.care_type,
    care_date: form.value.care_date,
    note: form.value.note.trim() || null,
  }
  const { error } = editing.value
    ? await care.update(editing.value.id, auth.clubId, payload)
    : await care.insert({ ...payload, club_id: auth.clubId })
  if (error) {
    formError.value = error.message
    return
  }
  showModal.value = false
}

async function remove() {
  if (!editing.value || !auth.clubId) return
  if (!confirm('確定刪除此關懷紀錄？')) return
  const { error } = await care.remove(editing.value.id, auth.clubId)
  if (error) {
    formError.value = error.message
    return
  }
  showModal.value = false
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

    <div style="margin-bottom:14px;">
      <select v-model="typeFilter" class="fi" style="max-width:160px;">
        <option value="all">全部類型</option>
        <option v-for="t in CARE_TYPES" :key="t" :value="t">{{ t }}</option>
      </select>
    </div>

    <div class="tw">
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
            <td data-label="備註">{{ r.note || '-' }}</td>
            <td v-if="canManage">
              <button class="btn btn-g btn-sm" @click="openEdit(r)">編輯</button>
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
        <div class="mb-body">
          <p v-if="formError" style="color:var(--red); font-size:12px; margin-bottom:10px;">{{ formError }}</p>
          <div>
            <label class="fl">社友 *</label>
            <select v-model="form.member_id" class="fi">
              <option value="" disabled>請選擇</option>
              <option v-for="m in activeMembers" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <label class="fl">類型</label>
              <select v-model="form.care_type" class="fi">
                <option v-for="t in CARE_TYPES" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
            <div>
              <label class="fl">日期 *</label>
              <input v-model="form.care_date" type="date" class="fi" />
            </div>
          </div>
          <div>
            <label class="fl">備註（選填）</label>
            <input v-model="form.note" class="fi" placeholder="例：已致電關心，近況穩定" />
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
