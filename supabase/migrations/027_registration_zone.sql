-- ════════════════════════════════════════════
-- 027_registration_zone.sql
-- 註冊頁改成先選分區、再選社（避免使用者要在幾十個社的
-- 長清單裡自己找），public_clubs_for_registration() 補回傳 zone。
-- ════════════════════════════════════════════

-- Postgres 不准 CREATE OR REPLACE 改變既有 function 的回傳型別（多了 zone 欄位），
-- 要先 DROP 掉舊版本；DROP 後原本的 GRANT 也會一併消失，所以下面要重新 GRANT 一次。
DROP FUNCTION IF EXISTS public_clubs_for_registration();

CREATE FUNCTION public_clubs_for_registration()
RETURNS TABLE(id uuid, name text, zone text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name, zone FROM clubs ORDER BY sort_order;
$$;

GRANT EXECUTE ON FUNCTION public_clubs_for_registration() TO anon, authenticated;
