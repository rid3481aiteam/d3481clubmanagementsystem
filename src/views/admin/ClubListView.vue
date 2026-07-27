<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useClubStore } from '@/stores/club'
import { useAccountsStore } from '@/stores/accounts'
import type { Club } from '@/types'

const auth = useAuthStore()
const club = useClubStore()
const accounts = useAccountsStore()
const router = useRouter()

// 「通過審核」只看該社官方管理帳號（club_secretary/club_admin）是不是至少有一筆
// 已啟用，不含一般社友——一般社友的審核狀態改看展開後的申請/核准清單即可。
const clubAccountSummary = computed(() => {
  const map = new Map<string, { approved: boolean; officers: typeof accounts.managed; members: typeof accounts.members; pending: typeof accounts.pending }>()
  for (const c of club.allClubs) map.set(c.id, { approved: false, officers: [], members: [], pending: [] })
  for (const p of accounts.managed) {
    const entry = p.club_id ? map.get(p.club_id) : undefined
    if (!entry) continue
    entry.officers.push(p)
    if (p.is_active) entry.approved = true
  }
  for (const p of accounts.members) {
    const entry = p.club_id ? map.get(p.club_id) : undefined
    if (entry) entry.members.push(p)
  }
  for (const p of accounts.pending) {
    const entry = p.club_id ? map.get(p.club_id) : undefined
    if (entry) entry.pending.push(p)
  }
  return map
})

// 給 KPI 卡用：目前哪些社還有待審核申請人（不分社帳號/社友），點卡片直接
// 跳到帳號管理頁的「帳號審核」區塊，不用先進某一社的詳情頁才找得到入口。
const clubsWithPendingApplications = computed(() =>
  club.allClubs.filter(c => (clubAccountSummary.value.get(c.id)?.pending.length ?? 0) > 0)
)

const expandedClubs = ref(new Set<string>())
function toggleClubDetail(id: string) {
  const s = new Set(expandedClubs.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  expandedClubs.value = s
}

const ZONE_ORDER = [
  '第一分區', '第二分區', '第三分區', '第四分區', '第五分區',
  '第六分區', '第七分區', '第八分區', '第九分區', '第十分區', '第十一分區',
]

function zoneRank(zone: string) {
  const i = ZONE_ORDER.indexOf(zone)
  return i === -1 ? ZONE_ORDER.length : i
}

const groupedClubs = computed(() => {
  const groups = new Map<string, Club[]>()
  for (const c of club.allClubs) {
    const key = c.zone || '未分區'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(c)
  }
  return [...groups.entries()]
    .sort((a, b) => zoneRank(a[0]) - zoneRank(b[0]) || a[0].localeCompare(b[0]))
    .map(([zone, clubs]) => ({
      zone,
      clubs: clubs.slice().sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    }))
})

async function moveClub(group: Club[], index: number, dir: -1 | 1) {
  const target = index + dir
  if (target < 0 || target >= group.length) return
  await club.swapOrder(group[index], group[target])
}

const collapsedZones = ref(new Set<string>())
function toggleZone(zone: string) {
  const s = new Set(collapsedZones.value)
  if (s.has(zone)) s.delete(zone)
  else s.add(zone)
  collapsedZones.value = s
}

const showModal = ref(false)
const form = ref<Partial<Club>>(emptyForm())

function emptyForm(): Partial<Club> {
  return {
    name: '', zone: '', pres_name: null, sec_name: null, email: null,
    phone: null, addr: null, freq: null, meeting_time: null,
    venue: null, venue_tel: null, note: null,
  }
}

function openAdd() {
  form.value = emptyForm()
  showModal.value = true
}

async function save() {
  if (!form.value.name?.trim() || !form.value.zone?.trim()) return
  const inZone = club.allClubs.filter(c => c.zone === form.value.zone)
  form.value.sort_order = inZone.length ? Math.max(...inZone.map(c => c.sort_order)) + 1 : 1
  await club.upsertClub(form.value)
  showModal.value = false
}

onMounted(async () => {
  await club.fetchAll()
  if (auth.isDistrictView) {
    accounts.setScope(null)
    await Promise.all([accounts.fetchManaged(), accounts.fetchPending(), accounts.fetchMembers()])
  }
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>社團總覽</h1>
      <button v-if="auth.isDistrictAdminView" class="btn btn-gold" @click="openAdd">+ 新增社團</button>
    </div>

    <!-- /club/invite（帳號審核）路由只放行地區管理員，唯讀角色點了會被導回首頁，
         KPI 卡要跟著只給 isDistrictAdminView，不能沿用其他區塊的 isDistrictView -->
    <div v-if="auth.isDistrictAdminView" class="stat-grid" style="margin-bottom:16px;">
      <div
        class="stat-card clickable"
        :class="clubsWithPendingApplications.length ? 'c-gold' : ''"
        @click="router.push('/club/invite#account-review')"
      >
        <div class="stat-label">申請中的社</div>
        <div class="stat-value">{{ clubsWithPendingApplications.length }}</div>
        <div v-if="clubsWithPendingApplications.length" class="kpi-sub">
          {{ clubsWithPendingApplications.map(c => c.name).join('、') }}
        </div>
        <div v-else class="kpi-sub">目前沒有社在申請中</div>
      </div>
    </div>

    <div class="tw">
      <table class="card-table">
        <thead class="th">
          <tr>
            <th>社名</th>
            <th>分區</th>
            <th>社長</th>
            <th>執秘</th>
            <th>Email</th>
            <th>電話</th>
            <th v-if="auth.isDistrictView">審核狀態</th>
            <th v-if="auth.isDistrictView">社友申請</th>
            <th></th>
          </tr>
        </thead>
        <tbody v-for="g in groupedClubs" :key="g.zone">
          <tr class="zone-row" @click="toggleZone(g.zone)">
            <td :colspan="auth.isDistrictView ? 9 : 7">
              <span class="zone-chevron">{{ collapsedZones.has(g.zone) ? '▸' : '▾' }}</span>
              <strong>{{ g.zone }}</strong>
              <span style="color:var(--muted); font-weight:400;">（{{ g.clubs.length }} 社）</span>
            </td>
          </tr>
          <template v-if="!collapsedZones.has(g.zone)">
            <template v-for="(c, i) in g.clubs" :key="c.id">
            <tr>
              <td data-label="社名">
                <span v-if="auth.isDistrictAdminView" class="order-btns">
                  <button class="order-btn" :disabled="i === 0" @click="moveClub(g.clubs, i, -1)">▲</button>
                  <button class="order-btn" :disabled="i === g.clubs.length - 1" @click="moveClub(g.clubs, i, 1)">▼</button>
                </span>
                {{ c.name }}
              </td>
              <td data-label="分區">{{ c.zone }}</td>
              <td data-label="社長">{{ c.pres_name || '-' }}</td>
              <td data-label="執秘">{{ c.sec_name || '-' }}</td>
              <td data-label="Email">{{ c.email || '-' }}</td>
              <td data-label="電話">{{ c.phone || '-' }}</td>
              <td v-if="auth.isDistrictView" data-label="審核狀態">
                <span class="bdg" :class="clubAccountSummary.get(c.id)?.approved ? 'b-gr' : 'b-g'">
                  {{ clubAccountSummary.get(c.id)?.approved ? '已通過審核' : '尚未通過' }}
                </span>
              </td>
              <td v-if="auth.isDistrictView" data-label="社友申請">
                <button class="btn btn-g btn-sm" @click="toggleClubDetail(c.id)">
                  {{ (clubAccountSummary.get(c.id)?.members.length ?? 0) }} 位已核准
                  · {{ (clubAccountSummary.get(c.id)?.pending.length ?? 0) }} 位待審
                  {{ expandedClubs.has(c.id) ? '▴' : '▾' }}
                </button>
              </td>
              <td>
                <div style="display:flex; gap:6px;">
                  <RouterLink :to="`/admin/clubs/${c.id}`" class="btn btn-g btn-sm">查看社團資訊</RouterLink>
                  <RouterLink v-if="auth.isDistrictAdminView" :to="`/admin/clubs/${c.id}/edit`" class="btn btn-sky btn-sm">編輯</RouterLink>
                </div>
              </td>
            </tr>
            <tr v-if="auth.isDistrictView && expandedClubs.has(c.id)">
              <td :colspan="9" style="background:var(--bg);">
                <div class="club-detail-grid">
                  <div>
                    <strong>管理帳號</strong>
                    <span v-if="!clubAccountSummary.get(c.id)?.officers.length" style="color:var(--muted);">尚無</span>
                    <span v-for="o in clubAccountSummary.get(c.id)?.officers" :key="o.id" class="bdg" :class="o.is_active ? 'b-gr' : 'b-g'">{{ o.name }}</span>
                  </div>
                  <div>
                    <strong>已核准社友</strong>
                    <span v-if="!clubAccountSummary.get(c.id)?.members.length" style="color:var(--muted);">尚無</span>
                    <span v-for="m in clubAccountSummary.get(c.id)?.members" :key="m.id" class="bdg b-gr">{{ m.name }}</span>
                  </div>
                  <div>
                    <strong>待審核申請</strong>
                    <span v-if="!clubAccountSummary.get(c.id)?.pending.length" style="color:var(--muted);">尚無</span>
                    <span v-for="p in clubAccountSummary.get(c.id)?.pending" :key="p.id" class="bdg b-n">{{ p.name }}</span>
                  </div>
                </div>
              </td>
            </tr>
            </template>
          </template>
        </tbody>
        <tbody v-if="!club.allClubs.length">
          <tr>
            <td :colspan="auth.isDistrictView ? 9 : 7" style="text-align:center; color:var(--muted);">尚無社團資料</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="mo" @click.self="showModal = false">
      <div class="mb">
        <div class="mb-h">
          <h3>新增社團</h3>
          <button class="mb-close" @click="showModal = false">×</button>
        </div>
        <div class="mb-body">
          <div>
            <label class="fl">社名 *</label>
            <input v-model="form.name" class="fi" />
          </div>
          <div>
            <label class="fl">分區 *</label>
            <input v-model="form.zone" class="fi" placeholder="e.g. 第一分區" />
          </div>
          <div>
            <label class="fl">社長</label>
            <input v-model="form.pres_name" class="fi" />
          </div>
          <div>
            <label class="fl">執秘</label>
            <input v-model="form.sec_name" class="fi" />
          </div>
          <div>
            <label class="fl">Email</label>
            <input v-model="form.email" class="fi" />
          </div>
          <div>
            <label class="fl">電話</label>
            <input v-model="form.phone" class="fi" />
          </div>
          <div>
            <label class="fl">社辦公室地址</label>
            <input v-model="form.addr" class="fi" />
          </div>
          <div>
            <label class="fl">例會頻率</label>
            <input v-model="form.freq" class="fi" placeholder="e.g. 每週三" />
          </div>
          <div>
            <label class="fl">例會時間</label>
            <input v-model="form.meeting_time" class="fi" placeholder="e.g. 12:00" />
          </div>
          <div>
            <label class="fl">例會地點</label>
            <input v-model="form.venue" class="fi" />
          </div>
          <div>
            <label class="fl">例會地點電話</label>
            <input v-model="form.venue_tel" class="fi" />
          </div>
          <div>
            <label class="fl">備註</label>
            <input v-model="form.note" class="fi" />
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

<style scoped>
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
.order-btns {
  display: inline-flex;
  flex-direction: column;
  gap: 1px;
  vertical-align: middle;
  margin-right: 8px;
}
.order-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 3px;
  color: var(--muted);
  font-size: 8px;
  line-height: 1;
  padding: 1px 3px;
  cursor: pointer;
}
.order-btn:hover:not(:disabled) {
  color: var(--navy);
  border-color: var(--navy);
}
.order-btn:disabled {
  opacity: .3;
  cursor: default;
}
.club-detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
  padding: 12px 4px;
}
.club-detail-grid > div {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.club-detail-grid strong {
  width: 100%;
  font-size: 13px;
  color: var(--navy);
}
.stat-card.clickable {
  cursor: pointer;
  transition: transform .1s, box-shadow .15s;
}
.stat-card.clickable:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
.kpi-sub {
  font-size: 12px;
  color: var(--muted);
  margin-top: 6px;
}
</style>
