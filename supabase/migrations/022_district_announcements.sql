-- 022_district_announcements.sql
-- 地區公告由地區管理介面維護，發布後顯示在各社儀表板。

CREATE TABLE district_announcements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  body         text NOT NULL,
  is_published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT district_announcements_title_present CHECK (length(trim(title)) > 0),
  CONSTRAINT district_announcements_body_present CHECK (length(trim(body)) > 0),
  CONSTRAINT district_announcements_expires_after_publish CHECK (
    expires_at IS NULL OR expires_at > published_at
  )
);

CREATE INDEX district_announcements_visible_idx
  ON district_announcements (is_published, published_at DESC, expires_at);

ALTER TABLE district_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "district_announcements_select" ON district_announcements
  FOR SELECT TO authenticated USING (
    is_district_admin()
    OR (
      is_published
      AND published_at <= now()
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

CREATE POLICY "district_announcements_insert" ON district_announcements
  FOR INSERT TO authenticated
  WITH CHECK (is_district_admin());

CREATE POLICY "district_announcements_update" ON district_announcements
  FOR UPDATE TO authenticated
  USING (is_district_admin())
  WITH CHECK (is_district_admin());

CREATE POLICY "district_announcements_delete" ON district_announcements
  FOR DELETE TO authenticated
  USING (is_district_admin());

CREATE TRIGGER district_announcements_updated_at
  BEFORE UPDATE ON district_announcements
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- 社內公告由本社社長/執秘維護，只顯示在本社介面。
CREATE TABLE club_announcements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id      uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title        text NOT NULL,
  body         text NOT NULL,
  is_published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT club_announcements_title_present CHECK (length(trim(title)) > 0),
  CONSTRAINT club_announcements_body_present CHECK (length(trim(body)) > 0),
  CONSTRAINT club_announcements_expires_after_publish CHECK (
    expires_at IS NULL OR expires_at > published_at
  )
);

CREATE INDEX club_announcements_visible_idx
  ON club_announcements (club_id, is_published, published_at DESC, expires_at);

ALTER TABLE club_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "club_announcements_select" ON club_announcements
  FOR SELECT TO authenticated USING (
    club_id = current_club_id()
    AND (
      is_club_tier()
      OR (
        is_published
        AND published_at <= now()
        AND (expires_at IS NULL OR expires_at > now())
      )
    )
  );

CREATE POLICY "club_announcements_insert" ON club_announcements
  FOR INSERT TO authenticated
  WITH CHECK (club_id = current_club_id() AND is_club_tier());

CREATE POLICY "club_announcements_update" ON club_announcements
  FOR UPDATE TO authenticated
  USING (club_id = current_club_id() AND is_club_tier())
  WITH CHECK (club_id = current_club_id() AND is_club_tier());

CREATE POLICY "club_announcements_delete" ON club_announcements
  FOR DELETE TO authenticated
  USING (club_id = current_club_id() AND is_club_tier());

CREATE TRIGGER club_announcements_updated_at
  BEFORE UPDATE ON club_announcements
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
