<template>
  <div ref="rootEl" class="app-launcher">
    <button
      type="button"
      class="launcher-btn"
      aria-haspopup="true"
      :aria-expanded="open"
      aria-label="應用服務"
      title="應用服務"
      @click="toggle"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <circle v-for="(dot, i) in dots" :key="i" :cx="dot.cx" :cy="dot.cy" r="2" fill="currentColor" />
      </svg>
    </button>

    <div v-if="open" class="launcher-panel" role="menu">
      <p v-if="apps === undefined" class="launcher-msg">載入中…</p>
      <p v-else-if="apps === null" class="launcher-msg">暫時無法載入應用清單</p>
      <p v-else-if="apps.length === 0" class="launcher-msg">目前尚無可用的應用系統</p>
      <div v-else class="launcher-grid">
        <div
          v-for="a in apps"
          :key="a.clientId"
          class="launcher-tile"
          :class="{ current: a.clientId === currentAppKey }"
        >
          <template v-if="a.clientId === currentAppKey">
            <div role="menuitem" aria-current="true" :title="`${a.name}（目前）`" class="tile-inner current">
              <AppIcon :app="a" />
              <span class="tile-label">{{ a.name }}</span>
            </div>
          </template>
          <a
            v-else
            role="menuitem"
            :href="launchUrl(a)"
            target="_blank"
            rel="noopener noreferrer"
            :title="a.name"
            class="tile-inner"
          >
            <AppIcon :app="a" />
            <span class="tile-label">{{ a.name }}</span>
          </a>
        </div>
      </div>
      <div class="launcher-footer">
        <a :href="MORE_URL" target="_blank" rel="noopener noreferrer" class="launcher-more">查看全部應用 →</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue'
import { supabase } from '@/lib/supabase'

interface RotarySsoApp {
  clientId: string
  name: string
  description: string | null
  redirectUri: string
  scope: string
  homepageUrl: string | null
  logoUrl: string | null
}

const MORE_URL = 'https://rotarysso.vercel.app/apps'
const currentAppKey = import.meta.env.VITE_ROTARYSSO_CLIENT_ID as string | undefined

const dots = [0, 1, 2].flatMap(r => [0, 1, 2].map(c => ({ cx: 4 + c * 8, cy: 4 + r * 8 })))

const open = ref(false)
const loaded = ref(false)
const apps = ref<RotarySsoApp[] | null | undefined>(undefined)
const rootEl = ref<HTMLElement | null>(null)

const PALETTE = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#4b5563']

function fallbackColor(key: string) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  return PALETTE[Math.abs(h) % PALETTE.length]
}

function initial(name: string) {
  const t = (name || '').trim()
  return t ? Array.from(t)[0].toUpperCase() : '?'
}

function safeIcon(u: string | null): u is string {
  try {
    return !!u && new URL(u).protocol === 'https:'
  } catch {
    return false
  }
}

function launchUrl(a: RotarySsoApp) {
  if (a.homepageUrl) return a.homepageUrl
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: a.clientId,
    redirect_uri: a.redirectUri,
    scope: a.scope,
  })
  return `https://rotarysso.vercel.app/oauth/authorize?${params.toString()}`
}

// 小型內部元件：圖示合法就顯示，否則用色塊＋名稱首字 fallback（同一 app 依 clientId 永遠同色）
const AppIcon = defineComponent({
  props: { app: { type: Object as () => RotarySsoApp, required: true } },
  setup(props) {
    return () => safeIcon(props.app.logoUrl)
      ? h('img', { src: props.app.logoUrl, alt: '', class: 'tile-icon-img' })
      : h('span', { class: 'tile-icon-fallback', style: { background: fallbackColor(props.app.clientId) } }, initial(props.app.name))
  },
})

async function loadApps() {
  if (loaded.value) return
  loaded.value = true
  const { data, error } = await supabase.functions.invoke('list-apps')
  apps.value = (!error && data?.success && Array.isArray(data.data)) ? data.data : null
}

function toggle() {
  open.value = !open.value
  if (open.value) void loadApps()
}

function onDocClick(e: MouseEvent) {
  if (open.value && rootEl.value && !rootEl.value.contains(e.target as Node)) open.value = false
}

function onDocKeydown(e: KeyboardEvent) {
  if (open.value && e.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('mousedown', onDocClick)
  document.addEventListener('keydown', onDocKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocClick)
  document.removeEventListener('keydown', onDocKeydown)
})
</script>

<style scoped>
.app-launcher {
  position: relative;
  display: inline-block;
}

.launcher-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: rgba(255, 255, 255, .85);
}

.launcher-btn:hover {
  background: rgba(255, 255, 255, .1);
}

.launcher-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 60;
  width: 288px;
  max-width: 92vw;
  background: #fff;
  color: #111827;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, .18);
  padding: 12px;
  font-size: 14px;
}

.launcher-msg {
  margin: 8px 4px;
  color: #6b7280;
}

.launcher-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.tile-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 6px;
  border-radius: 10px;
  text-decoration: none;
  color: #111827;
  text-align: center;
}

.tile-inner.current {
  outline: 2px solid #2563eb;
  background: #eff6ff;
  cursor: default;
}

.tile-inner:not(.current):hover {
  background: #f3f4f6;
}

.tile-icon-img {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: cover;
}

.tile-icon-fallback {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
}

.tile-label {
  font-size: 13px;
  line-height: 1.25;
  max-height: 2.5em;
  overflow: hidden;
}

.launcher-footer {
  border-top: 1px solid #f0f0f0;
  margin-top: 10px;
  padding-top: 8px;
}

.launcher-more {
  display: block;
  text-align: center;
  color: #2563eb;
  text-decoration: none;
  padding: 4px;
}
</style>
