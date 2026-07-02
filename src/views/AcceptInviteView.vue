<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'

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
  <div class="page" style="max-width:420px;">
    <div class="ph">
      <h1>設定登入密碼</h1>
    </div>
    <div class="tw" style="padding:24px;">
      <p style="font-size:13px; color:var(--muted); margin-bottom:16px;">
        歡迎加入！請設定您的登入密碼，設定完成後請用 Email + 新密碼重新登入本平台。
      </p>
      <form @submit.prevent="handleSubmit" style="display:flex; flex-direction:column; gap:14px;">
        <div>
          <label class="fl">新密碼</label>
          <input v-model="password" type="password" class="fi" placeholder="至少 8 個字元" autocomplete="new-password" required />
        </div>
        <div>
          <label class="fl">確認密碼</label>
          <input v-model="confirmPassword" type="password" class="fi" placeholder="再輸入一次" autocomplete="new-password" required />
        </div>
        <p v-if="errorMsg" style="font-size:12px; color:var(--red); background:rgba(176,48,48,.08); border-radius:var(--r); padding:8px 12px;">{{ errorMsg }}</p>
        <button type="submit" class="btn btn-p" :disabled="loading" style="justify-content:center;">
          {{ loading ? '設定中…' : '設定密碼' }}
        </button>
      </form>
    </div>
  </div>
</template>
