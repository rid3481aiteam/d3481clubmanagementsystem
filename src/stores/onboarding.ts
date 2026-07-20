import { defineStore } from 'pinia'
import { ref } from 'vue'

// 純前端狀態，不進資料庫：讓 TopNav 的「🧭 導覽」按鈕可以隨時重新
// 觸發 OnboardingTour，不受 auth.needsOnboarding（已完成就不會再是 true）影響。
export const useOnboardingStore = defineStore('onboarding', () => {
  const requestId = ref(0)

  function restart() {
    requestId.value++
  }

  return { requestId, restart }
})
