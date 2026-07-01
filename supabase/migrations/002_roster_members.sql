-- ════════════════════════════════════════════
-- 003_roster_members.sql
-- 社友名冊 + 潛在社友 + 社友關懷 + RLS
-- ════════════════════════════════════════════

-- 潛在社友狀態 enum
CREATE TYPE prospect_status AS ENUM (
  'not_invited',  -- 尚未邀請
  'invited',      -- 已邀請
  'joined',       -- 已入社
  'no_reply',     -- 未回覆
  'declined'      -- 婉拒
);

-- ── roster（社友名冊，對應 D1/D2）─────────────────────
CREATE TABLE roster (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name        text NOT NULL,
  nick_name   text,
  job_title   text,
  company     text,
  email       text,
  phone       text,
  join_date   date,
  is_active   boolean NOT NULL DEFAULT true,
  note        text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ── prospective_members（潛在社友，對應 D3）────────────
CREATE TABLE prospective_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name            text NOT NULL,
  job_title       text,
  company         text,
  ref_name        text,                             -- 推薦人姓名（自由輸入）
  ref_member_id   uuid REFERENCES roster(id),      -- 推薦人（若已在名冊中）
  invited_date    date,
  follow_up_date  date,
  status          prospect_status NOT NULL DEFAULT 'not_invited',
  owner_name      text,                             -- 負責追蹤人
  note            text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ── member_care（社友關懷，對應 D4）───────────────────
CREATE TABLE member_care (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES roster(id) ON DELETE CASCADE,
  care_type   text NOT NULL,   -- 生日/生病/喜事/喪事/其他
  care_date   date NOT NULL,
  note        text,
  created_at  timestamptz DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────
ALTER TABLE roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospective_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_care ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roster_select" ON roster FOR SELECT TO authenticated USING (
  club_id = current_club_id() OR is_district_admin()
);
CREATE POLICY "roster_write" ON roster FOR ALL TO authenticated USING (
  club_id = current_club_id()
  AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('club_admin','club_secretary')
);

CREATE POLICY "prospects_select" ON prospective_members FOR SELECT TO authenticated USING (
  club_id = current_club_id() OR is_district_admin()
);
CREATE POLICY "prospects_write" ON prospective_members FOR ALL TO authenticated USING (
  club_id = current_club_id()
  AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('club_admin','club_secretary','club_member')
);

CREATE POLICY "care_select" ON member_care FOR SELECT TO authenticated USING (
  club_id = current_club_id() OR is_district_admin()
);
CREATE POLICY "care_write" ON member_care FOR ALL TO authenticated USING (
  club_id = current_club_id()
  AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('club_admin','club_secretary')
);

-- triggers
CREATE TRIGGER roster_updated_at
  BEFORE UPDATE ON roster FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER prospects_updated_at
  BEFORE UPDATE ON prospective_members FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
