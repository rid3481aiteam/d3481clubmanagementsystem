-- ════════════════════════════════════════════
-- 072_activity_log_retention.sql
-- 操作紀錄最多保留 30 天，超過自動清除——使用者權衡過免費方案
-- 500MB 資料庫容量上限後的決定：操作紀錄是這幾張表裡成長最快的一張
-- （全區上百個社持續操作都會累積），但事後追查通常在一個月內就會
-- 發現，30 天保留期足夠用，用真正的刪除換取儲存空間可控。
--
-- 用 AFTER INSERT 的 statement-level trigger 自動清除，不依賴
-- pg_cron（要另外啟用 extension、免費方案是否支援不確定）——每次
-- log_activity() 寫入後順便清一次舊資料，這個規模下（一天頂多幾百筆）
-- 額外的 DELETE 開銷可以忽略。FOR EACH STATEMENT 而不是 FOR EACH ROW，
-- 一次 INSERT 語句只清一次，不會因為插入多筆而重複執行。
-- ════════════════════════════════════════════

CREATE OR REPLACE FUNCTION purge_old_activity_log()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM activity_log WHERE created_at < now() - interval '30 days';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS purge_old_activity_log_trigger ON activity_log;
CREATE TRIGGER purge_old_activity_log_trigger
  AFTER INSERT ON activity_log
  FOR EACH STATEMENT EXECUTE FUNCTION purge_old_activity_log();
