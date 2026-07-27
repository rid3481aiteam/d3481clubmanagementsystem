-- ════════════════════════════════════════════
-- 067_activity_registrations_club_visibility.sql
-- 開放一般社友（非各社管理員）也能看到活動報名名單。
--
-- 根因：035_activities.sql 的 activity_registrations_select policy，
-- 「看得到同社報名紀錄」跟「主辦社看得到全部報名紀錄」這兩條都額外
-- 加了 is_club_tier() 限制（只有 club_admin/club_secretary），一般
-- club_member 只落到 registrant_id = auth.uid() 這條，只看得到自己
-- 的報名紀錄。但前端 ActivityDetailView.vue 從一開始的設計就是「報名
-- 狀況給所有登入社友看，不只主辦社」（見該檔案第 145/244 行註解），
-- 敏感欄位（電話／備註／報名時間／來賓姓名）本來就已經用 isOrganizer
-- （canManage 且是主辦社）在畫面上另外擋掉，RLS 這裡的 is_club_tier()
-- 限制是多餘的，導致一般社友打開活動明細看到「尚無人回覆」，統計人數
-- 也因為 RLS 濾掉大部分列而不準確。
--
-- 這裡拿掉這兩條的 is_club_tier() 限制，改成任何登入社友都能看到：
-- ①同社社友的報名紀錄、②本社主辦活動的全部報名紀錄（跨社報名者也算，
-- 但電話/備註等敏感欄位仍由前端 isOrganizer 擋住，只有管理員看得到）。
-- ════════════════════════════════════════════

DROP POLICY IF EXISTS "activity_registrations_select" ON activity_registrations;
CREATE POLICY "activity_registrations_select" ON activity_registrations FOR SELECT TO authenticated USING (
  registrant_id = auth.uid()
  OR club_id = current_club_id()
  OR EXISTS (
    SELECT 1 FROM activities a
    WHERE a.id = activity_registrations.activity_id AND a.organizing_club_id = current_club_id()
  )
  OR is_district_admin()
);
