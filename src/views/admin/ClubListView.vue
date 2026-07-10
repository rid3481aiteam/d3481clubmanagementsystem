<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useClubStore } from '@/stores/club'
import type { Club } from '@/types'

const auth = useAuthStore()
const club = useClubStore()

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

onMounted(() => {
  club.fetchAll()
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>社團總覽</h1>
      <button v-if="auth.isDistrictAdminView" class="btn btn-gold" @click="openAdd">+ 新增社團</button>
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
            <th></th>
          </tr>
        </thead>
        <tbody v-for="g in groupedClubs" :key="g.zone">
          <tr class="zone-row" @click="toggleZone(g.zone)">
            <td colspan="7">
              <span class="zone-chevron">{{ collapsedZones.has(g.zone) ? '▸' : '▾' }}</span>
              <strong>{{ g.zone }}</strong>
              <span style="color:var(--muted); font-weight:400;">（{{ g.clubs.length }} 社）</span>
            </td>
          </tr>
          <template v-if="!collapsedZones.has(g.zone)">
            <tr v-for="(c, i) in g.clubs" :key="c.id">
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
              <td style="display:flex; gap:6px;">
                <RouterLink :to="`/admin/clubs/${c.id}`" class="btn btn-g btn-sm">查看社團資訊</RouterLink>
                <RouterLink v-if="auth.isDistrictAdminView" :to="`/admin/clubs/${c.id}/edit`" class="btn btn-sky btn-sm">編輯</RouterLink>
              </td>
            </tr>
          </template>
        </tbody>
        <tbody v-if="!club.allClubs.length">
          <tr>
            <td colspan="7" style="text-align:center; color:var(--muted);">尚無社團資料</td>
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
</style>
