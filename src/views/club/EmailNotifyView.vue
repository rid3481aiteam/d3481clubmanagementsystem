<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useEmailNotifyStore } from '@/stores/emailNotify'
import PageHelp from '@/components/help/PageHelp.vue'

const auth = useAuthStore()
const emailNotify = useEmailNotifyStore()

const emailNotifyHelpItems = [
  '這裡設定的是本社自己的 Gmail 帳號，跟「LINE 通知設定」是兩件獨立的事，只想用其中一種通知方式也沒關係，不用兩個都設定。',
  '密碼欄位要填的是「應用程式密碼」，不是平常登入 Gmail 用的密碼——這是 Google 的安全機制，要先到該 Gmail 帳號開啟兩步驟驗證，才能在應用程式密碼頁面產生一組 16 碼的專用密碼。',
  '這裡只負責設定「本社要用哪組 Gmail 寄信」，實際上新增例會時會不會真的自動發信，是由地區管理員在「功能開關管理」統一控制的開關決定，這頁設定好不代表通知功能已經啟用。',
  '設定完成後先按「發送測試信」寄一封給自己確認帳密沒填錯；之後新增例會時，表單裡會多一個社友勾選清單，預設全選，可以自己取消勾選不想寄的人。',
]

const emailInput = ref('')
const passwordInput = ref('')
const saving = ref(false)
const saveError = ref<string | null>(null)
const saved = ref(false)

const testEmailInput = ref('')

const isConnected = computed(() => !!emailNotify.channel?.email_from)

async function save() {
  if (!auth.clubId || !emailInput.value.trim() || !passwordInput.value.trim()) return
  saving.value = true
  saveError.value = null
  saved.value = false
  const { error } = await emailNotify.saveChannel(auth.clubId, emailInput.value, passwordInput.value, auth.user?.id ?? null)
  saving.value = false
  if (error) {
    saveError.value = error.message
    return
  }
  passwordInput.value = ''
  saved.value = true
}

async function sendTest() {
  if (!testEmailInput.value.trim()) return
  await emailNotify.sendTestEmail(testEmailInput.value.trim())
}

onMounted(() => {
  if (auth.clubId) {
    emailNotify.fetchChannel(auth.clubId).then(() => {
      emailInput.value = emailNotify.channel?.email_from ?? ''
    })
  }
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <div style="display:flex; align-items:center; gap:8px;">
        <h1>Email 通知設定</h1>
        <PageHelp title="Email 通知設定怎麼用" :items="emailNotifyHelpItems" />
      </div>
      <span class="bdg b-y">測試中功能</span>
    </div>

    <p style="color:var(--muted); font-size:13px; margin-bottom:16px;">
      設定本社自己的 Gmail 帳號後，新增例會時可以自動發信通知本社社友（社友名冊裡有登記 Email 的人）。
      是否真的發信由地區管理員在「功能開關管理」統一控制，這裡只負責設定本社要用哪組 Gmail 帳號寄信。
    </p>

    <div class="tw" style="padding:20px; margin-bottom:20px;">
      <h2 style="font-size:15px; font-weight:700; color:var(--navy); margin-bottom:4px;">1. 設定 Gmail 帳號 + 應用程式密碼</h2>
      <p style="font-size:12.5px; color:var(--muted); margin-bottom:14px;">
        先到 Google 帳號開啟兩步驟驗證，再到
        <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener">應用程式密碼</a>
        頁面產生一組 16 碼的應用程式密碼（**不是**你平常登入 Gmail 的密碼），貼在下面。
      </p>

      <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
        <span class="bdg" :class="isConnected ? 'b-gr' : 'b-g'">{{ isConnected ? '已設定' : '尚未設定' }}</span>
        <span v-if="isConnected" style="font-size:12.5px; color:var(--muted);">目前寄件帳號：{{ emailNotify.channel?.email_from }}</span>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; margin-bottom:12px;">
        <div>
          <label class="fl">Gmail 帳號</label>
          <input v-model="emailInput" type="email" class="fi" placeholder="例如：3481club@gmail.com" />
        </div>
        <div>
          <label class="fl">應用程式密碼</label>
          <input v-model="passwordInput" type="password" class="fi" placeholder="16 碼應用程式密碼" />
        </div>
      </div>
      <button class="btn btn-gold" :disabled="saving" @click="save">{{ saving ? '儲存中...' : '儲存憑證' }}</button>
      <span v-if="saved" style="margin-left:10px; color:var(--green); font-size:13px;">已儲存</span>
      <span v-if="saveError" style="margin-left:10px; color:var(--red); font-size:13px;">{{ saveError }}</span>
    </div>

    <div class="tw" style="padding:20px;">
      <h2 style="font-size:15px; font-weight:700; color:var(--navy); margin-bottom:4px;">2. 發送測試信</h2>
      <p style="font-size:12.5px; color:var(--muted); margin-bottom:10px;">
        確認上面的 Gmail 帳號跟應用程式密碼設定正確，先寄一封測試信給自己看看。
      </p>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <input v-model="testEmailInput" type="email" class="fi" style="max-width:280px;" placeholder="輸入要收測試信的 Email" />
        <button class="btn btn-gold" :disabled="emailNotify.sending" @click="sendTest">{{ emailNotify.sending ? '發送中...' : '發送測試信' }}</button>
      </div>
      <p v-if="emailNotify.sendResult" style="margin-top:10px; color:var(--green); font-size:13px;">{{ emailNotify.sendResult }}</p>
      <p v-if="emailNotify.sendError" style="margin-top:10px; color:var(--red); font-size:13px;">{{ emailNotify.sendError }}</p>
    </div>
  </div>
</template>
