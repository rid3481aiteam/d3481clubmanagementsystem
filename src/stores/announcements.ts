import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type {
  ClubAnnouncement,
  ClubAnnouncementInsert,
  ClubAnnouncementUpdate,
  DistrictAnnouncement,
  DistrictAnnouncementInsert,
  DistrictAnnouncementUpdate,
} from '@/types'

function nowIso() {
  return new Date().toISOString()
}

export const useAnnouncementsStore = defineStore('announcements', () => {
  const districtAnnouncements = ref<DistrictAnnouncement[]>([])
  const clubAnnouncements = ref<ClubAnnouncement[]>([])
  const adminDistrictAnnouncements = ref<DistrictAnnouncement[]>([])
  const adminClubAnnouncements = ref<ClubAnnouncement[]>([])
  const loading = ref(false)

  async function fetchDistrictForClub() {
    loading.value = true
    const now = nowIso()
    const { data, error } = await supabase
      .from('district_announcements')
      .select('*')
      .eq('is_published', true)
      .lte('published_at', now)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('published_at', { ascending: false })
      .limit(5)

    districtAnnouncements.value = error ? [] : data ?? []
    loading.value = false
    return { error }
  }

  async function fetchDistrictForAdmin() {
    loading.value = true
    const { data, error } = await supabase
      .from('district_announcements')
      .select('*')
      .order('published_at', { ascending: false })

    adminDistrictAnnouncements.value = error ? [] : data ?? []
    loading.value = false
    return { error }
  }

  async function fetchClubForDashboard(clubId: string) {
    loading.value = true
    const now = nowIso()
    const { data, error } = await supabase
      .from('club_announcements')
      .select('*')
      .eq('club_id', clubId)
      .eq('is_published', true)
      .lte('published_at', now)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('published_at', { ascending: false })
      .limit(5)

    clubAnnouncements.value = error ? [] : data ?? []
    loading.value = false
    return { error }
  }

  async function fetchClubForAdmin(clubId: string) {
    loading.value = true
    const { data, error } = await supabase
      .from('club_announcements')
      .select('*')
      .eq('club_id', clubId)
      .order('published_at', { ascending: false })

    adminClubAnnouncements.value = error ? [] : data ?? []
    loading.value = false
    return { error }
  }

  async function createDistrictAnnouncement(payload: DistrictAnnouncementInsert) {
    const { error } = await supabase.from('district_announcements').insert(payload)
    if (!error) await fetchDistrictForAdmin()
    return { error }
  }

  async function updateDistrictAnnouncement(id: string, payload: DistrictAnnouncementUpdate) {
    const { error } = await supabase.from('district_announcements').update(payload).eq('id', id)
    if (!error) await fetchDistrictForAdmin()
    return { error }
  }

  async function deleteDistrictAnnouncement(id: string) {
    const { error } = await supabase.from('district_announcements').delete().eq('id', id)
    if (!error) await fetchDistrictForAdmin()
    return { error }
  }

  async function createClubAnnouncement(payload: ClubAnnouncementInsert) {
    const { error } = await supabase.from('club_announcements').insert(payload)
    if (!error) await fetchClubForAdmin(payload.club_id)
    return { error }
  }

  async function updateClubAnnouncement(id: string, clubId: string, payload: ClubAnnouncementUpdate) {
    const { error } = await supabase.from('club_announcements').update(payload).eq('id', id)
    if (!error) await fetchClubForAdmin(clubId)
    return { error }
  }

  async function deleteClubAnnouncement(id: string, clubId: string) {
    const { error } = await supabase.from('club_announcements').delete().eq('id', id)
    if (!error) await fetchClubForAdmin(clubId)
    return { error }
  }

  return {
    districtAnnouncements,
    clubAnnouncements,
    adminDistrictAnnouncements,
    adminClubAnnouncements,
    loading,
    fetchDistrictForClub,
    fetchDistrictForAdmin,
    fetchClubForDashboard,
    fetchClubForAdmin,
    createDistrictAnnouncement,
    updateDistrictAnnouncement,
    deleteDistrictAnnouncement,
    createClubAnnouncement,
    updateClubAnnouncement,
    deleteClubAnnouncement,
  }
})
