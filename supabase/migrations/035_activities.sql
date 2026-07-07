-- ════════════════════════════════════════════
-- 035_activities.sql
-- 社友活動報名 + 查詢（Phase 1，見 HANDOFF 第三十九輪規劃）：
-- 活動由某社主辦（organizing_club_id），全地區社友都能瀏覽並自行報名，
-- 不受限於自己所屬社；主辦社能即時看到全部報名紀錄（含跨社報名者的表單內容）。
-- Email/LINE 到期通知留待 Phase 2/3。
-- ════════════════════════════════════════════

CREATE TABLE activities (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizing_club_id     uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title                  text NOT NULL,
  description            text,
  location               text,
  start_at               timestamptz NOT NULL,
  registration_deadline  timestamptz,
  capacity               int,
  status                 text NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'open', 'closed', 'cancelled')),
  created_by             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activities_title_present CHECK (length(trim(title)) > 0),
  CONSTRAINT activities_deadline_before_start CHECK (
    registration_deadline IS NULL OR registration_deadline <= start_at
  )
);

CREATE INDEX activities_start_at_idx ON activities (start_at DESC);
CREATE INDEX activities_organizing_club_idx ON activities (organizing_club_id);

-- ── activity_registrations（報名者所屬社不限主辦社，用 club_id 記錄報名當下所屬社）──
CREATE TABLE activity_registrations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id   uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  club_id       uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  registrant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_data     jsonb NOT NULL DEFAULT '{}'::jsonb,
  status        text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'cancelled')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (activity_id, registrant_id)
);

CREATE INDEX activity_registrations_activity_idx ON activity_registrations (activity_id);
CREATE INDEX activity_registrations_club_idx ON activity_registrations (club_id);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_registrations ENABLE ROW LEVEL SECURITY;

-- ── activities RLS ────────────────────────────────────
-- 瀏覽：非草稿的活動全地區登入者都能看到（跨社瀏覽/報名的前提）；
-- 草稿只有主辦社的社管理員／地區管理員看得到
CREATE POLICY "activities_select" ON activities FOR SELECT TO authenticated USING (
  status != 'draft'
  OR (organizing_club_id = current_club_id() AND is_club_tier())
  OR is_district_admin()
);

-- 新增/編輯/刪除：只有主辦社（目前檢視中的社）且有 activities 編輯權限的人
CREATE POLICY "activities_write" ON activities FOR ALL TO authenticated USING (
  organizing_club_id = current_club_id() AND has_permission('activities', 'edit')
) WITH CHECK (
  organizing_club_id = current_club_id() AND has_permission('activities', 'edit')
);

-- ── activity_registrations RLS ────────────────────────
-- 查詢：本人自己的報名紀錄／報名者所屬社的社管理員／該活動主辦社的社管理員（跨社可見表單內容）／地區管理員
CREATE POLICY "activity_registrations_select" ON activity_registrations FOR SELECT TO authenticated USING (
  registrant_id = auth.uid()
  OR (club_id = current_club_id() AND is_club_tier())
  OR (is_club_tier() AND EXISTS (
    SELECT 1 FROM activities a
    WHERE a.id = activity_registrations.activity_id AND a.organizing_club_id = current_club_id()
  ))
  OR is_district_admin()
);

-- 報名：只能用自己的帳號、自己目前所屬社報名，避免冒充別人或別社報名
CREATE POLICY "activity_registrations_insert" ON activity_registrations FOR INSERT TO authenticated WITH CHECK (
  registrant_id = auth.uid() AND club_id = current_club_id()
);

-- 修改（含取消報名／改報名內容）：只能改自己的報名紀錄；地區管理員可代管
CREATE POLICY "activity_registrations_update" ON activity_registrations FOR UPDATE TO authenticated USING (
  registrant_id = auth.uid() OR is_district_admin()
) WITH CHECK (
  registrant_id = auth.uid() OR is_district_admin()
);

CREATE TRIGGER activities_updated_at
  BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER activity_registrations_updated_at
  BEFORE UPDATE ON activity_registrations FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── role_permissions 種子資料（沿用既有 4 角色矩陣慣例）──
INSERT INTO role_permissions (role, resource, action, allowed) VALUES
  ('district_admin', 'activities', 'view', true),  ('district_admin', 'activities', 'edit', false),
  ('club_secretary', 'activities', 'view', true),  ('club_secretary', 'activities', 'edit', true),
  ('club_admin',     'activities', 'view', true),  ('club_admin',     'activities', 'edit', true),
  ('club_member',    'activities', 'view', true),  ('club_member',    'activities', 'edit', false);

-- ── feature flag（地區預設開啟）───────────────────────
INSERT INTO feature_flags (club_id, feature_key, enabled) VALUES
  (NULL, 'E1_activities', true);
