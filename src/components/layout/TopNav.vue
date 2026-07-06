<template>
  <header class="topnav">
    <div class="topnav-left">
      <button class="topnav-burger" aria-label="開啟選單" @click="ui.toggleSidebar">
        <span></span><span></span><span></span>
      </button>
      <RotaryWheelIcon class="topnav-wheel" />
      <span class="topnav-title">國際扶輪 3481 地區</span>
      <div v-if="auth.canSwitchView" class="view-switch">
        <button
          type="button"
          class="view-switch-btn"
          :class="{ active: auth.isDistrictView }"
          @click="auth.setViewScope('district')"
        >地區介面</button>
        <button
          type="button"
          class="view-switch-btn"
          :class="{ active: !auth.isDistrictView }"
          @click="auth.setViewScope('club')"
        >{{ auth.clubName || '本社介面' }}</button>
      </div>
      <span v-else class="topnav-context">{{ interfaceLabel }}</span>
      <select
        v-if="auth.canSwitchClub"
        class="club-switch-select"
        title="切換檢視中的社"
        :value="auth.clubId"
        @change="onSwitchClub"
      >
        <option v-for="c in auth.accessibleClubs" :key="c.club_id" :value="c.club_id">{{ c.name }}</option>
      </select>
    </div>
    <div class="topnav-right">
      <span class="topnav-user" style="cursor:pointer;" title="點擊修改顯示名稱" @click="editName">
        {{ auth.profile?.name ?? auth.user?.email }}
      </span>
      <span class="bdg" :class="roleBadgeClass">{{ roleLabel }}</span>
      <button class="btn btn-g btn-sm" @click="handleSignOut">登出</button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import RotaryWheelIcon from '@/components/RotaryWheelIcon.vue'

const auth = useAuthStore()
const router = useRouter()
const ui = useUiStore()

const roleLabel = computed(() => {
  if (auth.role === 'district_admin') return baseRoleLabel.value
  if (auth.isDistrictAdmin) return `${baseRoleLabel.value}＋地區`
  if (auth.isDistrictViewer) return `${baseRoleLabel.value}＋地區（唯讀）`
  return baseRoleLabel.value
})

const baseRoleLabel = computed(() => {
  switch (auth.role) {
    case 'district_admin':  return '地區管理員'
    case 'club_secretary':
    case 'club_admin':      return '各社管理員'
    case 'club_member':     return '一般社友'
    default:                return ''
  }
})

const roleBadgeClass = computed(() => {
  if (auth.isDistrictViewer) return 'b-y'
  switch (auth.role) {
    case 'club_secretary':
    case 'club_admin':     return 'b-n'
    default:               return 'b-g'
  }
})

const interfaceLabel = computed(() => {
  if (auth.isDistrictView) return '地區介面'
  return auth.clubName || '各社介面'
})

async function handleSignOut() {
  await auth.signOut()
  router.push('/login')
}

async function onSwitchClub(e: Event) {
  const targetClubId = (e.target as HTMLSelectElement).value
  const { error } = await auth.switchActiveClub(targetClubId)
  if (error) alert(error.message)
}

async function editName() {
  const current = auth.profile?.name ?? ''
  const next = prompt('輸入顯示名稱', current)
  if (next === null) return
  const trimmed = next.trim()
  if (!trimmed) return
  const { error } = await auth.updateName(trimmed)
  if (error) alert(error.message)
}
</script>

<style scoped>
.topnav {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: var(--topnav-h);
  background: var(--navy);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 50;
  box-shadow: 0 2px 8px rgba(0,0,0,.2);
}

.topnav-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.topnav-burger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
}

.topnav-burger span {
  display: block;
  width: 18px;
  height: 2px;
  background: #fff;
  border-radius: 2px;
}

@media (max-width: 900px) {
  .topnav-burger { display: flex; }
  .topnav-title { font-size: 13px; }
  .topnav-context { font-size: 12px; max-width: 120px; }
  .topnav-user { display: none; }
  .view-switch-btn { font-size: 11px; padding: 4px 8px; max-width: 90px; }
  .club-switch-select { font-size: 11px; padding: 4px 8px; max-width: 100px; }
}

.topnav-wheel {
  width: 22px;
  height: 22px;
  color: var(--gold);
  flex-shrink: 0;
}

.topnav-title {
  font-weight: 700;
  font-size: 15px;
  color: #fff;
  letter-spacing: .3px;
}

.topnav-context {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: rgba(255,255,255,.82);
  border-left: 1px solid rgba(255,255,255,.24);
  padding-left: 10px;
}

.view-switch {
  display: flex;
  gap: 2px;
  background: rgba(255,255,255,.08);
  border-radius: 999px;
  padding: 2px;
  margin-left: 4px;
}

.view-switch-btn {
  border: none;
  background: transparent;
  color: rgba(255,255,255,.72);
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background .12s, color .12s;
}

.view-switch-btn:hover:not(.active) {
  background: rgba(255,255,255,.12);
  color: #fff;
}

.view-switch-btn.active {
  background: var(--gold);
  color: var(--navy);
  font-weight: 700;
}

.club-switch-select {
  margin-left: 4px;
  max-width: 160px;
  font-size: 12px;
  color: #fff;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.24);
  border-radius: 999px;
  padding: 5px 10px;
  cursor: pointer;
}

.club-switch-select option {
  color: var(--navy);
}

.topnav-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.topnav-user {
  font-size: 13px;
  color: rgba(255,255,255,.85);
}

/* Override btn-g for dark bg */
.topnav-right .btn-g {
  background: transparent;
  border-color: rgba(255,255,255,.3);
  color: #fff;
}
.topnav-right .btn-g:hover {
  background: rgba(255,255,255,.1);
}
</style>
