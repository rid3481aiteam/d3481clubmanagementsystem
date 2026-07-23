<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useFeaturesStore } from '@/stores/features'
import type { FeatureKey } from '@/types'

const auth = useAuthStore()
const features = useFeaturesStore()

const LABELS: Record<FeatureKey, string> = {
  A1_login: '登入',
  A2_roles: '角色權限',
  A3_isolation: '社別資料隔離',
  B1_meeting_info: '例會管理',
  B2_attendance_summary: '出席彙總統計',
  B3_attendance_personal: '個人出席率',
  B4_attendance_detail: '逐人出席明細',
  B5_edm: 'EDM 文案產生器（AI 輔助）',
  B6_membership_report: '出席月報－社友增減人數（RI半年報）',
  D1_roster: '社友名冊',
  D2_roster_excel: '名冊 Excel 匯入匯出',
  D3_prospective: '潛在社友追蹤',
  D4_care: '社友關懷',
  H1_directory: '地區通訊錄',
  H2_directory_search: '通訊錄搜尋',
  H3_directory_admin: '通訊錄管理入口',
  E1_activities: '活動列表（含例會，報名/不克參加）',
  F1_district_calendar: '地區行事曆',
  G1_iou: 'IOU 捐獻收據追蹤',
  I1_gg: 'GG案盤點（全球獎助金）',
  J1_line_notify: 'LINE 通知設定（測試中）',
  K1_meeting_email_notify: '新增例會自動發信通知社友（測試中）',
}

const LOCKED: FeatureKey[] = ['A1_login', 'A2_roles', 'A3_isolation']

function keysByPrefix(prefix: string) {
  return (Object.keys(LABELS) as FeatureKey[]).filter(k => k.startsWith(prefix))
}

const groups = [
  { title: '帳號', keys: keysByPrefix('A') },
  { title: '例會', keys: keysByPrefix('B') },
  { title: '名冊', keys: keysByPrefix('D') },
  { title: '通訊錄', keys: keysByPrefix('H') },
  { title: '活動', keys: keysByPrefix('E') },
  { title: '行事曆', keys: keysByPrefix('F') },
  { title: '捐獻', keys: keysByPrefix('G') },
  { title: '獎助金', keys: keysByPrefix('I') },
  { title: '通知', keys: [...keysByPrefix('J'), ...keysByPrefix('K')] },
]

function flagFor(key: FeatureKey) {
  return features.districtFlags.find(f => f.feature_key === key)
}

const enabled = computed(() => (key: FeatureKey) => flagFor(key)?.enabled ?? true)

async function toggle(key: FeatureKey) {
  if (LOCKED.includes(key)) return
  await features.setDistrictFlag(key, !enabled.value(key), auth.user?.id ?? null)
}

onMounted(() => {
  features.fetchDistrictFlags()
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>功能開關管理</h1>
    </div>

    <div v-for="g in groups" :key="g.title" style="margin-bottom:20px;">
      <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">{{ g.title }}</h2>
      <div class="tw">
        <table class="card-table">
          <tbody>
            <tr v-for="key in g.keys" :key="key">
              <td>{{ LABELS[key] }}</td>
              <td style="width:120px;">
                <span
                  class="bdg"
                  :class="enabled(key) ? 'b-gr' : 'b-g'"
                  :style="LOCKED.includes(key) ? '' : 'cursor:pointer;'"
                  @click="toggle(key)"
                >{{ enabled(key) ? '開啟' : '關閉' }}</span>
                <span v-if="LOCKED.includes(key)" class="bdg b-n" style="margin-left:6px;">不可關</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
