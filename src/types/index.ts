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
  active_club_id: string | null
  name: string
  role: UserRole
  requested_role: UserRole | null
  requested_title: string | null
  district_role: 'view' | 'admin' | null
  is_active: boolean
  phone: string | null
  sso_sub: string | null
  sso_account_type: string | null
  sso_rotary_club: string | null
  sso_rotary_district: string | null
  onboarding_completed_at: string | null
  created_at: string
  updated_at: string
}

// 跨社協作授權：某人 home club 之外，被額外授權管理的社
export interface UserClubRole {
  user_id: string
  club_id: string
  role: UserRole
  is_active: boolean
  granted_by: string | null
  created_at: string
  updated_at: string
  user_profiles?: { name: string; is_active: boolean } | null
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

// ── 友好社 ───────────────────────────────────────────
export interface SisterClub {
  id: string
  club_id: string
  partner_name: string
  established_date: string
  president_name: string | null
  relationship_note: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type SisterClubInsert = Omit<SisterClub, 'id' | 'created_at' | 'updated_at'>

export type SisterClubUpdate = Partial<
  Omit<SisterClub, 'id' | 'club_id' | 'created_at' | 'updated_at' | 'created_by'>
>

// ── 社的歷程（歷屆社長／重要記事） ───────────────────────
export interface ClubHistoryRecord {
  id: string
  club_id: string
  year_term: string
  president_name: string | null
  secretary_name: string | null
  notable_events: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ClubHistoryInsert = Omit<ClubHistoryRecord, 'id' | 'created_at' | 'updated_at' | 'secretary_name'> & {
  secretary_name?: string | null
}

export type ClubHistoryUpdate = Partial<
  Omit<ClubHistoryRecord, 'id' | 'club_id' | 'created_at' | 'updated_at' | 'created_by'>
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
  | 'president' | 'president_elect' | 'vice_president' | 'secretary' | 'committee_member' | 'primary_officer'

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
  | 'B6_membership_report'
  | 'D1_roster' | 'D2_roster_excel' | 'D3_prospective' | 'D4_care'
  | 'H1_directory' | 'H2_directory_search' | 'H3_directory_admin'
  | 'E1_activities'
  | 'F1_district_calendar'
  | 'G1_iou'
  | 'I1_gg'
  | 'J1_line_notify'
  | 'K1_meeting_email_notify'
  | 'L1_knowledge_base'
  | 'M1_pending_account_notify'

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

// ── 地區行事曆 ───────────────────────────────────────
// 由 sync-district-calendar Edge Function 每日從地區辦公室的 Google Drive Excel 整批覆蓋寫入，
// 前端一律唯讀，不開放使用者直接新增/編輯/刪除。
export interface DistrictCalendarEvent {
  id: string
  start_date: string
  end_date: string
  time_slot: string | null
  title: string
  location: string | null
  sort_order: number
  created_at: string
}

export interface DistrictCalendarSyncLog {
  id: string
  synced_at: string
  status: 'success' | 'error'
  source_file_name: string | null
  source_modified_at: string | null
  event_count: number | null
  error_message: string | null
}

// ── 儀表板待辦提醒 ───────────────────────────────────
export type TodoLevel = 'navy' | 'gold' | 'red'

export interface ClubTodo {
  id: string
  club_id: string
  title: string
  sub: string | null
  due_date: string | null
  level: TodoLevel
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ClubTodoInsert = Omit<ClubTodo, 'id' | 'created_by' | 'created_at' | 'updated_at'>
export type ClubTodoUpdate = Partial<Pick<ClubTodo, 'title' | 'sub' | 'due_date' | 'level'>>

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
  member_nick_name: string | null
  counted: number
  present: number
  absent: number
  leave: number
  rate: number | null
}

// 各社每月出席率（來自 club_monthly_attendance_rate view）
export interface ClubMonthlyAttendanceRate {
  club_id: string
  month: string          // 'YYYY-MM'
  meeting_count: number
  expected: number       // 應出席人次加總（每次例會 total 加總）
  actual: number         // 實際出席人次加總（每次例會 present 加總）
  rate: number | null
}

// 「出席月報」單場例會出席摘要（本月例會清單用，含快速新增/補登的例會）
export interface MeetingAttendanceSummary {
  id: string
  date: string
  title: string | null
  speaker_name: string | null
  expected: number | null
  actual: number | null
  rate: number | null
  hasDetail: boolean      // 是否有逐人出席明細（true = 透過「例會管理」逐人登記，false = 月報快速新增/補登）
}

// 各社每月社友增減月報（比照 RI 半年報 Excel 表頭設計）
export interface ClubMonthlyMembershipReport {
  id: string
  club_id: string
  month: string             // 'YYYY-MM'
  baseline_male: number | null
  baseline_female: number | null
  current_male: number | null
  current_female: number | null
  age_under_40: number | null
  age_41_plus: number | null
  note: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type ClubMonthlyMembershipReportInsert = Omit<
  ClubMonthlyMembershipReport,
  'id' | 'created_by' | 'updated_by' | 'created_at' | 'updated_at'
>

export type ClubMonthlyMembershipReportUpdate = Partial<
  Omit<ClubMonthlyMembershipReport, 'id' | 'club_id' | 'month' | 'created_by' | 'created_at' | 'updated_at'>
>

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
export type MemberCareUpdate = Partial<Pick<MemberCare, 'member_id' | 'care_type' | 'care_date' | 'note'>>

// ── IOU（捐獻收據追蹤）───────────────────────────────
export type IouItem = '社務捐獻' | '活動贊助' | '服務計畫捐獻' | '慈善捐款' | '獎助學金' | '設備物資' | '其他'
export type IouStatus = '待開立' | '已開立'

export interface IouReceipt {
  id: string
  club_id: string
  donor_name: string
  item: IouItem
  amount: number
  donation_date: string
  receipt_payee: string | null
  status: IouStatus
  note: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type IouReceiptInsert = Omit<IouReceipt, 'id' | 'created_by' | 'created_at' | 'updated_at'>
export type IouReceiptUpdate = Partial<
  Pick<IouReceipt, 'donor_name' | 'item' | 'amount' | 'donation_date' | 'receipt_payee' | 'status' | 'note'>
>

// ── GG案（全球獎助金盤點）───────────────────────────
export type GgStatus = '規劃中' | '申請中' | '進行中' | '已完成' | '取消'

export interface GgCase {
  id: string
  club_id: string
  name: string
  partner: string | null
  amount: string | null
  start_date: string | null
  end_date: string | null
  status: GgStatus
  description: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type GgCaseInsert = Omit<GgCase, 'id' | 'created_by' | 'created_at' | 'updated_at'>
export type GgCaseUpdate = Partial<
  Pick<GgCase, 'name' | 'partner' | 'amount' | 'start_date' | 'end_date' | 'status' | 'description'>
>

// ── 例會與社友活動（合併成單一「活動」列表）─────────────
export type ActivityStatus = 'draft' | 'open' | 'closed' | 'cancelled'
export type ActivityCategory = '例會' | '社內活動' | '友社活動' | '地區活動' | '其他'

export interface Activity {
  id: string
  organizing_club_id: string
  title: string
  description: string | null
  location: string | null
  address: string | null
  start_at: string
  registration_deadline: string | null
  capacity: number | null
  status: ActivityStatus
  // 手動活動的招募範圍：true = 僅本社社友能看到/報名，false = 全地區公開可跨社報名。
  // 例會衍生的活動（meeting_id 不為 null）不受這個欄位影響，一律限本社。
  club_only: boolean
  // 例會衍生的活動 category 固定是「例會」（DB CHECK constraint 綁死跟 meeting_id
  // 是否有值一致），不可從表單手動改；其餘四類給手動新增的活動選
  category: ActivityCategory
  // 顯示用的主辦單位覆寫文字，留空則顯示 organizing_club_id 對應的社名。
  // 用於友社活動／地區活動這類實際主辦單位不是 organizing_club_id 本身的情境
  host_name: string | null
  // 非 null = 由例會自動同步產生（見 036_meeting_activity_sync.sql 的 trigger），
  // 只有主辦社看得到，標題/地點/時間由例會端同步、這裡不可手動改
  meeting_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// meeting_id 由 DB trigger 管理，手動新增活動不需要（也不應該）自己傳
export type ActivityInsert = Omit<Activity, 'id' | 'meeting_id' | 'created_by' | 'created_at' | 'updated_at'>
export type ActivityUpdate = Partial<ActivityInsert>

// 主辦社名稱（fetchAll 用 clubs(name) embed 帶出）
export interface ActivityWithClub extends Activity {
  clubs: { name: string } | null
}

export type RegistrationStatus = 'registered' | 'cancelled' | 'declined'

export interface ActivityGuest {
  name: string
  company: string
}

export interface ActivityRegistrationFormData {
  name: string
  phone: string
  has_guest: boolean
  guests: ActivityGuest[]
  note: string
}

export interface ActivityRegistration {
  id: string
  activity_id: string
  club_id: string
  registrant_id: string
  form_data: ActivityRegistrationFormData
  status: RegistrationStatus
  created_at: string
  updated_at: string
}

// 主辦社查看報名清單用，帶出報名者所屬社名稱
export interface ActivityRegistrationWithClub extends ActivityRegistration {
  clubs: { name: string } | null
}

// ── 錯誤回報（見 055_bug_reports.sql）──────────────────
export type BugReportSource = 'user' | 'auto'
export type BugReportStatus = 'open' | 'resolved'

export interface BugReport {
  id: string
  reporter_id: string | null
  club_id: string | null
  source: BugReportSource
  description: string | null
  error_message: string | null
  error_stack: string | null
  page_path: string
  user_agent: string | null
  status: BugReportStatus
  created_at: string
  resolved_at: string | null
}

export interface BugReportWithReporter extends BugReport {
  reporter: { name: string } | null
  clubs: { name: string } | null
}

// ── LINE 通知（Demo，見 038_line_notifications.sql）─────
export type NotificationChannelStatus = 'connected' | 'pending_manual_setup'

export interface ClubNotificationChannel {
  club_id: string
  line_channel_secret: string | null
  line_channel_access_token: string | null
  status: NotificationChannelStatus
  email_from: string | null
  email_app_password: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface LineBinding {
  id: string
  club_id: string
  roster_id: string | null
  member_name: string
  phone: string
  line_user_id: string
  bound_at: string
}

// ── 地區帳號審核 Email 通知（見 062_district_pending_account_notify.sql）
// 單列表，不像 ClubNotificationChannel 有 club_id：這是地區共用一組
// Gmail，不分社。
export interface DistrictNotificationChannel {
  id: 'default'
  email_from: string | null
  email_app_password: string | null
  notify_to: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

// ── 地區知識庫 ────────────────────────────────────────
export interface KnowledgeArticle {
  id: string
  title: string
  category: string | null
  tags: string[]
  description: string | null
  file_path: string
  file_name: string
  content_text: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type KnowledgeArticleInsert = Omit<KnowledgeArticle, 'id' | 'created_at' | 'updated_at'>

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
