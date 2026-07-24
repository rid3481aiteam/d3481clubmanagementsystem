import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { KnowledgeArticle } from '@/types'

const BUCKET = 'knowledge-pdfs'

export const useKnowledgeBaseStore = defineStore('knowledgeBase', () => {
  const articles = ref<KnowledgeArticle[]>([])
  const categories = ref<string[]>([])
  const loading = ref(false)

  async function fetchAll(query?: string, category?: string) {
    loading.value = true
    let q = supabase.from('knowledge_articles').select('*').order('created_at', { ascending: false })
    const term = query?.trim().replace(/[,%]/g, ' ').trim()
    if (term) {
      const pattern = `%${term}%`
      q = q.or(`title.ilike.${pattern},description.ilike.${pattern},content_text.ilike.${pattern}`)
    }
    if (category) q = q.eq('category', category)
    const { data } = await q
    articles.value = data ?? []
    loading.value = false
  }

  // 搜尋框上方的類別快選按鈕，內容從實際上傳過的文件動態算出來，不是寫死的清單
  async function fetchCategories() {
    const { data } = await supabase.from('knowledge_articles').select('category')
    const unique = new Set((data ?? []).map(r => r.category).filter((c): c is string => !!c && !!c.trim()))
    categories.value = [...unique].sort((a, b) => a.localeCompare(b, 'zh-Hant'))
  }

  async function upload(
    file: File,
    meta: { title: string; category: string | null; tags: string[]; description: string | null; contentText: string },
    userId: string | null,
  ) {
    // Storage 的物件 key 只接受 ASCII 安全字元（S3 相容限制），中文檔名放進去會被
    // Supabase 拒絕（Invalid key）。這裡 key 只用 UUID＋副檔名，原始檔名另外存在
    // file_name 欄位，下載/開啟時用 signed URL 的 download 選項帶回去，使用者看到
    // 的還是原本的中文檔名，只是後端實際存放的路徑跟檔名無關。
    const extMatch = file.name.match(/\.[a-zA-Z0-9]+$/)
    const ext = extMatch ? extMatch[0] : '.pdf'
    const path = `${crypto.randomUUID()}${ext}`
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

  async function getSignedUrl(filePath: string, downloadName?: string) {
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filePath, 3600, downloadName ? { download: downloadName } : undefined)
    return data?.signedUrl ?? null
  }

  return { articles, categories, loading, fetchAll, fetchCategories, upload, remove, getSignedUrl }
})
