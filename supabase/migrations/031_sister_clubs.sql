-- 031_sister_clubs.sql
-- 友好社／姐妹社紀錄，由本社執秘/社長維護，只顯示在本社介面，
-- 讓社友能查到跟哪些社結盟、什麼時候結盟、當時的社長是誰、兩社情誼細節。
-- 完全比照 022_district_announcements.sql 的 club_announcements 那份 RLS 寫法。

CREATE TABLE sister_clubs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id            uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  partner_name       text NOT NULL,
  established_date   date NOT NULL,
  president_name     text,
  relationship_note  text,
  created_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sister_clubs_partner_name_present CHECK (length(trim(partner_name)) > 0)
);

CREATE INDEX sister_clubs_club_idx
  ON sister_clubs (club_id, established_date DESC);

ALTER TABLE sister_clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sister_clubs_select" ON sister_clubs
  FOR SELECT TO authenticated USING (club_id = current_club_id());

CREATE POLICY "sister_clubs_insert" ON sister_clubs
  FOR INSERT TO authenticated
  WITH CHECK (club_id = current_club_id() AND is_club_tier());

CREATE POLICY "sister_clubs_update" ON sister_clubs
  FOR UPDATE TO authenticated
  USING (club_id = current_club_id() AND is_club_tier())
  WITH CHECK (club_id = current_club_id() AND is_club_tier());

CREATE POLICY "sister_clubs_delete" ON sister_clubs
  FOR DELETE TO authenticated
  USING (club_id = current_club_id() AND is_club_tier());

CREATE TRIGGER sister_clubs_updated_at
  BEFORE UPDATE ON sister_clubs
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
