-- ════════════════════════════════════════════
-- 010_role_permissions.sql
-- 細粒度權限矩陣：role_permissions 表 + has_permission()
-- 讓地區管理員可在前端調整各角色對各功能的檢視/編輯權限，
-- 並讓這個設定真正驅動 RLS（而非只是前端畫面隱藏）。
-- ════════════════════════════════════════════

CREATE TABLE role_permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role        user_role NOT NULL,
  resource    text NOT NULL,   -- 'roster' | 'prospective_members' | 'meetings' | 'attendance'
  action      text NOT NULL,   -- 'view' | 'edit'
  allowed     boolean NOT NULL DEFAULT false,
  updated_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (role, resource, action)
);

ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_action_check
  CHECK (action IN ('view', 'edit'));

-- ── RLS ──────────────────────────────────────────────
-- SELECT 對所有登入者開放（跟 feature_flags/clubs 一樣的模式），
-- 前端需要知道自己角色的權限；矩陣本身不是機密資料，只有「誰能改」才需要限制。
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions_select" ON role_permissions
  FOR SELECT TO authenticated USING (true);

-- 只有地區管理員可以修改權限矩陣。is_district_admin() 是 SECURITY DEFINER，
-- 用在「別的表」(role_permissions) 的 policy 裡，不是 009 修復的那種自我遞迴情境，安全。
CREATE POLICY "role_permissions_write" ON role_permissions
  FOR ALL TO authenticated USING (is_district_admin())
  WITH CHECK (is_district_admin());

CREATE TRIGGER role_permissions_updated_at
  BEFORE UPDATE ON role_permissions FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── has_permission() ─────────────────────────────────
-- 只讀 role_permissions（SELECT 已對所有人開放，這裡標 SECURITY DEFINER
-- 純粹是跟專案既有 helper function 慣例一致，未來就算 SELECT policy 收緊也不受影響）
CREATE OR REPLACE FUNCTION has_permission(
  p_role     user_role,
  p_resource text,
  p_action   text
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT allowed FROM role_permissions
     WHERE role = p_role AND resource = p_resource AND action = p_action),
    false   -- 查無資料 = 沒有權限（fail-closed）
  );
$$;

-- 給 RLS policy 用的便利版本，直接用目前登入者的角色
CREATE OR REPLACE FUNCTION has_permission(
  p_resource text,
  p_action   text
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT has_permission(current_user_role(), p_resource, p_action);
$$;

-- ── 種子資料：忠實反映目前 RLS 的實際行為 ─────────────
-- district_admin 對這 5 個資源目前都沒有 edit 權限（既有事實，不是新限制）
-- club_admin / club_secretary 皆可 view + edit
-- club_member：prospective_members 沿用既有可編輯權限；roster/meetings/attendance 新增 view-only
INSERT INTO role_permissions (role, resource, action, allowed) VALUES
  -- roster
  ('district_admin', 'roster', 'view', true),  ('district_admin', 'roster', 'edit', false),
  ('club_secretary', 'roster', 'view', true),  ('club_secretary', 'roster', 'edit', true),
  ('club_admin',     'roster', 'view', true),  ('club_admin',     'roster', 'edit', true),
  ('club_member',    'roster', 'view', true),  ('club_member',    'roster', 'edit', false),
  -- prospective_members
  ('district_admin', 'prospective_members', 'view', true),  ('district_admin', 'prospective_members', 'edit', false),
  ('club_secretary', 'prospective_members', 'view', true),  ('club_secretary', 'prospective_members', 'edit', true),
  ('club_admin',     'prospective_members', 'view', true),  ('club_admin',     'prospective_members', 'edit', true),
  ('club_member',    'prospective_members', 'view', true),  ('club_member',    'prospective_members', 'edit', true),
  -- meetings
  ('district_admin', 'meetings', 'view', true),  ('district_admin', 'meetings', 'edit', false),
  ('club_secretary', 'meetings', 'view', true),  ('club_secretary', 'meetings', 'edit', true),
  ('club_admin',     'meetings', 'view', true),  ('club_admin',     'meetings', 'edit', true),
  ('club_member',    'meetings', 'view', true),  ('club_member',    'meetings', 'edit', false),
  -- attendance（涵蓋 attendance_sessions + attendance_details）
  ('district_admin', 'attendance', 'view', true),  ('district_admin', 'attendance', 'edit', false),
  ('club_secretary', 'attendance', 'view', true),  ('club_secretary', 'attendance', 'edit', true),
  ('club_admin',     'attendance', 'view', true),  ('club_admin',     'attendance', 'edit', true),
  ('club_member',    'attendance', 'view', true),  ('club_member',    'attendance', 'edit', false);

-- ── 重寫 5 個表的 write policy，改用 has_permission() ──
DROP POLICY IF EXISTS "roster_write" ON roster;
CREATE POLICY "roster_write" ON roster FOR ALL TO authenticated USING (
  club_id = current_club_id() AND has_permission('roster', 'edit')
) WITH CHECK (
  club_id = current_club_id() AND has_permission('roster', 'edit')
);

DROP POLICY IF EXISTS "prospects_write" ON prospective_members;
CREATE POLICY "prospects_write" ON prospective_members FOR ALL TO authenticated USING (
  club_id = current_club_id() AND has_permission('prospective_members', 'edit')
) WITH CHECK (
  club_id = current_club_id() AND has_permission('prospective_members', 'edit')
);

DROP POLICY IF EXISTS "meetings_write" ON meetings;
CREATE POLICY "meetings_write" ON meetings FOR ALL TO authenticated USING (
  club_id = current_club_id() AND has_permission('meetings', 'edit')
) WITH CHECK (
  club_id = current_club_id() AND has_permission('meetings', 'edit')
);

DROP POLICY IF EXISTS "attendance_sessions_write" ON attendance_sessions;
CREATE POLICY "attendance_sessions_write" ON attendance_sessions FOR ALL TO authenticated USING (
  club_id = current_club_id() AND has_permission('attendance', 'edit')
) WITH CHECK (
  club_id = current_club_id() AND has_permission('attendance', 'edit')
);

DROP POLICY IF EXISTS "attendance_details_write" ON attendance_details;
CREATE POLICY "attendance_details_write" ON attendance_details FOR ALL TO authenticated USING (
  club_id = current_club_id() AND has_permission('attendance', 'edit')
) WITH CHECK (
  club_id = current_club_id() AND has_permission('attendance', 'edit')
);
