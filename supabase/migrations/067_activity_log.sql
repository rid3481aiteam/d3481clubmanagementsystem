-- ════════════════════════════════════════════
-- 067_activity_log.sql
-- 共用的操作紀錄表：記錄「哪個帳號在何時做了哪些事」，放在地區／各社
-- 「進階設定」底下的「操作紀錄」頁面。
--
-- 設計上不用 trigger 全面盯著每一張表——那樣工作量巨大（要動幾十張表），
-- 而且會把「改個電話」這種瑣碎異動也列進去，稀釋掉真正重要的紀錄，也
-- 寫不出「核准了謝宗廷的社友申請」這種人看得懂的描述（trigger 只看得到
-- 欄位變化）。改成應用程式在關鍵操作的程式碼裡明確呼叫 log_activity()
-- 這個 RPC，由它自己決定要記錄的描述文字。
--
-- log_activity() 用 SECURITY DEFINER，內部直接讀 auth.uid() 決定操作者
-- 身分、驗證這筆紀錄的 club_id 範圍呼叫者有沒有權限宣告——前端沒辦法
-- 冒充是別人做的、也不能宣告自己社以外的 club_id。activity_log 本身
-- 不開放 authenticated 角色直接 INSERT，只能透過這支函式寫入（比照
-- invite_log「寫入只透過受控管道」的既有慣例）。
-- ════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS activity_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name  text NOT NULL,             -- 存快照，帳號之後被刪除也看得懂是誰做的
  club_id     uuid REFERENCES clubs(id) ON DELETE CASCADE,  -- NULL = 地區層級操作
  action      text NOT NULL,             -- 簡短分類 key，例如 'account.approve'、'calendar.delete'
  description text NOT NULL,             -- 人看得懂的完整描述
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_log_club_created_idx ON activity_log (club_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_created_idx ON activity_log (created_at DESC);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- 地區管理員看全部（含地區層級跟所有社的紀錄）；各社（secretary/admin/
-- member 都算 is_club_tier 的判斷方式不同，這裡沿用既有 is_club_tier()
-- 只放行有管理權限的角色）只看自己社的紀錄，看不到地區層級（club_id
-- IS NULL）的操作。
DROP POLICY IF EXISTS "activity_log_select" ON activity_log;
CREATE POLICY "activity_log_select" ON activity_log FOR SELECT TO authenticated USING (
  is_district_admin() OR (club_id = current_club_id() AND is_club_tier())
);

CREATE OR REPLACE FUNCTION log_activity(p_action text, p_description text, p_club_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_name text;
BEGIN
  IF p_club_id IS NULL THEN
    IF NOT is_district_admin() THEN
      RAISE EXCEPTION '沒有權限記錄地區層級的操作紀錄';
    END IF;
  ELSIF p_club_id <> current_club_id() AND NOT is_district_admin() THEN
    RAISE EXCEPTION '沒有權限記錄其他社的操作紀錄';
  END IF;

  SELECT name INTO v_actor_name FROM user_profiles WHERE id = auth.uid();

  INSERT INTO activity_log (actor_id, actor_name, club_id, action, description)
  VALUES (auth.uid(), COALESCE(v_actor_name, '未知使用者'), p_club_id, p_action, p_description);
END;
$$;

GRANT EXECUTE ON FUNCTION log_activity(text, text, uuid) TO authenticated;
