<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClubStore } from '@/stores/club'
import type { Club } from '@/types'

const route = useRoute()
const router = useRouter()
const club = useClubStore()

const form = ref<Partial<Club>>({})
const saving = ref(false)

async function load() {
  const id = route.params.id as string
  await club.fetchCurrent(id)
  form.value = { ...club.current }
}

async function save() {
  if (!form.value.name?.trim() || !form.value.zone?.trim()) return
  saving.value = true
  const { error } = await club.upsertClub(form.value)
  saving.value = false
  if (error) { alert(error.message); return }
  router.push('/admin/clubs')
}

async function removeClub() {
  if (!club.current) return
  const { rosterCount, accountCount } = await club.checkDeletable(club.current.id)
  if (accountCount > 0) {
    alert(`「${club.current.name}」已有 ${accountCount} 個帳號，請先到「帳號邀請 / 管理」停用或刪除該社所有帳號，才能刪除社團。`)
    return
  }
  const warn = rosterCount > 0
    ? `「${club.current.name}」已有 ${rosterCount} 筆社友名冊資料，刪除社團會一併清除該社的名冊／例會／出席紀錄，且無法復原。`
    : `「${club.current.name}」目前沒有任何名冊資料。`
  if (!confirm(`${warn}\n\n確定要刪除這個社團嗎？`)) return
  const { error } = await club.deleteClub(club.current.id)
  if (error) { alert(error.message); return }
  router.push('/admin/clubs')
}

onMounted(load)
watch(() => route.params.id, load)
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>編輯社團｜{{ club.current?.name }}</h1>
      <RouterLink to="/admin/clubs" class="btn btn-g btn-sm">返回社團總覽</RouterLink>
    </div>

    <div class="tw" style="padding:20px; max-width:520px;">
      <div style="display:flex; flex-direction:column; gap:14px;">
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
          <label class="fl">社辦公室地址</label>
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
          <label class="fl">例會地點</label>
          <input v-model="form.venue" class="fi" />
        </div>
        <div>
          <label class="fl">例會地點電話</label>
          <input v-model="form.venue_tel" class="fi" />
        </div>
        <div>
          <label class="fl">備註</label>
          <input v-model="form.note" class="fi" />
        </div>
      </div>

      <div style="margin-top:20px;">
        <button class="btn btn-gold" :disabled="saving" @click="save">{{ saving ? '儲存中…' : '儲存' }}</button>
      </div>
    </div>

    <div class="tw" style="padding:20px; max-width:520px; margin-top:24px; border-color:rgba(176,48,48,.3);">
      <h3 style="font-size:14px; font-weight:700; color:var(--red); margin-bottom:8px;">刪除社團</h3>
      <p style="font-size:12px; color:var(--muted); margin-bottom:12px;">
        刪除前會自動檢查該社是否已有帳號或名冊資料。此動作無法復原。
      </p>
      <button class="btn btn-red" @click="removeClub">刪除這個社團</button>
    </div>
  </div>
</template>
