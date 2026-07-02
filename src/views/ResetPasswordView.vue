<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import RotaryWheelIcon from '@/components/RotaryWheelIcon.vue'

const router = useRouter()

const verifying = ref(true)
const verifyError = ref('')

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMsg = ref('')

// 重設密碼信連結有三種可能格式，比照 AcceptInviteView 的處理方式
onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const tokenHash = params.get('token_hash')
  const type = params.get('type')
  const code = params.get('code')

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as 'recovery' | 'email' })
    if (error) verifyError.value = error.message
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) verifyError.value = error.message
  } else {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) verifyError.value = '重設密碼連結無效或已過期，請重新申請忘記密碼'
  }

  if (!verifyError.value) {
    router.replace({ path: '/reset-password' })
  }
  verifying.value = false
})

async function handleSubmit() {
  errorMsg.value = ''

  if (password.value.length < 8) {
    errorMsg.value = '密碼至少需要 8 個字元'
    return
  }
  if (password.value !== confirmPassword.value) {
    errorMsg.value = '兩次輸入的密碼不一致'
    return
  }

  loading.value = true
  const { error } = await supabase.auth.updateUser({ password: password.value })

  if (error) {
    loading.value = false
    errorMsg.value = error.message
    return
  }

  await supabase.auth.signOut()
  loading.value = false
  router.push({ name: 'login', query: { reset: '1' } })
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

      <template v-if="verifying">
        <p class="login-hint">正在驗證連結…</p>
      </template>

      <template v-else-if="verifyError">
        <h1 class="page-title">重設密碼連結無法使用</h1>
        <p class="login-error" style="margin-top:8px;">{{ verifyError }}</p>
        <p class="login-hint">
          <router-link to="/forgot-password" class="login-link">重新申請忘記密碼</router-link>
        </p>
      </template>

      <template v-else>
        <h1 class="page-title">重新設定密碼</h1>
        <p class="login-hint" style="margin-top:0; margin-bottom:20px;">請設定新的登入密碼，設定完成後請用新密碼重新登入。</p>

        <form class="login-form" @submit.prevent="handleSubmit">
          <div class="form-group">
            <label class="fl">新密碼</label>
            <input v-model="password" type="password" class="fi" placeholder="至少 8 個字元" autocomplete="new-password" required />
          </div>
          <div class="form-group">
            <label class="fl">確認密碼</label>
            <input v-model="confirmPassword" type="password" class="fi" placeholder="再輸入一次" autocomplete="new-password" required />
          </div>

          <p v-if="errorMsg" class="login-error">{{ errorMsg }}</p>

          <button type="submit" class="btn btn-p login-btn" :disabled="loading">
            <span v-if="loading" class="btn-spinner"></span>
            {{ loading ? '設定中…' : '設定新密碼' }}
          </button>
        </form>
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

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group { display: flex; flex-direction: column; }

.login-error {
  font-size: 12px;
  color: var(--red);
  background: rgba(176,48,48,.08);
  border-radius: var(--r);
  padding: 8px 12px;
}

.login-btn {
  width: 100%;
  justify-content: center;
  padding: 11px;
  font-size: 14px;
  margin-top: 4px;
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
  font-size: 12px;
  color: var(--muted);
  margin-top: 20px;
  line-height: 1.6;
}

.login-link {
  color: var(--navy);
  font-weight: 600;
  text-decoration: underline;
}
</style>
