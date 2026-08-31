<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAttendanceStore } from '@/stores/attendance'
import { useMembershipReportsStore } from '@/stores/membershipReports'
import { usePermissionsStore } from '@/stores/permissions'
import { useFeaturesStore } from '@/stores/features'
import { useRosterStore } from '@/stores/roster'
import { useMeetingsStore } from '@/stores/meetings'
import { useToastStore } from '@/stores/toast'
import PageHelp from '@/components/help/PageHelp.vue'
import type { ClubMonthlyMembershipReportUpdate, AttendanceStatus, RosterMember } from '@/types'

const auth = useAuthStore()
const attendance = useAttendanceStore()
const reports = useMembershipReportsStore()
const permissions = usePermissionsStore()
const features = useFeaturesStore()
const roster = useRosterStore()
const meetingsStore = useMeetingsStore()
const toast = useToastStore()

const attendanceMonthlyHelpItems = [
  '這頁自動彙整「活動」頁例會逐人登記的出席紀錄，換上方「選擇月份」就能看該月出席率、例會場次跟每場例會的應出席／實際出席人數。',
  '如果有例會沒有透過「活動」頁逐人登記，可以在「快速新增／補登例會出席」直接填當天應出席／實際出席人數；該天若已逐人登記過，請改到「活動」頁該場例會的出席記錄編輯，不要兩邊都填。',
  '「個人補出席」是針對單一社友的補登（例如跨社補會、簽到漏登），不會動到其他社友或整場的應出席／實際出席人數。可以用「批次加入」一次勾選多位社友套用同一天同一種狀態，也可以用下面的單筆表單幫同一位社友加好幾筆不同天的補登，全部加進清單後按「送出全部補登」一次寫入。',
  '有開通 RI 半年報功能的話，「RI 半年報基準人數」區塊可以填基準／當月男女社友人數與年齡分布，系統會自動算出淨成長，供社長每半年填報 RI 用。',
  '最下面「歷月出席月報」是全部月份的總表，可以用來對照出席率趨勢，60% 是扶輪社規定的最低出席門檻。',
]

const canEditAttendance = computed(() => permissions.can('attendance', 'edit'))
const canEditMembership = computed(() => permissions.can('membership_reports', 'edit'))
const canEditMeetings = computed(() => permissions.can('meetings', 'edit'))

// ── 例會清單：修正例會日期 ──────────────────────────
const editingDateId = ref<string | null>(null)
const editDateValue = ref('')
const editDateSaving = ref(false)

function startEditDate(m: { id: string; date: string }) {
  editingDateId.value = m.id
  editDateValue.value = m.date
}

function cancelEditDate() {
  editingDateId.value = null
  editDateValue.value = ''
}

async function saveEditDate(m: { id: string; date: string }) {
  if (!editDateValue.value || editDateValue.value === m.date) {
    cancelEditDate()
    return
  }
  editDateSaving.value = true
  const { error } = await meetingsStore.update(m.id, { date: editDateValue.value })
  editDateSaving.value = false
  if (error) {
    toast.show('修改日期失敗：' + error.message, 'err')
    return
  }
  toast.show('已修改例會日期')
  cancelEditDate()
  if (!auth.clubId) return
  await Promise.all([refreshMonth(), attendance.fetchMonthlyRates(auth.clubId)])
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const selectedMonth = ref(currentMonth())

const selectedRate = computed(() =>
  attendance.monthlyRates.find(r => r.month === selectedMonth.value) ?? null
)

// ── 快速新增／補登例會出席 ──────────────────────────
const quickForm = ref({ date: '', title: '', expected: null as number | null, actual: null as number | null })
const quickSaving = ref(false)
const quickError = ref<string | null>(null)

async function handleQuickAdd() {
  if (!auth.clubId || quickForm.value.expected == null || quickForm.value.actual == null || !quickForm.value.date) return
  quickSaving.value = true
  quickError.value = null
  const { error } = await attendance.quickAddSession(
    auth.clubId,
    quickForm.value.date,
    quickForm.value.expected,
    quickForm.value.actual,
    quickForm.value.title || undefined
  )
  quickSaving.value = false
  if (error) {
    quickError.value = error.message
    return
  }
  quickForm.value = { date: '', title: '', expected: null, actual: null }
  await refreshMonth()
}

// ── 個人補出席 ──────────────────────────────────────
const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: '出席',
  absent: '缺席',
  leave: '請假',
  exempt: '免計',
}

function isAttendanceMember(m: RosterMember) {
  return (m.member_status ?? (m.is_active ? 'normal' : 'resigned')) !== 'resigned'
}

function displayName(m: RosterMember) {
  return m.nick_name ? `${m.nick_name}（${m.name}）` : m.name
}

const attendanceMembers = computed(() => roster.members.filter(isAttendanceMember))

// 待送出補登清單：同一位社友＋同一天只留一筆（後加入的狀態蓋掉前一筆），
// 讓「批次加入」跟下面的單筆表單可以混用而不會重複寫入同一格。
interface MakeupQueueItem {
  memberId: string
  date: string
  status: AttendanceStatus
  error?: string | null
}
const makeupQueue = ref<MakeupQueueItem[]>([])

function upsertQueueItem(memberId: string, date: string, status: AttendanceStatus) {
  const idx = makeupQueue.value.findIndex(q => q.memberId === memberId && q.date === date)
  if (idx >= 0) makeupQueue.value[idx] = { memberId, date, status, error: null }
  else makeupQueue.value.push({ memberId, date, status, error: null })
}

function removeQueueItem(index: number) {
  makeupQueue.value.splice(index, 1)
}

// 單筆表單：適合幫「同一位社友」陸續加好幾筆不同天的補登
const makeupForm = ref({ memberId: '', date: '', status: 'present' as AttendanceStatus })

function addSingleToQueue() {
  if (!makeupForm.value.memberId || !makeupForm.value.date) return
  upsertQueueItem(makeupForm.value.memberId, makeupForm.value.date, makeupForm.value.status)
  makeupForm.value.memberId = ''
}

// 批次表單：適合「同一天、同一種狀態」一次套用到勾選的多位社友
const batchMemberIds = ref<string[]>([])
const batchDate = ref('')
const batchStatus = ref<AttendanceStatus>('present')

function addBatchToQueue() {
  if (!batchDate.value || !batchMemberIds.value.length) return
  for (const id of batchMemberIds.value) upsertQueueItem(id, batchDate.value, batchStatus.value)
  batchMemberIds.value = []
}

const queueSaving = ref(false)

async function submitQueue() {
  if (!auth.clubId || !makeupQueue.value.length) return
  queueSaving.value = true
  const { results } = await attendance.batchMakeupAttendance(
    auth.clubId,
    makeupQueue.value.map(({ memberId, date, status }) => ({ memberId, date, status })),
    attendanceMembers.value.length
  )
  queueSaving.value = false

  const failCount = results.filter(r => r.error).length
  makeupQueue.value = makeupQueue.value
    .map(item => ({
      ...item,
      error: results.find(r => r.memberId === item.memberId && r.date === item.date)?.error ?? null,
    }))
    .filter(item => item.error)

  if (failCount) {
    toast.show(`已完成 ${results.length - failCount} 筆，${failCount} 筆失敗，請確認後重試`, 'err')
  } else {
    toast.show(`已完成 ${results.length} 筆補登`)
  }

  await Promise.all([refreshMonth(), attendance.fetchRates(auth.clubId), attendance.fetchMonthlyRates(auth.clubId)])
}

// ── RI 半年報基準／當月人數 ──────────────────────────
const membershipForm = ref<ClubMonthlyMembershipReportUpdate>({
  baseline_male: null,
  baseline_female: null,
  current_male: null,
  current_female: null,
  age_under_40: null,
  age_41_plus: null,
})

function loadMembershipForm() {
  const existing = reports.reports.find(r => r.month === selectedMonth.value)
  membershipForm.value = {
    baseline_male: existing?.baseline_male ?? null,
    baseline_female: existing?.baseline_female ?? null,
    current_male: existing?.current_male ?? null,
    current_female: existing?.current_female ?? null,
    age_under_40: existing?.age_under_40 ?? null,
    age_41_plus: existing?.age_41_plus ?? null,
  }
}

const baselineTotal = computed(() => (membershipForm.value.baseline_male ?? 0) + (membershipForm.value.baseline_female ?? 0))
const currentTotal = computed(() => (membershipForm.value.current_male ?? 0) + (membershipForm.value.current_female ?? 0))
const netGrowth = computed(() => currentTotal.value - baselineTotal.value)
const ageTotal = computed(() => (membershipForm.value.age_under_40 ?? 0) + (membershipForm.value.age_41_plus ?? 0))

const membershipSaving = ref(false)
async function handleMembershipSave() {
  if (!auth.clubId) return
  membershipSaving.value = true
  const { error } = await reports.upsert(auth.clubId, selectedMonth.value, membershipForm.value, auth.user?.id ?? null)
  membershipSaving.value = false
  if (error) alert(error.message)
}

function membershipFor(month: string) {
  return reports.reports.find(r => r.month === month) ?? null
}

async function refreshMonth() {
  if (!auth.clubId) return
  await Promise.all([
    attendance.fetchMeetingsForMonth(auth.clubId, selectedMonth.value),
  ])
}

onMounted(async () => {
  if (!auth.clubId) return
  await Promise.all([
    attendance.fetchMonthlyRates(auth.clubId),
    reports.fetchAll(auth.clubId),
    attendance.fetchMeetingsForMonth(auth.clubId, selectedMonth.value),
    roster.fetchAll(auth.clubId),
  ])
  loadMembershipForm()
})

watch(selectedMonth, async () => {
  loadMembershipForm()
  await refreshMonth()
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <div style="display:flex; align-items:center; gap:8px;">
        <h1>出席月報</h1>
        <PageHelp title="出席月報怎麼用" :items="attendanceMonthlyHelpItems" manual-url="/manual/attendance-monthly-guide.pdf" />
      </div>
    </div>

    <div style="display:flex; align-items:center; gap:10px; margin-bottom:20px;">
      <label style="font-size:13px; color:var(--muted); font-weight:600;">選擇月份</label>
      <input type="month" class="fi" v-model="selectedMonth" style="max-width:180px;" />
    </div>

    <div class="stat-grid" style="margin-bottom:24px;">
      <div class="stat-card c-sky">
        <div class="stat-label">{{ selectedMonth }} 出席率</div>
        <div class="stat-value">{{ selectedRate?.rate ?? '-' }}{{ selectedRate?.rate != null ? '%' : '' }}</div>
        <div v-if="selectedRate?.rate != null" class="rate-bar-wrap" style="margin-top:10px;">
          <div class="bar-track rate-bar-track">
            <div
              class="bar-fill"
              :style="{ width: selectedRate.rate + '%', background: selectedRate.rate < 60 ? 'var(--red)' : 'var(--green)' }"
            ></div>
            <div class="rate-threshold"></div>
          </div>
          <div class="rate-bar-labels">
            <span>0%</span>
            <span class="rate-threshold-label">60% 最低門檻</span>
            <span>100%</span>
          </div>
        </div>
      </div>
      <div class="stat-card c-gold">
        <div class="stat-label">例會場次</div>
        <div class="stat-value">{{ selectedRate?.meeting_count ?? 0 }}</div>
      </div>
    </div>

    <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">{{ selectedMonth }} 例會清單</h2>
    <div class="tw" style="margin-bottom:20px;">
      <table class="card-table">
        <thead class="th">
          <tr>
            <th>日期</th>
            <th>主題 / 講者</th>
            <th class="hdr-purple">應出席</th>
            <th class="hdr-purple">實際出席</th>
            <th class="hdr-purple">出席率</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in attendance.meetingSummaries" :key="m.id">
            <td data-label="日期">
              <template v-if="editingDateId === m.id">
                <div style="display:flex; align-items:center; gap:6px;">
                  <input type="date" class="fi" v-model="editDateValue" style="max-width:150px;" />
                  <button class="btn btn-gold btn-sm" :disabled="editDateSaving" @click="saveEditDate(m)">{{ editDateSaving ? '儲存中…' : '儲存' }}</button>
                  <button class="btn btn-g btn-sm" :disabled="editDateSaving" @click="cancelEditDate">取消</button>
                </div>
              </template>
              <template v-else>
                {{ m.date }}
                <button v-if="canEditMeetings" class="btn btn-g btn-sm" style="margin-left:6px;" @click="startEditDate(m)">修正日期</button>
              </template>
            </td>
            <td data-label="主題 / 講者">
              {{ m.title || '-' }}
              <span v-if="m.speaker_name" style="color:var(--muted);">｜{{ m.speaker_name }}</span>
              <span v-if="!m.hasDetail && m.expected != null" class="bdg b-y" style="margin-left:6px;">未逐人登記</span>
            </td>
            <td data-label="應出席">{{ m.expected ?? '-' }}</td>
            <td data-label="實際出席">{{ m.actual ?? '-' }}</td>
            <td data-label="出席率">
              <span v-if="m.rate != null" class="bdg" :class="m.rate < 75 ? 'b-r' : 'b-gr'">{{ m.rate }}%</span>
              <span v-else>-</span>
            </td>
            <td data-label="操作"><RouterLink :to="`/meetings/${m.id}/attendance`" class="btn btn-g btn-sm">逐人出席</RouterLink></td>
          </tr>
          <tr v-if="!attendance.meetingSummaries.length">
            <td colspan="6" style="text-align:center; color:var(--muted);">本月尚無例會紀錄</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="canEditAttendance" class="tw" style="padding:16px 20px; margin-bottom:24px;">
      <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:10px;">快速新增／補登例會出席</h2>
      <p style="font-size:12px; color:var(--muted); margin-bottom:12px;">
        沒有透過「活動」頁的出席記錄逐人登記時，可以在這裡直接補一筆當天的應出席／實際出席人數。如果該天已經逐人登記過，請改到「活動」頁該例會的出席記錄編輯。
      </p>
      <div class="form-grid">
        <label>
          <span>日期</span>
          <input type="date" class="fi" v-model="quickForm.date" />
        </label>
        <label>
          <span>主題（選填）</span>
          <input type="text" class="fi" v-model="quickForm.title" />
        </label>
        <label>
          <span>應出席人數</span>
          <input type="number" class="fi" v-model.number="quickForm.expected" />
        </label>
        <label>
          <span>實際出席人數</span>
          <input type="number" class="fi" v-model.number="quickForm.actual" />
        </label>
      </div>
      <p v-if="quickError" style="color:var(--red); font-size:12px; margin-top:8px;">{{ quickError }}</p>
      <div style="margin-top:12px;">
        <button class="btn btn-gold" :disabled="quickSaving" @click="handleQuickAdd">{{ quickSaving ? '儲存中…' : '新增／更新這一天' }}</button>
      </div>
    </div>

    <div v-if="canEditAttendance" class="tw" style="padding:16px 20px; margin-bottom:24px;">
      <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:10px;">個人補出席</h2>
      <p style="font-size:12px; color:var(--muted); margin-bottom:12px;">
        針對單一社友補登某一天的出席狀態（例如跨社補會、簽到漏登），不會影響其他社友或整場例會的應出席／實際出席人數。下面加的補登項目會先進待送出清單，確認沒問題後再一次送出。
      </p>

      <h3 style="font-size:13px; font-weight:700; color:var(--muted); margin-bottom:8px;">批次加入（多位社友套用同一天、同一種狀態）</h3>
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
        <span style="font-size:12.5px; color:var(--muted);">已勾選 {{ batchMemberIds.length }} / {{ attendanceMembers.length }} 人</span>
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn btn-g" style="padding:2px 10px; font-size:12px;" @click="batchMemberIds = attendanceMembers.map(m => m.id)">全選</button>
          <button type="button" class="btn btn-g" style="padding:2px 10px; font-size:12px;" @click="batchMemberIds = []">全不選</button>
        </div>
      </div>
      <div style="max-height:180px; overflow-y:auto; display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:6px; margin-bottom:12px;">
        <label v-for="m in attendanceMembers" :key="m.id" style="display:flex; align-items:center; gap:6px; font-size:13px;">
          <input type="checkbox" :value="m.id" v-model="batchMemberIds" />
          {{ displayName(m) }}
        </label>
      </div>
      <div class="form-grid">
        <label>
          <span>日期</span>
          <input type="date" class="fi" v-model="batchDate" />
        </label>
        <label>
          <span>狀態</span>
          <select class="fi" v-model="batchStatus">
            <option v-for="(label, key) in STATUS_LABEL" :key="key" :value="key">{{ label }}</option>
          </select>
        </label>
      </div>
      <div style="margin-top:12px;">
        <button class="btn btn-g" :disabled="!batchDate || !batchMemberIds.length" @click="addBatchToQueue">加入清單（{{ batchMemberIds.length }} 人）</button>
      </div>

      <h3 style="font-size:13px; font-weight:700; color:var(--muted); margin:20px 0 8px;">單筆加入（同一位社友可加好幾筆不同天）</h3>
      <div class="form-grid">
        <label>
          <span>社友姓名</span>
          <select class="fi" v-model="makeupForm.memberId">
            <option value="" disabled>請選擇</option>
            <option v-for="m in attendanceMembers" :key="m.id" :value="m.id">{{ displayName(m) }}</option>
          </select>
        </label>
        <label>
          <span>日期</span>
          <input type="date" class="fi" v-model="makeupForm.date" />
        </label>
        <label>
          <span>狀態</span>
          <select class="fi" v-model="makeupForm.status">
            <option v-for="(label, key) in STATUS_LABEL" :key="key" :value="key">{{ label }}</option>
          </select>
        </label>
      </div>
      <div style="margin-top:12px;">
        <button class="btn btn-g" :disabled="!makeupForm.memberId || !makeupForm.date" @click="addSingleToQueue">加入清單</button>
      </div>

      <template v-if="makeupQueue.length">
        <h3 style="font-size:13px; font-weight:700; color:var(--muted); margin:20px 0 8px;">待送出清單（{{ makeupQueue.length }} 筆）</h3>
        <div class="tw">
          <table class="card-table">
            <thead class="th">
              <tr>
                <th>社友</th>
                <th>日期</th>
                <th>狀態</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in makeupQueue" :key="item.memberId + item.date">
                <td data-label="社友">
                  {{ attendanceMembers.find(m => m.id === item.memberId) ? displayName(attendanceMembers.find(m => m.id === item.memberId)!) : '-' }}
                </td>
                <td data-label="日期">{{ item.date }}</td>
                <td data-label="狀態">{{ STATUS_LABEL[item.status] }}</td>
                <td data-label="">
                  <button class="btn btn-g btn-sm" @click="removeQueueItem(idx)">移除</button>
                  <span v-if="item.error" style="color:var(--red); font-size:12px; margin-left:8px;">{{ item.error }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style="margin-top:12px;">
          <button class="btn btn-gold" :disabled="queueSaving" @click="submitQueue">{{ queueSaving ? '送出中…' : `送出全部補登（${makeupQueue.length} 筆）` }}</button>
        </div>
      </template>
    </div>

    <template v-if="features.isEnabled('B6_membership_report')">
      <div class="tw" style="padding:20px; margin-bottom:24px;">
        <h2 class="section-bar hdr-navy">RI 半年報基準人數</h2>
        <div class="form-grid">
          <label>
            <span>男社友人數</span>
            <input type="number" class="fi" v-model.number="membershipForm.baseline_male" :disabled="!canEditMembership" />
          </label>
          <label>
            <span>女社友人數</span>
            <input type="number" class="fi" v-model.number="membershipForm.baseline_female" :disabled="!canEditMembership" />
          </label>
          <label>
            <span>合計</span>
            <input type="number" class="fi" :value="baselineTotal" disabled />
          </label>
        </div>

        <h2 class="section-bar hdr-purple" style="margin-top:20px;">{{ selectedMonth }} 月底人數</h2>
        <div class="form-grid">
          <label>
            <span>男社友人數</span>
            <input type="number" class="fi" v-model.number="membershipForm.current_male" :disabled="!canEditMembership" />
          </label>
          <label>
            <span>女社友人數</span>
            <input type="number" class="fi" v-model.number="membershipForm.current_female" :disabled="!canEditMembership" />
          </label>
          <label>
            <span>合計</span>
            <input type="number" class="fi" :value="currentTotal" disabled />
          </label>
          <label>
            <span>淨成長</span>
            <input type="number" class="fi hdr-yellow" :value="netGrowth" disabled style="font-weight:700;" />
          </label>
        </div>

        <h2 class="section-bar hdr-green" style="margin-top:20px;">{{ selectedMonth }} 年齡分布</h2>
        <div class="form-grid">
          <label>
            <span>40歲以下人數</span>
            <input type="number" class="fi" v-model.number="membershipForm.age_under_40" :disabled="!canEditMembership" />
          </label>
          <label>
            <span>41歲以上人數</span>
            <input type="number" class="fi" v-model.number="membershipForm.age_41_plus" :disabled="!canEditMembership" />
          </label>
          <label>
            <span>合計</span>
            <input type="number" class="fi" :value="ageTotal" disabled />
          </label>
        </div>

        <div v-if="canEditMembership" style="margin-top:20px;">
          <button class="btn btn-gold" :disabled="membershipSaving" @click="handleMembershipSave">{{ membershipSaving ? '儲存中…' : '儲存社友人數' }}</button>
        </div>
      </div>
    </template>

    <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">歷月出席月報</h2>
    <div class="tw" style="overflow-x:auto;">
      <table class="card-table">
        <thead class="th">
          <tr>
            <th class="hdr-purple" rowspan="2" style="vertical-align:middle;">月份</th>
            <template v-if="features.isEnabled('B6_membership_report')">
              <th class="hdr-navy" colspan="3">RI 半年報基準人數</th>
              <th class="hdr-purple" colspan="3">月底人數</th>
              <th class="hdr-yellow" rowspan="2" style="vertical-align:middle;">淨成長</th>
              <th class="hdr-green" colspan="3">年齡分布</th>
            </template>
            <th class="hdr-purple" rowspan="2" style="vertical-align:middle;">例會次數</th>
            <th class="hdr-purple" rowspan="2" style="vertical-align:middle;">出席率</th>
          </tr>
          <tr>
            <template v-if="features.isEnabled('B6_membership_report')">
              <th class="hdr-navy">男</th><th class="hdr-navy">女</th><th class="hdr-navy">合計</th>
              <th class="hdr-purple">男</th><th class="hdr-purple">女</th><th class="hdr-purple">合計</th>
              <th class="hdr-green">40歲以下</th><th class="hdr-green">41歲以上</th><th class="hdr-green">合計</th>
            </template>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in attendance.monthlyRates"
            :key="r.month"
            :style="r.month === selectedMonth ? { background: 'var(--gold-p)' } : {}"
          >
            <td data-label="月份">{{ r.month }}</td>
            <template v-if="features.isEnabled('B6_membership_report')">
              <td data-label="基準-男">{{ membershipFor(r.month)?.baseline_male ?? '-' }}</td>
              <td data-label="基準-女">{{ membershipFor(r.month)?.baseline_female ?? '-' }}</td>
              <td data-label="基準-合計">{{ (membershipFor(r.month)?.baseline_male ?? 0) + (membershipFor(r.month)?.baseline_female ?? 0) }}</td>
              <td data-label="當月-男">{{ membershipFor(r.month)?.current_male ?? '-' }}</td>
              <td data-label="當月-女">{{ membershipFor(r.month)?.current_female ?? '-' }}</td>
              <td data-label="當月-合計">{{ (membershipFor(r.month)?.current_male ?? 0) + (membershipFor(r.month)?.current_female ?? 0) }}</td>
              <td data-label="淨成長">
                {{ ((membershipFor(r.month)?.current_male ?? 0) + (membershipFor(r.month)?.current_female ?? 0))
                  - ((membershipFor(r.month)?.baseline_male ?? 0) + (membershipFor(r.month)?.baseline_female ?? 0)) }}
              </td>
              <td data-label="40歲以下">{{ membershipFor(r.month)?.age_under_40 ?? '-' }}</td>
              <td data-label="41歲以上">{{ membershipFor(r.month)?.age_41_plus ?? '-' }}</td>
              <td data-label="年齡合計">{{ (membershipFor(r.month)?.age_under_40 ?? 0) + (membershipFor(r.month)?.age_41_plus ?? 0) }}</td>
            </template>
            <td data-label="例會次數">{{ r.meeting_count }}</td>
            <td data-label="出席率">
              <span class="bdg" :class="r.rate !== null && r.rate < 75 ? 'b-r' : 'b-gr'">
                {{ r.rate !== null ? r.rate + '%' : '-' }}
              </span>
            </td>
          </tr>
          <tr v-if="!attendance.monthlyRates.length">
            <td :colspan="features.isEnabled('B6_membership_report') ? 13 : 3" style="text-align:center; color:var(--muted);">尚無出席資料</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 14px;
}
.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
  font-weight: 600;
}

/* 比照使用者提供的 RI 半年報 Excel 表頭配色 */
.hdr-purple { background: #5B3F86; color: #fff; }
.hdr-navy   { background: #060FBA; color: #fff; }
.hdr-yellow { background: #FFFF00; color: #000; }
.hdr-green  { background: #08BE26; color: #fff; }

.section-bar {
  font-size: 13px;
  font-weight: 700;
  padding: 8px 12px;
  border-radius: var(--r-sm);
  margin-bottom: 14px;
}

/* 比照 vivian 檔案月報頁的出席率進度條：加上 60% 最低門檻標線 */
.rate-bar-track {
  position: relative;
}

.rate-threshold {
  position: absolute;
  top: -2px;
  bottom: -2px;
  left: 60%;
  width: 2px;
  background: var(--red);
}

.rate-bar-labels {
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: var(--muted);
  margin-top: 4px;
}

.rate-threshold-label {
  color: var(--red);
}
</style>
