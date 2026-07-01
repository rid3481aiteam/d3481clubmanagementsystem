<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMeetingsStore } from '@/stores/meetings'
import type { Meeting, MeetingInsert } from '@/types'

const auth = useAuthStore()
const meetings = useMeetingsStore()

const canManage = computed(() =>
  auth.role === 'club_admin' || auth.role === 'club_secretary'
)

const showModal = ref(false)
const editing = ref<Meeting | null>(null)
const form = ref<MeetingInsert>(emptyForm())

function emptyForm(): MeetingInsert {
  return {
    club_id: auth.clubId ?? '',
    date: '',
    session_no: null,
    title: null,
    speaker_name: null,
    speaker_title: null,
    speaker_email: null,
    speaker_phone: null,
    venue: null,
    note: null,
  }
}

function openAdd() {
  editing.value = null
  form.value = emptyForm()
  showModal.value = true
}

function openEdit(m: Meeting) {
  editing.value = m
  form.value = { ...m }
  showModal.value = true
}

async function save() {
  if (!form.value.date) return
  if (editing.value) {
    await meetings.update(editing.value.id, form.value)
  } else {
    await meetings.insert(form.value)
  }
  showModal.value = false
  await meetings.fetchAll(auth.clubId)
}

onMounted(() => {
  meetings.fetchAll(auth.clubId)
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>例會管理</h1>
      <button v-if="canManage" class="btn btn-gold" @click="openAdd">+ 新增例會</button>
    </div>

    <div class="tw">
      <table>
        <thead class="th">
          <tr>
            <th>日期</th>
            <th>第幾次</th>
            <th>主題</th>
            <th>講者</th>
            <th>地點</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in meetings.meetings" :key="m.id">
            <td>{{ m.date }}</td>
            <td>{{ m.session_no ?? '-' }}</td>
            <td>{{ m.title || '-' }}</td>
            <td>{{ m.speaker_name || '-' }}</td>
            <td>{{ m.venue || '-' }}</td>
            <td style="display:flex; gap:6px;">
              <button v-if="canManage" class="btn btn-g btn-sm" @click="openEdit(m)">編輯</button>
              <RouterLink :to="`/meetings/${m.id}/attendance`" class="btn btn-g btn-sm">出席記錄</RouterLink>
            </td>
          </tr>
          <tr v-if="!meetings.meetings.length">
            <td colspan="6" style="text-align:center; color:var(--muted);">查無例會紀錄</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="mo" @click.self="showModal = false">
      <div class="mb">
        <div class="mb-h">
          <h3>{{ editing ? '編輯例會' : '新增例會' }}</h3>
          <button class="mb-close" @click="showModal = false">×</button>
        </div>
        <div class="mb-body">
          <div>
            <label class="fl">日期 *</label>
            <input v-model="form.date" type="date" class="fi" />
          </div>
          <div>
            <label class="fl">第幾次例會</label>
            <input v-model.number="form.session_no" type="number" class="fi" />
          </div>
          <div>
            <label class="fl">主題</label>
            <input v-model="form.title" class="fi" />
          </div>
          <div>
            <label class="fl">講者姓名</label>
            <input v-model="form.speaker_name" class="fi" />
          </div>
          <div>
            <label class="fl">講者職稱</label>
            <input v-model="form.speaker_title" class="fi" />
          </div>
          <div>
            <label class="fl">講者 Email</label>
            <input v-model="form.speaker_email" class="fi" />
          </div>
          <div>
            <label class="fl">講者電話</label>
            <input v-model="form.speaker_phone" class="fi" />
          </div>
          <div>
            <label class="fl">地點</label>
            <input v-model="form.venue" class="fi" />
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
