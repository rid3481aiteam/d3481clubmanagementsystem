-- ════════════════════════════════════════════
-- 043_club_history_notable_events.sql
-- 「歷屆社長」改名「社的歷程」，欄位 service_plan（社區服務計劃）改名 notable_events（重要記事）
-- 並用社史文件《P17台北市和平扶輪社歷史軌跡.docx》（逐年逐日大事記）填入第 1~30 屆的重要記事
--
-- 資料來源逐日記載、屆別分界清楚（每屆一個表格區塊），不像 P21 那份跨頁相片集有歸屬不明的問題，
-- 可以直接照文件的屆別分段對應到 042 已建立的 year_term 逐筆填入，信心度高。
--
-- 可重複執行：欄位 rename 前先判斷是否存在；UPDATE 用 year_term 精準比對，重跑不會出錯（會覆蓋成同樣內容）。
-- ════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'club_history' AND column_name = 'service_plan'
  ) THEN
    ALTER TABLE club_history RENAME COLUMN service_plan TO notable_events;
  END IF;
END $$;


UPDATE club_history
SET notable_events = $tag$1990.09.06　台北西區扶輪社理事會通過輔導新社案，並推舉新社輔導委員：李超然(Chao)、陳宏輝(Philip)、賴崇賢(Right)、張耀琨(Light)、洪振攀(J.P.)、郭俊宏(William)、陳耀奇(Geroge)、黃南政(Francis)、林忠謙(Ken)等9位。
1990.09.20　和平社第一次籌備會議在西區社林維吾(I.G.)社友公館舉行，林維吾(I.G.)社友係本社創社長林明憲(C.P. Insurance)父親。
1990.10.24　臨時社第一次會議在環亞大飯店舉行，由總監特別代表西區社PP Philip主持。
1990.11.14　臨時社第二次會議，通過本社之社名為「台北和平扶輪社」，例會時間為每星期三中午12:30在環亞大飯店舉行，會議並選出本社第一屆理事9名，第一屆社長林明憲(Insurance)。
1990.12.12　國際扶輪正式批准本社成立並核發會員證書，社名：Rotary Club of Taipei Peace.
本社屬於國際扶輪348地區第二分區，也是台北西區社所輔導的第7個扶輪社，創社社員33位。
1991.02.23　和平社創社授證典禮假環亞大飯店舉行。輔導社台北西區社、西區社姊妹社、日本「鹿兒島扶輪社」及其子社「鹿兒島北扶輪社」均組團蒞臨參與盛會。
1991.05.09　台北市政府頒發本社人民團體立案證書，團體名稱：台北和平扶輪社。
1991.05.22　本社與日本「鹿兒島北扶輪社」在台北簽訂締結友好社同意書。
1991.07.01　RI重編地區編號，348地區改為3480地區，本社屬於3480地區第二分區。
1991.11.23　本社與西區社聯合例會，會中與日本「鹿兒島北扶輪社」正式簽定締結姊妹社同意書。
1991.12.11　社員大會通過本社名稱改為：「台北市和平扶輪社」。
1991.12.12　和平社授證一週年紀念晚會。
1992.04.10　本社組團前往日本參加鹿兒島北社授證3週年慶典。$tag$
WHERE year_term = '1990-1992'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$1992.07.30　和平高爾夫球隊於大屯球場正式成立，第一屆主委PP C.K.。
1992.10.10　和平合唱團於J.S.社友音樂教室正式成立。
1992.12.13　授證二週年紀念晚會假環亞大飯店五樓會議中心舉行。
1993.05.23　社會服務- 榮星公園舉辦大型兒童繪畫比賽，參賽者達千人。
1993.06.09　礁溪社組團來訪，本社理事會通過：和平社、礁溪社正式締結友好社。$tag$
WHERE year_term = '1992-1993'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$1993.07.01　本社褓姆PDG Philip擔任1993-94年度3480地區總監。
1993.07.21　理事會通過成立「社友夫人聯誼會」。
1994.01.25　「八德聯誼會」成立大會及第一次四社聯合例會假統一飯店舉行。
1994.04.09　本社組團前往日本參加鹿兒島北社授證五週年慶典及兩社續盟簽約儀式。
1994.06.09　國際扶輪年會第一次在台北舉行，年會活動「乾杯在台北」自6月9日至15日止，本社接待來自國外包括日本鹿兒島北社的扶輪貴賓及寶眷。$tag$
WHERE year_term = '1993-1994'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$1994.10.29　本社與花蓮東南社正式於花蓮簽訂「友好社締結同意書」。
1994.12.11　授證四週年紀念晚會，會中宣布「和平基金」正式成立，由Jimmy社友捐款60萬元，連同其他社友捐款總計93萬元。
1994.12.11　授證晚會上，和平社「生日快樂歌」首次演唱(J.S.社友譜曲，Art社友作詞)。
1994.12.15　社會服務- 和平基金撥款20萬元，捐贈高雄樂育孤兒院。$tag$
WHERE year_term = '1994-1995'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$1995.12.09　授證五週年紀念晚會，鹿兒島北社組團來訪，本社招待九份坪林一日遊。
1995.12.09　「台北市和平扶輪少年服務團」獲得國際扶輪授證，正式成立。
1995.12.29　本社國際服務「送愛心到泰北」，濟助各項物資給泰北貧困小學兒童。$tag$
WHERE year_term = '1995-1996'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$1996.07.01　本社每週例會地點今起變更為聯勤信義俱樂部。
1996.11.22　本社與花蓮東南社聯合國際服務「送愛心到泰北」，協助興建當地小學教師辦公室及贊助學童營養午餐。
1997.04.10　本社組團前往日本，參加鹿兒島北社授證8週年慶典並簽署姊妹社續盟同意書。$tag$
WHERE year_term = '1996-1997'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$1997.11.05　八德聯誼會聯合社會服務「滾動孩子的希望」，捐贈創世基金會及勵馨基金會。
1998.02.14　本社與台北西區社、日本鹿兒島北社、花蓮東南社聯合社會服務：成立花蓮德武社區永久性醫療站，捐贈醫療儀器設備，具有醫師背景之本社社友參與當地居民義診服務。$tag$
WHERE year_term = '1997-1998'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$1998.07.01　RI重新劃分地區，3480地區劃分為3480及3520地區，本社仍屬於國際扶輪3480地區第二分區。
1998.11.14　本社與花蓮東南社聯合國際服務「送愛心到東馬」，捐贈東馬偏遠地區學校桌椅、學童書包。
1998.12.12　授證8週年紀念晚會，同時舉辦第一屆「和平終身成就獎」，得獎人為前中央銀行總裁許遠東先生。
1999.03.14　輔導新社台北市太平扶輪社，創社授證典禮於台北西華飯店舉行。
1999.04.10　本社組團參加日本鹿兒島北社授證10週年紀念晚會。$tag$
WHERE year_term = '1998-1999'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$2000.03.29　日本鹿兒島北社子女 6名前來台北Home Stay, 由本社社友安排家庭接待，為期一週，本社舉辦歡迎晚會，並安排各項旅遊及交流活動。$tag$
WHERE year_term = '1999-2000'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$2000.08.24　本社與花蓮東南社及泰國清萊社聯合國際服務「送愛心到泰北」，捐贈泰北清萊地區醫療站。
2000.12.01　本社舉辦第二屆「和平終身成就獎」，得獎人為前民進黨主席林義雄先生。
2000.12.11　授證10週年紀念晚會在環亞大飯店擴大舉行，日本鹿兒島北社組團前來參加慶典及兩社續盟簽約儀式。$tag$
WHERE year_term = '2000-2001'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$2001.07.26　本社7位社友子女前往日本鹿兒島Home stay，由鹿兒島北社社友安排家庭接待，為期五天，鹿兒島北社舉辦歡迎晚會，並安排各項旅遊及交流活動。
2002.05.25　輔導新社台北市永平扶輪社，創社授證典禮於華國洲際飯店舉行。$tag$
WHERE year_term = '2001-2002'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$2002.12.27　社員大會通過本社「公積金管理辦法」，各屆之結餘款必須轉入公積金帳戶，而其動用須經規定之程序。
2003.04.26　「花蓮聲遠之家」社區服務，捐助原住民老人相關醫療設備。
2003.04.30　受SARS疫情影響，本社從4月底到6月上旬休會。$tag$
WHERE year_term = '2002-2003'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$2004.02.26　伸出援手到泰國清萊國際服務，協助興建村民活動中心及整修飲水設備。
2004.04.16　本社組團參加日本鹿兒島北社授證15週年紀念晚會以及續盟簽約儀式。$tag$
WHERE year_term = '2003-2004'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$2004.10.29　慶祝扶輪百週年，二分區聯合社區服務「馬祖節約用水措施推動計畫」，捐贈儀式在馬祖南竿舉行。
2005.01.12　本社每週例會地點今起變更為康華大飯店。$tag$
WHERE year_term = '2004-2005'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$2005.10.29　本社主辦，世界展望會協辦，10個扶輪社聯合捐贈設置的宜蘭南澳鄉「武塔育樂教室」啟用捐贈儀式。
2005.11.15　日本鹿兒島北扶輪社主辦，本社及尼泊爾Pashupati Kathmandu扶輪社協辦，捐贈尼泊爾視障人士2000支白色手杖，捐贈儀式在尼泊爾首都加德滿都舉行。
2005.12.11　本社授證15週年慶典，日本鹿兒島北社組團前來台北四天，參加本社授證盃高球賽及授證紀念晚會，本社由社友輪流接待台北市區及近郊旅遊。$tag$
WHERE year_term = '2005-2006'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$2006.07.12　本社每週例會地點今起變更為華漾大飯店。
2006.12.02　新竹縣「尖石泰雅爾延老部落幼兒照顧中心」揭碑及捐贈儀式。
2006.12.16　日本鹿兒島北社組團前來參加本社授證16週年慶典及兩社續盟簽約儀式。
2007.03.25　輔導新社台北市承平扶輪社，創社授證典禮在王朝酒店舉行。$tag$
WHERE year_term = '2006-2007'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$2007.07.01　本社PDG C.T.擔任2007-08年度3480地區總監。
2007.11.26　南投仁愛鄉「翠巒部落多功能教室」啟用捐贈儀式。
2008.04.12　歡迎鹿兒島北社來台參加3480地區年會。$tag$
WHERE year_term = '2007-2008'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$2008.08.18　新竹縣尖石鄉延老部落污水處理設備及淨水器捐贈典禮。
2009.04.08　本社組團前往日本參加鹿兒島北扶輪社授證20週年紀念晚會。
2009.06.20　第18屆感恩晚會，爭議多時的第二分區再分區案平和定案。$tag$
WHERE year_term = '2008-2009'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$2009.07.01　3480地區重新劃分各社所屬之分區，本社從原來第二分區劃分為第十三分區。
2009.09.05　台中縣和平國中校園安全改善計畫捐贈儀式。
2009.10.05　高雄縣桃源鄉「八八水災」學童安置計畫四輪傳動車捐贈儀式。
2010.03.24　本社第1000次例會移師阿里山賓館舉行，隔日莫拉克災區小學樂器捐贈儀式。
2010.04.06　本社組團參加日本鹿兒島北社授證21週年紀念晚會及續盟簽約儀式。$tag$
WHERE year_term = '2009-2010'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$2010.11.04　台東縣「八八風災」災後學生心理輔導計畫捐贈儀式。
2010.12.12　日本鹿兒島北社組團前來參加本社授證20週年紀念晚會。
2011.01.14　本社組團前往馬來西亞拜訪Titiwangsa扶輪社，並捐贈美門殘障關懷中心電腦硬軟體設備。$tag$
WHERE year_term = '2010-2011'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$2011.11.04　台東基督教醫院社區關懷服務車及花蓮壽豐國小教學器材捐贈儀式。
2011.12.14　本社與馬來西亞Titiwangsa扶輪社在台北康華飯店簽訂國際友好社同意書。$tag$
WHERE year_term = '2011-2012'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$2012.07.05　本社組團前往馬來西亞參加Titiwangsa扶輪社23屆就職典禮，並捐助印度心臟有缺陷嬰兒之手術費用。
2012.11.14　理事會通過與新竹縣和平扶輪社締結友好社。
2012.11.16　由本社發起，包括日本鹿兒島北社在內的11個扶輪社聯合贊助的「恆春基督教醫院關懷服務車」捐贈儀式。
2012.12.07　日本鹿兒島北社組團前來參加本社授證22週年紀念晚會及兩社續盟儀式。$tag$
WHERE year_term = '2012-2013'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$2013.08.02　夜光例會在晶華酒店舉行，本屆每個月舉行夜光例會一次，邀請全體社友及夫人參加，感恩晚會2014.6.30在101大樓86樓頂鮮餐廳舉行。
2013.09.27　雲林台西鄉「小提大奏」社區服務捐贈儀式，六輕工業區職業參訪。
2013.12.09　海外友好社馬來西亞Titiwangsa扶輪社，由社長Siang Siang帶團前來參加本社授證23週年紀念晚會。
2014.06.18　社員大會通過「台北市和平扶輪社細則」，做為本社各項社務管理之準則。$tag$
WHERE year_term = '2013-2014'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$2014.07.01　台北社PDG Gary 擔任2014-15年度國際扶輪社長，扶輪年度主題：Light Up Rotary.
2014.11.07　「嘉義聖馬爾定醫院阿里山醫療專車」及「嘉義腦麻協會補助計畫」捐贈儀式。
2015.04.20　輔導新社台北市三平扶輪社，創社授證典禮在君品酒店舉行。$tag$
WHERE year_term = '2014-2015'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$2015.10.23　「南投埔里仁愛之家」關懷服務車捐贈儀式。
2015.12.10　日本鹿兒島北社組團前來參加本社授證25週年紀念晚會。
2016.03.25　本社組團前往日本鹿兒島北社參加兩社續盟儀式。
2016.05.27　本社組團前往韓國首爾參加國際扶輪年會。$tag$
WHERE year_term = '2015-2016'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$2016.09.25　「新竹香園教養院讓愛飛翔小客車」勸募計畫、「台西觀光發展協會」、「嘉義腦麻協會」補助計畫捐贈儀式。
2016.09.25　鹿兒島北社與本社共同捐助台南玉井國中地震災後重建計畫。$tag$
WHERE year_term = '2016-2017'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$2017.07.01　RI重新劃分地區，3480地區劃分為3481及3482地區，本社屬於國際扶輪3481地區第八分區。
2017.10.20　台東長濱國小「看見希望」軟硬體設施捐贈儀式。$tag$
WHERE year_term = '2017-2018'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$2018.10.17　社員大會通過本社每週例會地點變更為福容大飯店台北一館。
2018.10.19　雲林台西鄉「海口生活館、海洋教育體驗場」捐贈儀式。
2019.04.11　本社組團前往日本參加鹿兒島北社授證30週年紀念晚會及兩社續盟儀式。$tag$
WHERE year_term = '2018-2019'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$2019.10.05　贊助宜蘭碧候國小推動適性多元社團捐贈儀式。
2019.12.12　授證29週年紀念晚會，三位新世代社友由總監佩章入社，為本社薪火相傳奠基。
2020.02.12　新冠肺炎疫情影響全球，本社2-5月份多次休會，各友社的例會及社慶等活動停辦，原定6月6-10日舉行的夏威夷國際扶輪年會也被迫取消。$tag$
WHERE year_term = '2019-2020'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');

UPDATE club_history
SET notable_events = $tag$2020.07.08　慶祝本社第1500次例會在福容飯店舉行。
2020.10.16　嘉義腦麻協會社區服務，烘培設備捐贈儀式。
2020.12.12　授證30週年晚會，五位新世代社友由總監佩章入社，為本社薪火相傳繼續發光發熱。$tag$
WHERE year_term = '2020-2021'
  AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社');
