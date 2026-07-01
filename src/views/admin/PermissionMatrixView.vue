<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePermissionsStore } from '@/stores/permissions'
import type { UserRole } from '@/types'

const auth = useAuthStore()
const permissions = usePermissionsStore()

const RESOURCE_LABELS: Record<string, string> = {
  roster: '社友名冊',
  prospective_members: '潛在社友',
  meetings: '例會管理',
  attendance: '出席（彙總 + 明細）',
}

const ROLE_LABELS: Record<UserRole, string> = {
  district_admin: '地區管理員',
  club_secretary: '執秘',
  club_admin: '社長',
  club_member: '一般社員',
}

const ROLES: UserRole[] = ['district_admin', 'club_secretary', 'club_admin', 'club_member']
const ACTIONS = ['view', 'edit'] as const

function cell(resource: string, role: UserRole, action: string) {
  return permissions.allPermissions.find(
    p => p.resource === resource && p.role === role && p.action === action
  )
}

async function toggle(resource: string, role: UserRole, action: string) {
  const row = cell(resource, role, action)
  if (!row) return
  await permissions.setPermission(row.id, !row.allowed, auth.user?.id ?? null)
}

onMounted(() => {
  permissions.fetchAll()
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>權限矩陣管理</h1>
    </div>

    <div v-for="resource in Object.keys(RESOURCE_LABELS)" :key="resource" style="margin-bottom:20px;">
      <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">
        {{ RESOURCE_LABELS[resource] }}
      </h2>
      <div class="tw">
        <table>
          <thead class="th">
            <tr>
              <th>角色</th>
              <th v-for="action in ACTIONS" :key="action">{{ action === 'view' ? '檢視' : '編輯' }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="role in ROLES" :key="role">
              <td>{{ ROLE_LABELS[role] }}</td>
              <td v-for="action in ACTIONS" :key="action">
                <span
                  class="bdg"
                  :class="cell(resource, role, action)?.allowed ? 'b-gr' : 'b-g'"
                  style="cursor:pointer;"
                  @click="toggle(resource, role, action)"
                >{{ cell(resource, role, action)?.allowed ? '允許' : '禁止' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div style="margin-bottom:20px;">
      <h2 style="font-size:14px; font-weight:700; color:var(--navy); margin-bottom:8px;">結構性管理（僅地區管理員，不可調整）</h2>
      <div class="tw">
        <table>
          <tbody>
            <tr>
              <td>社團資料 (clubs)</td>
              <td><span class="bdg b-n">僅 district_admin</span></td>
            </tr>
            <tr>
              <td>功能開關 (feature_flags)</td>
              <td><span class="bdg b-n">僅 district_admin</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
