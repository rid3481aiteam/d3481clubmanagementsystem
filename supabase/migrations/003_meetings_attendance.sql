-- ════════════════════════════════════════════
-- 002_meetings_attendance.sql
-- 例會 + 出席統計 + 逐人明細 + RLS
-- ════════════════════════════════════════════

-- 出席狀態 enum
CREATE TYPE attendance_status AS ENUM (
  'present',  -- 出席
  'absent',   -- 缺席
  'leave',    -- 請假
  'exempt'    -- 免計
);

-- ── meetings（例會紀錄）────────────────────────────────
CREATE TABLE meetings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  date            date NOT NULL,
  session_no      int,                  -- 第幾次例會
  title           text,
  speaker_name    text,
  speaker_title   text,
  speaker_email   text,
  speaker_phone   text,
  venue           text,
  note            text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ── attendance_sessions（出席彙總，對應 B2）────────────
CREATE TABLE attendance_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  club_id     uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  total       int NOT NULL DEFAULT 0,
  present     int NOT NULL DEFAULT 0,
  absent      int NOT NULL DEFAULT 0,
  leave       int NOT NULL DEFAULT 0,
  exempt      int NOT NULL DEFAULT 0,
  rate        numeric(5,2) GENERATED ALWAYS AS (
    CASE WHEN (total - exempt) > 0
      THEN round(present::numeric / (total - exempt) * 100, 2)
      ELSE 0
    END
  ) STORED,
  note        text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ── attendance_details（逐人明細，對應 B3/B4）──────────
CREATE TABLE attendance_details (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  club_id     uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES roster(id) ON DELETE CASCADE,
  status      attendance_status NOT NULL DEFAULT 'present',
  created_at  timestamptz DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_details ENABLE ROW LEVEL SECURITY;

-- 共用 policy 工廠：只能看自己社的，district_admin 看全部
CREATE POLICY "meetings_select" ON meetings FOR SELECT TO authenticated USING (
  club_id = current_club_id() OR is_district_admin()
);
CREATE POLICY "meetings_write" ON meetings FOR ALL TO authenticated USING (
  club_id = current_club_id()
  AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('club_admin','club_secretary')
);

CREATE POLICY "attendance_sessions_select" ON attendance_sessions FOR SELECT TO authenticated USING (
  club_id = current_club_id() OR is_district_admin()
);
CREATE POLICY "attendance_sessions_write" ON attendance_sessions FOR ALL TO authenticated USING (
  club_id = current_club_id()
  AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('club_admin','club_secretary')
);

CREATE POLICY "attendance_details_select" ON attendance_details FOR SELECT TO authenticated USING (
  club_id = current_club_id() OR is_district_admin()
);
CREATE POLICY "attendance_details_write" ON attendance_details FOR ALL TO authenticated USING (
  club_id = current_club_id()
  AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('club_admin','club_secretary')
);

-- ── 個人出席率 view（對應 B3）─────────────────────────
CREATE VIEW member_attendance_rate
WITH (security_invoker = true)
AS
SELECT
  ad.club_id,
  ad.member_id,
  r.name AS member_name,
  COUNT(*) FILTER (WHERE ad.status != 'exempt') AS counted,
  COUNT(*) FILTER (WHERE ad.status = 'present') AS present,
  COUNT(*) FILTER (WHERE ad.status = 'absent') AS absent,
  COUNT(*) FILTER (WHERE ad.status = 'leave') AS leave,
  ROUND(
    COUNT(*) FILTER (WHERE ad.status = 'present')::numeric
    / NULLIF(COUNT(*) FILTER (WHERE ad.status != 'exempt'), 0) * 100,
    1
  ) AS rate
FROM attendance_details ad
JOIN roster r ON r.id = ad.member_id
GROUP BY ad.club_id, ad.member_id, r.name;

-- triggers
CREATE TRIGGER meetings_updated_at
  BEFORE UPDATE ON meetings FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER attendance_sessions_updated_at
  BEFORE UPDATE ON attendance_sessions FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
