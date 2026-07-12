<script setup lang="ts">
import { onMounted, watch, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAnnouncementsStore } from '@/stores/announcements'
import { useDashboardStore } from '@/stores/dashboard'
import { useGovernorAwardsStore } from '@/stores/governorAwards'
import { useClubTodosStore } from '@/stores/clubTodos'
import { useMemberCareStore } from '@/stores/memberCare'
import { GOVERNOR_AWARD_YEAR_TERM, getAwardLevel } from '@/data/governorAwardCriteria'
import type { ClubTodo, TodoLevel, CareType, MemberAttendanceRate } from '@/types'

const router = useRouter()
const auth = useAuthStore()
const announcements = useAnnouncementsStore()
const dashboard = useDashboardStore()
const awards = useGovernorAwardsStore()
const todos = useClubTodosStore()
const care = useMemberCareStore()

const canManageTodos = computed(() => auth.role === 'club_admin' || auth.role === 'club_secretary')

const CARE_TYPES: CareType[] = ['生日', '生病', '喜事', '喪事', '其他']

const showCareModal = ref(false)
const careTarget = ref<MemberAttendanceRate | null>(null)
const careForm = ref({ care_type: '其他' as CareType, care_date: '', note: '' })
const careError = ref('')

// 比照 vivian 檔案：出席率 <60% 標紅「需關懷」，60~79% 標黃「注意」
function careLevel(m: MemberAttendanceRate) {
  return m.rate !== null && m.rate < 60
    ? { label: '🚨 需關懷', badge: 'b-r' }
    : { label: '⚠️ 注意', badge: 'b-y' }
}

function openCare(m: MemberAttendanceRate) {
  careTarget.value = m
  careForm.value = { care_type: '其他', care_date: new Date().toISOString().slice(0, 10), note: `出席率偏低（${m.rate}%），已聯繫關懷` }
  careError.value = ''
  showCareModal.value = true
}

async function saveCare() {
  if (!careTarget.value || !auth.clubId) return
  const { error } = await care.insert({
    club_id: auth.clubId,
    member_id: careTarget.value.member_id,
    care_type: careForm.value.care_type,
    care_date: careForm.value.care_date,
    note: careForm.value.note.trim() || null,
  })
  if (error) {
    careError.value = error.message
    return
  }
  showCareModal.value = false
}

const LEVEL_ICON: Record<TodoLevel, string> = { navy: '🔵', gold: '🟡', red: '🔴' }
const LEVEL_BADGE: Record<TodoLevel, string> = { navy: 'b-n', gold: 'b-y', red: 'b-r' }

// 比照 vivian 檔案：有截止日期時，緊急程度由截止日期動態換算，蓋過手動選的等級
function todoDisplay(t: ClubTodo) {
  let level: TodoLevel = t.level
  let subText = t.sub || ''
  if (t.due_date) {
    const days = Math.ceil((new Date(t.due_date).getTime() - Date.now()) / 86400000)
    const extra = subText ? ` · ${subText}` : ''
    if (days < 0) { level = 'red'; subText = `⚠️ 已逾期 ${-days} 天${extra}` }
    else if (days === 0) { level = 'red'; subText = `📅 今天到期${extra}` }
    else if (days <= 3) { level = 'red'; subText = `📅 剩 ${days} 天${extra}` }
    else if (days <= 7) { level = 'gold'; subText = `📅 剩 ${days} 天${extra}` }
    else { subText = `📅 ${t.due_date}${extra}` }
  }
  return { level, subText }
}

const showTodoModal = ref(false)
const editingTodo = ref<ClubTodo | null>(null)
const todoForm = ref({ title: '', sub: '', due_date: '', level: 'navy' as TodoLevel })
const todoError = ref('')

function openAddTodo() {
  editingTodo.value = null
  todoForm.value = { title: '', sub: '', due_date: '', level: 'navy' }
  todoError.value = ''
  showTodoModal.value = true
}

function openEditTodo(t: ClubTodo) {
  editingTodo.value = t
  todoForm.value = { title: t.title, sub: t.sub || '', due_date: t.due_date || '', level: t.level }
  todoError.value = ''
  showTodoModal.value = true
}

async function saveTodo() {
  const title = todoForm.value.title.trim()
  if (!title) {
    todoError.value = '請填寫任務名稱'
    return
  }
  if (!auth.clubId) return
  const payload = {
    title,
    sub: todoForm.value.sub.trim() || null,
    due_date: todoForm.value.due_date || null,
    level: todoForm.value.level,
  }
  const { error } = editingTodo.value
    ? await todos.update(editingTodo.value.id, auth.clubId, payload)
    : await todos.insert({ ...payload, club_id: auth.clubId }, auth.user?.id ?? null)
  if (error) {
    todoError.value = error.message
    return
  }
  showTodoModal.value = false
}

async function deleteTodo() {
  if (!editingTodo.value || !auth.clubId) return
  if (!confirm(`確定刪除任務「${editingTodo.value.title}」？`)) return
  const { error } = await todos.remove(editingTodo.value.id, auth.clubId)
  if (error) {
    todoError.value = error.message
    return
  }
  showTodoModal.value = false
}

function formatDate(value: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
}

function loadForCurrentView() {
  if (auth.isDistrictView) {
    dashboard.loadDistrict()
  } else {
    dashboard.load(auth.clubId)
    if (auth.clubId) {
      awards.fetchForClub(auth.clubId)
      todos.fetchAll(auth.clubId)
    }
  }
}

onMounted(loadForCurrentView)
watch(() => auth.isDistrictView, loadForCurrentView)

const clubAwardLevel = computed(() => {
  return awards.current?.status === 'submitted' ? getAwardLevel(awards.current.total_score) : getAwardLevel(0)
})

const ZONE_ORDER = [
  '第一分區', '第二分區', '第三分區', '第四分區', '第五分區',
  '第六分區', '第七分區', '第八分區', '第九分區', '第十分區', '第十一分區',
]

function zoneRank(zone: string) {
  const i = ZONE_ORDER.indexOf(zone)
  return i === -1 ? ZONE_ORDER.length : i
}

const groupedDistrictStats = computed(() => {
  const groups = new Map<string, typeof dashboard.districtClubStats>()
  for (const row of dashboard.districtClubStats) {
    if (!groups.has(row.zone)) groups.set(row.zone, [])
    groups.get(row.zone)!.push(row)
  }
  return [...groups.entries()]
    .sort((a, b) => zoneRank(a[0]) - zoneRank(b[0]) || a[0].localeCompare(b[0]))
    .map(([zone, clubs]) => ({ zone, clubs }))
})

const collapsedZones = ref(new Set<string>())
function toggleZone(zone: string) {
  const s = new Set(collapsedZones.value)
  if (s.has(zone)) s.delete(zone)
  else s.add(zone)
  collapsedZones.value = s
}
</script>

<template>
  <div class="page">
    <div class="ph">
      <div>
        <h1>儀表板</h1>
        <div v-if="!auth.isDistrictView" class="ph-sub">{{ auth.clubName || '本社' }} · {{ GOVERNOR_AWARD_YEAR_TERM }} 年度</div>
      </div>
    </div>

    <template v-if="auth.isDistrictView">
      <div class="stat-grid" style="margin-bottom:24px;">
        <div class="stat-card">
          <div class="stat-label">當月例會舉行數量</div>
          <div class="stat-value">{{ dashboard.meetingCount }}</div>
        </div>
        <div class="stat-card c-gold">
          <div class="stat-label">全區社團數</div>
          <div class="stat-value">{{ dashboard.districtClubStats.length }}</div>
        </div>
      </div>

      <div>
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <h2 style="font-size:14px; font-weight:700; color:var(--navy);">各社出席率 / 入社退社人數（本扶輪年度）</h2>
          <RouterLink to="/admin/attendance" class="btn btn-g btn-sm">查看各月出席率 →</RouterLink>
        </div>
        <div class="tw">
          <table class="card-table">
            <thead class="th">
              <tr>
                <th>社名</th>
                <th>出席率</th>
                <th>申請入社</th>
                <th>退社</th>
              </tr>
            </thead>
            <tbody v-for="g in groupedDistrictStats" :key="g.zone">
              <tr class="zone-row" @click="toggleZone(g.zone)">
                <td colspan="4">
                  <span class="zone-chevron">{{ collapsedZones.has(g.zone) ? '▸' : '▾' }}</span>
                  <strong>{{ g.zone }}</strong>
                  <span style="color:var(--muted); font-weight:400;">（{{ g.clubs.length }} 社）</span>
                </td>
              </tr>
              <template v-if="!collapsedZones.has(g.zone)">
                <tr v-for="row in g.clubs" :key="row.clubId">
                  <td data-label="社名">{{ row.clubName }}</td>
                  <td data-label="出席率">
                    <div style="display:flex; align-items:center; gap:8px; min-width:120px;">
                      <span class="bdg" :class="row.rate !== null && row.rate < 75 ? 'b-r' : 'b-gr'">
                        {{ row.rate !== null ? row.rate + '%' : '-' }}
                      </span>
                      <div v-if="row.rate !== null" class="bar-track" style="flex:1;">
                        <div class="bar-fill" :style="{ width: row.rate + '%' }"></div>
                      </div>
                    </div>
                  </td>
                  <td data-label="申請入社">{{ row.joinedCount }}</td>
                  <td data-label="退社">{{ row.resignedCount }}</td>
                </tr>
              </template>
            </tbody>
            <tbody v-if="!dashboard.districtClubStats.length">
              <tr>
                <td colspan="4" style="text-align:center; color:var(--muted);">尚無社團資料</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="stat-grid" style="margin-bottom:24px;">
      <div class="stat-card clickable" @click="router.push('/meetings')">
        <div class="stat-label">本月例會數</div>
        <div class="stat-value">{{ dashboard.meetingCount }}</div>
      </div>
      <div class="stat-card c-sky clickable" @click="router.push('/attendance/monthly')">
        <div class="stat-label">本月出席率</div>
        <div class="stat-value">{{ dashboard.monthlyRate !== null ? dashboard.monthlyRate + '%' : '-' }}</div>
        <div v-if="dashboard.monthlyRate !== null" class="bar-track" style="margin-top:10px;">
          <div class="bar-fill" :style="{ width: dashboard.monthlyRate + '%' }"></div>
        </div>
      </div>
      <div class="stat-card c-gold clickable" @click="router.push('/roster')">
        <div class="stat-label">社友人數</div>
        <div class="stat-value">{{ dashboard.memberCount }}</div>
      </div>
      <div class="stat-card c-green clickable" @click="router.push('/club/governor-award')">
        <div class="stat-label">總監獎項等級</div>
        <div class="stat-value"><span class="bdg" :class="clubAwardLevel.badgeClass">{{ clubAwardLevel.name }}</span></div>
      </div>
      </div>

      <div v-if="auth.clubId" style="margin-bottom:16px;">
        <RouterLink to="/attendance/monthly" class="btn btn-g btn-sm">查看歷月出席率 →</RouterLink>
      </div>

      <div v-if="auth.clubId" style="margin-bottom:24px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <h2 style="font-size:14px; font-weight:700; color:var(--navy);">🤝 需關懷社友</h2>
          <span v-if="dashboard.needsCare.length" style="font-size:11px; color:var(--muted);">{{ dashboard.needsCare.length }}人</span>
        </div>
        <div class="tw">
          <div v-if="dashboard.needsCare.length" class="care-list">
            <div v-for="m in dashboard.needsCare" :key="m.member_id" class="care-item">
              <div class="care-body">
                <span class="care-name">{{ m.member_name }}</span>
                <span class="bdg care-badge" :class="careLevel(m).badge">{{ careLevel(m).label }} {{ m.rate }}%</span>
              </div>
              <button v-if="canManageTodos" class="btn btn-g btn-sm" @click="openCare(m)">✏️ 記錄</button>
            </div>
          </div>
          <div v-else style="padding:18px; text-align:center; color:var(--green);">
            ✅ 全體出席狀況良好
          </div>
        </div>
      </div>

      <div v-if="auth.clubId" style="margin-bottom:24px;">
      <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">地區公告欄</h2>
      <div class="tw">
        <div v-if="announcements.districtAnnouncements.length" class="announcement-list">
          <article v-for="item in announcements.districtAnnouncements" :key="item.id" class="announcement-item">
            <div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.body }}</p>
            </div>
            <time>{{ formatDate(item.published_at) }}</time>
          </article>
        </div>
        <div v-else style="padding:18px; text-align:center; color:var(--muted);">
          目前沒有地區公告
        </div>
      </div>
      </div>

      <div v-if="auth.clubId" style="margin-bottom:24px;">
      <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">社內公告欄</h2>
      <div class="tw">
        <div v-if="announcements.clubAnnouncements.length" class="announcement-list">
          <article v-for="item in announcements.clubAnnouncements" :key="item.id" class="announcement-item">
            <div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.body }}</p>
            </div>
            <time>{{ formatDate(item.published_at) }}</time>
          </article>
        </div>
        <div v-else style="padding:18px; text-align:center; color:var(--muted);">
          目前沒有社內公告
        </div>
      </div>
      </div>

      <div v-if="auth.clubId" style="margin-bottom:24px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <h2 style="font-size:14px; font-weight:700; color:var(--navy);">⏰ 待辦提醒</h2>
          <button v-if="canManageTodos" class="btn btn-gold btn-sm" @click="openAddTodo">+ 新增任務</button>
        </div>
        <div class="tw">
          <div v-if="todos.todos.length" class="todo-list">
            <div
              v-for="t in todos.todos"
              :key="t.id"
              class="todo-item"
              :class="{ clickable: canManageTodos }"
              @click="canManageTodos && openEditTodo(t)"
            >
              <span class="todo-icon">{{ LEVEL_ICON[todoDisplay(t).level] }}</span>
              <div class="todo-body">
                <div class="todo-title">{{ t.title }}</div>
                <div v-if="todoDisplay(t).subText" class="todo-sub" :class="LEVEL_BADGE[todoDisplay(t).level] === 'b-r' ? 'urgent' : ''">
                  {{ todoDisplay(t).subText }}
                </div>
              </div>
            </div>
          </div>
          <div v-else style="padding:18px; text-align:center; color:var(--muted);">
            目前沒有待辦任務
          </div>
        </div>
      </div>

      <div>
        <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">待追蹤潛在社友</h2>
        <div class="tw">
          <table class="card-table">
            <thead class="th">
              <tr>
                <th>姓名</th>
                <th>追蹤日</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in dashboard.followUps" :key="p.id">
                <td data-label="姓名">{{ p.name }}</td>
                <td data-label="追蹤日">{{ p.follow_up_date || '-' }}</td>
              </tr>
              <tr v-if="!dashboard.followUps.length">
                <td colspan="2" style="text-align:center; color:var(--muted);">目前無待追蹤名單</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <div v-if="showTodoModal" class="mo" @click.self="showTodoModal = false">
      <div class="mb">
        <div class="mb-h">
          <h3>{{ editingTodo ? '編輯待辦任務' : '+ 新增待辦任務' }}</h3>
          <button class="mb-close" @click="showTodoModal = false">×</button>
        </div>
        <div class="mb-body">
          <p v-if="todoError" style="color:var(--red); font-size:12px; margin-bottom:10px;">{{ todoError }}</p>
          <div>
            <label class="fl">任務名稱 *</label>
            <input v-model="todoForm.title" class="fi" placeholder="例：聯繫下次例會主講人" />
          </div>
          <div>
            <label class="fl">說明（選填）</label>
            <input v-model="todoForm.sub" class="fi" placeholder="例：王教授，0912-345-678" />
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <label class="fl">截止日期</label>
              <input v-model="todoForm.due_date" type="date" class="fi" />
            </div>
            <div>
              <label class="fl">緊急程度</label>
              <select v-model="todoForm.level" class="fi">
                <option value="navy">🔵 一般</option>
                <option value="gold">🟡 提醒</option>
                <option value="red">🔴 緊急</option>
              </select>
            </div>
          </div>
        </div>
        <div class="mb-foot">
          <button v-if="editingTodo" class="btn btn-red" @click="deleteTodo">🗑 刪除</button>
          <button class="btn btn-g" @click="showTodoModal = false">取消</button>
          <button class="btn btn-gold" @click="saveTodo">💾 儲存</button>
        </div>
      </div>
    </div>

    <div v-if="showCareModal" class="mo" @click.self="showCareModal = false">
      <div class="mb">
        <div class="mb-h">
          <h3>✏️ 記錄關懷：{{ careTarget?.member_name }}</h3>
          <button class="mb-close" @click="showCareModal = false">×</button>
        </div>
        <div class="mb-body">
          <p v-if="careError" style="color:var(--red); font-size:12px; margin-bottom:10px;">{{ careError }}</p>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <label class="fl">類型</label>
              <select v-model="careForm.care_type" class="fi">
                <option v-for="t in CARE_TYPES" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
            <div>
              <label class="fl">日期</label>
              <input v-model="careForm.care_date" type="date" class="fi" />
            </div>
          </div>
          <div>
            <label class="fl">備註</label>
            <input v-model="careForm.note" class="fi" />
          </div>
        </div>
        <div class="mb-foot">
          <button class="btn btn-g" @click="showCareModal = false">取消</button>
          <button class="btn btn-gold" @click="saveCare">💾 儲存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ph-sub {
  font-size: 12px;
  color: var(--muted);
  margin-top: 3px;
}

.stat-card.clickable {
  cursor: pointer;
  transition: transform .1s, box-shadow .15s;
}

.todo-list {
  display: grid;
}

.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-item.clickable {
  cursor: pointer;
}

.todo-item.clickable:hover {
  background: var(--bg);
}

.todo-icon {
  font-size: 13px;
  line-height: 1.6;
}

.todo-body {
  min-width: 0;
}

.todo-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--navy);
}

.todo-sub {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}

.todo-sub.urgent {
  color: var(--red);
  font-weight: 600;
}

.stat-card.clickable:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.care-list {
  display: grid;
}

.care-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
}

.care-item:last-child {
  border-bottom: none;
}

.care-body {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.care-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}

.care-badge {
  font-size: 11px;
  white-space: nowrap;
}

.zone-row {
  cursor: pointer;
  background: var(--gold-p);
}
.zone-row:hover td {
  background: var(--gold-p);
}
.zone-row td {
  font-size: 13px;
  color: var(--navy);
  padding: 8px 14px;
}
.zone-chevron {
  display: inline-block;
  width: 14px;
  color: var(--muted);
}

.announcement-list {
  display: grid;
}

.announcement-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.announcement-item:last-child {
  border-bottom: none;
}

.announcement-item h3 {
  font-size: 14px;
  color: var(--navy);
  margin-bottom: 4px;
}

.announcement-item p {
  color: var(--text);
  white-space: pre-line;
}

.announcement-item time {
  font-size: 12px;
  color: var(--muted);
}

@media (max-width: 700px) {
  .announcement-item {
    grid-template-columns: 1fr;
  }
}
</style>
