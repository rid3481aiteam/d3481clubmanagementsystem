-- ════════════════════════════════════════════
-- 001_clubs_auth.sql
-- 社別資料 + 使用者 Profile + RLS
-- ════════════════════════════════════════════

-- 角色 enum
CREATE TYPE user_role AS ENUM (
  'district_admin',   -- 地區管理員，可讀全部社資料
  'club_admin',       -- 社長，可讀寫本社所有資料
  'club_secretary',   -- 執秘，可讀寫本社所有資料
  'club_member'       -- 一般社員，唯讀
);

-- ── clubs（各社基本資料 + 通訊錄來源）──────────────────
CREATE TABLE clubs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  zone         text NOT NULL,           -- 分區，e.g. 第一分區
  pres_name    text,
  sec_name     text,
  email        text,
  phone        text,
  addr         text,
  freq         text,                    -- 例會頻率，e.g. 每週三
  meeting_time text,                    -- e.g. 12:00
  venue        text,
  venue_tel    text,
  note         text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- ── user_profiles（擴充 auth.users）──────────────────
CREATE TABLE user_profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id    uuid REFERENCES clubs(id),
  name       text NOT NULL,
  role       user_role NOT NULL DEFAULT 'club_member',
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- clubs：所有登入者可讀（通訊錄需求）；只有 district_admin 可寫
CREATE POLICY "clubs_select" ON clubs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "clubs_write" ON clubs
  FOR ALL TO authenticated USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'district_admin'
  );

-- user_profiles：本人可讀寫自己；district_admin 可讀全部
CREATE POLICY "profiles_select_own" ON user_profiles
  FOR SELECT TO authenticated USING (
    id = auth.uid()
    OR (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'district_admin'
  );

CREATE POLICY "profiles_update_own" ON user_profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- ── helper function：取得目前 user 的 club_id ─────────
CREATE OR REPLACE FUNCTION current_club_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT club_id FROM user_profiles WHERE id = auth.uid();
$$;

-- ── helper function：判斷是否為地區管理員 ─────────────
CREATE OR REPLACE FUNCTION is_district_admin()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT role = 'district_admin' FROM user_profiles WHERE id = auth.uid();
$$;

-- ── 自動更新 updated_at ────────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER clubs_updated_at
  BEFORE UPDATE ON clubs
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
