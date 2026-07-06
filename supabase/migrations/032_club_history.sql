-- 032_club_history.sql
-- 歷屆社長／服務計劃紀錄，由本社執秘/社長維護，只顯示在本社介面。
-- 「歷屆社長」跟「服務計劃總覽」共用同一張表：前者顯示完整紀錄（年份/社長/秘書/服務計劃），
-- 後者只挑年份+服務計劃整理成總覽，兩頁資料同步，不用另外維護。
-- RLS 比照 031_sister_clubs.sql，不開放地區視角查詢（各社文化資料，地區不管）。

CREATE TABLE club_history (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id        uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  year_term      text NOT NULL,          -- 例如 '2025-2026'
  president_name text,
  secretary_name text,
  service_plan   text,
  created_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT club_history_year_term_present CHECK (length(trim(year_term)) > 0),
  UNIQUE (club_id, year_term)
);

CREATE INDEX club_history_club_idx
  ON club_history (club_id, year_term DESC);

ALTER TABLE club_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "club_history_select" ON club_history
  FOR SELECT TO authenticated USING (club_id = current_club_id());

CREATE POLICY "club_history_insert" ON club_history
  FOR INSERT TO authenticated
  WITH CHECK (club_id = current_club_id() AND is_club_tier());

CREATE POLICY "club_history_update" ON club_history
  FOR UPDATE TO authenticated
  USING (club_id = current_club_id() AND is_club_tier())
  WITH CHECK (club_id = current_club_id() AND is_club_tier());

CREATE POLICY "club_history_delete" ON club_history
  FOR DELETE TO authenticated
  USING (club_id = current_club_id() AND is_club_tier());

CREATE TRIGGER club_history_updated_at
  BEFORE UPDATE ON club_history
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
