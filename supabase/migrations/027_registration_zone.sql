-- ════════════════════════════════════════════
-- 027_registration_zone.sql
-- 註冊頁改成先選分區、再選社（避免使用者要在幾十個社的
-- 長清單裡自己找），public_clubs_for_registration() 補回傳 zone。
-- ════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public_clubs_for_registration()
RETURNS TABLE(id uuid, name text, zone text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name, zone FROM clubs ORDER BY sort_order;
$$;
