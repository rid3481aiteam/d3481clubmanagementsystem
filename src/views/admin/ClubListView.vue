<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useClubStore } from '@/stores/club'
import type { Club } from '@/types'

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
const editing = ref<Club | null>(null)
const form = ref<Partial<Club>>(emptyForm())

function emptyForm(): Partial<Club> {
  return {
    name: '', zone: '', pres_name: null, sec_name: null, email: null,
    phone: null, addr: null, freq: null, meeting_time: null,
    venue: null, venue_tel: null, note: null,
  }
}

function openAdd() {
  editing.value = null
  form.value = emptyForm()
  showModal.value = true
}

function openEdit(c: Club) {
  editing.value = c
  form.value = { ...c }
  showModal.value = true
}

async function removeClub(c: Club) {
  const { rosterCount, accountCount } = await club.checkDeletable(c.id)
  if (accountCount > 0) {
    alert(`「${c.name}」已有 ${accountCount} 個帳號，請先到「帳號邀請 / 管理」停用或刪除該社所有帳號，才能刪除社團。`)
    return
  }
  const warn = rosterCount > 0
    ? `「${c.name}」已有 ${rosterCount} 筆社友名冊資料，刪除社團會一併清除該社的名冊／例會／出席紀錄，且無法復原。`
    : `「${c.name}」目前沒有任何名冊資料。`
  if (!confirm(`${warn}\n\n確定要刪除這個社團嗎？`)) return
  const { error } = await club.deleteClub(c.id)
  if (error) alert(error.message)
}

async function save() {
  if (!form.value.name?.trim() || !form.value.zone?.trim()) return
  if (!editing.value) {
    const inZone = club.allClubs.filter(c => c.zone === form.value.zone)
    form.value.sort_order = inZone.length ? Math.max(...inZone.map(c => c.sort_order)) + 1 : 1
  }
  await club.upsertClub(editing.value ? { id: editing.value.id, ...form.value } : form.value)
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
      <button class="btn btn-gold" @click="openAdd">+ 新增社團</button>
    </div>

    <div class="tw">
      <table>
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
              <td>
                <span class="order-btns">
                  <button class="order-btn" :disabled="i === 0" @click="moveClub(g.clubs, i, -1)">▲</button>
                  <button class="order-btn" :disabled="i === g.clubs.length - 1" @click="moveClub(g.clubs, i, 1)">▼</button>
                </span>
                {{ c.name }}
              </td>
              <td>{{ c.zone }}</td>
              <td>{{ c.pres_name || '-' }}</td>
              <td>{{ c.sec_name || '-' }}</td>
              <td>{{ c.email || '-' }}</td>
              <td>{{ c.phone || '-' }}</td>
              <td style="display:flex; gap:6px;">
                <RouterLink :to="`/admin/clubs/${c.id}`" class="btn btn-g btn-sm">查看社員</RouterLink>
                <button class="btn btn-g btn-sm" @click="openEdit(c)">編輯</button>
                <button class="btn btn-red btn-sm" @click="removeClub(c)">刪除</button>
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
          <h3>{{ editing ? '編輯社團' : '新增社團' }}</h3>
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
            <label class="fl">地址</label>
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
            <label class="fl">地點</label>
            <input v-model="form.venue" class="fi" />
          </div>
          <div>
            <label class="fl">地點電話</label>
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
