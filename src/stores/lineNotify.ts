import { defineStore } from 'pinia'
import { ref } from 'vue'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { ClubNotificationChannel, LineBinding } from '@/types'

export const useLineNotifyStore = defineStore('lineNotify', () => {
  const channel = ref<ClubNotificationChannel | null>(null)
  const bindings = ref<LineBinding[]>([])
  const loading = ref(false)
  const sending = ref(false)
  const sendError = ref<string | null>(null)
  const sendResult = ref<string | null>(null)

  async function fetchChannel(clubId: string) {
    loading.value = true
    const { data } = await supabase
      .from('club_notification_channels')
      .select('*')
      .eq('club_id', clubId)
      .maybeSingle()
    channel.value = data
    loading.value = false
  }

  async function fetchBindings(clubId: string) {
    const { data } = await supabase
      .from('line_bindings')
      .select('*')
      .eq('club_id', clubId)
      .order('bound_at', { ascending: false })
    bindings.value = data ?? []
  }

  async function saveChannel(clubId: string, secret: string, accessToken: string, userId: string | null) {
    const { error } = await supabase.from('club_notification_channels').upsert({
      club_id: clubId,
      line_channel_secret: secret.trim(),
      line_channel_access_token: accessToken.trim(),
      status: 'connected',
      updated_by: userId,
    })
    if (!error) await fetchChannel(clubId)
    return { error }
  }

  async function sendTestMessage(message: string) {
    sending.value = true
    sendError.value = null
    sendResult.value = null
    const { data, error } = await supabase.functions.invoke<{ success: boolean; sent_to: number }>('line-push', {
      body: { message },
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
    sendResult.value = `已發送給 ${data?.sent_to ?? 0} 位已綁定社友`
    return { error: null }
  }

  return {
    channel,
    bindings,
    loading,
    sending,
    sendError,
    sendResult,
    fetchChannel,
    fetchBindings,
    saveChannel,
    sendTestMessage,
  }
})
