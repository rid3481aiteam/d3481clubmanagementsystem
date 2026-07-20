<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
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
const role = ref<'club_member' | 'club_secretary'>('club_secretary')
const clubId = ref<string | null>(isDistrictAdminView.value ? null : auth.clubId)
const inviting = ref(false)
const inviteError = ref<string | null>(null)
const inviteSuccessMessage = ref<string | null>(null)
const showInviteLog = ref(false)

async function submitInvite() {
  if (!email.value.trim() || !clubId.value) return
  inviting.value = true
  inviteError.value = null
  inviteSuccessMessage.value = null
  const { data, error } = await invites.inviteUser(email.value.trim(), role.value, clubId.value, inviteName.value.trim() || undefined)
  if (error) {
    inviteError.value = error.message
  } else {
    email.value = ''
    inviteName.value = ''
    inviteSuccessMessage.value = data?.cross_club_grant
      ? '此帳號已存在，已直接授予本社管理權限，請自行通知對方登入後切換社團。'
      : '邀請已寄出。'
    await accounts.fetchClubCollaborators()
  }
  inviting.value = false
}

function clubName(id: string | null) {
  if (!id) return '3481地區辦公室'
  return club.allClubs.find(c => c.id === id)?.name ?? '-'
}

function roleLabel(r: UserRole) {
  return r === 'district_admin' ? '地區管理員' : r === 'club_secretary' || r === 'club_admin' ? '各社管理員' : r === 'club_member' ? '一般社友' : r
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

// club_id 是 NULL 有兩種意思：clubName() 原本把它當「3481地區辦公室」（地區管理員
// 自己的 home club 就是 NULL），但在待審核清單裡 NULL 是「RotarySSO 首登、還沒
// 指派社別」，不能沿用同一個字樣，會誤導管理員以為已經歸屬地區辦公室。
function pendingClubLabel(p: UserProfile) {
  return p.club_id ? clubName(p.club_id) : '尚未指派'
}

const pendingChoice = ref<Record<string, UserRole>>({})
const pendingClubChoice = ref<Record<string, string>>({})

async function assignPendingClub(p: UserProfile) {
  const targetClubId = pendingClubChoice.value[p.id]
  if (!targetClubId) return
  const { error } = await accounts.assignClub(p.id, targetClubId)
  if (error) alert(error.message)
}

function pendingRoleChoice(p: UserProfile) {
  const choice = pendingChoice.value[p.id] ?? p.requested_role ?? 'club_member'
  // 申請職稱對到的 requested_role 可能是舊資料的 club_admin，角色只剩
  // 「各社管理員／一般社友」兩種，顯示上把 club_admin 併進 club_secretary
  return choice === 'club_admin' ? 'club_secretary' : choice
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
// 各社管理員只能建本社帳號，clubId 已經固定，不需要這兩層選單
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

// 帳號總覽：各社管理員/一般社友合併成一張表，用同一個開關雙向切換
// 檢視（club_member）／編輯（club_secretary）。approveRole() 本來
// 就是通用的雙向 role 更新，RLS（028_club_tier_role_management.sql）
// 也已經放行 club_admin/club_secretary/club_member 三者互轉，之前
// 只是 UI 沒做關閉編輯權限的路徑。
// 社長（club_admin，舊資料殘留角色，畫面上跟 club_secretary 都顯示
// 「各社管理員」）關閉編輯權限後會變成一般社友，之後若重新打開，
// 固定變成 club_secretary（不會恢復 club_admin）——那本來就該透過
// 「帳號邀請」重新指派，不透過這個開關復原。
//
// 地區視角（isDistrictAdminView）下，這張表只該管「誰有地區權限、
// 是唯讀還是可編輯」，不管各社內部給了誰什麼權限，所以過濾成只顯示
// district_role 有值的帳號；要新增/撤銷地區權限，改到 ClubDetailView
// 那邊針對單一社團操作。
const allAccounts = computed(() => {
  const merged = [...accounts.managed, ...accounts.members].sort((a, b) => a.name.localeCompare(b.name))
  return isDistrictAdminView.value ? merged.filter(a => a.district_role) : merged
})

async function togglePermission(a: UserProfile) {
  const turningOn = a.role === 'club_member'
  const nextRole: UserRole = turningOn ? 'club_secretary' : 'club_member'
  const msg = turningOn
    ? `確定要把「${a.name}」的權限從「檢視」改成「編輯」嗎？`
    : `確定要把「${a.name}」的權限從「編輯」改回「檢視」嗎？`
  if (!confirm(msg)) return
  const { error } = await accounts.approveRole(a.id, nextRole)
  if (error) alert(error.message)
}

async function removeAccount(id: string, name: string) {
  if (!confirm(`確定要永久刪除「${name}」的帳號嗎？此動作無法復原，該 Email 之後可以重新邀請。`)) return
  const { error } = await accounts.deleteAccount(id)
  if (error) alert(error.message)
}

// 跨社協作帳號：home club 在別的社，只是被本社額外授權管理，
// 不能用「永久刪除」（那會刪掉對方在自己 home club 的整個帳號），
// 只能調整授權角色或撤銷協作。
async function toggleCollaboratorPermission(c: { user_id: string; club_id: string; role: UserRole }) {
  const turningOn = c.role === 'club_member'
  const nextRole: UserRole = turningOn ? 'club_secretary' : 'club_member'
  const msg = turningOn ? '確定要把這個協作帳號的權限改成「編輯」嗎？' : '確定要把這個協作帳號的權限改回「檢視」嗎？'
  if (!confirm(msg)) return
  const { error } = await accounts.updateCollaboratorRole(c.user_id, c.club_id, nextRole)
  if (error) alert(error.message)
}

async function removeCollaborator(c: { user_id: string; club_id: string }, name: string) {
  if (!confirm(`確定要撤銷「${name}」對本社的協作權限嗎？對方在自己所屬社的帳號不受影響。`)) return
  const { error } = await accounts.revokeCollaborator(c.user_id, c.club_id)
  if (error) alert(error.message)
}

// 查詢範圍要跟著目前視角走：地區管理員即使 RLS 放行看全地區，
// 切到自己社的視角時這裡也只能查自己社，不能只靠畫面過濾
// （不然瀏覽器還是會收到其他社的帳號資料）
async function loadAccounts() {
  const scopeClubId = isDistrictAdminView.value ? null : auth.clubId
  accounts.setScope(scopeClubId)
  await accounts.fetchManaged()
  if (canManagePending.value) await accounts.fetchPending()
  await accounts.fetchMembers()
  await invites.fetchLog(scopeClubId)
  if (!isDistrictAdminView.value) await accounts.fetchClubCollaborators()
}

onMounted(async () => {
  await club.fetchAll()
  await loadAccounts()
})

// 使用者在同一頁用頂部「地區介面／本社」切換視角時（不會重新整理頁面），
// 要跟著重新設定範圍並重新查詢，不然會沿用上一個視角撈到的舊資料
watch(isDistrictAdminView, loadAccounts)
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>帳號管理</h1>
    </div>

    <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">帳號邀請</h2>

    <div class="tw" style="padding:20px; margin-bottom:14px;">
      <h3 style="font-size:13px; font-weight:700; color:var(--navy); margin-bottom:14px;">邀請社友（Email）</h3>
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end;">
        <div>
          <label class="fl">Email</label>
          <input v-model="email" type="email" class="fi" placeholder="邀請對象的 Email" style="min-width:240px;" />
        </div>
        <div>
          <label class="fl">姓名（選填）</label>
          <input v-model="inviteName" type="text" class="fi" placeholder="不填則預設用 Email 前段" style="min-width:160px;" />
        </div>
        <div v-if="isDistrictAdminView">
          <label class="fl">所屬社團</label>
          <select v-model="clubId" class="fi" style="min-width:200px;">
            <option :value="null" disabled>請選擇</option>
            <option v-for="c in club.allClubs" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div>
          <label class="fl">角色</label>
          <button
            type="button"
            class="toggle-switch"
            role="switch"
            :aria-checked="role === 'club_secretary'"
            aria-label="角色：檢視／編輯"
            @click="role = role === 'club_member' ? 'club_secretary' : 'club_member'"
          >
            <span class="track"><span class="knob"></span></span>
            <span class="label">{{ role === 'club_member' ? '檢視' : '編輯' }}</span>
          </button>
        </div>
        <button class="btn btn-gold" :disabled="inviting" @click="submitInvite">
          {{ inviting ? '邀請中…' : '送出邀請' }}
        </button>
      </div>
      <p v-if="inviteError" class="login-error" style="margin-top:10px; font-size:12px; color:var(--red);">{{ inviteError }}</p>
      <p v-if="inviteSuccessMessage" style="margin-top:10px; font-size:12px; color:var(--green);">{{ inviteSuccessMessage }}</p>
    </div>

    <div class="tw" style="padding:20px; margin-bottom:14px;">
      <h3 style="font-size:13px; font-weight:700; color:var(--navy); margin-bottom:6px;">新增社員帳號（手機號碼）</h3>
      <p style="font-size:12px; color:var(--muted); margin-bottom:14px;">
        社員用手機號碼登入，不需要 Email，初始密碼為完整手機號碼（跟帳號一樣）。忘記密碼可由各社管理員在「帳號總覽」一鍵重設。
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
      <table class="card-table">
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
            <td data-label="Email">{{ i.invited_email }}</td>
            <td data-label="角色">{{ roleLabel(i.role) }}</td>
            <td data-label="社團">{{ clubName(i.club_id) }}</td>
            <td data-label="邀請時間">{{ new Date(i.invited_at).toLocaleString() }}</td>
            <td data-label="接受時間">
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
        <table class="card-table">
          <thead class="th">
            <tr>
              <th>姓名</th>
              <th>社團</th>
              <th>申請職稱</th>
              <th>扶輪 SSO 自稱社別</th>
              <th>扶輪地區</th>
              <th>扶輪身分別</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in accounts.pending" :key="p.id">
              <td data-label="姓名">{{ p.name }}</td>
              <td data-label="社團">{{ pendingClubLabel(p) }}</td>
              <td data-label="申請職稱">{{ pendingTitleLabel(p) }}</td>
              <td data-label="扶輪 SSO 自稱社別">{{ p.sso_rotary_club ?? '-' }}</td>
              <td data-label="扶輪地區">{{ p.sso_rotary_district ?? '-' }}</td>
              <td data-label="扶輪身分別">{{ p.sso_account_type ?? '-' }}</td>
              <td style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                <template v-if="isDistrictAdminView && !p.club_id">
                  <select
                    class="fi"
                    :value="pendingClubChoice[p.id] ?? ''"
                    style="min-width:160px; padding:6px 8px;"
                    @change="pendingClubChoice[p.id] = ($event.target as HTMLSelectElement).value"
                  >
                    <option value="" disabled>指派社別</option>
                    <option v-for="c in club.allClubs" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </select>
                  <button class="btn btn-gold btn-sm" :disabled="!pendingClubChoice[p.id]" @click="assignPendingClub(p)">指派社別</button>
                </template>
                <select
                  class="fi"
                  :value="pendingRoleChoice(p)"
                  style="min-width:110px; padding:6px 8px;"
                  @change="pendingChoice[p.id] = ($event.target as HTMLSelectElement).value as UserRole"
                >
                  <option value="club_secretary">各社管理員</option>
                  <option value="club_member">一般社友</option>
                </select>
                <button class="btn btn-gold btn-sm" @click="applyPendingRole(p)">套用角色</button>
              </td>
            </tr>
            <tr v-if="!accounts.pending.length">
              <td colspan="7" style="text-align:center; color:var(--muted);">尚無待審核註冊</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">帳號總覽</h2>
    <div class="tw">
      <table class="card-table">
        <thead class="th">
          <tr>
            <th>姓名</th>
            <th v-if="isDistrictAdminView">社團</th>
            <th>手機號碼</th>
            <th>權限</th>
            <th>狀態</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in allAccounts" :key="a.id">
            <td data-label="姓名">{{ a.name }}</td>
            <td v-if="isDistrictAdminView" data-label="社團">{{ clubName(a.club_id) }}</td>
            <td data-label="手機號碼">{{ a.phone ?? '-' }}</td>
            <td data-label="權限">
              <button
                v-if="isDistrictAdminView"
                type="button"
                class="toggle-switch"
                role="switch"
                :aria-checked="a.district_role === 'admin'"
                aria-label="地區權限：檢視／編輯"
                @click="changeDistrictRole(a.id, a.district_role === 'admin' ? 'view' : 'admin')"
              >
                <span class="track"><span class="knob"></span></span>
                <span class="label">{{ a.district_role === 'admin' ? '編輯' : '檢視' }}</span>
              </button>
              <button
                v-else
                type="button"
                class="toggle-switch"
                role="switch"
                :aria-checked="a.role !== 'club_member'"
                aria-label="權限：檢視／編輯"
                @click="togglePermission(a)"
              >
                <span class="track"><span class="knob"></span></span>
                <span class="label">{{ a.role === 'club_member' ? '檢視' : '編輯' }}</span>
              </button>
            </td>
            <td data-label="狀態"><span class="bdg" :class="a.is_active ? 'b-gr' : 'b-g'">{{ a.is_active ? '啟用中' : '已停用' }}</span></td>
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
            <td :colspan="isDistrictAdminView ? 6 : 5" style="text-align:center; color:var(--muted);">尚無帳號</td>
          </tr>
        </tbody>
      </table>
    </div>

    <template v-if="!isDistrictAdminView">
      <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin:24px 0 8px;">跨社協作帳號</h2>
      <p style="font-size:12px; color:var(--muted); margin-bottom:8px;">
        這些人原本是別的社的帳號，被本社額外授權管理，不佔本社的帳號名額。撤銷協作不影響對方原本所屬社的帳號。
      </p>
      <div class="tw">
        <table class="card-table">
          <thead class="th">
            <tr>
              <th>姓名</th>
              <th>權限</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in accounts.collaborators" :key="`${c.user_id}-${c.club_id}`">
              <td data-label="姓名">{{ c.user_profiles?.name ?? '-' }}</td>
              <td data-label="權限">
                <button
                  type="button"
                  class="toggle-switch"
                  role="switch"
                  :aria-checked="c.role !== 'club_member'"
                  aria-label="權限：檢視／編輯"
                  @click="toggleCollaboratorPermission(c)"
                >
                  <span class="track"><span class="knob"></span></span>
                  <span class="label">{{ c.role === 'club_member' ? '檢視' : '編輯' }}</span>
                </button>
              </td>
              <td>
                <button class="btn btn-red btn-sm" @click="removeCollaborator(c, c.user_profiles?.name ?? '')">
                  撤銷協作
                </button>
              </td>
            </tr>
            <tr v-if="!accounts.collaborators.length">
              <td colspan="3" style="text-align:center; color:var(--muted);">尚無跨社協作帳號</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
