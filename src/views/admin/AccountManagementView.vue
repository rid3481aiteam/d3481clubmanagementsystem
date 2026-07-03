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

// 帳號總覽：社長/執秘/社員合併成一張表，用同一個開關雙向切換
// 檢視（club_member）／可編輯（club_secretary）。approveRole() 本來
// 就是通用的雙向 role 更新，RLS（028_club_tier_role_management.sql）
// 也已經放行 club_admin/club_secretary/club_member 三者互轉，之前
// 只是 UI 沒做關閉編輯權限的路徑。
// 社長（club_admin）關閉編輯權限後會變成社員，之後若重新打開，固定
// 變成執秘（不會恢復社長身分）——社長身分本來就該透過「帳號邀請」
// 重新指派，不透過這個開關復原。
const allAccounts = computed(() =>
  [...accounts.managed, ...accounts.members].sort((a, b) => a.name.localeCompare(b.name))
)

async function togglePermission(a: UserProfile) {
  const turningOn = a.role === 'club_member'
  const nextRole: UserRole = turningOn ? 'club_secretary' : 'club_member'
  const msg = turningOn
    ? `確定要把「${a.name}」的權限從「檢視」改成「可編輯」嗎？`
    : `確定要把「${a.name}」的權限從「可編輯」改回「檢視」嗎？`
  if (!confirm(msg)) return
  const { error } = await accounts.approveRole(a.id, nextRole)
  if (error) alert(error.message)
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
      <h1>帳號管理</h1>
    </div>

    <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">帳號邀請</h2>

    <div class="tw" style="padding:20px; margin-bottom:14px;">
      <h3 style="font-size:13px; font-weight:700; color:var(--navy); margin-bottom:14px;">邀請社長／執秘（Email）</h3>
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

    <div class="tw" style="padding:20px; margin-bottom:14px;">
      <h3 style="font-size:13px; font-weight:700; color:var(--navy); margin-bottom:6px;">新增社員帳號（手機號碼）</h3>
      <p style="font-size:12px; color:var(--muted); margin-bottom:14px;">
        社員用手機號碼登入，不需要 Email，初始密碼為完整手機號碼（跟帳號一樣）。忘記密碼可由社長／執秘在「帳號總覽」一鍵重設。
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

    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
      <h3 style="font-size:13px; font-weight:700; color:var(--navy);">邀請紀錄</h3>
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

    <template v-if="canManagePending">
      <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">帳號審核</h2>
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

    <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">帳號總覽</h2>
    <div class="tw">
      <table>
        <thead class="th">
          <tr>
            <th>姓名</th>
            <th v-if="isDistrictAdminView">社團</th>
            <th>手機號碼</th>
            <th v-if="isDistrictAdminView">可見範圍</th>
            <th>權限</th>
            <th>狀態</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in allAccounts" :key="a.id">
            <td>{{ a.name }}</td>
            <td v-if="isDistrictAdminView">{{ clubName(a.club_id) }}</td>
            <td>{{ a.phone ?? '-' }}</td>
            <td v-if="isDistrictAdminView">
              <div class="segmented" role="group" aria-label="可見範圍">
                <button
                  type="button"
                  class="seg-btn"
                  :class="{ active: (a.district_role ?? 'club') === 'club' }"
                  @click="changeDistrictRole(a.id, 'club')"
                >只能看到各社</button>
                <button
                  type="button"
                  class="seg-btn"
                  :class="{ active: a.district_role === 'view' }"
                  @click="changeDistrictRole(a.id, 'view')"
                >地區（唯讀）</button>
                <button
                  type="button"
                  class="seg-btn"
                  :class="{ active: a.district_role === 'admin' }"
                  @click="changeDistrictRole(a.id, 'admin')"
                >地區管理員</button>
              </div>
            </td>
            <td>
              <button
                type="button"
                class="toggle-switch"
                role="switch"
                :aria-checked="a.role !== 'club_member'"
                aria-label="權限：檢視／可編輯"
                @click="togglePermission(a)"
              >
                <span class="track"><span class="knob"></span></span>
                <span class="label">{{ a.role === 'club_member' ? '檢視' : '可編輯' }}</span>
              </button>
            </td>
            <td><span class="bdg" :class="a.is_active ? 'b-gr' : 'b-g'">{{ a.is_active ? '啟用中' : '已停用' }}</span></td>
            <td style="display:flex; gap:6px; flex-wrap:wrap;">
              <button v-if="a.phone" class="btn btn-g btn-sm" @click="resetMemberPassword(a.id, a.name)">
                重設密碼
              </button>
              <button class="btn btn-g btn-sm" @click="toggleActive(a.id, a.is_active)">
                {{ a.is_active ? '停用' : '啟用' }}
              </button>
              <button class="btn btn-red btn-sm" @click="removeAccount(a.id, a.name)">
                永久刪除
              </button>
            </td>
          </tr>
          <tr v-if="!allAccounts.length">
            <td :colspan="isDistrictAdminView ? 7 : 5" style="text-align:center; color:var(--muted);">尚無帳號</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
