-- ════════════════════════════════════════════
-- 042_heping_president_roster_seed.sql
-- 台北市和平扶輪社「歷屆社長」第 1～30 屆社長名單一次性匯入
-- 資料來源：社史文件《P21歷屆社長及重要服務成果.docx》（2020 年製作，記錄至第 30 屆 2020-2021）
--
-- 只匯入「屆數確定、社長姓名確定」的名單本身，不含每年度的社區服務事蹟：
-- 原始文件是跨頁對開的相片集，很多活動照片圖說夾在兩屆交界處，光靠文字順序
-- 無法百分之百判斷歸屬哪一屆，若自動塞入 service_plan 欄位有誤植風險，
-- 故这次先留白，之後由社辦/執秘核對原始文件後再手動補上「社區服務計劃」欄位。
-- president_name 欄位保留原文件的頭銜／分類原文（CP=創社社長 Charter President、
-- PP=卸任社長 Past President、IPP=卸任社長(去年)、P=現任社長，後面接扶輪職業分類）。
--
-- 可重複執行：ON CONFLICT (club_id, year_term) DO NOTHING，不覆蓋既有紀錄。
-- ════════════════════════════════════════════

INSERT INTO club_history (club_id, year_term, president_name)
SELECT c.id, v.year_term, v.president_name
FROM clubs c
CROSS JOIN (VALUES
  ('1990-1992', '林明憲 CP Insurance（創社社長）'),
  ('1992-1993', '王英華 PP Crown'),
  ('1993-1994', '吳建村 PDG C.T.'),
  ('1994-1995', '張昭雄 PP Alex'),
  ('1995-1996', '鄭再欽 PP Patent'),
  ('1996-1997', '李旺水 PP Walter'),
  ('1997-1998', '黃振恭 PP C.K.'),
  ('1998-1999', '胡坤佑 PP Lawyer'),
  ('1999-2000', '鄭耀宗 PP Bright'),
  ('2000-2001', '黃錫雄 PP Els'),
  ('2001-2002', '謝榮一 PP Motor'),
  ('2002-2003', '吳學志 PP Jason'),
  ('2003-2004', '杜希聖 PP Archi'),
  ('2004-2005', '張中偉 PP David'),
  ('2005-2006', '廖大進 PP Golden'),
  ('2006-2007', '陳釙贈 PP Rendering'),
  ('2007-2008', '黃文陵 PP Philip'),
  ('2008-2009', '施弘敏 PP Alan'),
  ('2009-2010', '曾添富 PP Aircond'),
  ('2010-2011', '林益進 PP Space'),
  ('2011-2012', '李欽益 PP Jimmy'),
  ('2012-2013', '洪文殼 PP Poster'),
  ('2013-2014', '林世順 PP House'),
  ('2014-2015', '羅謀榮 PP E.T.'),
  ('2015-2016', '葉奇聰 PP Hosmed'),
  ('2016-2017', '周芳文 PP Tax'),
  ('2017-2018', '陳冠元 PP Victor'),
  ('2018-2019', '黃詩清 PP Print'),
  ('2019-2020', '程智宏 IPP Jack'),
  ('2020-2021', '李頒仁 P Brendon')
) AS v(year_term, president_name)
WHERE c.name = '台北市和平扶輪社'
ON CONFLICT (club_id, year_term) DO NOTHING;
