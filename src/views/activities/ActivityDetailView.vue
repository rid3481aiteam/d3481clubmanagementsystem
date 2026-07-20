<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useActivitiesStore } from '@/stores/activities'
import { usePermissionsStore } from '@/stores/permissions'
import { useToastStore } from '@/stores/toast'
import type { ActivityGuest, ActivityRegistrationFormData, ActivityStatus } from '@/types'

const route = useRoute()
const auth = useAuthStore()
const activitiesStore = useActivitiesStore()
const permissions = usePermissionsStore()
const toast = useToastStore()

const canManage = computed(() => permissions.can('activities', 'edit'))
const activity = computed(() => activitiesStore.current)

const STATUS_LABELS: Record<ActivityStatus, string> = {
  draft: '草稿', open: '招募中', closed: '已截止', cancelled: '已取消',
}
const STATUS_BADGE: Record<ActivityStatus, string> = {
  draft: 'b-g', open: 'b-gr', closed: 'b-y', cancelled: 'b-r',
}
const REG_STATUS_LABELS: Record<string, string> = {
  registered: '已報名', declined: '不克參加', cancelled: '已取消',
}
const REG_STATUS_BADGE: Record<string, string> = {
  registered: 'b-gr', declined: 'b-r', cancelled: 'b-g',
}

const isOrganizer = computed(() =>
  canManage.value && !!activity.value && activity.value.organizing_club_id === auth.clubId
)

const isPastDeadline = computed(() => {
  const deadline = activity.value?.registration_deadline
  return deadline ? new Date(deadline) < new Date() : false
})
const canRegister = computed(() => activity.value?.status === 'open' && !isPastDeadline.value)

const registeredCount = computed(
  () => activitiesStore.registrations.filter(r => r.status === 'registered').length
)
const declinedCount = computed(
  () => activitiesStore.registrations.filter(r => r.status === 'declined').length
)

// 之前回覆過（不含已取消）才顯示「更新回覆」，否則顯示「送出」
const hasExistingResponse = computed(
  () => !!activitiesStore.myRegistration && activitiesStore.myRegistration.status !== 'cancelled'
)

const MAX_GUESTS = 4
const responseStatus = ref<'registered' | 'declined' | null>(null)
const regForm = ref<ActivityRegistrationFormData>(emptyRegForm())
const saving = ref(false)

function emptyRegForm(): ActivityRegistrationFormData {
  return { name: auth.profile?.name ?? '', phone: auth.profile?.phone ?? '', has_guest: false, guests: [], note: '' }
}

function emptyGuest(): ActivityGuest {
  return { name: '', company: '' }
}

// 舊資料相容：改版前的報名沒有 has_guest/guests，只有數字型 guest_count，
// 沒辦法回推當時的來賓姓名，一律視為未攜帶來賓，讓使用者重新填寫
function normalizeFormData(data: Partial<ActivityRegistrationFormData> | null | undefined): ActivityRegistrationFormData {
  return {
    name: data?.name ?? auth.profile?.name ?? '',
    phone: data?.phone ?? '',
    has_guest: !!data?.has_guest,
    guests: Array.isArray(data?.guests) ? data.guests : [],
    note: data?.note ?? '',
  }
}

function pickStatus(status: 'registered' | 'declined') {
  responseStatus.value = status
}

function setHasGuest(value: boolean) {
  regForm.value.has_guest = value
  if (!value) {
    regForm.value.guests = []
  } else if (!regForm.value.guests.length) {
    regForm.value.guests = [emptyGuest()]
  }
}

function setGuestCount(count: number) {
  const guests = regForm.value.guests.slice(0, count)
  while (guests.length < count) guests.push(emptyGuest())
  regForm.value.guests = guests
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

async function submit() {
  if (!auth.user || !auth.clubId || !activity.value || !responseStatus.value) return
  saving.value = true
  const { error } = await activitiesStore.submitResponse(
    activity.value.id, auth.clubId, auth.user.id, responseStatus.value,
    regForm.value
  )
  saving.value = false
  if (error) {
    toast.show('送出失敗：' + error.message, 'err')
    return
  }
  toast.show(responseStatus.value === 'registered' ? '已送出報名' : '已記錄為不克參加')
  if (isOrganizer.value) await activitiesStore.fetchRegistrationsForActivity(activity.value.id)
}

async function load() {
  const id = route.params.id as string
  await activitiesStore.fetchOne(id)
  if (auth.user) {
    const mine = await activitiesStore.fetchMyRegistration(id, auth.user.id)
    if (mine && mine.status !== 'cancelled') {
      responseStatus.value = mine.status as 'registered' | 'declined'
      regForm.value = normalizeFormData(mine.form_data)
    }
  }
  if (isOrganizer.value) await activitiesStore.fetchRegistrationsForActivity(id)
}

onMounted(load)
</script>

<template>
  <div class="page" v-if="activity">
    <div class="ph">
      <h1>{{ activity.title }}</h1>
      <RouterLink to="/activities" class="btn btn-g">回活動列表</RouterLink>
    </div>

    <div class="tw" style="padding:20px; margin-bottom:20px;">
      <div style="display:flex; gap:10px; align-items:center; margin-bottom:14px; flex-wrap:wrap;">
        <span class="bdg" :class="STATUS_BADGE[activity.status]">{{ STATUS_LABELS[activity.status] }}</span>
        <span style="color:var(--muted); font-size:13px;">主辦社：{{ activity.clubs?.name ?? '-' }}</span>
        <span v-if="activity.meeting_id" class="bdg b-n">例會預計出席</span>
        <span v-else-if="activity.club_only" class="bdg b-n">僅本社招募</span>
        <RouterLink v-if="activity.meeting_id" :to="`/meetings/${activity.meeting_id}/attendance`" style="font-size:12.5px; color:var(--navy);">查看實際出席記錄 →</RouterLink>
      </div>
      <p v-if="activity.description" style="white-space:pre-line; margin-bottom:14px;">{{ activity.description }}</p>
      <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; font-size:14px;">
        <div><span class="fl">活動時間</span>{{ formatDateTime(activity.start_at) }}</div>
        <div><span class="fl">地點</span>{{ activity.location || '-' }}</div>
        <div>
          <span class="fl">詳細地址</span>{{ activity.address || '-' }}
          <a v-if="activity.address" :href="`https://maps.google.com/?q=${encodeURIComponent(activity.address)}`" target="_blank" rel="noopener" style="margin-left:6px; font-size:12.5px; color:var(--navy);">在地圖上開啟</a>
        </div>
        <div><span class="fl">報名截止</span>{{ activity.registration_deadline ? formatDateTime(activity.registration_deadline) : '不限' }}</div>
        <div><span class="fl">名額</span>{{ activity.capacity ?? '不限' }}<span v-if="isOrganizer">（已報名 {{ registeredCount }} 人 / 不克參加 {{ declinedCount }} 人）</span></div>
      </div>
    </div>

    <!-- 報名區：一般社友自行填寫報名／不克參加 -->
    <div class="tw" style="padding:20px; margin-bottom:20px;" v-if="auth.clubId">
      <h2 style="font-size:15px; font-weight:700; color:var(--navy); margin-bottom:12px;">本次是否出席？</h2>

      <div v-if="!canRegister" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; color:var(--muted);">
        <span>{{ activity.status === 'cancelled' ? '活動已取消' : activity.status === 'closed' ? '活動已截止報名' : isPastDeadline ? '已超過報名截止時間' : '目前無法報名' }}</span>
        <span v-if="hasExistingResponse" class="bdg" :class="REG_STATUS_BADGE[activitiesStore.myRegistration!.status]">
          您的回覆：{{ REG_STATUS_LABELS[activitiesStore.myRegistration!.status] }}
        </span>
      </div>

      <template v-else>
        <div class="rsvp-picker">
          <button type="button" class="rsvp-choice attend" :class="{ active: responseStatus === 'registered' }" @click="pickStatus('registered')">
            <span class="rsvp-icon">✓</span>報名
          </button>
          <button type="button" class="rsvp-choice decline" :class="{ active: responseStatus === 'declined' }" @click="pickStatus('declined')">
            <span class="rsvp-icon">✕</span>不克參加
          </button>
        </div>

        <div v-if="responseStatus === 'registered'" style="display:flex; flex-direction:column; gap:14px; margin-top:16px;">
          <div>
            <div class="fl" style="margin-bottom:6px;">攜帶來賓？</div>
            <div class="segmented">
              <button type="button" class="seg-btn" :class="{ active: !regForm.has_guest }" @click="setHasGuest(false)">否</button>
              <button type="button" class="seg-btn" :class="{ active: regForm.has_guest }" @click="setHasGuest(true)">是</button>
            </div>
          </div>

          <template v-if="regForm.has_guest">
            <div>
              <label class="fl">來賓人數</label>
              <select class="fi" :value="regForm.guests.length" @change="setGuestCount(Number(($event.target as HTMLSelectElement).value))">
                <option v-for="n in MAX_GUESTS" :key="n" :value="n">{{ n }} 位</option>
              </select>
            </div>
            <div v-for="(guest, i) in regForm.guests" :key="i" class="guest-card">
              <div class="guest-title">來賓 {{ i + 1 }}</div>
              <label class="fl">姓名</label>
              <input v-model="guest.name" class="fi" style="margin-bottom:8px;" />
              <label class="fl">公司 / 抬頭</label>
              <input v-model="guest.company" class="fi" />
            </div>
          </template>

          <div>
            <label class="fl">備註</label>
            <input v-model="regForm.note" class="fi" />
          </div>
        </div>

        <div v-else-if="responseStatus === 'declined'" class="decline-note">
          將記錄為「不克參加」，主辦社統計出席人數時會排除您。之後仍可改為報名。
        </div>

        <button v-if="responseStatus" class="btn btn-gold" style="margin-top:16px; width:100%; justify-content:center;" :disabled="saving" @click="submit">
          {{ hasExistingResponse ? '更新回覆' : '送出' }}
        </button>
      </template>
    </div>

    <!-- 主辦社查看報名清單 -->
    <div class="tw" style="padding:20px;" v-if="isOrganizer">
      <h2 style="font-size:15px; font-weight:700; color:var(--navy); margin-bottom:12px;">
        報名清單（已報名 {{ registeredCount }} 人 / 不克參加 {{ declinedCount }} 人）
      </h2>
      <table class="card-table">
        <thead class="th">
          <tr>
            <th>社團</th>
            <th>姓名</th>
            <th>電話</th>
            <th>來賓</th>
            <th>備註</th>
            <th>報名時間</th>
            <th>狀態</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in activitiesStore.registrations" :key="r.id">
            <td data-label="社團">{{ r.clubs?.name ?? '-' }}</td>
            <td data-label="姓名">{{ r.form_data.name }}</td>
            <td data-label="電話">{{ r.form_data.phone || '-' }}</td>
            <td data-label="來賓" class="card-stack">
              <span v-if="!r.form_data.guests?.length">-</span>
              <div v-else v-for="(g, i) in r.form_data.guests" :key="i">{{ g.name || '(未填姓名)' }}{{ g.company ? `・${g.company}` : '' }}</div>
            </td>
            <td data-label="備註">{{ r.form_data.note || '-' }}</td>
            <td data-label="報名時間">{{ formatDateTime(r.created_at) }}</td>
            <td data-label="狀態">
              <span class="bdg" :class="REG_STATUS_BADGE[r.status]">{{ REG_STATUS_LABELS[r.status] }}</span>
            </td>
          </tr>
          <tr v-if="!activitiesStore.registrations.length">
            <td colspan="7" style="text-align:center; color:var(--muted);">尚無人回覆</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.rsvp-picker {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.rsvp-choice {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 8px;
  min-height: 44px;
  border-radius: var(--r);
  border: 2px solid var(--border);
  background: var(--card);
  color: var(--muted);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.rsvp-icon { font-size: 20px; }
.rsvp-choice.attend.active { border-color: var(--green); background: rgba(42,107,72,.08); color: var(--green); }
.rsvp-choice.decline.active { border-color: var(--red); background: rgba(176,48,48,.08); color: var(--red); }

.decline-note {
  margin-top: 16px;
  padding: 12px 14px;
  background: var(--gold-p);
  border-radius: var(--r);
  font-size: 13px;
  color: var(--muted);
}

.guest-card {
  background: var(--bg);
  border-radius: var(--r);
  padding: 12px 14px;
}
.guest-title {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 8px;
}
</style>
