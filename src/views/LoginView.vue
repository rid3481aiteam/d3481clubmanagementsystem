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

      <p v-if="errorMsg" class="login-error">{{ errorMsg }}</p>

      <button type="button" class="btn btn-p login-btn" :disabled="loading" @click="loginWithRotarySso">
        <span v-if="loading" class="btn-spinner"></span>
        {{ loading ? '導向扶輪 SSO 登入…' : '用扶輪帳號登入' }}
      </button>

      <p class="login-hint">
        使用扶輪生態系共用帳號（RotarySSO）登入，首次登入需經地區管理員指派社別。
      </p>
    </div>
    <div class="login-bg-stripe"></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import RotaryWheelIcon from '@/components/RotaryWheelIcon.vue'

const ROTARYSSO_ISSUER = 'https://rotarysso.vercel.app'

const loading = ref(false)
const errorMsg = ref('')

function loginWithRotarySso() {
  loading.value = true
  errorMsg.value = ''

  const clientId = import.meta.env.VITE_ROTARYSSO_CLIENT_ID as string | undefined
  if (!clientId) {
    errorMsg.value = '尚未設定 RotarySSO 用戶端，請聯絡系統管理員。'
    loading.value = false
    return
  }

  const state = crypto.randomUUID()
  sessionStorage.setItem('rotarysso_state', state)

  const redirectUri = `${window.location.origin}/auth/sso/callback`
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile rotary',
    state,
  })

  window.location.href = `${ROTARYSSO_ISSUER}/oauth/authorize?${params.toString()}`
}
</script>

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
  max-width: 400px;
  box-shadow: 0 24px 80px rgba(0,0,0,.35);
  position: relative;
  z-index: 1;
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 32px;
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

.login-error {
  font-size: 12px;
  color: var(--red);
  background: rgba(176,48,48,.08);
  border-radius: var(--r);
  padding: 8px 12px;
  margin-bottom: 16px;
}

.login-btn {
  width: 100%;
  justify-content: center;
  padding: 11px;
  font-size: 14px;
}

.login-btn:disabled { opacity: .6; cursor: not-allowed; }

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .7s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

.login-hint {
  text-align: center;
  font-size: 11px;
  color: var(--muted);
  margin-top: 16px;
  line-height: 1.5;
}
</style>
