-- 023_governor_award_applications.sql
-- 各社依總監獎項申請表填報，地區管理介面讀取全區彙整。

CREATE TABLE governor_award_applications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id      uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  year_term    text NOT NULL DEFAULT '2026-2027',
  group_type   text CHECK (group_type IN ('A', 'B')),
  member_count integer CHECK (member_count IS NULL OR member_count >= 0),
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  responses    jsonb NOT NULL DEFAULT '{}'::jsonb,
  other_text   text CHECK (other_text IS NULL OR char_length(other_text) <= 200),
  total_score  numeric(8,1) NOT NULL DEFAULT 0,
  submitted_at timestamptz,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, year_term)
);

CREATE INDEX governor_award_applications_year_status_idx
  ON governor_award_applications (year_term, status, total_score DESC);

CREATE INDEX governor_award_applications_club_year_idx
  ON governor_award_applications (club_id, year_term);

ALTER TABLE governor_award_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "governor_award_applications_select" ON governor_award_applications
  FOR SELECT TO authenticated USING (
    is_district_admin()
    OR club_id = current_club_id()
  );

CREATE POLICY "governor_award_applications_insert" ON governor_award_applications
  FOR INSERT TO authenticated
  WITH CHECK (club_id = current_club_id() AND is_club_tier());

CREATE POLICY "governor_award_applications_update" ON governor_award_applications
  FOR UPDATE TO authenticated
  USING (club_id = current_club_id() AND is_club_tier())
  WITH CHECK (club_id = current_club_id() AND is_club_tier());

CREATE TRIGGER governor_award_applications_updated_at
  BEFORE UPDATE ON governor_award_applications
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
