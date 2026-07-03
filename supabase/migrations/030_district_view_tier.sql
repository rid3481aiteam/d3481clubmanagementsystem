-- ════════════════════════════════════════════
-- 030_district_view_tier.sql
-- 地區權限拆成兩級：
--   3. 地區（唯讀）：可進地區後台看彙總分析、社團總覽（含名冊/幹部）、
--      地區公告、總監獎彙總、EDM 產生器，但不能新增/編輯/刪除任何東西
--   4. 地區管理員：原本的地區權限，可編輯社團資料、開關功能、
--      發佈地區公告、管理帳號、調權限矩陣
--
-- 原本 district_access 只有 true/false 一種，一律等於現在的地區管理員。
-- 改成 district_role（'view' | 'admin' | NULL），既有 district_access=true
-- 的帳號一律轉成 'admin'（維持原本權限，不會有人突然被降級）。
-- ════════════════════════════════════════════

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS district_role text CHECK (district_role IN ('view', 'admin'));

UPDATE user_profiles SET district_role = 'admin' WHERE district_access = true;

-- is_district_admin()：地區管理員（第 4 級），原本吃 district_access，改吃 district_role='admin'
CREATE OR REPLACE FUNCTION is_district_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE id = auth.uid()
      AND (role = 'district_admin' OR district_role = 'admin')
  );
$$;

-- is_district_viewer()：地區唯讀（第 3 級）或地區管理員（第 4 級）都算
CREATE OR REPLACE FUNCTION is_district_viewer()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE id = auth.uid()
      AND (role = 'district_admin' OR district_role IN ('view', 'admin'))
  );
$$;

-- protect_user_profile_privileged_fields：district_access 改成 district_role
CREATE OR REPLACE FUNCTION protect_user_profile_privileged_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.club_id::text, '') <> COALESCE(OLD.club_id::text, '')
    OR NEW.district_role IS DISTINCT FROM OLD.district_role
  THEN
    IF NOT is_district_admin() THEN
      RAISE EXCEPTION '沒有權限變更帳號所屬社團或地區權限';
    END IF;
  END IF;

  IF COALESCE(NEW.role::text, '') <> COALESCE(OLD.role::text, '') THEN
    IF NOT (
      is_district_admin()
      OR (
        is_club_tier()
        AND OLD.club_id = current_club_id()
        AND OLD.role IN ('club_admin', 'club_secretary', 'club_member')
        AND NEW.role IN ('club_admin', 'club_secretary', 'club_member')
      )
    ) THEN
      RAISE EXCEPTION '沒有權限變更帳號角色';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

ALTER TABLE user_profiles DROP COLUMN district_access;

-- 開放地區唯讀角色讀取「社團總覽」相關資料（名冊、幹部、例會、出席彙總、潛在社友）
DROP POLICY IF EXISTS "roster_select" ON roster;
CREATE POLICY "roster_select" ON roster FOR SELECT TO authenticated USING (
  club_id = current_club_id() OR is_district_viewer()
);

DROP POLICY IF EXISTS "prospects_select" ON prospective_members;
CREATE POLICY "prospects_select" ON prospective_members FOR SELECT TO authenticated USING (
  club_id = current_club_id() OR is_district_viewer()
);

DROP POLICY IF EXISTS "meetings_select" ON meetings;
CREATE POLICY "meetings_select" ON meetings FOR SELECT TO authenticated USING (
  club_id = current_club_id() OR is_district_viewer()
);

DROP POLICY IF EXISTS "attendance_sessions_select" ON attendance_sessions;
CREATE POLICY "attendance_sessions_select" ON attendance_sessions FOR SELECT TO authenticated USING (
  club_id = current_club_id() OR is_district_viewer()
);

DROP POLICY IF EXISTS "club_officers_select" ON club_officers;
CREATE POLICY "club_officers_select" ON club_officers FOR SELECT TO authenticated USING (
  club_id = current_club_id() OR is_district_viewer()
);

DROP POLICY IF EXISTS "district_announcements_select" ON district_announcements;
CREATE POLICY "district_announcements_select" ON district_announcements
  FOR SELECT TO authenticated USING (
    is_district_viewer()
    OR (
      is_published
      AND published_at <= now()
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

DROP POLICY IF EXISTS "governor_award_applications_select" ON governor_award_applications;
CREATE POLICY "governor_award_applications_select" ON governor_award_applications
  FOR SELECT TO authenticated USING (
    is_district_viewer()
    OR club_id = current_club_id()
  );
