import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { FeatureFlag, FeatureKey, FeatureMap } from '@/types'

const DEFAULT_FLAGS: FeatureMap = {
  A1_login: true, A2_roles: true, A3_isolation: true,
  B1_meeting_info: true, B2_attendance_summary: true,
  B3_attendance_personal: true, B4_attendance_detail: true, B5_edm: false,
  B6_membership_report: true,
  D1_roster: true, D2_roster_excel: true, D3_prospective: true, D4_care: false,
  H1_directory: true, H2_directory_search: true, H3_directory_admin: true,
  E1_activities: true,
  F1_district_calendar: true,
  G1_iou: false,
  I1_gg: false,
  J1_line_notify: false,
  K1_meeting_email_notify: false,
  L1_knowledge_base: false,
  M1_pending_account_notify: false,
}

export const useFeaturesStore = defineStore('features', () => {
  const flags = ref<FeatureMap>({ ...DEFAULT_FLAGS })
  const loading = ref(false)

  // 載入某社的功能開關（先取地區預設，再用社層覆蓋）
  async function load(clubId: string | null) {
    loading.value = true
    const filter = clubId ? `club_id.is.null,club_id.eq.${clubId}` : 'club_id.is.null'
    const { data } = await supabase
      .from('feature_flags')
      .select('club_id, feature_key, enabled')
      .or(filter)

    if (data) {
      // 先套地區預設，再套社層覆蓋
      const reset = { ...DEFAULT_FLAGS }
      const district = data.filter(r => r.club_id === null)
      const clubLevel = data.filter(r => r.club_id === clubId)

      for (const r of district) reset[r.feature_key as FeatureKey] = r.enabled
      for (const r of clubLevel) reset[r.feature_key as FeatureKey] = r.enabled

      flags.value = reset
    }
    loading.value = false
  }

  function isEnabled(key: FeatureKey): boolean {
    return flags.value[key] ?? true
  }

  const districtFlags = ref<FeatureFlag[]>([])

  async function fetchDistrictFlags() {
    const { data } = await supabase
      .from('feature_flags')
      .select('*')
      .is('club_id', null)
      .order('feature_key')
    districtFlags.value = data ?? []
  }

  async function setDistrictFlag(key: FeatureKey, enabled: boolean, userId: string | null) {
    const existing = districtFlags.value.find(f => f.feature_key === key)
    const { error } = existing
      ? await supabase
          .from('feature_flags')
          .update({ enabled, updated_by: userId })
          .eq('id', existing.id)
      : await supabase
          .from('feature_flags')
          .insert({ club_id: null, feature_key: key, enabled, updated_by: userId })
    if (!error) await fetchDistrictFlags()
    return { error }
  }

  return { flags, loading, districtFlags, load, isEnabled, fetchDistrictFlags, setDistrictFlag }
})
