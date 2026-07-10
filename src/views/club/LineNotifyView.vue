<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useLineNotifyStore } from '@/stores/lineNotify'

const auth = useAuthStore()
const lineNotify = useLineNotifyStore()

const webhookUrl = computed(() => {
  const base = import.meta.env.VITE_SUPABASE_URL as string
  return auth.clubId ? `${base}/functions/v1/line-webhook?club=${auth.clubId}` : ''
})

const secretInput = ref('')
const tokenInput = ref('')
const saving = ref(false)
const saveError = ref<string | null>(null)
const saved = ref(false)

const testMessage = ref('')

const isConnected = computed(() => lineNotify.channel?.status === 'connected')

async function save() {
  if (!auth.clubId || !secretInput.value.trim() || !tokenInput.value.trim()) return
  saving.value = true
  saveError.value = null
  saved.value = false
  const { error } = await lineNotify.saveChannel(auth.clubId, secretInput.value, tokenInput.value, auth.user?.id ?? null)
  saving.value = false
  if (error) {
    saveError.value = error.message
    return
  }
  secretInput.value = ''
  tokenInput.value = ''
  saved.value = true
}

async function copyWebhookUrl() {
  try {
    await navigator.clipboard.writeText(webhookUrl.value)
  } catch {
    // 瀏覽器不支援 clipboard API 就算了，使用者可以自己選取複製
  }
}

async function sendTest() {
  if (!testMessage.value.trim()) return
  const { error } = await lineNotify.sendTestMessage(testMessage.value)
  if (!error) testMessage.value = ''
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

onMounted(() => {
  if (auth.clubId) {
    lineNotify.fetchChannel(auth.clubId)
    lineNotify.fetchBindings(auth.clubId)
  }
})
</script>

<template>
  <div class="page">
    <div class="ph">
      <h1>LINE 通知設定</h1>
      <span class="bdg b-y">測試中功能</span>
    </div>

    <p style="color:var(--muted); font-size:13px; margin-bottom:16px;">
      這是展示用的雛型：串接本社的 LINE 官方帳號後，社友加好友並傳入自己在名冊登記的手機號碼即可完成綁定，
      之後可以對已綁定的社友發送測試訊息。安全性（例如防止冒用他人手機號碼）之後正式導入前會再加強，
      目前先驗證「發得出去」這件事可行。
    </p>

    <div class="tw" style="padding:20px; margin-bottom:20px;">
      <h2 style="font-size:15px; font-weight:700; color:var(--navy); margin-bottom:4px;">1. 設定 LINE Messaging API 頻道</h2>
      <p style="font-size:12.5px; color:var(--muted); margin-bottom:14px;">
        到 <a href="https://developers.line.biz/console/" target="_blank" rel="noopener">LINE Developers Console</a>
        建立 Messaging API 頻道後，把 Channel Secret／Channel Access Token 貼在這裡。
      </p>

      <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
        <span class="bdg" :class="isConnected ? 'b-gr' : 'b-g'">{{ isConnected ? '已設定' : '尚未設定' }}</span>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; margin-bottom:12px;">
        <div>
          <label class="fl">Channel Secret</label>
          <input v-model="secretInput" type="password" class="fi" placeholder="貼上 Channel Secret" />
        </div>
        <div>
          <label class="fl">Channel Access Token</label>
          <input v-model="tokenInput" type="password" class="fi" placeholder="貼上 Channel Access Token" />
        </div>
      </div>
      <button class="btn btn-gold" :disabled="saving" @click="save">{{ saving ? '儲存中...' : '儲存憑證' }}</button>
      <span v-if="saved" style="margin-left:10px; color:var(--green); font-size:13px;">已儲存</span>
      <span v-if="saveError" style="margin-left:10px; color:var(--red); font-size:13px;">{{ saveError }}</span>
    </div>

    <div class="tw" style="padding:20px; margin-bottom:20px;">
      <h2 style="font-size:15px; font-weight:700; color:var(--navy); margin-bottom:4px;">2. 到 LINE Console 設定 Webhook URL</h2>
      <p style="font-size:12.5px; color:var(--muted); margin-bottom:10px;">
        在 Messaging API 頻道的 Webhook settings 貼上這個網址，並開啟「Use webhook」。
      </p>
      <div style="display:flex; gap:8px; align-items:center;">
        <input :value="webhookUrl" readonly class="fi" style="font-family:monospace; font-size:12.5px;" />
        <button class="btn btn-g btn-sm" @click="copyWebhookUrl">複製</button>
      </div>
    </div>

    <div class="tw" style="padding:20px; margin-bottom:20px;">
      <h2 style="font-size:15px; font-weight:700; color:var(--navy); margin-bottom:4px;">3. 發送測試訊息</h2>
      <p style="font-size:12.5px; color:var(--muted); margin-bottom:10px;">
        只會發給下面「已綁定社友」清單裡的人，不會發給所有加好友的人。
      </p>
      <textarea v-model="testMessage" class="fi" style="min-height:80px; margin-bottom:10px;" placeholder="輸入要發送的訊息內容"></textarea>
      <button class="btn btn-gold" :disabled="lineNotify.sending" @click="sendTest">{{ lineNotify.sending ? '發送中...' : '發送測試訊息' }}</button>
      <span v-if="lineNotify.sendResult" style="margin-left:10px; color:var(--green); font-size:13px;">{{ lineNotify.sendResult }}</span>
      <span v-if="lineNotify.sendError" style="margin-left:10px; color:var(--red); font-size:13px;">{{ lineNotify.sendError }}</span>
    </div>

    <div class="tw" style="padding:20px;">
      <h2 style="font-size:15px; font-weight:700; color:var(--navy); margin-bottom:12px;">已綁定社友（{{ lineNotify.bindings.length }} 人）</h2>
      <table class="card-table">
        <thead class="th">
          <tr>
            <th>姓名</th>
            <th>手機</th>
            <th>綁定時間</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in lineNotify.bindings" :key="b.id">
            <td data-label="姓名">{{ b.member_name }}</td>
            <td data-label="手機">{{ b.phone }}</td>
            <td data-label="綁定時間">{{ formatDateTime(b.bound_at) }}</td>
          </tr>
          <tr v-if="!lineNotify.bindings.length">
            <td colspan="3" style="text-align:center; color:var(--muted);">還沒有人綁定，請社友加 LINE 好友後輸入手機號碼</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
