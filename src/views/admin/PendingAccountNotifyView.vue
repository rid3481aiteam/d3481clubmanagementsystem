<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDistrictNotifyStore } from '@/stores/districtNotify'
import PageHelp from '@/components/help/PageHelp.vue'

const auth = useAuthStore()
const districtNotify = useDistrictNotifyStore()

const helpItems = [
  '密碼欄位要填的是「應用程式密碼」，不是平常登入 Gmail 用的密碼——這是 Google 的安全機制，要先到該 Gmail 帳號開啟兩步驟驗證，才能在應用程式密碼頁面產生一組 16 碼的專用密碼。',
  '設定完成後先按「發送測試信」寄一封給自己確認帳密沒填錯；之後要到「功能開關管理」把「RotarySSO 新帳號待審核 Email 通知」打開，才會真的在有人申請時發信。',
  '「通知收件人」是自己指定的 Email，不是系統自動判斷的地區管理員名單，填誰就通知誰，可以填多個（用逗號分隔）。',
]

const emailInput = ref('')
const passwordInput = ref('')
const notifyToInput = ref('')
const saving = ref(false)
const saveError = ref<string | null>(null)
const saved = ref(false)

const testEmailInput = ref('')

const isConnected = computed(() => !!districtNotify.channel?.email_from)

async function save() {
  if (!emailInput.value.trim() || !passwordInput.value.trim() || !notifyToInput.value.trim()) return
  saving.value = true
  saveError.value = null
  saved.value = false
  const { error } = await districtNotify.saveChannel(emailInput.value, passwordInput.value, notifyToInput.value, auth.user?.id ?? null)
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
  await districtNotify.sendTestEmail(testEmailInput.value.trim())
}

onMounted(() => {
  districtNotify.fetchChannel().then(() => {
    emailInput.value = districtNotify.channel?.email_from ?? ''
    notifyToInput.value = districtNotify.channel?.notify_to ?? ''
  })
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <div style="display:flex; align-items:center; gap:8px;">
        <h1>帳號審核 Email 通知設定</h1>
        <PageHelp title="帳號審核 Email 通知怎麼用" :items="helpItems" />
      </div>
      <span class="bdg b-y">測試中功能</span>
    </div>

    <p style="color:var(--muted); font-size:13px; margin-bottom:16px;">
      設定一組地區共用的 Gmail 帳號＋要通知的收件人後，有人透過 RotarySSO 首次登入、
      產生待審核帳號時，會自動寄信通知指定的人，不用自己點進「帳號管理」頁才發現。
      是否真的發信由「功能開關管理」統一控制。
    </p>

    <div class="tw" style="padding:20px; margin-bottom:20px;">
      <h2 style="font-size:15px; font-weight:700; color:var(--navy); margin-bottom:4px;">1. 設定 Gmail 帳號 + 應用程式密碼 + 通知收件人</h2>
      <p style="font-size:12.5px; color:var(--muted); margin-bottom:10px;">
        先到 Google 帳號開啟兩步驟驗證，再到
        <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener">應用程式密碼</a>
        頁面產生一組 16 碼的應用程式密碼（**不是**平常登入 Gmail 的密碼），貼在下面。
      </p>

      <ol style="font-size:12.5px; color:var(--muted); line-height:1.7; margin:0 0 14px 18px; padding:0;">
        <li>點上面那個「應用程式密碼」連結，會開新分頁跳到 Google 帳戶的「應用程式密碼」設定頁（用想拿來寄信的那個 Gmail 帳號登入）。</li>
        <li>在「應用程式名稱」欄位輸入一個好辨認的名稱，例如「D3481帳號審核通知」，方便之後在密碼清單裡認出這組密碼的用途。</li>
        <li>輸入完按「建立」，會跳出一組系統產生的 16 碼密碼（用空格分成 4 組，長得像 xxxx xxxx xxxx xxxx）。<strong>這組密碼只會顯示這一次</strong>，先把它整組複製起來。</li>
        <li>回到這頁，把 Gmail 帳號填進下面的「Gmail 帳號」欄位，剛剛複製的密碼貼進「應用程式密碼」欄位（貼上時通常會自動去掉中間的空格，不影響使用），按「儲存憑證」。</li>
        <li>儲存後，到下面「2. 發送測試信」輸入想收測試信的 Email，按「發送測試信」確認能正常寄出。</li>
      </ol>

      <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
        <span class="bdg" :class="isConnected ? 'b-gr' : 'b-g'">{{ isConnected ? '已設定' : '尚未設定' }}</span>
        <span v-if="isConnected" style="font-size:12.5px; color:var(--muted);">目前寄件帳號：{{ districtNotify.channel?.email_from }}</span>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; margin-bottom:12px;">
        <div>
          <label class="fl">Gmail 帳號</label>
          <input v-model="emailInput" type="email" class="fi" placeholder="例如：d3481notify@gmail.com" />
        </div>
        <div>
          <label class="fl">應用程式密碼</label>
          <input v-model="passwordInput" type="password" class="fi" placeholder="16 碼應用程式密碼" />
        </div>
        <div>
          <label class="fl">通知收件人</label>
          <input v-model="notifyToInput" type="text" class="fi" placeholder="例如：ds@example.com, da@example.com" />
        </div>
      </div>
      <button class="btn btn-gold" :disabled="saving" @click="save">{{ saving ? '儲存中...' : '儲存設定' }}</button>
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
        <button class="btn btn-gold" :disabled="districtNotify.sending" @click="sendTest">{{ districtNotify.sending ? '發送中...' : '發送測試信' }}</button>
      </div>
      <p v-if="districtNotify.sendResult" style="margin-top:10px; color:var(--green); font-size:13px;">{{ districtNotify.sendResult }}</p>
      <p v-if="districtNotify.sendError" style="margin-top:10px; color:var(--red); font-size:13px;">{{ districtNotify.sendError }}</p>
    </div>
  </div>
</template>
