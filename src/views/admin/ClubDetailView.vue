<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useRosterStore } from '@/stores/roster'
import type { Club } from '@/types'

const route = useRoute()
const roster = useRosterStore()
const club = ref<Club | null>(null)

async function load() {
  const id = route.params.id as string
  const { data } = await supabase.from('clubs').select('*').eq('id', id).single()
  club.value = data
  await roster.fetchAll(id)
}

onMounted(load)
watch(() => route.params.id, load)
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>{{ club?.name ?? '社團' }}｜社員名單</h1>
      <RouterLink to="/admin/clubs" class="btn btn-g btn-sm">返回社團總覽</RouterLink>
    </div>

    <div v-if="club" style="display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap;">
      <span class="bdg b-n">{{ club.zone }}</span>
      <span class="bdg b-g" v-if="club.pres_name">社長 {{ club.pres_name }}</span>
      <span class="bdg b-g" v-if="club.sec_name">執秘 {{ club.sec_name }}</span>
    </div>

    <div class="tw">
      <table>
        <thead class="th">
          <tr>
            <th>姓名</th>
            <th>職稱</th>
            <th>公司</th>
            <th>電話</th>
            <th>Email</th>
            <th>入社日期</th>
            <th>狀態</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in roster.members" :key="m.id">
            <td>{{ m.name }}<span v-if="m.nick_name" style="color:var(--muted)"> ({{ m.nick_name }})</span></td>
            <td>{{ m.job_title || '-' }}</td>
            <td>{{ m.company || '-' }}</td>
            <td>{{ m.phone || '-' }}</td>
            <td>{{ m.email || '-' }}</td>
            <td>{{ m.join_date || '-' }}</td>
            <td><span class="bdg" :class="m.is_active ? 'b-gr' : 'b-g'">{{ m.is_active ? '在職' : '離職' }}</span></td>
          </tr>
          <tr v-if="!roster.members.length">
            <td colspan="7" style="text-align:center; color:var(--muted);">該社尚無社友資料</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
