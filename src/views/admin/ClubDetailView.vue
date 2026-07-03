<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useRosterStore } from '@/stores/roster'
import { useOfficersStore, currentYearTerm } from '@/stores/officers'
import type { Club, Meeting, ClubOfficerRole, RosterMember, RosterMemberStatus, UserProfile, UserRole } from '@/types'

const route = useRoute()
const auth = useAuthStore()
const roster = useRosterStore()
const officers = useOfficersStore()
const club = ref<Club | null>(null)
const lastMeeting = ref<Meeting | null>(null)
const avgRate = ref<number | null>(null)
const registeredAccounts = ref<UserProfile[]>([])
const yearTerm = currentYearTerm()

const SINGLE_ROLES: { role: ClubOfficerRole; label: string }[] = [
  { role: 'president', label: '社長' },
  { role: 'president_elect', label: '社長當選人' },
  { role: 'vice_president', label: '副社長' },
  { role: 'secretary', label: '秘書' },
]

const MEMBER_STATUS_LABEL: Record<RosterMemberStatus, string> = {
  normal: '正常',
  leave: '請假',
  resigned: '退社',
}

function memberStatus(m: RosterMember): RosterMemberStatus {
  return m.member_status ?? (m.is_active ? 'normal' : 'resigned')
}

const activeMembers = computed(() => roster.members.filter(m => memberStatus(m) !== 'resigned'))

const classificationBreakdown = computed(() => {
  const map = new Map<string, number>()
  for (const m of activeMembers.value) {
    const key = m.classification?.trim() || '未分類'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1])
})

const committeeMembers = computed(() => officers.list.filter(o => o.role === 'committee_member'))

function officerName(role: ClubOfficerRole) {
  return officers.list.find(o => o.role === role)?.name || '-'
}

function accountRoleLabel(role: UserRole) {
  if (role === 'district_admin') return '地區管理員'
  if (role === 'club_admin') return '社長'
  if (role === 'club_secretary') return '執秘'
  if (role === 'club_member') return '一般社員'
  return role
}

async function changeDistrictRole(accountId: string, value: string) {
  const districtRole = value === 'view' || value === 'admin' ? value : null
  const { error } = await supabase
    .from('user_profiles')
    .update({ district_role: districtRole })
    .eq('id', accountId)

  if (error) {
    alert(error.message)
    return
  }

  registeredAccounts.value = registeredAccounts.value.map(a => (
    a.id === accountId ? { ...a, district_role: districtRole } : a
  ))
}

async function load() {
  const id = route.params.id as string
  const { data } = await supabase.from('clubs').select('*').eq('id', id).single()
  club.value = data

  await roster.fetchAll(id)
  await officers.fetchAll(id, yearTerm)

  const { data: accounts } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('club_id', id)
    .order('role')
    .order('name')
  registeredAccounts.value = accounts ?? []

  const { data: meeting } = await supabase
    .from('meetings')
    .select('*')
    .eq('club_id', id)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()
  lastMeeting.value = meeting

  const { data: meetings } = await supabase
    .from('meetings')
    .select('id')
    .eq('club_id', id)
    .eq('year_term', yearTerm)
  const meetingIds = (meetings ?? []).map(m => m.id)
  if (meetingIds.length) {
    const { data: sessions } = await supabase
      .from('attendance_sessions')
      .select('rate')
      .in('meeting_id', meetingIds)
    const rates = (sessions ?? []).map(s => s.rate).filter((r): r is number => r !== null)
    avgRate.value = rates.length
      ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 10) / 10
      : null
  } else {
    avgRate.value = null
  }
}

onMounted(load)
watch(() => route.params.id, load)
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>{{ club?.name ?? '社團' }}｜社團資訊</h1>
      <RouterLink to="/admin/clubs" class="btn btn-g btn-sm">返回社團總覽</RouterLink>
    </div>

    <div v-if="club" style="display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap;">
      <span class="bdg b-n">{{ club.zone }}</span>
    </div>

    <div class="grid">
      <div class="tw card">
        <h3>社友人數</h3>
        <p class="stat">{{ activeMembers.length }} <span class="unit">人</span></p>
      </div>

      <div class="tw card">
        <h3>出席率（{{ yearTerm }}）</h3>
        <p class="stat">{{ avgRate ?? '-' }} <span class="unit" v-if="avgRate !== null">%</span></p>
      </div>

      <div class="tw card">
        <h3>例會時間地點</h3>
        <p>{{ club?.freq || '-' }} {{ club?.meeting_time || '' }}</p>
        <p style="color:var(--muted); font-size:12px; margin-top:4px;">{{ club?.venue || '-' }}</p>
      </div>

      <div class="tw card">
        <h3>最後一次例會</h3>
        <template v-if="lastMeeting">
          <p>{{ lastMeeting.date }}{{ lastMeeting.title ? '｜' + lastMeeting.title : '' }}</p>
          <p style="color:var(--muted); font-size:12px; margin-top:4px;" v-if="lastMeeting.speaker_name">
            講者：{{ lastMeeting.speaker_name }}
          </p>
        </template>
        <p v-else style="color:var(--muted);">尚無例會紀錄</p>
      </div>
    </div>

    <h2 class="section-h">領域分布</h2>
    <div class="tw" style="padding:16px 20px; margin-bottom:24px;">
      <div v-if="classificationBreakdown.length" style="display:flex; gap:8px; flex-wrap:wrap;">
        <span class="bdg b-n" v-for="[cls, count] in classificationBreakdown" :key="cls">{{ cls }}（{{ count }}）</span>
      </div>
      <p v-else style="color:var(--muted); font-size:13px;">尚無社友資料</p>
    </div>

    <h2 class="section-h">社的年度成員（{{ yearTerm }}）</h2>
    <div class="tw" style="padding:16px 20px; margin-bottom:24px;">
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;">
        <span class="bdg b-g" v-for="r in SINGLE_ROLES" :key="r.role">{{ r.label }}：{{ officerName(r.role) }}</span>
      </div>
      <table v-if="committeeMembers.length">
        <thead class="th">
          <tr><th>委員會</th><th>姓名</th></tr>
        </thead>
        <tbody>
          <tr v-for="m in committeeMembers" :key="m.id">
            <td>{{ m.committee_name || '-' }}</td>
            <td>{{ m.name }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else style="color:var(--muted); font-size:13px;">尚無委員會成員資料</p>
    </div>

    <template v-if="auth.isDistrictAdminView">
      <h2 class="section-h">已註冊帳號</h2>
      <div class="tw" style="margin-bottom:24px;">
        <table>
          <thead class="th">
            <tr>
              <th>姓名</th>
              <th>角色</th>
              <th>可見範圍</th>
              <th>狀態</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in registeredAccounts" :key="a.id">
              <td>{{ a.name }}</td>
              <td>{{ accountRoleLabel(a.role) }}</td>
              <td>
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
                <span class="bdg" :class="a.is_active ? 'b-gr' : 'b-g'">
                  {{ a.is_active ? '啟用中' : '已停用' }}
                </span>
              </td>
            </tr>
            <tr v-if="!registeredAccounts.length">
              <td colspan="4" style="text-align:center; color:var(--muted);">該社尚無已註冊帳號</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <h2 class="section-h">社員名單</h2>
    <div class="tw">
      <table>
        <thead class="th">
          <tr>
            <th>英文名稱</th>
            <th>中文姓名</th>
            <th>社內職稱</th>
            <th>職業分類</th>
            <th>公司</th>
            <th>職稱</th>
            <th>個人電話</th>
            <th>公司電話</th>
            <th>Email</th>
            <th>入社日期</th>
            <th>狀態</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in roster.members" :key="m.id">
            <td>{{ m.nick_name || '-' }}</td>
            <td>{{ m.name }}</td>
            <td>{{ m.club_position || '社友' }}</td>
            <td>{{ m.classification || '-' }}</td>
            <td>{{ m.company || '-' }}</td>
            <td>{{ m.job_title || '-' }}</td>
            <td>{{ m.personal_phone || m.phone || '-' }}</td>
            <td>{{ m.company_phone || '-' }}</td>
            <td>{{ m.email || '-' }}</td>
            <td>{{ m.join_date || '-' }}</td>
            <td>
              <span class="bdg" :class="memberStatus(m) === 'resigned' ? 'b-g' : memberStatus(m) === 'leave' ? 'b-y' : 'b-gr'">
                {{ MEMBER_STATUS_LABEL[memberStatus(m)] }}
              </span>
            </td>
          </tr>
          <tr v-if="!roster.members.length">
            <td colspan="11" style="text-align:center; color:var(--muted);">該社尚無社友資料</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}
.card { padding: 16px 18px; }
.card h3 { font-size: 12px; color: var(--muted); font-weight: 600; margin-bottom: 8px; }
.stat { font-size: 24px; font-weight: 700; color: var(--navy); }
.unit { font-size: 12px; font-weight: 400; color: var(--muted); }
.section-h { font-size: 14px; font-weight: 700; color: var(--navy); margin-bottom: 8px; }
</style>
