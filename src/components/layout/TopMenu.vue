<template>
  <nav class="topmenu" :class="{ 'has-overflow': hasOverflow }">
    <button v-show="canScrollLeft" class="nav-scroll-btn left" @click="scrollNav(-150)">‹</button>
    <div class="tnav-scroll" ref="scrollEl" @scroll="updateScrollBtns">
      <template v-for="(item, i) in navItems" :key="i">
        <div v-if="item.type === 'divider'" class="tdiv"></div>

        <div v-else-if="item.type === 'dropdown'" class="tnav-drop" :class="{ open: dropdownOpen === item.label }">
          <button
            type="button"
            class="tnav"
            @click.stop="toggleDropdown(item.label, $event)"
          >
            <span class="tnav-ic">{{ item.icon }}</span>{{ item.label }}<span class="tnav-chev">▾</span>
          </button>
        </div>

        <RouterLink v-else :to="item.to" class="tnav" :data-tour="tourId(item.to)">
          <span class="tnav-ic">{{ item.icon }}</span>{{ item.label }}
        </RouterLink>
      </template>
    </div>
    <button v-show="canScrollRight" class="nav-scroll-btn right" @click="scrollNav(150)">›</button>
  </nav>

  <Teleport to="body">
    <div
      v-if="openDropdownItem"
      class="tnav-drop-menu"
      :style="{ top: dropdownPos.top + 'px', left: dropdownPos.left + 'px' }"
      @click.stop
    >
      <RouterLink
        v-for="sub in openDropdownItem.items"
        :key="sub.to"
        :to="sub.to"
        class="tnav-drop-link"
        @click="dropdownOpen = null"
      >
        <span class="tnav-ic">{{ sub.icon }}</span>{{ sub.label }}
      </RouterLink>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useFeaturesStore } from '@/stores/features'

type NavLink = { type: 'link'; to: string; icon: string; label: string }
type NavDivider = { type: 'divider' }
type NavDropdown = { type: 'dropdown'; icon: string; label: string; items: { to: string; icon: string; label: string }[] }
type NavItem = NavLink | NavDivider | NavDropdown

const auth = useAuthStore()
const features = useFeaturesStore()

const navItems = computed<NavItem[]>(() => {
  const items: NavItem[] = [
    { type: 'link', to: '/', icon: '📊', label: '儀表板' },
  ]

  if (features.isEnabled('F1_district_calendar')) {
    items.push({ type: 'link', to: '/calendar', icon: '🗓️', label: '地區行事曆' })
  }

  if (auth.isDistrictView) {
    items.push({ type: 'divider' })
    items.push({ type: 'link', to: '/admin/clubs', icon: '🏢', label: '社團總覽' })
    items.push({ type: 'link', to: '/admin/attendance', icon: '📈', label: '出席月報' })
    items.push({ type: 'link', to: '/admin/announcements', icon: '📣', label: '地區公告' })
    items.push({ type: 'link', to: '/admin/governor-awards', icon: '🏅', label: '總監獎項統整' })
    if (features.isEnabled('H1_directory')) {
      items.push({ type: 'link', to: '/directory', icon: '📖', label: '地區通訊錄' })
    }
    if (features.isEnabled('E1_activities') || features.isEnabled('B1_meeting_info')) {
      items.push({ type: 'link', to: '/activities', icon: '📅', label: '活動' })
    }
    if (features.isEnabled('B5_edm')) {
      items.push({ type: 'link', to: '/admin/edm', icon: '📧', label: 'EDM 產生器' })
    }
    if (auth.isDistrictAdminView) {
      items.push({ type: 'divider' })
      items.push({
        type: 'dropdown',
        icon: '⚙️',
        label: '進階設定',
        items: [
          { to: '/club/invite', icon: '👤', label: '邀請 / 管理地區帳號' },
          { to: '/admin/features', icon: '⚙️', label: '功能開關' },
          { to: '/admin/permissions', icon: '🔐', label: '權限矩陣' },
        ],
      })
    }
    return items
  }

  const isClubManager = auth.role === 'club_secretary' || auth.role === 'club_admin'
  if (isClubManager || auth.role === 'club_member') {
    items.push({ type: 'divider' })
    if (isClubManager) {
      items.push({ type: 'link', to: '/club/announcements', icon: '📣', label: '社內公告' })
      items.push({ type: 'link', to: '/club/governor-award', icon: '🏅', label: '總監獎項申請' })
    }
    if (features.isEnabled('E1_activities') || features.isEnabled('B1_meeting_info')) {
      items.push({ type: 'link', to: '/activities', icon: '📅', label: '活動' })
    }
    if (features.isEnabled('B2_attendance_summary')) {
      items.push({ type: 'link', to: '/attendance/monthly', icon: '📈', label: '出席月報' })
    }
    items.push({ type: 'link', to: '/club/officers', icon: '🎖️', label: '社的年度成員' })
    items.push({
      type: 'dropdown',
      icon: '📜',
      label: '本社歷程',
      items: [
        { to: '/club/history', icon: '📜', label: '社的歷程' },
        { to: '/club/sister-clubs', icon: '🤝', label: '友好社' },
      ],
    })
    if (features.isEnabled('D1_roster')) {
      items.push({ type: 'link', to: '/roster', icon: '📋', label: '社友名冊' })
    }
    if (features.isEnabled('D3_prospective') && auth.role !== 'club_member') {
      items.push({ type: 'link', to: '/roster/prospective', icon: '🔍', label: '潛在社友' })
    }
    if (features.isEnabled('D4_care')) {
      items.push({ type: 'link', to: '/club/care', icon: '🤝', label: '社友關懷' })
    }
    if (features.isEnabled('G1_iou')) {
      items.push({ type: 'link', to: '/club/iou', icon: '💰', label: 'IOU' })
    }
    if (features.isEnabled('I1_gg')) {
      items.push({ type: 'link', to: '/club/gg', icon: '🌐', label: 'GG案' })
    }
    if (isClubManager && features.isEnabled('B5_edm')) {
      items.push({ type: 'link', to: '/club/edm', icon: '📧', label: 'EDM 產生器' })
    }
    if (features.isEnabled('H1_directory')) {
      items.push({ type: 'link', to: '/directory', icon: '📖', label: '地區通訊錄' })
    }
  }

  if (isClubManager) {
    items.push({ type: 'divider' })
    items.push({
      type: 'dropdown',
      icon: '⚙️',
      label: '進階設定',
      items: [
        { to: '/club/invite', icon: '👤', label: '邀請 / 管理本社帳號' },
        { to: '/club/line-notify', icon: '💬', label: 'LINE 通知設定（測試中）' },
      ],
    })
  }

  return items
})

// 給 OnboardingTour 用來定位高亮的目標，只有導覽會用到的三個入口才需要 id
const TOUR_IDS: Record<string, string> = {
  '/': 'nav-dashboard',
  '/activities': 'nav-activities',
  '/roster': 'nav-roster',
}
function tourId(to: string): string | undefined {
  return TOUR_IDS[to]
}

const dropdownOpen = ref<string | null>(null)
const dropdownPos = ref({ top: 0, left: 0 })
const openDropdownItem = computed(() =>
  navItems.value.find((it): it is NavDropdown => it.type === 'dropdown' && it.label === dropdownOpen.value) ?? null
)

function toggleDropdown(label: string, event: MouseEvent) {
  if (dropdownOpen.value === label) {
    dropdownOpen.value = null
    return
  }
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const menuWidth = 220
  const left = Math.min(rect.left, window.innerWidth - menuWidth - 8)
  dropdownPos.value = { top: rect.bottom, left: Math.max(8, left) }
  dropdownOpen.value = label
}
function closeDropdown() {
  dropdownOpen.value = null
}

const scrollEl = ref<HTMLElement | null>(null)
const hasOverflow = ref(false)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

function updateScrollBtns() {
  const el = scrollEl.value
  if (!el) return
  canScrollLeft.value = el.scrollLeft > 5
  canScrollRight.value = el.scrollWidth - el.clientWidth - el.scrollLeft > 5
  hasOverflow.value = el.scrollWidth > el.clientWidth + 2 && canScrollRight.value
}

function scrollNav(dx: number) {
  scrollEl.value?.scrollBy({ left: dx, behavior: 'smooth' })
}

watch(navItems, () => { nextTick(updateScrollBtns) })

onMounted(() => {
  updateScrollBtns()
  window.addEventListener('resize', updateScrollBtns)
  document.addEventListener('click', closeDropdown)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateScrollBtns)
  document.removeEventListener('click', closeDropdown)
})
</script>

<style scoped>
.topmenu {
  position: fixed;
  top: var(--topnav-h);
  left: 0;
  right: 0;
  z-index: 45;
  background: var(--navy);
  height: var(--topmenu-h);
  display: flex;
  align-items: stretch;
  border-bottom: 2px solid var(--gold);
  box-shadow: 0 2px 8px rgba(0,0,0,.15);
}

.topmenu.has-overflow::after {
  content: '';
  position: absolute;
  right: 32px; top: 0; bottom: 0;
  width: 40px;
  background: linear-gradient(to right, rgba(0,0,0,0), var(--navy) 85%);
  pointer-events: none;
}

.tnav-scroll {
  display: flex;
  align-items: stretch;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.tnav-scroll::-webkit-scrollbar { display: none; }

.tnav {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  height: 100%;
  border: none;
  background: none;
  color: rgba(255,255,255,.72);
  font-size: 13px;
  font-family: inherit;
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: background .12s, color .12s;
}
.tnav:hover { color: #fff; background: rgba(255,255,255,.06); }
.tnav.router-link-active {
  color: var(--gold-l);
  border-bottom-color: var(--gold);
  font-weight: 600;
  background: rgba(184,137,42,.12);
}
.tnav-ic { font-size: 14px; }
.tnav-chev { font-size: 9px; margin-left: 2px; }

.tdiv {
  width: 1px;
  height: 20px;
  align-self: center;
  background: rgba(255,255,255,.15);
  flex-shrink: 0;
  margin: 0 4px;
}

.nav-scroll-btn {
  background: rgba(0,0,0,.4);
  color: #fff;
  border: none;
  width: 28px;
  font-size: 20px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}
.nav-scroll-btn:hover { background: rgba(0,0,0,.6); }

.tnav-drop { display: flex; }
.tnav-drop.open .tnav { color: #fff; background: rgba(255,255,255,.08); }
.tnav-drop-menu {
  position: fixed;
  min-width: 220px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 0 0 var(--r) var(--r);
  box-shadow: var(--shadow-md);
  padding: 6px;
  z-index: 600;
}
.tnav-drop-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: var(--r-sm);
  font-size: 13.5px;
  color: var(--text);
  text-decoration: none;
}
.tnav-drop-link:hover { background: var(--gold-p); color: var(--navy); }
.tnav-drop-link.router-link-active { background: var(--navy); color: #fff; }

@media (max-width: 900px) {
  .tnav { padding: 0 9px; font-size: 12px; }
}
</style>
