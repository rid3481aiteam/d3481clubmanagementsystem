import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast {
  id: number
  message: string
  type: 'ok' | 'err'
}

let nextId = 1

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])

  function show(message: string, type: 'ok' | 'err' = 'ok', duration = 3000) {
    const id = nextId++
    toasts.value.push({ id, message, type })
    setTimeout(() => remove(id), duration)
  }

  function remove(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return { toasts, show, remove }
})
