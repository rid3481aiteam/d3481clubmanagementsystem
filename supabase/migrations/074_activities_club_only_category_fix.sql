-- ════════════════════════════════════════════
-- 074_activities_club_only_category_fix.sql
-- 修正資安漏洞：使用者回報「旭光社可以看到和平社的社內活動」。
--
-- 根因：054_activities_category_host.sql 新增 category 欄位（例會/社內活動/
-- 友社活動/地區活動/其他）取代原本 037 的「僅本社／全地區」概念，但 037
-- 建立的 RLS 政策實際判斷的是 club_only 這個布林欄位，兩者從未同步。
-- 前端表單新增活動時 category 預設是「社內活動」，但 club_only 預設卻是
-- false，只要使用者沒有另外手動切換「招募對象」為「僅本社社友」，這筆
-- category='社內活動' 的活動就會被 activities_select RLS 判定為全地區可見，
-- 造成社內活動跨社外洩。
--
-- 修法：
-- 1. 一次性回填：把現有 category='社內活動' 但 club_only=false 的既有資料
--    改成 club_only=true（closes 目前已外洩的資料）。
-- 2. 新增 CHECK constraint 把「category='社內活動' 必須 club_only=true」
--    這個不變量綁死在資料庫層，不管前端表單或未來任何寫入路徑（含直接
--    下 SQL）都不可能再造出社內活動卻沒被限定僅本社可見的髒資料。
-- 前端同步修正見 src/views/activities/ActivityListView.vue（save() 送出
-- 前強制 club_only=true、隱藏「招募對象」切換元件）。
-- ════════════════════════════════════════════

UPDATE activities SET club_only = true
WHERE category = '社內活動' AND NOT club_only;

ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_club_only_category_check;
ALTER TABLE activities ADD CONSTRAINT activities_club_only_category_check
  CHECK (category != '社內活動' OR club_only);
