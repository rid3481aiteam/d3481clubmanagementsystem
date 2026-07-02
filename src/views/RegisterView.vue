<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import RotaryWheelIcon from '@/components/RotaryWheelIcon.vue'
import type { UserRole } from '@/types'

const router = useRouter()

// 跟 ClubListView 的分區排序共用同一份順序，註冊頁的分區下拉才會跟後台一致
const ZONE_ORDER = [
  '第一分區', '第二分區', '第三分區', '第四分區', '第五分區',
  '第六分區', '第七分區', '第八分區', '第九分區', '第十分區', '第十一分區',
]

function zoneRank(zone: string) {
  const i = ZONE_ORDER.indexOf(zone)
  return i === -1 ? ZONE_ORDER.length : i
}

const email = ref('')
const zone = ref('')
const clubId = ref('')
const requestedRole = ref<UserRole>('club_member')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMsg = ref('')

const clubs = ref<{ id: string; name: string; zone: string }[]>([])
const clubsLoading = ref(true)

onMounted(async () => {
  const { data } = await supabase.rpc('public_clubs_for_registration')
  clubs.value = data ?? []
  clubsLoading.value = false
})

const zones = computed(() => {
  const set = new Set(clubs.value.map(c => c.zone || '未分區'))
  return [...set].sort((a, b) => zoneRank(a) - zoneRank(b) || a.localeCompare(b))
})

const clubsInZone = computed(() => clubs.value.filter(c => (c.zone || '未分區') === zone.value))

function onZoneChange() {
  clubId.value = ''
}

const canSubmit = computed(() => !!email.value && !!zone.value && !!clubId.value && !!password.value && !!confirmPassword.value)

function translateAuthError(message: string): string {
  if (message.includes('already registered')) return '此 Email 已經註冊過帳號，請直接登入或使用忘記密碼功能。'
  return message
}

async function handleSubmit() {
  errorMsg.value = ''

  if (!clubId.value) {
    errorMsg.value = '請先選擇所屬社團'
    return
  }
  if (password.value.length < 8) {
    errorMsg.value = '密碼至少需要 8 個字元'
    return
  }
  if (password.value !== confirmPassword.value) {
    errorMsg.value = '兩次輸入的密碼不一致'
    return
  }

  loading.value = true
  const { error } = await supabase.auth.signUp({
    email: email.value.trim(),
    password: password.value,
    options: {
      data: { club_id: clubId.value, requested_role: requestedRole.value },
      emailRedirectTo: `${window.location.origin}/verify-email`,
    },
  })
  loading.value = false

  if (error) {
    errorMsg.value = translateAuthError(error.message)
    return
  }

  router.push({ name: 'login', query: { registered: '1' } })
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

      <h1 class="page-title">註冊新帳號</h1>

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
        <div class="form-group">
          <label class="fl">分區</label>
          <select v-model="zone" class="fi" required :disabled="clubsLoading" @change="onZoneChange">
            <option value="" disabled>{{ clubsLoading ? '載入中…' : '請選擇' }}</option>
            <option v-for="z in zones" :key="z" :value="z">{{ z }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="fl">所屬社團</label>
          <select v-model="clubId" class="fi" required :disabled="!zone">
            <option value="" disabled>{{ zone ? '請選擇' : '請先選擇分區' }}</option>
            <option v-for="c in clubsInZone" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="fl">職稱</label>
          <select v-model="requestedRole" class="fi">
            <option value="club_admin">社長</option>
            <option value="club_secretary">執秘</option>
            <option value="club_member">社員</option>
          </select>
        </div>
        <div class="form-group">
          <label class="fl">密碼</label>
          <input
            v-model="password"
            type="password"
            class="fi"
            placeholder="至少 8 個字元"
            autocomplete="new-password"
            required
          />
        </div>
        <div class="form-group">
          <label class="fl">確認密碼</label>
          <input
            v-model="confirmPassword"
            type="password"
            class="fi"
            placeholder="再輸入一次"
            autocomplete="new-password"
            required
          />
        </div>

        <p v-if="errorMsg" class="login-error">{{ errorMsg }}</p>

        <button type="submit" class="btn btn-p login-btn" :disabled="loading || !canSubmit">
          <span v-if="loading" class="btn-spinner"></span>
          {{ loading ? '註冊中…' : '註冊' }}
        </button>
      </form>

      <p class="login-hint">
        已經有帳號了？
        <router-link to="/login" class="login-link">直接登入</router-link>
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
  margin-bottom: 20px;
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
}

.login-link {
  color: var(--navy);
  font-weight: 600;
  text-decoration: underline;
}
</style>
