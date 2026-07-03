import { defineStore } from 'pinia'
import { ref } from 'vue'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type EdmScope = 'district' | 'club'

export const useEdmStore = defineStore('edm', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const title = ref('')
  const body = ref('')

  async function generate(scope: EdmScope, topic: string, keyPoints: string, tone: string) {
    loading.value = true
    error.value = null
    const { data, error: fnError } = await supabase.functions.invoke('generate-edm', {
      body: { scope, topic, key_points: keyPoints, tone },
    })
    loading.value = false

    if (fnError) {
      // fnError.message 只會是 Supabase client 包出來的通用文字
      // （例如「Edge Function returned a non-2xx status code」），
      // 真正的錯誤原因在 response body 裡，要另外解析出來。
      let message = fnError.message
      if (fnError instanceof FunctionsHttpError) {
        try {
          const responseBody = await fnError.context.json()
          if (responseBody?.error) message = responseBody.error
        } catch {
          // 回應不是 JSON，維持預設訊息
        }
      }
      error.value = message
      return
    }
    if (data?.error) {
      error.value = data.error
      return
    }
    title.value = data.title
    body.value = data.body
  }

  function reset() {
    title.value = ''
    body.value = ''
    error.value = null
  }

  return { loading, error, title, body, generate, reset }
})
