-- ════════════════════════════════════════════
-- 075_activities_district_admin_club_only_fix.sql
-- 修正資安漏洞（延續 074）：074 修好了一般社友的社內活動外洩，但同時
-- 具備地區管理員身分的帳號（district_role='admin' 或 role='district_admin'）
-- 不受影響——activities_select／activity_registrations_select 這兩條 RLS
-- 從 035/067 建立以來就有 `OR is_district_admin()` 這條無條件旁通，不管
-- 目前檢視畫面切到哪個社，只要帳號底層有地區管理員權限，一律看得到全地區
-- 所有活動（含其他社的社內活動）跟報名名單。
--
-- 使用者確認：地區管理員即使切到「地區介面」檢視，也不該看到任何社的
-- 「社內活動」內容與報名名單——「社內活動」的定義就是限定本社，不因為
-- 帳號多了地區管理員權限就破例，跟 073_roster_district_isolation.sql
-- 對社友名冊的隱私收緊原則一致。地區管理員切到「地區介面」時，仍然可以
-- 看到全地區的「例會／友社活動／地區活動／其他」（非社內活動）活動，
-- 供跨社協調/總覽使用；切到某個社的檢視畫面時，行為則完全比照該社一般
-- 管理員（只看得到自己社的社內活動＋全地區公開的非社內活動）。
--
-- 修法：把兩條政策的 `is_district_admin()` 旁通都加上 `AND NOT club_only`
-- （activity_registrations_select 額外透過 activities 表 join 判斷對應
-- 活動是否為 club_only），地區管理員的旁通權限只對「非社內活動」生效。
-- ════════════════════════════════════════════

DROP POLICY IF EXISTS "activities_select" ON activities;
CREATE POLICY "activities_select" ON activities FOR SELECT TO authenticated USING (
  (
    meeting_id IS NULL AND NOT club_only
    AND (status != 'draft' OR (organizing_club_id = current_club_id() AND is_club_tier()))
  )
  OR (
    (meeting_id IS NOT NULL OR club_only) AND organizing_club_id = current_club_id()
  )
  OR (is_district_admin() AND NOT club_only)
);

DROP POLICY IF EXISTS "activity_registrations_select" ON activity_registrations;
CREATE POLICY "activity_registrations_select" ON activity_registrations FOR SELECT TO authenticated USING (
  registrant_id = auth.uid()
  OR club_id = current_club_id()
  OR EXISTS (
    SELECT 1 FROM activities a
    WHERE a.id = activity_registrations.activity_id AND a.organizing_club_id = current_club_id()
  )
  OR (
    is_district_admin()
    AND EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_registrations.activity_id AND NOT a.club_only
    )
  )
);
