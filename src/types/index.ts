// ════════════════════════════════════════════
// types/index.ts — 所有 TypeScript 型別定義
// 對應 Supabase DB schema
// ════════════════════════════════════════════

// ── 帳號 / 認證 ─────────────────────────────────────
export type UserRole =
  | 'district_admin'
  | 'club_admin'
  | 'club_secretary'
  | 'club_member'

export interface UserProfile {
  id: string
  club_id: string | null
  name: string
  role: UserRole
  requested_role: UserRole | null
  requested_title: string | null
  district_role: 'view' | 'admin' | null
  is_active: boolean
  phone: string | null
  created_at: string
  updated_at: string
}

// ── 社別 / 通訊錄 ────────────────────────────────────
export interface Club {
  id: string
  name: string
  zone: string
  pres_name: string | null
  sec_name: string | null
  email: string | null
  phone: string | null
  addr: string | null
  freq: string | null
  meeting_time: string | null
  venue: string | null
  venue_tel: string | null
  note: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

// ── 公告 ─────────────────────────────────────────────
export interface DistrictAnnouncement {
  id: string
  title: string
  body: string
  is_published: boolean
  published_at: string
  expires_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type DistrictAnnouncementInsert = Omit<
  DistrictAnnouncement,
  'id' | 'created_at' | 'updated_at'
>

export type DistrictAnnouncementUpdate = Partial<
  Omit<DistrictAnnouncement, 'id' | 'created_at' | 'updated_at' | 'created_by'>
>

export interface ClubAnnouncement {
  id: string
  club_id: string
  title: string
  body: string
  is_published: boolean
  published_at: string
  expires_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ClubAnnouncementInsert = Omit<ClubAnnouncement, 'id' | 'created_at' | 'updated_at'>

export type ClubAnnouncementUpdate = Partial<
  Omit<ClubAnnouncement, 'id' | 'club_id' | 'created_at' | 'updated_at' | 'created_by'>
>

// ── 總監獎項申請 ─────────────────────────────────────
export type GovernorAwardStatus = 'draft' | 'submitted'
export type GovernorAwardGroup = 'A' | 'B'

export interface GovernorAwardCriterion {
  key: string
  itemNo: string
  category: string
  description: string
  referenceScore: number | null
}

export interface GovernorAwardSection {
  key: string
  title: string
  criteria: GovernorAwardCriterion[]
}

export interface GovernorAwardResponse {
  score: number | null
  note: string
}

export type GovernorAwardResponses = Record<string, GovernorAwardResponse>

export interface GovernorAwardApplication {
  id: string
  club_id: string
  year_term: string
  group_type: GovernorAwardGroup | null
  member_count: number | null
  status: GovernorAwardStatus
  responses: GovernorAwardResponses
  other_text: string | null
  total_score: number
  submitted_at: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

// ── 社的年度幹部 ──────────────────────────────────────
export type ClubOfficerRole =
  | 'president' | 'president_elect' | 'vice_president' | 'secretary' | 'committee_member'

export interface ClubOfficer {
  id: string
  club_id: string
  year_term: string
  role: ClubOfficerRole
  name: string
  committee_name: string | null
  note: string | null
  created_at: string
  updated_at: string
}

export type ClubOfficerInsert = Omit<ClubOfficer, 'id' | 'created_at' | 'updated_at'>
export type ClubOfficerUpdate = Partial<ClubOfficerInsert>

// ── 功能開關 ─────────────────────────────────────────
export type FeatureKey =
  | 'A1_login' | 'A2_roles' | 'A3_isolation'
  | 'B1_meeting_info' | 'B2_attendance_summary'
  | 'B3_attendance_personal' | 'B4_attendance_detail' | 'B5_edm'
  | 'D1_roster' | 'D2_roster_excel' | 'D3_prospective' | 'D4_care'
  | 'H1_directory' | 'H2_directory_search' | 'H3_directory_admin'

export interface FeatureFlag {
  id: string
  club_id: string | null
  feature_key: FeatureKey
  enabled: boolean
  updated_by: string | null
  created_at: string
  updated_at: string
}

// 前端使用的扁平 map：{ B1_meeting_info: true, B5_edm: false, ... }
export type FeatureMap = Record<FeatureKey, boolean>

// ── 例會 ─────────────────────────────────────────────
export interface Meeting {
  id: string
  club_id: string
  date: string          // ISO date string
  session_no: number | null
  title: string | null
  speaker_name: string | null
  speaker_title: string | null
  speaker_email: string | null
  speaker_phone: string | null
  venue: string | null
  note: string | null
  year_term: string     // GENERATED column，唯讀
  created_at: string
  updated_at: string
}

export type MeetingInsert = Omit<Meeting, 'id' | 'year_term' | 'created_at' | 'updated_at'>
export type MeetingUpdate = Partial<MeetingInsert>

// ── 出席 ─────────────────────────────────────────────
export type AttendanceStatus = 'present' | 'absent' | 'leave' | 'exempt'

export interface AttendanceSession {
  id: string
  meeting_id: string
  club_id: string
  total: number
  present: number
  absent: number
  leave: number
  exempt: number
  rate: number          // GENERATED column，唯讀
  note: string | null
  created_at: string
  updated_at: string
}

export type AttendanceSessionInsert = Omit<
  AttendanceSession,
  'id' | 'rate' | 'created_at' | 'updated_at'
>

export interface AttendanceDetail {
  id: string
  session_id: string
  club_id: string
  member_id: string
  status: AttendanceStatus
  created_at: string
}

// 個人出席率（來自 member_attendance_rate view）
export interface MemberAttendanceRate {
  club_id: string
  member_id: string
  member_name: string
  counted: number
  present: number
  absent: number
  leave: number
  rate: number | null
}

// ── 社友名冊 ─────────────────────────────────────────
export type RosterClubPosition = 'PP' | 'IPP' | 'P' | 'VP' | 'PE' | 'S' | '社友'
export type RosterMemberStatus = 'normal' | 'leave' | 'resigned'

export interface RosterMember {
  id: string
  club_id: string
  name: string
  nick_name: string | null
  club_position: RosterClubPosition
  member_status: RosterMemberStatus
  job_title: string | null
  company: string | null
  classification: string | null
  email: string | null
  phone: string | null
  personal_phone: string | null
  company_phone: string | null
  join_date: string | null
  is_active: boolean
  note: string | null
  created_at: string
  updated_at: string
}

export type RosterMemberInsert = Omit<RosterMember, 'id' | 'created_at' | 'updated_at'>
export type RosterMemberUpdate = Partial<RosterMemberInsert>

// Excel 匯入列格式（SheetJS 解析後）
export interface RosterExcelRow {
  姓名: string
  英文名?: string
  社內職稱?: RosterClubPosition
  狀態?: string
  職稱?: string
  職業分類?: string
  公司?: string
  Email?: string
  電話?: string
  個人電話?: string
  公司電話?: string
  入社日期?: string
}

// ── 潛在社友 ─────────────────────────────────────────
export type ProspectStatus =
  | 'not_invited' | 'invited' | 'joined' | 'no_reply' | 'declined'

export interface ProspectiveMember {
  id: string
  club_id: string
  name: string
  job_title: string | null
  company: string | null
  ref_name: string | null
  ref_member_id: string | null
  invited_date: string | null
  follow_up_date: string | null
  status: ProspectStatus
  owner_name: string | null
  note: string | null
  created_at: string
  updated_at: string
}

export type ProspectiveMemberInsert = Omit<ProspectiveMember, 'id' | 'created_at' | 'updated_at'>

// ── 社友關懷 ─────────────────────────────────────────
export type CareType = '生日' | '生病' | '喜事' | '喪事' | '其他'

export interface MemberCare {
  id: string
  club_id: string
  member_id: string
  care_type: CareType
  care_date: string
  note: string | null
  created_at: string
}

export type MemberCareInsert = Omit<MemberCare, 'id' | 'created_at'>

// ── Pinia Store 型別 ──────────────────────────────────
export interface AuthState {
  user: import('@supabase/supabase-js').User | null
  profile: UserProfile | null
  loading: boolean
}

export interface ClubState {
  current: Club | null
  loading: boolean
}

export interface FeaturesState {
  flags: FeatureMap
  loading: boolean
}

// ── API 回傳共用型別 ──────────────────────────────────
export interface PaginatedResult<T> {
  data: T[]
  count: number
}
