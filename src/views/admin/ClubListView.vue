<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useClubStore } from '@/stores/club'
import type { Club } from '@/types'

const club = useClubStore()

const showModal = ref(false)
const editing = ref<Club | null>(null)
const form = ref<Partial<Club>>(emptyForm())

function emptyForm(): Partial<Club> {
  return {
    name: '', zone: '', pres_name: null, sec_name: null, email: null,
    phone: null, addr: null, freq: null, meeting_time: null,
    venue: null, venue_tel: null, note: null,
  }
}

function openAdd() {
  editing.value = null
  form.value = emptyForm()
  showModal.value = true
}

function openEdit(c: Club) {
  editing.value = c
  form.value = { ...c }
  showModal.value = true
}

async function save() {
  if (!form.value.name?.trim() || !form.value.zone?.trim()) return
  await club.upsertClub(editing.value ? { id: editing.value.id, ...form.value } : form.value)
  showModal.value = false
}

onMounted(() => {
  club.fetchAll()
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>社團總覽</h1>
      <button class="btn btn-gold" @click="openAdd">+ 新增社團</button>
    </div>

    <div class="tw">
      <table>
        <thead class="th">
          <tr>
            <th>社名</th>
            <th>分區</th>
            <th>社長</th>
            <th>執秘</th>
            <th>Email</th>
            <th>電話</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in club.allClubs" :key="c.id">
            <td>{{ c.name }}</td>
            <td>{{ c.zone }}</td>
            <td>{{ c.pres_name || '-' }}</td>
            <td>{{ c.sec_name || '-' }}</td>
            <td>{{ c.email || '-' }}</td>
            <td>{{ c.phone || '-' }}</td>
            <td style="display:flex; gap:6px;">
              <RouterLink :to="`/admin/clubs/${c.id}`" class="btn btn-g btn-sm">查看社員</RouterLink>
              <button class="btn btn-g btn-sm" @click="openEdit(c)">編輯</button>
            </td>
          </tr>
          <tr v-if="!club.allClubs.length">
            <td colspan="7" style="text-align:center; color:var(--muted);">尚無社團資料</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="mo" @click.self="showModal = false">
      <div class="mb">
        <div class="mb-h">
          <h3>{{ editing ? '編輯社團' : '新增社團' }}</h3>
          <button class="mb-close" @click="showModal = false">×</button>
        </div>
        <div class="mb-body">
          <div>
            <label class="fl">社名 *</label>
            <input v-model="form.name" class="fi" />
          </div>
          <div>
            <label class="fl">分區 *</label>
            <input v-model="form.zone" class="fi" placeholder="e.g. 第一分區" />
          </div>
          <div>
            <label class="fl">社長</label>
            <input v-model="form.pres_name" class="fi" />
          </div>
          <div>
            <label class="fl">執秘</label>
            <input v-model="form.sec_name" class="fi" />
          </div>
          <div>
            <label class="fl">Email</label>
            <input v-model="form.email" class="fi" />
          </div>
          <div>
            <label class="fl">電話</label>
            <input v-model="form.phone" class="fi" />
          </div>
          <div>
            <label class="fl">地址</label>
            <input v-model="form.addr" class="fi" />
          </div>
          <div>
            <label class="fl">例會頻率</label>
            <input v-model="form.freq" class="fi" placeholder="e.g. 每週三" />
          </div>
          <div>
            <label class="fl">例會時間</label>
            <input v-model="form.meeting_time" class="fi" placeholder="e.g. 12:00" />
          </div>
          <div>
            <label class="fl">地點</label>
            <input v-model="form.venue" class="fi" />
          </div>
          <div>
            <label class="fl">地點電話</label>
            <input v-model="form.venue_tel" class="fi" />
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
