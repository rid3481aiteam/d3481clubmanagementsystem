import { useAuthStore } from '@/stores/auth'
import { useBugReportsStore } from '@/stores/bugReports'

// 前端自動錯誤擷取（方案 B）：只抓得到會拋出例外的錯誤（白畫面、
// API 失敗、Vue render 錯誤），抓不到「邏輯正確但結果錯」這種沒有
// 拋錯的 bug，仍需搭配人工稽核跟使用者主動回報（方案 A）互補。

const MAX_AUTO_REPORTS_PER_SESSION = 10
const reportedMessages = new Set<string>()
let autoReportCount = 0

// 一些不代表真的壞掉、雜訊很多的瀏覽器警告，忽略掉避免洗版
const IGNORED_PATTERNS = [/ResizeObserver loop/i, /^Script error\.?$/]

export function reportError(message: string | null | undefined, stack: string | null) {
  if (!message) return
  if (IGNORED_PATTERNS.some(p => p.test(message))) return
  if (autoReportCount >= MAX_AUTO_REPORTS_PER_SESSION) return
  if (reportedMessages.has(message)) return
  reportedMessages.add(message)

  const auth = useAuthStore()
  if (!auth.user) return

  autoReportCount++
  const bugReports = useBugReportsStore()
  bugReports.submitAutoReport({
    reporterId: auth.user.id,
    clubId: auth.clubId,
    pagePath: window.location.pathname + window.location.search,
    userAgent: navigator.userAgent,
    errorMessage: message,
    errorStack: stack,
  }).catch(() => {})
}

export function initGlobalErrorHandlers() {
  window.addEventListener('error', event => {
    reportError(event.message, event.error?.stack ?? null)
  })
  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason
    const message = reason instanceof Error ? reason.message : String(reason)
    const stack = reason instanceof Error ? (reason.stack ?? null) : null
    reportError(message, stack)
  })
}
