<template>
  <header class="topnav">
    <div class="topnav-left">
      <RotaryWheelIcon class="topnav-wheel" />
      <span class="topnav-title">國際扶輪 3481 地區</span>
    </div>
    <div class="topnav-right">
      <span class="topnav-user">{{ auth.profile?.name ?? auth.user?.email }}</span>
      <span class="bdg" :class="roleBadgeClass">{{ roleLabel }}</span>
      <button class="btn btn-g btn-sm" @click="handleSignOut">登出</button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import RotaryWheelIcon from '@/components/RotaryWheelIcon.vue'

const auth = useAuthStore()
const router = useRouter()

const roleLabel = computed(() => {
  switch (auth.role) {
    case 'district_admin':  return '地區管理員'
    case 'club_secretary':  return '執行秘書'
    case 'club_admin':      return '社長'
    case 'club_member':     return '社員'
    default:                return ''
  }
})

const roleBadgeClass = computed(() => {
  switch (auth.role) {
    case 'district_admin': return 'b-y'
    case 'club_secretary': return 'b-n'
    case 'club_admin':     return 'b-gr'
    default:               return 'b-g'
  }
})

async function handleSignOut() {
  await auth.signOut()
  router.push('/login')
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
  border-color: rgba(255,255,255,.3);
  color: #fff;
}
.topnav-right .btn-g:hover {
  background: rgba(255,255,255,.1);
}
</style>
