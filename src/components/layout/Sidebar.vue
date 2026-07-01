<template>
  <aside class="sidebar">
    <nav class="sidebar-nav">
      <div class="nav-section">總覽</div>
      <RouterLink to="/" class="nav-item">
        <span class="nav-icon">📊</span>儀表板
      </RouterLink>

      <!-- 地區管理員 -->
      <template v-if="auth.role === 'district_admin'">
        <div class="nav-section">地區管理</div>
        <RouterLink to="/admin/clubs" class="nav-item">
          <span class="nav-icon">🏢</span>社團總覽
        </RouterLink>
        <RouterLink to="/admin/features" class="nav-item">
          <span class="nav-icon">⚙️</span>功能開關
        </RouterLink>
      </template>

      <!-- 執秘 + 社長共用 -->
      <template v-if="auth.role === 'club_secretary' || auth.role === 'club_admin'">
        <div class="nav-section">社務管理</div>
        <RouterLink v-if="features.isEnabled('D1_roster')" to="/roster" class="nav-item">
          <span class="nav-icon">📋</span>社友名冊
        </RouterLink>
        <RouterLink v-if="features.isEnabled('D3_prospective')" to="/roster/prospective" class="nav-item">
          <span class="nav-icon">🔍</span>潛在社友
        </RouterLink>
        <RouterLink v-if="features.isEnabled('B1_meeting_info')" to="/meetings" class="nav-item">
          <span class="nav-icon">📅</span>例會管理
        </RouterLink>
      </template>

      <!-- 執秘限定 -->
      <template v-if="auth.role === 'club_secretary'">
        <div class="nav-section">帳號</div>
        <RouterLink to="/club/invite" class="nav-item">
          <span class="nav-icon">👤</span>邀請 / 停用社長
        </RouterLink>
      </template>

      <!-- 社長限定 -->
      <template v-if="auth.role === 'club_admin'">
        <div class="nav-section">報表</div>
        <RouterLink to="/club/reports" class="nav-item">
          <span class="nav-icon">📊</span>出席統計
        </RouterLink>
      </template>

      <!-- 全角色共用 -->
      <div class="nav-section">通訊錄</div>
      <RouterLink v-if="features.isEnabled('H1_directory')" to="/directory" class="nav-item">
        <span class="nav-icon">📖</span>地區通訊錄
      </RouterLink>
    </nav>

    <div class="sidebar-footer">
      <div class="club-name" v-if="auth.role !== 'district_admin'">
        <!-- club name placeholder — will be filled by club store -->
        本社平台
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useFeaturesStore } from '@/stores/features'

const auth = useAuthStore()
const features = useFeaturesStore()
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

.nav-icon { font-size: 15px; width: 20px; text-align: center; }

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}

.club-name {
  font-size: 11px;
  color: var(--muted);
}
</style>
