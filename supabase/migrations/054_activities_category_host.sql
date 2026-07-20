-- ════════════════════════════════════════════
-- 054_activities_category_host.sql
-- 例會管理／社友活動合併成單一「活動」列表：activities 新增 category
-- 分類（例會/社內活動/友社活動/地區活動/其他）+ host_name（主辦單位
-- 顯示名稱覆寫）。例會衍生的活動一律 category='例會'，用 CHECK
-- constraint 綁死（meeting_id 有值 <=> category='例會'），不能從表單
-- 手動改成別的分類，也不能把一般活動偽裝成例會。
--
-- host_name：友社活動／地區活動的實際主辦單位常常不是本平台上有帳號
-- 的社（甚至不是 D3481 的社），organizing_club_id 仍綁定建立者所屬社
-- （沿用既有 RLS 判斷編輯權限），host_name 只是顯示用的覆寫文字，
-- 留空則沿用 organizing_club_id 對應的社名。
-- ════════════════════════════════════════════

ALTER TABLE activities ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '社內活動'
  CHECK (category IN ('例會', '社內活動', '友社活動', '地區活動', '其他'));
ALTER TABLE activities ADD COLUMN IF NOT EXISTS host_name text;

UPDATE activities SET category = '例會' WHERE meeting_id IS NOT NULL AND category != '例會';

ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_category_meeting_check;
ALTER TABLE activities ADD CONSTRAINT activities_category_meeting_check
  CHECK ((meeting_id IS NOT NULL) = (category = '例會'));

CREATE OR REPLACE FUNCTION sync_meeting_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activities (organizing_club_id, title, location, start_at, status, meeting_id, category, created_by)
    VALUES (
      NEW.club_id,
      COALESCE(NEW.title, '例會') || '（' || to_char(NEW.date, 'MM/DD') || '）',
      NEW.venue,
      (NEW.date::text || ' 12:00:00+08')::timestamptz,
      'open',
      NEW.id,
      '例會',
      auth.uid()
    );
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE activities SET
      title = COALESCE(NEW.title, '例會') || '（' || to_char(NEW.date, 'MM/DD') || '）',
      location = NEW.venue,
      start_at = (NEW.date::text || ' 12:00:00+08')::timestamptz
    WHERE meeting_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
