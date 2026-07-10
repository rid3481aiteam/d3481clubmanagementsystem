<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import * as XLSX from 'xlsx'
import { useClubStore } from '@/stores/club'
import { useGovernorAwardsStore } from '@/stores/governorAwards'
import {
  GOVERNOR_AWARD_LEVELS,
  GOVERNOR_AWARD_SECTIONS,
  GOVERNOR_AWARD_YEAR_TERM,
  getAwardLevel,
} from '@/data/governorAwardCriteria'
import type { Club, GovernorAwardApplication, GovernorAwardCriterion } from '@/types'

const club = useClubStore()
const awards = useGovernorAwardsStore()
const selectedClubId = ref<string | null>(null)

const appByClub = computed(() => {
  const map = new Map<string, GovernorAwardApplication>()
  for (const app of awards.allApplications) map.set(app.club_id, app)
  return map
})

const rows = computed(() =>
  club.allClubs.map(c => ({
    club: c,
    app: appByClub.value.get(c.id) ?? null,
  })),
)

const submittedCount = computed(() => rows.value.filter(row => row.app?.status === 'submitted').length)
const draftCount = computed(() => rows.value.filter(row => row.app?.status === 'draft').length)
const unstartedCount = computed(() => rows.value.filter(row => !row.app).length)
const avgScore = computed(() => {
  const submitted = rows.value.filter(row => row.app?.status === 'submitted' && row.app.total_score !== null)
  if (!submitted.length) return 0
  return Math.round((submitted.reduce((sum, row) => sum + (row.app?.total_score ?? 0), 0) / submitted.length) * 10) / 10
})

// 未送出（含草稿/未填寫）一律歸在「尚未達標」——等級是實際送出分數換算出來的達成狀態，還沒送出就談不上達成哪一級。
function levelForRow(row: { app: GovernorAwardApplication | null }) {
  return row.app?.status === 'submitted' ? getAwardLevel(row.app.total_score) : getAwardLevel(0)
}

const levelCounts = computed(() => {
  const counts = new Map(GOVERNOR_AWARD_LEVELS.map(level => [level.name, 0]))
  for (const row of rows.value) {
    const level = levelForRow(row)
    counts.set(level.name, (counts.get(level.name) ?? 0) + 1)
  }
  return counts
})

const ZONE_ORDER = [
  '第一分區', '第二分區', '第三分區', '第四分區', '第五分區',
  '第六分區', '第七分區', '第八分區', '第九分區', '第十分區', '第十一分區',
]
const zones = computed(() => {
  const present = new Set(club.allClubs.map(c => c.zone).filter(Boolean))
  return ZONE_ORDER.filter(z => present.has(z))
})

const zoneFilter = ref('')
const levelFilter = ref('')
const search = ref('')

const filteredRows = computed(() => {
  const keyword = search.value.trim()
  return rows.value.filter(row => {
    if (zoneFilter.value && row.club.zone !== zoneFilter.value) return false
    if (levelFilter.value && levelForRow(row).name !== levelFilter.value) return false
    if (keyword && !row.club.name.includes(keyword)) return false
    return true
  })
})

const selectedRow = computed(() => {
  if (!selectedClubId.value) return null
  return rows.value.find(row => row.club.id === selectedClubId.value) ?? null
})

function handleExport() {
  const exportRows = filteredRows.value.map(row => ({
    社名: row.club.name,
    分區: row.club.zone,
    組別: row.app?.group_type || '-',
    狀態: statusLabel(row.app),
    總分: row.app?.total_score ?? '-',
    等級: levelForRow(row).name,
    更新時間: formatDate(row.app?.updated_at),
  }))
  const sheet = XLSX.utils.json_to_sheet(exportRows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, '全區獎項達標')
  XLSX.writeFile(wb, `全區獎項達標_${GOVERNOR_AWARD_YEAR_TERM}.xlsx`)
}

function statusLabel(app: GovernorAwardApplication | null) {
  if (!app) return '未填寫'
  return app.status === 'submitted' ? '已送出' : '草稿'
}

function statusClass(app: GovernorAwardApplication | null) {
  if (!app) return 'b-g'
  return app.status === 'submitted' ? 'b-gr' : 'b-y'
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function criterionScore(app: GovernorAwardApplication, criterion: GovernorAwardCriterion) {
  return app.responses?.[criterion.key]?.score ?? null
}

function criterionNote(app: GovernorAwardApplication, criterion: GovernorAwardCriterion) {
  return app.responses?.[criterion.key]?.note ?? ''
}

function sectionScore(app: GovernorAwardApplication, sectionKey: string) {
  const section = GOVERNOR_AWARD_SECTIONS.find(item => item.key === sectionKey)
  if (!section) return 0
  return Math.round(
    section.criteria.reduce((sum, criterion) => sum + (Number(criterionScore(app, criterion)) || 0), 0) * 10,
  ) / 10
}

function selectClub(c: Club) {
  selectedClubId.value = c.id
}

onMounted(async () => {
  await Promise.all([club.fetchAll(), awards.fetchAll()])
  selectedClubId.value = rows.value.find(row => row.app)?.club.id ?? rows.value[0]?.club.id ?? null
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <div>
        <h1>總監獎項填報統整</h1>
        <div class="subline">{{ GOVERNOR_AWARD_YEAR_TERM }} 年度</div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-g" @click="handleExport">📊 匯出全區獎項達標Excel</button>
        <button class="btn btn-g" @click="awards.fetchAll()">重新整理</button>
      </div>
    </div>

    <div class="summary-grid">
      <div class="tw summary-card">
        <div class="summary-label">已送出</div>
        <div class="summary-value">{{ submittedCount }}</div>
      </div>
      <div class="tw summary-card">
        <div class="summary-label">草稿</div>
        <div class="summary-value">{{ draftCount }}</div>
      </div>
      <div class="tw summary-card">
        <div class="summary-label">未填寫</div>
        <div class="summary-value">{{ unstartedCount }}</div>
      </div>
      <div class="tw summary-card">
        <div class="summary-label">已送出平均分</div>
        <div class="summary-value">{{ avgScore }}</div>
      </div>
    </div>

    <div class="summary-grid">
      <div v-for="level in GOVERNOR_AWARD_LEVELS" :key="level.name" class="tw summary-card">
        <div class="summary-label">
          <span class="bdg" :class="level.badgeClass">{{ level.name }}</span>
        </div>
        <div class="summary-value">{{ levelCounts.get(level.name) ?? 0 }}</div>
        <div class="summary-sub" v-if="level.min > 0">≥ {{ level.min }} 分</div>
      </div>
    </div>

    <div class="filter-bar">
      <select v-model="zoneFilter" class="fi">
        <option value="">全部分區</option>
        <option v-for="z in zones" :key="z" :value="z">{{ z }}</option>
      </select>
      <select v-model="levelFilter" class="fi">
        <option value="">全部等級</option>
        <option v-for="level in GOVERNOR_AWARD_LEVELS" :key="level.name" :value="level.name">{{ level.name }}</option>
      </select>
      <input v-model="search" class="fi" placeholder="🔍 搜尋社名…" />
      <span class="filter-count">共 {{ filteredRows.length }} 社</span>
    </div>

    <div class="summary-layout">
      <div class="tw">
        <table class="card-table">
          <thead class="th">
            <tr>
              <th>社名</th>
              <th>分區</th>
              <th>組別</th>
              <th>狀態</th>
              <th>總分</th>
              <th>等級</th>
              <th>更新時間</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in filteredRows"
              :key="row.club.id"
              class="click-row"
              :class="{ selected: selectedClubId === row.club.id }"
              @click="selectClub(row.club)"
            >
              <td data-label="社名">{{ row.club.name }}</td>
              <td data-label="分區">{{ row.club.zone }}</td>
              <td data-label="組別">{{ row.app?.group_type || '-' }}</td>
              <td data-label="狀態"><span class="bdg" :class="statusClass(row.app)">{{ statusLabel(row.app) }}</span></td>
              <td data-label="總分">{{ row.app?.total_score ?? '-' }}</td>
              <td data-label="等級"><span class="bdg" :class="levelForRow(row).badgeClass">{{ levelForRow(row).name }}</span></td>
              <td data-label="更新時間">{{ formatDate(row.app?.updated_at) }}</td>
            </tr>
            <tr v-if="!filteredRows.length">
              <td colspan="7" style="text-align:center; color:var(--muted);">沒有符合條件的社</td>
            </tr>
          </tbody>
        </table>
      </div>

      <aside class="tw detail-panel">
        <template v-if="selectedRow">
          <div class="detail-head">
            <div>
              <h2>{{ selectedRow.club.name }}</h2>
              <div class="subline">{{ selectedRow.club.zone }}</div>
            </div>
            <span class="bdg" :class="statusClass(selectedRow.app)">{{ statusLabel(selectedRow.app) }}</span>
          </div>

          <template v-if="selectedRow.app">
            <div class="detail-meta">
              <div>
                <span>組別</span>
                <strong>{{ selectedRow.app.group_type || '-' }}</strong>
              </div>
              <div>
                <span>社員數</span>
                <strong>{{ selectedRow.app.member_count ?? '-' }}</strong>
              </div>
              <div>
                <span>總分</span>
                <strong>{{ selectedRow.app.total_score }}</strong>
              </div>
              <div>
                <span>等級</span>
                <strong><span class="bdg" :class="levelForRow(selectedRow).badgeClass">{{ levelForRow(selectedRow).name }}</span></strong>
              </div>
              <div>
                <span>送出時間</span>
                <strong>{{ formatDate(selectedRow.app.submitted_at) }}</strong>
              </div>
            </div>

            <section v-for="section in GOVERNOR_AWARD_SECTIONS" :key="section.key" class="detail-section">
              <h3>{{ section.title }} <span>小計 {{ sectionScore(selectedRow.app, section.key) }}</span></h3>
              <div
                v-for="criterion in section.criteria"
                :key="criterion.key"
                class="criterion-row"
                :class="{ filled: criterionScore(selectedRow.app, criterion) || criterionNote(selectedRow.app, criterion) }"
              >
                <div class="criterion-main">
                  <strong>{{ criterion.itemNo }}. {{ criterion.category }}</strong>
                  <p>{{ criterion.description }}</p>
                  <p v-if="criterionNote(selectedRow.app, criterion)" class="criterion-note">
                    {{ criterionNote(selectedRow.app, criterion) }}
                  </p>
                </div>
                <div class="criterion-score">{{ criterionScore(selectedRow.app, criterion) ?? '-' }}</div>
              </div>
            </section>

            <section class="detail-section">
              <h3>其他</h3>
              <p class="other-text">{{ selectedRow.app.other_text || '未填寫' }}</p>
            </section>
          </template>

          <div v-else class="empty-detail">此社尚未開始填寫。</div>
        </template>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.subline {
  margin-top: 2px;
  color: var(--muted);
  font-size: 13px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.summary-card {
  padding: 16px;
}

.summary-label {
  color: var(--muted);
  font-size: 12px;
  margin-bottom: 6px;
}

.summary-value {
  color: var(--navy);
  font-size: 24px;
  font-weight: 700;
}

.summary-sub {
  margin-top: 4px;
  font-size: 11px;
  color: var(--muted);
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.filter-bar .fi {
  width: auto;
  min-width: 140px;
}

.filter-count {
  font-size: 11px;
  color: var(--muted);
}

.summary-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(360px, .95fr);
  gap: 18px;
  align-items: start;
}

.click-row {
  cursor: pointer;
}

.click-row.selected td {
  background: var(--gold-p);
}

.detail-panel {
  padding: 16px;
  max-height: calc(100vh - 150px);
  overflow: auto;
}

.detail-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.detail-head h2 {
  color: var(--navy);
  font-size: 18px;
}

.detail-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}

.detail-meta div {
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 10px;
}

.detail-meta span {
  display: block;
  color: var(--muted);
  font-size: 12px;
  margin-bottom: 2px;
}

.detail-meta strong {
  color: var(--navy);
}

.detail-section {
  margin-top: 18px;
}

.detail-section h3 {
  color: var(--navy);
  font-size: 14px;
  margin-bottom: 8px;
}

.detail-section h3 span {
  color: var(--muted);
  font-weight: 500;
}

.criterion-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 46px;
  gap: 10px;
  padding: 10px 0;
  border-top: 1px solid var(--border);
  opacity: .72;
}

.criterion-row.filled {
  opacity: 1;
}

.criterion-main strong {
  color: var(--text);
  font-size: 13px;
}

.criterion-main p {
  margin-top: 3px;
  color: var(--muted);
  font-size: 12px;
}

.criterion-main .criterion-note {
  color: var(--text);
  white-space: pre-line;
}

.criterion-score {
  color: var(--navy);
  font-weight: 700;
  text-align: right;
}

.empty-detail,
.other-text {
  color: var(--muted);
  white-space: pre-line;
}

@media (max-width: 1100px) {
  .summary-layout {
    grid-template-columns: 1fr;
  }

  .detail-panel {
    max-height: none;
  }
}
</style>
