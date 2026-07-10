<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useActivitiesStore } from '@/stores/activities'
import { usePermissionsStore } from '@/stores/permissions'
import type { Activity, ActivityInsert, ActivityStatus } from '@/types'

const auth = useAuthStore()
const activitiesStore = useActivitiesStore()
const permissions = usePermissionsStore()

const canManage = computed(() => permissions.can('activities', 'edit'))

const STATUS_LABELS: Record<ActivityStatus, string> = {
  draft: '草稿', open: '招募中', closed: '已截止', cancelled: '已取消',
}
const STATUS_BADGE: Record<ActivityStatus, string> = {
  draft: 'b-g', open: 'b-gr', closed: 'b-y', cancelled: 'b-r',
}

const filterStatus = ref<'all' | ActivityStatus>('all')
const filtered = computed(() => {
  if (filterStatus.value === 'all') return activitiesStore.activities
  return activitiesStore.activities.filter(a => a.status === filterStatus.value)
})

const showModal = ref(false)
const editing = ref<Activity | null>(null)
const form = ref<ActivityInsert>(emptyForm())
const startLocal = ref('')
const deadlineLocal = ref('')

// 由例會自動同步產生的活動（見 036 migration），標題/地點/時間跟著例會走，這裡不能手動改
const isMeetingLinked = computed(() => !!editing.value?.meeting_id)

function emptyForm(): ActivityInsert {
  return {
    organizing_club_id: auth.clubId ?? '',
    title: '',
    description: null,
    location: null,
    address: null,
    start_at: '',
    registration_deadline: null,
    capacity: null,
    status: 'open',
    club_only: false,
  }
}

// <input type="datetime-local"> 用的是不帶時區的字串，跟 DB 的 timestamptz(ISO) 互轉
function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function fromLocalInput(local: string): string | null {
  return local ? new Date(local).toISOString() : null
}

function openAdd() {
  editing.value = null
  form.value = emptyForm()
  startLocal.value = ''
  deadlineLocal.value = ''
  showModal.value = true
}

function openEdit(a: Activity) {
  editing.value = a
  form.value = {
    organizing_club_id: a.organizing_club_id,
    title: a.title,
    description: a.description,
    location: a.location,
    address: a.address,
    start_at: a.start_at,
    registration_deadline: a.registration_deadline,
    capacity: a.capacity,
    status: a.status,
    club_only: a.club_only,
  }
  startLocal.value = toLocalInput(a.start_at)
  deadlineLocal.value = toLocalInput(a.registration_deadline)
  showModal.value = true
}

async function save() {
  if (!form.value.title.trim() || !startLocal.value) return
  const payload: ActivityInsert = {
    ...form.value,
    title: form.value.title.trim(),
    description: form.value.description?.trim() || null,
    location: form.value.location?.trim() || null,
    address: form.value.address?.trim() || null,
    start_at: fromLocalInput(startLocal.value)!,
    registration_deadline: fromLocalInput(deadlineLocal.value),
  }
  const { error } = editing.value
    ? await activitiesStore.update(editing.value.id, payload)
    : await activitiesStore.insert(payload)
  if (error) {
    alert('儲存失敗：' + error.message)
    return
  }
  showModal.value = false
  await activitiesStore.fetchAll()
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function canEdit(a: Activity) {
  return canManage.value && a.organizing_club_id === auth.clubId
}

onMounted(() => {
  activitiesStore.fetchAll()
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>社友活動</h1>
      <button v-if="canManage" class="btn btn-gold" @click="openAdd">+ 新增活動</button>
    </div>

    <div class="segmented" style="margin-bottom:14px;">
      <button class="seg-btn" :class="{ active: filterStatus === 'all' }" @click="filterStatus = 'all'">全部</button>
      <button class="seg-btn" :class="{ active: filterStatus === 'open' }" @click="filterStatus = 'open'">招募中</button>
      <button class="seg-btn" :class="{ active: filterStatus === 'closed' }" @click="filterStatus = 'closed'">已截止</button>
      <button class="seg-btn" :class="{ active: filterStatus === 'cancelled' }" @click="filterStatus = 'cancelled'">已取消</button>
    </div>

    <div class="tw">
      <table class="card-table">
        <thead class="th">
          <tr>
            <th>狀態</th>
            <th>活動時間</th>
            <th>標題</th>
            <th>主辦社</th>
            <th>地點</th>
            <th>報名截止</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in filtered" :key="a.id">
            <td data-label="狀態"><span class="bdg" :class="STATUS_BADGE[a.status]">{{ STATUS_LABELS[a.status] }}</span></td>
            <td data-label="活動時間">{{ formatDateTime(a.start_at) }}</td>
            <td data-label="標題">
              <RouterLink :to="`/activities/${a.id}`" style="color:var(--navy); font-weight:600;">{{ a.title }}</RouterLink>
              <span v-if="a.meeting_id" class="bdg b-n" style="margin-left:6px; font-size:10.5px; padding:2px 8px;">例會</span>
              <span v-else-if="a.club_only" class="bdg b-n" style="margin-left:6px; font-size:10.5px; padding:2px 8px;">僅本社</span>
            </td>
            <td data-label="主辦社">{{ a.clubs?.name ?? '-' }}</td>
            <td data-label="地點">{{ a.location || '-' }}</td>
            <td data-label="報名截止">{{ a.registration_deadline ? formatDateTime(a.registration_deadline) : '-' }}</td>
            <td style="display:flex; gap:6px;">
              <RouterLink :to="`/activities/${a.id}`" class="btn btn-g btn-sm">查看</RouterLink>
              <button v-if="canEdit(a)" class="btn btn-g btn-sm" @click="openEdit(a)">編輯</button>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="7" style="text-align:center; color:var(--muted);">查無活動</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="mo" @click.self="showModal = false">
      <div class="mb">
        <div class="mb-h">
          <h3>{{ editing ? '編輯活動' : '新增活動' }}</h3>
          <button class="mb-close" @click="showModal = false">×</button>
        </div>
        <div class="mb-body">
          <p v-if="isMeetingLinked" style="font-size:12.5px; color:var(--muted); background:var(--gold-p); padding:8px 10px; border-radius:8px;">
            此活動同步自例會，標題／地點／時間請到「例會管理」修改，這裡只能調整說明／名額／報名截止／狀態。
          </p>
          <div>
            <label class="fl">標題 *</label>
            <input v-model="form.title" class="fi" :disabled="isMeetingLinked" />
          </div>
          <div>
            <label class="fl">說明</label>
            <textarea v-model="form.description" class="fi" style="min-height:80px;"></textarea>
          </div>
          <div>
            <label class="fl">地點</label>
            <input v-model="form.location" class="fi" placeholder="場地名稱，例如：台北國賓大飯店" :disabled="isMeetingLinked" />
          </div>
          <div>
            <label class="fl">詳細地址</label>
            <input v-model="form.address" class="fi" placeholder="完整地址，方便社友導航" />
          </div>
          <div>
            <label class="fl">活動時間 *</label>
            <input v-model="startLocal" type="datetime-local" class="fi" :disabled="isMeetingLinked" />
          </div>
          <div>
            <label class="fl">報名截止時間</label>
            <input v-model="deadlineLocal" type="datetime-local" class="fi" />
          </div>
          <div>
            <label class="fl">名額（留空 = 不限）</label>
            <input v-model.number="form.capacity" type="number" min="1" class="fi" />
          </div>
          <div>
            <label class="fl">狀態</label>
            <select v-model="form.status" class="fi">
              <option value="draft">草稿（僅主辦社看得到）</option>
              <option value="open">招募中</option>
              <option value="closed">已截止</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>
          <div v-if="!isMeetingLinked">
            <label class="fl">招募對象</label>
            <div class="segmented">
              <button type="button" class="seg-btn" :class="{ active: !form.club_only }" @click="form.club_only = false">全地區社友（可跨社報名）</button>
              <button type="button" class="seg-btn" :class="{ active: form.club_only }" @click="form.club_only = true">僅本社社友</button>
            </div>
          </div>
        </div>
        <div class="mb-foot">
          <button class="btn btn-g" @click="showModal = false">取消</button>
          <button class="btn btn-gold" @click="save">儲存</button>
        </div>
      </div>
    </div>
  </div>
</template>
