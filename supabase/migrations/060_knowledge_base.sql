-- ════════════════════════════════════════════
-- 060_knowledge_base.sql
-- 地區共用知識庫：地區管理員上傳扶輪相關 PDF 參考文件，全地區各社都能搜尋瀏覽。
-- 不分社（沒有 club_id），管理層級比照 022 的 district_announcements——只有地區
-- 管理員能新增/編輯/刪除，所有登入的人都能看/搜尋/下載。
--
-- content_text 是前端用 pdf.js 在瀏覽器端從 PDF 抽出來的純文字，上傳時跟檔案
-- 一起存進來，用來做「搜得到內文」的全文檢索，不是只搜標題/標籤。中文用
-- pg_trgm（trigram）比對，比 Postgres 內建全文檢索（針對歐洲語言分詞設計）
-- 更適合中文關鍵字比對。
-- ════════════════════════════════════════════

-- 整份改成可以重複執行也不會出錯（IF NOT EXISTS／DROP POLICY IF EXISTS 再
-- CREATE），因為部署時如果 SQL Editor 卡在中間某一步失敗，重新整段貼上
-- 執行時前面已經成功的部分（例如這張表本身）不應該讓整份直接報錯中斷。

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS knowledge_articles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  category     text,
  tags         text[] NOT NULL DEFAULT '{}',
  description  text,
  file_path    text NOT NULL,
  file_name    text NOT NULL,
  content_text text,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_articles_title_present CHECK (length(trim(title)) > 0)
);

CREATE INDEX IF NOT EXISTS knowledge_articles_title_trgm_idx ON knowledge_articles USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS knowledge_articles_content_trgm_idx ON knowledge_articles USING gin (content_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS knowledge_articles_tags_idx ON knowledge_articles USING gin (tags);
CREATE INDEX IF NOT EXISTS knowledge_articles_created_at_idx ON knowledge_articles (created_at DESC);

ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "knowledge_articles_select" ON knowledge_articles;
CREATE POLICY "knowledge_articles_select" ON knowledge_articles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "knowledge_articles_insert" ON knowledge_articles;
CREATE POLICY "knowledge_articles_insert" ON knowledge_articles
  FOR INSERT TO authenticated
  WITH CHECK (is_district_admin());

DROP POLICY IF EXISTS "knowledge_articles_update" ON knowledge_articles;
CREATE POLICY "knowledge_articles_update" ON knowledge_articles
  FOR UPDATE TO authenticated
  USING (is_district_admin())
  WITH CHECK (is_district_admin());

DROP POLICY IF EXISTS "knowledge_articles_delete" ON knowledge_articles;
CREATE POLICY "knowledge_articles_delete" ON knowledge_articles
  FOR DELETE TO authenticated
  USING (is_district_admin());

DROP TRIGGER IF EXISTS knowledge_articles_updated_at ON knowledge_articles;
CREATE TRIGGER knowledge_articles_updated_at
  BEFORE UPDATE ON knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- 原始 PDF 檔案，bucket 不公開，只有登入的人能透過 signed URL 存取
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-pdfs', 'knowledge-pdfs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "knowledge_pdfs_select" ON storage.objects;
CREATE POLICY "knowledge_pdfs_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'knowledge-pdfs');

DROP POLICY IF EXISTS "knowledge_pdfs_insert" ON storage.objects;
CREATE POLICY "knowledge_pdfs_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'knowledge-pdfs' AND is_district_admin());

DROP POLICY IF EXISTS "knowledge_pdfs_update" ON storage.objects;
CREATE POLICY "knowledge_pdfs_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'knowledge-pdfs' AND is_district_admin());

DROP POLICY IF EXISTS "knowledge_pdfs_delete" ON storage.objects;
CREATE POLICY "knowledge_pdfs_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'knowledge-pdfs' AND is_district_admin());

-- 新增這個功能的 feature flag，比照 K1 的做法預設關閉
INSERT INTO feature_flags (club_id, feature_key, enabled)
SELECT NULL, 'L1_knowledge_base', false
WHERE NOT EXISTS (
  SELECT 1 FROM feature_flags WHERE club_id IS NULL AND feature_key = 'L1_knowledge_base'
);
