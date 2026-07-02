<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGovernorAwardsStore, type GovernorAwardDraft } from '@/stores/governorAwards'
import {
  GOVERNOR_AWARD_OTHER_PROMPT,
  GOVERNOR_AWARD_SECTIONS,
  GOVERNOR_AWARD_YEAR_TERM,
} from '@/data/governorAwardCriteria'

const auth = useAuthStore()
const awards = useGovernorAwardsStore()
const saving = ref(false)
const draft = ref<GovernorAwardDraft>(blankDraft())

function blankDraft(): GovernorAwardDraft {
  return {
    group_type: null,
    member_count: null,
    responses: Object.fromEntries(
      GOVERNOR_AWARD_SECTIONS.flatMap(section =>
        section.criteria.map(criterion => [criterion.key, { score: null, note: '' }]),
      ),
    ),
    other_text: '',
  }
}

function loadDraftFromStore() {
  draft.value = {
    group_type: awards.currentDraft.group_type,
    member_count: awards.currentDraft.member_count,
    responses: structuredClone(awards.currentDraft.responses),
    other_text: awards.currentDraft.other_text,
  }
}

const totalScore = computed(() => awards.computeTotal(draft.value.responses))
const completedCount = computed(() =>
  Object.values(draft.value.responses).filter(item => Number(item.score) > 0 || item.note.trim()).length,
)
const criterionCount = computed(() =>
  GOVERNOR_AWARD_SECTIONS.reduce((sum, section) => sum + section.criteria.length, 0),
)
const isSubmitted = computed(() => awards.current?.status === 'submitted')

function sectionScore(sectionKey: string) {
  const section = GOVERNOR_AWARD_SECTIONS.find(item => item.key === sectionKey)
  if (!section) return 0
  return awards.computeTotal(Object.fromEntries(section.criteria.map(c => [c.key, draft.value.responses[c.key]])))
}

async function save(status: 'draft' | 'submitted') {
  if (!auth.clubId || saving.value) return
  saving.value = true
  const { error } = await awards.saveForClub(auth.clubId, auth.user?.id ?? null, draft.value, status)
  saving.value = false
  if (error) {
    alert(error.message)
    return
  }
  loadDraftFromStore()
  alert(status === 'submitted' ? '已送出總監獎項申請表' : '已儲存草稿')
}

onMounted(async () => {
  if (!auth.clubId) return
  await awards.fetchForClub(auth.clubId)
  loadDraftFromStore()
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <div>
        <h1>總監獎項申請表</h1>
        <div class="subline">{{ GOVERNOR_AWARD_YEAR_TERM }} 年度 · {{ auth.clubName || '本社' }}</div>
      </div>
      <div class="actions">
        <button class="btn btn-g" :disabled="saving" @click="save('draft')">儲存草稿</button>
        <button class="btn btn-gold" :disabled="saving" @click="save('submitted')">送出申請</button>
      </div>
    </div>

    <div class="summary-grid">
      <div class="tw summary-card">
        <div class="summary-label">填寫狀態</div>
        <div class="summary-value">
          <span class="bdg" :class="isSubmitted ? 'b-gr' : 'b-g'">{{ isSubmitted ? '已送出' : '草稿' }}</span>
        </div>
      </div>
      <div class="tw summary-card">
        <div class="summary-label">已填項目</div>
        <div class="summary-value">{{ completedCount }} / {{ criterionCount }}</div>
      </div>
      <div class="tw summary-card">
        <div class="summary-label">目前總分</div>
        <div class="summary-value">{{ totalScore }}</div>
      </div>
    </div>

    <div class="tw meta-panel">
      <div>
        <label class="fl">參賽組別</label>
        <select v-model="draft.group_type" class="fi">
          <option :value="null">請選擇</option>
          <option value="A">A 組：26 人（含）以上</option>
          <option value="B">B 組：25 人（含）以下</option>
        </select>
      </div>
      <div>
        <label class="fl">2026/7/1 社員人數</label>
        <input v-model.number="draft.member_count" type="number" min="0" class="fi" />
      </div>
    </div>

    <section v-for="section in GOVERNOR_AWARD_SECTIONS" :key="section.key" class="award-section">
      <div class="section-head">
        <h2>{{ section.title }}</h2>
        <span class="bdg b-n">小計 {{ sectionScore(section.key) }}</span>
      </div>
      <div class="tw">
        <table class="award-table">
          <thead class="th">
            <tr>
              <th class="col-no">項次</th>
              <th class="col-category">項目</th>
              <th>目標說明</th>
              <th class="col-score">達成分數</th>
              <th class="col-note">說明</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="criterion in section.criteria" :key="criterion.key">
              <td>{{ criterion.itemNo }}</td>
              <td>{{ criterion.category }}</td>
              <td>
                <div>{{ criterion.description }}</div>
                <div v-if="criterion.referenceScore" class="reference-score">參考 {{ criterion.referenceScore }} 分</div>
              </td>
              <td>
                <input
                  v-model.number="draft.responses[criterion.key].score"
                  type="number"
                  min="0"
                  step="0.5"
                  class="fi score-input"
                />
              </td>
              <td>
                <textarea
                  v-model="draft.responses[criterion.key].note"
                  class="fi note-input"
                  placeholder="達成時間、人數及概況"
                ></textarea>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="award-section">
      <div class="section-head">
        <h2>其他</h2>
        <span class="bdg b-g">{{ draft.other_text.length }} / 200 字</span>
      </div>
      <div class="tw other-panel">
        <label class="fl">{{ GOVERNOR_AWARD_OTHER_PROMPT }}</label>
        <textarea v-model="draft.other_text" maxlength="200" class="fi other-input"></textarea>
      </div>
    </section>
  </div>
</template>

<style scoped>
.subline {
  margin-top: 2px;
  color: var(--muted);
  font-size: 13px;
}

.actions {
  display: flex;
  gap: 8px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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

.meta-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 16px;
  margin-bottom: 22px;
}

.award-section {
  margin-bottom: 24px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.section-head h2 {
  color: var(--navy);
  font-size: 15px;
}

.award-table {
  min-width: 1120px;
}

.col-no {
  width: 56px;
}

.col-category {
  width: 180px;
}

.col-score {
  width: 110px;
}

.col-note {
  width: 280px;
}

.reference-score {
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
}

.score-input {
  width: 86px;
}

.note-input {
  min-height: 72px;
  resize: vertical;
}

.other-panel {
  padding: 16px;
}

.other-input {
  min-height: 120px;
  resize: vertical;
}

@media (max-width: 760px) {
  .ph {
    align-items: flex-start;
  }

  .actions,
  .meta-panel {
    grid-template-columns: 1fr;
    width: 100%;
  }

  .actions {
    flex-direction: column;
  }
}
</style>
