-- ════════════════════════════════════════════
-- 046_district_calendar.sql
-- 地區行事曆：由 sync-district-calendar Edge Function 每日自動從地區辦公室的
-- Google Drive Excel 檔案整批覆蓋寫入，前端一律唯讀，不開放使用者直接寫入
-- （只有 SELECT policy，寫入只能透過 Edge Function 的 service role key）。
-- ════════════════════════════════════════════

CREATE TABLE district_calendar_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date date NOT NULL,
  end_date   date NOT NULL,
  time_slot  text,
  title      text NOT NULL,
  location   text,
  sort_order int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX district_calendar_events_start_idx ON district_calendar_events (start_date);

ALTER TABLE district_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "district_calendar_events_select" ON district_calendar_events
  FOR SELECT TO authenticated USING (true);

-- 每次同步的執行紀錄（成功/失敗、來源檔名、版本時間、筆數），前端顯示同步狀態用。
CREATE TABLE district_calendar_sync_log (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  synced_at          timestamptz NOT NULL DEFAULT now(),
  status             text NOT NULL CHECK (status IN ('success', 'error')),
  source_file_name   text,
  source_modified_at timestamptz,
  event_count        int,
  error_message      text
);

ALTER TABLE district_calendar_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "district_calendar_sync_log_select" ON district_calendar_sync_log
  FOR SELECT TO authenticated USING (true);
