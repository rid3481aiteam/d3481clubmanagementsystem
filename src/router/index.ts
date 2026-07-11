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
      meta: { bare: true, public: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { bare: true, public: true },
    },
    {
      path: '/verify-email',
      name: 'verify-email',
      component: () => import('@/views/VerifyEmailView.vue'),
      meta: { bare: true, public: true },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/views/ForgotPasswordView.vue'),
      meta: { bare: true, public: true },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/views/ResetPasswordView.vue'),
      meta: { bare: true, public: true },
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
    {
      path: '/attendance/monthly',
      name: 'attendance-monthly',
      component: () => import('@/views/meetings/AttendanceMonthlyView.vue'),
      meta: { feature: 'B2_attendance_summary' as FeatureKey },
    },
    // F 地區行事曆
    {
      path: '/calendar',
      name: 'district-calendar',
      component: () => import('@/views/DistrictCalendarView.vue'),
      meta: { feature: 'F1_district_calendar' as FeatureKey },
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
    {
      path: '/club/care',
      name: 'club-care',
      component: () => import('@/views/club/MemberCareView.vue'),
      meta: { feature: 'D4_care' as FeatureKey },
    },
    {
      path: '/club/officers',
      name: 'club-officers',
      component: () => import('@/views/club/OfficersView.vue'),
      meta: { roles: ['club_admin', 'club_secretary', 'club_member'] },
    },
    {
      path: '/club/announcements',
      name: 'club-announcements',
      component: () => import('@/views/club/ClubAnnouncementsView.vue'),
      meta: { roles: ['club_admin', 'club_secretary'] },
    },
    {
      path: '/club/governor-award',
      name: 'club-governor-award',
      component: () => import('@/views/club/GovernorAwardFormView.vue'),
      meta: { roles: ['club_admin', 'club_secretary'] },
    },
    {
      path: '/club/sister-clubs',
      name: 'club-sister-clubs',
      component: () => import('@/views/club/SisterClubsView.vue'),
      meta: { roles: ['club_admin', 'club_secretary', 'club_member'] },
    },
    {
      path: '/club/history',
      name: 'club-history',
      component: () => import('@/views/club/ClubHistoryView.vue'),
      meta: { roles: ['club_admin', 'club_secretary', 'club_member'] },
    },
    // E 活動
    {
      path: '/activities',
      name: 'activities',
      component: () => import('@/views/activities/ActivityListView.vue'),
      meta: { feature: 'E1_activities' as FeatureKey },
    },
    {
      path: '/activities/:id',
      name: 'activity-detail',
      component: () => import('@/views/activities/ActivityDetailView.vue'),
      meta: { feature: 'E1_activities' as FeatureKey },
    },
    // H 通訊錄
    {
      path: '/directory',
      name: 'directory',
      component: () => import('@/views/directory/DirectoryView.vue'),
      meta: { feature: 'H1_directory' as FeatureKey },
    },
    // Admin（地區：第 3 級唯讀 + 第 4 級地區管理員共用進得去，畫面內再依 isDistrictAdminView 決定能不能編輯）
    {
      path: '/admin/clubs',
      name: 'admin-clubs',
      component: () => import('@/views/admin/ClubListView.vue'),
      meta: { districtViewer: true },
    },
    {
      path: '/admin/announcements',
      name: 'admin-announcements',
      component: () => import('@/views/admin/DistrictAnnouncementsView.vue'),
      meta: { districtViewer: true },
    },
    {
      path: '/admin/governor-awards',
      name: 'admin-governor-awards',
      component: () => import('@/views/admin/GovernorAwardSummaryView.vue'),
      meta: { districtViewer: true },
    },
    {
      path: '/admin/attendance',
      name: 'admin-attendance',
      component: () => import('@/views/admin/AdminAttendanceView.vue'),
      meta: { districtViewer: true },
    },
    {
      path: '/admin/clubs/:id',
      name: 'admin-club-detail',
      component: () => import('@/views/admin/ClubDetailView.vue'),
      meta: { districtViewer: true },
    },
    {
      path: '/admin/edm',
      name: 'admin-edm',
      component: () => import('@/views/edm/EdmGeneratorView.vue'),
      meta: { districtViewer: true, feature: 'B5_edm' as FeatureKey },
    },
    // Admin（僅第 4 級地區管理員，唯讀角色進不去）
    {
      path: '/admin/features',
      name: 'admin-features',
      component: () => import('@/views/admin/FeatureFlagsView.vue'),
      meta: { role: 'district_admin' },
    },
    {
      path: '/admin/clubs/:id/edit',
      name: 'admin-club-edit',
      component: () => import('@/views/admin/ClubEditView.vue'),
      meta: { role: 'district_admin' },
    },
    {
      path: '/admin/permissions',
      name: 'admin-permissions',
      component: () => import('@/views/admin/PermissionMatrixView.vue'),
      meta: { role: 'district_admin' },
    },
    {
      path: '/club/edm',
      name: 'club-edm',
      component: () => import('@/views/edm/EdmGeneratorView.vue'),
      meta: { roles: ['club_admin', 'club_secretary'], feature: 'B5_edm' as FeatureKey },
    },
    {
      path: '/club/invite',
      name: 'account-management',
      component: () => import('@/views/admin/AccountManagementView.vue'),
      meta: { roles: ['district_admin', 'club_secretary', 'club_admin'] },
    },
    {
      path: '/club/line-notify',
      name: 'club-line-notify',
      component: () => import('@/views/club/LineNotifyView.vue'),
      meta: { roles: ['club_secretary', 'club_admin'] },
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

  // 地區（唯讀）或地區管理員都能進的路由
  if (to.meta.districtViewer && !auth.isDistrictViewer) return { name: 'dashboard' }

  // 角色限定路由：非該角色導回首頁
  if (to.meta.role) {
    if (to.meta.role === 'district_admin') {
      if (!auth.isDistrictAdmin) return { name: 'dashboard' }
    } else if (auth.role !== to.meta.role) {
      return { name: 'dashboard' }
    }
  }
  if (to.meta.roles) {
    const roles = to.meta.roles as string[]
    const allowedByRole = roles.includes(auth.role ?? '')
    const allowedByDistrictAccess = roles.includes('district_admin') && auth.isDistrictAdmin
    if (!allowedByRole && !allowedByDistrictAccess) return { name: 'dashboard' }
  }

  if (to.meta.feature) {
    const key = to.meta.feature as FeatureKey
    if (!features.isEnabled(key)) return { name: 'dashboard' }
  }
})

export default router
