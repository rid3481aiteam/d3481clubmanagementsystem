-- ════════════════════════════════════════════
-- 037_activity_visibility_address_backfill.sql
-- 使用者這輪回報三項需求：
-- 1. 035/036 上線前就已存在、尚未到期的例會，沒有補建對應的活動報名紀錄
--    （036 的 trigger 只處理「migration 之後新增」的例會）
-- 2. 手動新增活動時要能選擇「僅本社社友」還是「全地區都可報名」
-- 3. 活動要能填寫詳細地址（跟原本的「地點」場地名稱分開，方便社友導航）
-- ════════════════════════════════════════════

-- ── 需求 2/3：新欄位 ──────────────────────────────────
-- club_only：手動活動的招募範圍開關。例會衍生的活動（meeting_id 不為 null）
-- 不受這個欄位影響，一律限本社，見下面 RLS。
ALTER TABLE activities ADD COLUMN club_only boolean NOT NULL DEFAULT false;
ALTER TABLE activities ADD COLUMN address text;

-- ── 瀏覽權限重寫：手動活動多一種「僅本社」狀態，例會衍生的活動邏輯不變 ──
DROP POLICY IF EXISTS "activities_select" ON activities;
CREATE POLICY "activities_select" ON activities FOR SELECT TO authenticated USING (
  (
    meeting_id IS NULL AND NOT club_only
    AND (status != 'draft' OR (organizing_club_id = current_club_id() AND is_club_tier()))
  )
  OR (
    (meeting_id IS NOT NULL OR club_only) AND organizing_club_id = current_club_id()
  )
  OR is_district_admin()
);

-- ── 報名保護：僅本社的手動活動比照例會衍生活動，只有主辦社成員能報名 ──
DROP POLICY IF EXISTS "activity_registrations_insert" ON activity_registrations;
CREATE POLICY "activity_registrations_insert" ON activity_registrations FOR INSERT TO authenticated WITH CHECK (
  registrant_id = auth.uid()
  AND club_id = current_club_id()
  AND EXISTS (
    SELECT 1 FROM activities a
    WHERE a.id = activity_registrations.activity_id
      AND (
        (a.meeting_id IS NULL AND NOT a.club_only)
        OR a.organizing_club_id = current_club_id()
      )
  )
);

-- ── 需求 1：補建尚未到期、但還沒有對應活動的例會（一次性，只跑一次） ──
INSERT INTO activities (organizing_club_id, title, location, start_at, status, meeting_id, created_by)
SELECT
  m.club_id,
  COALESCE(m.title, '例會') || '（' || to_char(m.date, 'MM/DD') || '）',
  m.venue,
  (m.date::text || ' 12:00:00+08')::timestamptz,
  'open',
  m.id,
  NULL
FROM meetings m
WHERE m.date >= CURRENT_DATE
  AND NOT EXISTS (SELECT 1 FROM activities a WHERE a.meeting_id = m.id);
