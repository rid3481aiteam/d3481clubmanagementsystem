import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFeaturesStore } from '@/stores/features'
import type { FeatureKey } from '@/types'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/accept-invite',
      name: 'accept-invite',
      component: () => import('@/views/AcceptInviteView.vue'),
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
    },
    // B 例會
    {
      path: '/meetings',
      name: 'meetings',
      component: () => import('@/views/meetings/MeetingListView.vue'),
      meta: { feature: 'B1_meeting_info' as FeatureKey },
    },
    {
      path: '/meetings/:id/attendance',
      name: 'attendance',
      component: () => import('@/views/meetings/AttendanceView.vue'),
      meta: { feature: 'B2_attendance_summary' as FeatureKey },
    },
    // D 名冊
    {
      path: '/roster',
      name: 'roster',
      component: () => import('@/views/roster/RosterView.vue'),
      meta: { feature: 'D1_roster' as FeatureKey },
    },
    {
      path: '/roster/prospective',
      name: 'prospective',
      component: () => import('@/views/roster/ProspectiveView.vue'),
      meta: { feature: 'D3_prospective' as FeatureKey },
    },
    // H 通訊錄
    {
      path: '/directory',
      name: 'directory',
      component: () => import('@/views/directory/DirectoryView.vue'),
      meta: { feature: 'H1_directory' as FeatureKey },
    },
    // Admin（地區管理員）
    {
      path: '/admin/clubs',
      name: 'admin-clubs',
      component: () => import('@/views/admin/ClubListView.vue'),
      meta: { role: 'district_admin' },
    },
    {
      path: '/admin/features',
      name: 'admin-features',
      component: () => import('@/views/admin/FeatureFlagsView.vue'),
      meta: { role: 'district_admin' },
    },
    {
      path: '/admin/clubs/:id',
      name: 'admin-club-detail',
      component: () => import('@/views/admin/ClubDetailView.vue'),
      meta: { role: 'district_admin' },
    },
    {
      path: '/admin/permissions',
      name: 'admin-permissions',
      component: () => import('@/views/admin/PermissionMatrixView.vue'),
      meta: { role: 'district_admin' },
    },
    {
      path: '/club/invite',
      name: 'account-management',
      component: () => import('@/views/admin/AccountManagementView.vue'),
      meta: { roles: ['district_admin', 'club_secretary', 'club_admin'] },
    },
    // 404
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

// 全域守衛：未登入導向 /login；功能關閉導向首頁
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  const features = useFeaturesStore()

  if (auth.loading) await auth.init()

  if (!to.meta.public && !auth.isLoggedIn) return { name: 'login' }

  // 角色限定路由：非該角色導回首頁
  if (to.meta.role && auth.role !== to.meta.role) return { name: 'dashboard' }
  if (to.meta.roles && !(to.meta.roles as string[]).includes(auth.role ?? '')) return { name: 'dashboard' }

  if (to.meta.feature) {
    const key = to.meta.feature as FeatureKey
    if (!features.isEnabled(key)) return { name: 'dashboard' }
  }
})

export default router
