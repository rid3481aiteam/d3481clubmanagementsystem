<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useInvitesStore } from '@/stores/invites'
import { useAccountsStore } from '@/stores/accounts'
import { useClubStore } from '@/stores/club'
import type { UserProfile, UserRole } from '@/types'

const auth = useAuthStore()
const invites = useInvitesStore()
const accounts = useAccountsStore()
const club = useClubStore()

const isDistrictAdminView = computed(() => auth.isDistrictAdminView)
const isClubTier = computed(() => auth.role === 'club_admin' || auth.role === 'club_secretary')
const canManagePending = computed(() => isDistrictAdminView.value || isClubTier.value)

// 跟 ClubListView／RegisterView 的分區排序共用同一份順序
const ZONE_ORDER = [
  '第一分區', '第二分區', '第三分區', '第四分區', '第五分區',
  '第六分區', '第七分區', '第八分區', '第九分區', '第十分區', '第十一分區',
]

function zoneRank(zone: string) {
  const i = ZONE_ORDER.indexOf(zone)
  return i === -1 ? ZONE_ORDER.length : i
}

const email = ref('')
const inviteName = ref('')
const role = ref<'club_secretary' | 'club_admin'>('club_secretary')
const clubId = ref<string | null>(isDistrictAdminView.value ? null : auth.clubId)
const inviting = ref(false)
const inviteError = ref<string | null>(null)
const inviteSuccess = ref(false)
const showInviteLog = ref(false)

async function submitInvite() {
  if (!email.value.trim() || !clubId.value) return
  inviting.value = true
  inviteError.value = null
  inviteSuccess.value = false
  const { error } = await invites.inviteUser(email.value.trim(), role.value, clubId.value, inviteName.value.trim() || undefined)
  if (error) {
    inviteError.value = error.message
  } else {
    email.value = ''
    inviteName.value = ''
    inviteSuccess.value = true
  }
  inviting.value = false
}

function clubName(id: string | null) {
  if (!id) return '3481地區辦公室'
  return club.allClubs.find(c => c.id === id)?.name ?? '-'
}

function roleLabel(r: UserRole) {
  return r === 'district_admin' ? '地區管理員' : r === 'club_secretary' ? '執秘' : r === 'club_admin' ? '社長' : r === 'club_member' ? '社員' : r
}

// 跟 RegisterView 的職稱代碼共用同一份對照表，審核名單才看得懂使用者實際填的職稱
const TITLE_LABELS: Record<string, string> = {
  DG: '總監 DG', DS: '地區秘書 DS', DA: '地區助理 DA', VDS: '副地區秘書 VDS',
  AG: '分區助理總監 AG', VAG: '副分區助理總監 VAG', CP: '創社社長 CP', PP: '前社長 PP',
  P: '社長 P', PE: '社長當選人 PE', VP: '副社長 VP', S: '秘書 S', RTN: '社友 RTN',
}

function pendingTitleLabel(p: UserProfile) {
  if (p.requested_title) return TITLE_LABELS[p.requested_title] ?? p.requested_title
  return p.requested_role ? roleLabel(p.requested_role) : '-'
}

const pendingChoice = ref<Record<string, UserRole>>({})

function pendingRoleChoice(p: UserProfile) {
  return pendingChoice.value[p.id] ?? p.requested_role ?? 'club_member'
}

async function applyPendingRole(p: UserProfile) {
  const { error } = await accounts.approveRole(p.id, pendingRoleChoice(p))
  if (error) alert(error.message)
}

async function toggleActive(id: string, current: boolean) {
  await accounts.setActive(id, !current)
}

const memberName = ref('')
const memberPhone = ref('')
const memberZone = ref('')
const memberClubId = ref<string | null>(isDistrictAdminView.value ? null : auth.clubId)
const creatingMember = ref(false)
const memberError = ref<string | null>(null)
const memberSuccess = ref<string | null>(null)

// 只有地區管理員可以幫任何社建立社員帳號，才需要先選分區再選社；
// 社長／執秘只能建本社帳號，clubId 已經固定，不需要這兩層選單
const memberZones = computed(() => {
  const set = new Set(club.allClubs.map(c => c.zone || '未分區'))
  return [...set].sort((a, b) => zoneRank(a) - zoneRank(b) || a.localeCompare(b))
})

const memberClubsInZone = computed(() => club.allClubs.filter(c => (c.zone || '未分區') === memberZone.value))

function onMemberZoneChange() {
  memberClubId.value = null
}

async function submitCreateMember() {
  if (!memberName.value.trim() || !memberPhone.value.trim() || !memberClubId.value) return
  creatingMember.value = true
  memberError.value = null
  memberSuccess.value = null
  const { error } = await accounts.createMember(memberPhone.value.trim(), memberName.value.trim(), memberClubId.value)
  if (error) {
    memberError.value = error.message
  } else {
    memberSuccess.value = `帳號已建立，初始密碼為完整手機號碼「${memberPhone.value.trim()}」`
    memberName.value = ''
    memberPhone.value = ''
  }
  creatingMember.value = false
}

async function resetMemberPassword(id: string, name: string) {
  if (!confirm(`確定要把「${name}」的密碼重設回完整手機號碼嗎？`)) return
  const { data, error } = await accounts.resetMemberPassword(id)
  if (error) {
    alert(error.message)
  } else {
    alert(`已重設，新密碼為「${data?.new_password}」`)
  }
}

async function changeDistrictRole(id: string, value: string) {
  const districtRole = value === 'view' || value === 'admin' ? value : null
  const { error } = await accounts.setDistrictRole(id, districtRole)
  if (error) alert(error.message)
}

// 社員預設「僅檢視」，這裡直接升級成執秘/社長就等於給了編輯權限
// （套用既有的權限矩陣，不用另外做一套細部欄位）；升級後帳號會
// 從這張「社員帳號」表格移到上面的「社長／執秘帳號」表格。
async function changeMemberPermission(id: string, name: string, newRole: UserRole) {
  if (newRole === 'club_member') return
  if (!confirm(`確定要把「${name}」的權限從「僅檢視」改成「${roleLabel(newRole)}（有編輯權限）」嗎？`)) return
  const { error } = await accounts.approveRole(id, newRole)
  if (error) {
    alert(error.message)
  } else {
    await accounts.fetchMembers()
  }
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
  if (canManagePending.value) await accounts.fetchPending()
  await accounts.fetchMembers()
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
          <label class="fl">姓名（選填）</label>
          <input v-model="inviteName" type="text" class="fi" placeholder="不填則預設用 Email 前段" style="min-width:160px;" />
        </div>
        <div>
          <label class="fl">角色</label>
          <select v-model="role" class="fi" style="min-width:120px;">
            <option value="club_secretary">執秘</option>
            <option value="club_admin">社長</option>
          </select>
        </div>
        <div v-if="isDistrictAdminView">
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

    <template v-if="canManagePending">
      <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">自助註冊待審核</h2>
      <div class="tw" style="margin-bottom:24px;">
        <table>
          <thead class="th">
            <tr>
              <th>姓名</th>
              <th>社團</th>
              <th>申請職稱</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in accounts.pending" :key="p.id">
              <td>{{ p.name }}</td>
              <td>{{ clubName(p.club_id) }}</td>
              <td>{{ pendingTitleLabel(p) }}</td>
              <td style="display:flex; gap:6px;">
                <select
                  class="fi"
                  :value="pendingRoleChoice(p)"
                  style="min-width:110px; padding:6px 8px;"
                  @change="pendingChoice[p.id] = ($event.target as HTMLSelectElement).value as UserRole"
                >
                  <option value="club_admin">社長</option>
                  <option value="club_secretary">執秘</option>
                  <option value="club_member">社員</option>
                </select>
                <button class="btn btn-gold btn-sm" @click="applyPendingRole(p)">套用</button>
              </td>
            </tr>
            <tr v-if="!accounts.pending.length">
              <td colspan="4" style="text-align:center; color:var(--muted);">尚無待審核註冊</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

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
            <th v-if="isDistrictAdminView">可見範圍</th>
            <th>狀態</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in accounts.managed" :key="a.id">
            <td>{{ a.name }}</td>
            <td>{{ roleLabel(a.role) }}</td>
            <td>{{ clubName(a.club_id) }}</td>
            <td v-if="isDistrictAdminView">
              <select
                class="fi"
                :value="a.district_role ?? 'club'"
                style="min-width:170px; padding:6px 8px;"
                @change="changeDistrictRole(a.id, ($event.target as HTMLSelectElement).value)"
              >
                <option value="club">只能看到各社</option>
                <option value="view">地區（唯讀）</option>
                <option value="admin">地區管理員</option>
              </select>
            </td>
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
            <td :colspan="isDistrictAdminView ? 6 : 5" style="text-align:center; color:var(--muted);">尚無帳號</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="tw" style="padding:20px; margin:24px 0;">
      <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:6px;">新增社員帳號</h2>
      <p style="font-size:12px; color:var(--muted); margin-bottom:14px;">
        社員用手機號碼登入，不需要 Email，初始密碼為完整手機號碼（跟帳號一樣）。忘記密碼可由社長／執秘在下方一鍵重設。
      </p>
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end;">
        <div>
          <label class="fl">姓名</label>
          <input v-model="memberName" type="text" class="fi" placeholder="社員姓名" style="min-width:160px;" />
        </div>
        <div>
          <label class="fl">手機號碼</label>
          <input v-model="memberPhone" type="tel" class="fi" placeholder="0912345678" style="min-width:160px;" />
        </div>
        <template v-if="isDistrictAdminView">
          <div>
            <label class="fl">分區</label>
            <select v-model="memberZone" class="fi" style="min-width:140px;" @change="onMemberZoneChange">
              <option value="" disabled>請選擇</option>
              <option v-for="z in memberZones" :key="z" :value="z">{{ z }}</option>
            </select>
          </div>
          <div>
            <label class="fl">所屬社團</label>
            <select v-model="memberClubId" class="fi" style="min-width:200px;" :disabled="!memberZone">
              <option :value="null" disabled>{{ memberZone ? '請選擇' : '請先選擇分區' }}</option>
              <option v-for="c in memberClubsInZone" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
        </template>
        <button class="btn btn-gold" :disabled="creatingMember" @click="submitCreateMember">
          {{ creatingMember ? '建立中…' : '建立帳號' }}
        </button>
      </div>
      <p v-if="memberError" class="login-error" style="margin-top:10px; font-size:12px; color:var(--red);">{{ memberError }}</p>
      <p v-if="memberSuccess" style="margin-top:10px; font-size:12px; color:var(--green);">{{ memberSuccess }}</p>
    </div>

    <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">社員帳號</h2>
    <div class="tw">
      <table>
        <thead class="th">
          <tr>
            <th>姓名</th>
            <th>手機號碼</th>
            <th v-if="isDistrictAdminView">社團</th>
            <th>權限</th>
            <th>狀態</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in accounts.members" :key="m.id">
            <td>{{ m.name }}</td>
            <td>{{ m.phone ?? '-' }}</td>
            <td v-if="isDistrictAdminView">{{ clubName(m.club_id) }}</td>
            <td>
              <select
                class="fi"
                :value="m.role"
                style="min-width:170px; padding:6px 8px;"
                @change="changeMemberPermission(m.id, m.name, ($event.target as HTMLSelectElement).value as UserRole)"
              >
                <option value="club_member">僅檢視（社員）</option>
                <option value="club_secretary">編輯權限（執秘）</option>
                <option value="club_admin">編輯權限（社長）</option>
              </select>
            </td>
            <td><span class="bdg" :class="m.is_active ? 'b-gr' : 'b-g'">{{ m.is_active ? '啟用中' : '已停用' }}</span></td>
            <td style="display:flex; gap:6px;">
              <button class="btn btn-g btn-sm" @click="resetMemberPassword(m.id, m.name)">
                重設密碼
              </button>
              <button class="btn btn-g btn-sm" @click="toggleActive(m.id, m.is_active)">
                {{ m.is_active ? '停用' : '啟用' }}
              </button>
              <button class="btn btn-red btn-sm" @click="removeAccount(m.id, m.name)">
                永久刪除
              </button>
            </td>
          </tr>
          <tr v-if="!accounts.members.length">
            <td :colspan="isDistrictAdminView ? 6 : 5" style="text-align:center; color:var(--muted);">尚無社員帳號</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
