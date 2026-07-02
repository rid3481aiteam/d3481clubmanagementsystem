-- ════════════════════════════════════════════
-- 018_club_officers.sql
-- 社的年度幹部名單（社長／社長當選人／副社長／秘書／委員會成員）
-- 依扶輪年度（year_term，格式 '2025-2026'）記錄，委員會成員可多筆
-- 由各社自行維護（比照 roster 的權限模式），地區管理員唯讀全區
-- 可重複執行：每個物件建立前都先檢查是否已存在
-- ════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'club_officer_role') THEN
    CREATE TYPE club_officer_role AS ENUM (
      'president',         -- 社長
      'president_elect',   -- 社長當選人
      'vice_president',    -- 副社長
      'secretary',         -- 秘書
      'committee_member'   -- 委員會成員
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS club_officers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  year_term       text NOT NULL,                 -- e.g. '2025-2026'
  role            club_officer_role NOT NULL,
  name            text NOT NULL,
  committee_name  text,                           -- 僅 committee_member 使用，例如「會員發展委員會」
  note            text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS club_officers_club_year_idx ON club_officers (club_id, year_term);

ALTER TABLE club_officers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_officers_select" ON club_officers;
CREATE POLICY "club_officers_select" ON club_officers FOR SELECT TO authenticated USING (
  club_id = current_club_id() OR is_district_admin()
);

DROP POLICY IF EXISTS "club_officers_write" ON club_officers;
CREATE POLICY "club_officers_write" ON club_officers FOR ALL TO authenticated USING (
  club_id = current_club_id()
  AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('club_admin','club_secretary')
);

DROP TRIGGER IF EXISTS club_officers_updated_at ON club_officers;
CREATE TRIGGER club_officers_updated_at
  BEFORE UPDATE ON club_officers FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
