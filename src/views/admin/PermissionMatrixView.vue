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

// club_admin／club_secretary 在 RLS、Edge Function、role_permissions
// 資料本身都是等價角色（migration 010 的種子資料兩者數值完全相同），
// 這裡合併顯示成一列「各社管理員」，但底層 role_permissions 還是兩筆
// 獨立資料，toggle 時要兩筆一起更新，不然畫面上合併的兩個角色權限
// 會悄悄跑掉。
type DisplayRole = 'district_admin' | 'club_tier' | 'club_member'

const ROLE_LABELS: Record<DisplayRole, string> = {
  district_admin: '地區管理員',
  club_tier: '各社管理員',
  club_member: '一般社友',
}

const ROLES: DisplayRole[] = ['district_admin', 'club_tier', 'club_member']
const ACTIONS = ['view', 'edit'] as const

function underlyingRoles(role: DisplayRole): UserRole[] {
  return role === 'club_tier' ? ['club_admin', 'club_secretary'] : [role]
}

function cellsForRole(resource: string, role: DisplayRole, action: string) {
  return underlyingRoles(role)
    .map(r => permissions.allPermissions.find(p => p.resource === resource && p.role === r && p.action === action))
    .filter((p): p is NonNullable<typeof p> => !!p)
}

function isAllowed(resource: string, role: DisplayRole, action: string) {
  const rows = cellsForRole(resource, role, action)
  return rows.length > 0 && rows.every(r => r.allowed)
}

async function toggle(resource: string, role: DisplayRole, action: string) {
  const rows = cellsForRole(resource, role, action)
  if (!rows.length) return
  const next = !isAllowed(resource, role, action)
  await Promise.all(rows.map(r => permissions.setPermission(r.id, next, auth.user?.id ?? null)))
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
                  :class="isAllowed(resource, role, action) ? 'b-gr' : 'b-g'"
                  style="cursor:pointer;"
                  @click="toggle(resource, role, action)"
                >{{ isAllowed(resource, role, action) ? '允許' : '禁止' }}</span>
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
