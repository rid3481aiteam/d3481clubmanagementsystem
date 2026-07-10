-- ════════════════════════════════════════════
-- 040_club_monthly_membership_reports.sql
-- 各社每月社友增減月報（比照使用者提供的既有 Google 表單/Excel
-- 「YYYY-YY年度出席率.xlsx」欄位設計）：
--   - RI 半年報 男/女社友人數（基準值，比照原本 Excel 每個月分頁
--     各自獨立填寫，不做「年度共用一筆」的正規化）
--   - 當月月底 男/女社友人數
--   - 當月月底 40歲以下／41歲以上社友人數
--   - 淨成長、各項合計都是前端算，不存欄位
--
-- 「例會次數」「出席率」這兩欄不落在這張表——039 那輪已經有
-- club_monthly_attendance_rate view 從真實例會/出席紀錄即時算出，
-- 這裡直接讀那個 view 顯示（唯讀），避免社端要手動輸入、跟系統
-- 實際出席紀錄兜不起來。
-- ════════════════════════════════════════════

CREATE TABLE club_monthly_membership_reports (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id          uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  month            text NOT NULL,   -- 'YYYY-MM'，該月報告期間
  baseline_male    int,             -- 該年度 RI 半年報 男社友人數
  baseline_female  int,             -- 該年度 RI 半年報 女社友人數
  current_male     int,             -- 當月月底 男社友人數
  current_female   int,             -- 當月月底 女社友人數
  age_under_40     int,             -- 當月月底 40歲以下社友人數
  age_41_plus      int,             -- 當月月底 41歲以上社友人數
  note             text,
  created_by       uuid REFERENCES auth.users(id),
  updated_by       uuid REFERENCES auth.users(id),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE (club_id, month)
);

CREATE INDEX club_monthly_membership_reports_month_idx
  ON club_monthly_membership_reports (month);

ALTER TABLE club_monthly_membership_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "club_monthly_membership_reports_select" ON club_monthly_membership_reports
  FOR SELECT TO authenticated USING (
    club_id = current_club_id() OR is_district_viewer()
  );

CREATE POLICY "club_monthly_membership_reports_write" ON club_monthly_membership_reports
  FOR ALL TO authenticated USING (
    club_id = current_club_id() AND has_permission('membership_reports', 'edit')
  ) WITH CHECK (
    club_id = current_club_id() AND has_permission('membership_reports', 'edit')
  );

CREATE TRIGGER club_monthly_membership_reports_updated_at
  BEFORE UPDATE ON club_monthly_membership_reports
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── 權限矩陣種子資料：比照 roster/meetings，社端可編、地區唯讀 ──
INSERT INTO role_permissions (role, resource, action, allowed) VALUES
  ('district_admin', 'membership_reports', 'view', true),  ('district_admin', 'membership_reports', 'edit', false),
  ('club_secretary', 'membership_reports', 'view', true),  ('club_secretary', 'membership_reports', 'edit', true),
  ('club_admin',     'membership_reports', 'view', true),  ('club_admin',     'membership_reports', 'edit', true),
  ('club_member',    'membership_reports', 'view', true),  ('club_member',    'membership_reports', 'edit', false)
ON CONFLICT (role, resource, action) DO NOTHING;

-- ── 功能開關：B6_membership_report，預設全區開啟 ──
INSERT INTO feature_flags (club_id, feature_key, enabled) VALUES
  (NULL, 'B6_membership_report', true)
ON CONFLICT (club_id, feature_key) DO NOTHING;
