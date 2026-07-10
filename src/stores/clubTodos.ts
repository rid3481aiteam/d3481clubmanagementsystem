import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { ClubTodo, ClubTodoInsert, ClubTodoUpdate } from '@/types'

export const useClubTodosStore = defineStore('clubTodos', () => {
  const todos = ref<ClubTodo[]>([])
  const loading = ref(false)

  async function fetchAll(clubId: string | null) {
    if (!clubId) {
      todos.value = []
      return
    }
    loading.value = true
    const { data } = await supabase
      .from('club_todos')
      .select('*')
      .eq('club_id', clubId)
      .order('due_date', { ascending: true, nullsFirst: false })
    todos.value = data ?? []
    loading.value = false
  }

  async function insert(payload: ClubTodoInsert, userId: string | null) {
    const { error } = await supabase.from('club_todos').insert({ ...payload, created_by: userId })
    if (!error) await fetchAll(payload.club_id)
    return { error }
  }

  async function update(id: string, clubId: string, payload: ClubTodoUpdate) {
    const { error } = await supabase.from('club_todos').update(payload).eq('id', id)
    if (!error) await fetchAll(clubId)
    return { error }
  }

  async function remove(id: string, clubId: string) {
    const { error } = await supabase.from('club_todos').delete().eq('id', id)
    if (!error) await fetchAll(clubId)
    return { error }
  }

  return { todos, loading, fetchAll, insert, update, remove }
})
