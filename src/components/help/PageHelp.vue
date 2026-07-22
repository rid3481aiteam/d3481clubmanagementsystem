<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'

defineProps<{
  title: string
  items: string[]
}>()

const btnRef = ref<HTMLElement | null>(null)
const open = ref(false)
const panelStyle = ref({ top: '0px', left: '0px' })

function toggle() {
  if (open.value) {
    close()
    return
  }
  const rect = btnRef.value?.getBoundingClientRect()
  if (!rect) return
  const panelWidth = 320
  const left = Math.max(12, Math.min(rect.left, window.innerWidth - panelWidth - 12))
  panelStyle.value = { top: `${rect.bottom + 8}px`, left: `${left}px` }
  open.value = true
  document.addEventListener('click', close)
  window.addEventListener('keydown', onKeydown)
}

function close() {
  open.value = false
  document.removeEventListener('click', close)
  window.removeEventListener('keydown', onKeydown)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

onBeforeUnmount(() => {
  document.removeEventListener('click', close)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <button ref="btnRef" type="button" class="page-help-btn" aria-label="使用教學" title="使用教學" @click.stop="toggle">?</button>

  <Teleport to="body">
    <div v-if="open" class="page-help-panel" :style="panelStyle" @click.stop>
      <div class="page-help-head">
        <strong>{{ title }}</strong>
        <button class="page-help-close" aria-label="關閉" @click="close">×</button>
      </div>
      <ul class="page-help-list">
        <li v-for="(item, i) in items" :key="i">{{ item }}</li>
      </ul>
    </div>
  </Teleport>
</template>

<style scoped>
.page-help-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
}
.page-help-btn:hover {
  border-color: var(--gold);
  color: var(--navy);
}

.page-help-panel {
  position: fixed;
  width: 320px;
  max-width: 92vw;
  background: var(--card);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
  padding: 16px 18px;
  z-index: 300;
}
.page-help-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.page-help-head strong {
  font-size: 14px;
  color: var(--navy);
}
.page-help-close {
  background: none;
  border: none;
  font-size: 18px;
  line-height: 1;
  color: var(--muted);
  cursor: pointer;
}
.page-help-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.page-help-list li {
  font-size: 13px;
  color: var(--text);
  line-height: 1.6;
  padding-left: 16px;
  position: relative;
}
.page-help-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--gold);
}
</style>
