<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useInvitesStore } from '@/stores/invites'
import { useAccountsStore } from '@/stores/accounts'
import { useClubStore } from '@/stores/club'
import type { UserRole } from '@/types'

const auth = useAuthStore()
const invites = useInvitesStore()
const accounts = useAccountsStore()
const club = useClubStore()

const isDistrictAdmin = computed(() => auth.role === 'district_admin')

const email = ref('')
const role = ref<'club_secretary' | 'club_admin'>('club_secretary')
const clubId = ref<string | null>(isDistrictAdmin.value ? null : auth.clubId)
const inviting = ref(false)
const inviteError = ref<string | null>(null)
const inviteSuccess = ref(false)
const showInviteLog = ref(false)

async function submitInvite() {
  if (!email.value.trim() || !clubId.value) return
  inviting.value = true
  inviteError.value = null
  inviteSuccess.value = false
  const { error } = await invites.inviteUser(email.value.trim(), role.value, clubId.value)
  if (error) {
    inviteError.value = error.message
  } else {
    email.value = ''
    inviteSuccess.value = true
  }
  inviting.value = false
}

function clubName(id: string | null) {
  return club.allClubs.find(c => c.id === id)?.name ?? '-'
}

function roleLabel(r: UserRole) {
  return r === 'club_secretary' ? '執秘' : r === 'club_admin' ? '社長' : r
}

async function toggleActive(id: string, current: boolean) {
  await accounts.setActive(id, !current)
}

async function removeAccount(id: string, name: string) {
  if (!confirm(`確定要永久刪除「${name}」的帳號嗎？此動作無法復原，該 Email 之後可以重新邀請。`)) return
  const { error } = await accounts.deleteAccount(id)
  if (error) alert(error.message)
}

onMounted(async () => {
  await club.fetchAll()
  await invites.fetchLog()
  await accounts.fetchManaged()
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>帳號邀請 / 管理</h1>
    </div>

    <div class="tw" style="padding:20px; margin-bottom:24px;">
      <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:14px;">邀請帳號</h2>
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end;">
        <div>
          <label class="fl">Email</label>
          <input v-model="email" type="email" class="fi" placeholder="邀請對象的 Email" style="min-width:240px;" />
        </div>
        <div>
          <label class="fl">角色</label>
          <select v-model="role" class="fi" style="min-width:120px;">
            <option value="club_secretary">執秘</option>
            <option value="club_admin">社長</option>
          </select>
        </div>
        <div v-if="isDistrictAdmin">
          <label class="fl">所屬社團</label>
          <select v-model="clubId" class="fi" style="min-width:200px;">
            <option :value="null" disabled>請選擇</option>
            <option v-for="c in club.allClubs" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <button class="btn btn-gold" :disabled="inviting" @click="submitInvite">
          {{ inviting ? '邀請中…' : '送出邀請' }}
        </button>
      </div>
      <p v-if="inviteError" class="login-error" style="margin-top:10px; font-size:12px; color:var(--red);">{{ inviteError }}</p>
      <p v-if="inviteSuccess" style="margin-top:10px; font-size:12px; color:var(--green);">邀請已寄出。</p>
    </div>

    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
      <h2 style="font-size:14px; font-weight:700; color:var(--navy);">邀請紀錄</h2>
      <button class="btn btn-g btn-sm" @click="showInviteLog = !showInviteLog">
        {{ showInviteLog ? '收起邀請紀錄' : '查看邀請紀錄' }}
      </button>
    </div>
    <div v-if="showInviteLog" class="tw" style="margin-bottom:24px;">
      <table>
        <thead class="th">
          <tr>
            <th>Email</th>
            <th>角色</th>
            <th>社團</th>
            <th>邀請時間</th>
            <th>接受時間</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in invites.log" :key="i.id">
            <td>{{ i.invited_email }}</td>
            <td>{{ roleLabel(i.role) }}</td>
            <td>{{ clubName(i.club_id) }}</td>
            <td>{{ new Date(i.invited_at).toLocaleString() }}</td>
            <td>
              <span v-if="i.accepted_at" class="bdg b-gr">已接受</span>
              <span v-else class="bdg b-y">待接受</span>
            </td>
          </tr>
          <tr v-if="!invites.log.length">
            <td colspan="5" style="text-align:center; color:var(--muted);">尚無邀請紀錄</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">社長／執秘帳號</h2>
    <div class="tw">
      <table>
        <thead class="th">
          <tr>
            <th>姓名</th>
            <th>角色</th>
            <th>社團</th>
            <th>狀態</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in accounts.managed" :key="a.id">
            <td>{{ a.name }}</td>
            <td>{{ roleLabel(a.role) }}</td>
            <td>{{ clubName(a.club_id) }}</td>
            <td><span class="bdg" :class="a.is_active ? 'b-gr' : 'b-g'">{{ a.is_active ? '啟用中' : '已停用' }}</span></td>
            <td style="display:flex; gap:6px;">
              <button class="btn btn-g btn-sm" @click="toggleActive(a.id, a.is_active)">
                {{ a.is_active ? '停用' : '啟用' }}
              </button>
              <button class="btn btn-red btn-sm" @click="removeAccount(a.id, a.name)">
                永久刪除
              </button>
            </td>
          </tr>
          <tr v-if="!accounts.managed.length">
            <td colspan="5" style="text-align:center; color:var(--muted);">尚無帳號</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
