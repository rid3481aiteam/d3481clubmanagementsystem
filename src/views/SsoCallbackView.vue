<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import RotaryWheelIcon from '@/components/RotaryWheelIcon.vue'

const router = useRouter()

const verifying = ref(true)
const errorMsg = ref('')

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')
  const ssoError = params.get('error')

  const savedState = sessionStorage.getItem('rotarysso_state')
  sessionStorage.removeItem('rotarysso_state')

  if (ssoError) {
    errorMsg.value = '登入已取消或被拒絕。'
    verifying.value = false
    return
  }

  if (!code || !state || state !== savedState) {
    errorMsg.value = '登入驗證失敗，請重新登入。'
    verifying.value = false
    return
  }

  try {
    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sso-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        code,
        redirect_uri: `${window.location.origin}/auth/sso/callback`,
      }),
    })
    const result = await resp.json()

    if (!resp.ok) {
      errorMsg.value = result.error ?? '登入失敗，請重新嘗試。'
      verifying.value = false
      return
    }

    const { error } = await supabase.auth.verifyOtp({
      email: result.email,
      token_hash: result.token_hash,
      type: 'email',
    })

    if (error) {
      errorMsg.value = '建立登入狀態失敗，請重新嘗試。'
      verifying.value = false
      return
    }

    router.replace('/')
  } catch {
    errorMsg.value = '登入過程發生錯誤，請重新嘗試。'
    verifying.value = false
  }
})
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

      <template v-if="verifying">
        <p class="login-hint">正在驗證扶輪帳號登入…</p>
      </template>

      <template v-else>
        <p class="login-error">{{ errorMsg }}</p>
        <p class="login-hint">
          <router-link to="/login" class="login-link">回登入頁重新嘗試</router-link>
        </p>
      </template>
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
  max-width: 400px;
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

.login-error {
  font-size: 12px;
  color: var(--red);
  background: rgba(176,48,48,.08);
  border-radius: var(--r);
  padding: 8px 12px;
}

.login-hint {
  text-align: center;
  font-size: 12px;
  color: var(--muted);
  margin-top: 16px;
  line-height: 1.6;
}

.login-link {
  color: var(--navy);
  font-weight: 600;
  text-decoration: underline;
}
</style>
