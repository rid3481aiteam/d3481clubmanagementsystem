<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import RotaryWheelIcon from '@/components/RotaryWheelIcon.vue'

const auth = useAuthStore()
const router = useRouter()

async function handleSignOut() {
  await auth.signOut()
  router.replace('/login')
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-brand">
        <RotaryWheelIcon class="brand-wheel" />
        <div class="brand-text">
          <div class="brand-title">國際扶輪 3481 地區</div>
          <div class="brand-sub">社務管理平台</div>
        </div>
      </div>

      <h1 class="page-title">帳號審核中</h1>
      <p class="login-hint" style="margin-top:0;">
        您的扶輪帳號（{{ auth.profile?.name }}）已透過 RotarySSO 建立成功，
        目前正在等待地區管理員指派所屬社別，指派完成後即可登入使用。請稍後再重新登入查看。
      </p>

      <button type="button" class="btn btn-g login-btn" @click="handleSignOut">登出</button>
    </div>
    <div class="login-bg-stripe"></div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--navy);
  padding: 24px;
  position: relative;
  overflow: hidden;
}

.login-bg-stripe {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 180px;
  background: var(--gold);
  opacity: .08;
  clip-path: polygon(0 60%, 100% 0%, 100% 100%, 0 100%);
}

.login-card {
  background: var(--card);
  border-radius: 14px;
  padding: 40px 36px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 24px 80px rgba(0,0,0,.35);
  position: relative;
  z-index: 1;
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 2px solid var(--gold);
}

.brand-wheel {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  color: var(--gold);
}

.brand-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--navy);
  line-height: 1.2;
}

.brand-sub {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}

.page-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 8px;
}

.login-hint {
  text-align: center;
  font-size: 12px;
  color: var(--muted);
  margin-top: 20px;
  margin-bottom: 20px;
  line-height: 1.6;
}

.login-btn {
  width: 100%;
  justify-content: center;
  padding: 11px;
  font-size: 14px;
}
</style>
