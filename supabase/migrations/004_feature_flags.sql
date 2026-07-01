-- ════════════════════════════════════════════
-- 004_feature_flags.sql
-- 功能開關（細項，對應 I4）
-- ════════════════════════════════════════════

-- ── feature_flags ─────────────────────────────────────
-- club_id = NULL  → 地區預設值（所有社的 fallback）
-- club_id = uuid  → 覆蓋特定社的設定
-- 查詢邏輯：先找社層覆蓋，若無則用地區預設
CREATE TABLE feature_flags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     uuid REFERENCES clubs(id) ON DELETE CASCADE,  -- NULL = 地區預設
  feature_key text NOT NULL,
  enabled     boolean NOT NULL DEFAULT true,
  updated_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (club_id, feature_key)
);

-- ── Phase 1 預設開關（地區層）────────────────────────
INSERT INTO feature_flags (club_id, feature_key, enabled) VALUES
  -- A 帳號（永遠開，不可關）
  (NULL, 'A1_login',              true),
  (NULL, 'A2_roles',              true),
  (NULL, 'A3_isolation',          true),
  -- B 例會
  (NULL, 'B1_meeting_info',       true),
  (NULL, 'B2_attendance_summary', true),
  (NULL, 'B3_attendance_personal',true),
  (NULL, 'B4_attendance_detail',  true),
  (NULL, 'B5_edm',                false),  -- 預設關，需 AI 整合
  -- D 名冊
  (NULL, 'D1_roster',             true),
  (NULL, 'D2_roster_excel',       true),
  (NULL, 'D3_prospective',        true),
  (NULL, 'D4_care',               false),  -- 預設關，選配
  -- H 通訊錄
  (NULL, 'H1_directory',          true),
  (NULL, 'H2_directory_search',   true),
  (NULL, 'H3_directory_admin',    true);

-- ── 查詢某社某功能是否啟用的 function ────────────────
CREATE OR REPLACE FUNCTION feature_enabled(
  p_club_id    uuid,
  p_feature_key text
) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    -- 社層覆蓋
    (SELECT enabled FROM feature_flags
     WHERE club_id = p_club_id AND feature_key = p_feature_key),
    -- 地區預設
    (SELECT enabled FROM feature_flags
     WHERE club_id IS NULL AND feature_key = p_feature_key),
    -- 都沒設定則預設開啟
    true
  );
$$;

-- ── RLS ──────────────────────────────────────────────
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- 所有登入者可讀（前端需要知道哪些功能開著）
CREATE POLICY "flags_select" ON feature_flags
  FOR SELECT TO authenticated USING (true);

-- 只有 district_admin 可以修改
CREATE POLICY "flags_write" ON feature_flags
  FOR ALL TO authenticated USING (is_district_admin());

-- trigger
CREATE TRIGGER flags_updated_at
  BEFORE UPDATE ON feature_flags FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
