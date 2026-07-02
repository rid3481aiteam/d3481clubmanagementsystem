<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import RotaryWheelIcon from '@/components/RotaryWheelIcon.vue'

const router = useRouter()

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMsg = ref('')

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
  alert('密碼設定成功，請使用新密碼重新登入。')
  router.push('/login')
}
</script>

<template>
  <div class="invite-page">
    <div class="invite-card">
      <div class="invite-brand">
        <RotaryWheelIcon class="brand-wheel" />
        <div class="brand-text">
          <div class="brand-title">國際扶輪 3481 地區</div>
          <div class="brand-sub">社務管理平台</div>
        </div>
      </div>

      <h1 class="invite-title">設定登入密碼</h1>
      <p class="invite-hint">歡迎加入！請設定您的登入密碼，設定完成後請用 Email + 新密碼重新登入本平台。</p>

      <form class="invite-form" @submit.prevent="handleSubmit">
        <div class="form-group">
          <label class="fl">新密碼</label>
          <input v-model="password" type="password" class="fi" placeholder="至少 8 個字元" autocomplete="new-password" required />
        </div>
        <div class="form-group">
          <label class="fl">確認密碼</label>
          <input v-model="confirmPassword" type="password" class="fi" placeholder="再輸入一次" autocomplete="new-password" required />
        </div>

        <p v-if="errorMsg" class="invite-error">{{ errorMsg }}</p>

        <button type="submit" class="btn btn-p invite-btn" :disabled="loading">
          <span v-if="loading" class="btn-spinner"></span>
          {{ loading ? '設定中…' : '設定密碼' }}
        </button>
      </form>
    </div>
    <div class="invite-bg-stripe"></div>
  </div>
</template>

<style scoped>
.invite-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--navy);
  padding: 24px;
  position: relative;
  overflow: hidden;
}

.invite-bg-stripe {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 180px;
  background: var(--gold);
  opacity: .08;
  clip-path: polygon(0 60%, 100% 0%, 100% 100%, 0 100%);
}

.invite-card {
  background: var(--card);
  border-radius: 14px;
  padding: 40px 36px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 24px 80px rgba(0,0,0,.35);
  position: relative;
  z-index: 1;
}

.invite-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
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

.invite-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 8px;
}

.invite-hint {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 24px;
  line-height: 1.5;
}

.invite-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group { display: flex; flex-direction: column; }

.invite-error {
  font-size: 12px;
  color: var(--red);
  background: rgba(176,48,48,.08);
  border-radius: var(--r);
  padding: 8px 12px;
}

.invite-btn {
  width: 100%;
  justify-content: center;
  padding: 11px;
  font-size: 14px;
  margin-top: 4px;
}

.invite-btn:disabled { opacity: .6; cursor: not-allowed; }

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
</style>
