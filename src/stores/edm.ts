import { defineStore } from 'pinia'
import { ref } from 'vue'
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
      error.value = fnError.message
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
