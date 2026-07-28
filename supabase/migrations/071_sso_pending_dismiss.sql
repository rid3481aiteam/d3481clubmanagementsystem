-- ════════════════════════════════════════════
-- 071_sso_pending_dismiss.sql
-- 「SSO 已核准，尚未登入」清單新增「取消」動作：地區管理員可以直接把
-- 一筆 sso_pending_account 記錄整個移除（不管有沒有指派過社別）。
--
-- 用途：①測試/誤觸產生的記錄可以清掉，不會一直卡在清單裡；②指派錯
-- 誤時可以整筆取消重來。刪掉這張表的記錄是安全的——它只是登入前的
-- 暫存資料，不是稽核紀錄；使用者之後如果真的登入，查無這筆記錄就會
-- 走原本「club_id 留空、丟進待審核」的既有正常流程，不會出錯（對應
-- 規格文件第 7.2 節「孤兒記錄可以刪除」的既有結論，這裡只是提前讓
-- 地區管理員手動觸發，而不是等 180 天自動清理）。
-- ════════════════════════════════════════════

DROP POLICY IF EXISTS "sso_pending_account_delete" ON sso_pending_account;
CREATE POLICY "sso_pending_account_delete" ON sso_pending_account FOR DELETE TO authenticated USING (
  is_district_admin()
);
