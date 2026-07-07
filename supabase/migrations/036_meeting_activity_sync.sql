-- ════════════════════════════════════════════
-- 036_meeting_activity_sync.sql
-- 例會「預計出席人數」報名統計：新增例會時自動在 activities 建立一筆
-- 對應紀錄（meeting_id 關聯回 meetings），本社社友可以像報名活動一樣
-- 回報是否出席，社長/執秘能即時看到預計人數，跟例會後才登記的「實際
-- 出席」（attendance_details）是兩件事、互不影響。
--
-- 跟一般活動不同：例會衍生的這筆只有主辦社（本社，任何角色）+
-- 地區管理員看得到，不比照活動全地區公開、不開放跨社報名。
-- ════════════════════════════════════════════

ALTER TABLE activities ADD COLUMN meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX activities_meeting_id_key ON activities (meeting_id) WHERE meeting_id IS NOT NULL;

-- ── 瀏覽權限重寫：例會衍生的活動只有主辦社（任何角色）+ 地區管理員看得到；
-- 一般活動（meeting_id IS NULL）維持原本「非草稿全地區可見」規則不變 ──
DROP POLICY IF EXISTS "activities_select" ON activities;
CREATE POLICY "activities_select" ON activities FOR SELECT TO authenticated USING (
  (meeting_id IS NULL AND (
    status != 'draft' OR (organizing_club_id = current_club_id() AND is_club_tier())
  ))
  OR (meeting_id IS NOT NULL AND organizing_club_id = current_club_id())
  OR is_district_admin()
);

-- ── 報名保護：例會衍生的活動只有主辦社（本社）成員能報名，
-- 一般活動維持原本可跨社報名不變 ──
DROP POLICY IF EXISTS "activity_registrations_insert" ON activity_registrations;
CREATE POLICY "activity_registrations_insert" ON activity_registrations FOR INSERT TO authenticated WITH CHECK (
  registrant_id = auth.uid()
  AND club_id = current_club_id()
  AND EXISTS (
    SELECT 1 FROM activities a
    WHERE a.id = activity_registrations.activity_id
      AND (a.meeting_id IS NULL OR a.organizing_club_id = current_club_id())
  )
);

-- ── 自動同步：新增例會時建立對應活動；編輯例會時同步標題/地點/時間到
-- 既有的對應活動（若存在）。meetings 沒有時刻欄位，用中午 12:00 佔位。
-- 只處理「這次 migration 之後新增」的例會，不回頭幫舊例會補建活動，
-- 避免大量已經開完的舊例會憑空冒出報名頁面。
CREATE OR REPLACE FUNCTION sync_meeting_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activities (organizing_club_id, title, location, start_at, status, meeting_id, created_by)
    VALUES (
      NEW.club_id,
      COALESCE(NEW.title, '例會') || '（' || to_char(NEW.date, 'MM/DD') || '）',
      NEW.venue,
      (NEW.date::text || ' 12:00:00+08')::timestamptz,
      'open',
      NEW.id,
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

CREATE TRIGGER meetings_sync_activity
  AFTER INSERT OR UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION sync_meeting_activity();
