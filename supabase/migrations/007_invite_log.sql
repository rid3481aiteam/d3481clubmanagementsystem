-- ════════════════════════════════════════════
-- 007_invite_log.sql
-- 帳號邀請稽核記錄
-- ════════════════════════════════════════════

CREATE TABLE invite_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invited_by  uuid REFERENCES auth.users(id),
  invited_email text NOT NULL,
  club_id     uuid REFERENCES clubs(id),
  role        user_role NOT NULL,
  invited_at  timestamptz DEFAULT now(),
  accepted_at timestamptz  -- Auth webhook 回填
);

ALTER TABLE invite_log ENABLE ROW LEVEL SECURITY;

-- district_admin 可讀全部；執秘可讀本社紀錄
CREATE POLICY "invite_log_select" ON invite_log
  FOR SELECT TO authenticated USING (
    is_district_admin()
    OR (club_id = current_club_id() AND is_club_secretary())
  );

-- 寫入只透過 Edge Function（service_role），前端無法直接 insert
