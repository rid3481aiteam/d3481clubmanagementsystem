<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFeaturesStore } from '@/stores/features'
import { useOnboardingStore } from '@/stores/onboarding'

interface TourStep {
  route?: string
  target?: string
  title: string
  body: string
}

const auth = useAuthStore()
const features = useFeaturesStore()
const onboarding = useOnboardingStore()
const router = useRouter()
const route = useRoute()

const WELCOME: TourStep = {
  title: '歡迎使用 3481 地區管理平台 👋',
  body: '花 30 秒認識一下平台最常用的三個地方，之後隨時可以點右上角的「🧭 導覽」重新查看。',
}
const FINISH: TourStep = {
  title: '導覽結束，開始使用吧 🎉',
  body: '有任何問題都可以點右上角的「🧭 導覽」再看一次。祝使用愉快！',
}

// 例會管理／社友名冊對應的 feature flag 若被關閉，選單本身不會出現，
// 導覽也要跟著跳過，避免指向一顆點不進去的按鈕。
const steps = computed<TourStep[]>(() => {
  const mid: TourStep[] = [
    {
      route: '/', target: 'nav-dashboard',
      title: '📊 儀表板',
      body: '登入後的第一站。這裡整理了目前需要你協助處理的事項（待辦提醒、需要關懷的社友），以及本社現況的統整資訊，隨時掌握社務動態。',
    },
  ]
  if (features.isEnabled('B1_meeting_info') || features.isEnabled('E1_activities')) {
    mid.push({
      route: '/activities', target: 'nav-activities',
      title: '📅 活動',
      body: '例會與社友活動都在這裡，可依類別（例會／社內活動／友社活動／地區活動／其他）篩選，點進去查看時間地點、完成「報名」或「不克參加」回覆。',
    })
  }
  if (features.isEnabled('D1_roster')) {
    mid.push({
      route: '/roster', target: 'nav-roster',
      title: '📋 社友名冊',
      body: '點開「社的成員」選單裡的「社友名冊」，查詢全社社友的通訊錄，電話、Email 等聯絡方式一目了然，不用再翻紙本名冊。',
    })
  }
  return [WELCOME, ...mid, FINISH]
})

const visible = ref(false)
const stepIndex = ref(0)
const targetRect = ref<DOMRect | null>(null)

const currentStep = computed(() => steps.value[stepIndex.value] ?? null)
const isFirst = computed(() => stepIndex.value === 0)
const isLast = computed(() => stepIndex.value === steps.value.length - 1)

async function open() {
  stepIndex.value = 0
  visible.value = true
  await goToStep(0)
}

function close() {
  visible.value = false
  targetRect.value = null
}

async function finish() {
  close()
  if (!auth.profile?.onboarding_completed_at) await auth.completeOnboarding()
}

async function next() {
  if (isLast.value) {
    await finish()
    return
  }
  stepIndex.value++
  await goToStep(stepIndex.value)
}

async function prev() {
  if (isFirst.value) return
  stepIndex.value--
  await goToStep(stepIndex.value)
}

async function goToStep(index: number) {
  const step = steps.value[index]
  if (!step) return
  if (step.route && route.path !== step.route) {
    await router.push(step.route)
  }
  await nextTick()
  await measure(step)
}

async function measure(step: TourStep) {
  if (!step.target) {
    targetRect.value = null
    return
  }
  // TopMenu 換頁後選單重新渲染／橫向捲動需要一個 frame 才會穩定，
  // 提早量測會抓到舊位置。
  await new Promise(resolve => requestAnimationFrame(resolve))
  const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
  if (el) {
    el.scrollIntoView({ block: 'nearest', inline: 'center' })
    await new Promise(resolve => requestAnimationFrame(resolve))
    targetRect.value = el.getBoundingClientRect()
  } else {
    targetRect.value = null
  }
}

function updateRect() {
  const step = currentStep.value
  if (!visible.value || !step?.target) return
  const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
  targetRect.value = el ? el.getBoundingClientRect() : null
}

const POPOVER_WIDTH = 320

const popoverStyle = computed(() => {
  const rect = targetRect.value
  if (!rect) {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }
  const margin = 14
  const spaceBelow = window.innerHeight - rect.bottom
  const placeAbove = spaceBelow < 180 && rect.top > 180
  const top = placeAbove ? rect.top - margin : rect.bottom + margin
  let left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2
  left = Math.max(12, Math.min(left, window.innerWidth - POPOVER_WIDTH - 12))
  return {
    top: `${top}px`,
    left: `${left}px`,
    transform: placeAbove ? 'translateY(-100%)' : 'none',
  }
})

const spotlightStyle = computed(() => {
  const rect = targetRect.value
  if (!rect) return null
  const pad = 6
  return {
    top: `${rect.top - pad}px`,
    left: `${rect.left - pad}px`,
    width: `${rect.width + pad * 2}px`,
    height: `${rect.height + pad * 2}px`,
  }
})

function onKeydown(e: KeyboardEvent) {
  if (!visible.value) return
  if (e.key === 'Escape') finish()
}

function onViewportChange() {
  updateRect()
}

watch(() => auth.needsOnboarding, (needs) => { if (needs) open() }, { immediate: true })
watch(() => onboarding.requestId, (id) => { if (id > 0) open() })

onMounted(() => {
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="tour-layer">
      <div class="tour-scrim" :class="{ transparent: !!spotlightStyle }"></div>
      <div v-if="spotlightStyle" class="tour-spotlight" :style="spotlightStyle"></div>

      <div class="tour-pop" :style="popoverStyle">
        <button class="tour-close" aria-label="關閉導覽" @click="finish">×</button>
        <h3>{{ currentStep?.title }}</h3>
        <p>{{ currentStep?.body }}</p>
        <div class="tour-foot">
          <div class="tour-dots">
            <span v-for="(_, i) in steps" :key="i" class="tour-dot" :class="{ on: i === stepIndex }"></span>
          </div>
          <div class="tour-actions">
            <button v-if="!isFirst" class="btn btn-g btn-sm" @click="prev">上一步</button>
            <button v-if="!isLast" class="btn btn-g btn-sm" @click="finish">略過</button>
            <button class="btn btn-gold btn-sm" @click="next">{{ isLast ? '開始使用' : '下一步' }}</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.tour-layer { position: fixed; inset: 0; z-index: 2000; }

.tour-scrim {
  position: fixed;
  inset: 0;
  background: rgba(10, 16, 30, .55);
  pointer-events: auto;
}
.tour-scrim.transparent { background: transparent; }

.tour-spotlight {
  position: fixed;
  border-radius: var(--r);
  box-shadow: 0 0 0 4000px rgba(10, 16, 30, .55), 0 0 0 3px var(--gold), 0 0 20px rgba(184, 137, 42, .55);
  pointer-events: none;
  transition: top .2s ease, left .2s ease, width .2s ease, height .2s ease;
}

.tour-pop {
  position: fixed;
  width: 320px;
  max-width: 92vw;
  background: var(--card);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
  padding: 20px 22px;
  transition: top .2s ease, left .2s ease;
}

.tour-close {
  position: absolute;
  top: 10px; right: 12px;
  background: none;
  border: none;
  font-size: 18px;
  line-height: 1;
  color: var(--muted);
  cursor: pointer;
}

.tour-pop h3 { font-size: 16px; font-weight: 700; color: var(--navy); margin-bottom: 8px; padding-right: 16px; }
.tour-pop p { font-size: 13.5px; color: var(--text); line-height: 1.6; }

.tour-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 18px; gap: 10px; }
.tour-dots { display: flex; gap: 5px; }
.tour-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border); }
.tour-dot.on { background: var(--gold); }
.tour-actions { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
</style>
