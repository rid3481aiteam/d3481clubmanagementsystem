-- ════════════════════════════════════════════
-- 073_roster_district_isolation.sql
-- 社友名冊改成完全屬於各社自己的資料：地區管理員／地區唯讀都不能再
-- 看到任何社的名冊明細（姓名、聯絡方式、公司等），只有該社自己的
-- 社友／管理員看得到自己社的名冊。這是使用者明確要求的重新定義，
-- 跟先前「只遮蔽聯絡方式欄位」的討論不同——這次是整份名冊都不給
-- 地區層級看，不是欄位級遮蔽。
--
-- 但地區視角瀏覽「社團總覽→單一社」詳情頁（ClubDetailView.vue）需要
-- 「社友人數」「領域分布」這種不含個人身分的純統計數字，這兩個不算
-- 使用者說的「名冊」，繼續保留——改用下面兩支 SECURITY DEFINER 函式
-- 在資料庫端就算好聚合結果才回傳，前端完全不會收到任何一筆個別社友
-- 的原始資料。
-- ════════════════════════════════════════════

DROP POLICY IF EXISTS "roster_select" ON roster;
CREATE POLICY "roster_select" ON roster FOR SELECT TO authenticated USING (
  club_id = current_club_id()
);

CREATE OR REPLACE FUNCTION club_active_member_count(p_club_id uuid)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (is_district_viewer() OR p_club_id = current_club_id()) THEN
    RAISE EXCEPTION '沒有權限查詢這個社的統計資料';
  END IF;

  RETURN (
    SELECT count(*)::int FROM roster
    WHERE club_id = p_club_id AND member_status <> 'resigned'
  );
END;
$$;

CREATE OR REPLACE FUNCTION club_classification_breakdown(p_club_id uuid)
RETURNS TABLE (classification text, member_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (is_district_viewer() OR p_club_id = current_club_id()) THEN
    RAISE EXCEPTION '沒有權限查詢這個社的統計資料';
  END IF;

  RETURN QUERY
    SELECT COALESCE(NULLIF(trim(r.classification), ''), '未分類') AS classification, count(*) AS member_count
    FROM roster r
    WHERE r.club_id = p_club_id AND r.member_status <> 'resigned'
    GROUP BY 1
    ORDER BY 2 DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION club_active_member_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION club_classification_breakdown(uuid) TO authenticated;
