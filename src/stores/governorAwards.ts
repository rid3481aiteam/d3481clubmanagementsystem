import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { GOVERNOR_AWARD_SECTIONS, GOVERNOR_AWARD_YEAR_TERM } from '@/data/governorAwardCriteria'
import type {
  GovernorAwardApplication,
  GovernorAwardGroup,
  GovernorAwardResponses,
  GovernorAwardStatus,
} from '@/types'

export interface GovernorAwardDraft {
  group_type: GovernorAwardGroup | null
  member_count: number | null
  responses: GovernorAwardResponses
  other_text: string
}

function emptyResponses(): GovernorAwardResponses {
  return Object.fromEntries(
    GOVERNOR_AWARD_SECTIONS.flatMap(section =>
      section.criteria.map(criterion => [criterion.key, { score: null, note: '' }]),
    ),
  )
}

function normalizeResponses(source: unknown): GovernorAwardResponses {
  const base = emptyResponses()
  if (!source || typeof source !== 'object') return base
  const incoming = source as Record<string, Partial<{ score: number | null; note: string }>>
  for (const key of Object.keys(base)) {
    const item = incoming[key]
    if (!item) continue
    const numericScore = typeof item.score === 'number' && Number.isFinite(item.score) ? item.score : null
    base[key] = {
      score: numericScore,
      note: typeof item.note === 'string' ? item.note : '',
    }
  }
  return base
}

function computeTotal(responses: GovernorAwardResponses) {
  return Math.round(
    Object.values(responses).reduce((sum, item) => sum + (Number(item.score) || 0), 0) * 10,
  ) / 10
}

export const useGovernorAwardsStore = defineStore('governorAwards', () => {
  const current = ref<GovernorAwardApplication | null>(null)
  const allApplications = ref<GovernorAwardApplication[]>([])
  const loading = ref(false)

  const currentDraft = computed<GovernorAwardDraft>(() => ({
    group_type: current.value?.group_type ?? null,
    member_count: current.value?.member_count ?? null,
    responses: normalizeResponses(current.value?.responses),
    other_text: current.value?.other_text ?? '',
  }))

  async function fetchForClub(clubId: string) {
    loading.value = true
    const { data, error } = await supabase
      .from('governor_award_applications')
      .select('*')
      .eq('club_id', clubId)
      .eq('year_term', GOVERNOR_AWARD_YEAR_TERM)
      .maybeSingle()

    current.value = error ? null : data
    loading.value = false
    return { error }
  }

  async function fetchAll() {
    loading.value = true
    const { data, error } = await supabase
      .from('governor_award_applications')
      .select('*')
      .eq('year_term', GOVERNOR_AWARD_YEAR_TERM)
      .order('total_score', { ascending: false })

    allApplications.value = error ? [] : data ?? []
    loading.value = false
    return { error }
  }

  async function saveForClub(
    clubId: string,
    userId: string | null,
    draft: GovernorAwardDraft,
    status: GovernorAwardStatus,
  ) {
    const responses = normalizeResponses(draft.responses)
    const payload = {
      club_id: clubId,
      year_term: GOVERNOR_AWARD_YEAR_TERM,
      group_type: draft.group_type,
      member_count: draft.member_count,
      status,
      responses,
      other_text: draft.other_text.trim() || null,
      total_score: computeTotal(responses),
      submitted_at: status === 'submitted' ? new Date().toISOString() : current.value?.submitted_at ?? null,
      created_by: current.value?.created_by ?? userId,
      updated_by: userId,
    }

    const { data, error } = await supabase
      .from('governor_award_applications')
      .upsert(payload, { onConflict: 'club_id,year_term' })
      .select()
      .single()

    if (!error) current.value = data
    return { error }
  }

  return {
    current,
    currentDraft,
    allApplications,
    loading,
    computeTotal,
    fetchForClub,
    fetchAll,
    saveForClub,
  }
})
