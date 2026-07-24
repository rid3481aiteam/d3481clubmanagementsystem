import { defineStore } from 'pinia'
import { ref } from 'vue'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { DistrictNotificationChannel } from '@/types'

export const useDistrictNotifyStore = defineStore('districtNotify', () => {
  const channel = ref<DistrictNotificationChannel | null>(null)
  const loading = ref(false)
  const sending = ref(false)
  const sendError = ref<string | null>(null)
  const sendResult = ref<string | null>(null)

  async function fetchChannel() {
    loading.value = true
    const { data } = await supabase
      .from('district_notification_channel')
      .select('*')
      .eq('id', 'default')
      .maybeSingle()
    channel.value = data
    loading.value = false
  }

  async function saveChannel(emailFrom: string, appPassword: string, userId: string | null) {
    const { error } = await supabase
      .from('district_notification_channel')
      .update({
        email_from: emailFrom.trim(),
        email_app_password: appPassword.trim(),
        updated_by: userId,
      })
      .eq('id', 'default')
    if (!error) await fetchChannel()
    return { error }
  }

  async function sendTestEmail(toEmail: string) {
    sending.value = true
    sendError.value = null
    sendResult.value = null
    const { error } = await supabase.functions.invoke('send-district-test-email', {
      body: { to_email: toEmail },
    })
    sending.value = false

    if (error) {
      let msg = error.message
      if (error instanceof FunctionsHttpError) {
        try {
          const body = await error.context.json()
          if (body?.error) msg = body.error
        } catch {
          // 回應不是 JSON，維持預設訊息
        }
      }
      sendError.value = msg
      return { error: msg }
    }
    sendResult.value = `測試信已送出，請到 ${toEmail} 收信確認`
    return { error: null }
  }

  return {
    channel,
    loading,
    sending,
    sendError,
    sendResult,
    fetchChannel,
    saveChannel,
    sendTestEmail,
  }
})
