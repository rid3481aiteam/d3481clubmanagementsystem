<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useActivitiesStore } from '@/stores/activities'
import { useMeetingsStore } from '@/stores/meetings'
import { usePermissionsStore } from '@/stores/permissions'
import { useFeaturesStore } from '@/stores/features'
import { useToastStore } from '@/stores/toast'
import type { Activity, ActivityCategory, ActivityInsert, ActivityStatus, MeetingInsert } from '@/types'

const auth = useAuthStore()
const activitiesStore = useActivitiesStore()
const meetingsStore = useMeetingsStore()
const permissions = usePermissionsStore()
const features = useFeaturesStore()
const toast = useToastStore()

const canManage = computed(() => permissions.can('activities', 'edit'))
const canManageMeetings = computed(() => permissions.can('meetings', 'edit'))

const STATUS_LABELS: Record<ActivityStatus, string> = {
  draft: '草稿', open: '招募中', closed: '已截止', cancelled: '已取消',
}
const STATUS_BADGE: Record<ActivityStatus, string> = {
  draft: 'b-g', open: 'b-gr', closed: 'b-y', cancelled: 'b-r',
}

const CATEGORIES: ActivityCategory[] = ['例會', '社內活動', '友社活動', '地區活動', '其他']
const NON_MEETING_CATEGORIES = CATEGORIES.filter(c => c !== '例會')
const CATEGORY_BADGE: Record<ActivityCategory, string> = {
  '例會': 'b-n', '社內活動': 'b-gr', '友社活動': 'b-y', '地區活動': 'b-g', '其他': 'b-r',
}
// 「例會」只有 B1_meeting_info 開啟 + 有例會編輯權限才能選，避免建出點不進去的入口
const creatableCategories = computed(() =>
  features.isEnabled('B1_meeting_info') && canManageMeetings.value ? CATEGORIES : NON_MEETING_CATEGORIES
)

const filterCategory = ref<'all' | ActivityCategory>('all')
const filterTime = ref<'all' | 'upcoming' | 'past'>('upcoming')
const filterStatus = ref<'all' | ActivityStatus>('all')

const filtered = computed(() => {
  const now = new Date()
  return activitiesStore.activities.filter(a => {
    if (filterCategory.value !== 'all' && a.category !== filterCategory.value) return false
    if (filterStatus.value !== 'all' && a.status !== filterStatus.value) return false
    if (filterTime.value === 'upcoming' && new Date(a.start_at) < now) return false
    if (filterTime.value === 'past' && new Date(a.start_at) >= now) return false
    return true
  })
})

// ── 新增/編輯彈窗：先選類別，「例會」走 meetings 表（DB trigger 自動同步出
// 對應的 activities 列），其餘類別直接寫 activities 表 ──
const showModal = ref(false)
const editingActivity = ref<Activity | null>(null)
const editingMeetingId = ref<string | null>(null)
const pickedCategory = ref<ActivityCategory>('社內活動')
const isMeetingForm = computed(() => pickedCategory.value === '例會')
const isEditing = computed(() => !!editingActivity.value || !!editingMeetingId.value)

const meetingForm = ref<MeetingInsert>(emptyMeetingForm())
const activityForm = ref<ActivityInsert>(emptyActivityForm())
const startLocal = ref('')
const deadlineLocal = ref('')
const saving = ref(false)

function emptyMeetingForm(): MeetingInsert {
  return {
    club_id: auth.clubId ?? '', date: '', session_no: null, title: null,
    speaker_name: null, speaker_title: null, speaker_email: null, speaker_phone: null,
    venue: null, note: null,
  }
}
function emptyActivityForm(): ActivityInsert {
  return {
    organizing_club_id: auth.clubId ?? '', title: '', description: null, location: null,
    address: null, start_at: '', registration_deadline: null, capacity: null,
    status: 'open', club_only: false, category: '社內活動', host_name: null,
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
  editingActivity.value = null
  editingMeetingId.value = null
  pickedCategory.value = creatableCategories.value[0]
  meetingForm.value = emptyMeetingForm()
  activityForm.value = emptyActivityForm()
  startLocal.value = ''
  deadlineLocal.value = ''
  showModal.value = true
}

async function openEdit(a: Activity) {
  editingActivity.value = a
  if (a.meeting_id) {
    editingMeetingId.value = a.meeting_id
    pickedCategory.value = '例會'
    const m = await meetingsStore.fetchOne(a.meeting_id)
    if (m) {
      meetingForm.value = {
        club_id: m.club_id, date: m.date, session_no: m.session_no, title: m.title,
        speaker_name: m.speaker_name, speaker_title: m.speaker_title,
        speaker_email: m.speaker_email, speaker_phone: m.speaker_phone,
        venue: m.venue, note: m.note,
      }
    }
  } else {
    editingMeetingId.value = null
    pickedCategory.value = a.category
    activityForm.value = {
      organizing_club_id: a.organizing_club_id, title: a.title, description: a.description,
      location: a.location, address: a.address, start_at: a.start_at,
      registration_deadline: a.registration_deadline, capacity: a.capacity,
      status: a.status, club_only: a.club_only, category: a.category, host_name: a.host_name,
    }
    startLocal.value = toLocalInput(a.start_at)
    deadlineLocal.value = toLocalInput(a.registration_deadline)
  }
  showModal.value = true
}

async function save() {
  saving.value = true
  if (isMeetingForm.value) {
    if (!meetingForm.value.date) { saving.value = false; return }
    const { error } = editingMeetingId.value
      ? await meetingsStore.update(editingMeetingId.value, meetingForm.value)
      : await meetingsStore.insert(meetingForm.value)
    saving.value = false
    if (error) { toast.show('儲存失敗：' + error.message, 'err'); return }
  } else {
    if (!activityForm.value.title.trim() || !startLocal.value) { saving.value = false; return }
    const payload: ActivityInsert = {
      ...activityForm.value,
      category: pickedCategory.value,
      title: activityForm.value.title.trim(),
      description: activityForm.value.description?.trim() || null,
      location: activityForm.value.location?.trim() || null,
      address: activityForm.value.address?.trim() || null,
      host_name: activityForm.value.host_name?.trim() || null,
      start_at: fromLocalInput(startLocal.value)!,
      registration_deadline: fromLocalInput(deadlineLocal.value),
    }
    const { error } = editingActivity.value
      ? await activitiesStore.update(editingActivity.value.id, payload)
      : await activitiesStore.insert(payload)
    saving.value = false
    if (error) { toast.show('儲存失敗：' + error.message, 'err'); return }
  }
  showModal.value = false
  toast.show(isEditing.value ? '已更新' : '已新增')
  await loadActivities()
}

async function removeMeeting(a: Activity) {
  if (!a.meeting_id) return
  if (!confirm(`確定刪除「${a.title}」這場例會？相關的出席記錄與預計出席報名也會一併刪除，無法復原。`)) return
  const { error } = await meetingsStore.remove(a.meeting_id)
  if (error) { toast.show('刪除失敗：' + error.message, 'err'); return }
  toast.show('已刪除')
  await loadActivities()
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function canEdit(a: Activity) {
  if (a.meeting_id) return canManageMeetings.value
  return canManage.value && a.organizing_club_id === auth.clubId
}

// 地區視角看全地區（含各社例會，供地區管理員總覽）；社端視角只查跟本社
// 有關的活動，即使查詢的人是地區管理員也一樣——不能只靠畫面過濾，見
// stores/activities.ts fetchAll() 的說明
function loadActivities() {
  return activitiesStore.fetchAll(auth.isDistrictAdminView ? null : auth.clubId)
}

onMounted(loadActivities)
// 使用者在同一頁切換「地區介面／本社」視角時（不會重新整理頁面）要跟著重查
watch(() => auth.isDistrictAdminView, loadActivities)
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>活動</h1>
      <button v-if="canManage || canManageMeetings" class="btn btn-gold" @click="openAdd">+ 新增</button>
    </div>

    <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:14px;">
      <div class="segmented">
        <button class="seg-btn" :class="{ active: filterCategory === 'all' }" @click="filterCategory = 'all'">全部類別</button>
        <button v-for="c in CATEGORIES" :key="c" class="seg-btn" :class="{ active: filterCategory === c }" @click="filterCategory = c">{{ c }}</button>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <div class="segmented">
          <button class="seg-btn" :class="{ active: filterTime === 'upcoming' }" @click="filterTime = 'upcoming'">即將到來</button>
          <button class="seg-btn" :class="{ active: filterTime === 'all' }" @click="filterTime = 'all'">全部時間</button>
          <button class="seg-btn" :class="{ active: filterTime === 'past' }" @click="filterTime = 'past'">已過期</button>
        </div>
        <div class="segmented">
          <button class="seg-btn" :class="{ active: filterStatus === 'all' }" @click="filterStatus = 'all'">全部狀態</button>
          <button class="seg-btn" :class="{ active: filterStatus === 'open' }" @click="filterStatus = 'open'">招募中</button>
          <button class="seg-btn" :class="{ active: filterStatus === 'closed' }" @click="filterStatus = 'closed'">已截止</button>
          <button class="seg-btn" :class="{ active: filterStatus === 'cancelled' }" @click="filterStatus = 'cancelled'">已取消</button>
        </div>
      </div>
    </div>

    <div class="tw">
      <table class="card-table">
        <thead class="th">
          <tr>
            <th>類別</th>
            <th>時間</th>
            <th>標題</th>
            <th>主辦社</th>
            <th>地點</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in filtered" :key="a.id">
            <td data-label="類別"><span class="bdg" :class="CATEGORY_BADGE[a.category]">{{ a.category }}</span></td>
            <td data-label="時間">{{ formatDateTime(a.start_at) }}</td>
            <td data-label="標題">
              <RouterLink :to="`/activities/${a.id}`" style="color:var(--navy); font-weight:600;">{{ a.title }}</RouterLink>
              <span v-if="a.status !== 'open'" class="bdg" :class="STATUS_BADGE[a.status]" style="margin-left:6px; font-size:10.5px; padding:2px 8px;">{{ STATUS_LABELS[a.status] }}</span>
            </td>
            <td data-label="主辦社">{{ a.host_name || a.clubs?.name || '-' }}</td>
            <td data-label="地點">{{ a.location || '-' }}</td>
            <td>
              <div style="display:flex; gap:6px;">
                <RouterLink :to="`/activities/${a.id}`" class="btn btn-g btn-sm">查看</RouterLink>
                <RouterLink v-if="a.meeting_id" :to="`/meetings/${a.meeting_id}/attendance`" class="btn btn-g btn-sm">出席記錄</RouterLink>
                <button v-if="canEdit(a)" class="btn btn-g btn-sm" @click="openEdit(a)">編輯</button>
                <button v-if="a.meeting_id && canManageMeetings" class="btn btn-red btn-sm" @click="removeMeeting(a)">刪除</button>
              </div>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="6" style="text-align:center; color:var(--muted);">查無活動</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="mo" @click.self="showModal = false">
      <div class="mb">
        <div class="mb-h">
          <h3>{{ isEditing ? '編輯' : '新增' }}{{ isMeetingForm ? '例會' : '活動' }}</h3>
          <button class="mb-close" @click="showModal = false">×</button>
        </div>
        <div class="mb-body">
          <div v-if="!isEditing">
            <label class="fl">類別</label>
            <div class="segmented">
              <button v-for="c in creatableCategories" :key="c" type="button" class="seg-btn" :class="{ active: pickedCategory === c }" @click="pickedCategory = c">{{ c }}</button>
            </div>
          </div>
          <div v-else-if="!isMeetingForm">
            <label class="fl">類別</label>
            <div class="segmented">
              <button v-for="c in NON_MEETING_CATEGORIES" :key="c" type="button" class="seg-btn" :class="{ active: pickedCategory === c }" @click="pickedCategory = c">{{ c }}</button>
            </div>
          </div>

          <template v-if="isMeetingForm">
            <div>
              <label class="fl">日期 *</label>
              <input v-model="meetingForm.date" type="date" class="fi" />
            </div>
            <div>
              <label class="fl">第幾次例會</label>
              <input v-model.number="meetingForm.session_no" type="number" class="fi" />
            </div>
            <div>
              <label class="fl">主題</label>
              <input v-model="meetingForm.title" class="fi" />
            </div>
            <div>
              <label class="fl">講者姓名</label>
              <input v-model="meetingForm.speaker_name" class="fi" />
            </div>
            <div>
              <label class="fl">講者職稱</label>
              <input v-model="meetingForm.speaker_title" class="fi" />
            </div>
            <div>
              <label class="fl">講者 Email</label>
              <input v-model="meetingForm.speaker_email" class="fi" />
            </div>
            <div>
              <label class="fl">講者電話</label>
              <input v-model="meetingForm.speaker_phone" class="fi" />
            </div>
            <div>
              <label class="fl">地點</label>
              <input v-model="meetingForm.venue" class="fi" />
            </div>
            <div>
              <label class="fl">備註</label>
              <input v-model="meetingForm.note" class="fi" />
            </div>
          </template>

          <template v-else>
            <div>
              <label class="fl">標題 *</label>
              <input v-model="activityForm.title" class="fi" />
            </div>
            <div>
              <label class="fl">主辦社 / 主辦單位</label>
              <input v-model="activityForm.host_name" class="fi" placeholder="留空預設顯示本社社名，友社／地區活動可填實際主辦單位" />
            </div>
            <div>
              <label class="fl">說明</label>
              <textarea v-model="activityForm.description" class="fi" style="min-height:80px;"></textarea>
            </div>
            <div>
              <label class="fl">地點</label>
              <input v-model="activityForm.location" class="fi" placeholder="場地名稱，例如：台北國賓大飯店" />
            </div>
            <div>
              <label class="fl">詳細地址</label>
              <input v-model="activityForm.address" class="fi" placeholder="完整地址，方便社友導航" />
            </div>
            <div>
              <label class="fl">活動時間 *</label>
              <input v-model="startLocal" type="datetime-local" class="fi" />
            </div>
            <div>
              <label class="fl">報名截止時間</label>
              <input v-model="deadlineLocal" type="datetime-local" class="fi" />
            </div>
            <div>
              <label class="fl">名額（留空 = 不限）</label>
              <input v-model.number="activityForm.capacity" type="number" min="1" class="fi" />
            </div>
            <div>
              <label class="fl">狀態</label>
              <select v-model="activityForm.status" class="fi">
                <option value="draft">草稿（僅主辦社看得到）</option>
                <option value="open">招募中</option>
                <option value="closed">已截止</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
            <div>
              <label class="fl">招募對象</label>
              <div class="segmented">
                <button type="button" class="seg-btn" :class="{ active: !activityForm.club_only }" @click="activityForm.club_only = false">全地區社友（可跨社報名）</button>
                <button type="button" class="seg-btn" :class="{ active: activityForm.club_only }" @click="activityForm.club_only = true">僅本社社友</button>
              </div>
            </div>
          </template>
        </div>
        <div class="mb-foot">
          <button class="btn btn-g" @click="showModal = false">取消</button>
          <button class="btn btn-gold" :disabled="saving" @click="save">儲存</button>
        </div>
      </div>
    </div>
  </div>
</template>
