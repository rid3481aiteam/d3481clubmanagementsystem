-- ════════════════════════════════════════════
-- 045_edm_generations.sql
-- EDM（Facebook 行銷文案）產生紀錄，只用來做「每社每日次數上限」計數，不做其他用途。
-- 由 generate-edm Edge Function 讀寫：呼叫前先查今天（台北時區）該社已成功產生幾次，
-- 達到上限就擋掉、不打 Anthropic API；每次成功產生後才寫入一筆紀錄。
-- 只限制 scope='club'（各社自己用）的用量，scope='district' 不受這個每日上限限制。
-- ════════════════════════════════════════════

CREATE TABLE edm_generations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id    uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  scope      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX edm_generations_club_created_idx
  ON edm_generations (club_id, created_at);

ALTER TABLE edm_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "edm_generations_select" ON edm_generations
  FOR SELECT TO authenticated USING (club_id = current_club_id());

CREATE POLICY "edm_generations_insert" ON edm_generations
  FOR INSERT TO authenticated
  WITH CHECK (club_id = current_club_id() AND is_club_tier());
