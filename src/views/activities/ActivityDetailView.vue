<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useActivitiesStore } from '@/stores/activities'
import { usePermissionsStore } from '@/stores/permissions'
import type { ActivityRegistrationFormData, ActivityStatus } from '@/types'

const route = useRoute()
const auth = useAuthStore()
const activitiesStore = useActivitiesStore()
const permissions = usePermissionsStore()

const canManage = computed(() => permissions.can('activities', 'edit'))
const activity = computed(() => activitiesStore.current)

const STATUS_LABELS: Record<ActivityStatus, string> = {
  draft: '草稿', open: '招募中', closed: '已截止', cancelled: '已取消',
}
const STATUS_BADGE: Record<ActivityStatus, string> = {
  draft: 'b-g', open: 'b-gr', closed: 'b-y', cancelled: 'b-r',
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

const isRegistered = computed(() => activitiesStore.myRegistration?.status === 'registered')

const regForm = ref<ActivityRegistrationFormData>(emptyRegForm())
const saving = ref(false)

function emptyRegForm(): ActivityRegistrationFormData {
  return { name: auth.profile?.name ?? '', phone: auth.profile?.phone ?? '', guest_count: 1, note: '' }
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

async function submitRegistration() {
  if (!auth.user || !auth.clubId || !activity.value) return
  if (!regForm.value.name.trim()) {
    alert('請填寫姓名')
    return
  }
  saving.value = true
  const { error } = await activitiesStore.register(activity.value.id, auth.clubId, auth.user.id, {
    ...regForm.value,
    name: regForm.value.name.trim(),
  })
  saving.value = false
  if (error) {
    alert('報名失敗：' + error.message)
    return
  }
  if (isOrganizer.value) await activitiesStore.fetchRegistrationsForActivity(activity.value.id)
}

async function cancelMyRegistration() {
  if (!auth.user || !activity.value || !activitiesStore.myRegistration) return
  if (!confirm('確定要取消報名嗎？')) return
  const { error } = await activitiesStore.cancelRegistration(
    activitiesStore.myRegistration.id,
    activity.value.id,
    auth.user.id
  )
  if (error) {
    alert('取消失敗：' + error.message)
    return
  }
  if (isOrganizer.value) await activitiesStore.fetchRegistrationsForActivity(activity.value.id)
}

async function load() {
  const id = route.params.id as string
  await activitiesStore.fetchOne(id)
  if (auth.user) {
    const mine = await activitiesStore.fetchMyRegistration(id, auth.user.id)
    if (mine) regForm.value = { ...mine.form_data }
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
      <div style="display:flex; gap:10px; align-items:center; margin-bottom:14px;">
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
        <div><span class="fl">名額</span>{{ activity.capacity ?? '不限' }}<span v-if="isOrganizer">（已報名 {{ registeredCount }} 人）</span></div>
      </div>
    </div>

    <!-- 報名區：一般社友自行報名/取消 -->
    <div class="tw" style="padding:20px; margin-bottom:20px;" v-if="auth.clubId">
      <h2 style="font-size:15px; font-weight:700; color:var(--navy); margin-bottom:12px;">
        {{ isRegistered ? '我的報名' : '報名' }}
      </h2>

      <div v-if="isRegistered" style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
        <span class="bdg b-gr">已報名</span>
        <button class="btn btn-red btn-sm" @click="cancelMyRegistration">取消報名</button>
      </div>

      <div v-if="!canRegister && !isRegistered" style="color:var(--muted);">
        {{ activity.status === 'cancelled' ? '活動已取消' : activity.status === 'closed' ? '活動已截止報名' : isPastDeadline ? '已超過報名截止時間' : '目前無法報名' }}
      </div>

      <div v-else style="display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px;">
        <div>
          <label class="fl">姓名 *</label>
          <input v-model="regForm.name" class="fi" :disabled="!canRegister" />
        </div>
        <div>
          <label class="fl">電話</label>
          <input v-model="regForm.phone" class="fi" :disabled="!canRegister" />
        </div>
        <div>
          <label class="fl">出席人數（含本人）</label>
          <input v-model.number="regForm.guest_count" type="number" min="1" class="fi" :disabled="!canRegister" />
        </div>
        <div style="grid-column:1/-1;">
          <label class="fl">備註</label>
          <input v-model="regForm.note" class="fi" :disabled="!canRegister" />
        </div>
        <div style="grid-column:1/-1;">
          <button v-if="canRegister" class="btn btn-gold" :disabled="saving" @click="submitRegistration">
            {{ isRegistered ? '更新報名資料' : '確認報名' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 主辦社查看報名清單 -->
    <div class="tw" style="padding:20px;" v-if="isOrganizer">
      <h2 style="font-size:15px; font-weight:700; color:var(--navy); margin-bottom:12px;">
        報名清單（{{ registeredCount }} 人）
      </h2>
      <table>
        <thead class="th">
          <tr>
            <th>社團</th>
            <th>姓名</th>
            <th>電話</th>
            <th>人數</th>
            <th>備註</th>
            <th>報名時間</th>
            <th>狀態</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in activitiesStore.registrations" :key="r.id">
            <td>{{ r.clubs?.name ?? '-' }}</td>
            <td>{{ r.form_data.name }}</td>
            <td>{{ r.form_data.phone || '-' }}</td>
            <td>{{ r.form_data.guest_count ?? 1 }}</td>
            <td>{{ r.form_data.note || '-' }}</td>
            <td>{{ formatDateTime(r.created_at) }}</td>
            <td>
              <span class="bdg" :class="r.status === 'registered' ? 'b-gr' : 'b-g'">
                {{ r.status === 'registered' ? '已報名' : '已取消' }}
              </span>
            </td>
          </tr>
          <tr v-if="!activitiesStore.registrations.length">
            <td colspan="7" style="text-align:center; color:var(--muted);">尚無人報名</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
