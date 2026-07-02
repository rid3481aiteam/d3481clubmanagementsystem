<script setup lang="ts">
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import RotaryWheelIcon from '@/components/RotaryWheelIcon.vue'

const email = ref('')
const loading = ref(false)
const sent = ref(false)
const errorMsg = ref('')

async function handleSubmit() {
  errorMsg.value = ''
  loading.value = true
  const { error } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  loading.value = false

  if (error) {
    errorMsg.value = error.message
    return
  }

  // 不論該 Email 是否存在都顯示相同訊息，避免帳號列舉
  sent.value = true
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

      <template v-if="sent">
        <h1 class="page-title">請至信箱查收</h1>
        <p class="login-hint" style="margin-top:0;">
          若「{{ email }}」為已註冊的帳號，我們已寄出重設密碼信，請點擊信中連結重新設定密碼。
        </p>
      </template>

      <template v-else>
        <h1 class="page-title">忘記密碼</h1>
        <p class="login-hint" style="margin-top:0; margin-bottom:20px;">請輸入註冊時使用的 Email，我們將寄送重設密碼連結給您。</p>

        <form class="login-form" @submit.prevent="handleSubmit">
          <div class="form-group">
            <label class="fl">電子郵件</label>
            <input
              v-model="email"
              type="email"
              class="fi"
              placeholder="your@email.com"
              autocomplete="email"
              required
            />
          </div>

          <p v-if="errorMsg" class="login-error">{{ errorMsg }}</p>

          <button type="submit" class="btn btn-p login-btn" :disabled="loading">
            <span v-if="loading" class="btn-spinner"></span>
            {{ loading ? '寄送中…' : '寄送重設密碼信' }}
          </button>
        </form>
      </template>

      <p class="login-hint">
        <router-link to="/login" class="login-link">回到登入頁</router-link>
      </p>
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
