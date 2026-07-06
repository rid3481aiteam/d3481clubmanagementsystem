<template>
  <div class="sidebar-backdrop" v-if="ui.sidebarOpen" @click="ui.closeSidebar"></div>
  <aside class="sidebar" :class="{ open: ui.sidebarOpen }">
    <nav class="sidebar-nav" @click="ui.closeSidebar">
      <div class="nav-section">總覽</div>
      <RouterLink to="/" class="nav-item">
        <span class="nav-icon">📊</span>儀表板
      </RouterLink>

      <!-- 地區（唯讀）+ 地區管理員共用 -->
      <template v-if="auth.isDistrictView">
        <div class="nav-section">地區</div>
        <RouterLink to="/admin/clubs" class="nav-item">
          <span class="nav-icon">🏢</span>社團總覽
        </RouterLink>
        <RouterLink to="/admin/announcements" class="nav-item">
          <span class="nav-icon">📣</span>地區公告
        </RouterLink>
        <RouterLink to="/admin/governor-awards" class="nav-item">
          <span class="nav-icon">🏅</span>總監獎項統整
        </RouterLink>
        <RouterLink v-if="features.isEnabled('B5_edm')" to="/admin/edm" class="nav-item">
          <span class="nav-icon">📧</span>EDM 產生器
        </RouterLink>

        <!-- 以下僅地區管理員（唯讀角色看不到、也進不去） -->
        <template v-if="auth.isDistrictAdminView">
          <button type="button" class="nav-section nav-section-toggle" @click.stop="advancedOpen = !advancedOpen">
            進階設定
            <span class="nav-section-chevron">{{ advancedOpen ? '▾' : '▸' }}</span>
          </button>
          <template v-if="advancedOpen">
            <RouterLink to="/club/invite" class="nav-item">
              <span class="nav-icon">👤</span>邀請 / 管理地區帳號
            </RouterLink>
            <RouterLink to="/admin/features" class="nav-item">
              <span class="nav-icon">⚙️</span>功能開關
            </RouterLink>
            <RouterLink to="/admin/permissions" class="nav-item">
              <span class="nav-icon">🔐</span>權限矩陣
            </RouterLink>
          </template>
        </template>
      </template>

      <!-- 各社管理員（club_secretary/club_admin）+ 一般社友共用（社友唯讀），地區視角下不顯示 -->
      <template v-if="!auth.isDistrictView && (auth.role === 'club_secretary' || auth.role === 'club_admin' || auth.role === 'club_member')">
        <div class="nav-section">社務管理</div>
        <RouterLink v-if="auth.role === 'club_secretary' || auth.role === 'club_admin'" to="/club/announcements" class="nav-item">
          <span class="nav-icon">📣</span>社內公告
        </RouterLink>
        <RouterLink v-if="auth.role === 'club_secretary' || auth.role === 'club_admin'" to="/club/governor-award" class="nav-item">
          <span class="nav-icon">🏅</span>總監獎項申請
        </RouterLink>
        <RouterLink v-if="features.isEnabled('B1_meeting_info')" to="/meetings" class="nav-item">
          <span class="nav-icon">📅</span>例會管理
        </RouterLink>
        <RouterLink to="/club/officers" class="nav-item">
          <span class="nav-icon">🎖️</span>社的年度成員
        </RouterLink>
        <RouterLink v-if="features.isEnabled('D1_roster')" to="/roster" class="nav-item">
          <span class="nav-icon">📋</span>社友名冊
        </RouterLink>
        <RouterLink v-if="features.isEnabled('D3_prospective') && auth.role !== 'club_member'" to="/roster/prospective" class="nav-item">
          <span class="nav-icon">🔍</span>潛在社友
        </RouterLink>
        <RouterLink v-if="(auth.role === 'club_secretary' || auth.role === 'club_admin') && features.isEnabled('B5_edm')" to="/club/edm" class="nav-item">
          <span class="nav-icon">📧</span>EDM 產生器
        </RouterLink>
        <RouterLink v-if="features.isEnabled('H1_directory')" to="/directory" class="nav-item">
          <span class="nav-icon">📖</span>地區通訊錄
        </RouterLink>
      </template>

      <!-- 各社管理員（club_secretary/club_admin）：本社帳號自行管理，地區視角下不顯示 -->
      <template v-if="!auth.isDistrictView && (auth.role === 'club_secretary' || auth.role === 'club_admin')">
        <button type="button" class="nav-section nav-section-toggle" @click.stop="advancedOpen = !advancedOpen">
          進階設定
          <span class="nav-section-chevron">{{ advancedOpen ? '▾' : '▸' }}</span>
        </button>
        <RouterLink v-if="advancedOpen" to="/club/invite" class="nav-item">
          <span class="nav-icon">👤</span>邀請 / 管理本社帳號
        </RouterLink>
      </template>
    </nav>

    <div class="sidebar-footer">
      <div class="club-name" v-if="!auth.isDistrictView">
        {{ auth.clubName || '本社平台' }}
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useFeaturesStore } from '@/stores/features'
import { useUiStore } from '@/stores/ui'

const auth = useAuthStore()
const features = useFeaturesStore()
const ui = useUiStore()

const advancedOpen = ref(false)
watch(() => auth.isDistrictView, () => { advancedOpen.value = false })
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-w);
  background: var(--card);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-shrink: 0;
}

.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-section {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .6px;
  padding: 12px 10px 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--r);
  font-size: 13px;
  color: var(--text);
  text-decoration: none;
  transition: background .12s, color .12s;
}

.nav-item:hover {
  background: var(--gold-p);
  color: var(--navy);
}

.nav-item.router-link-active {
  background: var(--navy);
  color: #fff;
  font-weight: 600;
}

.nav-section-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
}

.nav-section-toggle:hover {
  color: var(--navy);
}

.nav-section-chevron {
  font-size: 10px;
  text-transform: none;
  letter-spacing: normal;
}

.nav-icon { font-size: 15px; width: 20px; text-align: center; }

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}

.club-name {
  font-size: 11px;
  color: var(--muted);
}

.sidebar-backdrop {
  display: none;
}

@media (max-width: 900px) {
  .sidebar {
    position: fixed;
    top: var(--topnav-h);
    bottom: 0;
    left: 0;
    z-index: 60;
    transform: translateX(-100%);
    transition: transform .2s ease;
    box-shadow: 2px 0 12px rgba(0,0,0,.15);
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .sidebar-backdrop {
    display: block;
    position: fixed;
    top: var(--topnav-h);
    left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,.4);
    z-index: 55;
  }
}
</style>
