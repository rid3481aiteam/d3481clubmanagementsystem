import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { KnowledgeArticle } from '@/types'

const BUCKET = 'knowledge-pdfs'

export const useKnowledgeBaseStore = defineStore('knowledgeBase', () => {
  const articles = ref<KnowledgeArticle[]>([])
  const loading = ref(false)

  async function fetchAll(query?: string) {
    loading.value = true
    let q = supabase.from('knowledge_articles').select('*').order('created_at', { ascending: false })
    const term = query?.trim().replace(/[,%]/g, ' ').trim()
    if (term) {
      const pattern = `%${term}%`
      q = q.or(`title.ilike.${pattern},description.ilike.${pattern},content_text.ilike.${pattern}`)
    }
    const { data } = await q
    articles.value = data ?? []
    loading.value = false
  }

  async function upload(
    file: File,
    meta: { title: string; category: string | null; tags: string[]; description: string | null; contentText: string },
    userId: string | null,
  ) {
    const path = `${crypto.randomUUID()}-${file.name}`
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: 'application/pdf' })
    if (uploadError) return { error: uploadError }

    const { error } = await supabase.from('knowledge_articles').insert({
      title: meta.title,
      category: meta.category,
      tags: meta.tags,
      description: meta.description,
      file_path: path,
      file_name: file.name,
      content_text: meta.contentText,
      created_by: userId,
    })
    if (error) {
      // 資料庫寫入失敗就把已經上傳的檔案清掉，避免留下孤兒檔案
      await supabase.storage.from(BUCKET).remove([path])
    }
    return { error }
  }

  async function remove(id: string, filePath: string) {
    const { error } = await supabase.from('knowledge_articles').delete().eq('id', id)
    if (!error) await supabase.storage.from(BUCKET).remove([filePath])
    return { error }
  }

  async function getSignedUrl(filePath: string) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 3600)
    return data?.signedUrl ?? null
  }

  return { articles, loading, fetchAll, upload, remove, getSignedUrl }
})
