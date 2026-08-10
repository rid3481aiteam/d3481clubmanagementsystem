-- ════════════════════════════════════════════
-- 076_prospective_care_district_isolation.sql
-- 比照上一輪（075_activities_district_admin_club_only_fix.sql）跟更早的
-- 073_roster_district_isolation.sql，堵住地區管理員雙重身分帳號的旁通漏洞。
--
-- prospects_select／care_select 這兩條 RLS 政策（002_roster_members.sql）
-- 從一開始就有 `OR is_district_admin()` 無條件旁通，任何同時具備地區管理員
-- 權限的帳號，不管畫面上切到哪個社檢視，都能看到全地區所有社的潛在社友
-- 追蹤資料（含推薦人、備註等招募細節）跟社友關懷紀錄（含生病/喪事等高度
-- 敏感個資）。
--
-- 跟活動不同的是，潛在社友追蹤／社友關懷這兩張表完全沒有「非社內、可公開
-- 跨社瀏覽」的資料類別（不像活動還有友社/地區活動需要保留地區管理員總覽），
-- 每一筆都是單一社的招募/關懷內部資料，沒有任何合理的跨社可見理由。因此
-- 這裡採用跟 roster（社友名冊）完全一樣的作法——直接拿掉 is_district_admin()
-- 旁通，不像活動那樣做 `AND NOT club_only` 的部分保留。
-- ════════════════════════════════════════════

DROP POLICY IF EXISTS "prospects_select" ON prospective_members;
CREATE POLICY "prospects_select" ON prospective_members FOR SELECT TO authenticated USING (
  club_id = current_club_id()
);

DROP POLICY IF EXISTS "care_select" ON member_care;
CREATE POLICY "care_select" ON member_care FOR SELECT TO authenticated USING (
  club_id = current_club_id()
);
