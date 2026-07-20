-- ════════════════════════════════════════════
-- 055_bug_reports.sql
-- 錯誤回報機制（方案 A + B）：
-- A. 使用者主動回報——右上角「回報問題」按鈕填問題描述
-- B. 前端自動擷取——window.onerror / unhandledrejection 全域攔截，
--    未經使用者動作自動記一筆（source='auto'），只抓得到會拋出 JS
--    例外的錯誤（白畫面、API 失敗），抓不到「邏輯正確但結果錯」這種
--    沒有拋錯的 bug（例如過去的資料隔離漏洞），仍需搭配人工稽核。
--
-- 只有地區管理員看得到清單（含其他社使用者回報的內容），一般使用者
-- 只能新增／查詢自己回報過的紀錄，不開放修改和刪除（避免誤刪回報
-- 記錄，狀態只能由地區管理員標記已處理）。
-- ════════════════════════════════════════════

CREATE TABLE bug_reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  club_id       uuid REFERENCES clubs(id) ON DELETE SET NULL,
  source        text NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'auto')),
  description   text,
  error_message text,
  error_stack   text,
  page_path     text NOT NULL,
  user_agent    text,
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz
);

CREATE INDEX bug_reports_status_created_idx ON bug_reports (status, created_at DESC);

ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- 查詢：地區管理員看全部；一般使用者只看得到自己回報過的
CREATE POLICY "bug_reports_select" ON bug_reports FOR SELECT TO authenticated USING (
  is_district_admin() OR reporter_id = auth.uid()
);

-- 新增：只能用自己的帳號回報，不能冒充別人
CREATE POLICY "bug_reports_insert" ON bug_reports FOR INSERT TO authenticated WITH CHECK (
  reporter_id = auth.uid()
);

-- 修改：只有地區管理員能標記已處理
CREATE POLICY "bug_reports_update" ON bug_reports FOR UPDATE TO authenticated USING (
  is_district_admin()
) WITH CHECK (
  is_district_admin()
);
