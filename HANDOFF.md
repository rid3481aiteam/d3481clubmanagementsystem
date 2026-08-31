# D3481 扶輪社管理系統 — 工作交接紀錄

> 最後更新：2026-08-17（第一百六十四輪，**社端「出席月報」的「歷月出席月報」表也比照上一輪（163）的 Excel 欄位規格調整**）：使用者問「在各社自己的出席月報的呈現方式可以比照嗎」，延續上一輪只改了地區端 [`AdminAttendanceView.vue`](src/views/admin/AdminAttendanceView.vue)（一列一社）的做法，這輪把社端 [`AttendanceMonthlyView.vue`](src/views/meetings/AttendanceMonthlyView.vue) 最下面的「歷月出席月報」表（一列一月，是這頁裡跟 Excel「一列一筆記錄」結構真正對應的表格）也改成同一組欄位順序：月份→RI半年報基準人數(男/女/合計)→月底人數(男/女/合計)→淨成長→年齡分布(40以下/41+/合計)→例會次數→出席率。原本這張表只用「當月社友合計」一個數字＋「淨成長」，這次擴充成完整的男/女/年齡欄位（資料其實 `membershipFor(r.month)` 早就有了，只是沒顯示全部），拿掉「應出席/實際出席」合併欄（比照 163 輪，Excel 沒有這兩欄）。`colspan` 邏輯（13/3）跟表頭配色 class（`hdr-navy`/`hdr-purple`/`hdr-yellow`/`hdr-green`）直接沿用地區端那份，兩張表現在視覺上完全一致。
>
> **這次刻意沒動的兩個地方**：① 上面「{{選擇月份}} 例會清單」那張表（單月內逐場例會列表，日期/主題/應出席/實際出席/出席率/操作）——這是「一列一場例會」的鑽取明細，跟 Excel「一列一筆月報記錄」的粒度不同，沒有對應欄位可以比照，維持原樣；② 「RI 半年報基準人數」那個輸入表單區塊——這是給使用者「編輯當月數字」用的表單（本來就已經照基準/月底/年齡分區塊排列），不是彙總表格，不需要重排欄位順序。
>
> **驗證**：`vue-tsc --noEmit`＋`npm run build` 皆通過。這個環境連不到 D3481 專案的 Supabase，無法用真實資料登入實測，靠仔細核對 `colspan` 算式（跟上一輪同一套邏輯：有會員資料 13、沒有 3）跟標籤配對過關。
>
> **待使用者：** 部署後登入任一社帳號看「出席月報」最下面「歷月出席月報」，確認欄位順序、男女/年齡數字有正確對到過去每個月填過的「RI 半年報基準人數」表單資料。

> 最後更新（上一輪）：2026-08-17（第一百六十三輪，**「出席月報（全區）」欄位順序／內容比照使用者提供的官方 Excel（`2026-27年度出席率.xlsx`）調整**）：使用者提供地區秘書實際在用的出席率 Excel（`7月` 分頁，132 列＝每社/衛星社一列＋最後 3 列小計），要求「依此 Excel 表格為主」調整 [`AdminAttendanceView.vue`](src/views/admin/AdminAttendanceView.vue)。比對後找到的落差跟這輪處理方式：
>
> ① **欄位順序**：Excel 是 社名→RI半年報基準(男/女/合計)→月底人數(男/女/合計)→淨成長→年齡分布(40以下/41+/合計)→例會次數→出席率，現有畫面卻把「例會次數/應出席/實際出席/出席率」放最前面——改成跟 Excel 一致的順序，`colspan` 數字同步從 15/5 改成 13/3（拿掉了下面②的兩欄）。
>
> ② **拿掉「應出席」「實際出席」兩欄**：Excel 完全沒有這兩欄，只留「例會次數」＋「出席率」，改成跟 Excel 一致（底層 `ClubMonthlyAttendanceRate` 的 `expected`/`actual` 還留著沒刪，只是這頁不顯示，別的地方如果還要用不受影響）。
>
> ③ **新增「合計」列**：Excel 最下面 3 列是「扶輪社」「衛星社」「合計」小計，這次先只做單一「合計」列（新增 `totals` computed，加總所有已載入社團的社友人數相關欄位），因為系統目前完全沒有「衛星社」這個概念（見下方待辦）,「扶輪社」跟「合計」現階段數字會一樣、暫不重複顯示。**例會次數／出席率刻意不加總**——比照 Excel 這兩欄在小計列本來就是留空，因為出席率不是能直接相加的數字，各社例會次數也不一，加總沒有意義。`handleExport()` 匯出的 Excel 也同步調整欄位順序＋補上合計列，可以直接取代使用者手動維護的這份檔案。
>
> ④ **使用者明確表示這次不用加「英文社名」欄位**（Excel 的 B 欄），所以 `clubs` 資料表沒有動，沒有新增 migration。
>
> **衛星社（Excel 裡 20 幾個「1-3-1台北群英宇宙衛星社」這種獨立列）：使用者已回覆「先忽略衛星社」**——這次不建、之後有需要再另外提。所以「出席月報（全區）」目前就是只有一般社的合計，沒有、也不需要拆「扶輪社／衛星社」兩種小計，`clubs` 資料表維持原樣，不用新增 `is_satellite`／`parent_club_id` 這類欄位。之後如果使用者又提起衛星社，先來這裡確認是不是真的要做，不要預設又要做。
>
> **驗證**：`vue-tsc --noEmit`＋`npm run build` 皆通過。這個環境連不到 D3481 專案的 Supabase（跟 memory 記錄一致，`.env.local` 不存在），無法登入正式站用真實資料實測，改成仔細重讀整段 template 的 `colspan` 算式（有會員資料時 1+3+3+1+3+1+1=13、沒有時 1+1+1=3，跟程式碼一致）跟 `v-if`/`v-for`/`template` 標籤配對，純結構調整、沒有新邏輯分支，风险相對低。
>
> **待使用者：** 部署後登入地區管理員帳號看「出席月報（全區）」，確認欄位順序、合計列數字跟你的 Excel 對得起來；再想一下衛星社要用哪種模式，回覆後我再接著做。

> 最後更新（上一輪）：2026-08-17（第一百六十二輪，**新增「台北西區扶青社」到社團總覽**）：使用者要求新建一個社團「台北西區扶青社」。這個環境連不到 D3481 專案的 Supabase（跟 memory 記錄一致），無法直接透過後台「+ 新增社團」（[`ClubListView.vue`](src/views/admin/ClubListView.vue)）幫使用者按下去，改成寫一份 migration：新增 [`077_add_taipei_west_rotaract.sql`](supabase/migrations/077_add_taipei_west_rotaract.sql)，只 insert `name='台北西區扶青社'`／`zone='第二分區'`（比照輔導社台北西區扶輪社所在分區，使用者確認），其餘社長/執秘/email/電話/例會時間地點等欄位留空，之後由地區管理員在「編輯社團」頁面補上（跟既有 [`015_seed_district_clubs.sql`](supabase/migrations/015_seed_district_clubs.sql) 同樣的 seed 慣例，`WHERE NOT EXISTS` 可重複執行不會產生重複社團）。**待使用者：** 到 Supabase Dashboard SQL Editor 手動執行 077 migration，執行後到正式站「社團總覽」確認「台北西區扶青社」出現在第二分區，需要的話再補社長/執秘等聯絡資訊。

> 最後更新（上一輪）：2026-08-14（第一百六十一輪，**`/calendar` 地區重要行事曆改成響應式（依斷點切換版型/欄位）**）：使用者提供一份「如何跟 AI 說明響應式需求」的教學文件（含具體斷點、版型、欄位優先級與驗收標準），依此重寫 [`DistrictCalendarView.vue`](src/views/DistrictCalendarView.vue)：
>
> **斷點與版型**：Desktop（`>=1024px`）用 `<table>` 顯示全部欄位（日期/時段/活動名稱/地點/完整日期含星期/倒數天數/加入行事曆）；Tablet（`640–1023px`）改兩欄卡片格線（`grid-template-columns:1fr 1fr`），隱藏含星期的完整日期，地點單行截斷，「加入行事曆」保留文字＋圖示；Mobile（`<640px`）改單欄卡片，標題 `-webkit-line-clamp:2` 限兩行，地點 `text-overflow:ellipsis` 截斷，右上角倒數天數 badge，「加入行事曆」縮成純圖示按鈕但維持 `min-width/height:44px` 觸控熱區。三種版型共用同一份 `monthGroups`/`filtered` computed（沒有另外重複寫一套過濾/抓資料邏輯），純粹用 CSS media query（`min-width:640px`/`min-width:1024px`）切換 `display`，**沒有用 JS 偵測 `window.innerWidth`**。
>
> **其他共同規則**：月份分組標題 `.dc-month-head` 加 `position:sticky; top:0`，所有尺寸捲動時都會置頂；篩選頁籤（即將到來/全部/已過期）在 `<640px` 改 `flex:1 1 33.333%` 等寬三等分，容器加 `overflow-x:auto` 保險。
>
> **驗證**：`vue-tsc --noEmit` 通過。因為這個環境沒有 D3481 專案的 Supabase 憑證（`.env.local` 不存在，`list_projects` 也看不到這個專案，跟 memory 記錄一致），無法直接跑起 `/calendar` 頁面實測登入後畫面，改成另外用同一份 markup/CSS 搭配假資料（含使用者提供的最長活動名稱範例：「2027-28年度『社領導人學習研習會』(Club Leadership Learning Seminar：CLLS) 08:00-21:30」）做成靜態 HTML，在 Claude 內建瀏覽器實測 320/375/768/1440px 四個寬度：全部無橫向捲軸（`body.scrollWidth` 等於 `clientWidth`）、最長活動名稱在三種版型都正常換行/截斷沒撐破版面、768px 確認正確切到兩欄卡片、1440px 確認正確切到表格版、320/375px 確認標題兩行截斷＋圖示按鈕≥44px。
>
> **這次刻意沒做**（教學文件「五、追加優化」列的是第二輪才做的項目，這輪先做完第一版核心需求）：`aria-label` 只加在 Mobile 圖示按鈕上（已做），沒有額外做無限捲動／分批渲染（文件建議 51 筆時 Mobile 先渲染 20 筆，這個環境連不到真實資料看不出目前實際筆數是否需要，先不處理，需要的話可以之後追加）；斷點規則沒有抽成共用元件（目前只有這一個頁面用得到，等第二個列表頁也要用同一套斷點時再抽取比較不會抽錯介面）。
>
> **待使用者：** 部署後在正式站登入實測 `/calendar`，用真實資料在手機/平板/桌機分別確認版型與資料正確；如果之後要把這套斷點規則套到其他列表頁，屆時再一起討論怎麼抽成共用元件。
>
> 最後更新（上一輪）：2026-08-08（第一百六十輪，**潛在社友追蹤／社友關懷比照上一輪堵住地區管理員旁通漏洞**）：延續上一輪（159）三份測試報告裡標註「未涵蓋範圍」的疑慮，使用者確認要「比照上一輪」（158/075 對活動的處理原則）處理。查證 `prospects_select`／`care_select`（[`002_roster_members.sql`](supabase/migrations/002_roster_members.sql)）都有 `OR is_district_admin()` 無條件旁通。跟活動不同的是，這兩張表完全沒有「非社內、可跨社瀏覽」的資料類別（不像活動還有友社/地區活動要保留地區總覽），每一筆都是單一社的招募/關懷內部資料，所以這次採用跟 [`073_roster_district_isolation.sql`](supabase/migrations/073_roster_district_isolation.sql)（社友名冊）完全一樣的作法——直接拿掉 `is_district_admin()` 旁通，不是像活動那樣做 `AND NOT club_only` 的部分保留。新增 [`076_prospective_care_district_isolation.sql`](supabase/migrations/076_prospective_care_district_isolation.sql)。額外確認：`grep` 全部呼叫 `prospective.fetchAll()`/`care.fetchAll()` 的地方（`ProspectiveView.vue`／`MemberCareView.vue`／`DashboardView.vue`）都是傳 `auth.clubId`，沒有任何地方依賴 `null`（地區視角）撈全地區資料，確認這次收緊不會誤傷現有功能。
>
> 同一輪使用者也問「能不能連到 Supabase 查 503 問題」——Supabase MCP 的 `list_projects` 再次確認只看得到 WOWCasa/AICasa/Homerepair，看不到 D3481 專案（跟 memory 記錄一致，帳號權限沒變），改成請使用者在 Claude 內建瀏覽器（Browser pane）自行登入 Supabase Dashboard（Claude 不經手密碼），登入後由 Claude 用瀏覽器工具導覽到 Logs 頁面協助讀取診斷 503 錯誤——這部分待瀏覽器內操作結果，若有查到根因會另外記錄。
>
> 最後更新（上一輪）：2026-08-08（第一百五十九輪，**依 3 份 QA 測試報告修復「潛在社友追蹤」「社友關懷」「社內公告」三頁的功能缺陷**）：使用者提供 2026-08-07 的三份手動測試報告（[`潛在社友追蹤`](src/views/roster/ProspectiveView.vue)／[`社友關懷`](src/views/club/MemberCareView.vue)／[`社內公告`](src/views/club/ClubAnnouncementsView.vue)），逐項依報告的「修復優先順序建議」修正：
>
> **[`ProspectiveView.vue`](src/views/roster/ProspectiveView.vue) + [`stores/prospective.ts`](src/stores/prospective.ts)**：① 補上刪除功能（store 新增 `remove()`，RLS 本來就允許 DELETE，純粹前端沒做）；② `save()` 送出前把 `invited_date`/`follow_up_date` 的空字串轉 `null`，修掉「填過再清空」會把空字串送給 Postgres date 欄位報錯的 bug；③「追蹤中」統計卡改成排除已入社/婉拒（新增 `isTracking()` 跟「需跟進」共用同一組排除規則，避免兩張卡邏輯不一致），「需跟進」順便涵蓋「從未設定追蹤日」的人；④ Modal 包 `<form>`＋姓名欄位補 `required`＋`maxlength=100`，讓瀏覽器原生驗證生效；⑤ 新增下次追蹤日期早於邀請日期的軟性提示（不擋存檔）；⑥ 狀態改「已邀請」時自動帶入今天當邀請日期；⑦ 備註改 `textarea`；⑧ 加姓名／公司搜尋框；⑨ 表單欄位補 `id`/`for` 綁定；⑩ `alert()` 改用站內 toast。
>
> **[`MemberCareView.vue`](src/views/club/MemberCareView.vue)**：① 日期欄位加 `max` 屬性＋ `save()` 二次檢查，不得晚於今天；② 新增重複紀錄偵測（同社友＋同類型＋同日期已存在時，跳 `confirm()` 詢問是否仍要新增）；③ 刪除按鈕從「只藏在編輯 Modal 裡」搬到列表上（跟其他兩頁一致），Modal 內原本的「🗑 刪除」移除避免重複入口；④ 新增社友篩選下拉；⑤ 備註加 `maxlength=300`＋改 `textarea`＋列表截斷；⑥ Modal 包 `<form>`＋`id`/`for` 綁定；⑦ 新增「日期距今超過 20 年」軟性提示。原本的必填驗證邏輯（`formError`）其實是對的，報告測到的「完全沒反應」推測是正式站舊版建置或測試當下的暫時狀況，這次一併補上 `required` 屬性＋包 `<form>`，讓瀏覽器原生驗證也生效，雙重保險。
>
> **[`ClubAnnouncementsView.vue`](src/views/club/ClubAnnouncementsView.vue)**：① 新增 `announcementStatus()` 綜合判斷「草稿／排程中／已發布／已過期」（原本只看 `is_published` checkbox，完全忽略發布/到期時間），取代原本的單純 checkbox 判斷；② `save()` 送出前驗證到期時間必須晚於發布時間，中文訊息直接擋下，不會再讓 Postgres check constraint 原文（資料表/約束名稱）洩漏給使用者；新增 `friendlyError()` 把已知的 DB constraint 錯誤映射成中文，未知錯誤一律顯示通用訊息不顯示原文；③ 標題／內容欄位補 `required`＋標題 `maxlength=100`，Modal 包 `<form>`；④ 時間顯示補上年份（`formatDateTime` 加 `year: 'numeric'`）；⑤ checkbox 文案「發布到本社儀表板」改成「立即發布（取消勾選則存為草稿，社友看不到）」，避免使用者誤解成推播開關；⑥ `alert()` 改用站內 toast。
>
> **驗證**：`vue-tsc --noEmit` 通過；灌假 pinia 狀態繞過登入，三頁逐一在瀏覽器實測：潛在社友的「追蹤中/需跟進」統計數字符合預期、姓名留空時瀏覽器原生擋下並顯示「請填寫這個欄位」、日期順序警告正確顯示；社友關懷的日期 `max` 屬性正確限制今天、重複紀錄會觸發 `confirm()` 且訊息內容正確；社內公告 4 種狀態徽章（排程中/已過期/已發布/草稿）用不同發布/到期時間組合測試皆正確計算、到期早於發布時間會被前端攔下顯示中文訊息不再打到後端、標題 `maxlength` 生效。驗證用暫時性 `.env.local`／`main.ts` QA hook 已全部還原，`git status` 確認乾淨。
>
> **這次刻意沒做**（報告裡列為 P3 或「未涵蓋範圍」，非本輪「修復優先順序建議」核心項目，避免範圍發散）：真正的分頁 UI（三個 store 的 `fetchAll` 仍是 `select=*` 無 limit，資料量大時仍有效能疑慮）；社友下拉搜尋（社友關懷目前仍是純下拉，人數多的社捲動仍不便）；「生日提醒」自動化（報告自己也標註是功能建議非缺陷）。**三份報告都指出、但這輪沒處理的資安疑慮**：`prospects_select`／`care_select` 這兩條 RLS 政策（[`002_roster_members.sql`](supabase/migrations/002_roster_members.sql)）都還留著 `OR is_district_admin()` 無條件旁通，跟上一輪（158）修復前的「活動」漏洞是同一種模式——地區管理員雙重身分帳號理論上能看到全地區所有社的潛在社友/關懷紀錄（含生病/喪事等敏感個資），但這次的三份報告都只用同一組帳號測試，沒有實際驗證出「確實外洩」，所以先記錄下來、不主動改，等使用者確認是否要延續上一輪的原則（`AND NOT club_only` 那種收緊）一併處理。另外三份報告都提到的 `user_profiles` 待審核數 HEAD 查詢穩定回 503，是 Supabase 基礎設施或 RLS 效能層面的問題，需要真的連得到正式站 Supabase 才能查 log 診斷，這個環境連不到，也先記錄不處理。

> **待使用者：** 部署後找一個帳號實測三頁：① 潛在社友追蹤，測試填了追蹤日期又清空能不能正常存檔、「追蹤中」數字是否已排除已入社/婉拒的人、刪除功能是否正常；② 社友關懷，測試選未來日期會不會被擋、故意新增一筆重複紀錄看會不會跳確認視窗；③ 社內公告，測試到期時間設得比發布時間早會不會被前端擋下（不再看到英文錯誤原文），排一筆未來發布時間的公告確認狀態顯示「排程中」而不是「已發布」。如果上述都正常，可以再回來討論要不要處理 `prospects_select`/`care_select` 的地區管理員旁通問題，以及 503 的問題要不要找時間一起連線診斷。

> 最後更新（上一輪）：2026-08-08（第一百五十八輪，**社內活動外洩修復追加：地區管理員雙重身分帳號仍能看到其他社的社內活動**）：使用者跑完 074 migration 後實測，發現用「高欣妤」（badge 顯示「各社管理員＋地區」，即同時是旭光社管理員＋地區管理員）帳號切到「台北旭光扶輪社」檢視畫面時，「社內活動」分類下仍看得到和平社的「和平678七月首聚」。查證發現 074 只堵住一般社友的漏洞，**沒堵到地區管理員**：`activities_select`／`activity_registrations_select` 這兩條 RLS 政策從 [`035_activities.sql`](supabase/migrations/035_activities.sql)／[`067_activity_registrations_club_visibility.sql`](supabase/migrations/067_activity_registrations_club_visibility.sql) 建立以來就有 `OR is_district_admin()` 無條件旁通，`is_district_admin()` 只看帳號底層是否有 `district_role='admin'`，完全不管畫面上目前切到哪個社檢視，導致雙重身分帳號永遠能看到全地區所有活動（含其他社的社內活動）。**跟使用者確認範圍**：地區管理員即使切到「地區介面」檢視，也不該看到任何社的社內活動——跟 [`073_roster_district_isolation.sql`](supabase/migrations/073_roster_district_isolation.sql) 對社友名冊的隱私收緊原則一致（地區管理員在地區介面仍能看到全地區「例會/友社活動/地區活動/其他」供跨社協調，但社內活動一律不放行）。新增 [`075_activities_district_admin_club_only_fix.sql`](supabase/migrations/075_activities_district_admin_club_only_fix.sql)：兩條政策的 `is_district_admin()` 都改成 `is_district_admin() AND NOT club_only`（`activity_registrations_select` 額外 join `activities` 表判斷對應活動是否 `club_only`）。同步修正 [`stores/activities.ts`](src/stores/activities.ts) 的 `fetchAll()` 查詢，client 端的 `.or()` 條件加上 `club_only.eq.false`，避免查詢語意跟 RLS 邊界脫鉤（RLS 才是真正的安全邊界，這裡只是同步對齊避免誤解）。`vue-tsc --noEmit` 通過；純 SQL/查詢條件修正，沒有 UI 變化可用假資料在瀏覽器驗證，**需要使用者拿真的雙重身分帳號在正式站實測**。

> **SQL migration 已由使用者於 2026-08-08 在 Supabase Dashboard SQL Editor 手動執行完成。待使用者：** 用「高欣妤」（或任何同時是社管理員＋地區管理員的帳號）切到「台北旭光扶輪社」檢視，確認「社內活動」分類下只看得到旭光社自己的活動，看不到和平社的；順便切到「地區介面」檢視，確認「社內活動」分類不再出現別社資料，但「友社活動/地區活動/其他」等其他分類仍正常看得到全地區資料，確認沒有把地區管理員原本合理的跨社總覽功能一併砍掉。

> 最後更新（上一輪）：2026-08-08（第一百五十七輪，**修復資安漏洞：社內活動跨社外洩＋出席記錄頁補儲存提示與返回按鈕**）：使用者回報「旭光社可以看到和平社的社內活動」。查證發現根因：[`054_activities_category_host.sql`](supabase/migrations/054_activities_category_host.sql) 新增 `category` 分類欄位（例會/社內活動/友社活動/地區活動/其他）取代 [`037_activity_visibility_address_backfill.sql`](supabase/migrations/037_activity_visibility_address_backfill.sql) 原本的「僅本社／全地區」概念，但 037 建立的 `activities_select` RLS 政策實際判斷的是 `club_only` 布林欄位，兩者從未同步——[`ActivityListView.vue`](src/views/activities/ActivityListView.vue) 新增活動表單 `category` 預設是「社內活動」，但 `club_only` 預設卻是 `false`，只要使用者沒有另外手動切換「招募對象」為「僅本社社友」，這筆社內活動就會被 RLS 判定成全地區可見，造成跨社外洩。**修法分兩層**：① 新增 [`074_activities_club_only_category_fix.sql`](supabase/migrations/074_activities_club_only_category_fix.sql)，一次性回填既有 `category='社內活動' AND club_only=false` 的髒資料成 `club_only=true`，並新增 CHECK constraint `activities_club_only_category_check` 把「社內活動必須 club_only=true」這個不變量綁死在資料庫層，不管前端或未來任何寫入路徑都不可能再造出外洩資料（**待使用者到 Supabase Dashboard SQL Editor 手動執行**，Claude 這個環境連不到 D3481 專案的 Supabase）；② 前端 `ActivityListView.vue` 的 `save()` 送出前強制 `club_only = pickedCategory === '社內活動' ? true : activityForm.club_only`（最後一道防線），並把「招募對象」切換元件改成只在非社內活動類別顯示，社內活動改顯示固定說明文字「社內活動固定僅本社社友看得到、可報名，不開放跨社瀏覽」，避免使用者以為還有選擇餘地。

> 同一輪另外處理使用者回報的出席記錄頁（`/meetings/:id/attendance`，[`AttendanceView.vue`](src/views/meetings/AttendanceView.vue)）兩個 UX 問題：① 按下「儲存出席記錄」原本沒有任何提示，改成呼叫既有的 [`toast.ts`](src/stores/toast.ts) 共用 toast store，成功顯示「已儲存出席記錄」、失敗顯示「儲存失敗：...」（沿用 `ActivityListView.vue`/`KnowledgeBaseView.vue` 既有的 toast 呼叫慣例）；② 標題列新增「← 返回」按鈕（`router.back()`），不想儲存或儲存完都能一鍵回到上一頁。**驗證**：`vue-tsc --noEmit` 通過；灌假 pinia 狀態繞過登入，瀏覽器實測活動新增表單切到「社內活動」類別時「招募對象」切換元件正確被隱藏、改顯示固定說明文字，切回「友社活動」則正確顯示切換元件；出席記錄頁直接呼叫儲存按鈕的 DOM click，確認打到假 Supabase 網域失敗時 toast 正確顯示「儲存失敗：TypeError: Failed to fetch」（證明 toast 呼叫路徑確實有接上，成功路徑用同一組程式碼、沒有另外用真實資料庫驗證），「返回」按鈕點擊後瀏覽器歷史紀錄正確回到前一頁。驗證用暫時性 `.env.local`／`main.ts` QA hook 已全部還原，`git status` 確認乾淨。

> **① SQL migration 已由使用者於 2026-08-08 在 Supabase Dashboard SQL Editor 手動執行完成**（回填既有外洩資料＋加 `activities_club_only_category_check` constraint）。**待使用者：** 用旭光社帳號實際確認已看不到和平社的社內活動（確認資料層修復生效）；② 部署前端後找一個社友帳號測試新增「社內活動」，確認「招募對象」欄位變成固定說明文字（不能再選全地區）；③ 找一場例會實際點「儲存出席記錄」，確認跳出「已儲存出席記錄」的綠色提示，並測「← 返回」按鈕行為符合預期。

> 最後更新（上一輪）：2026-08-03（第一百五十六輪，**5 個📖手冊按鈕改成一律從第一頁開啟**）：使用者反映每個手冊點下按鈕後應該預設從第一頁開始，不要直接跳章節。拿掉上一輪加的 `#page=N` 錨點，[`RosterView.vue`](src/views/roster/RosterView.vue)／[`OfficersView.vue`](src/views/club/OfficersView.vue)／[`AccountManagementView.vue`](src/views/admin/AccountManagementView.vue)／[`ActivityListView.vue`](src/views/activities/ActivityListView.vue)／[`AttendanceMonthlyView.vue`](src/views/meetings/AttendanceMonthlyView.vue) 的 `manual-url` 都改成純檔案路徑（例如 `/manual/roster-officers-guide.pdf`，不再帶 `#page=3`）。`vue-tsc --noEmit` 通過，純字串改動未另外開瀏覽器驗證。

> 最後更新（上一輪）：2026-08-03（第一百五十五輪，**使用者提供 4 份新版功能 SOP 簡報，補齊「活動」「出席月報」「帳號管理」「本屆幹部」四頁的📖手冊按鈕**）：延續上一輪的社友名冊可行性驗證，使用者提供 4 份 Rotary navy/gold 排版的簡報 PDF（`~/Desktop/2627 AI委員會/社務平台/SOP/`），內容分別對應：`社務平台x社的成員使用說明.pdf`（社友名冊×本屆幹部）、`社務平台社友帳號開通 SOP.pdf`（帳號管理）、`活動建立 × 報名管理 × 出席串接.pdf`（活動）、`月份總覽 × 出席補登 × RI 半年報.pdf`（出席月報），視覺品質比舊的 `docs/sop` 純文字+截圖版本更完整，這次直接拿整份 PDF 當對應頁面的手冊本體（不再走截圖拼 Markdown 那條路）。四份複製進 [`public/manual/`](public/manual/)（`roster-officers-guide.pdf`／`account-activation-guide.pdf`／`activities-guide.pdf`／`attendance-monthly-guide.pdf`，皆改純英文檔名），舊的 `sop-guide.pdf` 已刪除（[`RosterView.vue`](src/views/roster/RosterView.vue) 的 `manual-url` 改連 `roster-officers-guide.pdf#page=3`，內容更新更好看）。[`ActivityListView.vue`](src/views/activities/ActivityListView.vue)、[`AttendanceMonthlyView.vue`](src/views/meetings/AttendanceMonthlyView.vue) 本來就有 `PageHelp`，直接補上 `manual-url`（分別對應各自 PDF 的核心操作章節起點）。[`AccountManagementView.vue`](src/views/admin/AccountManagementView.vue)、[`OfficersView.vue`](src/views/club/OfficersView.vue) 原本完全沒有 `PageHelp`，這次一併補上（含新寫的 help items 文字＋📖 手冊按鈕），跟其他模組的問號體驗一致。**驗證**：`vue-tsc --noEmit` 通過；灌假 pinia 狀態繞過登入，依序造訪 `/roster`／`/club/officers`／`/club/invite`／`/activities`／`/attendance/monthly` 五個頁面，accessibility tree 逐一確認 📖 連結的 `href` 都指向正確檔案與頁碼；`curl` 確認四份新 PDF 皆以 `application/pdf` 正確提供、位元組數與來源檔一致。驗證用暫時性 `.env.local`／`main.ts` QA hook 已全部還原，`git status` 確認乾淨。**尚未覆蓋**：Email 通知設定、帳號審核通知、知識庫這 3 頁的 `PageHelp` 目前還沒有對應素材，維持原樣；`docs/sop/02-功能操作SOP.md` 這條 Markdown+截圖的舊路線目前處於平行狀態沒有繼續維護，之後若要決定唯一手冊來源可以再跟使用者確認。

> **待使用者：** 部署後實際點一次這 5 個頁面（社友名冊／活動／出席月報／帳號管理／本屆幹部）的 📖 按鈕，確認新分頁能開啟對應 PDF 並跳到期望頁碼；`AccountManagementView.vue`／`OfficersView.vue` 是這次新加的問號，順便確認彈出的說明文字內容跟操作邏輯相符。若之後還有 Email 通知設定/帳號審核通知/知識庫這 3 頁的操作素材，可以延續同樣做法補上。

> 最後更新（上一輪）：2026-08-03（第一百五十四輪，**「問號」填寫說明旁新增📖手冊按鈕，先在社友名冊頁做可行性驗證**）：使用者想在既有的 `PageHelp`（?按鈕）旁邊加一個連到使用手冊的按鈕，先挑「社友名冊」頁做示範測試。[`PageHelp.vue`](src/components/help/PageHelp.vue) 新增可選的 `manualUrl` prop，有傳的話在「?」右邊多渲染一個 📖 連結（`target="_blank"`，共用同一顆 22px 圓形按鈕樣式），[`RosterView.vue`](src/views/roster/RosterView.vue) 傳入 `manual-url="/manual/sop-guide.pdf#page=3"`。手冊本體是把 `docs/sop/D3481功能操作SOP-進度預覽.pdf` 複製一份到 [`public/manual/sop-guide.pdf`](public/manual/sop-guide.pdf)（改成純英文檔名，避免中文檔名進 URL 被轉碼），讓 Vite 當一般靜態資源提供，`#page=3` 是瀏覽器 PDF 檢視器認的錨點（不送到伺服器），對應到 PDF 第 3 頁「社友名冊：登入與進入名冊頁」章節開頭，剛好符合。**驗證**：`vue-tsc --noEmit` 通過；灌假 pinia 狀態繞過登入，瀏覽器截圖＋accessibility tree 確認 📖 按鈕正確出現且 `href` 正確；`curl` 確認 Vite 正確以 `application/pdf` 提供該靜態檔（200、位元組數與來源檔一致）。驗證用的暫時性 `.env.local`／`main.ts` QA hook 已全部還原，`git status` 確認乾淨。**發現的落差**：`public/manual/sop-guide.pdf` 是舊版，缺少 `docs/sop/02-功能操作SOP.md` 已經寫好的「帳號管理」章節（PDF 沒重新產出過）；另外目前全站有 6 個頁面用 `PageHelp`（社友名冊／活動／出席月報／Email 通知設定／帳號審核通知／知識庫），但 SOP 手冊目前只寫完「社友名冊」這一段，其餘 5 頁若貿然加 📖 按鈕會連到不相關內容，這次**刻意只做社友名冊一頁**，其餘 5 頁待使用者之後提供對應功能的 PDF/截圖素材，整理成新章節後再補上手冊按鈕（見下方待辦）。另外 `AccountManagementView.vue` 目前完全沒有 `PageHelp`，不在這次「其他有 PageHelp 的頁面」範圍內，暫不處理。

> **待使用者：** 部署後實際點一次「社友名冊」頁「?」旁邊的 📖，確認新分頁能正常開啟 PDF 並跳到「社友名冊」章節（第 3 頁）。使用者已答應會提供其餘 5 個功能（活動、出席月報、Email 通知設定、帳號審核通知、知識庫）的操作素材（PDF/截圖），下次對話收到後接續整理成 SOP 新章節，再回頭幫這 5 頁補上手冊按鈕；同時建議屆時一併重新產出 `sop-guide.pdf`，把已經寫好但 PDF 還沒收錄的「帳號管理」章節也補進去。

> 最後更新（上一輪）：2026-08-02（第一百五十三輪，**社友名冊 Excel 匯入的「入社日期」原本沒有格式容錯，改成兜住常見寫法**）：使用者反映有社友要匯入名冊，因為入社日期格式問題一直匯不進去，詢問「目前是有鎖定格式嗎」。查證 [`RosterView.vue`](src/views/roster/RosterView.vue) 的 `handleImport`，發現原本 `join_date: row.入社日期 ?? null` 完全沒有做任何轉換或驗證，直接把 Excel 儲存格的原始值丟進 Postgres 的 `date` 型別欄位（見 [`002_roster_members.sql`](supabase/migrations/002_roster_members.sql)）——「下載範本」建議填 `YYYY-MM-DD`（如 `2026-07-01`），但完全沒有強制，只要社友填成民國年（如 `113/7/1`）、中文年月日（`113年7月1日`）、或 Excel 把儲存格存成純數字序列值，Postgres 解析失敗就會讓 `confirmImport()` 整批匯入卡在第一筆失敗的地方（`alert` 出來的是原始 Postgres 錯誤訊息，不好懂）。新增 `parseJoinDate`／`excelSerialToISODate`／`pad2` 三個 helper，攔住西元年（`-`/`/`/`.` 分隔、可省略前導 0）、民國年（年份 <1000 自動 +1911）、中文「YYYY年M月D日」、Excel 日期儲存格（`XLSX.read` 加上 `cellDates: true` 後多半會給 JS `Date`，仍保留數字序列值的備援轉換）四種常見寫法，轉不出來的入社日期會在匯入預覽前跳出警告列出社友姓名、該筆入社日期留空、但其他欄位仍照常匯入（不會像以前一樣整批卡住）。`RosterExcelRow['入社日期']` 型別從 `string` 放寬成 `string | number | Date` 反映 SheetJS 實際可能回傳的型態。已用 node 手動驗證 `parseJoinDate` 對西元/民國/中文/Date物件/Excel序列值等案例都轉換正確；`vue-tsc --noEmit`＋`npm run build` 皆通過。

> **待使用者：** 沒有 migration、沒有動資料庫欄位，純前端邏輯改動。請實際用一份含「奇怪格式」入社日期的 Excel（例如民國年 `113/7/1`、中文「113年7月1日」）匯入測試，確認能正確轉成西元日期；也可以順便測一筆真的看不懂的格式（例如純文字「不知道」），確認會跳出警告、該筆入社日期留空但其他資料還是有匯進去，不會整批匯入失敗。

> 最後更新（上一輪）：2026-08-02（第一百五十二輪，**「出席月報」新增「個人補出席」，跟既有「整場補登」互補**）：使用者需求是「出席月報目前只有整個活動的補出席，需要增加個人的補出席功能，用下拉選單選人名後補某一天的出席」。既有 [`quickAddSession`](src/stores/attendance.ts) 只能填整場例會的應出席／實際出席「人次」，沒有逐人明細；新增的 [`makeupMemberAttendance`](src/stores/attendance.ts) 則是針對單一社友、單一日期補一筆 `attendance_details` 狀態（預設「出席」，也可選缺席／請假／免計），對應扶輪「補會」情境（跨社出席其他社例會、或簽到漏登）。關鍵資料完整性判斷：這場例會如果已經有「逐人出席」登記過的完整明細（明細筆數 ≥ 在籍社友數），補這位社友之後會連動重算 `attendance_sessions` 的彙總人次，維持跟 `save()` 一致的統計；如果明細筆數還不到全社人數（多半是走「快速新增」填的整場人次，或只補登過零星幾位），彙總數字維持原樣，避免單一社友的補登去覆蓋別人手動填的整場總數。UI 新增在 [`AttendanceMonthlyView.vue`](src/views/meetings/AttendanceMonthlyView.vue) 「快速新增／補登例會出席」下方，同一頁面加了 `useRosterStore` 抓在籍社友名單。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過（本機沒有 dev server 可跑，純資料庫讀寫邏輯無法離線用瀏覽器實測，靠型別檢查＋建置過關把關）。

> **待使用者：** 這次沒有 migration、沒有新資料表，純前端＋既有資料表的讀寫邏輯，部署後請實際跑一次「個人補出席」：①挑一場已經逐人登記過的例會，補登其中一位社友的狀態，確認出席月報跟「活動」頁該場例會的彙總人次有跟著變動；②挑一個還沒有任何出席資料的日期，補登一位社友，確認不會意外影響其他社友或整場彙總（此時彙總應該維持 0，只有這位社友自己的「個人出席率」會反映這筆記錄）。

> 最後更新（上一輪）：2026-07-29（第一百五十一輪，**依使用者提供的《新手使用指南》比對實際程式碼，修正兩個選單名稱**）：使用者提供一份自己寫好的新手使用指南 Markdown，請求逐項比對實際程式碼是否相符。查證發現三個落差：①指南 FAQ 說登入頁有「忘記密碼？」連結，但 [`LoginView.vue`](src/views/LoginView.vue:14) 現在只有「用扶輪帳號登入」導去外部 RotarySSO OAuth，`ForgotPasswordView.vue`/`ResetPasswordView.vue` 是切換到 RotarySSO 之前的孤兒頁面，登入頁完全沒連過去——**這次沒有動這部分程式碼**，只建議使用者之後決定要修文件還是補產品功能。順便發現 `accounts.ts` 的 `createMember`/`resetMemberPassword`（手機號碼建帳號機制）在前端找不到任何 `signInWithPassword` 呼叫，這批帳號可能沒有登入入口，是獨立於這次任務之外的另一個潛在缺口，記錄下來供之後排查。②③選單標籤跟指南文字對不上：「社的年度成員」指南期待叫「本屆幹部」、「GG案」指南期待叫「國際獎助金案」。「本屆幹部」直接照改（[`TopMenu.vue:141`](src/components/layout/TopMenu.vue:141)、[`OfficersView.vue:384`](src/views/club/OfficersView.vue:384)、[`ClubDetailView.vue:132`](src/views/admin/ClubDetailView.vue:132)），順便發現 [`RosterView.vue:637`](src/views/roster/RosterView.vue:637) 本來就已經在用「本屆幹部」這個詞，這次改名反而讓全站用詞一致。「國際獎助金案」則先跟使用者確認過——GG 在扶輪術語裡是 Global Grant（全球獎助金），[`FeatureFlagsView.vue`](src/views/admin/FeatureFlagsView.vue:30) 原本就已經寫「GG案盤點（全球獎助金）」，指南自己的用詞不夠精確，使用者確認改成「全球獎助金」而非照抄指南——同步改了 [`TopMenu.vue:172`](src/components/layout/TopMenu.vue:172)、[`GgView.vue`](src/views/club/GgView.vue) 全部 6 處使用者看得到的文字、[`FeatureFlagsView.vue:30`](src/views/admin/FeatureFlagsView.vue:30)，`types/index.ts` 裡的 `I1_gg` 型別名稱與註解沒有動（純內部識別碼，不影響使用者）。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。

> **待使用者：** 這次沒有 migration 要跑，純前端文字改動，部署後確認導覽選單「本屆幹部」「全球獎助金」顯示正確、原本的「社友名冊」右下角本來就有的「本屆幹部」欄位沒有受影響即可。另外，指南裡的「忘記密碼」FAQ 跟「GG案」用詞建議一併更新，但那份指南是使用者自己 Downloads 資料夾裡的檔案，不在這個 repo，需要使用者自己決定要不要改。

> 最後更新（上一輪）：2026-07-29（第一百五十輪，**功能操作 SOP 補上「帳號管理：管理本社帳號」章節（純文字，截圖待補）**）：使用者請求「進階設定中管理本社帳號」的操作 SOP，對照 [`docs/sop/PROGRESS.md`](docs/sop/PROGRESS.md) 發現這正是原本就排定的 Task #2（帳號管理：邀請本社帳號、帳號列表、停用/啟用），延續 [`docs/sop/02-功能操作SOP.md`](docs/sop/02-功能操作SOP.md) 既有圖文格式撰寫。這次**改成使用者自行截圖**，不是像文件二前段那樣由 Claude 用 puppeteer 操作正式站——使用者選擇不提供 `sop@gmail.com` 密碼與 Supabase anon key。依照 [`AccountManagementView.vue`](src/views/admin/AccountManagementView.vue) 實際邏輯，寫出社長/執秘視角四個子步驟：①進階設定入口 ②帳號權限授予（邀請已有帳號加入本社）③帳號審核（核准新申請人）④帳號總覽（權限切換/重設密碼/停用啟用/永久刪除），文件內已預留 5 張圖片檔名（`07-advanced-settings-menu.png` 到 `11-account-overview.png`）與插入位置，詳細清單見 `docs/sop/PROGRESS.md` 的 Task #2 更新記錄。**只涵蓋社長/執秘視角**，地區管理員視角的「進階設定」（多了「邀請/管理地區帳號」「SSO 已核准，尚未登入」「社團總覽」）仍是 Task #5，還沒寫，需要先取得地區示範帳號。純文件改動，沒有動任何程式碼，不需要 `vue-tsc`/`build` 驗證。

> **待使用者：** 自行用 `sop@gmail.com`（club_secretary 角色，示範扶輪社）登入正式站，依照 `docs/sop/02-功能操作SOP.md` 第 4 章列出的 5 個步驟截圖，檔名照文件內預留的 `07`~`11` 命名存入 `docs/sop/screenshots/`。第 4 張（`10-account-review-activate.png`，帳號審核清單）如果目前示範社團沒有待審申請人，畫面會是空狀態，可以截這張說明現況，或先用別的帳號申請一筆製造出待審資料再截圖。截圖到位後可以跟使用者確認要不要接著跑 Task #6（重新產出 PDF）。

> 最後更新（上一輪）：2026-07-28（第一百四十九輪，**社友名冊改成完全屬於各社，地區層級不能再看到任何社的名冊明細——待部署**）：延續前幾輪的資安討論（免費方案容量、備份規劃），使用者接著提出更完整的三點顧慮（社友資料資安、系統備份、資料庫容量），逐一討論後聚焦到第一點：**重新定義社友名冊的歸屬**——地區管理員/唯讀都不能再看到任何社的名冊明細（姓名、電話、Email、公司等），這是各社自己的資料，只有該社自己的社友/管理員看得到。

> **查證發現的實際漏洞**：討論過程中查了 `RosterView.vue` 才發現，目前只要是沒有掛在任何社底下的地區帳號（例如純「地區唯讀」）打開「社友名冊」頁面，會直接看到全區 100 個社合併在一起的完整名冊——因為 `roster.fetchAll(auth.clubId)` 在 `auth.clubId` 是空值時不會加任何篩選條件，加上 RLS 本來就放行地區身分看全部。這不是理論風險，是真實存在的路徑，這輪順便補起來。

> **範圍確認**：使用者確認「社友人數」「領域分布」這種不含個人身分的純統計數字，地區視角可以繼續看（不算「名冊」），只有個別社友的明細要擋。

> **[`073_roster_district_isolation.sql`](supabase/migrations/073_roster_district_isolation.sql)**：`roster_select` RLS 拿掉 `is_district_viewer()` 這個地區層級的例外，改成只放行 `club_id = current_club_id()`——地區管理員/唯讀從此對 `roster` 表完全沒有任何列級存取權，不管有沒有帶 club_id 篩選都一樣。地區視角瀏覽「社團總覽→單一社」詳情頁（[`ClubDetailView.vue`](src/views/admin/ClubDetailView.vue)）需要的「社友人數」「領域分布」改用兩支新的 `SECURITY DEFINER` 函式（`club_active_member_count`／`club_classification_breakdown`），資料庫端就算好聚合結果才回傳，前端完全收不到任何一筆個別社友的原始資料；這兩支函式各自驗證呼叫者是 `is_district_viewer()` 或本社自己人才放行，不是無條件公開。

> **檢查過其他呼叫 `roster.fetchAll()` 的地方**（`OfficersView`／`MemberCareView`／`ActivityListView`／`AttendanceView`／`RosterView` 自己）**都是傳 `auth.clubId`（自己的社），不受這次限縮影響，繼續正常運作**——這次改動的範圍精準只影響「地區身分想跨社看名冊」這一條路徑。

> `vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。

> **這輪討論但還沒有做的部分**（供下一輪接續）：
> - 「轉移到其他地區」使用者確認是**複製一套獨立部署**，不是多租戶共用平台，架構上不用大改，但建議之後找時間整理一份「D3481 專屬設定清單」（寫死的地區代碼/種子資料/RotarySSO client/品牌色），方便之後複製時知道要改哪裡。
> - 「檔案一律走 Supabase Storage、還是要不要導入 Google Drive」使用者同意先維持 Supabase Storage，Google Drive 列為之後容量吃緊時的備案，這輪沒有寫進 CLAUDE.md 規則，之後如果要正式定案再補。
> - 地端(NAS)+異地(GitHub)備份的規劃已經討論出具體腳本/workflow 草稿，使用者要先確認做法、還沒要動手實作。

> **待使用者：** 到 SQL Editor 執行 [`073_roster_district_isolation.sql`](supabase/migrations/073_roster_district_isolation.sql)（這台機器連不到 D3481 的 Supabase 專案）。跑完後用一個「地區唯讀」或「地區管理員」帳號測試：①打開「社友名冊」頁面應該完全看不到任何資料（不是看到全部，是看到空的，因為地區帳號本來就不屬於任何社）；②到「社團總覽→點某個社→查看社團資訊」，確認「社友人數」「領域分布」這兩個統計卡還是正常顯示數字，沒有變成 0 或空白；③換一個該社自己的社友/管理員帳號登入，確認自己社的名冊完全不受影響、正常看得到明細。

> 最後更新：2026-07-28（第一百四十八輪，**幹部管理「新增其他主要幹部/委員會成員」加上職位名稱未填提醒**）：使用者截圖 [`OfficersView.vue`](src/views/club/OfficersView.vue) 的「新增其他主要幹部」表單，反映使用者容易先勾選成員才發現忘了填「職位名稱」，希望提醒要先填職位名稱。這個表單其實本來就有防呆（`+ 加入所選成員` 按鈕在 `newPrimaryPositionName` 空白時是 disabled），但只是按鈕變灰、沒有主動說明原因，使用者容易看不懂為什麼按不下去。改法：職位名稱空白時，勾選成員清單上方顯示一段金色提示文字「請先填寫上方的『職位名稱』，才能勾選成員」，同時整組 checkbox 也一起 disabled（灰階降低透明度），逼使用者照順序先填職位名稱再勾人，而不是讓他勾完才發現送不出去。**「新增委員會成員」區塊也是同一套元件結構、同樣的問題，一併套用同一個提示模式**（`newCommitteeName` 空白時提示「請先填寫上方的『委員會名稱』」），新增共用的 `.hint-warn`／`.checkbox-grid-disabled` scoped class。純前端 UI 提示，沒有動到資料驗證邏輯（`addPrimaryOfficers`/`addCommitteeMembers` 本來就已經有防呆，這輪只是把防呆講清楚)。用還原相同結構的靜態頁面驗證：職位名稱空白時提示文字出現、勾選框呈現灰階不可互動；填入文字後提示消失、勾選框跟按鈕都恢復正常。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。

> 最後更新（上一輪）：2026-07-28（第一百四十七輪，**真的修好編輯名冊凍結欄——資料列的 `<td>` 從一開始就沒掛 `col-index`/`col-english`/`col-name` class**）：使用者回報「表頭確實不會動，但第一/第二欄還是會動」，這次不是瀏覽器 rendering bug，是我上上輪自己漏寫的真 bug——[`RosterView.vue`](src/views/roster/RosterView.vue) 的 sticky CSS 是寫給 `td.col-index`/`td.col-english`/`td.col-name` 用的，但資料列的 `<td data-label="項次">`／`<td data-label="英文名稱">`／`<td data-label="中文姓名">` 從第一百四十輪加這個功能時就只顧著幫 `<th>` 表頭補 class，忘記同步幫 `<tbody>` 裡對應的 `<td>` 也加上這三個 class，導致 sticky 規則從頭到尾都只套用在表頭（表頭本身平時是靜止的，看不出差異），資料列從來沒被凍結過，捲動時當然照樣跟著跑。修法很單純：三個 `<td>` 補上 `class="col-index"`／`class="col-english"`／`class="col-name"`（[`RosterView.vue:596-600`](src/views/roster/RosterView.vue:596)）。這次用還原相同 CSS＋markup 的靜態頁面實際捲到最右／往下捲多列，明確看到修好前資料列的項次/英文名稱/中文姓名會被捲走、修好後這三欄在多筆資料列上都確實停在原地不跟著橫向捲動，跟表頭凍結的欄寬完全對齊。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。**這次是純粹的程式碼疏漏，不是瀏覽器差異，往後再幫哪個表格加凍結欄時要記得 `<th>` 跟 `<tbody>` 的 `<td>` 兩邊的 class 都要補，只改一邊很容易忽略因為表頭本身平常就是靜止的，肉眼看不出破功。**

> 最後更新（上一輪）：2026-07-28（第一百四十六輪，**確認凍結表頭截圖是預期行為＋檢查編輯名冊手機版卡片排版，沒有動程式碼**）：使用者傳了一張捲到第 22~30 列的截圖，只看得到「項次／英文名稱／中文姓名」三欄，欄位很窄。確認這其實是第一百四十輪做的「桌面版凍結表頭＋凍結前兩三欄」正常運作中的畫面——`.roster-edit-wrap` 的 sticky 規則只在 `min-width:701px` 以上生效，畫面看到的是凍結後、其餘欄位被捲到看不到的狀態（`.col-name` 右側的陰影分隔線也在截圖裡看得到），代表使用者當下的螢幕寬度是大於 700px 的（例如平板或縮小視窗的桌面瀏覽器），不是手機標準寬度——如果真的是 ≤700px 的手機，會自動改走 `table.card-table` 卡片版型，不會停留在這種窄表格模式。額外主動確認「如果真的是手機，卡片版型好不好用」：用還原相同 CSS＋12 個欄位（含 select／date input／長 email）的靜態頁面在 375px 寬螢幕測試，label:value 上下排列清楚、沒有任何欄位溢出或被裁切，`<input>`／`<select>` 都能正常縮到卡片寬度內（表單元件的最小內容寬度不受文字長度影響，不會觸發 flex 子項被內容撐寬的常見地雷）。結論：兩種情境都沒有問題，這輪純確認，沒有修改任何檔案。

> 最後更新（上一輪）：2026-07-28（第一百四十五輪，**修復編輯名冊表格凍結表頭「破圖」——表頭背景色局部消失**）：使用者截圖回報第一百四十輪做的凍結表頭，捲動後表頭出現「破圖」：項次/英文名稱兩欄還是米色底，中文姓名以後的欄位背景變白色，像是拼接兩種樣式。這是 `position: sticky` 儲存格搭配 table 預設 `border-collapse: collapse` 的已知跨瀏覽器 rendering bug（Safari/Firefox 都有紀錄在案，捲動時部分 sticky 儲存格背景會被判定成透明），本機用 Chrome 反覆重現沒有跑出來（懷疑使用者是用 Safari 或手機瀏覽器），但這是有文件記載的成因，不是憑空猜測。修法：在 [`RosterView.vue`](src/views/roster/RosterView.vue) 的 `.roster-edit-wrap` 內，① `table` 從 `border-collapse: collapse` 改成 `border-collapse: separate; border-spacing: 0`（這張表只有 `border-bottom`，沒有邊框需要 collapse 合併，視覺上不會有變化）；② 凍結欄位的表頭儲存格（`th.col-index/col-english/col-name`）補上原本漏寫、只靠隱含繼承的 `background: var(--gold-p)`，改成每個 sticky 儲存格都自己明講背景色，不依賴瀏覽器對「兩條規則疊加」的渲染順序猜測；③ `.roster-edit-wrap` 加 `isolation: isolate` 讓這個捲動容器自成一個 stacking context，避免外層版面干擾 sticky 儲存格的 z-index 疊圖判斷。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。**待使用者確認**：這是瀏覽器層級的已知修法，但本機沒辦法重現原始破圖現象、也沒有使用者截圖當下的瀏覽器/裝置資訊，麻煩正式站部署後在原本出現破圖的裝置/瀏覽器上再截一次圖確認真的修好，如果同樣現象還在，需要使用者提供瀏覽器種類版本才能進一步排查。

> 最後更新（上一輪）：2026-07-28（第一百四十四輪，**操作紀錄改成真的最多保留 30 天，超過自動清除——待部署**）：延續上一輪（143）「先確認保留7天是不是只是畫面篩選」的討論，使用者接著問「以目前 Supabase 後台規模，如果所有社都上傳資料（含操作紀錄）撐得住嗎」——確認是免費方案（500MB 上限、超過一週無連線會自動暫停、無每日備份）後，我原本擔心的知識庫、自動暫停兩點被使用者指正：知識庫由地區統一維護不是各社自己上傳、全區共用系統不太可能真的一週沒人連線，這兩個風險比我原本判斷的小。**但操作紀錄本身持續累積這件事沒有被反駁**，使用者最後決定：「應該定義，操作紀錄最多就是保留30天而已」——這次是真的要資料庫刪除，不是像上一輪那樣的畫面篩選。

> **[`072_activity_log_retention.sql`](supabase/migrations/072_activity_log_retention.sql)**：`AFTER INSERT` 的 statement-level trigger（`purge_old_activity_log()`），每次 `log_activity()` 寫入後順便清掉 `created_at` 超過 30 天的紀錄。**刻意不用 pg_cron**——要另外啟用 extension，免費方案支不支援不確定，用 trigger 綁在既有的寫入路徑上更保險、不依賴額外的排程機制。`FOR EACH STATEMENT` 而不是 `FOR EACH ROW`：`log_activity()` 一次只插入一筆，语意上這是「維護性掃除」不是「處理這一筆的內容」，用 statement-level 更精確，如果之後有地方改成批次寫入也不會重複觸發清除。**編號原本想接著上一輪的 069，但這次又跟並行 session 推上來的 `069_sso_account_notifications.sql` 撞號**（這個 repo 現在同時有兩個 session 在推進度已經是常態，每次 push 前都要重新 `ls migrations` 確認最新編號)，改成 072（070/071 也已經被對方用掉）。

> **前端同步調整**：[`ActivityLogView.vue`](src/views/admin/ActivityLogView.vue) 拿掉「顯示範圍」下拉選單裡的「全部」選項——30 天以前的資料現在真的會被刪掉，留著這個選項只會讓使用者以為系統留著更久的紀錄、查不到還以為是 bug。文案改成明確講「系統只保留最近 30 天的紀錄，超過會自動清除，請盡量在事情發生後盡快查閱」。[`activityLog.ts`](src/stores/activityLog.ts) 的 `fetchLog()` 註解同步更新，講清楚 `sinceDays` 這個畫面篩選跟資料庫真正的 30 天保留是兩個獨立機制，`sinceDays` 傳大於 30 也查不到已經被清掉的資料。

> `vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。

> **待使用者：** 到 SQL Editor 執行 [`072_activity_log_retention.sql`](supabase/migrations/072_activity_log_retention.sql)（需在 068 之後，跟並行 session 的 069/070/071 系列順序無關，彼此互不影響）。這個 migration 生效後不會馬上看到清除效果（要等超過 30 天的紀錄真的出現才會被清掉），沒有需要特別驗證的操作，正常運作即可。

> 最後更新：2026-07-28（第一百四十三輪，**操作紀錄畫面預設只顯示最近 7 天**）：延續第一百三十六輪新增的「操作紀錄」功能，使用者問「log 紀錄可以保留 7 天嗎」，先確認過使用者要的是**畫面預設篩選**（不是資料庫自動清除，怕真的限制成 7 天保留會跟這個功能本身「事後追查是誰改的」的目的互相衝突——很多問題都是超過一週才被發現）。

> **改法**：[`activityLog.ts`](src/stores/activityLog.ts) 的 `fetchLog()` 新增 `sinceDays` 參數（預設 7），用 `created_at >= now() - sinceDays 天` 過濾，`sinceDays` 傳 `null` 代表不過濾（全部）。[`ActivityLogView.vue`](src/views/admin/ActivityLogView.vue) 新增「顯示範圍」下拉選單（最近 7 天／最近 30 天／全部），預設「最近 7 天」，切換會重新查詢。**資料庫本身完全沒有任何刪除/過期機制**，只是畫面預設篩選，選「全部」隨時查得到最早的紀錄。

> `vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。純前端，不用部署，重新整理頁面就會生效。

> **這輪推送前的狀況**：這個 repo 這幾輪一直有其他並行 session 同時在推送（这次連著推了好幾輪：SSO 帳戶事件通知接收端、名冊表格版面調整、SSO 已核准清單完成狀態與取消等），這次 push 前的 `git fetch` 直接抓到對方最新狀態、沒有衝突，正常疊上去即可，不用像上一輪（136）那樣手動處理 rebase 衝突。

> 最後更新：2026-07-28（第一百四十二輪，**「SSO 已核准，尚未登入」清單補上完成狀態與取消——待部署**）：使用者實測上一輪功能，回報兩個問題：①按下「轉交」後畫面沒有明顯變化，不確定有沒有送出成功；②先前測試留下的記錄（`erichuang@wowcasa.com.tw`，「SSO測試中」那筆）一直卡在清單裡，沒有辦法清掉。

> **[071_sso_pending_dismiss.sql](supabase/migrations/071_sso_pending_dismiss.sql)**：新增 DELETE policy，讓地區管理員可以整筆刪除 `sso_pending_account` 的記錄。刪除這張表是安全的——它只是登入前的暫存資料不是稽核紀錄，之後如果這個人真的登入，查無記錄就會走原本「`club_id` 留空丟進待審核」的正常流程，不會出錯（對應規格文件 7.2 節「孤兒記錄可以刪除」的既有結論，這裡只是提前讓地區管理員手動觸發，不用等 180 天自動清理）。

> **UI**：[AccountManagementView.vue](src/views/admin/AccountManagementView.vue)「SSO 已核准，尚未登入」每一列都新增「取消」按鈕（呼叫新的 `dismissSsoPendingAccount()`，跳 `confirm()` 二次確認再刪除，符合「硬刪除+二次確認」慣例）——不管有沒有指派過都能取消，直接解決卡住的測試記錄問題。指派/轉交成功後，`provisioned_club_id` 有值時會在操作區上方多一行綠色狀態文字「✓ 已完成指派/轉交：OO社（角色／等該社決定角色）」，取代原本只靠按鈕文字從「指派」變「重新指派」這種不明顯的提示。[accounts.ts](src/stores/accounts.ts) 新增 `dismissSsoPendingAccount()`。

> `vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。純資料庫 policy＋前端調整，沒有動到 Edge Function，風險低。

> **待使用者部署：**
> 1. SQL Editor 執行 [071_sso_pending_dismiss.sql](supabase/migrations/071_sso_pending_dismiss.sql)
> 2. 前端照常走 Cloudflare 部署流程

> 部署完成後：先用「取消」把卡住的 `erichuang@wowcasa.com.tw` 測試記錄清掉；之後再測試一次指派/轉交，確認按下後畫面立刻出現綠色「✓ 已完成…」的狀態文字。

> 最後更新（上一輪）：2026-07-28（第一百四十一輪，**SSO 已核准的申請人可在登入前就先指派社別/角色——待部署**）：接續上一輪部署測試，使用者實測發現：即使 SSO 核准、webhook 也正確收到資料，這個人在「帳號審核」還是完全看不到，因為 D3481 只有等對方真的登入過一次才會建立 `user_profiles`。使用者提出明確需求：希望地區管理員能在對方登入之前就先看到 SSO 已核准的申請、先指派好社別/角色，讓對方第一次登入就直接可用，不用再卡一次待審核。

> **確認現況（不用改）**：SSO 帳戶類型是「管理者」的人，登入當下就會自動拿到地區管理員權限（`districtRolePatch`／`handle_new_user()` trigger 本來就會處理），不受 `club_id` 是否為空限制（`isPendingApproval` 明確排除地區管理員）——這部分本來就符合使用者要的效果，這輪沒有改動。缺口只在一般社友／社帳號申請人。

> **[070_sso_pending_provisioning.sql](supabase/migrations/070_sso_pending_provisioning.sql)**：`sso_pending_account` 新增 `provisioned_club_id`／`provisioned_role`（限 club_secretary/club_member）／`provisioned_at`，並開放地區管理員（`is_district_admin()`）直接 UPDATE 這張表（原本只有 service role 能寫）。

> **[sso-login](supabase/functions/sso-login/index.ts)**：case 3（全新帳號）建立時，先查一次 `sso_pending_account`（跟既有 6.1 節區塊共用同一次查詢結果，不重複查），如果地區管理員已經預先指派過：
> - 有指派角色（社帳號申請，地區直接決定）：`club_id`／`role` 都直接帶進 `user_metadata`，登入當下就是完全生效的帳號。
> - 只指派社別、沒指派角色（一般社友申請，只轉交）：`club_id` 帶進去、`requested_role` 設 `club_member`，效果等同現有 `forwardToClub()`，登入後該社仍需要自己按「啟動」決定最終角色——**這是刻意保留的人工關卡，不是漏做**，對應使用者原話「或是直接手動分配到各社由各社進行權限編輯」這條路徑。沒有預先指派的話，維持原本行為（`club_id` 留空丟進待審核）。已預先指派的案子，建立帳號後不再寄「有人在等審核」的信給地區（該做的判斷已經做完）。

> **UI**：[AccountManagementView.vue](src/views/admin/AccountManagementView.vue) 帳號審核上方新增「SSO 已核准，尚未登入」區塊（只有地區視角看得到），列出 `sso_pending_account` 裡 `status='approved'` 但 `user_profiles` 還查不到對應 `sso_sub` 的人。畫面邏輯完全比照既有「帳號審核」的兩種申請類型（`account_type='扶輪社'` 直接選社別＋角色；一般社友只選社別、按「轉交」）；`account_type='管理者'` 的人顯示提示文字、不給操作，因為他們不需要指派社別。[accounts.ts](src/stores/accounts.ts) 新增 `fetchSsoApprovedWaiting()`（查詢後用 `sso_sub` 反查 `user_profiles` 排除已登入過的人，這份清單量體小，前端反向比對即可，不用另開 view）與 `provisionSsoPendingAccount()`。

> `vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。Edge Function 一樣沒有本機 Deno 可以直接跑，這次改動邏輯上是既有 069 輪 6.1 區塊的延伸（只是把套用的時間點從「登入後」提前到「建立帳號當下」），沒有新增外部依賴或簽章相關邏輯，風險相對低；仍待使用者在正式環境用測試帳號走一次「地區先指派 → 測試帳號登入 → 確認直接可用不卡待審核」驗收。

> **待使用者部署：**
> 1. SQL Editor 執行 [070_sso_pending_provisioning.sql](supabase/migrations/070_sso_pending_provisioning.sql)
> 2. 重新部署 `sso-login`：`supabase functions deploy sso-login`（或 Dashboard 貼新程式碼，記得 JWT 驗證開關維持 OFF，這輪没有動這個設定但部署新版程式碼不會自動改回去，之前踩過的雷是「貼程式碼」這個動作本身會重置開關，要留意）
> 3. 前端照常走 Cloudflare 部署流程即可（`AccountManagementView.vue`／`accounts.ts` 純前端改動）

> 部署完成後驗收：先在「帳號審核」上方的「SSO 已核准，尚未登入」找到之前測試的 `erichuang@wowcasa.com.tw`（如果 `sso_pending_account` 裡還在），指派一個社別／角色，再用該帳號登入一次，確認直接進入系統、不會看到「等候審核」畫面。

> 最後更新（上一輪）：2026-07-28（第一百四十輪，**編輯名冊表格加上凍結表頭＋凍結前三欄，捲動只發生在表格內**）：延續上一輪加寬表格後，使用者進一步要求「表格內容超出畫面時用捲軸查看，盡量減少整個畫面移動,同時考量標題固定欄位（表頭固定）以及第一列固定（凍結欄）」。做法比照 Excel 凍結窗格：在 [`RosterView.vue`](src/views/roster/RosterView.vue) 編輯名冊的表格外層多掛 `roster-edit-wrap` class，桌面版（`min-width:701px`，手機走 card-table 版型不受影響）給這個容器設 `max-height: calc(100vh - 320px)` 自己出垂直捲軸，`thead th` 用 `position:sticky; top:0` 固定表頭，`col-index`/`col-english`/`col-name`（項次/英文名稱/中文姓名）三欄用 `position:sticky` 搭配累加的 `left` 值（0/56px/166px，這三欄本來就有寫死的固定寬度，才能精準算出偏移量）凍結在左側，往右捲動時使用者仍看得出「這是哪一列」。因為本機一樣沒有這個專案的 Supabase 存取權限，改用還原相同 CSS＋20 筆假資料的靜態頁面驗證：往下捲動確認表頭列不動、往右捲動確認前三欄不動、且外層工具列全程沒有跟著移動（捲動完全侷限在表格自己的捲軸內）。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。純前端 CSS/class 調整，不需要使用者額外部署步驟。**如果之後其他頁面的表格也遇到同樣「內容太多要捲很遠」的問題，可以比照這個 `roster-edit-wrap` 的寫法（sticky 表頭＋sticky 前幾欄＋容器 max-height）另外接一份，不建議直接把這組規則搬到全站共用的 `.tw`／`table` 樣式，因為不是每個表格都有「項次/英文名稱/中文姓名」這種固定寬度的識別欄位，硬套會需要逐頁調整 left 偏移量。**

> 最後更新（上一輪）：2026-07-28（第一百三十九輪，**社友名冊「編輯名冊」畫面加寬，減少橫向捲動**）：使用者反映編輯名冊時可編輯的表格區域被裁得太窄，欄位要左右滑動才看得到（截圖顯示視窗右側還有大片空白沒用到）。根因是全站共用的 `.page { max-width: 1100px; }`（[`App.vue:319`](src/App.vue:319)）把每一頁的內容寬度都鎖住，但編輯模式的表格（`.roster-table.editing`）需要 1320px 才放得下全部 12 欄。修法：只在「編輯名冊」開啟時（`bulkEditing` 為 true）幫 [`RosterView.vue`](src/views/roster/RosterView.vue) 的 `.page` 根節點多掛一個 `page-wide` class，配一條 `.page.page-wide { max-width: 1360px; }`（用雙 class 選擇器保證優先度贏過全站的 `.page`，不受 CSS 打包順序影響），不動全站其他頁面的 1100px 版型，離開編輯模式會自動變回原本寬度。因為這台機器沒有這個專案的 `.env.local`／Supabase CLI 存取權（沿用先前輪已知的限制），無法完整登入跑真實資料驗證；改用一個還原相同 CSS 規則與表格結構的靜態頁面，在 1500px 寬視窗下截圖比對修法前後——修法後 12 欄（含最後的「狀態」）全部顯示、`.tw` 容器沒有橫向捲軸，修法前確認會被裁掉並出現捲軸。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。**沒有動到任何後端/資料庫，純前端 CSS 調整，不需要使用者額外部署步驟。**

> 最後更新（上一輪）：2026-07-28（第一百三十八輪，**新增 SSO 帳戶事件通知（account.registered/approved/rejected）接收端——待部署**）：延續第一百三十六輪「SSO 審核完成後 D3481 沒有主動通知」的分析，使用者實際跟 RotarySSO 對接、取得規格文件（v1）與共用金鑰／client_id，這輪落地接收端。

> **範圍界定（使用者明確拍板，避免過度延伸）**：①`account.approved` 帶來的「已驗證」扶輪社/地區資料**不**用來自動比對指派 `club_id`——沿用既有人工比對社別流程（`clubMatch.ts` 那套，前後迭代很多輪，不隨便動）；②`account.registered`（申請中、還沒被 SSO 核准）**不**在 D3481 介面上顯示——反正這個人現在還不能完成 OAuth 登入，提前顯示價值有限。這兩點界定了這輪只做「補資訊、標記已驗證」，不碰社別/角色指派邏輯。

> **架構**：新增 [`069_sso_account_notifications.sql`](supabase/migrations/069_sso_account_notifications.sql)：`sso_pending_account`（以 `sso_sub` 為主鍵 upsert，欄位含 status/last_event_id/last_occurred_at/rotary_district/rotary_club/account_type/consumed_at）＋`sso_event_log`（event_id 去重表，兩層去重都比照規格 4.2 節）。`user_profiles` 新增 `sso_verified_at`。兩張新表都不開放 authenticated INSERT/UPDATE，只能透過 service role 寫入，比照 `invite_log`/`activity_log` 既有慣例。

> 新增 Edge Function [`sso-account-webhook`](supabase/functions/sso-account-webhook/index.ts)：HMAC-SHA256 驗簽（timestamp+body，300 秒時間窗，常數時間比較）——用規格 3.4 節三組固定範例離線驗算過，三組簽章逐位元吻合；`client_id` 比對；未知 version/event 回 200 不擋；事件順序依 `occurred_at` 判斷新舊（規格 4.3 節）；`account.approved` 到達時回頭查 `user_profiles`（6.2 節補套）。因為 SSO 端自動重試排程尚未上線、且明確建議下游別回 5xx，這支函式設計成「先落地事件、驗簽通過就處理完直接回 200」，沒有做非同步佇列（目前的寫入都是單純 DB upsert，失敗機率低，暫時不需要更複雜的架構）。

> [`sso-login`](supabase/functions/sso-login/index.ts) 補上 6.1 節邏輯：登入時查 `sso_pending_account`，`status='approved'` 且未套用過（`consumed_at` 為 NULL）就把驗證過的社別/地區/身分別資料覆蓋進 `user_profiles`，標記 `sso_verified_at`。三種既有登入分支（已連結／email 銜接既有帳號／全新帳號）共用同一段，失敗不擋登入（比照既有 `notifyDistrictAdminsOfPendingAccount` 的 try/catch 慣例）。

> **UI**：[`AccountManagementView.vue`](src/views/admin/AccountManagementView.vue)「帳號審核」表格姓名欄，`sso_verified_at` 有值時多顯示一顆綠色「SSO 已核准」徽章（跟既有「社帳號」徽章並排），純粹是資訊提示，不影響任何審核操作本身。

> `vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。Edge Function 本身沒有本機 Deno 可以直接跑（這台機器沒裝 Deno），改用 Node 的 Web Crypto API 重新實作同一段簽章演算法，對規格 3.4 節三組固定範例（registered/approved/rejected）逐一驗算，簽章值完全吻合，確認 HMAC 邏輯正確；業務邏輯（去重/排序/套用）沒有本機環境可以端對端測試，比照這個 repo 一貫的做法交給使用者上真實環境測。

> **待使用者部署（三步驟，缺一不可）：**
> 1. 到 SQL Editor 執行 [`069_sso_account_notifications.sql`](supabase/migrations/069_sso_account_notifications.sql)
> 2. `supabase functions deploy sso-account-webhook --no-verify-jwt`（**一定要加這個旗標**，SSO 呼叫不會帶 Supabase JWT，沒加會被 401 擋掉，比照 `line-webhook` 的既有先例）
> 3. 到 Supabase 專案的 Edge Function 環境變數設定 `ROTARYSSO_WEBHOOK_SECRET`（SSO 端已提供的共用金鑰）與 `ROTARYSSO_CLIENT_ID`（值：`F1z2S113VsnSJE9Xzn8cu`，SSO 端說這個不是機密，可直接放環境變數）
>
> 另外 `sso-login` 這支既有函式這輪也有改動（補 6.1 邏輯），要重新部署：`supabase functions deploy sso-login`

> 部署完成後，接收端網址要提供給 SSO 管理者登記（`https://<專案>.supabase.co/functions/v1/sso-account-webhook`），登記前 SSO 不會送任何通知。登記完成後可以依 SSO 端提供的驗收方式（測試帳號走一次「申請→核准→登入」）確認：①`sso_pending_account` 出現對應列且 `status` 隨事件正確變化；②該測試帳號登入後，「帳號審核」清單的姓名旁出現「SSO 已核准」徽章；③`sso_pending_account.consumed_at` 有被填上。

> 最後更新（上一輪）：2026-07-28（第一百三十七輪，**規劃決策存檔：開放社端資料匯入 API（AI/爬蟲代入名冊）**）：使用者提出「社務平台能不能開放 API 讓其他社透過 AI 自動匯入資料，或抓取資料後填入」。這輪只做架構討論、沒有寫程式碼/migration，決策記錄如下,待使用者下指令才開工。

> **核心原則**：外部/AI 匯入的資料一律不直接寫入正式表（`roster` 等），全部先落地在新的 staging 表,由社管理員/執秘人工核准後才真正寫入——避免 AI 抓錯資料或格式對不上時直接污染正式名冊（現有 `roster` 匯入功能只認固定欄名,格式錯就整批不匯入,見第一百二十九輪；AI 匯入的來源更不可控,需要比現有 Excel 匯入更嚴格的把關）。

> **資料模型草圖（尚未寫成 migration,接續現有 068 之後排 069）**：
> - `club_api_tokens`：`club_id`／`token_hash`（sha256,不存明碼）／`label`／`scopes[]`（先開 `roster:import`）／`created_by`／`expires_at`／`revoked_at`／`last_used_at`,各社自己產生/撤銷,不共用金鑰
> - `import_batches`：`club_id`／`target_table`（v1 只開 `roster`）／`source`（`api`/`ai_scrape`/`csv_upload`）／`submitted_by_token`／`status`（`pending_review`/`approved`/`rejected`/`partially_approved`）
> - `import_items`：`batch_id`／`raw_data` jsonb／`mapped_data` jsonb（對應到 roster 欄位後）／`match_roster_id`（疑似對應到既有社友時指過去）／`action`（`create`/`update`）／`status`（`pending`/`approved`/`rejected`/`merged`）／`issues[]`（驗證出的問題）

> **Edge Function 草圖**：新增 `import-roster`（比照 `invite-user` 的 Bearer token 驗證寫法）,驗證 `club_api_tokens` 未撤銷未過期、有 `roster:import` scope,收一批 raw records 做基本驗證＋姓名/email 模糊比對現有 `roster` 判斷 create/update,**只寫進 `import_items`,絕不直接寫 `roster`**。

> **前端草圖**：新增 `/club/imports` review 頁（逐筆核准/駁回/修改後核准,核准動作走既有 `stores/roster.ts` 的 insert/update,跟手動輸入同一條路徑）＋ `/club/settings/api-tokens` token 管理頁（產生當下明碼只顯示一次）。

> **分期**：Phase 1 名冊匯入、每筆都要人工核准（不管有沒有 issues）→ Phase 2 活動匯入 → Phase 3（選配）社自己設定「零 issues 自動核准」但保留 batch 紀錄可回溯。

> **下一步**：使用者尚未下指令開工,待之後排一輪單獨做（規模比照當初 LINE 通知 demo,2 張表＋1 支 Edge Function＋2 個前端頁面）。

> 最後更新（上一輪）：2026-07-27（第一百三十六輪，**新增「操作紀錄」功能（地區/各社進階設定）——待部署**）：使用者反映 SSO 審核完成後 D3481 沒有主動通知（見上一則的分析：兩系統獨立、只靠使用者回登串接，已整理成交接筆記給 RotarySSO 那邊），順勢提出要在地區/各社「進階設定」加一個操作紀錄，記錄「哪個帳號在何時做了哪些事」。動工前先討論架構，使用者確認：①不要只做帳號相關，行事曆/活動編輯這類也要涵蓋，理由是日後活動被刪除、資料被改掉要查得到是誰做的；②各社只看自己社的紀錄，看不到地區層級操作。

> **架構決策**：一張共用 `activity_log` 表，**不用 trigger 全面盯著每一張表**（工作量巨大要動幾十張表、會把「改個電話」這種瑣碎異動也列進去、trigger 只看得到欄位變化寫不出「核准了謝宗廷的社友申請」這種人看得懂的描述），改在關鍵操作的程式碼裡明確呼叫一個共用的 `log_activity()` RPC（`SECURITY DEFINER`，內部驗證呼叫者能不能宣告這個 `club_id` 範圍——地區層級要求 `is_district_admin()`，指定社範圍要求 `current_club_id()` 或地區管理員，前端沒辦法冒充操作者或宣告別的社）。

> **[`068_activity_log.sql`](supabase/migrations/068_activity_log.sql)**：`activity_log(id, actor_id, actor_name, club_id, action, description, created_at)`，`actor_name` 存快照（帳號之後被刪除還看得懂是誰）。RLS SELECT：`is_district_admin() OR (club_id = current_club_id() AND is_club_tier())`——地區管理員看全部（含地區層級跟所有社），各社只看自己社，`club_id` 是 NULL 的地區層級紀錄天生就不會匹配任何社的 `current_club_id()`，不用額外判斷就自然擋掉。表本身不開放 `authenticated` 直接 INSERT，只能透過 `log_activity()` 這支 RPC 寫入（比照 `invite_log` 既有的「寫入只透過受控管道」慣例）。**編號原本排 067，跟並行 session 這輪推上來的 `067_activity_registrations_club_visibility.sql` 撞號，rebase 時改成 068。**

> **這輪涵蓋的動作範圍**（不是全站所有動作，是這輪優先做的高價值部分）：
> - [`AccountManagementView.vue`](src/views/admin/AccountManagementView.vue)：核准（一般/社帳號）、轉交、啟用/停用、永久刪除、權限變更、地區權限調整、重設密碼——七個函式全部改成先看 `{ error }`、成功才寫 log，順便把幾個函式簽名從 `(id, name)` 改成直接傳整個 `UserProfile`（這樣才拿得到 `club_id` 寫進 log，也讓程式碼更好讀）。**跟並行 session 這輪對同一個檔案的多處修復（發送轉交/授予權限防呆等）自動合併成功，沒有衝突**，rebase 後有重新跑過 `vue-tsc`＋`build` 確認。
> - [`ActivityListView.vue`](src/views/activities/ActivityListView.vue)：活動／例會的新增、編輯、刪除。
> - [`RosterView.vue`](src/views/roster/RosterView.vue)：社友新增、編輯；批次編輯跟 Excel 匯入**各自統計成一筆摘要**（例如「批次編輯社友名冊，共更新 5 筆」），不是一筆一筆記，不然一次匯入 50 人會洗版。
> - [`ClubListView.vue`](src/views/admin/ClubListView.vue)／[`ClubEditView.vue`](src/views/admin/ClubEditView.vue)：社團新增、編輯、刪除（刪除故意記成地區層級 `club_id=null`，因為 `activity_log.club_id` 是 `REFERENCES clubs(id)`，社團都刪掉了不能再指那筆已經不存在的 `club_id`，會撞 FK 違規）。
> - [`OfficersView.vue`](src/views/club/OfficersView.vue)：本社歷程的幹部整批儲存，同樣統計成一筆摘要——**跟並行 session 這輪新增的「+ 新增年度」功能也自動合併成功**。

> **這輪刻意沒做的部分**：地區行事曆（`district_calendar_events`）完全是外部同步寫入（[`sync-district-calendar`](supabase/functions/sync-district-calendar/index.ts)），沒有任何使用者可編輯的路徑，這輪沒有東西可記，不是漏掉。其他還沒涵蓋到的功能（公告、GG案、總監獎項、知識庫等）之後有需要再個別加，模式已經確立（在對應 View 的成功分支後呼叫 `activityLog.log(action, description, clubId)` 即可）。

> **UI**：新增 [`ActivityLogView.vue`](src/views/admin/ActivityLogView.vue)（路由 `/club/activity-log`，跟 `/club/invite` 一樣單一元件同時服務地區跟各社視角），放進地區跟各社的「進階設定」選單。查詢範圍在 `fetchLog()` 這層就限定（地區傳 null 看全部，各社傳 `auth.clubId`），跟既有 `accounts`/`invites` store 的既有慣例一致，不只靠畫面過濾。只保留最近 200 筆，沒有做分頁/篩選（v1 先求有，之後真的紀錄量大再加）。

> `vue-tsc --noEmit`＋`npm run build` 皆已驗證通過（rebase 到並行 session 的最新程式碼之後重新跑過一次）。

> **待使用者：** 到 SQL Editor 執行 [`068_activity_log.sql`](supabase/migrations/068_activity_log.sql)（這台機器連不到 D3481 的 Supabase 專案，**注意編號是 068 不是 067**，067 這次被並行 session 的 `067_activity_registrations_club_visibility.sql` 用掉了）。跑完後測幾個動作（核准帳號、編輯社友、新增活動），確認「操作紀錄」頁面有正確出現對應的中文描述，且切到各社視角看不到地區層級的紀錄。

> 最後更新（上一輪）：2026-07-27（第一百三十五輪，**社的歷程、友好社新增匯出 Excel**）：使用者要求這兩頁比照其他頁面加上匯出功能，方便各社自己備份資料。沿用 [`IouView.vue`](src/views/club/IouView.vue) 既有的 xlsx（SheetJS）匯出寫法，前端直接用畫面上已載入的資料組表下載，不用另外打 API；比照該頁的既有慣例，匯出按鈕**不綁 `canManage`**，任何看得到頁面的人（含一般社友，這兩頁本來就對三種角色都開放檢視）都能匯出備份，只有新增/編輯/刪除才需要編輯權限。[`ClubHistoryView.vue`](src/views/club/ClubHistoryView.vue) 匯出年份/社長/重要記事，檔名帶社名（例如「台北市和平扶輪社的歷程.xlsx」）；[`SisterClubsView.vue`](src/views/club/SisterClubsView.vue) 匯出社名/結盟時間/當屆社長/兩社情誼說明，結盟時間沿用畫面上的日期格式化函式，不是原始 ISO 字串。本機瀏覽器用假資料驗證過兩頁的匯出按鈕都能正常觸發下載、主控台無錯誤。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過，純前端功能，不需要新 migration。

> 最後更新（上一輪）：2026-07-27（第一百三十四輪，**一般社友可看潛在社友選單 + 社的年度成員可新增年度**）：使用者提出兩個修改需求。① 「社的成員」下拉選單裡的「潛在社友」原本用 `auth.role !== 'club_member'` 擋掉一般社友，但查證 [`010_role_permissions.sql`](supabase/migrations/010_role_permissions.sql) 才發現 `club_member` 對 `prospective_members` 本來就已經開放 view+edit 權限（註解寫「沿用既有可編輯權限」），純粹是 [`TopMenu.vue`](src/components/layout/TopMenu.vue) 選單漏開，拿掉這條多餘的角色限制即可，底層權限完全不用動。② 「社的年度成員」原本只能在既有年度（有幹部紀錄的）跟本年度之間切換，沒辦法回頭補歷史年度或預先建立下一年度。年度本來就不是獨立資料表，只是 [`club_officers.year_term`](src/stores/officers.ts) 這欄的自由文字值，「新增年度」因此不用寫任何資料——[`OfficersView.vue`](src/views/club/OfficersView.vue) 新增一顆「+ 新增年度」按鈕（`canManage` 才顯示），跳出輸入框讓使用者填年度（格式驗證＋防重複），確認後直接切換過去顯示空白幹部名單，使用者透過既有的「編輯年度成員」存下第一筆資料就會正式產生這個年度；預設顯示維持本年度不變，符合使用者「預設顯示都是當年度就好」的要求。本機瀏覽器驗證過：一般社友帳號選單正確看到「潛在社友」；「+ 新增年度」輸入 2027-2028 後正確切換並顯示空白表單，格式錯誤（如「2027」）跟重複年度都有擋下並跳出對應提示。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過，純前端功能，不需要新 migration。

> 最後更新（上一輪）：2026-07-27（第一百三十三輪，**修復：地區「發送」轉交後，該筆申請不該還留在地區自己的待審清單**）：使用者實測上一輪的修復，回報「還是一樣」——在地區介面選好社別之後，還是會直接出現角色選單（一般社友／各社管理員），按下啟動後直接進入該社成員，不會再讓各社管理員審核。追查發現上一輪修的是「啟動前不該有存取權限」，這輪踩到的是更前面一步：`forwardToClub()` 轉交（設定 `club_id`＋`requested_role='club_member'`）之後，**這筆申請其實還是留在地區自己的「帳號審核」清單裡**——因為 [`fetchPending()`](src/stores/accounts.ts) 給地區用的查詢條件是 `requested_role.not.is.null OR club_id.is.null`，轉交後這筆資料 `club_id` 有值、`requested_role` 也有值，兩個條件都符合，所以**地區跟收到轉交的那個社兩邊都看得到、兩邊都有「啟動」按鈕**；只是因為 `club_id` 已經有值，地區畫面上的操作介面從「選社別＋發送」自動切換成「選角色＋啟動」（跟該社看到的操作介面一樣），地區可以直接在自己的畫面上把人啟動掉，完全繞過該社的審核，「發送」形同虛設。**修法**：地區的查詢條件簡化成只看 `club_id IS NULL`——已經轉交出去、`club_id` 有值的申請，責任已經完全轉移給收到轉交的那個社，地區不該再看到、也不該還能啟動；`fetchPendingCount()` 的地區導覽列徽章數字同步修正，避免地區看到不該算進自己待辦的筆數。該社自己的查詢（`club_id = 自己` AND `requested_role` 有值）完全不受影響，本來就是對的。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過；這是純 Supabase 查詢條件修正，沒有對應的前端畫面邏輯可以在本機用假資料重現/驗證（供應資料的來源就是這段查詢字串本身），**待使用者上正式站實測**：地區對一筆社友申請按「發送」後，確認這筆立刻從地區自己的「帳號審核」清單消失（且地區導覽列的紅色數字要跟著減少），只出現在收到轉交那個社自己的「帳號審核」清單，地區這邊不應該再看到任何操作按鈕。

> 最後更新（上一輪）：2026-07-27（第一百三十二輪，**修復：地區「發送」給某社的申請人，該社按「啟動」前不該有完整存取權限**）：延續上一輪的帳號審核情境釐清，使用者逐條走過整個 SSO 帳號申請流程（社帳號申請/社友申請/地區歸檔/各社審核），確認前四段都符合設計，**但指出第四段實際上沒有真的做到**：「地區介面收到申請時，按下發送，其實是會直接審核，該社友是會直接成為已經審核名單在各社資料內」。追查發現 [`forwardToClub()`](src/stores/accounts.ts) 只指派 `club_id`、故意不動 `role`（維持預設的 `club_member`），但 [`auth.ts`](src/stores/auth.ts) 的 `isPendingApproval` 只看 `club_id` 是否為空，沒有把 `requested_role`（`fetchPending()`/`activatePending()` 用來判斷「還沒審完」的同一個欄位）納入考量——`club_id` 一旦有值就視同審核完成，該社的「帳號審核」變成純裝飾：申請人在該社按「啟動」之前，其實已經能用完整的一般社友權限登入使用，帳號總覽（`fetchMembers()`）也已經把他當正式成員列出，完全沒有真正卡在「等貴社決定」這一關。**這個 bug 不影響「社帳號」申請**（`activateClubApplication()` 是地區一步到位設定好 `club_id`＋`role`，`requested_role` 全程維持 NULL，沒有這個中間曝露的空窗期），只有「社友」申請經過「發送」轉交這條路徑會踩到。**修法**：`isPendingApproval` 改成 `club_id` 為空「或」`requested_role` 有值都算待審核，跟既有判斷邏輯共用同一組事實來源；[`fetchMembers()`](src/stores/accounts.ts) 排除 `requested_role` 有值的人，不會在該社按「啟動」前就先出現在帳號總覽；[`PendingApprovalView.vue`](src/views/PendingApprovalView.vue) 的等待畫面文案依 `club_id` 是否已指派分兩種說法（等地區指派 vs 等貴社確認權限）。本機瀏覽器灌假資料驗證過：轉交後、啟動前的帳號正確被擋在待審核畫面並顯示新文案；清空 `requested_role`（模擬按下啟動）後恢復正常存取，儀表板/首次登入導覽都正常觸發，沒有影響既有流程。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過，純前端邏輯調整，不需要新 migration、不需要部署 Edge Function。**待複查**：上正式站找一個目前「已轉交但未啟動」狀態的既有帳號（如果有的話）登入確認會被正確擋下，並確認該社「帳號審核」清單按下「啟動」後對方才能真正使用平台。

> 最後更新（上一輪）：2026-07-27（第一百三十一輪，**修復：「授予權限加入本社」對還沒有所屬社別的帳號要明確擋下**）：使用者情境——在後台刪除一個已經授權的舊帳號（`erichuang@wowcasa.com.tw`），改用「邀請已申請 SSO 的帳號加入本社」把對方重新登入產生的全新帳號加進本社，結果對方登入還是顯示「正在等候審核」，而且這筆審核出現在**地區**介面，不是本社。使用者認為「各社介面邀請的人應該直接進各社審核，不該跑到地區」。追查發現不是「審核跑錯地方」的 bug，是**這個功能從設計上就不適用這個情境**：[`invite-user`](supabase/functions/invite-user/index.ts) Edge Function 的 `grant_type === 'club'` 分支只處理「跨社協作」——對方本來就要有自己的 home club（`user_profiles.club_id` 已有值），這裡只是額外寫一筆 `user_club_roles` 授權管理另一社，完全不會去動 `user_profiles.club_id`。使用者的情境是對方剛刪除舊帳號、重新用 SSO 登入產生的是全新待審帳號（`club_id` 是 NULL），呼叫這支函式只會留下一筆永遠生效不了的協作授權——對方 `club_id` 還是 NULL，`isPendingApproval` 判斷式就是看這個欄位，登入當然還是卡在待審核；而且 `club_id` 這欄依 [`033_multi_club_access.sql`](supabase/migrations/033_multi_club_access.sql) 的 `protect_user_profile_privileged_fields` trigger 規定**只有地區管理員能改**，`club_secretary`/`club_admin` 呼叫這支函式本來就沒辦法代為指派社別，不是漏了一個步驟，是這條路線的權限模型本來就走不通（這也解釋了為什麼待審核一定會出現在地區介面：`user_profiles` 的 SELECT policy `profiles_select_club` 要求 `club_id = current_club_id()`，`club_id` 是 NULL 的列各社角色本來就查不到，只有地區管理員的 policy 放行看全部）。**修法**：`invite-user` 偵測到目標帳號 `club_id` 是 NULL 時直接擋下並回傳明確錯誤，說明正確做法是「請地區管理員到帳號審核轉交」；[`AccountManagementView.vue`](src/views/admin/AccountManagementView.vue) 的「帳號權限授予」說明文字也先加一句提醒這個功能只適用「對方已有所屬社別」的情況，避免下次又誤用同一個工具卡住。本機瀏覽器確認過提示文字正確換行顯示，`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。**待使用者：這次改到 Edge Function，需要到 Supabase Dashboard 手動重新部署 `invite-user`**（前端文字改動走 Cloudflare 正常部署流程即可）；部署完成後麻煩幫 `erichuang@wowcasa.com.tw` 這個帳號走正確流程——請他重新用扶輪帳號登入一次（如果還沒有全新待審紀錄的話），到「帳號審核」把他轉交給貴社，之後就能在貴社自己的「帳號審核」清單直接啟動。

> 最後更新（上一輪）：2026-07-27（第一百三十輪，**修復：一般社友看不到活動報名名單**）：使用者用沒有編輯權限的一般社友帳號實測，發現在自己社的活動裡完全看不到報名名單，回報「這個限制沒有必要，應該讓自己社的社友看得到實際報名名單」。追查發現是 RLS 沒跟前端設計對齊：[`ActivityDetailView.vue`](src/views/activities/ActivityDetailView.vue) 從一開始的註解就寫明「報名狀況給所有登入社友看，不只主辦社」，敏感欄位（電話/備註/報名時間/來賓姓名）另外用 `isOrganizer`（`canManage` 且是主辦社）在畫面上擋住——但 [`035_activities.sql`](supabase/migrations/035_activities.sql) 的 `activity_registrations_select` policy 「看得到同社報名紀錄」「主辦社看得到全部報名紀錄」這兩條都多加了 `is_club_tier()`（限 `club_admin`/`club_secretary`）限制，一般 `club_member` 落到只剩 `registrant_id = auth.uid()` 這條，只看得到自己的報名紀錄，導致畫面顯示「尚無人回覆」、報名人數統計也不準確（因為 RLS 濾掉了大部分列）。新增 [`067_activity_registrations_club_visibility.sql`](supabase/migrations/067_activity_registrations_club_visibility.sql) 拿掉這兩條的 `is_club_tier()` 限制，改成任何登入社友都能看到①同社社友的報名紀錄、②本社主辦活動的全部報名紀錄（含跨社報名者，但敏感欄位仍由前端 `isOrganizer` 擋住只有管理員看得到）。純資料庫 RLS 修正，前端完全沒改動（原本的設計就是對的）。`vue-tsc --noEmit` 已驗證通過。**待使用者：到 SQL Editor 執行 067 migration**（需在 066 之後執行），執行後請剛才回報問題的那位一般社友重新整理頁面確認能看到報名名單了。

> 最後更新（上一輪）：2026-07-27（第一百二十九輪，**社友名冊匯入格式對不上時明確跳通知**）：使用者問「其他社用不同格式匯入名冊，系統會怎麼判讀」，我讀了 [`RosterView.vue`](src/views/roster/RosterView.vue) 的 `handleImport` 後回報現況：欄位比對是抓 Excel 第一列的欄名（不是位置），只認範本產生的固定欄名（姓名/英文名/社內職稱/狀態/職稱/職業分類/公司/Email/電話/個人電話/公司電話/入社日期），**姓名是唯一硬性欄位，欄名對不上時原本完全靜默——不會報錯，匯入預覽直接空白，使用者只會覺得「怎麼匯入沒反應」**。使用者確認要修：「一定要跳通知為何讀不到資料」。

> **修法**：`handleImport` 新增三層檢查，全部用 `alert()` 明確告知原因（沒有做成複雜的 UI 元件，符合現有匯入流程用 `alert` 溝通結果的既有慣例）：
> 1. **第一個分頁完全沒有資料列**：如果 Excel 還有其他分頁，一併提示分頁名稱，提醒使用者資料可能放錯分頁。
> 2. **偵測不到「姓名」欄位**（`Object.keys(rows[0])` 不含 `'姓名'`）：**這種情況整份完全不會匯入**（跟原本行為一致，只是現在會說清楚），把偵測到的實際欄位名稱列出來，讓使用者一眼看出自己的範本欄名跟系統要求的差在哪，並提醒可以先「下載範本」比對。
> 3. **姓名欄位存在、但個別資料有問題**：欄名對不上系統認得清單（`ROSTER_EXCEL_HEADERS`）的部分、姓名空白被跳過的列數、檔案內姓名重複只保留第一筆——這三種情況統計後，在匯入預覽視窗打開後跳一次警告，不影響其餘資料正常匯入。

> **沒有動的部分**：不嘗試做「模糊比對欄名」（例如「Name」自動當成「姓名」）——那是完全不同量級的功能（要決定比對規則、可能比對錯、需要使用者二次確認），這輪範圍只到「講清楚哪裡讀不到」，不到「自動修正」。存在既有社友時用姓名字串完全比對決定新增或更新，這輪也沒有動（不在使用者這次提出的問題範圍內）。

> `vue-tsc --noEmit`＋`npm run build` 皆已驗證通過，另外用 Node 直接跑過 `xlsx` 套件驗證三種情境（欄名對不上、姓名空白、姓名重複）解析出來的資料形狀符合預期。純前端，不用部署，重新整理頁面就會生效。

> 最後更新：2026-07-27（第一百二十八輪，**帳號總覽拿掉「手機號碼」欄位**）：[`AccountManagementView.vue`](src/views/admin/AccountManagementView.vue)「帳號總覽」表格拿掉「手機號碼」欄位——全站已改用 RotarySSO 登入，這欄現在恆為「-」（只有舊的手機號碼社員帳號機制才會有值），對這張表沒有實質資訊。「重設密碼」按鈕（`v-if="a.phone"`，只有手機帳號適用）的邏輯沒有動，只是表格不再顯示這一欄。表格欄位數跟著從 6/5（地區/各社視角）縮成 5/4，空狀態的 `colspan` 一起調整。

> `vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。純前端，不用部署，重新整理頁面就會生效。

> 最後更新：2026-07-27（第一百二十七輪，**社團總覽/地區通訊錄的社長資訊改比較 updated_at、兩頁串連**）：使用者要求「地區通訊錄/社團總覽應該都要連動，如果有不同，以最後更新日為最新的資訊為主」，並確認資料庫兩張表都有 `updated_at` 可以比較。

> **修正上一輪的簡化判斷**：上一輪（126）讓社團總覽無條件優先讀 `club_officers`、次選 `clubs.pres_name`，這輪使用者指出不能這樣一刀切——`clubs.pres_name`（「編輯社團」表單）也可能是使用者最後更新資料的地方（例如社長任期中途異動，直接在編輯社團表單改掉，沒有動 `club_officers`），這種情況下 `clubs.pres_name` 才是新的，硬性優先 `club_officers` 反而會顯示舊資料。改成**比較 `clubs.updated_at` 跟對應 `club_officers` 那筆的 `updated_at`，時間新的那筆才是準的**（`pickNewer()`，兩邊都有值才比較時間，只有一邊有值就直接採用那邊，都沒有就是 `null`）。

> **兩頁串連**：抽成共用模組 [`src/lib/clubOfficers.ts`](src/lib/clubOfficers.ts)（`buildOfficersByClub`／`resolveClubLeaders`），[`ClubListView.vue`](src/views/admin/ClubListView.vue)（社團總覽）跟 [`DirectoryView.vue`](src/views/directory/DirectoryView.vue)（地區通訊錄，**這輪第一次接上 `club_officers`**，之前完全沒有連動、只讀靜態欄位）共用同一套判斷邏輯跟同一份 `officers.districtByTerm` 查詢（`officers.ts` 上一輪已加的 `fetchDistrictYearTerm`），確保兩個頁面看到的社長/執秘資料完全一致，不會一邊新一邊舊。地區通訊錄的卡片顯示、搜尋比對、匯出 Excel 都改吃 `enrichedClubs`（已套用 resolve 邏辯的社團清單），不是原始 `club.allClubs`。

> `vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。純前端，不用部署，重新整理頁面就會生效。

> 最後更新：2026-07-27（第一百二十六輪，**社團總覽的社長/執秘改抓當年度 club_officers，不再顯示舊資料**）：使用者問「社團總覽的社長資訊是寫死的還是會抓最新年份」，順藤摸瓜發現這正是已經有人反映過「社長資訊不對」的根因——確認後直接修掉。

> **根因**：[`clubs.pres_name`/`sec_name`](supabase/migrations/001_clubs_auth.sql:19) 是 019/020 輪從 Excel 匯入時期填的靜態文字欄位，只有透過「編輯社團」表單手動改才會變，不會跟著扶輪年度換屆自動更新。系統裡另外有一張真正按年度記錄的 `club_officers`（各社透過「本社歷程」自己維護每屆的社長/社長當選人/副社長/秘書），但社團總覽的「社長」「執秘」欄位從頭到尾都只讀 `clubs` 表那個靜態欄位，跟 `club_officers` 完全沒接上——換屆後只要沒人手動回頭改 `clubs.pres_name`，社團總覽看到的就是舊社長。

> **修法**：[`officers.ts`](src/stores/officers.ts) 新增 `fetchDistrictYearTerm(yearTerm)`，一次撈全地區當年度（`currentYearTerm()`，扶輪年度以 7 月切）所有社的 `club_officers`（RLS 本來就放行 `is_district_viewer()` 看全部，不用逐社查）。[`ClubListView.vue`](src/views/admin/ClubListView.vue) 新增 `currentOfficersByClub` computed 依 `club_id` 分組出每社當年度的 `president`/`secretary`，`clubPresName(c)`/`clubSecName(c)` 兩個函式優先回傳這份資料，**沒有當年度資料才 fallback 回 `c.pres_name`/`c.sec_name`**（還沒開始用「本社歷程」功能的社，至少還能看到匯入時的舊資料，不會整欄空白）。

> `vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。純前端，不用部署，重新整理頁面就會生效。

> **順便發現、這輪沒有動的相關落差**：[`DirectoryView.vue`](src/views/directory/DirectoryView.vue)（地區通訊錄）一樣直接讀 `c.pres_name`/`c.sec_name`，有同樣的「換屆後顯示舊社長」問題，這輪使用者只反映社團總覽，沒有動通訊錄，如果那邊也要一起修，之後跟我說一聲。

> 最後更新：2026-07-27（第一百二十五輪，**「申請中的社」KPI 只算社帳號申請，社友申請不算**）：使用者截圖回報上一輪修完後數字還是不對（5 個，含「永福社」這種其實是社友個人申請加入既有社的案例），指出這張 KPI 卡的語意應該是「這個社本身在申請」，不是「有社友想加入的社」。

> **釐清兩種申請的差異**：SSO 帶回來的 `sso_account_type` 分兩種——「扶輪社」＝**社帳號申請**（該社自己的第一個管理帳號在申請，例如「台北老松社」）；「扶輪社友」＝**個人申請**（某人想加入/已加入某個既有社，例如「永福社」的 Cindy Chang）。後者走「發送」轉交給該社自己審，不代表這個社本身在申請什麼，混進「申請中的社」的計數是語意錯誤，不只是資料層面的落差。

> **改法**：[`ClubListView.vue`](src/views/admin/ClubListView.vue) 的 `clubsWithPendingApplications` 改成完全獨立的統計，只算 `sso_account_type === '扶輪社'`（同時仍套用 3481 地區過濾）；`clubAccountSummary` 的 `pending` 欄位跟著簡化回去只收「已經有 `club_id`」的待審（服務每一列真實社團自己的「社友申請」欄位跟展開清單，這個跟 KPI 卡是兩件事，不再共用同一份資料）——上兩輪為了讓 KPI 抓到還沒指派 `club_id` 的申請人而加的「SSO 自稱社別當獨立分組 key」那段邏輯整個拿掉，現在 KPI 直接從 `accounts.pending` 篩出社帳號申請、用 `Set` 去重複顯示名稱，不再依賴 `clubAccountSummary` 這個中介結構。

> `vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。純前端，不用部署，重新整理頁面就會生效。

> 最後更新：2026-07-27（第一百二十四輪，**「申請中的社」KPI 只算 3481 地區**）：使用者接著指出這張 KPI 卡應該只統計 3481 地區的申請人，不該把其他地區也算進去——SSO 是全區共用登入系統，`accounts.pending` 本來就會混到其他地區自稱的申請人（跟這幾輪一直提到的「帳號審核」頁「3481 地區／非 3481 地區」分組是同一個資料來源、同一個判斷條件）。[`ClubListView.vue`](src/views/admin/ClubListView.vue) 的 `clubAccountSummary` 在分組 `accounts.pending` 前先加一道過濾：`(p.sso_rotary_district ?? '').trim() !== '3481'` 就整筆跳過，不分是已經有 `club_id` 還是走 SSO 自稱社別分組那條路，兩種情況都套用同一個地區過濾。

> `vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。純前端，不用部署，重新整理頁面就會生效。

> 最後更新：2026-07-27（第一百二十三輪，**「申請中的社」KPI 改用 SSO 自稱社別直接分組，不再模糊比對**）：上一輪用模糊比對（`suggestClubId`）猜還沒指派 `club_id` 的申請人屬於哪個社，使用者馬上截圖回報同一個「台北老松社」申請案，「選擇社別」下拉根本沒有被自動帶入——代表比對沒中，KPI 卡又漏算了。使用者提出更簡單直接的做法：既然 SSO 資料本身就帶了自稱社別（甚至能判斷是不是「社帳號」申請），社團總覽的計算應該直接抓這個標籤來算，不用比對到既有社。

> **改法**：[`ClubListView.vue`](src/views/admin/ClubListView.vue) 的 `clubAccountSummary` 拿掉 `suggestClubId` 模糊比對，`club_id` 是 NULL 的待審申請人改成直接用 `sso_rotary_club`（trim 過，空值 fallback「未填社別」）當一個獨立的分組 key（例如 `pending:台北老松社`），不嘗試對應到 `club.allClubs` 裡的哪一筆。`clubsWithPendingApplications` 跟著改成直接從整個 `clubAccountSummary` 的 values 裡篩 `pending.length > 0`，不再只篩 `club.allClubs`——這樣才抓得到這些「可能還沒登記過的全新社」。**點 KPI 卡片的行為沒有變**（本來就是導頁到帳號審核讓管理員手動處理，這輪只是把「算」的部分改簡單、改準）。順手把上一輪加的「（未指派，依自稱社別推測）」提示字清掉——新設計下這句話已經不會出現了（真實社的 `pending` 陣列現在只會收到 `club_id` 完全對得上的申請人）。

> [`src/lib/clubMatch.ts`](src/lib/clubMatch.ts) 這個共用模組留著沒刪，`AccountManagementView.vue` 的「帳號審核」表格本身還是用它來預先帶入「選擇社別」下拉的建議值——**那個用途沒問題，因為是「建議值，管理員手動確認/修正再送出」，猜錯了大不了自己選；但拿模糊比對的結果去做「這個社有幾筆待審」的統計數字，猜錯或猜不到就會讓數字本身失真，這是這兩輪換掉的關鍵差異**。

> `vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。純前端，不用部署，重新整理頁面就會生效。

> 最後更新：2026-07-27（第一百二十二輪，**修掉「申請中的社」KPI 卡永遠顯示 0 的落差**）：使用者截圖回報「帳號審核」明明看得到 4 筆待審（3481 地區），但「社團總覽」的「申請中的社」KPI 卡卻是 0。

> **根因**：截圖裡兩筆待審（Cindy Chang、台北老松社）畫面上都還顯示「選擇社別＋發送/啟動」的操作列，代表這兩筆的 `club_id` 都還是 `NULL`——全新 RotarySSO 申請人（不管是個人社友還是社的第一個管理帳號）在地區管理員按下「發送」或「啟動」之前，`club_id` 本來就是空的，只有 `sso_rotary_club`（自稱社別，例如「永福社」）這個未經確認的文字欄位。但 [`ClubListView.vue`](src/views/admin/ClubListView.vue) 的 `clubAccountSummary` 一開始只認已經有 `club_id` 的待審記錄去分組——這正好是最不常見的情況，最常見的「剛登入、還沒指派社別」完全被漏算，KPI 卡因此幾乎永遠是 0，不是這幾輪才壞的，是 KPI 卡從一開始的定義就沒考慮到這個大宗情況。

> **修法**：`club_id` 是 `NULL` 時，比照 [`AccountManagementView.vue`](src/views/admin/AccountManagementView.vue) 待審清單本來就有的「自稱社別模糊比對」邏輯去猜屬於哪個社（去掉「扶輪社／扶輪／社」共同字樣後比對，只有唯一命中才採用，避免同名分社猜錯）。這份比對邏輯原本內嵌在 `AccountManagementView.vue` 裡，這次抽成共用模組 [`src/lib/clubMatch.ts`](src/lib/clubMatch.ts)（`normalizeClubName`／`suggestClubId`），兩個檔案都改成呼叫共用版本——原本兩處各自維護一份幾乎一樣的邏輯，這次順便清掉這個重複，之後要調整比對規則只要改一個地方。展開清單裡用「猜的」歸類的申請人會多一句「（未指派，依自稱社別推測）」，跟已經正式指派 `club_id` 的區分開來，不會讓管理員誤以為這個人已經確定歸屬這個社了。

> `vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。**純前端邏輯，沒有 migration、沒有 Edge Function 改動，不用部署，重新整理頁面就會生效**。

> 最後更新：2026-07-27（第一百二十一輪，**「授予地區工作人員權限」也補記到授權紀錄——待部署**）：上一輪修完「帳號審核」核准落差後，順便提到「地區工作人員」授權也沒被記錄，這輪使用者確認要一起補齊，先討論了架構（不要硬塞進現有 `role` enum、不要另開新 enum 值、也不用做到通用 jsonb log 那麼重），選定「加一個互斥的獨立欄位」。

> **實作**：新增 [`066_invite_log_district_grant.sql`](supabase/migrations/066_invite_log_district_grant.sql)——`invite_log.role` 放寬成可為 NULL，新增 `district_role text CHECK (IN ('view','admin'))`，加一條 `CHECK ((role IS NOT NULL) <> (district_role IS NOT NULL))` 確保每筆紀錄剛好一種授權類型有值。[`invite-user`](supabase/functions/invite-user/index.ts) 的 `grant_type='district'` 分支補上 `invite_log` insert（這裡是單純 insert 到 `invite_log`，不像上一輪那個 update `user_profiles` 會撞到 `protect_user_profile_privileged_fields` trigger，繼续用 `adminClient` 沒問題，不用像上一輪那樣改用 `callerClient`）。[`invites.ts`](src/stores/invites.ts) 的 `InviteLogEntry` 型別跟著改（`role` 變 `UserRole | null`，新增 `district_role`），[`AccountManagementView.vue`](src/views/admin/AccountManagementView.vue) 新增 `districtRoleLabel()`，「授權紀錄」表格的「角色」欄改成 `i.district_role ? districtRoleLabel(...) : roleLabel(i.role!)` 分支顯示「地區工作人員（唯讀/編輯）」。

> `vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。Edge Function 本身沒有本機 Deno 可以型別檢查，比對既有函式（尤其上一輪剛改過的同一支）的寫法確認語法一致。

> **待使用者部署（兩個都要，缺一不可）：**

```bash
supabase functions deploy invite-user
```

> 加上到 SQL Editor 執行 [`066_invite_log_district_grant.sql`](supabase/migrations/066_invite_log_district_grant.sql)（**在上一輪的 `065_log_pending_approval.sql` 之後**，如果那份還沒跑要先跑）。跑完後測一次「帳號權限授予」授予地區工作人員（唯讀或編輯都測一次），確認「授權紀錄」的「角色」欄正確顯示「地區工作人員（唯讀）」/「地區工作人員（編輯）」，「社團」欄顯示「3481地區辦公室」（`clubName(null)` 既有的 fallback，這條路徑 `club_id` 本來就是 NULL，不用另外處理）。

> 最後更新：2026-07-27（第一百二十輪，**修掉「授權紀錄」看不到最新核准的落差——待部署**）：使用者反映帳號管理頁的「授權紀錄」只看得到之前的舊紀錄，最近用「帳號審核」核准的都沒進去。

> **根因**：`invite_log` 這張表原本只在 [`invite-user`](supabase/functions/invite-user/index.ts) Edge Function 的 `grant_type='club'` 分支手動 insert 一筆（113 輪做的「帳號權限授予」功能）。但「帳號審核」表格的核准動作（`accounts.ts` 的 `activatePending()`，`activatePendingAccount()`／`activateClubApplication()` 都呼叫這個）完全是另一條路徑，直接 update `user_profiles.role`，從頭到尾都沒有寫進 `invite_log`——這是最常用的核准入口，卻是最沒被記錄的一個，是本來架構上的落差，不是這幾輪才生成的新 bug。

> **修法**：新增 [`065_log_pending_approval.sql`](supabase/migrations/065_log_pending_approval.sql)，用 trigger 而不是在每個呼叫端各自補寫入邏輯（`activatePendingAccount`／`activateClubApplication` 分散在不同分支，各自加容易漏，這次的落差就是證明）。Trigger 認一個轉換：`OLD.requested_role` 有值、`NEW.requested_role` 被清空——這正是 `activatePending()` 唯一會做的事，不會誤觸「帳號總覽」單純切換權限（`approveRole`，這個路徑 `requested_role` 本來就是 NULL，不會誤判）。`SECURITY DEFINER` 跨 schema 查 `auth.users.email`（沿用 064 輪 `capture_club_notify_email` 一樣的手法）。**只往前生效，不回填歷史**——已經核准過的舊帳號沒有可靠的「核准當下」時間點可以回填（`updated_at` 會被其他操作一起更新，回填會失真，跟使用者說清楚就好，不用假裝補得回來）。

> **待使用者：** 到 SQL Editor 執行 [`065_log_pending_approval.sql`](supabase/migrations/065_log_pending_approval.sql)（這台機器連不到 D3481 的 Supabase 專案，沒辦法自己跑）。跑完後找一筆待審核的申請人核准看看，「授權紀錄」應該馬上多一筆。

> **順便發現、這輪沒有動的相關落差**：上一輪剛修好的「授予地區工作人員權限」（`invite-user` 的 `grant_type='district'` 分支）本身也沒有寫 `invite_log`——這條路徑改的是 `district_role`（view/admin），而 `invite_log.role` 欄位是 `user_role` 這個 enum（`district_admin`/`club_admin`/`club_secretary`/`club_member`），沒有對應「地區唯讀」這個值，直接塞會不準確，需要另外決定怎麼記（例如加一個獨立的 log 表，或是把 `role` 欄位放寬）。使用者這輪沒有反映這個，先不動，等之後真的要用再處理。

> 最後更新：2026-07-27（第一百一十九輪，**社團總覽新增「已通過審核的社」KPI 卡**）：延續上上輪「申請中的社」KPI 卡的需求，使用者這輪要求同步加一張「已通過審核的社」，點下去顯示哪些社通過。[`ClubListView.vue`](src/views/admin/ClubListView.vue) 新增 `approvedClubs` computed（沿用既有「審核狀態」欄位同一套判斷：該社至少一筆啟用中的 `club_secretary`/`club_admin`），第二張 KPI 卡跟第一張並排（`c-green` 邊色），**點擊行為刻意跟第一張不一樣**——「申請中的社」點下去是導頁到帳號審核（因為那個審核動作有專屬頁面可以跳），「已通過審核的社」沒有對應的專屬頁面，改成點卡片原地展開/收合一個列出社名 chip 的清單（`showApprovedClubs` 布林 toggle）。兩張卡跟展開清單都還是包在 `auth.isDistrictAdminView`（沿用第一張卡的權限範圍，沒有另外放寬給地區唯讀角色）。

> `vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。純前端，沒有 migration/Edge Function 改動。同樣沒有實機截圖驗證（這台機器沒有登入憑證）。

> **中途處理過一個額外請求**：使用者要新增一個社「台北集品扶輪社」到第四分區，因為這台機器連不到 D3481 的 Supabase（一貫的老問題），沒有寫程式也沒有動資料庫，只回覆使用者兩個選項——用既有「+ 新增社團」按鈕自己點，或提供對應的 SQL INSERT 語法讓使用者自己到 SQL Editor 貼。**這件事本身沒有留下任何程式碼異動**，純粹是操作指引，這裡記錄一下避免下次接手誤以為漏了什麼待辦。

> 最後更新：2026-07-27（第一百一十八輪，**社團總覽新增搜尋（社名關鍵字＋分區），以利快速查閱**）：[`ClubListView.vue`](src/views/admin/ClubListView.vue) 表格上方新增即時篩選列——文字輸入框比對社名（`includes`，不分大小寫沒特別處理，目前社名都是中文用不到）、下拉選單選分區（選項從既有 `club.allClubs` 動態收集，依 `ZONE_ORDER` 排序），兩者可同時套用。`groupedClubs` computed 改成先篩選 `club.allClubs` 再分組，篩選後完全沒有 hit 的分區不會出現（不用特地顯示「0 社」的空分區）。

> **有篩選時的三個連動細節**：①符合條件的分區自動展開，不受使用者之前手動收合的 `collapsedZones` 狀態影響（不然篩到的社可能剛好在一個被收合的分區裡，畫面上完全看不到，還以為搜尋沒結果）；②篩選時隱藏排序用的上下箭頭（`order-btns`）——這兩顆按鈕是拿「篩選後清單裡的相鄰兩筆」去對調 `sort_order`，如果清單被篩過，畫面上相鄰的兩筆在完整分區順序裡可能根本不相鄰，亂點會把 sort_order 弄亂，所以乾脆篩選中不給點；③找不到符合條件時顯示「找不到符合條件的社團」，跟原本「尚無社團資料」（真的一筆都沒有）分開，避免使用者誤以為系統整個社團資料是空的。

> `vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。純前端 computed／template 邏輯，沒有 Supabase migration、沒有 Edge Function 改動。**這輪一樣沒有實機截圖驗證**——這台機器沒有登入這個系統的 Supabase 帳號憑證，沒辦法實際跑起來測互動，只能驗證型別/建置過關，麻煩使用者自己上站測搜尋＋展開＋清除搜尋的手感。

> 最後更新：2026-07-27（第一百一十七輪，**修掉「授予地區工作人員權限」一律被擋下的 bug——待部署**）：使用者截圖回報「帳號權限授予」填了 Email、選「地區工作人員」、開啟編輯，送出後跳錯誤「沒有權限變更帳號所屬社團或地區權限」，就算操作者本人明明是地區管理員也一樣被擋。

> **根因**：[`invite-user`](supabase/functions/invite-user/index.ts) 的 `grant_type === 'district'` 分支，寫入 `user_profiles.district_role` 用的是 `adminClient`（service role 連線）。保護這個欄位的 `protect_user_profile_privileged_fields` trigger（033 輪最後一次改的版本）靠 `auth.uid()` 判斷操作者是不是地區管理員——**但 service role 連線沒有 `auth.uid()`**（會是 NULL），trigger 內部的 `is_district_admin()` 查 `WHERE id = auth.uid()` 永遠查不到列，一律判定「沒有權限」擋下來。API 層其實已經在前面驗證過呼叫者真的是地區管理員（第 70-72 行），只是最後落地寫入那一步用錯了連線身分，導致這個驗證形同虛設。「加入指定社」（`grant_type: club`）那條路沒有這個問題，因為寫入的是 `user_club_roles` 表，那張表沒有這個 trigger。

> **修法**：把這個特定的 UPDATE 改用 `callerClient`（呼叫者本人的連線）而不是 `adminClient`。資料庫本來就有一條 RLS 政策 `profiles_district_admin_manage`（011 輪）放行地區管理員更新任何一筆 `user_profiles`，改用本人連線後 `auth.uid()` 能正確解析，RLS 政策跟 trigger 都會判斷正確。**沒有動 migration，純粹是 Edge Function 程式碼一行的連線物件換掉**。

> **待使用者部署（唯一需要重新部署的地方）：**

```bash
supabase functions deploy invite-user
```

> 部署後請直接重新測一次原本失敗的操作（Email＋「地區工作人員」＋編輯權限＋授予權限），確認不再跳錯誤、且該帳號真的拿到 `district_role='admin'`。**這台機器的 Supabase CLI 帳號目前連不到這個專案**（`xdwqrgthsxyzclnjlmvy`，`supabase projects list` 只看得到 WOWCasa/AICasa/Homerepair 跟兩個 `Eric Rotary`/`3481Rotary`（皆 INACTIVE、ref 對不上），第八十九輪就發現的老問題，這輪還是一樣，沒辦法自己部署）。

> 最後更新：2026-07-27（第一百一十六輪，**社團總覽新增「申請中的社」KPI 卡，點選跳到帳號審核**——延續上一輪統整表的需求，使用者這輪要求在地區介面的社團總覽加一張互動式 KPI 卡，顯示目前有哪些社正在申請中，點下去直接跳到帳號審核分頁：

> **1. [`ClubListView.vue`](src/views/admin/ClubListView.vue) 頁面頂部新增 KPI 卡**：新增 `clubsWithPendingApplications` computed（沿用上一輪已經有的 `clubAccountSummary`，過濾出 `pending.length > 0` 的社），卡片沿用 `DashboardView.vue` 既有的 `stat-card clickable` 樣式慣例（有申請中時套 `c-gold` 邊色），顯示社數＋社名清單（例如「三義扶輪社、台北圓通社」），沒有申請中時顯示「目前沒有社在申請中」。**卡片只給 `auth.isDistrictAdminView` 顯示，不是 `isDistrictAdminView` 上一輪其他欄位用的 `isDistrictView`**——因為點卡片會導到 `/club/invite`，這條路由 `meta.roles` 只放行地區管理員（`auth.isDistrictAdmin`），地區唯讀角色點了會被 router guard 導回首頁，卡片顯示範圍要跟目的地路由權限一致，不能沿用單純顯示用的 `isDistrictView`。

> **2. 點卡片跳轉到「帳號審核」區塊**：[`AccountManagementView.vue`](src/views/admin/AccountManagementView.vue) 的「帳號審核」`<h2>` 加上 `id="account-review"`，[`router/index.ts`](src/router/index.ts) 新增 `scrollBehavior`（原本完全沒有設定），`to.hash` 有值時捲到該錨點、扣掉頂部固定雙層導覽列高度（`top: 120`，實際 `--topnav-h`(56px)+`--topmenu-h`(50px)=106px，抓 120 留一點呼吸空間）。這是全站第一次加 `scrollBehavior`，之後其他頁面要做「跳到某個區塊」的錨點連結都可以直接沿用，不用再各自處理捲動。

> `vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。**這輪沒有實機截圖驗證**——需要登入 Supabase 真實帳號才能測互動流程，這台機器沒有現成的登入憑證，只能驗證型別/建置過關，跳轉/捲動的實際手感要使用者自己上站測。

> **待使用者：** 上正式站確認①KPI 卡數字/社名跟實際待審清單一致；②點卡片後有正確捲動到「帳號審核」標題，沒有被頂部導覽列蓋住；③用地區唯讀帳號登入確認看不到這張 KPI 卡（本來就進不了 `/club/invite`，卡片顯示範圍要跟著收斂，不然點了會白導回首頁）。

> 最後更新：2026-07-27（第一百一十五輪，**帳號審核依扶輪地區分組＋隱藏尚未啟用的社團/申請職稱欄位**——使用者從 3481 地區管理平台的帳號審核畫面截圖出發，提三項要求：

> **(1)(2) [`AccountManagementView.vue`](src/views/admin/AccountManagementView.vue) 帳號審核清單改成「3481 地區／非 3481 地區」兩區塊**：新增 `pendingGroups` computed，依 `sso_rotary_district === '3481'` 把 `accounts.pending` 分成兩組，各自一個 `<tbody>`，組間插入一列灰底（`var(--bg)`）的分組標題列（社名＋人數），管理員不用逐行比對「扶輪地區」欄位判斷是不是自己地區的申請人。沒有做成可收合（跟 `DashboardView.vue` 的 `zone-row` 展開/收合不同），因為待審清單本來就是要「全部看到才能處理」，收合反而容易漏審。

> **(3) 隱藏「社團」「申請職稱」兩欄**：這兩欄套用 RotarySSO 登入後恆為空值／「尚未指派」，目前對審核沒有實質幫助。連同只被這兩欄使用的 `pendingClubLabel()`／`pendingTitleLabel()`／`TITLE_LABELS` 一起移除（`noUnusedLocals` 會擋，加上這是死碼），不是用 `v-if` 隱藏——**這是我的判斷**：這兩個欄位/函式是清乾淨刪掉而非保留占位，未來如果 SSO 真的開始回傳社別/職稱資料，要重新加欄位+對照表（`TITLE_LABELS` 那份 DG/DS/DA/…職稱代碼表在 git 歷史裡，`git show 9d8fd55~1:src/views/admin/AccountManagementView.vue` 可以挖回來），不是原地保留等資料到位。表格欄位從 7 欄縮成 5 欄（姓名／SSO 自稱社別／地區／身分別／操作），對應 `colspan` 也從 7 改成 5。

> `vue-tsc --noEmit`＋`npm run build` 皆已驗證通過（`AccountManagementView` chunk 14.87kB）。沒有 Supabase migration、沒有 Edge Function 改動，純前端。這輪一樣沒有實機截圖驗證（比照使用者一貫偏好）。

> **(4) 第四項統整表也做完了**：先給架構評估後，使用者當場確認兩個判斷點——①「通過審核」只看官方管理帳號（不含一般社友）；②放進既有 [`ClubListView.vue`](src/views/admin/ClubListView.vue)（社團總覽），不另開新頁。實作：`onMounted` 在 `auth.isDistrictView` 時額外 `setScope(null)` 撈 `accounts.managed`／`pending`／`members`（全地區不分社），新增 `clubAccountSummary` computed 依 `club_id` 分組成 `{approved, officers, members, pending}`；每列新增「審核狀態」徽章（該社至少一筆啟用中的 `club_secretary`/`club_admin` ＝已通過審核）跟「社友申請」按鈕（顯示已核准/待審人數，點開展開一列列出三種身分的姓名 chip）。**兩個新欄位跟展開列都包在 `v-if="auth.isDistrictView"`**，因為 club 端視角（`club_secretary`/`club_member`）本來就進不了 `/admin/clubs` 這條路（router `districtViewer` guard），但地區唯讀身分若切到「本社」視角時 `isDistrictView` 會變 false，這時也不該看到跨社彙整資料。**沒有新增資料表/migration**，純前端 aggregate 既有 store 資料。

> `vue-tsc --noEmit`＋`npm run build` 皆已驗證通過（`ClubListView` chunk 9.41kB）。

> **待使用者：** 上正式站確認①分組邏輯符合預期（尤其如果 `sso_rotary_district` 實際資料格式不是乾淨的 `"3481"` 純數字字串，例如帶了空白或後綴文字，分組會抓不到，跟我說要調整比對方式）；②社團總覽頁的「審核狀態」「社友申請」欄位跟展開清單顯示正確，且切到「本社」視角時這兩欄會消失（不會看到別社資料）。

> **修正**：使用者實測後截圖回報，各社自己的「帳號審核」畫面也套用了「3481地區／非3481地區」分組，但兩區塊都是空的、沒有意義——各社視角的 `accounts.pending` 本來就已經限定是自己社的申請人，全部一定是同一個地區。`pendingGroups` computed 改成只在 `isDistrictAdminView` 時才分組，各社視角回到單一清單、不顯示分組標題列（`git commit f4621ae`）。`vue-tsc`＋`build` 已重新驗證通過。

> 最後更新：2026-07-26（第一百一十四輪，**地區／各社導覽選單依使用者給的精確清單重排＋刪減，社團總覽詳情頁瘦身，「帳號權限授予」開放給各社使用**——使用者這輪直接給出地區、各社（有/無編輯權限）三份完整的選單清單，逐條對照重排：

> **(1) [`TopMenu.vue`](src/components/layout/TopMenu.vue) 地區選單**：改成「儀表板／地區行事曆／地區公告／地區通訊錄／出席月報／社團總覽／總監獎項統整／知識庫／進階設定」，**拿掉「活動」**（原本 `E1_activities`/`B1_meeting_info` 那個連結整個刪除，不是隱藏）。「EDM 產生器」不在清單裡，這輪判斷是**依照給定清單當作完整規格**（不是描述現況），所以也一併拿掉——這點是我的解讀判斷，`B5_edm` flag 預設關閉所以之前也看不到，如果之後想要保留這個入口要另外講。

> **(2) 各社選單分兩版**：有編輯權限（`club_secretary`/`club_admin`）＝「儀表板／出席月報／活動／社內公告／社的成員／本社歷程／地區行事曆／地區通訊錄／總監獎項申請／GG案／知識庫／進階設定」；沒有編輯權限（`club_member`）＝「儀表板／活動／社內公告／社的成員／本社歷程／地區行事曆／地區通訊錄／知識庫」。**「社內公告」這次改成一般社友也看得到**（原本只有 `isClubManager` 才有這條連結，現在拿掉這個限制，兩種身分都會顯示——頁面本身的編輯權限判斷沒有動，只是導覽列多一個入口讓社友能讀）。「IOU」跟 club 版「EDM 產生器」同樣不在清單裡，一併拿掉（原因同上，flag 預設都是關的）。地區行事曆在各社選單裡的位置從原本最上面移到「本社歷程」之後，跟地區選單裡的位置不一樣，是刻意分開處理（各社跟地區原本共用同一段 `F1_district_calendar` push，這輪拆成兩段各自安插在指定位置）。

> **(3) [`ClubDetailView.vue`](src/views/admin/ClubDetailView.vue)（地區視角瀏覽「社團總覽→單一社」的詳情頁）整段刪除四個區塊**：潛在社友、例會管理、已註冊帳號、社員名單（使用者原文「淺在社友」判斷是「潛在社友」的手誤）。保留：頂部四個統計卡（社友人數／出席率／例會時間地點／最後一次例會）、領域分布、社的年度成員、歷月出席月報。連同只被這四塊用到的 script 一起清掉：`prospective`／`meetingsStore` 兩個 store 的引入跟呼叫、`registeredAccounts`／`accountRoleLabel()`／`changeDistrictRole()`、`PROSPECT_STATUS_LABEL`／`PROSPECT_STATUS_BADGE`，連帶 `useAuthStore` 也因為只被「已註冊帳號」那個 `v-if` 用到、拿掉後整個沒用到而移除。`roster` store 保留（社友人數／領域分布還在用 `roster.members`）。

> **(4) 「帳號權限授予」開放給各社有編輯權限的人用**：使用者原話「要可以邀請帳號，將已經有申請SSO的加入到該社並指定是否有權限」——這正好是上一輪（113）新做的「帳號權限授予」（用 Email 查既有 SSO 帳號授權）的地區版，這輪把它也開放給各社。[`invite-user`](supabase/functions/invite-user/index.ts) Edge Function 恢復用 `current_club_id()`/`current_user_role()` 判斷呼叫者是不是 `club_admin`/`club_secretary`（跟 113 輪之前舊版的邏輯類似，但範圍縮小成只放行 `grant_type=club`），**各社只能授權「加入自己目前檢視中的社」，不能幫別的社加人、也不能授予地區工作人員**（`grant_type=district` 明確擋掉非地區管理員）。[`AccountManagementView.vue`](src/views/admin/AccountManagementView.vue) 「帳號權限授予」卡片的 `v-if` 從只給 `isDistrictAdminView` 放寬成 `isDistrictAdminView || isClubTier`，各社視角看到的是簡化版表單（沒有「授權類型」下拉、沒有「所屬社團」選單，只有 Email＋角色檢視/編輯切換），`submitGrant()` 依視角決定 `club_id` 帶 `grantClubId`（地區手選）還是 `auth.clubId`（各社固定自己）。

> `vue-tsc --noEmit`＋`npm run build` 皆已驗證通過（`AccountManagementView` chunk 15.03kB）。這輪一樣沒有實機截圖驗證（比照使用者一貫偏好）。**這輪只有 `invite-user` 這支 Edge Function 有改動，其餘都是前端邏輯**。

> **待使用者：**① 部署 `invite-user`（**這是唯一需要重新部署的 Edge Function**）：

```bash
supabase functions deploy invite-user
```

> ② 上正式站確認三份選單順序跟拿掉的項目符合預期（尤其「社內公告」現在一般社友也看得到，「活動」在地區選單消失、IOU/EDM 產生器在各社選單消失，如果這幾個判斷跟你想的不一樣，跟我說要調整哪個）；③ 用一個各社管理員帳號測「帳號權限授予」，確認只能選自己社、不會出現地區選項，且不能對別的社加人（可以故意用瀏覽器開發者工具改 `club_id` 送出測試，確認後端會擋）。

> 最後更新：2026-07-26（第一百一十三輪，**帳號審核分流「社帳號／社友申請」＋轉交通知信＋「邀請社友」改成「帳號權限授予」（修掉 SSO 上線後沒同步的死路）——這輪範圍很大，拆成幾塊記**：

> **(1) 地區視角也隱藏「新增社員帳號（手機號碼）」**：使用者確認這塊不管地區或各社都不用了，[`AccountManagementView.vue`](src/views/admin/AccountManagementView.vue) 整塊卡片＋相關 script（`memberName`／`memberPhone`／`memberZone`／`memberClubId`／`creatingMember`／`memberError`／`memberSuccess`／`memberZones`／`memberClubsInZone`／`onMemberZoneChange`／`submitCreateMember`／`ZONE_ORDER`／`zoneRank`）整段刪除（不是 v-if 隱藏，這塊確定沒人會再看到）。`accounts.ts` 的 `createMember` 保留不動（沒有其他呼叫端，但功能小、留著風險低，之後真的要用可以直接接）。

> **(2) 帳號審核依「扶輪身分別」分流成兩條路**：使用者發現 RotarySSO 帶回來的 `sso_account_type` 有兩種值——「扶輪社友」（個人申請，例如截圖裡的 dora、黃兆怡）跟「**扶輪社**」（社的官方帳號申請，例如「台北市華樂社」，申請人姓名欄位填的就是社名）。上一輪設計的「發送給該社自己審」流程有個漏洞：如果這筆本身就是該社第一個管理帳號，根本沒有人可以代為審核。修正：新增 `isClubApplication(p)` 判斷 `p.sso_account_type === '扶輪社'`，畫面上該列姓名旁加「社帳號」標籤（`bdg b-n`），這種申請維持「選社別＋選角色（預設鎖定各社管理員）＋一鍵啟動」直接給權限（新函式 `activateClubApplication`，沿用 `accounts.activatePending` 帶 clubId 的一次寫入）；「扶輪社友」個人申請維持上一輪的「選社別＋發送」轉交流程（`forwardPendingToClub`）不變。`pendingRoleChoice()` 的預設值也依申請類型調整（社帳號預設 `club_secretary`，個人預設 `club_member`）。

> **(3) 該社「官方通知信箱」自動捕捉**：使用者想法是「社帳號」核准後，把那個帳號的 Email 記下來，之後轉交社友申請時可以直接寄信通知該社，不用每個社另外設定 Gmail 或收件人。新增 [`064_club_account_notify_email.sql`](supabase/migrations/064_club_account_notify_email.sql)：`clubs` 新增 `account_notify_email` 欄位（**跟公開通訊錄用的既有 `clubs.email` 分開存**，那是社自己編輯給大家看的聯絡信箱，這個是登入帳號本人的 Email，混在一起怕互相蓋掉），新增 `capture_club_notify_email()` trigger，任何流程只要把某帳號的角色變成該社的 `club_secretary`/`club_admin`，就自動從 `auth.users` 撈 email 寫進去——**只在該社還沒記過的時候才寫（只認第一次）**，避免後面換人/降級誤蓋掉正確的聯絡窗口。`user_profiles` 沒存 email，trigger 用 `SECURITY DEFINER` 跨 schema 查，不用開放前端讀 `auth.users`。

> **(4) 「發送」轉交時順便寄信通知該社**：新增 Edge Function [`notify-club-pending-member`](supabase/functions/notify-club-pending-member/index.ts)，`accounts.ts` 的 `forwardToClub()` 在 DB 寫入成功後呼叫（`try/catch` 包起來，寄信失敗完全不影響「發送」本身有沒有成功，該社「進階設定」的紅色徽章才是保底通知）。函式內部依序檢查四個條件（`M1_pending_account_notify` 開關、地區 Gmail 憑證、該社 `account_notify_email`、查得到申請人姓名），**任一沒過就靜靜跳過**（回傳 `sent:false` 但仍是 200），不報錯給使用者。這是使用者這輪自己確認過的：轉發信要不要寄，跟地區既有的 `M1` 開關綁在一起（選項 A），不是另外開一個獨立開關。

> **(5) 「邀請社友（Email）」整個改版，順便修掉一個 SSO 上線後沒同步的死路**：使用者發現一個很根本的問題——[`LoginView.vue`](src/views/LoginView.vue) 現在只剩「用扶輪帳號登入」按鈕，完全沒有密碼登入表單了，但原本的「邀請社友（Email）」對「還沒有帳號的 Email」這個分支，是呼叫 Supabase 內建 `inviteUserByEmail` 寄信叫對方去 [`/accept-invite`](src/views/AcceptInviteView.vue) **設定密碼**，設完密碼還跟使用者說「請用新密碼重新登入」——但 `/login` 早就沒有密碼登入表單了，這個人設完密碼根本無路可回，帳號建了卻永遠登不進去。這是 051 輪 SSO 上線時沒同步修掉的死角，不是操作問題。**改法**：整個功能定位從「幫對方建立新帳號」改成「幫一個已經自己用 SSO 登入過的既有帳號，額外授予權限」——[`invite-user`](supabase/functions/invite-user/index.ts) Edge Function 整支重寫，拿掉 `inviteUserByEmail` 那個死路分支，只保留「用 Email 查既有帳號」（`find_user_id_by_email`，查不到就直接報錯「請先請對方登入本平台一次」，不再建立任何新帳號），依 `grant_type` 分兩種：`district`（更新 `user_profiles.district_role`，即「地區工作人員」）或 `club`（`user_club_roles` upsert，即「加入指定社的介面」，等同原本「跨社協作」那個分支，邏輯沒變）。**呼叫端也限縮成只有地區管理員能用**（拿掉原本 `isClubTier` 那條分支——現在這塊 UI 本來就只有地區視角看得到）。[`invites.ts`](src/stores/invites.ts) 的 `inviteUser()` 改名 `grantAccess()`，接受 `GrantPayload` 判別聯集。[`AccountManagementView.vue`](src/views/admin/AccountManagementView.vue) 「帳號邀請」卡片改名「帳號權限授予」，表單改成 Email＋「授權類型」下拉（加入指定社／地區工作人員）＋依類型切換的欄位（社團＋角色，或地區權限）；「邀請紀錄」改名「授權紀錄」，拿掉「接受時間」欄位（因為授權現在一律即時生效，不再有「待接受」這個狀態）。**`AcceptInviteView.vue` 現在完全沒有任何程式碼路徑會連到它了（純孤兒頁面），這輪沒有動它，之後有空可以整個刪掉。**

> `vue-tsc --noEmit`＋`npm run build` 皆已驗證通過（`AccountManagementView` chunk 進一步降到 14.42kB）。Edge Function 本身沒有本機 Deno 可以型別檢查，比對既有函式的成熟寫法確認語法。這輪一樣沒有實機截圖驗證（比照使用者一貫偏好）。

> **待使用者：**① 到 SQL Editor 執行 [`064_club_account_notify_email.sql`](supabase/migrations/064_club_account_notify_email.sql)（需在 063 之後）；② 部署三支有改動/新增的 Edge Function：

```bash
supabase functions deploy invite-user
supabase functions deploy notify-club-pending-member
```

> （`sso-login`／`send-district-test-email` 是上上輪的，如果那時候已經部署過就不用重複）；③ 上正式站測「帳號權限授予」新表單（用一個已經登入過的既有帳號 Email 測「加入指定社」跟「地區工作人員」兩種）；④ 找一筆「扶輪身分別＝扶輪社」的待審申請，確認畫面上有「社帳號」標籤、走的是直接啟動而不是發送；核准後可以去 `clubs` 表確認該社 `account_notify_email` 有沒有被寫入；⑤ 開 `M1_pending_account_notify` 的狀態下，用「扶輪社友」類型的申請測「發送」，確認該社 `account_notify_email` 有收到通知信（沒收到的話多半是四個條件裡有一個沒滿足，看 Edge Function log 的 `reason` 欄位）。

> 最後更新：2026-07-24（第一百一十二輪，**各社帳號管理頁收斂成純「管理」頁面：拿掉自助邀請/建帳號/跨社協作三塊，選單文案跟著改**——使用者要求各社視角的「帳號管理」不要再讓社端自己邀請新帳號/建社員帳號，只保留管理既有帳號（跟現在新帳號都改走 RotarySSO + 地區管理員審核的流程一致，社端自助建帳號變成備援管道，容易跟審核流程打架）。[`TopMenu.vue`](src/components/layout/TopMenu.vue) 各社「進階設定」選單文案「邀請 / 管理本社帳號」拿掉「邀請 /」改成「管理本社帳號」（**只改各社這條，地區視角的「邀請 / 管理地區帳號」沒有動**，地區管理員還是要保留邀請/建帳號能力）。[`AccountManagementView.vue`](src/views/admin/AccountManagementView.vue)：①「帳號邀請」整塊（含「邀請社友 Email」卡片＋「新增社員帳號（手機號碼）」卡片＋「邀請紀錄」收合表格）包進 `v-if="isDistrictAdminView"`，各社視角完全看不到，地區視角不受影響、原本功能都還在；②「跨社協作帳號」整塊直接刪除（不是包 v-if 隱藏）——這塊本來就只在 `!isDistrictAdminView`（各社視角）才會顯示，藏起來之後等於永遠不會被渲染，屬於真的死掉的畫面，所以連同已經沒人呼叫的 `toggleCollaboratorPermission()`／`removeCollaborator()` 兩個函式、`loadAccounts()` 裡的 `fetchClubCollaborators()` 呼叫、`submitInvite()` 成功後多餘的那次 `fetchClubCollaborators()` 一起清掉，沒有動 `accounts.ts` store 本身（`fetchClubCollaborators`／`updateCollaboratorRole`／`revokeCollaborator`／`collaborators` 這幾個還留著，只是這個頁面不再呼叫，之後如果地區視角想在別的頁面管理跨社協作可以直接沿用）。各社視角現在剩「帳號審核」（如果有待審核的話）＋「帳號總覽」（既有帳號的重設密碼/停用/刪除/權限切換），符合「管理」定位。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過（build 後 `AccountManagementView` 那個 chunk 從 17.85kB 降到 15.68kB，印證真的刪掉了死程式碼，不只是隱藏）。這輪一樣沒有實機截圖驗證（比照使用者一貫偏好）。**這輪純前端邏輯調整，沒有動資料庫/Edge Function，push 後 Cloudflare Pages 重新部署完就直接生效，不用額外部署步驟。**

> 最後更新：2026-07-24（第一百一十一輪，**簡化新帳號待審核 Email 通知的收件人邏輯：從「所有地區管理員」改成「指定收件人」**——上一輪（110）做完後使用者立刻澄清：不用發給系統動態判斷出來的「所有地區權限＝編輯」的人，只要用地區的 Gmail 發給**自己指定的收件人**就好，不用系統幫忙判斷誰是地區管理員。改法比原本簡單：新增 [`063_district_pending_notify_specific_recipient.sql`](supabase/migrations/063_district_pending_notify_specific_recipient.sql)，`DROP FUNCTION district_admin_emails()`（110 輪新增、這輪就不用了，直接砍掉不留死程式碼），`district_notification_channel` 新增 `notify_to` 欄位（逗號分隔的 Email 清單，地區管理員自己在設定頁填）。前端 [`districtNotify.ts`](src/stores/districtNotify.ts) 的 `saveChannel()` 多一個 `notifyTo` 參數，[`PendingAccountNotifyView.vue`](src/views/admin/PendingAccountNotifyView.vue) 表單新增「通知收件人」欄位（例如 `ds@example.com, da@example.com`），跟 Gmail 帳號/應用程式密碼一起存、一起是必填才能儲存。[`sso-login/index.ts`](supabase/functions/sso-login/index.ts) 的 `notifyDistrictAdminsOfPendingAccount()` 拿掉 `adminClient.rpc('district_admin_emails')`，改成直接讀 `channel.notify_to`、用逗號切開＋簡單 Email 格式驗證（跟 `notify-meeting-created` 手動收件人那段用同一個 `EMAIL_RE`）當收件清單，三個條件（flag 開啟＋Gmail 憑證＋`notify_to` 有值）缺一個都不寄，一樣整段包 try/catch 不擋登入。`send-district-test-email` 沒有動（測試信本來就是使用者自己在畫面上填收件人，不受這次改動影響）。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過，這輪也沒有實機截圖驗證（比照使用者一貫偏好）。**待使用者：**如果上一輪的 `062` 已經在 SQL Editor 執行過，這輪只要再補執行 `063_district_pending_notify_specific_recipient.sql` 就好；如果 `062` 還沒執行，兩份依序（062 → 063）一起執行即可。因為 `sso-login` 這次又有改動，**務必重新 `supabase functions deploy sso-login`**，否則收件人邏輯不會生效。設定頁記得把「通知收件人」欄位也填上（不填的話存不了，跟 Gmail 帳密一樣是必填）。**

> 最後更新：2026-07-24（第一百一十輪，**新帳號待審核 Email 通知（比照例會通知，用 Gmail 寄信）**——延續上一輪的「選單掛徽章」，使用者這輪明確要求「比照活動通知的方式，透過 Gmail 發信」，也就是要跟 [`notify-meeting-created`](supabase/functions/notify-meeting-created/index.ts) 一樣的模式：地區自己申請一組 Gmail + 應用程式密碼寄信，不集中用單一交易型郵件服務。這是地區層級的通知（收件人是所有「地區權限＝編輯」的帳號），不是哪個社的事，不能沿用 `club_notification_channels`（`club_id` 是 NOT NULL 外鍵指到 `clubs`，沒有一列代表「地區辦公室」）。新增 [`062_district_pending_account_notify.sql`](supabase/migrations/062_district_pending_account_notify.sql)：單列表 `district_notification_channel` 存地區共用的 Gmail 帳密（RLS 限地區管理員讀寫），新增 feature flag `M1_pending_account_notify`（**預設關閉**，比照 J1/K1 慣例，地區管理員要自己到「功能開關管理」評估打開，避免 Gmail 帳密還沒設定好就誤觸發送），新增 `district_admin_emails()` SECURITY DEFINER function（比照既有 `find_user_id_by_email`，只給 `service_role` 執行，查詢通知收件人清單，因為 `user_profiles` 沒有存 email，在 `auth.users`）。前端新增 [`districtNotify.ts`](src/stores/districtNotify.ts) store 跟 [`PendingAccountNotifyView.vue`](src/views/admin/PendingAccountNotifyView.vue)（路由 `/admin/pending-notify`，`role: district_admin`，設定頁本身**沒有**用 feature meta 擋，比照 `/club/email-notify` 的既有慣例——不然會卡雞生蛋問題：flag 沒開就看不到設定頁，永遠沒辦法先設定好 Gmail 帳密再開 flag），[`TopMenu.vue`](src/components/layout/TopMenu.vue) 進階設定選單新增入口（受 `M1` flag 控制顯示，標「測試中」）。新增 Edge Function [`send-district-test-email`](supabase/functions/send-district-test-email/index.ts)（比照 `send-test-email`，只是驗證呼叫者要是地區管理員，不是各社管理員）。**實際觸發點**：[`sso-login/index.ts`](supabase/functions/sso-login/index.ts) 的「全新帳號」分支（`case 3`，`club_id` 一律留空那個分支）新增 `notifyDistrictAdminsOfPendingAccount()`，建立新帳號成功後檢查 flag/Gmail 憑證都有設定才寄信，內容附申請人姓名/Email/SSO 自稱社別/扶輪地區/身分別＋一個連到「帳號管理」頁的連結；**整段包在 try/catch，寄信失敗（沒開 flag、沒設定憑證、SMTP 出錯）都不會擋到使用者本人的登入流程**，只會在 log 留一筆。denomailer 的 Subject/內文編碼 bug 修正函式（`encodeSubjectHeader`/`quotedPrintableEncodeBody`）比照這個專案一貫做法直接複製一份到 `sso-login`/`send-district-test-email`（沒有 `_shared` 資料夾，Edge Function 各自獨立部署）。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過；Edge Function 本身沒有本機 Deno 可以型別檢查（環境沒裝 `deno`），用既有函式的成熟寫法比對過一遍語法。**這輪一樣沒有實機瀏覽器截圖驗證**（比照使用者一貫偏好）。**待使用者：**① 到 Supabase SQL Editor 執行 `062_district_pending_account_notify.sql`（需在 061 之後執行）；② `supabase functions deploy sso-login`＋`supabase functions deploy send-district-test-email` 部署 Edge Function（`sso-login` 這次有改動，一定要重新部署，不然新帳號還是不會寄信）；③ 上正式站到「進階設定」點「帳號審核 Email 通知設定（測試中）」（**這個入口要先去「功能開關管理」打開 `M1_pending_account_notify` 才會出現**，先開 flag 再去設定頁填 Gmail 帳密其實沒差，因為真正擋寄信的是「flag 開啟＋Gmail 憑證都有」兩個條件都要滿足，缺一個都不會寄，設定頁本身不受 flag 擋），設定一組 Gmail + 應用程式密碼、發測試信確認能寄出；④ 找一個還沒登入過的 RotarySSO 帳號實際登入一次，確認地區管理員的信箱會收到通知信。**

> 最後更新：2026-07-24（第一百零九輪，**帳號審核流程簡化：社別自動建議＋合併成單一「啟動」按鈕，導覽列新增待審人數徽章**——使用者截圖回報「帳號管理」的待審核清單體驗不好：① RotarySSO 首登申請不會主動通知管理員，要自己點進去查才知道有人在等；② 申請人資料裡本來就帶了 SSO 自稱社別（`sso_rotary_club`，例如「忠孝社」），管理員卻還要自己從全社清單裡重新選一次；③ 指派社別、套用角色是兩個分開的下拉選單+按鈕，要按兩次。三點都改了：**(1)** [`AccountManagementView.vue`](src/views/admin/AccountManagementView.vue) 新增 `normalizeClubName()`／`suggestClubId()`，去掉「扶輪社／扶輪／社」共同字樣後跟 `club.allClubs` 比對，**只有唯一命中才自動帶入**（避免同名分社猜錯），待審清單一到就用 `watch(accounts.pending, ...)` 把猜得出來的社別預先填進 `pendingClubChoice`，管理員看到的已經是建議值，不對再自己改。**(2)** [`accounts.ts`](src/stores/accounts.ts) 新增 `activatePending(id, role, clubId?)` 取代原本分開的 `assignClub()`／單獨呼叫 `approveRole()`，一次寫入 `club_id`＋`role`＋清空 `requested_role`；畫面上「指派社別」＋「套用角色」兩個按鈕合併成一顆「啟動」，只有地區視角且尚未指派社別時才需要先選社，其餘情況（已有 `club_id`，或各社管理員視角只審角色）不擋。**(3)** 待審人數看板：`accounts.ts` 新增 `pendingCount` 狀態＋輕量版 `fetchPendingCount()`（只查 count，不撈整包資料），[`TopMenu.vue`](src/components/layout/TopMenu.vue) 掛載時＋每 60 秒輪詢一次，在「進階設定」下拉選單的按鈕本身跟底下的「邀請 / 管理地區帳號｜本社帳號」子項都加上紅色數字徽章（`.tnav-badge`），地區管理員／各社管理員登入後不用點進帳號管理頁就能在導覽列看到「有幾個人在等審核」，不用主動去查。徵詢使用者後選了「選單掛徽章」這個最輕量的方案（不用另外申請 LINE 官方帳號或 Email API，Email/LINE 通知之後有需要再另外討論）。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過；**這輪沒有實機瀏覽器截圖驗證**（比照使用者一貫偏好，push 後由使用者自己重新整理確認，不額外消耗 token 截圖）。**待使用者：上正式站測試 RotarySSO 新帳號申請的完整流程**——確認① 有申請人時「進階設定」按鈕會出現紅色數字徽章；② 待審清單的社別選單是否正確自動帶出建議社別（尤其是簡稱跟正式全名對不太上的社，若猜錯或沒帶出來要人工選，屬預期行為）；③ 按「啟動」後一次到位（社別+角色都套用），該筆從待審清單消失、徽章數字跟著減少。若之後想再加 Email 或 LINE 通知，需要先確認收件人範圍跟要不要做成可關閉的 feature flag。**

> 最後更新：2026-07-24（第一百零八輪，**儀表板「需關懷社友」同時顯示英文名**——使用者截圖回報這個區塊只有中文姓名，看不到英文名，跟社友名冊「中文名（英文名）」的顯示慣例不一致。追查到 `member_attendance_rate` 這個 view 從最早版本開始就只選了 `r.name`，沒有 `r.nick_name`。新增 [`061_member_attendance_rate_nick_name.sql`](supabase/migrations/061_member_attendance_rate_nick_name.sql) 重建這個 view 補上 `member_nick_name` 欄位，[`DashboardView.vue`](src/views/DashboardView.vue) 需關懷社友清單改成有英文名才附加顯示「陳宥豪（David）」，沒有英文名的社友維持原樣不會多出空括號。**這個 view 另外還有 `attendance.ts`/`AttendanceView.vue` 也在用，這輪沒有動那邊**，範圍只做使用者指出的「社友關懷」這個區塊，之後如果那頁也想顯示英文名可以直接沿用同一個 `member_nick_name` 欄位不用再改 view。本機用 `window.__pinia` 灌假 `needsCare` 資料，瀏覽器實測過有/沒有英文名兩種情況都正確顯示，驗證後已還原 `main.ts`/刪除臨時 `.env.local`。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。**待使用者：到 SQL Editor 執行 `061_member_attendance_rate_nick_name.sql`**（需在 060 之後執行），執行後上正式站確認儀表板需關懷社友清單裡，有填英文名的社友會顯示「中文名（英文名）」。

> 最後更新：2026-07-24（第一百零七輪，**知識庫搜尋框上方新增分類快選按鈕**——使用者反映有資料上傳後，搜尋框上方應該自動出現可以選擇的分類，讓使用者不用憑空猜關鍵字。新增 [`knowledgeBase.ts`](src/stores/knowledgeBase.ts) 的 `fetchCategories()`，從實際上傳過的文件動態算出不重複的分類清單（不是寫死的固定清單），[`KnowledgeBaseView.vue`](src/views/knowledge/KnowledgeBaseView.vue) 搜尋框下方比照 `ActivityListView.vue` 既有的 `.segmented`/`.seg-btn` 類別篩選樣式渲染「全部分類」＋各分類按鈕，只在有分類資料時才顯示。點分類按鈕會連同目前輸入的關鍵字一起送出查詢（AND 邏輯），上傳/刪除文件後會重新整理分類清單，避免顯示已經不存在或漏掉新的分類。**順便修了兩個小地雷**：① 刪除文件後原本沒有重新整理列表，畫面上會留著已刪除的項目；② 空結果文案原本只看關鍵字有沒有輸入，選了分類但沒輸入關鍵字時會誤顯示「知識庫目前還沒有文件」，改成關鍵字或分類任一有值都顯示「沒有符合的文件」。本機用 `window.__pinia` 灌假分類/文件資料，瀏覽器實測過分類按鈕正確渲染、點擊後正確高亮並觸發查詢、空結果文案正確切換，驗證後已還原 `main.ts`/刪除臨時 `.env.local`。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。**待使用者：這輪只改了前端邏輯，沒有動資料庫，Cloudflare Pages 會自動重新部署，部署後上傳的文件如果有填分類，重新整理頁面應該就能看到分類快選按鈕出現，點擊能正確篩選。**

> 最後更新：2026-07-24（第一百零六輪，**修復知識庫上傳中文檔名 PDF 會被 Supabase Storage 拒絕的 bug**——使用者部署完第一百零五輪的知識庫 migration 後，實際上傳「4-1.扶輪用語與詞彙_英中對照表.pdf」失敗，錯誤訊息 `Invalid key: ...-4-1.扶輪用語與詞彙_英中對照表.pdf`。查證 [Supabase Storage 原始碼](https://github.com/supabase/storage/blob/master/src/storage/limits.ts)的 `isValidKey()` 確認：Storage 物件 key 只接受 `\w`（純 ASCII 字母數字底線）加上少數符號，中文字元一律不合法——但 [`knowledgeBase.ts`](src/stores/knowledgeBase.ts) 的 `upload()` 原本把 `${uuid}-${file.name}`（含原始中文檔名）整串直接當 Storage 路徑，只要檔名有中文就一定失敗，不是使用者操作錯誤。修法：Storage 路徑改成只用 UUID + 副檔名（純 ASCII），原始檔名維持存在 `file_name` 欄位不變（畫面上顯示的還是完整中文標題，只有後端實際存放路徑跟檔名脫鉤）；`getSignedUrl()` 順便加上可選的 `downloadName` 參數，之後如果要做「強制下載」按鈕，可以透過 signed URL 的 `download` 選項讓瀏覽器存檔時還原成中文檔名，目前「點標題開啟」維持原本的線上閱讀行為（不強制下載）沒有用到這個參數。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。**待使用者：重新上傳那兩份測試 PDF（`扶輪用語與詞彙 英中對照表-20210504F.pdf`、`Rotary Basics 扶輪基礎_社員的參考指南.pdf`），確認這次不會再跳 Invalid key，上傳成功後照第一百零五輪的清單繼續測搜尋跟社友視角權限。**

> 最後更新：2026-07-24（第一百零五輪，**新增地區共用知識庫模組（上傳 PDF、自動抽文字、全文搜尋）**——延續第九十六～九十八輪討論，使用者說有 30-40 份扶輪知識相關 PDF（多數可選取文字，非掃描圖片），想變成平台上可用、未來可搜尋的資料，確認是地區共用不分社。新增 [`060_knowledge_base.sql`](supabase/migrations/060_knowledge_base.sql)（**這輪推送時跟並行 session 的委員會/主要幹部那幾輪撞在一起，對方也用了 059 這個編號（`059_club_officers_primary_role.sql`），這份改成 060 避免檔名混淆**）：`knowledge_articles` 表存標題/分類/標籤/簡介/PDF 抽出來的內文，啟用 `pg_trgm` 擴充功能，標題跟內文欄位建 GIN trigram 索引（中文搜尋用 trigram 比對，比 Postgres 內建全文檢索——主要針對歐洲語言分詞設計——更適合）；RLS 比照既有 `district_announcements` 的模式：所有登入的人都能看，只有地區管理員能新增/編輯/刪除。新增 `knowledge-pdfs` 這個不公開的 Storage bucket 存原始 PDF，一樣只有地區管理員能寫入，登入的人都能透過 signed URL 讀取／下載。新增 `L1_knowledge_base` feature flag，預設關閉。新增 [`pdfjs-dist`](package.json) 套件（選 4.10.38，避免最新 6.x 要求 Node ≥22 跟開發機的 Node 20 衝突），[`src/lib/pdfExtract.ts`](src/lib/pdfExtract.ts) 在瀏覽器端把 PDF 逐頁抽成純文字，上傳時跟著存進資料庫，不用另外手動輸入全文才能被搜到。新增 [`knowledgeBase.ts`](src/stores/knowledgeBase.ts) store（上傳/搜尋/刪除/signed URL）跟 [`KnowledgeBaseView.vue`](src/views/knowledge/KnowledgeBaseView.vue)（搜尋瀏覽頁，地區管理員多一個上傳表單），新路由 `/knowledge-base`，選單位置比照 `H1_directory`（地區通訊錄）放在同一層，地區視角、社端視角都看得到，因為這是跟通訊錄同等級的全地區共用資源，不是塞進「進階設定」裡。**驗證方式比較扎實**：`vue-tsc --noEmit`＋`npm run build` 皆通過，確認 `pdf.worker.min.mjs` 有正確被 Vite 打包成獨立 worker 資源；另外用 Node 直接跑 pdfjs-dist 的 Node-compatible build，實際解析使用者提供的兩份真實 PDF（`扶輪用語與詞彙 英中對照表-20210504F.pdf` 19 頁、`Rotary Basics 扶輪基礎_社員的參考指南.pdf` 44 頁，兩份檔案本身不在這個 repo 裡，路徑在使用者本機 `~/Downloads/5.扶輪知識/`），成功抽出有意義的中英文文字（分別 29,817／16,045 字元），確認抽取邏輯對這兩份真實檔案可行，不是只拿假資料測過。本機用 `window.__pinia` 灌假地區管理員身分＋開啟 feature flag，瀏覽器實測過選單項目、搜尋頁、上傳表單（含所有欄位）都正確渲染、沒有執行期錯誤，驗證後已還原 `main.ts`/刪除臨時 `.env.local`。**這輪沒辦法測到的部分**：沒有真實 `.env.local`，沒辦法測試真正的 Supabase 上傳/搜尋 API 呼叫（bucket、RLS 政策都還沒部署）；這個沙箱瀏覽器測試工具也沒有「選擇檔案」對話框的操作能力，沒辦法真的走一次選檔案→上傳的完整流程——這兩塊要使用者部署後親自測試，包含把那兩份 PDF 實際上傳進去。

> 最後更新（上一輪）：2026-07-23（第一百零四輪，**「主要幹部」拿掉收合，改回跟社長/社長當選人一樣的抬頭+名字直接顯示**——使用者明確否決上上輪的設計方向：社長/社長當選人/副社長/秘書一直都是「抬頭：名字」直接顯示，不用點開；財務/糾察/理事會這些自訂職位也是「年度主要幹部」的一份子，理應比照辦理直接顯示，不需要像委員會一樣收合——**只有委員會因為人數多才需要分組收合**，這是使用者明確劃的界線。實作：[`OfficersView.vue`](src/views/club/OfficersView.vue) 拿掉 `primary_officer` 專用的 `officerExpansion`（`useGroupExpansion` 只留給委員會用）跟「全部展開/收合」按鈕，唯讀畫面把 `primaryOfficerGroups` 改成跟 `SINGLE_ROLES` 同一個直式清單裡的一般 `label + readonly-field` 列，新增 `formatGroupMembers()` 把同一職位底下的人用「、」串起來、有備註的用括號附註（例如「Tommy、Golden（助理）」），一個職位一行，不分組不收合。編輯模式維持不變（本來就是平的草稿表格，只是外層用 `<template v-if="editing">` 包起來跟唯讀清單切開，沒有動編輯邏輯）。委員會成員區塊完全沒動，維持上一輪的分組收合設計。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過，本機灌假資料（財務 2 人含備註「助理」、糾察 2 人、理事會 3 人）確認唯讀畫面每個職位都是一行「職位：姓名、姓名（備註）」直接顯示、不會收合，切到編輯模式草稿表格/新增流程都正常運作，委員會區塊維持原本可收合行為，驗證後已還原 `main.ts`/刪除臨時 `.env.local`。**待使用者：上正式站確認財務/糾察等自訂職位改成直接顯示（不用點開），並比照第一百零三輪的說明，把正式站上那 6 筆被誤合併進「主要幹部」群組的資料逐筆修正委員會/職位名稱欄位。**

> 最後更新（上一輪）：2026-07-23（第一百零三輪，**修正「新增其他主要幹部」欄位不會自動清空導致誤合併的 bug＋協助排查正式站既有資料**——使用者回報正式站畫面出現一個很怪的群組「▾ 主要幹部（6人）」，底下塞了財務/糾察等各種不同職稱的人，排版完全看不懂。追查根因：[`OfficersView.vue`](src/views/club/OfficersView.vue) 的 `addCommitteeMembers()`／`addPrimaryOfficers()` 這兩個「+ 加入所選成員」函式，設計上刻意讓「委員會名稱／職位名稱」欄位在按下加入後**不清空**（方便同一個委員會分批勾選加入不同的人），但這個「貼心」設計反而是個地雷：如果使用者是想分別新增「財務」「糾察」等不同職位，很容易在加完第一筆之後忘記把職位名稱欄位改掉、只改了備註欄位，就會讓後續所有人全部沿用第一次打的職位名稱（正式站上很可能是第一次打了「主要幹部」這個籠統的名稱，之後每個人都忘記改，只改備註）。修法：兩個 `add` 函式在成功加入後，把「委員會名稱／職位名稱」跟「備註」欄位都一併清空（原本只清空勾選格子），逼使用者每次都要重新輸入或從 datalist 重選，加入按鈕也會因為名稱欄位空白而重新變成 disabled，不會讓人不小心沿用舊值。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過，本機模擬「先打財務+Tommy 加入，欄位清空後改打糾察+Tim 加入」，確認兩筆正確落在各自獨立的群組，不會再合併成一組。**這輪沒有辦法修正正式站上既有那 6 筆已經被誤合併的資料**（環境沒有已登入的 Supabase CLI/DB 存取權限）——**待使用者自行到「編輯年度成員」，把那 6 筆「主要幹部」群組底下的資料逐筆修正：把備註欄目前存的財務/糾察等文字改填到「委員會/職位名稱」欄，職位名稱欄目前的「主要幹部」文字清掉或按實際狀況調整，備註欄視情況留白或改填「助理」等細項**，存檔後就會分別變成獨立收合的群組。之後新增自訂職位務必每次都重新確認/重新輸入委員會或職位名稱欄位，不要只改備註。

> 最後更新（上一輪）：2026-07-23（第一百零二輪，**「主要幹部」跟「其他主要幹部」合併成一個區塊＋地區視角大幅收斂顯示範圍**——使用者反映上一輪的排版「非常奇怪」，指出兩個問題：① 社端 [`OfficersView.vue`](src/views/club/OfficersView.vue) 不該把「主要幹部」（社長/社長當選人/副社長/秘書）跟「其他主要幹部」（財務/糾察/理事會等自訂職位）拆成兩個獨立卡片，應該是「幹部一個區塊、委員會一個區塊」，且群組要照名稱排序讓開頭相同的（例如「財務」「財務助理」）排在一起；② 地區管理員在 [`ClubDetailView.vue`](src/views/admin/ClubDetailView.vue)（`/admin/clubs/:id`，「各社」的社團詳情頁）看到的「社的年度成員」跟「社員名單」顯示範圍太大，應該收斂。實作：① `OfficersView.vue` 把「其他主要幹部」整段（標題、展開/收合按鈕、表格、新增表單）搬進「主要幹部」同一張 `.tw` 卡片裡，四個固定欄位在上、自訂職位收合列表在下，`groupByName()` 補上 `.sort((a,b) => a.name.localeCompare(b.name,'zh-Hant'))` 讓群組照名稱排序（委員會/其他主要幹部兩邊都套用，不只幹部）；②「地區視角」明確定義成 `ClubDetailView.vue`（district_admin 專用瀏覽「各社」的頁面，跟社端自己用的 `OfficersView.vue` 是不同頁面/不同路由）——這頁的「社的年度成員」整個拿掉委員會/其他主要幹部的表格，**只留社長/社長當選人/副社長/秘書四個 badge**（連同上一輪誤加的 `primary_officer` 一起移除，因為地區本來就不該看到這些），「社員名單」欄位從 11 欄砍到 6 欄（英文名稱/中文姓名/社內職稱/職業分類/公司/職稱），拿掉個人電話/公司電話/Email/入社日期/狀態，避免地區層級看到不必要的聯繫方式跟社內細節；順手移除因此變成沒用到的 `MEMBER_STATUS_LABEL` 常數。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過，本機用 `window.__pinia` monkeypatch 灌假資料驗證過：① 社端頁面主要幹部卡片內「財務」「財務助理」正確排在一起、跟委員會分開收合；② 切換到 `district_admin` 角色瀏覽 `/admin/clubs/:id` 確認只看得到四個固定幹部、委員會表格完全消失、社員名單只剩 6 欄不含任何聯繫方式，驗證後已還原 `main.ts`/刪除臨時 `.env.local`。**待使用者：上正式站用地區管理員帳號實際瀏覽任一社的「社團資訊」頁，確認委員會資料跟聯繫方式都看不到；社端帳號確認主要幹部卡片排版正確合併。**

> 最後更新（上一輪）：2026-07-23（第一百零一輪，**「主要幹部」也改成可新增自訂職位＋可收合**——使用者反映「主要幹部應該也要像委員會一樣可以新增職位並且收合」。原本「主要幹部」只有社長/社長當選人/副社長/秘書四個寫死的欄位（因為這四個角色會同步寫回 `roster.club_position` 的 P/PE/VP/S 代碼，供名冊頁標示幹部用，特意保留不動，避免影響 [`RosterView.vue`](src/views/roster/RosterView.vue)／[`ClubDetailView.vue`](src/views/admin/ClubDetailView.vue) 既有邏輯），組織表裡的財務/糾察/前屆社長/理事會等職稱完全沒有對應欄位可以填。實作：① `club_officers` 的 `role` 欄位（Postgres enum `club_officer_role`）新增一個值 `primary_officer`（[`059_club_officers_primary_role.sql`](supabase/migrations/059_club_officers_primary_role.sql)，`ALTER TYPE ... ADD VALUE`），跟既有 `committee_member` 共用 `committee_name`（這裡語意是「職位名稱」，例如「財務」「理事會」）＋`note`（細項備註，例如「助理」）兩欄，不用再加新欄位；② [`OfficersView.vue`](src/views/club/OfficersView.vue) 在「主要幹部」卡片下方新增獨立的「其他主要幹部」區塊，UI/互動完全比照上一輪委員會分組（選職位名稱＋勾選格子多選成員一次加入、可收合分組、全部展開/收合按鈕），跟「委員會成員」區塊各自獨立分組互不影響；③ 把重複的分組/展開收合邏輯抽成共用的 `groupByName()`＋`useGroupExpansion()`，儲存邏輯抽成共用的 `saveOfficerGroup(role, drafts, existing)`，委員會跟其他主要幹部兩邊都呼叫同一套，避免程式碼重複兩份；④ 順手把 [`ClubDetailView.vue`](src/views/admin/ClubDetailView.vue) 地區管理員看的「社的年度成員」摘要（唯讀）的委員會清單過濾條件也加上 `primary_officer`，不然新加的自訂職位不會出現在那個摘要頁。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過，本機用 `window.__pinia` monkeypatch store 方法灌假資料（含「理事會」2 人、「財務」1 人+1 位助理），瀏覽器實測過：其他主要幹部區塊正確跟委員會成員區塊分開分組收合、展開財務組時備註「助理」正確顯示、編輯模式勾選多人一次加入「糾察」職位正確新增 2 筆草稿列，驗證後已還原 `main.ts`/刪除臨時 `.env.local`。**待使用者：到 SQL Editor 執行 059 migration**（需在 058 之後執行；`ALTER TYPE ... ADD VALUE` 是輕量操作，不影響既有資料），執行後上正式站實際新增一個自訂職位（例如「理事會」多選幾位社友）確認存檔跟收合顯示正常。

> 最後更新（上一輪）：2026-07-23（第一百輪，**「社的年度成員」委員會分組改成可收合＋年度改成下拉選單可查詢歷史年度**——延續上一輪的委員會分組顯示，使用者反映委員會/人數變多後畫面會拉得很長難以檢視，且希望「今年度輸入的資料自動留存，明年度開始時是另一張新表單，上一年度可以查詢」。實作：① 委員會分組（`zone-row`）加上點擊收合/展開，預設全部收合只看委員會名稱＋人數，旁邊加「全部展開」「全部收合」快速按鈕；② 年度欄位從自由輸入的文字框改成 `<select>` 下拉選單，選項來自 [`officers.ts`](src/stores/officers.ts) 新增的 `fetchYearTerms(clubId)`（查這個社在 `club_officers` 裡實際出現過的所有 `year_term`，去重複由新到舊排序），並保證一定會有「本年度」（`currentYearTerm()` 算出來的當前扶輪年度）這個選項，即使還沒有任何資料也能選進去開始輸入；本年度選項會加註「（本年度）」文字。③「資料自動留存、換年度是新表單」其實不用另外做——`club_officers` 本來就用 `year_term` 分年度儲存，切換下拉選單就是切換查詢/編輯的年度篩選條件，選到還沒有資料的新年度自然顯示空表單，選到舊年度就會秀出當年存的委員會/幹部名單（唯讀查詢，這輪沒有限制歷史年度不能編輯，使用者沒有要求鎖定，維持跟原本一樣「選到哪年就編輯哪年」的行為）。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過，本機用 `window.__pinia`/`window.__router` 灌假 roster/officers 資料（monkeypatch `officers.fetchAll`/`fetchYearTerms`/`roster.fetchAll` 三個 store 方法直接回傳假資料，避開本機沒有真實 Supabase 連線的限制）繞過登入，瀏覽器實測過：年度下拉正確列出「2026-2027（本年度）」＋「2025-2026」兩個選項、預設委員會全部收合顯示人數、點單一委員會標題可單獨展開/收合、「全部展開」正確攤開全部三組並維持主委→副主委排序、切換到歷史年度「2025-2026」正確换成該年度自己的社長／委員會資料（不會跟本年度資料混在一起），驗證後已還原 `main.ts`/刪除臨時 `.env.local`。**待使用者：上正式站實際測試换年度下拉、確認往年資料（如果本來就有存在 Supabase 裡）能正確被查到。**

> 最後更新（上一輪）：2026-07-23（第九十九輪，**「社的年度成員」委員會成員新增流程改成可多選＋標示主委/副主委職稱**——使用者提供正式社的「第36屆理事職員及各委員會組織表」PDF，指出現有「委員會成員」一列列輸入太慢（同委員會的人要一個個重複打委員會名稱），且組織表裡很多委員會有主委/副主委層級，畫面上完全看不出來。實作：① 資料模型沿用既有 `club_officers` 表未使用的 `note` 欄位存職稱文字（不用改資料庫）；② [`OfficersView.vue`](src/views/club/OfficersView.vue) 新增流程改成「先選/打委員會名稱＋職稱，再用勾選格子一次多選多位成員」一次性加入同一個委員會（checkbox 多選格子沿用第 93 輪 `ActivityListView.vue` 收件人勾選格子的同一套寫法），委員會名稱欄位加 `<datalist>` 自動完成既有委員會名稱清單，避免打字誤差把同一委員會拆成兩筆；③ 職稱欄位也是 `<datalist>` 常用選項（主委/副主委/委員/總幹事/執行長/顧問/司儀/召集人）＋可自訂文字；④ 唯讀檢視模式從「一列列重複委員會名稱的平面表格」改成比照 `ClubListView.vue`/`DashboardView.vue` 既有的 `zone-row` 分區列寫法，按委員會分組顯示，組內依主委→副主委→其餘職稱排序，主委/副主委用 `.bdg` 徽章標示（金色/深藍）。**組織表裡少數委員會底下還分小組**（例如「運動休閒」底下有旅遊登山隊/四季晉/文化藝術，各自有主委）刻意不做巢狀結構，建議使用者比照「委員會-小組」命名（例如「運動休閒-旅遊登山隊」）當獨立一筆委員會處理，維持單層資料模型簡單。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過，本機用 `window.__pinia`/`window.__router` 灌假 roster/officers 資料繞過登入，瀏覽器實測過：唯讀模式分組＋排序＋徽章顏色皆正確、編輯模式勾選 2 位成員＋填委員會名稱＋職稱後點「加入所選成員」正確一次新增 2 筆同委員會同職稱的草稿列，驗證後已還原 `main.ts`/刪除臨時 `.env.local`。**待使用者：上正式站用真實組織表資料實際輸入所有委員會/職稱，確認分組顯示跟徽章符合預期。**

> 最後更新（上一輪）：2026-07-23（第九十八輪，**新增例會發信時可手動加入非社友收件人**——延續勾選收件人名單的功能（第九十三輪），使用者問「Email收件人是否有辦法自己新增」，確認要加。新增例會表單的勾選清單下方多一個「其他收件人」文字框，可以貼多組 Email（逗號或換行分隔，例如來賓、講師這種不在社友名冊裡的人），前端簡單驗證格式過濾掉打錯的。[`notify-meeting-created`](supabase/functions/notify-meeting-created/index.ts) Edge Function 新增 `extra_emails` 參數：伺服器端再驗證一次格式，排除跟勾選社友清單重複的地址（避免同一人收到兩封），不像 `roster_ids` 那樣限制「必須屬於本社名冊」——這些本來就是使用者自己手動輸入、對象不一定是社友，caller 已經確認是本社 `club_admin`/`club_secretary` 就夠了。**這輪順便修正一個既有小地雷**：原本「`roster_ids` 帶空陣列就直接回應不發信」的早退邏輯，如果現在同時有填手動收件人會被誤判成「沒人可寄」，改成要等組合完「社友＋額外收件人」的完整名單後才判斷真的沒人可寄才提前回應。`meetings` store 的 `notifyCreated()` 加上可選的 `extraEmails` 參數。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過，本機用 `window.__pinia` 灌假名冊/權限資料，瀏覽器實測過表單正確顯示新欄位、全選/全不選/勾選計數都正常反應、文字框可輸入多組地址，驗證後已還原 `main.ts`/刪除臨時 `.env.local`。**待使用者：部署更新後的 `notify-meeting-created` Edge Function**（跟第九十五輪之後的做法一樣，內容又改了要重新部署），部署後新增例會時在「其他收件人」填一組自己能收到信的 Email 測試，確認會一起收到通知信。

> 最後更新：2026-07-23（第九十七輪，**依使用者回饋調整 Email 通知設定頁教學內容**——延續上一輪新加的 `PageHelp` 使用教學，使用者看過後回饋兩點：① 原本 4 條裡有兩條太顯而易見（跟 LINE 通知各自獨立、發不發信由功能開關決定）拿掉，「取消勾選不想寄的人」改成「取消勾選不用寄信的人」，現在只剩 2 條精簡重點；② 針對「應用程式密碼」怎麼申請這件事，使用者實際操作一次並提供 5 張截圖，要求做成圖文步驟。**沒有直接嵌入使用者提供的截圖**：目前的工具沒辦法把聊天室裡貼的圖片原始檔存進專案，也沒有影像編輯能力可以把截圖裡使用者親自產生、要求要馬賽克掉的那組真實應用程式密碼處理掉——改成把每一步驟都寫成精確對應截圖內容的文字編號清單（點連結進 Google 應用程式密碼頁 → 命名 → 建立後複製 16 碼密碼（只顯示一次）→ 貼回本頁存檔 → 用測試信確認），直接放在「1. 設定 Gmail 帳號＋應用程式密碼」段落下方（不是放進 `PageHelp` 小面板，因為 5 個步驟放小面板太擠，`PageHelp` 目前也只支援純文字沒有圖片）。本機用 `window.__pinia`/`window.__router` 灌假資料驗證過畫面正確顯示、排版跟頁面其他文字風格一致，驗證後已還原 `main.ts`/刪除臨時 `.env.local`。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。**如果之後真的要放實際截圖**：使用者需要自己先把截圖裡的真實密碼馬賽克/裁掉，存成圖檔提供路徑，屆時再考慮要不要把 `PageHelp.vue` 擴充成支援圖片（目前全站都還沒有這個先例）。

> 最後更新：2026-07-23（第九十六輪，**「Email 通知設定」頁補上使用教學**——延續社友名冊（第八十七輪）、活動（第八十八輪）、出席月報（第九十二輪）幾頁的 `PageHelp` 試點，比照同一套模式套用在這輪剛做完的 Email 通知設定頁（`/club/email-notify`）。內容 4 條：這頁設定的是本社自己的 Gmail 帳號，跟 LINE 通知設定是各自獨立的功能，只用其中一種也沒關係；密碼欄位要填「應用程式密碼」不是平常登入密碼，要先開兩步驟驗證才能產生；這頁只負責設定帳號，實際會不會自動發信是地區管理員在「功能開關管理」的開關決定，設定好不等於功能已啟用；設定完成後怎麼驗證（先按發送測試信，之後新增例會時表單會有社友勾選清單）。**這輪順便修好本機開發環境的一個小問題**：`.claude/launch.json` 裡的 `d3481-dev` 預覽伺服器設定還指向舊的、已經損壞的 clone 路徑 `/tmp/d3481clubmanagementsystem`（第八十九輪發現這個路徑的 git 倉庫壞掉、改clone到 `/tmp/d3481-clone-new` 之後一直沒有回頭更新這個設定檔），已經改成指向新路徑，之後要在瀏覽器預覽這個專案可以直接用這個設定啟動。本機用 `window.__pinia`/`window.__router` 灌假 auth/features 資料（社端執秘角色、`K1_meeting_email_notify` 開啟）繞過登入，瀏覽器實測過「?」按鈕正確顯示在標題旁、點擊後面板正確彈出且四條內容顯示正確、位置跟其他頁一致、關閉正常，驗證後已還原 `main.ts`/刪除臨時 `.env.local`。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。**待辦：確認下一個要補使用教學的頁面**。

> 最後更新：2026-07-23（第九十五輪，**修復例會通知信內文中文亂碼＋補齊內容＋加入回覆連結**——延續上一輪修的 Subject 亂碼，使用者這輪截圖回報信件內文也出現破碎文字「國際e6輪」（應為「國際扶輪」）。追查到是 denomailer 的**另一個獨立 bug**：`quotedPrintableEncode()` 每 74 字元強制切一次軟換行時，最後一段沒處理「切點剛好落在某個字的 `=XX=XX=XX` 位元組序列中間」的狀況，會把沒切完的位元組直接弄丟——用 denomailer 原始碼 + Node 腳本重現出跟截圖一模一樣的破損（「扶」被弄丟一個位元組），確認不是我們程式碼的問題。修法：`notify-meeting-created`、`send-test-email` 都新增 `quotedPrintableEncodeBody()` 自己正確實作內文編碼，透過 `SendConfig.mimeContent` 直接把編碼好的內容交給 denomailer（原始碼確認過 mimeContent 只會原封不動寫進 SMTP DATA，不會再處理一次），繞過它內建的 `content`/`html` 編碼路徑，不用換掉整個寄信套件。用 denomailer 原始邏輯＋標準 QP 解碼器驗證：production 內文往返後完全還原「國際扶輪」，另外用 40 組不同長度的中文內容壓力測試全部通過。同時處理使用者這輪一併提的內容需求：① 移除信末「國際扶輪 3481 地區」固定字樣（使用者說社友本來就知道不用寫）；② 內文原本漏掉場次、講師電話、講師 Email，這輪補齊（原本只有主旨帶場次，內文完全沒有）；③ 新增「回覆是否參加」連結，指向 `/activities/:id` 詳情頁（例會新增時 DB trigger 自動建對應的 `activities` 列，用 `meeting_id` 反查拿到 id 組連結），社友點進去用平台既有的報名/不克參加功能回覆，跟既有「進入活動可看報名狀況並自己按報名/不克參加」的既有流程完全共用，沒有另外做新頁面。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過（Edge Function 是 Deno 檔案不在檢查範圍內，前端沒有改動）。**這輪一樣沒有真實 `.env.local`，無法做真正的 SMTP 寄信測試**，邏輯層驗證已盡力做到位，實際效果仍需使用者部署後實測。**待使用者：兩支 Edge Function 這輪內容又改了，一定要重新部署**，部署後新增一場例會，確認信件內文中文正常（尤其注意最後一行不再是固定的「國際扶輪」字樣，而是可以點擊的回覆連結）、場次/講師電話/Email 有正確顯示（如果有填的話）、點連結能正常導到該場活動的詳情頁並能報名/不克參加。

> 最後更新：2026-07-23（第九十四輪，**修復例會通知信/測試信主旨中文亂碼**——使用者截圖回報 Outlook、Gmail 收到的例會通知信整封顯示成沒解碼的原始 MIME 內容（一堆 `=e8=a6=aa=e6=84=9b=...` 這種 quoted-printable 編碼文字，不是正常中文）。追查根因不是我們自己的程式碼，是 [`denomailer`](https://github.com/EC-Nordbund/denomailer)（第九十輪開始用來透過 Gmail SMTP 寄信的套件）本身的已知 bug（[issue #90](https://github.com/EC-Nordbund/denomailer/issues/90)）：Subject 只要是中文，編碼後長度超過約 74 個字元（中文大概 8 個字）就會觸發，它不會照 RFC 2047 規範把過長的 header 折成多行，而是直接把編碼字串攔腰截斷、破壞多位元組字元，產生無效的 Subject header，部分郵件用戶端（實測 Outlook、Gmail 都會）碰到這種壞掉的 header 會直接放棄解析整封信、退回顯示原始碼。我們的例會通知信主旨（社名＋場次＋日期）幾乎必然超過這個長度，靠縮短內容沒辦法可靠繞開（很多社名本身就快 8 個字）；`send-test-email` 固定文字的測試信主旨其實也超過門檻，一樣會中招，只是之前都還沒真的寄信測試過才沒發現。修法：`notify-meeting-created`、`send-test-email` 兩支函式都新增 `encodeSubjectHeader()`，自己正確實作 RFC 2047 多段 encoded-word + header folding；刻意在開頭加一個空白字元，是利用 denomailer 原始碼「字串開頭是 `=?` 才會誤判成已經編碼過、再整包重新（錯誤地）編碼一次」的判斷邏輯漏洞，讓它把我們已經編碼好的字串原樣送出，等於不用替換整個寄信套件就繞過這個 bug（詳細原理寫在函式上方的註解）。**這次沒有用猜的**：把 denomailer 原始碼從 GitHub 抓下來，用 Node 腳本逐行複製它實際的編碼邏輯重現使用者截圖裡一模一樣的截斷位置/亂碼（`=e6=ac=` 被硬生生從中間切斷、破壞「次」這個字），再用同一份腳本驗證修法：5 組案例（短/長中文主旨、純 ASCII、單一短中文字、超長社名）用真實 denomailer 邏輯 + 標準 RFC 2047 解碼器都通過「denomailer 原樣送出＋解碼回去等於原文」的往返驗證。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過（Edge Function 是 Deno 檔案不在這個檢查範圍內，前端沒有改動）。**這輪一樣沒有真實 `.env.local`，沒辦法做真正的 SMTP 寄信測試**，邏輯層驗證已經盡力做到位，但實際寄送效果還是要使用者部署後用真的長中文主旨（例如有場次編號的例會）實測才能 100% 確認。**待使用者：重新部署這兩支函式**（跟第九十三輪一樣的部署方式，兩支都要重新貼一次最新內容上去，`notify-meeting-created` 因為第九十三輪加過勾選收件人的改動、這輪又加了這個修復，`send-test-email` 這輪第一次真的改到內容），部署後在「Email 通知設定」頁按「發送測試信」，確認收到的測試信主旨正常顯示中文（不是亂碼/原始碼），再實際新增一場例會確認通知信主旨也正常。

> 最後更新：2026-07-23（第九十三輪，**新增例會發信時可勾選收件人名單，不用一定發給全社**。延續第九十輪的自動發信功能，使用者問「可以在新增例會的時候，選擇發信給指定人或是全發這個功能嗎」，確認要用勾選名單（不是簡單開關）。[`ActivityListView.vue`](src/views/activities/ActivityListView.vue) 新增例會的表單裡加一個社友勾選區（只在**新增**、且 `K1_meeting_email_notify` 開啟時顯示；編輯既有例會本來就不會觸發發信，所以編輯模式不顯示），列出本社名冊裡狀態正常、有登記 Email 的社友，預設全部勾選（`syncRecipientDefaults()` 在開啟新增視窗、以及切換類別成「例會」時透過 `rosterStore.fetchAll()` 抓最新名冊自動全選），可自行取消勾選或按「全不選」跳過這次發信，也有「全選」一鍵還原。[`notify-meeting-created`](supabase/functions/notify-meeting-created/index.ts) Edge Function 新增 `roster_ids` 參數：前端有帶就只發給這些人（**伺服器端仍會重新用 `club_id`/`member_status='normal'` 過濾一次，不信任前端傳來的名單本身**，避免有人竄改請求夾帶別社的 roster id）；帶空陣列（使用者全部取消勾選）直接回傳「未勾選任何收件人，未發送通知信」不寄信；不帶這個參數（例如舊版前端或未來其他呼叫端）維持原本「發給全部有 Email 的正常社友」的行為，向下相容。`meetings` store 的 `notifyCreated()` 同步加上可選的 `rosterIds` 參數。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過，本機這輪一樣沒有真實 `.env.local`，無法真的登入測試互動與實際收信。**推送這輪時跟並行 session 的第九十一～九十二輪（隱藏選單、出席月報使用教學）撞在一起，`git rebase origin/main` 只有 HANDOFF.md 衝突，改成這輪掛第九十三輪、接在對方第九十二輪之後，程式碼檔案沒有衝突。**待使用者：部署更新後的 `notify-meeting-created` Edge Function（唯一有動到後端的檔案，第九十輪已部署過的 `send-test-email` 跟兩個 migration 不用重跑），然後上正式站新增一場例會，確認表單裡看得到社友勾選清單、預設全選、取消勾選幾位後只有勾選的人收到信、全部取消勾選後不寄信也不報錯。**

> 最後更新（上一輪）：2026-07-23（第九十二輪，**「出席月報」頁補上使用教學**——延續第八十七輪社友名冊、第八十八輪活動頁的 `PageHelp` 試點，繼續往下一頁推廣。在 [`AttendanceMonthlyView.vue`](src/views/meetings/AttendanceMonthlyView.vue) 標題旁加 `PageHelp`，內容 4 條：出席率資料來源是「活動」頁例會逐人登記自動彙整、換月份查看方式；沒逐人登記時可用「快速新增／補登」直接填當天人數，但同一天不要兩邊都填以免重複；RI 半年報基準人數區塊用途（填基準/當月人數，系統自動算淨成長）；最下面「歷月出席月報」總表用來對照趨勢，60% 是扶輪社規定最低出席門檻。實作跟前兩頁完全比照同一套模式，沒有另外修改 `PageHelp.vue` 元件本身。驗證：`vue-tsc --noEmit`＋`npm run build` 皆通過；本機用 `window.__pinia`/`window.__router` 灌假 auth/features 資料（社長角色、B2_attendance_summary + B6_membership_report 開啟）繞過登入，瀏覽器實測「?」按鈕正確顯示在標題旁、點擊後面板正確彈出且四條內容顯示正確、位置跟其他頁一致，驗證後已還原 `main.ts`/刪除臨時 `.env.local`。**待辦：確認下一個要補使用教學的頁面**（例如活動報名相關頁、儀表板等其他社友常查的地方）。

> 最後更新：2026-07-23（第九十一輪，**一般社友選單隱藏「出席月報」「GG案」**——使用者說明這兩項是社長/執秘的業務，一般社友畫面不需要出現。[`TopMenu.vue`](src/components/layout/TopMenu.vue) 兩個選單項目各自加上 `auth.role !== 'club_member'` 判斷，跟既有「潛在社友」同一套模式。順帶發現 [`DashboardView.vue`](src/views/DashboardView.vue) 儀表板還有兩個「出席月報」旁路入口沒一併擋——「本月出席率」統計卡片可點擊跳頁、卡片下方「查看歷月出席率 →」按鈕——選單藏起來但這兩個沒擋的話等於白隱藏，一併修掉：卡片一般社友看得到數字但拿掉可點擊樣式/事件，按鈕一般社友直接不顯示。這輪沒有動資料庫，純前端選單/角色判斷調整。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過，本機瀏覽器裡實測過一般社友視角確認兩個選單項目與儀表板兩個旁路入口都正確隱藏（即使功能開關開啟也一樣，因為是角色判斷非功能開關判斷），切回社長角色回歸測試確認沒有誤傷其他角色。**推送這輪時跟並行 session 的第八十六～九十輪撞在一起**（[`TopMenu.vue`](src/components/layout/TopMenu.vue) 等檔案 git 自動合併成功，只有 HANDOFF.md 手動處理輪次編號衝突，改成這輪掛第九十一輪、接在對方第九十輪之後）。**待使用者：上正式站用一般社友帳號確認選單跟儀表板都看不到這兩項，用社長/執秘帳號確認正常。**

> 最後更新：2026-07-22（第九十輪，**新增例會後可自動發信通知社友（K1_meeting_email_notify），改用各社自己的 Gmail 帳號寄信**。第八十九輪一開始做的是集中式交易型郵件服務（Resend），但 Resend 要驗證自己的寄件網域才能寄給非帳號擁有者，使用者問「為什麼不能用 gmail.com」發現這個限制後，改回第39輪原本的規劃：**比照現有 LINE 通知模式，每社自己的 Gmail 帳號 + 應用程式密碼**（原因：全地區共用一組 Gmail 帳號寄信量太大會撞到 Gmail 每日寄信上限）。發信對象是本社名冊裡狀態正常、且有登記 Email 的社友（不限已報名者），跟活動報名系統無關。[`club_notification_channels`](supabase/migrations/058_club_email_notifications.sql) 表新增 `email_from`/`email_app_password` 兩欄（跟 LINE 設定共用同一張表，但刻意不共用 `status` 欄位，避免兩種通知管道互相干擾對方的「已連接」狀態顯示）。重寫 [`notify-meeting-created`](supabase/functions/notify-meeting-created/index.ts) Edge Function：驗證呼叫者是本社 `club_admin`/`club_secretary`，改用 `denomailer` 套件透過 Gmail SMTP（`smtp.gmail.com:465`）逐一寄送給本社社友，帳密讀自呼叫者所屬社的 `club_notification_channels` 列。新增 [`send-test-email`](supabase/functions/send-test-email/index.ts) Edge Function 讓使用者測試自己的 Gmail 帳密是否正確。新增 [`emailNotify.ts`](src/stores/emailNotify.ts) store ＋ [`EmailNotifyView.vue`](src/views/club/EmailNotifyView.vue) 設定頁（路由 `/club/email-notify`，選單「進階設定」下），讓每社執秘/社長自行輸入 Gmail 帳號＋應用程式密碼並測試發送。`meetings` store 的 `insert()` 補回傳新建列的 `id`；[`ActivityListView.vue`](src/views/activities/ActivityListView.vue) 新增例會（不是編輯）且 `K1_meeting_email_notify` 開啟時才呼叫，toast 顯示發送結果。[`057_meeting_email_notify.sql`](supabase/migrations/057_meeting_email_notify.sql) 新增這個 flag，**預設關閉**。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過，本機這輪沒有真實 `.env.local`，無法真的登入測試。**環境問題仍未解決**：這台機器登入的 Supabase CLI 帳號還是不是這個專案（`xdwqrgthsxyzclnjlmvy`，用正式站 bundle 反查確認過沒搞錯 ref）的成員，`supabase link`/`supabase projects list` 都看不到這個專案（第八十九輪就發現了），**這代表這輪一樣沒辦法自己部署 migration/Edge Function**，待辦清單裡的步驟都要使用者自己動手（或者找回一個對這個專案有權限的 Supabase 帳號登入這台機器的 CLI）。

> 最後更新（上一輪）：2026-07-20（第八十八輪，**「活動」頁補上使用教學（原「例會管理」）**——延續上一輪社友名冊試點，使用者指定下一頁是「例會管理」，但這個頁面已經在第八十輪～八十五輪的並行 session 裡被刪除（`MeetingListView.vue` 移除，例會功能併入 [`ActivityListView.vue`](src/views/activities/ActivityListView.vue)、變成活動的一個類別），選單標籤也已改叫「活動」，跟使用者說的頁名對不上——這輪直接在「活動」頁套用，沒有另外詢問確認（合理判斷使用者要的還是同一批功能，只是名稱跟著上游改版變了）。比照社友名冊做法在標題旁加 `PageHelp`，內容 4 條：例會跟其他類別活動的差異（都在同一頁管理，靠類別/時間/狀態篩選）、新增「例會」類別會自動建出席記錄與報名活動不用另外設定、點進活動可看報名狀況並自己按報名/不克參加、例會的「刪除」會連動清掉出席記錄跟報名活動且無法復原的提醒。本機瀏覽器驗證過面板正確開關顯示。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。**待辦：確認下一個要補使用教學的頁面**。

> 最後更新（上一輪）：2026-07-20（第八十七輪，**新增頁面內「使用教學」元件，先在社友名冊試點**——延續先前討論「新用戶導覽功能可以把全部功能都做介紹嗎」的結論：首次登入導覽只在第一次出現，之後想不起來某功能怎麼用還是得問人，改成「每個頁面裡面增加使用教學功能」比較能長期發揮作用。跟使用者確認兩件事：① 既有首次登入導覽保留（負責「第一次進來，方向感」），跟新的頁面內教學（負責「隨時想查，這頁怎麼用」）分工不衝突；② 範圍不一次做全部 20 幾個頁面，先從「社友名冊」試點——使用者的理由是任何新加入平台的社，第一件事就是要把社友通訊錄資料填進去，這頁最關鍵。實作：新增可重複使用的 [`PageHelp.vue`](src/components/help/PageHelp.vue) 元件（`title`/`items` 兩個 prop），標題旁一顆小「?」圓button，點開一個用 `Teleport` 掛到 `body`、依按鈕位置動態定位的輕量說明面板（列點呈現重點，點外面/Esc/再點一次都會關閉，寫法比照 `TopMenu.vue` 既有的下拉選單定位模式），視覺風格沿用全站既有的卡片/陰影/配色變數，沒有另外引入套件。套用在 [`RosterView.vue`](src/views/roster/RosterView.vue) 標題旁，內容 4 條重點：這頁是全社通訊錄／社友多建議先下載範本用 Excel 整批匯入、比逐筆新增快／可整批編輯或匯出備份交接／搜尋框跟正常-請假-退社篩選的用法。本機瀏覽器桌面版（1200px）＋手機版（375px）都實測過面板正確定位、開關互動正常。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。**待辦：其餘頁面要不要陸續補上使用教學，跟使用者確認下一個要做哪頁**（例如例會管理、活動報名等其他社友常問的地方）。

> 最後更新（上一輪）：2026-07-20（第八十六輪，**修復表格操作欄按鈕在多行內容時垂直跑位**——使用者截圖回報「社的歷程」頁面格式跑掉，按鈕組跟該列的文字內容對不齊。追查根因：全站表格操作欄一律用 `<td style="display:flex; gap:6px;">` 讓編輯/刪除按鈕並排，但**把 `display:flex` 直接寫在 `<td>` 上會讓瀏覽器不再把它當一般 table-cell 處理**（改用匿名 table-cell 包住它），該儲存格因此脫離表格的垂直置中機制，固定貼齊列頂端；平常單行內容看不出異狀，但只要同一列有其他欄位是多行文字（例如社的歷程/友好社的長文說明，或這次順便查到的社友活動長標題），該列被撐高後，操作按鈕就會明顯卡在列頂端、跟文字內容對不齊，使用者形容成「格式跑掉」。本機用假 Pinia 資料實際重現（`window.__pinia`/`window.__router` 驗證後已還原），確認就是這個機制造成的，不是單一頁面的獨立 bug。修法：`td` 保持純表格儲存格，把 `display:flex` 搬到內層 `<div>`，讓表格垂直置中機制正常生效。**沒有只修使用者回報的「社的歷程」跟「友好社」兩頁**，`grep` 全專案抓出同樣寫法（[`ClubHistoryView.vue`](src/views/club/ClubHistoryView.vue)／[`SisterClubsView.vue`](src/views/club/SisterClubsView.vue)／[`GgView.vue`](src/views/club/GgView.vue)／[`ActivityListView.vue`](src/views/activities/ActivityListView.vue)／[`ClubAnnouncementsView.vue`](src/views/club/ClubAnnouncementsView.vue)／[`DistrictAnnouncementsView.vue`](src/views/admin/DistrictAnnouncementsView.vue)／[`ClubListView.vue`](src/views/admin/ClubListView.vue)／[`AccountManagementView.vue`](src/views/admin/AccountManagementView.vue) 兩處）共 9 個檔案、10 處全部一併修正。**過程中撞到並行 session**：push 前 `git fetch` 發現落後 18 個 commit（第八十輪～第八十五輪，含 `MeetingListView.vue` 被刪除、併入 `ActivityListView.vue`），`git rebase origin/main` 在 `ActivityListView.vue` 撞到內容衝突（我這邊還停留在被刪除前的舊版結構）、`MeetingListView.vue` 撞到 modify/delete 衝突——手動合併：接受上游刪除 `MeetingListView.vue`，`ActivityListView.vue` 保留上游新增的「出席記錄／刪除」例會按鈕，只把我這輪的 div-wrap 修法套用上去。合併後用真實資料（含長標題、長說明文字）重新視覺驗證過桌面版（1200px）按鈕正確置中、手機版（375px）卡片式排版沒受影響，`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。**待複查**：上正式站確認「社的歷程」「友好社」實際資料（尤其是很長的重要記事/情誼說明那幾筆）按鈕確實置中、其餘 7 個順便修到的頁面也抽幾筆長內容資料確認正常。

> 最後更新（上一輪）：2026-07-20（第八十五輪，**隱藏 IOU/EDM/LINE 通知 + 「社的成員」選單合併**——使用者要求同步做兩件事：① 先隱藏 IOU、EDM 產生器、LINE 通知設定三項功能，用既有的功能開關機制關閉（不刪程式碼，之後要恢復到「功能開關管理」頁打開即可）——G1_iou／B5_edm 這兩個 flag 之前陸續被使用者在「功能開關管理」頁打開過，這輪用 [`056_hide_iou_edm_line_notify.sql`](supabase/migrations/056_hide_iou_edm_line_notify.sql) UPDATE 關掉；LINE 通知選單原本完全沒有開關、一直明碼顯示給各社管理員，比照其他功能新增 `J1_line_notify` flag（`types/index.ts`／`features.ts`／`FeatureFlagsView.vue` 都同步加，分組「通知」）。② 「社的年度成員／社友名冊／潛在社友／社友關懷」四個各自獨立的頂層選單項目合併成一個下拉選單「社的成員」（跟既有「本社歷程」下拉同一套模式），子項目條件不變，只是外層包裝變成下拉選單；連帶修正 OnboardingTour 的「社友名冊」步驟高亮目標（`/roster` 不再是頂層連結，改成幫「社的成員」下拉觸發按鈕加 `data-tour`，[`TopMenu.vue`](src/components/layout/TopMenu.vue) 的 `TOUR_IDS` 新增用 label 當 key 的寫法）。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過，本機瀏覽器實測過選單裡 IOU/EDM/LINE 通知都正確消失、「社的成員」下拉正確收合四個子項目（含臨時開啟 D4_care 驗證社友關懷也會一併出現）、手機版橫向捲動選單排版正常。**待使用者：到 SQL Editor 執行 056 migration**（需在 055 之後執行），執行後上正式站確認選單變化跟預期一致，且原本 IOU/EDM 已建立的資料都還在（只是隱藏，之後打開開關資料會原封不動出現）。

> 最後更新：2026-07-20（第八十四輪，**新增錯誤回報機制（方案 A 使用者主動回報 + 方案 B 前端自動擷取）**——延續上一輪的全站資料稽核，使用者確認要建立錯誤回報機制，提了三個方案（A 使用者主動回報／B 前端自動擷取 JS 錯誤／C 導入 Sentry 等第三方監控）讓使用者選，選了 A+B（都用現有 Supabase + Vue 架構做，不引入新套件，C 目前規模用不到）。新增 [`055_bug_reports.sql`](supabase/migrations/055_bug_reports.sql)（`bug_reports` 表，`source: user/auto`、`status: open/resolved`，RLS 地區管理員看全部、一般使用者只看得到自己回報過的紀錄）；[`components/common/BugReportButton.vue`](src/components/common/BugReportButton.vue) 是 TopNav 右上角「🐞 回報問題」按鈕（手機版收成純圖示），填問題描述送出會自動附帶頁面路徑/角色/瀏覽器資訊；[`lib/errorReporting.ts`](src/lib/errorReporting.ts) 全域攔截 `window.onerror`／`unhandledrejection`／Vue `app.config.errorHandler` 三處，自動記一筆 `source='auto'` 的回報，加了同一句錯誤同 session 只報一次的去重複跟每 session 上限 10 筆，避免 bug 迴圈洗版；[`views/admin/BugReportsView.vue`](src/views/admin/BugReportsView.vue)（僅地區管理員，`/admin/bug-reports`）清單依狀態/來源篩選、可標記已處理，掛進 TopMenu「進階設定」下拉選單。**明確寫在後台頁面提示文字裡的限制**：自動擷取只抓得到會拋出例外的錯誤（白畫面、API 失敗），抓不到「邏輯正確但結果錯誤」這種沒拋錯的 bug（例如上一輪修的資料隔離漏洞），仍需人工稽核+使用者主動回報互補，不是萬能的。**刻意沒做**：新回報的即時通知（Email/LINE），這輪只確認了回報機制方案，通知管道之後有需要再談。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過，本機瀏覽器裡監聽實際送出的 API 請求驗證過：使用者回報表單 payload 正確、手動觸發真實 JS 例外/promise rejection 後自動擷取正確寫入且去重複邏輯生效、後台清單篩選/標記已處理皆正常、手機 375px 排版正常。**待使用者：到 SQL Editor 執行 055 migration**（需在 054 之後執行），執行後上正式站點右上角「🐞 回報問題」送出一筆測試、到「進階設定→錯誤回報」確認看得到，並找一個會噴錯的操作確認自動擷取那筆也出現。

> 最後更新：2026-07-20（第八十三輪，**全站資料隔離稽核**——延續上一輪帳號管理洩漏的修復，使用者要求做一次全站資料確認確保系統穩定（已有人開始使用），並評估如何建立錯誤回報機制。資料稽核部分：逐一檢查所有 store 的 fetch 函式，找出跟 accounts.ts 同一種模式的 bug（查詢不加 club_id 過濾、只靠 RLS 限制範圍，地區管理員切到自己社視角時會漏看到全地區資料）。確認 roster/officers/sisterClubs/clubHistory/memberCare/iou/gg/prospective/lineNotify/attendance/clubTodos/membershipReports/governorAwards 都已經正確在查詢層帶 club_id（多半是必填參數），只抓到三個真的會漏的地方並修掉：① `stores/invites.ts` `fetchLog()` 補上 clubId 參數（跟上一輪的 accounts 系列同一個 onMounted 區塊但當時漏改）；② `stores/activities.ts` `fetchAll()` 補上 clubId 參數，社端視角只查跟本社有關的活動（本社主辦的全部 + 其他社主辦但非草稿的公開活動），排除其他社的例會私人報名資料；③ `fetchRegistrationsForActivity()` 補上 scopeClubId 參數，同樣邏輯。`ActivityListView.vue`／`ActivityDetailView.vue` 都改成依 `auth.isDistrictAdminView` 決定查詢範圍＋加 watch 讓同頁切換視角自動重查。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過，本機監聽實際送出的 REST API 請求網址逐一驗證過三處都正確套用範圍。這輪沒有動資料庫，純前端查詢邏輯修復。錯誤回報機制部分：已提出方案給使用者選（詳見對話紀錄），待使用者選定方向後下一輪動工。**待使用者：① 上正式站用有地區管理權限的帳號，切到自己社，確認「活動」列表跟任一活動的報名清單都不再看到其他社的資料；② 決定錯誤回報機制要採用哪個方案。**

> 最後更新：2026-07-20（第八十二輪，**修復帳號管理頁面對地區管理員洩漏其他社帳號資料**——使用者截圖回報自己同時有地區管理權限，切到自己社（台北市和平扶輪社）的帳號管理頁時，清單裡卻混進了其他社的資料。查證後是資料隔離的真實 bug：[`stores/accounts.ts`](src/stores/accounts.ts) 的 `fetchManaged()`/`fetchMembers()`/`fetchPending()` 完全沒有在查詢裡加 `club_id` 過濾，全部依賴 RLS 限制範圍——這對一般各社管理員沒問題（RLS 本來就只放行看自己社），但地區管理員的 RLS 是放行看「全地區」`user_profiles`（地區權限矩陣頁本來就需要），只要查詢的人同時具備地區管理員身分，即使畫面切到「自己社」視角，這幾支 fetch 還是會把全地區帳號都抓下來傳到瀏覽器，[`AccountManagementView.vue`](src/views/admin/AccountManagementView.vue) 的 `allAccounts` 在非地區視角時又沒有額外用 club_id 過濾，就整包顯示出來。修法：`accounts.ts` 新增 `scopeClubId` 內部狀態 + `setScope()`，三支 fetch 函式改成查詢這層直接加 `.eq('club_id', scopeClubId)`（不能只靠畫面過濾），`AccountManagementView.vue` 在 `onMounted` 跟新增的 `watch(isDistrictAdminView)` 都呼叫 `setScope(...)`，確保切視角（含同頁切換、不用重新整理）都用正確範圍重新查詢。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過，本機瀏覽器裡監聽實際送出的 REST API 請求網址驗證過：模擬「地區管理員切到自己社視角」，三支查詢都正確帶上 `&club_id=eq.club-1`；切回地區視角正確變回不限社別查詢。這輪沒有動資料庫，純前端查詢邏輯修復。**待使用者：用同時有地區管理權限的帳號登入，切到自己社的「帳號管理」頁，確認清單只剩自己社的人；再切回地區介面確認地區權限矩陣（有 district_role 的帳號清單）沒有跟著被誤過濾掉。**

> 最後更新：2026-07-20（第八十一輪，**活動報名狀況開放給一般社友查看**——使用者反映報名後應該要能看到該活動的報名人與統計人數，查證發現 [`ActivityDetailView.vue`](src/views/activities/ActivityDetailView.vue) 的報名清單整段被 `v-if="isOrganizer"` 擋住，一般社友報名完成後完全看不到任何統計或名單。改成：① `fetchRegistrationsForActivity()` 對所有登入社友都呼叫（不只主辦社），RLS 本來就已經限定回傳範圍（自己的回覆／同社社友的回覆／本社主辦時的全部），前端不用額外過濾，一般社友天然只看得到「跟自己有關」的部分，不會外洩其他社的報名資料；② 活動摘要區新增常駐的「報名狀況」統計行（已報名／不克參加／預估出席含來賓人數），所有人都看得到；③ 報名清單表格依角色顯示不同欄位——主辦社維持原本電話／來賓明細（逐位姓名+公司）／備註／報名時間全部看得到，一般社友只看得到社團／姓名／來賓「人數」（不顯示來賓姓名/電話/備註，避免把個資攤給所有看得到清單的人），標題也從「報名清單」換成「報名狀況」。這輪沒有動資料庫，純前端改動。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過，本機瀏覽器實測過以跨社一般社友身分查看別社主辦的活動，統計行跟簡化版報名狀況表正確顯示，切換成主辦社身分後正確變回完整表格。**待使用者：上正式站用一般社友帳號報名一場活動，確認能看到報名狀況統計跟名單（範圍應該只到自己+同社社友），並用主辦社帳號確認完整清單沒有變化。**

> 最後更新：2026-07-20（第八十輪，**例會管理與社友活動合併成單一「活動」列表**——使用者指出兩個選單資料重疊（例會本來就會自動同步一筆 activities，見 036 migration），要求合併成一個選單、加類別欄位（例會/社內活動/友社活動/地區活動/其他）、依日期新到舊排序、可依時間/類別篩選；並澄清「主辦社」欄位的用意是讓人清楚知道是哪個社主辦（不一定是自己社），要求新增活動時能填主辦社資訊。實作前先跟使用者確認過方向（資料庫不合併表、只在 activities 加分類欄位）才動工，使用者回覆「照建議進行」。詳見 [`054_activities_category_host.sql`](supabase/migrations/054_activities_category_host.sql)（`category` + `host_name` 欄位，CHECK constraint 綁死「例會」分類跟 `meeting_id` 是否有值一致）與重寫過的 [`ActivityListView.vue`](src/views/activities/ActivityListView.vue)（類別/時間/狀態三組篩選、「+新增」先選類別再切換例會表單／活動表單、活動表單新增「主辦社／主辦單位」欄位對應 `host_name`）。刪除 `MeetingListView.vue` 與 `/meetings` 列表路由（`/meetings/:id/attendance` 出席登記頁不變），選單合併成一個「活動」，OnboardingTour／Dashboard 統計卡連結／兩處「請至例會管理編輯」提示文字都一併改過，避免指向不存在的選單。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過，本機瀏覽器實測過合併列表篩選、host_name 覆寫顯示、新增例會/新增活動表單切換、編輯既有例會、手機 375px 排版皆正常。**待使用者：到 SQL Editor 執行 054 migration**（需在 053 之後執行），執行後上正式站確認：① 原本的例會資料都正確顯示在「活動」列表且分類是「例會」；② 用各社管理員帳號新增一筆非例會的活動（例如友社活動）並填寫主辦單位，確認欄位有存進去、清單上正確顯示；③ 編輯既有例會，確認欄位正確帶出且儲存後例會/出席記錄都正常；④ 手機瀏覽確認篩選跟操作按鈕排版正常。

> 最後更新：2026-07-20（第七十九輪，**修復活動報名兩個實測回報：不用重複填姓名/電話 + 送出後補成功提示**——延續上一輪的報名/不克參加改版，使用者實測正式站後回報兩個問題：① 已經用帳號登入了，報名時理論上不需要再手動輸入姓名/電話；② 按下送出後畫面沒有任何跳轉或反應，看起來像沒送出，很奇怪。查證後兩個都是真的缺口：① [`ActivityDetailView.vue`](src/views/activities/ActivityDetailView.vue) 原本把「姓名 *」「電話」做成可編輯輸入框，只是預先帶入 `auth.profile.name`/`phone`，這輪直接拿掉這兩個欄位，送出時直接沿用帳號本身的資料（`UserProfile.name` 型別本來就非空、由帳號保證存在，不需要防呆檢查是否為空），表單只剩「攜帶來賓／來賓資料／備註」；② 送出後原本完全沒有任何回饋（沒有 toast、沒有頁面跳轉、按鈕本身也沒有視覺變化），查了一下發現 [`App.vue`](src/App.vue) 其實早就定義了 `.toast`/`.toast-wrap` 樣式但從來沒有任何地方接上邏輯（純樣板遺留），這輪補上最小可用的 [`stores/toast.ts`](src/stores/toast.ts)（pinia store，`show(message, type, duration)`）+ [`components/common/ToastHost.vue`](src/components/common/ToastHost.vue)，掛進 `App.vue` 最外層（不受登入狀態限制），`submit()` 成功時跳「已送出報名」/「已記錄為不克參加」，失敗時原本的 `alert()` 也換成 toast（手機上原生 `alert()` 是阻斷式彈窗，體驗比較差）。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過，本機暫時掛 `window.__pinia`/`__router`（驗證後已還原，未進 commit）在瀏覽器裡實測過：手機 375px 寬選「報名」後表單確認不再出現姓名/電話欄位、點送出後底部正確跳出綠底白字 toast「已送出報名」（`getComputedStyle` 確認過背景色/文字色，3 秒後自動消失）。**待使用者：上正式站用真帳號實測一次「報名」「不克參加」「切換回覆」，確認送出後都看得到 toast 提示，且送出的資料（姓名/電話）在主辦社報名清單裡仍正確顯示自己的帳號資料。**

> 最後更新：2026-07-20（第七十八輪，**活動/例會報名改成「報名／不克參加」+ 攜帶來賓結構化欄位**——使用者延續上一輪手機版排查，指定例會/活動的報名流程要先選「報名」或「不克參加」再送出，選報名才展開「是否攜帶來賓」，是的話依人數（先抓上限 4 位）給對應數量的來賓姓名+公司/抬頭欄位，並確認套用到所有活動類型（不限例會）。實作前先發了一個手機版流程草稿（單頁漸進式表單，非多步驟精靈）給使用者確認方向，得到「4 位、套用到所有活動」的答覆後才動工。沿用既有的 `activities`/`activity_registrations` 架構（例會的「預計出席」本來就是自動同步出來的一筆 activity，跟一般活動共用同一套報名頁面 [`ActivityDetailView.vue`](src/views/activities/ActivityDetailView.vue)），不用另建系統：① 新增 [`053_activity_registration_decline.sql`](supabase/migrations/053_activity_registration_decline.sql)，`activity_registrations.status` 的 CHECK constraint 加上 `declined`（原本只有 registered/cancelled），主辦社才能區分「已回覆不克參加」跟「還沒回覆」；② `form_data`（本身是 jsonb，不用改表結構）的 `guest_count`（數字）改成結構化的 `guests: {name, company}[]`，`types/index.ts` 同步調整型別；③ [`stores/activities.ts`](src/stores/activities.ts) 把 `register()`/`cancelRegistration()` 合併成單一 `submitResponse(status)`，UI 上不再需要獨立的「取消報名」按鈕，改回原本的表單重新選擇+送出即可切換回覆；④ [`ActivityDetailView.vue`](src/views/activities/ActivityDetailView.vue) 報名區改成頂部「報名／不克參加」兩顆大按鈕（`.rsvp-choice`，44px+ 觸控熱區）→選報名才展開姓名/電話/攜帶來賓 `.segmented` 切換→選是才出現人數 `<select>`（1-4 位）動態渲染對應數量的 `.guest-card`（姓名+公司/抬頭）；主辦社報名清單表格新增「來賓」欄（逐位列出姓名・公司，手機卡片版用 `card-stack` 多行呈現）、狀態徽章加「不克參加」、統計文字改列「已報名 X 人 / 不克參加 Y 人」。舊資料（改版前只有數字 `guest_count`、沒有 `guests` 陣列）用 `normalizeFormData()` 相容處理，一律視為未攜帶來賓，需重新填寫（沒辦法回推當時沒收集過的來賓姓名）。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過，本機暫時掛 `window.__pinia`/`__router`（驗證後已還原，未進 commit）在瀏覽器裡實測過：手機 375px 寬選「報名」正確展開表單、攜帶來賓切「是」+ 選 3 位正確長出 3 組來賓欄位、切「不克參加」正確收起表單改顯示提示文字；切到主辦社視角確認報名清單手機卡片版與桌面表格皆正確顯示來賓明細、狀態徽章、統計數字。**待使用者：到 SQL Editor 執行 053 migration**，執行後上正式站找一場開放報名的例會/活動，實際測一次「報名+帶來賓」「不克參加」「切換回覆」三條路徑，並確認主辦社報名清單看得到來賓姓名/公司。

> 最後更新：2026-07-20（第七十七輪，**全站手機版操作優化，重點修地區儀表板分區列表預設收合**——使用者要求重新檢查整個平台的手機操作，並指名一個具體問題：地區介面「各社出席率」佔版面太長，希望各分區預設收折、需要再點開。查證後發現 [`DashboardView.vue`](src/views/DashboardView.vue) 的地區儀表板「各社出席率」與 [`AdminAttendanceView.vue`](src/views/admin/AdminAttendanceView.vue) 的「出席月報（全區）」其實**早就做了分區摺疊功能**（點分區列可收合/展開），只是預設值是「全部展開」（`collapsedZones` 是空 Set），11 個分區一次攤開才會佔掉很長版面。兩處都改成語意相反的 `expandedZones`（預設空 Set＝全部收合，點了才展開），並把 `.zone-row td` 的 padding 從 `8px 14px` 加到 `14px 14px`，讓即將變成主要互動方式的分區點擊熱區更接近 44px 觸控建議值。**順帶排查全站手機版操作**，額外抓到並修掉三個全站性問題（改在 [`App.vue`](src/App.vue) 全域樣式，一次套用到所有頁面，不用逐頁改）：① 全站共用表單 `.fi` 字級 `15px→16px`——低於 16px 會讓 iOS Safari 聚焦輸入框時整頁自動放大，全站所有新增/編輯彈窗（例會、名冊、IOU、GG案、社友關懷⋯）都受影響；② 卡片式表格（`.card-table`）操作欄（編輯/刪除等按鈕，`td` 沒有 `data-label`、用 inline style 排一列）手機版加上 `flex-wrap`，避免 3-4 顆按鈕擠在同一列超出卡片寬度；③ 右下角 toast 提示手機版加寬度限制與置中，避免長訊息貼近螢幕邊緣。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過，本機暫時掛 `window.__pinia`/`window.__router`（驗證完已還原，未進 commit）灌假的地區管理員登入狀態＋55 筆假社團資料，瀏覽器裡實測過：進入儀表板 11 個分區全部收合、點擊「第一分區」正確展開且其餘分區維持收合、切到手機 375px 寬確認卡片排版正常、`.fi` 電腦樣式確認算出字級為 16px、切到社端例會管理頁確認「編輯／出席記錄／刪除」三顆按鈕在手機版正確換行排列（原本會擠壓/被裁切）。已 push（`e375206`）。**待複查：使用者上正式站確認地區儀表板/全區月報預設收合的分區點開後資料正確，並用實際手機瀏覽任一有多顆操作按鈕的列表頁確認換行後排版正常。**

> 最後更新（上一輪）：2026-07-20（第七十六輪，**新增首次登入新手導覽**——使用者要求給第一次註冊登入的人一個順序引導，說明平台怎麼用，重點涵蓋三個地方：儀表板（可以看到目前需要社友協助及現況統整資訊）、例會管理（本月例會與時間、社外活動，可在此報名）、社友名冊（查詢社友通訊錄）。做法是自訂一個輕量導覽元件，沒有引入 driver.js/shepherd.js 之類的套件，跟這個 repo 目前每個功能都手刻、不依賴第三方 UI 套件的既有風格一致：① 新增 [`052_onboarding_tour.sql`](supabase/migrations/052_onboarding_tour.sql)，`user_profiles` 加一欄 `onboarding_completed_at timestamptz`，**同一個 migration 內把既有帳號全部補上 `now()`**，避免已經在用平台的社友被回溯彈出導覽，只有 052 之後新建立的帳號（預設 NULL）才會自動看到；② [`stores/auth.ts`](src/stores/auth.ts) 新增 `needsOnboarding` computed（登入中＋非待審核＋非地區視角＋`onboarding_completed_at` 是 null 才成立，地區視角選單完全不同，不套用這份導覽）與 `completeOnboarding()`（寫入現在時間，沿用既有的 `profiles_update_own` RLS，不需要額外 policy）；③ 新增 [`components/onboarding/OnboardingTour.vue`](src/components/onboarding/OnboardingTour.vue)：5 步（歡迎→儀表板→例會管理→社友名冊→結束），例會管理／社友名冊兩步會先 `router.push` 切過去對應頁面再用 `getBoundingClientRect()` 對 [`TopMenu.vue`](src/components/layout/TopMenu.vue) 加上的 `data-tour="nav-dashboard"/"nav-meetings"/"nav-roster"` 屬性定位，畫一個用巨大 `box-shadow` 挖洞做出的聚光燈效果高亮對應選單項目，彈窗根據空間自動上下切換、水平置中並 clamp 在視窗內；`B1_meeting_info`/`D1_roster` feature flag 關閉時會自動跳過對應那一步，不會指到點不進去的按鈕；手機版橫向捲動選單會 `scrollIntoView` 把目標項目捲進可視範圍再量測位置。④ 新增 [`stores/onboarding.ts`](src/stores/onboarding.ts) 純前端小 store，讓 [`TopNav.vue`](src/components/layout/TopNav.vue) 新增的「🧭 導覽」按鈕（非地區視角才顯示）可以隨時重新觸發，不受「已完成」狀態限制。**視覺驗證**：本機暫時在 `main.ts` 掛 `window.__pinia`/`window.__router`（驗證完已還原，未進 commit）灌假的 `club_member` 登入狀態，瀏覽器裡完整跑過一次五步導覽（桌面版＋手機 375px 寬皆測試），確認：歡迎/結束步驟置中彈窗、三個高亮步驟正確跟著換頁並精準框住對應選單項目（手機版橫向捲動也正確把目標捲進畫面）、「略過」/右上角 × 都會呼叫 `completeOnboarding()` 並關閉、右上角「🧭 導覽」可在已完成後重新開啟。因為本機是假的 Supabase URL，`completeOnboarding()` 實際送出的 PATCH 會失敗（跟過去多輪紀錄的「Failed to fetch」現象一致），但已確認邏輯正確觸發（`close()` 先同步關閉彈窗，不受網路結果影響），正式站有真連線時應該正常寫入。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。**待使用者：到 SQL Editor 執行 052 migration**（需在 051 之後執行），執行後上正式站用一個新建的測試帳號（或手動把某帳號的 `onboarding_completed_at` 設回 NULL）確認導覽會自動彈出、完成後不會重複彈出、右上角「🧭 導覽」按鈕可以重新看一次。

> 最後更新（上一輪）：2026-07-19（第七十五輪，**RotarySSO 登入正式確認成功 + 新增「功能九宮格」跨系統快速切換選單**——使用者確認登入流程已經完整跑通（第七十三輪的 `verifyOtp` 修復生效），至此 RotarySSO 取代帳密登入的核心目標達成，第七十二～七十四輪的所有「待複查」項目結案。使用者接著要求比照 RotarySSO 生態系其他應用（截圖範例：扶輪信用稽核預警系統／WaHoot Rotary／扶輪會計大師）在右上角加一個九宮格選單，這次使用者提供了完整的《RotarySSO 對外服務總規格》（把先前只涵蓋登入的規格書升級成涵蓋登入/九宮格/單一登出/client 公開資訊/私人訊息中心（未開放）/許願池（未開放）/使用者目錄（不可用）七章的總規格），第 2 章完整定義了九宮格 API：`GET /api/apps?account_type=<類型>` 用 **client_id:client_secret Basic 認證**（server-to-server，不能前端直打，會洩漏 secret 也沒開 CORS）。實作：① 新增 [`list-apps`](supabase/functions/list-apps/index.ts) Edge Function 當 proxy——驗證呼叫者的 Supabase session、從 `user_profiles.sso_account_type` 取得帳號類型、用 Basic 認證代打 RotarySSO 拿清單，內建正向快取（1小時 TTL）＋失敗時 stale-on-error 沿用舊資料＋負向快取（60秒防 retry storm）＋3秒 timeout，完全比照規格書建議的四項強化；這支函式**不用**像 `sso-login` 一樣關閉 JWT 驗證（因為呼叫者本來就該是已登入狀態，維持 Supabase 預設的 JWT 驗證即可，少一個手動步驟）；沿用既有的 `ROTARYSSO_CLIENT_ID`/`ROTARYSSO_CLIENT_SECRET` secret，不用新增。② 新增 [`AppLauncher.vue`](src/components/layout/AppLauncher.vue)：把規格書附的 React 參考實作原封不動轉成 Vue 3 `<script setup>`，3×3 waffle 圖示按鈕、彈出 3 欄 grid 卡片式選單、圖示 https 合法就顯示否則色塊＋名稱首字 fallback（依 clientId 雜湊固定配色）、自己的 tile 標「（目前）」藍框不可點擊、其他 tile 新分頁開啟、點外面/Esc 關閉、惰性載入（第一次打開才 fetch）；掛進 [`TopNav.vue`](src/components/layout/TopNav.vue) 的登出按鈕左邊。**視覺驗證**：本機用 `window.__pinia` 灌假登入狀態＋monkey-patch `window.fetch` 攔截 `list-apps` 回傳假資料，瀏覽器裡確認過三種狀態——載入中、失敗時「暫時無法載入應用清單」優雅降級、成功時 4 個 tile（含自己那顆正確標記「目前」藍框、其餘 3 顆色塊 fallback 圖示配色不同）版面跟使用者提供的參考截圖一致。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。第 3 章也印證了第七十四輪的登出修法（`callbackUrl` 是對的），並提到第三方網域理論上要列入白名單才能導回成功，但實測已經可以正常導回，研判 RotarySSO 團隊已經順手把我們加進白名單。**待使用者部署**：到 Supabase Dashboard 用第七十二輪同樣的手動流程（Edge Functions → 新增函式）部署 `list-apps`（程式碼見檔案，不需要新增 secret，沿用既有的 `ROTARYSSO_CLIENT_ID`/`ROTARYSSO_CLIENT_SECRET`），部署完成、Cloudflare 重新部署後，麻煩在正式站登入後點右上角九宮格圖示，確認清單正確顯示、自己的 tile 有標記「目前」、點其他 tile 會新分頁開啟對的網址。

> 最後更新（上一輪）：2026-07-19（第七十四輪，**修復登出後無法切換 RotarySSO 帳號 + 釐清功能九宮格範圍**——延續第七十三輪，使用者回報登出後重新登入只會沿用原本帳號、無法切換別的扶輪帳號。原因：[`auth.ts`](src/stores/auth.ts) 的 `signOut()` 原本只清 D3481 自己的 Supabase session，沒有一併結束 RotarySSO 自己網域的登入狀態，RotarySSO 那邊的 cookie 還在，下次點「用扶輪帳號登入」會直接跳過帳密輸入沿用同一帳號。修法：`signOut()` 清完本地 session 後，整頁導到 RotarySSO 的登出端點 `https://rotarysso.vercel.app/oauth/logout`。**過程中踩了一個坑**：一開始比照標準 OIDC RP-Initiated Logout 規格帶 `post_logout_redirect_uri` 參數，實測發現 RotarySSO **不吃這個參數**，登出後會跳到一個完全不相關的應用程式（`rotarycredit.vercel.app` 扶輪信用稽核預警系統），懷疑是某種預設/上次使用應用的 fallback 行為；經 RotarySSO 技術團隊確認正確參數其實是 **`callbackUrl`**（跟它登入頁內部導頁用的參數一致，不是標準 OIDC 命名），改用 `callbackUrl=<登入頁網址>` 後實測正確導回 D3481 登入頁。`vue-tsc --noEmit` 已驗證通過。另外使用者提出想要比照 RotarySSO 生態系其他應用（截圖範例：扶輪信用稽核預警系統／WaHoot Rotary／扶輪會計大師）在右上角加一個「功能九宮格」快速切換選單——**確認這個功能不在目前拿到的 SSO 登入規格書範圍內**，規格書開頭明文寫「若日後要接...功能九宮格...另行索取」，需要使用者跟 RotarySSO 團隊另外要一份九宮格整合規格（應用清單從哪個 API 拿、圖示/名稱/導頁網址怎麼給、要不要額外 scope）才能動工，這次沒有實作，純粹是排查釐清範圍。**待複查：使用者實測登出→重新登入，確認這次能不能真的切換到別的 RotarySSO 帳號。**

> 最後更新（上一輪）：2026-07-19（第七十三輪，**RotarySSO 正式站實測除錯，修掉 `verifyOtp` 400 錯誤**——延續第七十二輪的 RotarySSO 整合，使用者已完成所有手動部署步驟（RotarySSO 後台註冊 client、SQL Editor 跑完 [`051_rotarysso.sql`](supabase/migrations/051_rotarysso.sql)、Dashboard 部署 `sso-login`＋設定 `ROTARYSSO_CLIENT_ID`/`ROTARYSSO_CLIENT_SECRET`、Cloudflare Pages 設定 `VITE_ROTARYSSO_CLIENT_ID` 並重新部署），正式站 client_id 為 `F1z2S113VsnSJE9Xzn8cu`。這輪陪使用者在正式站逐步排查真實登入卡住的問題，一路抓出三個各自獨立的 bug（前兩個都不是我們這邊的程式碼）：① **Cloudflare 環境變數沒重新 build 生效**——`VITE_*` 是打包時寫死的，改 Dashboard 變數不會讓已部署的網站生效，請使用者重新觸發部署後解決；② **RotarySSO 同意畫面「允許」按鈕卡住**（點了顯示處理中又跳回原狀、無錯誤訊息）——用瀏覽器 Network 分頁逐步排查，發現 RotarySSO 的同意頁是用 `fetch()` 送出授權請求，伺服器正確回 307 導向我們的 `redirect_uri`（`code`/`state` 皆正確），但 `fetch()` 模式下瀏覽器 CORS 政策不允許跨網域跟隨這個 redirect，請求被直接取消——這是 RotarySSO 前端的實作問題（應該用整頁跳轉而非 fetch），已回報給 RotarySSO 技術團隊修復（改成整頁導頁＋順便補上先前會遺失的 nonce/PKCE 參數透傳，我們用不到這兩個但一起修掉無妨），**RotarySSO 已修復並確認**；③ **我們自己的 bug**：`sso-login` 先前一度回 401（`UNAUTHORIZED_NO_AUTH_HEADER`）——這支函式設計上就是給未登入的人呼叫，Supabase Edge Functions 預設的「Enforce JWT Verification」開關會擋掉沒有 Bearer token 的請求，請使用者到 Dashboard 把這支函式的 JWT 驗證關掉解決；接著換 [`SsoCallbackView.vue`](src/views/SsoCallbackView.vue) 呼叫 `supabase.auth.verifyOtp()` 那步回 400（`validation_failed: Only the token_hash and type should be provided`）——原本的程式碼同時帶了 `email` 跟 `token_hash` 兩個參數，但 Supabase 這支 API 用 `token_hash` 驗證時不能再多帶 `email`（兩種 OTP 驗證模式的參數不能混用），已修正成只帶 `token_hash`/`type`（**這是這輪唯一真的動到程式碼的地方**）。`vue-tsc --noEmit` 已重新驗證通過。**待複查：使用者重新走一次完整登入流程，確認這次能不能真正落地成功登入**（目前為止一路排查到 `verifyOtp` 這步才發現 bug，還沒看到登入成功後的畫面）。

> 最後更新（上一輪）：2026-07-19（第七十二輪，**接入 RotarySSO，完全取代帳密登入**——使用者要把 [RotarySSO](https://rotarysso.vercel.app)（扶輪生態系共用的 OIDC 身分中心）接進來當唯一登入入口，取代原本的 email/手機密碼登入。已與使用者確認三個關鍵決策：① 登入方式完全取代，不與帳密並存；② 首次 SSO 登入一律進「待審核」狀態（`club_id = NULL`），不自動用 `rotary_club` 文字比對 `clubs.name`，一律由地區管理員手動指派；③ `account_type='管理者'`（RotarySSO 全域系統管理者，跟 D3481 地區角色是兩回事）自動授予 D3481 的 `district_role='admin'`，解決「第一個帳號由誰審核」的雞生蛋問題。實作內容：① 新增 [`051_rotarysso.sql`](supabase/migrations/051_rotarysso.sql)，`user_profiles` 加 `sso_sub`（UNIQUE）/`sso_account_type`/`sso_rotary_club`/`sso_rotary_district` 四欄，`handle_new_user()` trigger 一併讀取寫入，`account_type='管理者'` 時直接寫 `district_role='admin'`；② 新增 [`sso-login`](supabase/functions/sso-login/index.ts) Edge Function：server-to-server 換 token→打 userinfo→依序比對「已連結的 sso_sub」→「既有帳號 email（沿用 `invite-user` 已有的 `find_user_id_by_email` RPC，讓社長/執秘用真實 email 帳號能平滑轉過來，不會變成待審核）」→都找不到才建立 `club_id=NULL` 的全新待審帳號，最後用 `generateLink({type:'magiclink'})` 回傳 `token_hash` 給前端；③ [`LoginView.vue`](src/views/LoginView.vue) 帳密表單整個拿掉，改成一顆「用扶輪帳號登入」按鈕（`state` 存 `sessionStorage` 做 CSRF 防護，機密 client 不用 PKCE）；④ 新增 [`SsoCallbackView.vue`](src/views/SsoCallbackView.vue)（`/auth/sso/callback`，呼叫 `sso-login` 拿到 `token_hash` 後 `supabase.auth.verifyOtp({type:'email'})` 落地成真正的 session）與 [`PendingApprovalView.vue`](src/views/PendingApprovalView.vue)（`/pending-approval`，待審核提示頁）；⑤ [`router/index.ts`](src/router/index.ts) 移除 `/register` 路由（連同刪除 `RegisterView.vue`，自助註冊被 SSO 待審流程取代），新增 guard：已登入、`club_id` 是 NULL、不是地區管理員時一律導去 `/pending-approval`；⑥ [`auth.ts`](src/stores/auth.ts) 拿掉只剩 `LoginView.vue` 在用的 `signIn()`/`resolveLoginEmail()` 死碼，新增 `isPendingApproval` computed；⑦ [`AccountManagementView.vue`](src/views/admin/AccountManagementView.vue) 的「帳號審核」區塊補上 `sso_rotary_club`/`sso_rotary_district`/`sso_account_type` 唯讀欄位＋社別指派 `<select>`（新增 `accounts.assignClub()`，直接用既有 RLS 放行地區管理員改 `club_id`，不用另開 Edge Function），`fetchPending()` 查詢條件從只抓 `requested_role` 非空，擴大成 `requested_role.not.is.null OR club_id.is.null` 才抓得到 SSO 待審帳號。**已知風險**：RotarySSO 的 `userinfo` 沒有手機號碼 claim，一般社友原本用手機號碼建的帳號（`@member.d3481.local`）無法自動比對到 SSO 身分，第一次改用 SSO 登入會落入待審核而非自動接回原帳號，這點跟使用者選的「一律待審」決策一致，這次不做自動合併機制，地區管理員審核時如果認出是舊社友需自行判斷是否要手動整併（`delete-account` 舊帳號）。已用真實瀏覽器驗證：登入按鈕會正確帶著 `response_type=code&client_id=...&redirect_uri=...&scope=openid+profile+rotary&state=...` 導到 `rotarysso.vercel.app`（用假 client_id 測試，RotarySSO 正確回 `unknown_client`，證明請求格式正確），`/pending-approval` 頁面正確渲染。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。**待使用者完成的部分（Claude 無法代勞，詳見下方待辦）**：到 RotarySSO 後台註冊 OIDC client、提供正式站網域、跑 051 migration、部署 `sso-login`、決定何時停用 Supabase Email/Password provider。**還沒 push，等使用者確認以上待辦事項的資訊（client_id/secret、正式站網域）後才能真正部署測試，但程式碼本身已經完成並通過型別/建置檢查。**

> 最後更新（上一輪）：2026-07-13（第七十一輪，**修復：例會管理無法刪除已儲存的例會**——使用者回報「例會管理內沒辦法刪除已經儲存的例會」，追查發現 `src/stores/meetings.ts` 從一開始就只有 `insert`/`update`，根本沒有 `remove` 函式，`MeetingListView.vue` 的操作欄也只有「編輯/出席記錄/預計出席」三顆按鈕，完全沒有刪除按鈕——不是壞掉，是這個功能從沒被接上過。確認過 `003_meetings_attendance.sql` 的 `meetings_write` RLS policy 是 `FOR ALL`，本來就允許 `club_admin`/`club_secretary` 刪除本社例會，且 `attendance_sessions`（003）跟 `activities.meeting_id`（036，例會自動同步建立的預計出席報名活動）都設了 `ON DELETE CASCADE`，資料庫端刪除鏈路完全沒問題，純粹是前端缺一顆按鈕。補上：① `meetings.ts` 新增 `remove(id)`；② `MeetingListView.vue` 新增「刪除」按鈕（`.btn-red.btn-sm`，跟 `AccountManagementView.vue`/`DashboardView.vue` 既有刪除模式一致），點擊會先 `confirm()` 提醒「相關的出席記錄與預計出席報名也會一併刪除，無法復原」。因為本機沒有 `.env.local` 導致 app 連 `createClient` 都會直接丟出「supabaseUrl is required」讓整個 Vue app 掛白畫面（這是這台環境第一次踩到這個問題，之前都是靠有 session 或完全不跑 app 只驗證 CSS），這次改用暫時寫入假的 `.env.local`（`https://placeholder.supabase.co` 之類的佔位字串，非真實憑證，驗證完已刪除）讓 app 能正常掛載，再用 `window.__pinia`/`window.__router`（`main.ts` 暫時掛出、驗證完已還原）直接灌 `auth`/`permissions`/`meetings` store 假資料，瀏覽器裡確認刪除按鈕會出現、點擊會走 `confirm→meetings.remove()→錯誤處理` 這條路（因為是假 Supabase URL，實際 fetch 失敗，跳出「刪除失敗：TypeError: Failed to fetch」，證明程式邏輯正確觸發，只是沒有真的資料庫可以打）。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。**已 push（`48bc370`）。待複查：上正式站用 `club_admin`/`club_secretary` 帳號實測刪除一場測試例會，確認出席記錄跟預計出席報名活動有一併消失。**

> 最後更新（上一輪）：2026-07-12（第七十輪，**社端首頁移除「本年度平均出席率」統計卡、「需關懷社友」提升優先度**——使用者要求：① 拿掉統計卡片列的「本年度平均出席率」（`dashboard.avgRate` 這個 store 欄位其他頁面如 `ClubDetailView.vue` 還在用，只拿掉首頁這一張卡，沒動 store）；② 「🤝 需關懷社友」原本跟「⏰ 待辦提醒」並排在 `.two-col` 區塊、位於公告欄之後，使用者說這比出席率更重要，要往上移——問過使用者確認移動目標後，改成獨立整欄、移到統計卡片之後、地區/社內公告欄之前，優先度最高；「⏰ 待辦提醒」拆出兩欄並排後改成獨立整欄，維持原本在公告欄之後的位置。順帶清掉不再使用的 `.two-col` CSS（含手機版 media query 那條）。本機沒有 `.env.local`，無法真實登入視覺驗證，`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過（跟過去多輪慣例一致）。**已 push（`1509fdf`）。待複查：上正式站確認新版面順序跟需關懷社友清單顯示正常。**

> 最後更新（上一輪）：2026-07-11（第六十九輪，**修掉全站手機版「內容被固定導覽列蓋住」的 bug**——使用者用 iPhone 17 Pro Max Safari 瀏覽正式站時回報「卡片最頂端被切掉」，一開始懷疑是 Dynamic Island 安全區域問題，但實際用完整的 `TopNav`＋`TopMenu`＋內容區塊組成獨立測試頁重現後，發現是 [`App.vue`](src/App.vue) 裡 `@media (max-width: 900px) { .main { padding: 16px; } }` 這條手機版規則，用 `padding` 簡寫**整組覆蓋掉**了桌面版原本算好、用來讓內容避開固定導覽列（`--topnav-h` 56px＋`--topmenu-h` 50px）的 `padding-top: calc(...)`，導致手機版（≤900px，等於所有手機）每一頁的內容最上面一段（含標題、卡片標籤文字）其實都被固定導覽列蓋住看不到，只是剛好卡片數字夠大、部分露出來才被發現。**這是全站性的既有 bug，不是這支手機特有**，只是過去每輪手機版驗證都是用抽出 CSS 做的獨立靜態頁面測試，從來沒有把真正的固定導覽列（`position:fixed`）疊加進去一起測，所以一直沒被抓到。修法：手機版規則改成 `padding:16px` 之外，額外保留 `padding-top: calc(var(--topnav-h) + var(--topmenu-h) + 16px)`，不要整組覆蓋（[`App.vue`](src/App.vue) 一行 diff）。用同樣手法（真實 TopNav+TopMenu+內容三層疊加的獨立測試頁）重現＋驗證修復前後對比，`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。**已 push。待複查：上正式站用手機（一般模式，非無痕）確認任一頁面的標題/統計卡標籤都完整可見、不再被導覽列遮住；順帶提醒之後任何手機版驗證都應該比照這次做法，把真實的固定導覽列疊加進測試頁，不能只測內容區塊本身。**

> 最後更新（上一輪）：2026-07-11（第六十八輪，**新增「GG案盤點」（I1_gg，全球獎助金）**——延續第六十七輪落差比對排序的第一項。完全比照 vivian 檔案的 `p-gg` 頁面：① 新增 [`050_gg_cases.sql`](supabase/migrations/050_gg_cases.sql)，`gg_cases` 表（`name`/`partner`/`amount`/`start_date`/`end_date`/`status`/`description`），`status` CHECK 限定「規劃中/申請中/進行中/已完成/取消」，RLS 完全比照 `049_iou.sql` 寫法（select/insert/update/delete 四條 policy）；`amount` 刻意存成 `text` 而非數字，比照 vivian 保留「US$30,000」這種帶幣別的自由格式，不強制轉換成單一貨幣的數字欄位；② `types/index.ts` 新增 `GgCase`/`GgStatus` 型別、`FeatureKey` 新增 `I1_gg`；③ 新增 [`stores/gg.ts`](src/stores/gg.ts) CRUD；④ 新增 [`views/club/GgView.vue`](src/views/club/GgView.vue)（`/club/gg`）：4 格統計卡（進行中/規劃中/已完成/逾期風險，逾期＝狀態非已完成且結束日期已過），沿用 `SisterClubsView.vue` 的簡單 `card-table` 表格＋列內編輯/刪除按鈕寫法（不像 IOU 用月份分組，GG案本身沒有「按月」的概念），狀態徽章配色比照全站既有 `.bdg` 系統（規劃中/申請中＝黃`b-y`、進行中＝深藍`b-n`、已完成＝綠`b-gr`、取消＝紅`b-r`，跟 4 格統計卡的 c-navy/c-gold/c-green/c-red 對應一致），逾期案件在「期間」欄位加紅色「⚠️ 逾期」徽章；⑤ `FeatureFlagsView.vue` 新增獨立分組「獎助金」（沒有塞進 IOU 所在的「捐獻」分組，因為性質不同）；⑥ `router/index.ts` 掛 `I1_gg` feature flag；⑦ `TopMenu.vue` 在「IOU」後面加「🌐 GG案」連結。**刻意沒做**：vivian 原型的「📖 RI 官方文件」按鈕內嵌一份 base64 編碼的 RI 官方 PDF（約 15MB），版權文件不適合照搬，這次省略，之後有需要可以改成連到 RI 官網的外部連結。本機沒有真實 Supabase 連線，改用抽出 `App.vue` 的 CSS 變數＋`.bdg`/`.card-table` 樣式做的獨立靜態 HTML，在瀏覽器裡視覺驗證過桌面版（4 格統計卡配色、狀態徽章、逾期警示）跟手機版（`card-table` 正確切換成 label:value 卡片式排版）都正常，`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。**已 push（`d386915`）。050 migration 使用者已在正式 Supabase 執行完成 ✅。待辦：功能開關管理把 `I1_gg` 打開，再上正式站實測 `/club/gg` 新增/編輯/刪除、逾期徽章、`club_member` 唯讀等行為。**

> 最後更新（上一輪）：2026-07-11（第六十七輪，**IOU 正式站複查完成 ✅**——使用者確認 049 migration 已在正式 Supabase 執行、`G1_iou` feature flag 已開啟，`/club/iou` 在正式站測試成功。第六十六輪的「待複查」項目至此結案。緊接著透過重新比對 vivian 檔案，確認 Vue app 目前尚未涵蓋的三個功能區塊：**GG案盤點（`p-gg`，全球獎助金）**、**基金捐獻追蹤（`p-fund`，RI 正式基金分類：年度基金/PolioPlus/PHF/PHS/Endowment/Major Donor/AKS/Bequest/中華扶輪基金，跟 IOU 是兩回事）**、**服務計畫管理（`p-service`，完整計畫 CRUD＋預算/人次追蹤，目前系統只有把「有無服務計畫」當總監獎項的一格評分項目，沒有真正的清單管理）**，以及 **AI Prompt 工具箱（`p-ai`，vivian 有 12 個引導式工具，目前只做了 EDM 產生器 1 個）**。下一步排序：GG案（跟 IOU 型態最接近，風險最低）→ 基金捐獻追蹤 → 服務計畫管理 → AI 工具箱其餘 11 項。**待使用者確認要不要接著做 GG案。**

> 最後更新（上一輪）：2026-07-11（第六十六輪，**新增「IOU 捐獻收據追蹤」（G1_iou）**——延續社友關懷落差比對後確認的另外兩個 vivian 缺口之一（另一個是 GG案，還沒做）。完全比照 vivian 檔案的 `p-iou` 頁面：追蹤社友針對社務/活動/服務計畫等**非社費捐獻**的收據開立狀態，跟社費/總帳無關，是獨立自成一格的功能（使用者確認過「IOU 是否會跟財務系統連動」——vivian 根本沒有財務系統，IOU 就是它自己）。這次**是全新功能，第一次為它建表**：① 新增 [`049_iou.sql`](supabase/migrations/049_iou.sql)，`iou_receipts` 表（`donor_name`/`item`/`amount`/`donation_date`/`receipt_payee`/`status`/`note`），RLS 完全比照 `048_club_todos.sql` 的寫法（`club_id=current_club_id()` 查看、`is_club_tier()` 寫入，分成 select/insert/update/delete 四條 policy，比早期 member_care 用的單一 FOR ALL policy 寫法更新）；② `types/index.ts` 新增 `IouReceipt`/`IouItem`/`IouStatus` 型別；③ 新增 `FeatureKey` 分類 `G1_iou`（`features.ts` 預設關閉、`FeatureFlagsView.vue` 新增「捐獻」分組，標籤「IOU 捐獻收據追蹤」）；④ 新增 [`stores/iou.ts`](src/stores/iou.ts) CRUD；⑤ 新增 [`views/club/IouView.vue`](src/views/club/IouView.vue)（`/club/iou`）：4 格統計卡（總筆數/待開/已開/本月新增，抓全部資料不受篩選影響，跟 vivian 一致）、月份+狀態篩選＋搜尋（比對 donor_name/item/receipt_payee/note）、**按月分組**表格（比照 vivian 用 div-grid 卡片列，不是舊版 `<table class="card-table">` 寫法，跟 `DistrictCalendarView.vue` 的月份分組樣式更接近；手機版用 `data-label::before` 做卡片化，跟其餘全站表格手法一致但獨立寫的 CSS）、收據狀態徽章可點擊直接切換待開立/已開立（`club_admin`/`club_secretary` 才能點）、新增/編輯/刪除彈窗、Excel 匯出（沿用 `RosterView.vue` 的 `xlsx` 寫法）；⑥ [`router/index.ts`](src/router/index.ts) 掛 `G1_iou` feature flag；⑦ [`TopMenu.vue`](src/components/layout/TopMenu.vue) 在「潛在社友」後面加「💰 IOU」連結。本機沒有真實 Supabase 連線，用暫時掛 `window.__pinia`/`window.__router`（已還原，未進 commit）模擬 4 筆假資料，瀏覽器裡確認過：4 格統計卡數字正確、按月分組＋每組合計/待開/已開小計正確、搜尋篩選正確即時更新分組、新增彈窗欄位齊全、`club_member` 角色看不到新增/編輯按鈕但看得到清單跟匯出（欄位數會跟著少一欄，不會空一格），`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。**待辦：跟社友關懷一樣，資料庫要跑新 migration**（049，這次是全新表不是補接線）**+ 開 feature flag**，詳見下方待辦；這個 commit 也還沒 push，等使用者確認。

> 最後更新（上一輪）：2026-07-11（第六十五輪，**社友關懷收尾：選單顯示中英文名 + 儀表板改成 vivian 版面的獨立卡片**——延續第六十三輪的社友關懷功能，使用者這輪要求兩件事，**都本機驗證通過，尚未 push**：① **選單中英文名**：`MemberCareView.vue` 的「社友」下拉選單跟清單「姓名」欄，比照全站既有慣例（`OfficersView.vue`/`AttendanceView.vue` 早就有的 `nick_name ? `${nick_name}（${name}）` : name` 寫法），有英文名時顯示「英文名（中文名）」，沒有就只顯示中文名，新增 `memberLabel()` 共用函式（`aeff8e2`）。② **儀表板需關懷社友改成獨立卡片**：使用者問「vivian 版本是否會在儀表板顯示」，查證後發現 vivian 原型的 `p-dash` 確實有一張獨立「🤝 需關懷社友」卡，跟「⏰ 待辦提醒」左右並排（`rotary3481_platform_12.html` 第 705-708 行），抓出席率 <80% 前 6 名、<60% 標紅「🚨需關懷」／60~79% 標黃「⚠️注意」，每列可直接「✏️ 記錄」。原本第六十三輪只是把按鈕加在既有「低出席率警示（&lt;75%）」表格裡，這輪改成完全比照 vivian：`dashboard.ts` 新增 `needsCare` 欄位（獨立查詢 `member_attendance_rate` rate&lt;80、limit 6），`DashboardView.vue` 把「待辦提醒」跟新的「需關懷社友」卡包進 `.two-col` 並排，「低出席率警示（&lt;75%）」表格拿掉重複的記錄按鈕、恢復純顯示（`2796364`）。兩次都用暫時掛 `window.__pinia`/`window.__router`（已還原）模擬資料，瀏覽器裡確認過：中英文名正確顯示（含英文名為空時只顯示中文）、需關懷卡片跟待辦提醒左右並排、紅/黃徽章配色正確、`club_member` 角色看得到清單但沒有記錄按鈕。`vue-tsc --noEmit`＋`npm run build` 皆通過。**待辦：這兩個 commit（`aeff8e2`、`2796364`）都還在本機，使用者說「先不要」push，之後要記得問一次要不要推上去。**

> 最後更新（上一輪）：2026-07-11（第六十三輪，**新增「社友關懷」（D4_care）**——延續第六十一/六十二輪的儀表板落差評估，補上最後一項「需關懷社友」。**這項功能其實從很早的 `002_roster_members.sql` 就已經建好 `member_care` 表跟 RLS（`care_type`：生日/生病/喜事/喪事/其他，寫入限 `club_admin`/`club_secretary`，同社任何角色可查看），`types/index.ts` 也早就有 `MemberCare` 型別，`features.ts`／`FeatureFlagsView.vue` 也早就有 `D4_care`（標籤「社友關懷」，預設關閉）——只是從來沒有接上任何 store／頁面，這輪才把這條線接完整**：① 新增 [`stores/memberCare.ts`](src/stores/memberCare.ts) 基本 CRUD；② 新增 [`views/club/MemberCareView.vue`](src/views/club/MemberCareView.vue)（`/club/care`，掛 `D4_care` feature flag），列出全社關懷紀錄（姓名/類型/日期/備註，依日期新到舊排序）＋類型篩選＋新增/編輯/刪除彈窗（社友從名冊下拉選，`club_admin`/`club_secretary` 才看得到管理按鈕，一般社友唯讀，跟 RLS 一致）；③ [`TopMenu.vue`](src/components/layout/TopMenu.vue) 在「潛在社友」後面加上「🤝 社友關懷」連結；④ **比照 vivian 檔案的儀表板行為**：[`DashboardView.vue`](src/views/DashboardView.vue) 既有的「低出席率警示（&lt;75%）」清單每列加一顆「✏️ 記錄關懷」按鈕（`club_admin`/`club_secretary` 才看得到），點了直接開一個輕量版彈窗，帶入該社友、預設類型「其他」、備註自動帶入「出席率偏低（N%），已聯繫關懷」，存檔後寫進同一張 `member_care` 表，不用另外跳頁。**這輪完全沒有新增/修改 migration**，資料庫端東西都已經在，唯一要做的是待辦事項第一項。本機沒有真實 Supabase 連線，用暫時在 `main.ts` 掛 `window.__pinia`/`window.__router`（驗證後已還原，未進 commit）搭配模擬 Pinia state，在瀏覽器裡實測過：① 儀表板「✏️ 記錄關懷」按鈕開窗、欄位正確、按鈕只有管理角色看得到；② `/club/care` 列表正確依 `member_id` 對回名冊姓名、類型徽章配色（生日綠/喜事黃/生病紅/喪事深藍/其他灰）、編輯彈窗預填正確、刪除按鈕存在；③ 切換成 `club_member` 角色後「+ 新增」「編輯」按鈕都消失，但清單本身看得到，跟 RLS 的 `care_select`（同社任何角色可查看）一致。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。**待複查**：上正式站後麻煩到「功能開關管理」把 `D4_care` 打開，再實測一次新增/編輯/刪除跟一般社友唯讀。

> 最後更新（上一輪）：2026-07-11（第六十二輪，**新增儀表板「待辦提醒」小工具**——延續上一輪儀表板落差評估，補上剩下兩項裡範圍較小的一項（另一項「需關懷社友」還是卡在完全沒做的社友關懷 D4_care，範圍較大先不做）。新增 [`048_club_todos.sql`](supabase/migrations/048_club_todos.sql)（`club_todos` 表，RLS 比照 `club_history` 寫法：全社友可查看、寫入限 `club_admin`/`club_secretary`），[`stores/clubTodos.ts`](src/stores/clubTodos.ts) 基本 CRUD，DashboardView.vue 加上「⏰ 待辦提醒」區塊（放在統計卡跟公告欄之間，比照 vivian 的位置）。**核心邏輯完全比照 vivian 檔案的 `CUSTOM_TODOS`**：任務名稱(必填)/說明(選填)/截止日期(選填)/緊急程度(🔵一般/🟡提醒/🔴緊急)，**有設截止日期時緊急程度會動態換算蓋過手動選的等級**（逾期或當天=紅色、剩1-3天=紅色、剩4-7天=黃色），做完直接刪除、不做「已完成但保留」的狀態（vivian 也是這樣設計）。點任務可編輯，只有 `club_admin`/`club_secretary` 看得到新增/編輯按鈕，一般社友唯讀。因為本機沒有真實 Supabase 連線，另外用一份獨立靜態 HTML 模擬 5 筆不同緊急程度的任務資料視覺驗證過動態變色邏輯正確（`preview_inspect` 確認實際色碼），`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。**待複查**：上正式站後麻煩測試新增/編輯/刪除任務，並確認一般社友帳號看不到新增按鈕但看得到清單。

> 最後更新（上一輪）：2026-07-10（第六十一輪，**社端儀表板比照 vivian 檔案補三項**——使用者要求評估儀表板跟 vivian 檔案（p-dash）的落差，比對後發現現有儀表板其實已經比 vivian 多做了不少實用內容（地區/社內公告欄、低出席率警示、待追蹤潛在社友），不建議整個換掉，改成保留現有內容、補上 vivian 有但目前缺的三項（其餘兩項「待辦提醒」「需關懷社友」列為之後的獨立功能，前者要新建資料表、後者卡在完全沒做的 D4_care，範圍較大，這輪先不做）：① **統計卡可點擊跳轉**：本月例會數→例會管理、本月/本年度出席率→出席月報、社友人數→社友名冊、新增的總監獎項等級卡→總監獎項申請表，用 `.stat-card.clickable` + `router.push`，沒有權限的角色點了會被路由守衛彈回儀表板（不是壞掉，只是靜默擋下，這輪沒有額外做「依角色隱藏卡片」的判斷）；② **新增「總監獎項等級」統計卡**：直接沿用第五十八輪做好的 `getAwardLevel()`，抓本社的送出分數換算等級徽章，未送出一律顯示「尚未達標」；③ **標題列加上社名＋年度**：`{{ auth.clubName }} · {{ GOVERNOR_AWARD_YEAR_TERM }} 年度`，只在社端顯示（地區視角維持原樣，vivian 的年度概念是社端專屬）。`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。**待複查**：上正式站後麻煩確認各張卡片點擊後導向的頁面正確，且總監獎項等級卡的分數/等級跟「總監獎項申請表」頁一致。

> 最後更新（上一輪）：2026-07-10（第六十輪，**修復：地區視角選單缺「地區通訊錄」入口**——使用者實測上一輪的匯出功能時發現地區介面選單裡根本沒有「地區通訊錄」可以點進去。追查是 [TopMenu.vue](src/components/layout/TopMenu.vue) 的既有 bug，跟這次匯出功能無關：`navItems` 的地區視角分支（`auth.isDistrictView`）本來就沒有加 `H1_directory` 這個連結判斷，只有社端分支才有，`DirectoryView.vue` 頁面本身其實一直都支援地區管理員（「管理社團」按鈕、上一輪新加的匯出按鈕都已經用 `auth.isDistrictView` 判斷過），只是選單漏掛連結、點不進去。已在地區視角選單補上「📖 地區通訊錄」（放在「總監獎項統整」跟「社友活動」之間），`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。

> 最後更新（上一輪）：2026-07-10（第五十九輪，**地區獎項匯出報表**——延續上一輪的落差比對，補上 vivian 檔案有、現在系統沒有的「一鍵匯出 Excel」功能。沿用 [RosterView.vue](src/views/roster/RosterView.vue) 既有用的 `xlsx`（SheetJS）套件跟寫法（前端純用已載入的資料組表，不用另外打 API），加了三個匯出按鈕：① [GovernorAwardSummaryView.vue](src/views/admin/GovernorAwardSummaryView.vue)「📊 匯出全區獎項達標Excel」，欄位社名/分區/組別/狀態/總分/等級/更新時間，**匯出的是目前畫面上篩選後的結果**（尊重上一輪新增的分區/等級/搜尋篩選，不是永遠匯出全部）；② [AdminAttendanceView.vue](src/views/admin/AdminAttendanceView.vue)「📊 匯出全區月報Excel」，依分區排序展開所有社，欄位跟畫面上的表格一致（例會場次/應出席/實際出席/出席率，`B6_membership_report` 開啟時再加 RI半年報基準/當月人數/淨成長/年齡分布）；③ [DirectoryView.vue](src/views/directory/DirectoryView.vue)「📥 匯出例會通訊錄Excel」，只有地區管理員看得到（跟旁邊既有的「管理社團」連結同一組權限判斷），欄位分區/社名/社長/執秘/電話/Email/例會頻率/例會時間/地點/地址/訂位電話。三個匯出函式都用 Node 腳本模擬過資料寫入 xlsx 再讀回驗證過欄位正確，`vue-tsc --noEmit`＋`npm run build` 也都過。**待複查**：上正式站後麻煩實際點三個匯出按鈕，確認下載下來的 Excel 檔案打得開、欄位資料正確。

> 最後更新（上一輪）：2026-07-10（第五十八輪，**補齊三項跟 vivian 檔案（`vivianrotary-cloud/3481rotarymember` 原型）有落差的既有功能**——上一輪比對後列出三個「已經做了但不完整」的落差，這輪依序補齊：① **總監獎項等級分類**：新增 [`getAwardLevel()`](src/data/governorAwardCriteria.ts)，比照 vivian 檔案的門檻（典範≥55/優質≥40/活力≥25/尚未達標），[GovernorAwardSummaryView.vue](src/views/admin/GovernorAwardSummaryView.vue) 加上 4 格等級統計卡＋分區/等級篩選＋搜尋社名＋表格與詳情面板都加等級徽章，[GovernorAwardFormView.vue](src/views/club/GovernorAwardFormView.vue)（社端申請表）也加一張「目前等級」即時徽章卡，填分數的當下就能看到目前落在哪一級；未送出/草稿一律歸「尚未達標」（等級是送出分數換算出的達成狀態，沒送出談不上達成）。② **潛在社友摘要統計卡**：[ProspectiveView.vue](src/views/roster/ProspectiveView.vue) 加上追蹤中/已邀請/已入社/需跟進（超30天未聯繫，紅字提示）四格統計卡。③ **出席視覺化進度條**：[AttendanceMonthlyView.vue](src/views/meetings/AttendanceMonthlyView.vue) 既有的出席率長條圖補上 60% 最低門檻標線（紅色直線+文字），未達標紅色/達標綠色；[AttendanceView.vue](src/views/meetings/AttendanceView.vue)（單場例會逐人登記頁）原本只有一排徽章，改成 3 格統計卡（社員人數/本次出席率含同款門檻進度條/全社平均出席率）。三項都因為本機沒有真實 Supabase 連線登入不了，另外做了一份獨立靜態 HTML 對照真實 CSS 變數視覺驗證過（等級徽章配色、進度條門檻線+紅綠變色），`vue-tsc --noEmit`＋`npm run build` 皆已驗證通過。**待複查**：上正式站後麻煩確認這幾處新增的卡片/徽章/進度條顯示正常。

> 最後更新（上一輪）：2026-07-10（第五十七輪，**地區行事曆改成手動匯入資料，Google Drive 自動同步暫緩**——使用者問了改用 Make.com 做自動同步會不會比較簡單（Make.com 的 Google Drive 連接是 OAuth 授權，不用像現在這樣手動去 Google Cloud Console 申請 API Key，這點確實比較省事，但 Make.com 免費方案有每月操作次數限制，且視覺化模組要處理像這份 Excel「地點」欄位標題夾雜全形空白這種怪癖會比較麻煩，可能還是要另外接 Code 模組），討論後使用者決定**這段自動同步先不做**，改成直接把已經解析驗證過的 51 筆 Excel 資料用 `INSERT` 寫死進資料庫（新增 [`047_district_calendar_seed.sql`](supabase/migrations/047_district_calendar_seed.sql)），讓「地區行事曆」頁面先有真實資料可用。原本規劃的 Google Drive API + Edge Function + pg_cron 自動同步程式碼（第五十五輪寫的）維持留在 repo 裡沒有刪除，之後要恢復自動更新（不管是自建方案還是改用 Make.com）都可以直接接上去。**待使用者到 SQL Editor 執行 047**（需在 046 之後執行）。

> 最後更新（上一輪）：2026-07-10（第五十六輪，**地區行事曆版面比照原型 `vivianrotary-cloud/3481rotarymember`（`rotary3481_platform_12.html`）重做**——上一輪先做出來的是簡化版單欄卡片，這輪改成跟原型一致的「月份分組＋倒數徽章」呈現：月份深藍色標題列（顯示年月+項數）、每筆活動一列（左：日期/時段，中：標題/📍地點·日期範圍，右：依緊急程度變色的倒數徽章＋加入行事曆按鈕）。徽章邏輯完全比照原型：已過期灰階＋整列淡化不顯示按鈕、進行中紅、7天內金、30天內綠、更遠淺藍底。因為本機沒有真實 Supabase 連線跑不了登入後的頁面，改用使用者提供的實際 Excel 檔案解析出的 51 筆真實資料，做了一份獨立的靜態 HTML 視覺驗證（CSS 直接對照 [`DistrictCalendarView.vue`](src/views/DistrictCalendarView.vue) 的 `<style scoped>`），在瀏覽器裡實測「即將到來/全部/已過期」三個分頁 + 手機版排版都正常，才確認合併。`vue-tsc --noEmit` 已重新驗證通過。**待複查**：上正式站後麻煩確認實際登入畫面跟這次的視覺驗證一致（理論上應該一致，因為 CSS 是直接對照的，但沒有用真帳號跑過完整登入流程）。

> 最後更新（上一輪）：2026-07-10（第五十五輪，**新增「地區行事曆」+ 每日自動從 Google Drive 同步**——使用者提供地區辦公室的行事曆 Excel（存在共用 Google Drive 資料夾，檔名含日期版本、每次更新會整份重新上傳），要求平台每天自動抓取顯示，不用手動維護。這輪新增：① [`DistrictCalendarView.vue`](src/views/DistrictCalendarView.vue) 前端頁面（即將到來/全部/已過期篩選＋逐筆 .ics 下載），掛新 Feature Flag `F1_district_calendar`；② `district_calendar_events`／`district_calendar_sync_log` 兩張表（見 [`046_district_calendar.sql`](supabase/migrations/046_district_calendar.sql)），只開放 SELECT，寫入僅限 Edge Function 用 service role key，一般使用者（含地區管理員）都不能直接改；③ [`sync-district-calendar`](supabase/functions/sync-district-calendar/index.ts) Edge Function：用 Google Drive API v3 依 `modifiedTime` 找資料夾內最新的 xlsx、下載、用 SheetJS 解析、整批覆蓋寫入（沒有穩定唯一 ID 可比對，所以用整批清空重寫而非逐筆 upsert；**只有解析成功且非空才會覆蓋，抓取/解析失敗一律保留舊資料 + 寫一筆失敗紀錄**，前端頁面也會把最近一次失敗顯示成警示 banner）。實作前有把使用者提供的實際檔案（`2026-27年度地區重要行事曆-20260626版.xlsx`）抓下來實測解析邏輯，抓到一個真實 bug：檔案裡「地點」欄位標題實際存的是「地　　點」（中間夾全形空白，不是乾淨的「地點」二字），原本的欄位比對邏輯完全比對不到，會讓每筆活動的地點都變空值——已修正成比對前先去除所有空白字元，重測 51 筆資料全部正確解析。`vue-tsc --noEmit`／`npm run build` 皆已驗證通過。**待使用者完成的部分（Claude 無法代勞）**：詳見下方待辦。

> 最後更新（上一輪）：2026-07-10（第五十四輪，**EDM 產生器改成 Facebook 行銷文案 + 每社每日上限 2 次**——使用者說這個功能是要給各社做 FB 行銷文案用的，不是正式電子報，prompt 改成短文案（100~150字）、`max_tokens` 從 2048 降到 600；另外新增 `edm_generations` 記錄表，Edge Function 呼叫 Anthropic 前先查本社今天（台北時區）已成功產生幾次，達 2 次就擋掉不打 API，**migration 已執行、Edge Function 已重新部署完成 ✅**，詳見下方待辦）

> 最後更新（上一輪）：2026-07-10（第五十三輪，**移除「服務計劃總覽」分頁 + 「社的歷程」暫時拿掉秘書欄位**——使用者指出服務計劃總覽的內容已經在「社的歷程」裡呈現，重複了，要求整頁拿掉；「當年秘書」因為一直沒有資料來源，先從表單/表格移除但 DB 欄位保留，之後有資料再加回來，純前端改動、不需要 migration，`vue-tsc`/`build` 皆已驗證通過）

> 最後更新（上一輪）：2026-07-10（第五十二輪，**用社史文件補「友好社」缺漏資料**——使用者要求從已讀取的 P17/P21 社史文件裡找出提到的友好社/姊妹社結盟關係，自動補進 `sister_clubs` 表，這輪整理出 6 筆（鹿兒島北姊妹社、礁溪扶輪社、花蓮東南扶輪社、新竹縣和平扶輪社、Titiwangsa扶輪社、八德聯誼會），**migration 已由使用者執行完成 ✅**，詳見下方待辦）

> 最後更新（上一輪）：2026-07-10（第五十一輪，**「歷屆社長」改名「社的歷程」+ service_plan 欄位改名 notable_events（重要記事）+ 用《P17台北市和平扶輪社歷史軌跡.docx》填入第1~30屆逐年大事記**——延續上一輪只匯入社長名單，這輪使用者提供第二份文件（逐年逐日大事記，屆別分界清楚，不像 P21 那份跨頁相片集有歸屬不明問題），把「社區服務計劃」欄位重新定位成「重要記事」並填入實際內容，**migration 已由使用者執行完成 ✅**，詳見下方待辦）

> 最後更新（上一輪）：2026-07-10（第五十輪，**和平社社史文件《P21歷屆社長及重要服務成果.docx》讀取評估 + 第1~30屆社長名單匯入 SQL**——使用者提供一份 2020 年做的社史簡報（15頁、152張照片），要評估怎麼加進「歷屆社長／服務計劃總覽」，這輪只做了社長名單，**migration 已由使用者執行完成 ✅**，社區服務事蹟因排版關係無法安全自動歸屆，先留白，詳見下方待辦）

> 最後更新（上一輪）：2026-07-10（第四十九輪，**全平台表格改成手機卡片式版型**——使用者要求整個平台更適合手機瀏覽，選了「全面改成手機卡片式」，這輪把全站所有 `<table>`（約 20 個頁面、35+ 張表）加上手機寬度（≤700px）自動轉成一列一張卡片（label:value 堆疊）的版型，取代原本「整張表左右滑動」的閱讀方式，詳見下方待辦）

> 最後更新（上一輪）：2026-07-10（第四十八輪，**出席月報表格配色比照使用者提供的 RI 半年報 Excel**——直接從使用者的 `2025-26年度出席率.xlsx` 讀出表頭的實際顏色代碼，套到社端／地區端出席月報的表格與表單區塊上，詳見下方待辦）

> 最後更新（上一輪）：2026-07-10（第四十七輪，**「出席月報」與「社友增減月報」合併成一個頁面，改用應出席/實際出席人數 + 新增例會快速補登**——使用者要求把上兩輪的兩個獨立月報頁面合併、拿掉「計入人次」的呈現方式改用應出席/實際出席，並且要能在月報頁直接補登沒走「新增例會」流程的出席資料，詳見下方待辦）

> 最後更新（上一輪）：2026-07-10（第四十六輪，**新增「社友增減月報」（比照使用者提供的既有 RI 半年報 Excel 表頭）**——使用者提供一份既有的 Google 表單／Excel 匯出檔（`2025-26年度出席率.xlsx`，每月一個分頁，每列一個社，記錄 RI 半年報基準人數／當月人數／淨成長／年齡分布／例會次數／出席率），要求各社管理頁面比照表頭新增填寫表格，地區能看到全區總表，詳見下方待辦）

> 最後更新（上一輪）：2026-07-10（第四十五輪，**新增「出席月報」（各社當月出席率 + 歷月查詢 + 地區月報）**——使用者要求各社儀表板要顯示當月出席率、可查詢各月份出席率，並且要讓地區也能查詢各社各月出席率，詳見下方待辦）

> 最後更新（上一輪）：2026-07-07（第四十四輪，**LINE 官方帳號通知 Demo（給和平社展示用）**——使用者想讓和平社實際看到「LINE 通知」這個構想可行，這輪做了最小可動版本：人工核對手機號碼綁定 + 測試訊息發送，安全性留到正式導入前再加強，詳見下方待辦，**需要使用者到 LINE Developers Console 申請頻道 + 用 Supabase CLI 部署 2 支 Edge Function，Claude 無法代勞**）

> 最後更新（上一輪）：2026-07-07（第四十三輪，**開始製作兩份 SOP 文件（PDF），文件二中途被使用者打斷、換電腦/帳號接手**——使用者要把「怎麼從0建置這個平台」跟「各功能怎麼操作」整理成給人看的 SOP，詳見下方待辦與 `docs/sop/PROGRESS.md`）

> 最後更新（上一輪）：2026-07-07（第四十二輪，**活動報名三項修正：補建舊例會報名/手動活動可選僅本社招募/新增地址欄位**——使用者上正式站測試第四十一輪功能後回報三個問題，這輪一次修完，詳見下方待辦）

> 最後更新（上一輪）：2026-07-07（第四十一輪，**例會自動同步「預計出席」報名統計**——使用者指出例會也需要像活動一樣統計預計出席人數，這輪讓「新增例會」時自動在活動報名系統建立一筆對應紀錄，但範圍限定本社、不比照活動全地區公開，詳見下方待辦）

> 最後更新（上一輪）：2026-07-07（第四十輪，**社友活動報名 + 查詢功能 Phase 1 實作完成**——延續第三十九輪規劃好的資料模型，這輪把「活動＋報名＋社友查詢頁」寫成程式碼，Email/LINE 通知（Phase 2/3）仍未開始，見下方待辦）

> 最後更新（上一輪）：2026-07-06（第三十九輪，**修手機版 TopNav 換行破版 bug + 選單合併「本社歷程」**——延續第三十八輪的頂部選單改版：① 手機窄螢幕（375px）下標題文字沒設 `white-space:nowrap`，會換成兩行撐高 TopNav，導致下面用 `position:fixed` 靠 `--topnav-h` 定位的 TopMenu 疊到標題上面，已修好（[`TopNav.vue`](src/components/layout/TopNav.vue) 加上 ellipsis 截斷 + flex 縮放規則）；② 使用者要求把「友好社／歷屆社長／服務計劃總覽」三個原本各自獨立的選單項目，順序改成「歷屆社長、服務計劃總覽、友好社」並合併成一個下拉群組「本社歷程」，減少選單一次要塞的項目數，已在 [`TopMenu.vue`](src/components/layout/TopMenu.vue) 改好並用假 Pinia state 驗證下拉順序正確）

> 最後更新（上一輪）：2026-07-06（第三十八輪，**選單從左側 Sidebar 改成頂部橫向選單，配色改用地區原始規劃的深藍/古銅金**——使用者提供另一個 repo `vivianrotary-cloud/3481rotarymember`（`rotary3481_platform_12.html`，7388 行單檔靜態原型）作為「原始規劃」參考，裡面已經定義好配色（`--navy:#1C2B4A`／`--gold:#B8892A`，比現有配色更深沉，不是原本的寶藍/亮金）跟頂部選單的版面（跑馬燈公告列 + 橫向選單，選單背景整條深藍、超出項目用「橫向捲動＋左右箭頭」而不是下拉收合）。這輪把這套版面套進實際的 Vue app：新增 [`src/components/layout/TopMenu.vue`](src/components/layout/TopMenu.vue) 取代原本的 [`src/components/layout/Sidebar.vue`](src/components/layout/Sidebar.vue)（已刪除），選單項目、角色/feature-flag 判斷邏輯原封不動照抄 Sidebar 的規則，只是排列方式從直向清單改成橫向可捲動列；原本地區/各社共用的「進階設定」摺疊區塊改成橫向的下拉選單（用 `Teleport` 掛到 `body`，位置用 `getBoundingClientRect()` 動態算，避免被 `.tnav-scroll` 的 `overflow-x:auto` 連帶裁切掉——這是本輪唯一抓到的真實 bug，第一版直接把下拉選單放在 scroll 容器裡面會被裁掉看不到，改用 Teleport 才修好）。`App.vue` 的 CSS 變數（`--navy`/`--gold`等）整組換成原始規劃的配色，`TopNav.vue` 拿掉手機版漢堡選單按鈕（改成橫向捲動後手機不需要漢堡選單，跟原始規劃行為一致），連帶刪除只有這兩個檔案在用的 [`src/stores/ui.ts`](src/stores/ui.ts)（已無其他呼叫端）。使用者這輪明確要求「先搬選單＋配色，功能之後再陸續加」，所以 IOU／GG案／月報／出席管理／目標社友／地區行事曆這些原始規劃裡已經做出來的新功能**這輪沒有動**，Vue app 裡目前還沒有對應頁面）

---

## ⚠️ 待辦

**【第一百零五輪，優先】地區知識庫——待使用者完成部署＋實際上傳兩份測試 PDF（Claude 這輪還是連不到這個專案的 Supabase CLI，沒辦法自己來）**：

1. 到 SQL Editor 執行 [`060_knowledge_base.sql`](supabase/migrations/060_knowledge_base.sql)（**編號改成 060，因為推送時跟並行 session 的委員會/主要幹部那幾輪撞在一起，對方先用掉了 059**，如果你的專案裡還沒有 059_club_officers_primary_role.sql，記得那份也要先執行）——這個 migration 會啟用 `pg_trgm` 擴充功能、新增 `knowledge_articles` 表跟它的 RLS、**新增 `knowledge-pdfs` 這個 Storage bucket 跟它的 4 條 RLS policy**、新增 `L1_knowledge_base` feature flag（預設關閉）。**如果 SQL Editor 執行 Storage 相關語法失敗**（少數 Supabase 專案的 SQL Editor 對 `storage.buckets`/`storage.objects` 沒有直接寫入權限），改用 Dashboard 的 Storage 頁面手動建立一個叫 `knowledge-pdfs` 的 bucket（不公開），然後把 migration 檔案裡最後那四條 `CREATE POLICY ... ON storage.objects` 語法另外貼到 SQL Editor 執行。
2. 到「功能開關管理」把「地區知識庫（測試中）」打開
3. **實測上傳**：地區管理員登入後，選單「地區通訊錄」旁邊會多一個「知識庫（測試中）」，點進去右上角有「+ 上傳文件」（只有地區管理員看得到）。**先拿使用者提供的這兩份 PDF 測試**（本機路徑在 `~/Downloads/5.扶輪知識/`）：
   - `扶輪用語與詞彙 英中對照表-20210504F.pdf`
   - `Rotary Basics 扶輪基礎_社員的參考指南.pdf`

   上傳時填標題（可以直接用檔名去掉副檔名，表單會自動帶入）、分類/標籤/簡介隨意填或留空，按上傳前應該會先跳出「正在讀取 PDF 內文以建立搜尋索引...」幾秒鐘（這兩份檔案 Claude 這輪已經用 Node 直接測過 pdfjs-dist 解析得出來，分別能抽出 29,817／16,045 字元的正常文字，理論上瀏覽器端一樣沒問題），完成後列表要出現這篇文件、標題可以點開新分頁看到原始 PDF。
4. **實測搜尋**：上傳完那兩份之後，在搜尋框打文件標題以外、只有內文才有的關鍵字（例如扶輪用語對照表裡的某個特定詞彙），確認搜得到（代表全文搜尋真的在比對 `content_text`，不是只比對標題）。
5. **社友視角確認**：換一個一般社友或社長帳號登入，確認選單也看得到「知識庫」、能搜尋瀏覽、能點開 PDF，但**看不到**「+ 上傳文件」按鈕。
6. 剩下 30-40 份裡的其他文件，等這兩份測試沒問題後，地區管理員可以直接用同一個上傳表單陸續加進去，不用再麻煩 Claude 一份一份處理。
7. **CLI 權限問題還沒解決**：這台機器登入的 Supabase CLI 帳號已經不再是這個專案（`xdwqrgthsxyzclnjlmvy`）的成員了，`supabase link` 直接被拒絕（第八十九輪就發現了，這輪還是一樣）。

**【第九十七輪，未來功能，先記錄不急著做】Email 通知設定支援非 Gmail 信箱**：

使用者問「如果別人要用不是 Gmail 系統的，可以怎麼處理」，先記錄下來之後再擴充，這輪沒有動任何程式碼。目前 `notify-meeting-created`／`send-test-email` 這兩支 Edge Function 的 SMTP 主機是寫死 `smtp.gmail.com:465`（見程式碼裡的 `new SMTPClient({connection: {hostname: 'smtp.gmail.com', ...}})`），`club_notification_channels` 表也只存 `email_from`/`email_app_password`，沒有主機/連接埠欄位，所以目前**只能用 Gmail**。討論過的方向：

- 「Email 通知設定」頁加一個信箱類型選單：Gmail／Outlook（Office365）／Yahoo 幾個常見的列出來，選了自動帶入對應主機/連接埠，使用者只要填帳號密碼；另外留一個「自訂 SMTP」選項給真的要用網域信箱的社自己填主機/連接埠/加密方式。
- 取捨：`club_notification_channels` 要新增 host/port/加密方式欄位，兩支 Edge Function 的寄信邏輯要從「寫死 Gmail」改成「讀這個社存的設定」，工作量比現在的 Gmail-only 版本大；如果只想先加 Outlook，改動會小很多（一個 Gmail/Outlook 二選一開關即可，不用做到自訂 SMTP 這麼完整）。
- 使用者還沒決定要哪個方向，之後有需要再回頭做。

**【第九十八輪，優先】例會自動發信通知（含勾選收件人＋手動加收件人＋主旨/內文亂碼修復＋回覆連結）——待使用者完成部署，這是目前最新最完整的版本（Claude 這輪還是連不到這個專案的 Supabase CLI，沒辦法自己來）**：

這是第八十九～九十八輪同一個功能的最終狀態，如果還沒部署過任何一輪的東西，直接照下面這份從頭做一次即可，**不用理會更早輪次提過的 Resend 步驟（已作廢）**：

1. 到 SQL Editor 依序執行 [`057_meeting_email_notify.sql`](supabase/migrations/057_meeting_email_notify.sql)（新增 `K1_meeting_email_notify` feature flag，預設關閉）、[`058_club_email_notifications.sql`](supabase/migrations/058_club_email_notifications.sql)（`club_notification_channels` 新增 `email_from`/`email_app_password` 兩欄）
2. 部署兩支 Edge Function（都會用到 `denomailer` 這個 Deno SMTP 套件透過 Gmail SMTP 寄信，不需要額外設定 secret，帳密是存在資料庫裡、每社各自輸入的）。**這輪 `notify-meeting-created` 又改了（新增手動收件人），不管之前有沒有部署過都要重新貼一次最新內容；`send-test-email` 這輪沒改，第九十五輪部署過的話不用重貼**：
   - `supabase functions deploy notify-meeting-created`
   - `supabase functions deploy send-test-email`
3. 到「功能開關管理」把「新增例會自動發信通知社友（測試中）」打開——這個開關同時控制「進階設定」選單會不會出現「Email 通知設定」入口，跟新增例會會不會真的觸發發信
4. **每個要用這個功能的社，自己的執秘/社長要做**：登入後到「進階設定 → Email 通知設定（測試中）」
   - 先到自己 Google 帳號開啟兩步驟驗證，再到 [Google 應用程式密碼頁面](https://myaccount.google.com/apppasswords) 產生一組 16 碼應用程式密碼（**不是**平常登入 Gmail 用的密碼）
   - 把 Gmail 帳號 + 應用程式密碼貼到「Email 通知設定」頁面存起來
   - 按「發送測試信」寄一封給自己，**確認測試信主旨、內文都顯示正常中文，不是一堆 `=e8=a6=aa=...` 的亂碼**（第九十四、九十五輪分別修的主旨/內文兩個 bug，之前沒修的版本測試信一樣會中招）
5. **實測**：確認本社社友名冊裡至少有一筆填了自己能收到信的 Email，新增一場例會，**表單裡應該會多一區「發信通知社友」的勾選清單，預設全部勾選**；取消勾選幾位、只留一兩位再儲存，應該只有還勾著的人收到信，**主旨（含社名/場次/日期）跟內文（場次/日期/主題/講師/講師電話/講師 Email/地點/備註，有填的欄位才會顯示）都要是正常中文**；信件最後應該有一個「回覆是否參加」的連結，點下去要能正常導到該場例會對應的活動詳情頁，且能用平台既有的報名/不克參加功能操作；**勾選清單下面的「其他收件人」文字框貼一組自己能收到信的 Email（跟社友清單無關），確認也會一起收到通知信**；全部取消勾選、也沒填其他收件人時儲存，應該跳「未勾選任何收件人，未發送通知信」不會真的寄信；社友名冊沒填 Email 的人不會出現在勾選清單裡；編輯既有例會**不會**觸發發信也不會顯示勾選區（只有新增才會）；本社沒設定 Gmail 帳密就新增例會，應該會跳出「尚未設定本社 Gmail 寄信帳號」的錯誤 toast，不會整個崩潰
6. **CLI 權限問題還沒解決**：這台機器登入的 Supabase CLI 帳號已經不再是這個專案（`xdwqrgthsxyzclnjlmvy`）的成員了，`supabase link` 直接被拒絕（第八十九輪就發現了，這輪還是一樣）。如果想恢復讓 Claude 直接用 CLI 部署/查資料庫（前幾輪都是這樣做的，比較快），需要用有權限的帳號重新 `supabase login`；不然之後每輪都要比照這幾輪，把 migration SQL 跟 Edge Function 程式碼整份交給使用者自己貼上執行。

**【第七十五輪】九宮格 — 待使用者部署 `list-apps` Edge Function**：

1. **到 Supabase Dashboard 部署 [`list-apps`](supabase/functions/list-apps/index.ts)**：Edge Functions → 新增函式，名稱填 `list-apps`，把檔案內容整份貼上。**不用新增 secret**，沿用已經設定好的 `ROTARYSSO_CLIENT_ID`/`ROTARYSSO_CLIENT_SECRET`。**不用關 JWT 驗證**（跟 `sso-login` 不同，這支函式預期呼叫者已登入，維持預設開啟即可）。
2. **`git push` 後 Cloudflare 會自動重新部署前端**（`AppLauncher.vue` 已經寫好，不需要額外環境變數）。
3. **實測**：正式站登入後點右上角九宮格圖示（登出按鈕左邊），確認清單正確顯示（4 個系統：扶輪信用稽核預警系統／WaHoot Rotary／扶輪會計大師／D3481 社務管理系統）、自己的 tile 標記「（目前）」藍框不可點擊、點其他 tile 會新分頁開啟對的網址、多開幾次選單確認有快取效果（不會每次都重新打 API）。

**【已結案】RotarySSO 登入取代帳密登入（第七十二～七十四輪）**：使用者已確認正式站登入流程完整跑通，`account_type='管理者'` 帳號、待審核流程、帳號管理頁指派社別、登出後可切換帳號都已驗證正常。**還沒做的後續決定**：要不要去 Supabase Dashboard → Authentication → Providers 停用 Email/Password 登入——這步 Claude 不會主動做，因為關掉之後還沒轉 SSO 的既有社友（尤其是用手機號碼登入、RotarySSO 沒有手機 claim 沒辦法自動比對到的一般社友）會直接登不進去，要使用者自行評估時機後手動關閉。

**【第六十六輪】IOU — 待使用者執行 migration + 開啟 feature flag**：**這次要跑 migration**（跟社友關懷不同，IOU 是全新的表，不是早期就建好只是沒接線）——到 SQL Editor 執行 [`049_iou.sql`](supabase/migrations/049_iou.sql)（新增 `iou_receipts` 表 + RLS），再到「功能開關管理」把 `G1_iou`（IOU 捐獻收據追蹤）從關閉切成開啟。兩步都做完，選單才會出現「IOU」連結。開啟後麻煩實測一次新增/編輯/刪除捐獻記錄、點收據狀態徽章切換待開立/已開立、Excel 匯出，並確認一般社友帳號看得到清單但看不到新增/編輯按鈕。

**【第六十三輪】社友關懷 — 待使用者開啟 feature flag**：**不需要執行 migration**（`member_care` 表跟 RLS 從第二輪就存在），只需要到「功能開關管理」（`/admin/features`，地區管理員專屬）把 `D4_care`（社友關懷）從關閉切成開啟，切換後選單才會出現「社友關懷」連結、儀表板才會出現「✏️ 記錄關懷」按鈕。開啟後麻煩實測一次新增/編輯/刪除關懷紀錄，並確認一般社友帳號看得到清單但看不到管理按鈕。

**【第六十二輪】待辦提醒 — 待使用者執行 migration**：**待使用者到 SQL Editor 執行 [`048_club_todos.sql`](supabase/migrations/048_club_todos.sql)**（新增 `club_todos` 表 + RLS），執行完儀表板的「⏰ 待辦提醒」區塊才會真正能用（前端程式碼已經 push，但沒有這張表會直接查詢失敗、清單一直顯示空的）。

**【第五十七輪】地區行事曆 — 先手動匯入資料，Google Drive 自動同步暫緩**：使用者問了 Make.com 做這段自動化會不會比較簡單（有道理，Make.com 的 Google Drive 連結是用 OAuth 點一點就好，不用自己去 Google Cloud Console 申請 API Key，值得列入之後選項），但決定**先不做自動同步這段**，改成直接把使用者提供的 Excel 資料寫進資料庫，讓頁面先有真實資料可用。

1. **新增 [`047_district_calendar_seed.sql`](supabase/migrations/047_district_calendar_seed.sql)**：把 51 筆行事曆資料（來自使用者提供的《2026-27年度地區重要行事曆-20260626版.xlsx》）直接用 `INSERT` 寫死進 `district_calendar_events`，同時補一筆 `district_calendar_sync_log`（`source_file_name` 備註「手動匯入，未啟用自動同步」），讓頁面的「最後同步」欄位不會是空的。**待使用者到 SQL Editor 執行**（要在 046 之後執行，因為要用到 046 建的表）。
2. **Google Drive 每日自動同步這段（Edge Function／pg_cron／Google API Key）先擱置**，程式碼已經寫好留在 repo 裡（[`sync-district-calendar`](supabase/functions/sync-district-calendar/index.ts)），之後行事曆要改版或想要恢復自動更新時再回頭做，屆時：
   - 若決定照原計畫用 Google Drive API + 自建 Edge Function：申請 Google API Key → Supabase Secrets 設定 3 組 → 部署 Edge Function → 排程 SQL（步驟見上一輪紀錄）
   - 若決定改用 Make.com：Make 建一個「Watch files in folder（Google Drive，OAuth 免申請 API Key）→ 解析 Excel → HTTP 模組呼叫 Supabase REST API upsert `district_calendar_events`」的 scenario，可以完全不用碰 Edge Function/pg_cron，但要注意 Make.com 的免費方案有每月操作次數上限，且解析邏輯（例如這次抓到的「地點」欄位標題夾雜全形空白的怪癖）在 Make 的視覺化模組裡比較難處理，可能要另外接一個 Code/Function 模組
3. **之後行事曆要更新怎麼辦**：目前這批資料是靜態寫死的，之後地區辦公室更新行事曆版本時，得再麻煩使用者提供新檔案、由 Claude 重新產生一份類似的 seed migration 執行，直到自動同步這段真正上線為止

**【第五十六輪之前】待使用者完成的舊步驟（已擱置，見上）**：

1. ~~申請 Google API Key~~ 擱置
2. ~~Supabase Dashboard → Edge Functions → Secrets 設定 3 組~~ 擱置
3. ~~SQL Editor 執行 `046_district_calendar.sql`~~ 已完成 ✅
4. ~~部署 Edge Function~~ 擱置
5. ~~設定每日排程（pg_cron）~~ 擱置，指令備份見上一版 HANDOFF 或 git log
6. **待複查（第五十七輪改成這個）**：`047_district_calendar_seed.sql` 執行後，麻煩上正式站確認「地區行事曆」選單項目跟頁面正常顯示 51 筆資料、地點欄位有值、.ics 下載能正確匯入手機行事曆

**【第五十四輪】EDM 產生器改 FB 行銷文案 + 每社每日 2 次上限** ~~migration 已寫好，待使用者執行 + 部署 Edge Function~~ **使用者已執行 migration + 重新部署 Edge Function 完成 ✅，待複查實測**：

背景：使用者確認 EDM 產生器實際用途是各社的 Facebook 行銷文案（不是正式電子報），會依各社狀況每天到每週發文頻率不等，問了一輪費用估算後，決定：① prompt 改成短文案；② 加上每社每日用量上限，避免費用/濫用失控。

1. **[`supabase/functions/generate-edm/index.ts`](supabase/functions/generate-edm/index.ts) prompt 改寫**：從「公關文案助手／EDM電子報」改成「社群小編／Facebook 貼文行銷文案」，`body` 明確要求控制在 100～150 字以內、可用表情符號、結尾可加 1～3 個 hashtag。`max_tokens` 從 2048 降到 600（短文案不需要這麼大的輸出上限，順便把單次最壞情況的費用也壓低）。
2. **新增每社每日 2 次上限**（[`supabase/migrations/045_edm_generations.sql`](supabase/migrations/045_edm_generations.sql)）：新表 `edm_generations` 只記錄「哪個社、什麼時候、成功產生過一次」，不存文案內容本身。Edge Function 在打 Anthropic API **之前**，先查本社在台北時區「今天」範圍內已成功產生幾次，達到 2 次就直接擋掉回傳 429（不會浪費 API 費用），成功產生後才寫入一筆紀錄。**只限制 `scope='club'`**（各社自己用的），`scope='district'`（地區視角用的）不受這個上限影響，因為使用者只提到「每社」。
3. **失敗不計次**：只有真的成功拿到 AI 回覆才會寫入 `edm_generations`，中途出錯（AI 服務掛掉、格式錯誤等）不會浪費使用者的每日額度。
4. **前端不用改**：[`stores/edm.ts`](src/stores/edm.ts) 本來就會把 Edge Function 回傳的 `{error: "..."}` 原樣顯示在畫面上（[`EdmGeneratorView.vue`](src/views/edm/EdmGeneratorView.vue) 第62行），429 擋下來的訊息「本社今日 EDM 產生次數已達上限（每日 2 次），請明天再試」會自動顯示，不需要額外改畫面。
5. **使用者已執行**：① Supabase SQL Editor 跑完 `045_edm_generations.sql`；② 用 Supabase CLI 重新部署 `generate-edm` Edge Function，都已確認完成 ✅。
6. **目前卡住、還沒辦法實測**：使用者回報「API 還沒串」——`generate-edm` 目前部署的環境還沒設定有效的 `ANTHROPIC_API_KEY`（或額度沒加值），所以呼叫 Anthropic 一定會失敗。**這連帶讓每日 2 次上限的邏輯也還測不了**：程式碼設計是「只有真的成功拿到 AI 回覆才會寫進 `edm_generations` 計次」（見上面第3點），API 還沒接通的狀態下永遠不會成功、永遠不會計次，所以現在測「連續產生 3 次」不會看到上限生效，是預期中的行為，不是 bug。**等使用者把 `ANTHROPIC_API_KEY` 設定好（Supabase Dashboard → Edge Functions → Secrets）之後**，才能真的測：① 正常產生一次確認文案是短版 FB 貼文（100~150字、有 hashtag）；② 連續產生 3 次確認前 2 次成功、第 3 次被擋且顯示「本社今日 EDM 產生次數已達上限（每日 2 次），請明天再試」；③ 隔天額度重置。

**【第五十三輪】移除「服務計劃總覽」+「社的歷程」暫拿掉秘書欄位** **純前端改動，程式碼已完成，無 migration 需執行**：

1. **移除「服務計劃總覽」**：使用者反映內容跟「社的歷程」重複（`notable_events` 上一輪改名後，兩頁本來就是同一份資料的完整版跟篩選版），要求整頁拿掉。刪除 [`ServicePlanOverviewView.vue`](src/views/club/ServicePlanOverviewView.vue)，[`router/index.ts`](src/router/index.ts) 移除對應路由，[`TopMenu.vue`](src/components/layout/TopMenu.vue) 的「本社歷程」下拉群組從 3 項變成 2 項（社的歷程、友好社）。
2. **「社的歷程」暫拿掉秘書欄位**：[`ClubHistoryView.vue`](src/views/club/ClubHistoryView.vue) 的表格欄位、新增/編輯表單都移除「當年秘書」——**這是使用者要求「先」取消，不是永久拿掉**，資料庫的 `secretary_name` 欄位本身沒有動，只是 UI 不再顯示/收集，之後有資料來源要恢復的話直接把表單欄位加回來就好，不需要重跑 migration。
3. **型別調整**：[`types/index.ts`](src/types/index.ts) 的 `ClubHistoryInsert` 把 `secretary_name` 改成非必填（`secretary_name?: string | null`），否則 `create()` 呼叫會因為 payload 少了這個欄位而型別檢查失敗。`ClubHistoryRecord`／`ClubHistoryUpdate` 沒有動，既有資料讀出來一樣有 `secretary_name` 這個 key（目前全部是 `null`）。
4. **驗證**：`npx vue-tsc --noEmit`、`npm run build` 皆通過（`ServicePlanOverviewView` 對應的 build chunk 已確認消失）。本機沒有真實 Supabase 連線可以測畫面，**麻煩使用者上正式站確認**：①「本社歷程」下拉不再有「服務計劃總覽」項目、直接連 `/club/service-plans` 網址應該導不到頁面；②「社的歷程」表格/新增/編輯畫面都不再顯示秘書欄位；③ 既有資料（含之前匯入的 30 筆）都還在，只是秘書欄位不顯示，沒有被清空。

**【第五十二輪】用社史文件補「友好社」缺漏資料** ~~migration 已寫好，待使用者執行~~ **使用者已在 Supabase SQL Editor 執行完成 ✅**：

背景：使用者要求把已經讀取過的兩份社史文件（P17逐年大事記、P21相片集）拿來比對「友好社」（[`sister_clubs` 表](supabase/migrations/031_sister_clubs.sql)）現有資料，缺的、能補的都自動補進去。

1. **收錄範圍的判斷**：只收錄文件裡明確用「友好社」「姊妹社」「聯誼會」這類結盟字眼、且點名具體對象的關係，共 6 筆：日本鹿兒島北扶輪社（姊妹社，1991.11.23）、礁溪扶輪社（1993.06.09）、花蓮東南扶輪社（1994.10.29）、新竹縣和平扶輪社（2012.11.14）、馬來西亞Titiwangsa扶輪社（2011.12.14）、八德聯誼會（與忠孝／仁愛／信義社共組，1994.01.25）。**故意排除**了「台北西區社」（本社的輔導社）跟「太平／永平／承平／三平扶輪社」（本社輔導成立的新社）——這些是創社輔導／傳承關係，跟同等地位的友好社締結性質不同，沒有跟著塞進 `sister_clubs`，如果社辦覺得也該收錄，需要另外決定要不要放進來、用什麼欄位描述這種上下關係。
2. **「礁溪扶輪社」全名是我推斷的**：兩份文件都只寫「礁溪社」這個簡稱（跟「花蓮東南社」「新竹和平社」等其他簡稱一樣），其中「花蓮東南扶輪社」「新竹縣和平扶輪社」在文件別處有出現過全名可以確認，但「礁溪社」全程沒有出現過全名，我照 Rotary 慣例補成「礁溪扶輪社」，**這個全名沒有文件依據，麻煩社辦確認正確全名**（remarks 欄位裡也註記了這一點）。
3. **「八德聯誼會」不是單一友好社**：它是本社與台北忠孝、仁愛、信義三個扶輪社共組的四社聯誼會（1994.01.25成立），跟其他 5 筆「兩社締結」性質不同，這次還是把它收進 `sister_clubs` 表（沿用第三十四輪使用者原本設計時就有把「八德聯誼會」列為範例的想法），`partner_name` 用「八德聯誼會（與忠孝／仁愛／信義社共組）」註明清楚，避免看起來像是跟一個名叫「八德聯誼會」的社締結。
4. **防重複做法**：`sister_clubs` 表本身沒有 `UNIQUE` 限制（不像 `club_history` 有 `UNIQUE(club_id, year_term)`），這次改用查詢層面的 `NOT EXISTS`（比對 `partner_name` 完全相同）防止重複插入——**如果社辦先前已經手動在「友好社」頁面用不同的名稱寫法輸入過同一個社**（例如寫成「新竹和平社」而不是「新竹縣和平扶輪社」），這個 migration 會判斷成不同筆而重複插入，執行前建議先看一下「友好社」頁面目前有哪些既有資料再決定要不要跑。
5. **已產出**：[`supabase/migrations/044_sister_clubs_history_backfill.sql`](supabase/migrations/044_sister_clubs_history_backfill.sql)。**待使用者到 Supabase SQL Editor 執行**，執行前建議先確認上面第 2、4 點。

**【第五十一輪】「歷屆社長」改名「社的歷程」+ 用 P17 文件填入逐年重要記事** ~~migration 已寫好，待使用者執行~~ **使用者已在 Supabase SQL Editor 執行完成 ✅**：

背景：接續上一輪只匯入社長名單，使用者這輪提供第二份文件《P17台北市和平扶輪社歷史軌跡.docx》（逐年逐日大事記，4頁純表格，134列，屆別分界清楚），並提出三個明確需求：① 「歷屆社長」頁面改名「社的歷程」；② 頁面呈現改成「以年度標示，顯示該年度社長、秘書」；③ 「社區服務計劃」欄位改名「重要記事」，並用這份文件的重要項目填入。

1. **P17 這份文件的資料品質比 P21 好很多**：純表格結構（1個表格、134列），每屆一個標題列（含屆數、社長姓名+職業分類、任期起訖日期），底下緊接該屆的逐日大事記（日期＋敘述），**屆別分界完全沒有 P21 那種跨頁相片交界處歸屬不明的問題**，可以直接照文件的屆別分段對應到既有 `year_term` 精準填入，信心度高，不像上一輪 P21 的服務事蹟被我判斷「有誤植風險」而保留空白。跟 P21 交叉比對，兩份文件的第 1~30 屆社長姓名/年度完全一致。
2. **「當年秘書」仍然沒有資料來源**：這兩份文件都完全沒有提到秘書姓名，`club_history.secretary_name` 欄位這次還是不會有值——UI 已經有欄位可以顯示/編輯，純粹是缺資料，要靠社辦手動補。
3. **欄位改名選擇保留內部欄位語意乾淨，不是只改 UI 文字**：把資料庫欄位 `service_plan` 實際 RENAME COLUMN 成 `notable_events`（而不是欄位名還叫 service_plan、畫面上硬顯示成「重要記事」），連帶 [`types/index.ts`](src/types/index.ts)、[`ClubHistoryView.vue`](src/views/club/ClubHistoryView.vue)、[`ServicePlanOverviewView.vue`](src/views/club/ServicePlanOverviewView.vue) 三處全部同步改名，`npx vue-tsc --noEmit` + `npm run build` 都已過。「服務計劃總覽」這個頁面名稱／路由本身**沒有**跟著改名（使用者只要求「歷屆社長」改名，服務計劃總覽維持原名，但欄位標題／說明文字同步改成「重要記事」以保持一致）。
4. **改名範圍**：頁面標題（`<h1>`）、[`TopMenu.vue`](src/components/layout/TopMenu.vue) 選單項目文字、新增/編輯彈窗標題、表格欄位標題、空清單提示文字、表單 label/placeholder，全部從「歷屆社長」/「社區服務計劃」換成「社的歷程」/「重要記事」。下拉選單群組名稱「本社歷程」**沒有改**（使用者只要求改「歷屆社長」這個子項目，跟母群組同名但不是同一個東西，沒有動它）。
5. **已產出**：[`supabase/migrations/043_club_history_notable_events.sql`](supabase/migrations/043_club_history_notable_events.sql)——先用 `IF EXISTS` 判斷再 `RENAME COLUMN`（可重複執行，欄位已改名的話會跳過），接著 30 筆 `UPDATE ... WHERE year_term = 'xxxx-xxxx' AND club_id = (SELECT id FROM clubs WHERE name = '台北市和平扶輪社')`，逐年大事記用 `$tag$...$tag$` dollar-quoting 包多行文字，不用擔心引號跳脫問題。**待使用者到 Supabase SQL Editor 執行**（要在上一輪 042 之後執行，因為 UPDATE 是針對 042 已建立的 30 筆年份紀錄做更新，不是新增）。
6. **待複查**：執行完 migration 後麻煩使用者實際點「社的歷程」頁面，確認：① 標題/選單文字都變成「社的歷程」；② 30 筆年份的「重要記事」欄位都有內容且排版正常（多行用 `white-space:pre-line` 呈現，沒有加項目符號，就是逐行日期+事件）；③ 「服務計劃總覽」頁面（頁名沒改，但欄位標題已改成「重要記事」）能正確篩出這 30 筆＋上一輪測試留的 2 筆真實資料。

**【第五十輪】和平社社史文件匯入「歷屆社長」** ~~migration 已寫好，待使用者執行~~ **使用者已在 Supabase SQL Editor 執行完成 ✅，第 1～30 屆社長名單已寫入，事後補社區服務事蹟仍待辦**：

背景：使用者提供和平社自己做的社史簡報《P21歷屆社長及重要服務成果.docx》（2020 年製作，15頁、152張照片），問要怎麼更有效地加進系統既有的「歷屆社長」「服務計劃總覽」功能（[`club_history` 表](supabase/migrations/032_club_history.sql)）。

1. **讀取方式**：這份 docx 的 XML 有 `<w:t>` 標籤沒有正常閉合（Word 容錯開啟、但嚴格 XML parser 會讀錯），`python-docx`／`unpack.py` 都讀不出內容，改用「遇到下一個 `<` 就截斷」的容錯 regex 直接讀 `word/document.xml` 才抓出全部文字。**之後如果還有和平社或其他社提供類似的舊版 Word 社史文件，可能會遇到同樣的問題**，可以參考這次的做法（regex 容錯截斷，不要直接信任 `</w:t>` 一定存在）。
2. **內容評估**：文件涵蓋**第 1～30 屆社長，無缺屆**（1990-1992 創社社長林明憲，到 2020-2021 李頒仁），每屆有屆數/年度/社長姓名＋扶輪頭銜與職業分類（CP=創社社長／PP=卸任社長／IPP=去年卸任／P=現任＋Insurance/Lawyer 這類職業分類），另外每個扶輪年度有 RI 社長主題標語（中英文），完全沒有「當年秘書」資料（`club_history.secretary_name` 這欄位這次匯入不會有值）。
3. **社區服務事蹟（152張照片圖說）這次沒有匯入**：文件排版是跨頁對開的相片集，很多活動照片的圖說夾在兩屆社長交界處（例如「授證十週年」的圖說出現在第7~9屆之間），光靠文字順序常常無法判斷屬於哪一屆——實測時我第一次憑位置猜 RI 年度主題對應年份就猜錯（2001-2002/2002-2003 兩屆的主題猜反了），代表這種「憑排版位置推斷年份」的做法不可靠，不適合直接寫進正式社史紀錄。跟使用者確認後，**這輪決定只匯入 100% 確定的社長名單，`service_plan`（社區服務計劃）欄位全部留空**，之後要麻煩和平社執秘/社長對照原始 docx，手動把每年度做過的服務事蹟整理進「歷屆社長」的編輯畫面。RI 年度主題標語這次也沒有匯入（現有 schema 沒有對應欄位，且如上述有誤植風險，決定不硬塞進 `service_plan` 混淆「服務計劃總覽」頁面的意義）。
4. **已產出**：[`supabase/migrations/042_heping_president_roster_seed.sql`](supabase/migrations/042_heping_president_roster_seed.sql)，用 `clubs.name = '台北市和平扶輪社'` 查 `club_id`，一次 INSERT 30 筆（`ON CONFLICT (club_id, year_term) DO NOTHING`，可重複執行、不會動到既有的 2025-2026／2024-2025 測試資料）。**待使用者到 Supabase SQL Editor 執行**。
5. **待複查**：第 1 屆的 `year_term` 存成 `'1990-1992'`（橫跨兩年），跟其他屆單一年度的 `'2025-2026'` 格式不一致——這是文件本身把創社頭兩年合併成同一屆社長呈現，不是我打錯，但畫面上排序／格式顯示要麻煩使用者確認一下 `'1990-1992'` 這種橫跨格式在「歷屆社長」表格排序（`ORDER BY year_term DESC`，字串排序）不會出問題（比對過其餘 29 筆都是標準 `YYYY-YYYY` 單年格式，字串排序應該沒問題，但沒有實際上正式站驗證過排序結果）。
6. **相簿功能（152張照片）本輪明確決定不做**：使用者選了「先做純文字」，目前系統也完全沒有 Supabase Storage 的使用先例。如果之後和平社想把照片也放進系統，需要另外設計 `club_history_photos` 表 + 啟用 Storage bucket + 前端相簿 UI，是全新功能、不是這次的範圍。

**【第四十九輪】全平台表格改成手機卡片式版型** ~~待實作~~ **程式碼已完成，純前端 CSS/樣板改動，不需要 migration**：

背景：使用者問「整個平台排版，想讓他更適合手機瀏覽與呈現，可以如何調整」。盤點後發現這個平台在更早的第三十八、三十九輪已經把頂部選單（`TopMenu.vue`）改成手機友善的橫向捲動＋左右箭頭，`.stat-grid`（儀表板統計卡）跟 `.mo`/`.mb`（Modal 彈窗）也都已經是流動寬度、手機上會自動收成一欄，所以不是從零開始。問使用者要做到什麼程度後，選了「全面改成手機卡片式」（相對於「只做橫向捲動的邊緣提示」這個更輕量的選項）。

**核心問題**：全站大部分頁面用同一套共用表格 CSS（`App.vue` 的 `.tw`/`table`），手機上目前的行為是整張表 `overflow:auto` 左右滑動——滑得到，但很難對照最左邊的社名/姓名和滑到最右邊的欄位數字，尤其像「出席月報（全區）」有 15 欄、社員名單有 11 欄。

**做法**：在 `App.vue` 新增一個共用的 `@media (max-width: 700px)` 規則（跟 `DashboardView.vue` 已經在用的斷點一致），套用在任何加了 `card-table` class 的 `<table>` 上：
- `thead` 隱藏，每個 `<tr>` 變成一張卡片（`display:block` + 底部留白分隔）
- 每個 `<td>` 變成 `display:flex; justify-content:space-between`，左邊用 `td[data-label]::before { content: attr(data-label) }` 自動長出欄位名稱當 label，右邊是原本的值——不用另外寫 v-if 分支，同一份 template 桌機版跟手機版共用
- 額外做了一個 `.card-stack` 修飾 class，給內容比較長/多行的欄位用（例如公告標題+預覽、社區服務計劃說明、備註），這種欄位 label 改放上面、內容整行放下面，不跟 label 擠在同一行
- `.zone-row`（分區摺疊標題那種橫跨整列的列，出席月報、社團總覽、儀表板都有用）維持原本橫式呈現，不套用 label:value 那一套

實作範圍：全站目前所有用到 `<table>` 的頁面都已經加上 `card-table` class + 每個 `<td>` 補上對應的 `data-label`，總共約 20 個 `.vue` 檔案、35+ 張表，包括：`ClubDetailView`（6 張表）、`AccountManagementView`（4 張表）、`AdminAttendanceView`（15 欄雙層表頭的全區大表）、`AttendanceMonthlyView`、`AttendanceView`、`DashboardView`、`ProspectiveView`、`ClubListView`、`ActivityListView`/`ActivityDetailView`、`MeetingListView`、`GovernorAwardSummaryView`、`GovernorAwardFormView`（總監獎項填寫表，含 textarea/number input）、`RosterView`（社友名冊，含批次編輯模式跟 Excel 匯入預覽，最複雜的一張）、`SisterClubsView`、`ClubHistoryView`、`ClubAnnouncementsView`、`DistrictAnnouncementsView`、`OfficersView`、`LineNotifyView`、`ServicePlanOverviewView`、`PermissionMatrixView`、`FeatureFlagsView`。

**踩到的坑**：有 3 個頁面（`RosterView.vue` 的 `.roster-table`/`.import-table`、`GovernorAwardFormView.vue` 的 `.award-table`）自己的 scoped `<style>` 有寫死 `min-width:1120px~1320px`（原本是為了桌機版不要欄位擠在一起），這些 scoped class 因為 Vue 會自動加上 `[data-v-xxx]` 屬性選擇器，specificity 比 `App.vue` 全域的 `table.card-table{min-width:0}` 還高，會贏過去、蓋掉卡片版型，手機上table還是會被撐開卡片就沒作用。三個頁面都已經各自在自己的 scoped style 補一條 `@media(max-width:700px){ .xxx-table{min-width:0} }` 蓋回來。**如果之後新增表格要比照這個模式，記得檢查有沒有類似的 scoped min-width 設定**。

驗證方式：因為大部分頁面都要登入才進得去，這台環境沒有真實帳密，這輪除了 `npx vue-tsc --noEmit` + `npm run build` 皆通過 ✅ 之外，另外啟動本機 dev server、在 375px 手機視窗用 `preview_eval` 動態塞一個 `card-table` 進 DOM 直接量測 computed style（`thead display:none`、`td display:flex`、`td::before` 有正確帶出 `data-label`、`card-stack` 的 `td` 是 `display:block`、`table min-width:0`），並截圖確認畫面上真的長成「姓名 王小明 / 出席率 92% / 備註（整行）」這種卡片版型，結果符合預期。

1. 部署新版前端到 Cloudflare Pages（push 上去應該就會自動觸發）——**待確認**
2. **待實測**（這輪驗證只做到「合成的測試表格」層級，沒有用真實帳密登入把每一個頁面實際跑過一遍）：
   - 各社/地區帳號用手機（或縮小瀏覽器視窗到 375px 左右）登入，挑幾個代表性的寬表格頁面確認卡片版型正常：出席月報（全區，15欄最寬）、社員名單（含切換「批次編輯」模式）、Excel 匯入預覽
   - 社員名單批次編輯模式下，卡片版型裡的 input/select 欄位是否能正常點擊操作、不會跟旁邊的 label 擠壓變形
   - 平板寬度（例如 iPad 768px～900px，剛好在 700px 斷點之上）確認還是維持原本桌機的橫式表格（沒有誤觸發卡片版型）
   - 桌機版（>700px）所有表格畫面應該完全沒變化，這輪的 CSS 只在 ≤700px 生效
3. 已知限制：這輪只處理「表格」這一種版面元件，沒有全面重新檢視每個頁面的表單網格（`form-grid`／`meta-panel` 等）在極窄螢幕（<320px，非常舊的手機）下的表現，多數頁面用的是 `auto-fill/auto-fit minmax()` 網格會自動收成一欄，理論上沒問題但沒有逐一實測

**【第四十八輪】出席月報表格配色比照 RI 半年報 Excel** ~~待實作~~ **程式碼已完成，純前端 CSS 改動，不需要 migration**：

使用者要求出席月報的表格配色比照他提供的 `2025-26年度出席率.xlsx`。用 Python openpyxl 直接讀該檔案表頭儲存格的 `fill.fgColor.rgb`，拿到精確色碼（不是用肉眼猜色）：

- 紫色 `#5B3F86`：所屬社／當月人數（男女合計）／例會次數／出席率
- 深藍 `#060FBA`：RI 半年報基準人數（男女合計）
- 黃色 `#FFFF00`：淨成長
- 綠色 `#08BE26`：年齡分布（40歲以下/41歲以上/合計）

套用範圍：
- [`AttendanceMonthlyView.vue`](src/views/meetings/AttendanceMonthlyView.vue)（社端）：例會清單表格的應出席/實際出席/出席率欄位、RI半年報基準人數/當月月底人數/年齡分布三個表單區塊的標題列、淨成長欄位、歷月出席月報表格
- [`AdminAttendanceView.vue`](src/views/admin/AdminAttendanceView.vue)（地區端）：全區大表雙層表頭全部依欄位分類上色
- [`ClubDetailView.vue`](src/views/admin/ClubDetailView.vue)：社團詳情頁「歷月出席月報」表格表頭

1. 部署新版前端到 Cloudflare Pages（push 上去應該就會自動觸發）——**待確認**
2. **待實測**（純 CSS 改動，`npx vue-tsc --noEmit` + `npm run build` 皆通過 ✅，但配色視覺效果沒有真的在瀏覽器裡看過，麻煩確認顏色跟深色文字/白色文字的對比度看起來 OK，尤其是淨成長那個黃底黑字的輸入框、以及地區端大表在手機窄螢幕上橫向捲動時色塊會不會太雜亂）

**【第四十七輪】出席月報／社友增減月報合併 + 應出席/實際出席 + 快速補登例會** ~~待實作~~ ~~待執行 migration~~ **041 migration 使用者已於 2026-07-10 執行完成 ✅，剩下待上正式站實測**：

背景：使用者要求把前兩輪做的「出席月報」跟「社友增減月報」合併成一個頁面統稱「出席月報」；出席數字不要強調「計入人次」（扣除免計人數的分母），改成使用者比較直覺的「應出席人數（理論上是全體社友）」跟「實際出席人數」；並且要考量有些社沒有走「新增例會」的完整流程，月報頁也要能直接補登某一天的出席人數。

**設計判斷**：
- 需求 1～3（新增例會可查詢講者資訊、針對該次例會逐人編輯出席、系統自動統計轉入月報）其實都已經是既有功能（`/meetings` 例會管理、`/meetings/:id/attendance` 逐人出席、第四十五輪的 `club_monthly_attendance_rate` view），這輪沒有重做，只是在合併後的頁面把「本月例會清單」列出來、每列可以點進去逐人編輯
- 需求 4（月報同步給地區）延續第四十五輪的做法，靠 RLS 讓地區即時查得到，這輪沒有改
- 真正新增的能力是「快速新增／補登例會出席」：在月報頁直接填日期＋應出席＋實際出席，就會自動在 `meetings`／`attendance_sessions` 建一筆（或更新既有的一筆），**不建立逐人明細**（`attendance_details` 留空）。如果那天已經有逐人出席記錄（透過「例會管理」登記過），這個補登功能會擋下來、請使用者改去逐人編輯頁面，避免誤蓋掉真實名單
- `attendance_sessions.total` 欄位語意本來就等於「應出席人數」（逐人編輯頁面本來就是列出全體在籍社友讓執秘勾選狀態，`total` = 全體人數），這輪只是把顯示語言從「計入人次（扣除免計）」改成「應出席」，`rate` 出席率的計算公式本身沒有變，仍然是官方 present/(total-exempt) 公式，維持跟 `attendance_sessions.rate`／`member_attendance_rate` 一致

實作內容：
- `041_attendance_monthly_merge.sql`：重新定義 `club_monthly_attendance_rate` view，欄位從 `present`／`counted` 改成 `expected`（應出席人次加總）／`actual`（實際出席人次加總），`rate` 算法不變
- `src/types/index.ts`：`ClubMonthlyAttendanceRate` 改用 `expected`/`actual`；新增 `MeetingAttendanceSummary` 型別（本月例會清單用）
- `src/stores/attendance.ts`：新增 `fetchMeetingsForMonth(clubId, month)`（該月例會 + 出席彙總，含是否已有逐人明細）、`quickAddSession(clubId, date, expected, actual, title?)`（找當天例會就更新、找不到就新增，已有逐人明細就拒絕覆蓋）
- **社端**：[`AttendanceMonthlyView.vue`](src/views/meetings/AttendanceMonthlyView.vue)（`/attendance/monthly`）整頁重寫：統計卡（應出席/實際出席/出席率/例會場次）+ 本月例會清單（可點連結到逐人出席編輯，未逐人登記的例會有「未逐人登記」標籤）+ 快速新增／補登表單 + RI 半年報基準/當月人數/年齡分布（原本 `MembershipReportView.vue` 的內容搬過來，`B6_membership_report` 開關控制是否顯示）+ 歷月月報表格。原本獨立的 [`MembershipReportView.vue`](src/views/club/MembershipReportView.vue) 已刪除，路由 `/club/membership-report` 已移除
- **地區端**：[`AdminAttendanceView.vue`](src/views/admin/AdminAttendanceView.vue)（`/admin/attendance`）整頁重寫成單一寬表格，欄位＝社名/例會場次/應出席/實際出席/出席率 + （`B6_membership_report` 開關開啟時）RI半年報基準/當月人數/淨成長/年齡分布，雙層表頭、分區可摺疊。原本獨立的 [`AdminMembershipReportsView.vue`](src/views/admin/AdminMembershipReportsView.vue) 已刪除，路由 `/admin/membership-reports` 已移除
- [`ClubDetailView.vue`](src/views/admin/ClubDetailView.vue)「歷月出席率」表格改名「歷月出席月報」，欄位改用應出席/實際出席，並補上當月社友合計/淨成長兩欄（`B6_membership_report` 開關控制）
- [`TopMenu.vue`](src/components/layout/TopMenu.vue) 移除兩個獨立的「社友增減月報」選單項目（社端＋地區端都只剩一個「出席月報」）
- [`FeatureFlagsView.vue`](src/views/admin/FeatureFlagsView.vue) 把 `B6_membership_report` 的說明改成「出席月報－社友增減人數（RI半年報）」，反映它現在是合併頁面裡的一個子區塊而不是獨立頁面

1. ~~在 Supabase SQL Editor 執行 `supabase/migrations/041_attendance_monthly_merge.sql`~~ **使用者已執行完成 ✅**
2. 部署新版前端到 Cloudflare Pages（push 上去應該就會自動觸發）——**待確認**
3. **待實測**（這輪只做了 `npx vue-tsc --noEmit` + `npm run build` 靜態驗證，皆通過 ✅，沒有真的登入測試過）：
   - migration 跑完後，社端登入 `/attendance/monthly`，確認統計卡顯示「應出席 / 實際出席人次」而不是「計入人次」
   - 「本月例會清單」應該列出當月透過「例會管理」新增的例會，點「逐人出席」能正常導到 `/meetings/:id/attendance`
   - 用「快速新增／補登例會出席」填一個沒有例會的日期＋應出席/實際出席人數，儲存後應該立刻出現在「本月例會清單」，並且有「未逐人登記」標籤
   - 針對同一天再次用快速新增功能修改數字，應該是「更新」不是「新增重複列」
   - 針對一個已經逐人登記過的例會日期，改用快速新增功能填同一天，應該會被擋下來、顯示錯誤訊息，不會覆蓋掉逐人記錄
   - 地區登入 `/admin/attendance`，確認欄位是社名/例會場次/應出席/實際出席/出席率（+ 社友增減相關欄位），沒有「計入人次」
   - 舊的 `/club/membership-report`、`/admin/membership-reports` 網址應該導回首頁（路由已移除，功能開關關掉時 `/attendance/monthly` 內的 RI 半年報區塊也應該不顯示）
4. 已知限制：快速新增／補登的例會不會出現逐人出席明細，`member_attendance_rate`（個人出席率）不會把這些補登資料算進去，因為那個 view 是從 `attendance_details` 逐人明細算的——這是刻意的設計（補登模式本來就沒有逐人資料），如果之後要看個人出席率，還是要透過「例會管理」逐人登記

**【第四十六輪】社友增減月報（比照 RI 半年報 Excel）** ~~待實作~~ ~~待執行 migration~~ **040 migration 使用者已於 2026-07-10 執行完成 ✅，剩下待上正式站實測**：

背景：使用者提供一份既有的月報 Excel（Google 表單匯出），從 2025/7 到 2026/6 每個月一個分頁，每列一個社，欄位是：RI 半年報基準 男/女/合計社友人數、當月月底 男/女/合計社友人數、淨成長、當月 40歲以下/41歲以上/合計社友人數、例會次數、出席率。使用者要求各社管理頁面比照這些欄位新增填寫表格，地區要能看到全區的總表。

**兩個關鍵設計決定（先跟使用者確認過）**：
1. 「例會次數」「出席率」這兩欄**不用社端手動填**，直接讀第四十五輪剛做的 `club_monthly_attendance_rate` view（真實例會/出席紀錄即時算出），避免跟系統實際紀錄兜不起來、也少一道重複輸入
2. 「RI 半年報基準人數（男/女）」比照 Excel 原本的設計，**每個月報告各自獨立一筆**（不是「年度填一次」），使用者確認過這樣比較符合他們原本的填報習慣

實作內容：
- `040_club_monthly_membership_reports.sql`：新增表 `club_monthly_membership_reports`（`club_id`／`month`(`'YYYY-MM'`)／`baseline_male`／`baseline_female`／`current_male`／`current_female`／`age_under_40`／`age_41_plus`，`UNIQUE(club_id, month)`），RLS 比照 roster/meetings（本社可編、地區唯讀）；`role_permissions` 種子資料新增 `membership_reports` resource；`feature_flags` 新增 `B6_membership_report`（預設全區開啟）
- `src/types/index.ts`：新增 `ClubMonthlyMembershipReport` 型別 + `FeatureKey` 加 `B6_membership_report`
- `src/stores/membershipReports.ts`：新增 store，`fetchAll(clubId)`（單社歷月）／`fetchDistrictMonth(month)`（全區某月）／`upsert(...)`
- `src/stores/permissions.ts`：`PermResource` 型別加 `membership_reports`
- **社端**：新增頁面 [`MembershipReportView.vue`](src/views/club/MembershipReportView.vue)（路由 `/club/membership-report`，選單「出席月報」旁新增「社友增減月報」），月份選擇器 + 表單（基準人數/當月人數/年齡分布可編輯，合計/淨成長/例會次數/出席率唯讀自動算）+ 歷月報告表格，`club_member` 角色看得到但欄位鎖唯讀（`has_permission('membership_reports','edit')` 判斷）
- **地區端**：新增頁面 [`AdminMembershipReportsView.vue`](src/views/admin/AdminMembershipReportsView.vue)（路由 `/admin/membership-reports`，選單「出席月報」旁新增「社友增減月報」），月份選擇器 + 全區總表（欄位順序、雙層表頭比照原本 Excel 版面，分區可摺疊）
- [`FeatureFlagsView.vue`](src/views/admin/FeatureFlagsView.vue)／[`PermissionMatrixView.vue`](src/views/admin/PermissionMatrixView.vue) 都補上新項目的標籤

1. ~~在 Supabase SQL Editor 執行 `supabase/migrations/040_club_monthly_membership_reports.sql`~~ **使用者已執行完成 ✅**
2. 部署新版前端到 Cloudflare Pages（push 上去應該就會自動觸發）——**待確認**
3. **待實測**（這輪只做了 `npx vue-tsc --noEmit` + `npm run build` 靜態驗證，皆通過 ✅，沒有真的登入測試過）：
   - migration 跑完後，社端（執秘/社長）登入 `/club/membership-report`，選一個月份，填入基準人數/當月人數/年齡分布，按「儲存本月報告」，確認合計/淨成長會即時算、例會次數/出席率有自動帶入系統數字
   - 一般社友（`club_member`）登入同一頁，確認欄位是鎖唯讀（灰底不能改），沒有「儲存」按鈕
   - 地區（唯讀/管理員）登入 `/admin/membership-reports`，切換月份，確認能看到全區各社剛剛填的資料，分區可摺疊
   - 地區管理員進「功能開關管理」「權限矩陣」，確認多出「社友增減月報」項目，且權限矩陣裡地區管理員是唯讀、各社管理員可編、一般社友唯讀
4. 已知限制：例會次數/出席率跟社端填的人數資料是「兩個獨立來源」放在同一張表顯示——人數是社端手動填，例會/出席是系統自動算，畫面上會同框但資料來源不同，如果某社完全沒在系統裡登記例會出席，那兩欄會顯示 0/`-`，不代表社端沒開會，只是系統沒紀錄

**【第四十五輪】出席月報（各社當月出席率 + 歷月查詢 + 地區月報）** ~~待實作~~ ~~待執行 migration~~ **039 migration 使用者已於 2026-07-10 執行完成 ✅，剩下待上正式站實測**：

背景：使用者要求「各社儀表板要有當月的出席率統計，還可以查詢各月份的出席率，並且此出席率每月要自動同步到地區，地區可以查詢各月各社的出席率」。

**關鍵設計決定（沒有另外做批次/排程同步）**：這個系統所有社的出席資料本來就存在同一個 Supabase 專案裡，`meetings`／`attendance_sessions` 的 RLS 本來就是「本社可見 OR 地區（唯讀/管理員）可見全部」（見 003、030 兩支 migration）。所以「每月自動同步到地區」不需要另外寫 cron job 或批次複製資料表——只要新增一個以「月份」為單位的統計 view，地區角色本來就查得到全部社團的資料，等於即時同步，比批次同步更即時、也不會有資料過期的問題。既有的 `member_attendance_rate`（個人出席率）也是用同樣的「view + RLS 繼承」模式，這輪延續同一套做法。

`ARCHITECTURE.md` 記載「所有出席率統計以 year_term（扶輪年度）為單位」是既有的設計決定，這輪**沒有**去改動既有的年度出席率邏輯（各儀表板的「平均出席率」欄位語意不變，只是在 club 端儀表板加上「本年度」字樣做區隔），而是另外新增一層「以月份為單位」的統計，兩者並存。

實作內容：
- `039_monthly_attendance_rate.sql`：新增 view `club_monthly_attendance_rate`（`club_id`／`month`(`'YYYY-MM'`)／`meeting_count`／`present`／`counted`／`rate`），`security_invoker=true` 繼承底層表 RLS
- `src/stores/attendance.ts`：新增 `monthlyRates` + `fetchMonthlyRates(clubId)`（單一社的全部月份，給社端歷月查詢 + 地區端社團詳情頁用）+ `fetchDistrictMonthlyRates(month)`（全地區某一個月，給地區端月報頁用）
- `src/stores/dashboard.ts`：新增 `monthlyRate`（當月出席率，`load()` 內順便查）
- **社端**：[`DashboardView.vue`](src/views/DashboardView.vue) 儀表板新增「本月出席率」卡片（原本的「平均出席率」卡片改標「本年度平均出席率」做區隔，計算邏輯沒動）+ 「查看歷月出席率」連結；新增頁面 [`AttendanceMonthlyView.vue`](src/views/meetings/AttendanceMonthlyView.vue)（路由 `/attendance/monthly`，選單「例會管理」旁新增「出席月報」），月份選擇器（`<input type="month">`）+ 該月統計卡 + 歷月出席率表格
- **地區端**：Dashboard 的「各社出席率」表格標題加註「（本扶輪年度）」+ 「查看各月出席率」連結；新增頁面 [`AdminAttendanceView.vue`](src/views/admin/AdminAttendanceView.vue)（路由 `/admin/attendance`，選單「社團總覽」旁新增「出席月報」），月份選擇器 + 全區各社出席率表格（比照 Dashboard 既有的分區摺疊 UI）；[`ClubDetailView.vue`](src/views/admin/ClubDetailView.vue)（社團詳情頁）新增「歷月出席率」表格，方便地區單獨查某一社的月趨勢

1. ~~在 Supabase SQL Editor 執行 `supabase/migrations/039_monthly_attendance_rate.sql`~~ **使用者已執行完成 ✅**
2. 部署新版前端到 Cloudflare Pages（push 上去應該就會自動觸發）——**待確認**
3. **待實測**（本機這輪有真實 `.env.local`，但沒有真實帳密登入，這輪只做了 `npx vue-tsc --noEmit` + `npm run build` 靜態驗證，皆通過 ✅）：
   - migration 跑完後，社端登入儀表板，確認「本月出席率」卡片有數字（該社本月要有例會 + 已記錄出席才會顯示，沒有的話是「-」）
   - 社端點「查看歷月出席率」，進 `/attendance/monthly`，切換月份選擇器應該能看到不同月份的統計 + 下方歷月表格
   - 地區（唯讀/管理員）登入儀表板，點「查看各月出席率」，進 `/admin/attendance`，切換月份應該能看到全區各社當月出席率，分區可摺疊
   - 地區進「社團總覽」點進任一社的詳情頁，「歷月出席率」表格應該有資料
4. 已知限制：`club_monthly_attendance_rate` view 用 `date_trunc('month', meetings.date)` 分組，只有「已經記錄出席（`attendance_sessions` 有資料）」的月份才會出現在表格裡；某月有開例會但執秘還沒登記出席，該月不會出現一列（跟既有 `member_attendance_rate` 的行為一致，不是 bug）

**【第四十四輪】LINE 官方帳號通知 Demo（給和平社展示用）** ~~待實作~~ **程式碼已完成，待使用者跑 migration + 申請 LINE 頻道 + 部署 Edge Function**：

背景：使用者想讓和平社實際看到「活動/例會發布時可以自動用 LINE 通知社友」這件事可行，用來說服他們這個方向值得投入。討論後的關鍵決策（使用者原話：**這輪的重點是證明做得到，安全性之後正式導入前再研究**）：

- **不做 LINE Login OAuth**（那個要另外申請一個 LINE Login 頻道，門檻較高，之後如果要正式上線、需要更嚴謹的身分驗證再考慮）
- **改用「人工核對版」綁定**：社友加 LINE 官方帳號好友後，直接傳一則訊息（自己的手機號碼），後端 webhook 收到後拿這支手機號碼去比對該社的 `roster`（社友名冊）的 `phone`/`personal_phone`，比對到了就把 LINE 的 `userId` 存起來，回覆「綁定成功」
- **已知弱點**（使用者知情且接受，之後才處理）：只驗證「手機號碼對不對得上名冊」，沒有驗證「打這串數字的人是不是本人」——如果甲知道乙的手機號碼，甲也可以冒充乙綁定，乙的通知會跑到甲那邊。要更嚴謹就要換成 LINE Login 方案。
- **廣播 vs 精準推播**：不能用 LINE 的「廣播」功能（會發給所有加好友的人，包含不是社友的人），改用「Multicast」API 只發給資料庫裡「已綁定」的 `line_user_id` 清單，這個清單完全由我們自己的資料庫決定，跟 OA 好友名單無關

實作內容：
- `038_line_notifications.sql`：新增 `club_notification_channels`（每社的 LINE Channel Secret/Access Token，RLS 限本社管理員/地區管理員）、`line_bindings`（社友 LINE userId ↔ 名冊手機號碼綁定紀錄，RLS 只給本社管理員讀，沒有開放前端寫入——只有 webhook 用 service role 寫）
- `supabase/functions/line-webhook/index.ts`：LINE 平台直接呼叫的公開 webhook，用 `x-line-signature` 驗證來源（用該社存的 Channel Secret 算 HMAC-SHA256 比對），處理 `follow`（加好友歡迎詞）跟 `message`（文字訊息裡抓數字比對手機號碼）兩種事件，回覆用 LINE Reply API
- `supabase/functions/line-push/index.ts`：給登入的社管理員用，呼叫 LINE Multicast API 發送訊息給該社已綁定的所有人（demo 版一次最多處理 500 人，沒有分批機制）
- `src/views/club/LineNotifyView.vue`（路由 `/club/line-notify`，選單在「進階設定」下拉裡）：貼 Channel Secret/Token、顯示 Webhook URL（可複製）、已綁定社友清單、發送測試訊息按鈕

1. **待使用者執行**：在 Supabase SQL Editor 執行 `supabase/migrations/038_line_notifications.sql`
2. **待使用者執行**（這輪工作環境沒有已登入的 Supabase CLI，Claude 沒辦法代為部署 Edge Function，麻煩使用者在有連結專案的機器上執行）：
   ```
   supabase functions deploy line-webhook --no-verify-jwt
   supabase functions deploy line-push
   ```
   `line-webhook` **一定要加 `--no-verify-jwt`**，因為 LINE 平台呼叫這支的時候不會帶 Supabase 的登入 JWT，如果沒加這個旗標，Supabase 會直接擋掉 LINE 打過來的請求（回 401），webhook 永遠收不到事件。`line-push` 維持預設（要驗證 JWT，只有登入的社管理員能呼叫）。
3. **待使用者執行**：到 [LINE Developers Console](https://developers.line.biz/console/) 幫和平社建立一個 **Messaging API** 頻道（不是 LINE Login），取得 Channel Secret 跟 Channel Access Token（長期權杖，在 Messaging API 頁籤下方 Issue）
4. **待使用者執行**：用和平社執秘/社長帳號登入正式站，到「進階設定 → LINE 通知設定（測試中）」，把上一步拿到的 Channel Secret/Token 貼上儲存，複製頁面顯示的 Webhook URL
5. **待使用者執行**：回 LINE Developers Console 該頻道的 Messaging API 頁籤，把 Webhook URL 貼到「Webhook settings」，開啟「Use webhook」，並且**關閉「自動回應訊息」（Auto-reply messages）**（不關的話 LINE 官方預設的自動回覆會跟我們的 webhook 回覆搶著出現，畫面會很奇怪）
6. **待實測**（本機沒有真實 `.env`、也沒有真實 LINE 頻道，這輪完全沒辦法在本機測試，只做了 `npx vue-tsc --noEmit` + `npm run build` 靜態驗證）：
   - 用手機加該 LINE 官方帳號好友，應該會收到歡迎訊息，請對方輸入自己在和平社名冊登記的手機號碼
   - 比對成功應該收到「綁定成功」回覆；到「LINE 通知設定」頁面應該看得到這筆新增到「已綁定社友」清單
   - 輸入一支查無此人的手機號碼，應該收到「查無這支手機號碼」的提示，不會誤綁
   - 在「LINE 通知設定」頁面發送一則測試訊息，剛剛綁定的那支手機應該會在 LINE 上收到
7. 下一步（規劃中，這輪沒做）：把「發送測試訊息」換成真正跟活動/例會報名綁定的自動通知（例如活動前 3 天自動推播提醒已報名的人），以及 Email 管道（見下方「規劃決策存檔」）

**【第四十三輪，優先，換人/換電腦接手用】SOP 文件二（功能操作圖文 SOP）還沒做完**：

使用者要做兩份給人看的 PDF：文件一（建置歷程，怎麼跟 AI 從 0 做到現在）已完成，見 `docs/sop/D3481建置歷程SOP.pdf`（尚未經使用者審閱確認內容，先不要再改動）。文件二（各功能操作 SOP，要用實際畫面截圖逐步拆解）做到一半被使用者中斷，要換一台電腦/帳號接續。**完整技術細節、已建立的示範資料、截圖進度、下一步清單，全部寫在 [`docs/sop/PROGRESS.md`](docs/sop/PROGRESS.md)，接手時先讀那份，不要重新從頭規劃。**

摘要：
1. 示範資料已建在正式站 Supabase（不是本機）：`clubs` 表有一筆「示範扶輪社（SOP教材用）」，帳號 `sop@gmail.com`（密碼由使用者自己保管，Claude 不會存在檔案裡）已設成該社 `club_secretary`。示範社的「社友名冊」已經有一筆真實測試資料「王小明」（截圖過程中存進去的，不是假資料，需要的話可以直接刪）。
2. 地區管理員視角（邀請/管理地區帳號、社團總覽）還沒有示範帳號可用，需要使用者決定要給真實帳號密碼還是比照建一個新的示範地區帳號。
3. 本機開發環境：`.env.local` 需要 `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`（anon key 不是機密，可以直接跟使用者要），`npm install` 後 `npm run dev`（或用 `.claude/launch.json` 的 `d3481-dev` 設定，port 5174）。
4. 已知的 UI 操作眉角：這個平台的 Modal「儲存」按鈕沒有 `type="submit"` 屬性，用一般 CSS selector 點不到，要改用 JS 找 `textContent.trim()==='儲存'` 的按鈕直接 `.click()`。

**【第四十二輪】活動報名三項修正** ~~待實作~~ ~~待執行 migration~~ **037 migration 使用者已於 2026-07-07 執行完成 ✅，剩下待上正式站實測**：

使用者上正式站測試完第四十一輪的例會同步功能後，回報三個問題：

1. **舊例會沒有補建報名紀錄**——036 的 trigger 只處理「migration 之後新增」的例會，這次上線前就已經存在、還沒到期的例會漏掉了。這輪用 `037` migration 一次性補建：把 `date >= CURRENT_DATE` 且還沒有對應 `activities` 列的例會全部補上一筆（跟 trigger 邏輯一致，標題/地點/時間規則相同）。**只跑一次**，之後新增的例會照樣靠 036 的 trigger 自動處理，不會重複補建。
2. **手動新增活動要能選「僅本社／全地區」**——新增 `club_only boolean` 欄位（預設 `false` = 維持原本全地區公開行為）。編輯活動 Modal 新增「招募對象」二選一（`ActivityListView.vue`），只有手動活動才看得到這個選項（例會衍生的活動一律限本社，不受這個欄位影響，UI 也不給改）。RLS 一併更新：`club_only=true` 的手動活動比照例會衍生活動，只有主辦社成員看得到/能報名。
3. **活動要能填地址**——新增 `address text` 欄位，跟原本的「地點」（場地名稱，例如「台北國賓大飯店」）分開，「地址」是給社友導航用的完整地址。新增/編輯 Modal 都有這個欄位（不受 `isMeetingLinked` 鎖定，例會衍生的活動也能自己補地址）；活動詳情頁顯示地址 + 「在地圖上開啟」連結（開 Google Maps 搜尋）。

1. ~~在 Supabase SQL Editor 執行 `supabase/migrations/037_activity_visibility_address_backfill.sql`~~ **使用者已執行完成 ✅**——新增 `club_only`／`address` 兩個欄位、重寫 `activities_select`／`activity_registrations_insert` 兩條 RLS、一次性補建未到期例會的活動報名紀錄
2. 部署新版前端到 Cloudflare Pages——**待確認**
3. **待實測**（本機沒有真實 `.env`，這輪只做了 `npx vue-tsc --noEmit` + `npm run build` 靜態驗證，皆通過 ✅，沒有真的登入測試過）：
   - migration 跑完後，到「例會管理」確認原本已經存在、還沒到期的例會，現在也都有「預計出席」連結了
   - 新增一筆「僅本社」的手動活動，換另一個社的帳號登入「社友活動」，**不應該**看到這筆（也不能報名）；改成「全地區」的話別社應該看得到
   - 新增/編輯活動時填「地址」，儲存後活動詳情頁應該顯示地址跟「在地圖上開啟」連結，點下去能正確開 Google Maps
   - 例會衍生的活動（有「例會」標籤那種）編輯時「招募對象」欄位應該**不會出現**（因為固定限本社，不給改），但「地址」欄位還是能填/能改
4. **待確認欄位命名的假設是否符合需求**：這輪把「地址」理解成跟「地點」分開的「完整地址（給導航用）」，「地點」維持原本「場地名稱」的用法（例如「地點：台北國賓大飯店」+「地址：台北市中山區中山北路二段63號」）。如果原本的意思是要把「地點」欄位整個換成地址輸入，而不是新增一個欄位，跟我說一聲，這個改起來比較快。

**【第四十一輪】例會自動同步「預計出席」報名統計** ~~待實作~~ ~~待執行 migration~~ **035+036 migration 使用者已於 2026-07-07 執行完成 ✅，剩下待上正式站實測**：

使用者提出：例會（每週固定聚會）也需要像活動一樣統計「預計出席人數」，希望新增例會時自動加入活動報名系統。跟使用者確認過範圍後，採用的設計是：

- **報名範圍限本社**，不比照一般活動全地區公開／跨社報名——因為例會目前的可見範圍本來就是「限本社」，105 社每週都開會，若全部比照活動公開會太雜亂、也破壞既有的例會隔離規則
- **UI 整合進「社友活動」列表**，不另外做一套介面——例會衍生的活動一樣出現在活動列表/詳情頁，只是 RLS 限定只有主辦社（本社任何角色）+ 地區管理員看得到

實作方式：`activities` 新增 `meeting_id` 欄位（唯一索引，nullable），DB trigger 在 `meetings` INSERT 時自動建立一筆對應的 `activities`（標題／地點／時間取自例會，狀態預設「招募中」），UPDATE 例會時同步標題/地點/時間回對應的活動（若存在）。**只處理這次 migration 之後新增的例會**，不回頭幫舊例會補建活動，避免大量已經開完的舊例會憑空冒出報名頁面。

1. ~~在 Supabase SQL Editor 執行 `supabase/migrations/036_meeting_activity_sync.sql`~~ **使用者已執行完成 ✅**——新增 `meeting_id` 欄位、重寫 `activities_select`／`activity_registrations_insert` 兩條 RLS（例會衍生的活動限本社，一般活動維持原本全地區可見/可跨社報名不變）、新增 `sync_meeting_activity()` trigger
2. 部署新版前端到 Cloudflare Pages（push 上去應該就會自動觸發）——**待確認**
3. **待實測**（本機沒有真實 `.env`，這輪只做了 `npx vue-tsc --noEmit` + `npm run build` 靜態驗證，皆通過 ✅，沒有真的登入測試過）：
   - 社長/執秘到「例會管理」新增一場例會，確認該列多出「預計出席」連結，點進去會導到「社友活動」的活動詳情頁，標題/地點/時間跟例會一致
   - 一般社友登入，「社友活動」列表看得到這場例會衍生的活動（標題旁有灰色「例會」小標籤），可以報名/取消報名
   - **待驗證跨社隔離**：別社的社友登入「社友活動」，**不應該**看到這場例會（跟一般活動不同，一般活動全地區都看得到）
   - 執秘/社長編輯這筆活動時，標題/地點/活動時間欄位應該是唯讀（灰色、不能改），只能改說明/名額/報名截止/狀態；改例會的日期後，回到活動詳情頁應該看到時間已經同步更新
   - 活動詳情頁裡「查看實際出席記錄」連結應該正確導到 `/meetings/:id/attendance`，把「預計出席」（報名）跟「實際出席」（例會後執秘登記的 present/absent/leave）兩個既有數字放在一起比對
4. 這輪**沒有**把報名資料自動帶入 `attendance_details`（實際出席登記還是要執秘在例會結束後手動記錄），只是提供「預計 vs 實際」兩組獨立數字，避免混淆規劃跟結果
5. `meetings` 表沒有時刻欄位，只有日期，trigger 產生的活動時間固定用中午 12:00 佔位，不是真實聚會時間，這是刻意的簡化（如果需要精確時間，之後要幫 `meetings` 加時刻欄位，這輪没有動）

**【第四十輪】社友活動報名 + 查詢功能 Phase 1** ~~待實作~~ ~~待執行 migration~~ **035 migration 使用者已於 2026-07-07 執行完成 ✅，剩下待上正式站實測**：

延續第三十九輪的規劃決策（見下方「規劃決策存檔」），這輪把分期第 1 期「活動＋報名＋社友查詢頁」寫成程式碼。Email/LINE 通知（第 2、3 期）還沒開始。

1. ~~在 Supabase SQL Editor 執行 `supabase/migrations/035_activities.sql`~~ **使用者已執行完成 ✅**——新增 `activities`／`activity_registrations` 兩張表 + RLS、`role_permissions` 種子資料（4 角色 view/edit）、`feature_flags` 種子資料（`E1_activities`，地區預設開啟）
2. 部署新版前端到 Cloudflare Pages（push 上去應該就會自動觸發）——**待確認**
3. **待實測**（本機沒有真實 `.env`，這輪只做了 `npx vue-tsc --noEmit` + `npm run build` 靜態驗證，皆通過 ✅，沒有真的登入測試過）：
   - 社長/執秘登入，到「社友活動」新增一筆活動（狀態設「招募中」），確認出現在列表、標題可點進詳情頁
   - 一般社友（甚至別社的社友）登入「社友活動」，能看到這筆活動、可以報名（填姓名/電話/人數/備註）、报名後顯示「已報名」+ 可取消報名
   - 主辦社的執秘/社長進入活動詳情頁，能看到「報名清單」區塊列出所有報名（含跨社報名者的社名），人數即時更新
   - 「草稿」狀態的活動，除了主辦社自己跟地區管理員，其他人看不到（不會出現在列表）
   - 地區管理員視角：可以瀏覽所有活動，但沒有新增/編輯按鈕（`role_permissions` 種子資料把 `district_admin` 的 `activities:edit` 設為 `false`，跟其他資源一致）
   - 功能開關管理頁應該會多一個「活動」分類，「社友活動報名」預設開啟；權限矩陣管理頁應該會多一列「社友活動報名」resource
4. 資料模型跟規劃時的草圖有兩處簡化（皆為刻意決定，非遺漏）：
   - `activity_registrations` 拿掉 `member_id`（原本想連結 `roster`），Phase 1 報名採「登入帳號自行報名」，姓名直接存在 `form_data.name`，不需要額外連結名冊列
   - 沒有另外的「取消」流程限制，`activity_registrations_update` policy 允許本人隨時改自己的報名內容或取消/重新報名，避免流程卡死
5. 下一步（使用者尚未下指令）：Phase 2「Email 排程通知」、Phase 3「LINE 申請入口」，見下方規劃決策存檔

### 規劃決策存檔（第三十九輪，2026-07-07）

社友活動報名 + 到期前自動通知（Email/LINE）+ 跨社報名同步，完整需求背景與分期規劃：

需求背景：社友報名活動後可自行登入查詢活動資訊；後台依活動日期前 7 天/3 天/1 天自動發 Email 或 LINE 通知；各社官方 LINE 帳號要能自助/協助串接；活動主辦社需要即時看到報名人數與表單內容（尤其活動是別的社辦、報名者可能跨社）。

已確認的關鍵決策：
- **Email 寄信**：用各社自己的 Gmail，走 **SMTP + App 密碼**（社執秘開兩步驟驗證產生應用程式密碼貼到後台），不做 Google OAuth（OAuth 需送 Google 審核、且 `gmail.send` 屬敏感權限，門檻太高不值得）
- **LINE 官方帳號串接**：不做全自助流程，後台先放「申請串接」入口，社友提交申請後**由管理員人工協助綁定**
- **跨社報名同步**：不是另外設計一組「共享清單」，而是活動本身歸屬 `organizing_club_id`（主辦社），RLS 讓「自己主辦的活動」天然可見全部報名紀錄（含表單內容，不只是人數），不管報名者是哪個社的人；社友名冊/出席率等其他資料仍維持既有的「各社互不可見」隔離原則不受影響

Phase 2/3 資料模型草圖（尚未寫成 migration）：
- `club_notification_channels`：`club_id`/`channel_type`(`email`|`line`)/`email_from`/`email_app_password`（加密）/`line_channel_token`/`line_channel_secret`（皆加密）/`status`(`connected`|`pending_manual_setup`)
- `notification_jobs`：`id`/`activity_id`/`trigger_type`(`7d`|`3d`|`1d`)/`channel`/`sent_at`（避免重複發送）

建議分期：
1. ~~活動＋報名＋社友查詢頁（含 `organizing_club_id`／跨社可見規則）~~ **第四十輪已完成，見上方**
2. Email 排程通知（pg_cron + SMTP，7/3/1 天前）——尚未開始
3. LINE 申請入口（後台表單 + 人工協助綁定，排程通知加一個 LINE 發送管道）——尚未開始

**【第三十九輪】待使用者上正式站複查手機版 + 選單合併結果** ~~本機驗證~~ **Claude 本機用假 Pinia state（`club_member` 角色）+ `npx vue-tsc --noEmit` 驗證通過 ✅，本機仍沒有真實 `.env`**：
1. **待複查**：手機瀏覽器（或縮小視窗到 375px 左右）確認標題不會再換行、TopMenu 不會疊到 TopNav 上
2. **待複查**：「本社歷程」下拉裡的順序應該是歷屆社長→服務計劃總覽→友好社，點進去三個連結都要能正常導頁
3. RWD 后續還可以優化的方向（尚未動）：手機版橫向選單項目一多還是要滑很多次，之後可以考慮手機版拿掉圖示只留文字、塞進更多項目

**【第三十八輪】頂部選單改版，待使用者上正式站複查** ~~本機驗證~~ **Claude 本機用假 Pinia state（`club_secretary`／`district_admin` 兩種角色）+ `npx vue-tsc --noEmit` + `npm run build` 驗證通過 ✅，但本機沒有真實 `.env`，沒有真的登入過正式帳號**：
1. **待複查**：正式站登入後確認頂部橫向選單跟配色（深藍底+古銅金 active 底線）跟預期一致，選單項目、順序、圖示都跟原本 Sidebar 一致（只是變橫的）
2. **待複查**：手機／窄螢幕下橫向選單可以左右滑動看到全部項目（原本手機版漢堡選單已拿掉，改成跟桌面版一樣的橫向捲動+箭頭）
3. **待複查**：各社管理員角色點右側「進階設定」下拉，能看到「邀請/管理本社帳號」；地區管理員點「進階設定」能看到三個項目（邀請/管理地區帳號、功能開關、權限矩陣）；下拉選單位置要跟著觸發按鈕、不會被裁切或超出螢幕
4. 下一步（使用者這輪明確表示「之後再陸續增加功能」）：`vivianrotary-cloud/3481rotarymember` 原始規劃裡的 IOU／GG案／月報／出席管理／目標社友／地區行事曆，這些都還只是靜態原型，Vue app 裡完全沒有對應頁面/資料表，之後每加一個功能都要重新評估對應的 Supabase schema

**【第三十七輪】補 034 migration，讓跨社協作帳號的姓名顯示出來** ~~待使用者執行~~ **使用者已執行完成 ✅**（Claude 用 CLI 查 `pg_policy` 確認 `profiles_select_collaborator` 這條 policy 確實已建立在 `user_profiles` 上）：
1. **待複查**：重新整理「帳號管理」頁，「跨社協作帳號」區塊應該要能看到 `bton0505`／`Vivian` 兩筆，姓名正確顯示（不是空白或 `-`）
2. 確認完姓名有顯示之後，接續第三十六輪原本待實測的項目：用 `bton0505`／`vivianrotary` 這兩個帳號實際登入，確認 TopNav 有切換社團的下拉選單、切過去能編輯和平社資料、切回去不影響原本社的權限；再測一次「跨社協作帳號」區塊的權限開關（改成檢視）跟「撤銷協作」

**【第三十六輪】單一帳號跨社管理** **migration 已由使用者手動貼到 Supabase SQL Editor 執行完成 ✅，4 支 Edge Function 已由 Claude 用 CLI 部署完成 ✅**：
1. ~~在 Supabase SQL Editor 執行 `supabase/migrations/033_multi_club_access.sql`~~ **使用者已執行完成 ✅**（Claude 用本機 CLI 查 `pg_proc`/`information_schema` 確認 `current_club_id`/`current_user_role`/`is_club_tier`/`is_club_secretary`/`find_user_id_by_email` 五個 function、`user_club_roles` 表、`user_profiles.active_club_id` 欄位都已存在）
2. ~~部署 `invite-user`/`delete-account`/`reset-member-password`/`create-member-account` 四支 Edge Function~~ **已完成**（Claude 用 CLI 部署，curl 空 body 測試 `invite-user` 確認回傳正常 401，不是 500 崩潰）
3. ~~部署新版前端到 Cloudflare Pages~~ **已推送**
4. **使用者實測發現**：邀請 `bton0505@gmail.com`／`vivianrotary@gmail.com` 都正確觸發跨社授權邏輯，但畫面上的「跨社協作帳號」區塊顯示空的——**這就是第三十七輪要修的 bug**，邀請本身的邏輯（`invite_log`／`user_club_roles` 正確寫入）沒有問題
5. 這輪唯一的已知取捨：跨社授權**不需要對方按「接受」**，授權當下就生效（跟全新邀請要收信+設密碼不同），如果使用者覺得應該要有確認步驟再回來討論

**【第三十五輪】歷屆社長／服務計劃總覽** ~~上線前還要做~~ **migration + 首筆真實寫入都已確認 ✅，仍有幾項待複查**：
1. ~~在 Supabase SQL Editor 執行 `supabase/migrations/032_club_history.sql`~~ **使用者已執行完成 ✅**（Claude 用本機已連結的 Supabase CLI 查詢 `information_schema.tables` 確認 `club_history` 表確實已建立）
2. ~~使用者第一次點「儲存」時表還沒建好，那筆沒有真的寫入~~ **使用者重新儲存後已確認 ✅**（Claude 用 CLI 查詢 `club_history` 表，實際看到 2 筆真實資料：2025-2026／Eric／Ken／文豪基金會偏鄉物資發放…、2024-2025／Jerome／Eason／花蓮小太陽、嘉義腦麻協會，`created_at` 是同一天兩次儲存，時間點吻合）
3. 部署新版前端到 Cloudflare Pages（push 上去應該就會自動觸發）——**待確認**
4. **待複查**：兩筆都有填服務計劃，理論上都該出現在「服務計劃總覽」，麻煩使用者點進去確認畫面上兩筆都有列出、且依年份新到舊排序（2025-2026 在上）；也麻煩測一次編輯/刪除，以及一般社友帳號進「歷屆社長」確認看得到清單但沒有新增/編輯/刪除按鈕
5. 這輪驗證資料真的有沒有寫入資料庫，是 Claude 用本機 Supabase CLI 直接查表確認，不是透過瀏覽器操作看到的，畫面呈現（排序、服務計劃總覽篩選、社友唯讀）還是要麻煩使用者實際點一次頁面複查

**【第三十四輪】友好社功能** ~~上線前還要做~~ **已由使用者執行 migration 完成，仍待實測**：
1. ~~在 Supabase SQL Editor 執行 `supabase/migrations/031_sister_clubs.sql`~~ **使用者已執行完成 ✅**
2. 部署新版前端到 Cloudflare Pages（Cloudflare Pages 接 GitHub 自動部署，push 上去應該就會觸發，不用額外操作）——**待確認**
3. **待實測**：建議用和平社的執秘/社長帳號登入正式站，到「社務管理 → 友好社」測試：新增一筆（例如「新竹和平社」，結盟時間隨便填一個日期，當屆社長、兩社情誼說明可選填）、編輯、刪除、確認清單自動依結盟時間新到舊排序；再用一般社友帳號登入確認看得到清單但沒有新增/編輯/刪除按鈕
4. 本機沒有真實 `.env`／登入密碼，上一輪的驗證是靠暫時塞假 Pinia state + 直接把假資料塞進 store 的 `list` 模擬畫面結果，沒有測到「真的寫入資料庫」這一段，麻煩使用者接續第 3 點做真實驗證

**【第三十三輪】Sidebar 重整 + 進階設定收合** ~~待實測~~ **Claude 本機用假 Pinia state 模擬三種角色驗證通過 ✅，但仍建議使用者上正式站用真帳號複查一次**：
1. 地區管理員（`district_role='admin'`）：總覽 → 地區（社團總覽/地區公告/總監獎項統整/EDM產生器）→ 進階設定（邀請/管理地區帳號/功能開關/權限矩陣），沒有社務管理 —— 本機模擬驗證通過
2. 地區唯讀（`district_role='view'`）：同上但沒有「進階設定」分類 —— 本機模擬驗證通過
3. 各社管理員同時有地區唯讀權限的帳號（過去的 bug 場景）：切到「地區介面」時「社務管理」「邀請/管理本社帳號」正確消失，只留總覽+地區；切回「本社介面」時「地區」相關項目正確消失，只留總覽+社務管理+進階設定 —— 本機模擬驗證通過，這正是使用者回報的 bug 場景
4. 「進階設定」區塊標題改成可點擊的按鈕，預設收合（顯示 ▸），點一下展開（顯示 ▾、露出底下連結），避免誤觸功能開關/權限矩陣/帳號邀請這類敏感功能——地區、各社兩種進階設定共用同一個 `advancedOpen` 狀態（兩者互斥顯示，不會同時出現），切換「地區介面」↔「本社介面」時會自動重新收合（`watch(() => auth.isDistrictView, ...)`），本機模擬點擊展開/收合都驗證通過
5. **本機沒有真實 `.env`／登入密碼，這次驗證是靠暫時塞假 Pinia state 模擬三種角色跑出來的畫面結果，不是真的登入正式站**，麻煩使用者找一個「各社管理員+地區權限」的真帳號登入正式站，在「地區介面」「本社介面」間切換確認選單跟畫面顯示的一致，也順手點一下「進階設定」確認收合/展開動畫跟預期一樣

**【第三十二輪】角色模型簡化 + 帳號總覽精簡 + 社團資訊頁補齊** ~~待實測~~ **Claude 用已登入的瀏覽器分頁在正式站實測確認 ✅**：
1. ✅ 權限矩陣頁只剩 3 列角色（地區管理員/各社管理員/一般社友），實際點擊「各社管理員」列的社友名冊編輯格從允許切成禁止、重新整理頁面確認持久化（證明底層真的寫入資料庫，不是只有畫面假象），再切回允許還原
2. ✅ 帳號邀請表單：標題「邀請社友」、欄位順序 Email→姓名→所屬社團→角色（檢視/編輯開關），畫面確認無誤
3. ✅ 帳號總覽：地區視角下確認只列出 5 個已有地區權限的帳號（Eric/Eric和平社/Eric測試/Johnny/Vivian），沒有地區權限的 Lucy、marketing 正確被排除；權限開關對應地區的檢視/編輯
4. ✅ 社團總覽 → 查看社團資訊：空資料社團跟有真實資料的社團（台北市和平扶輪社）都確認「潛在社友」「例會管理」兩個新區塊正確顯示，沒有社內公告區塊；「已註冊帳號」的角色欄位也確認顯示合併後的「各社管理員」標籤

全部四項都已在正式站驗證通過，沒有發現問題。

**【第三十一輪】`reset-member-password` Edge Function** ~~程式碼已改好並推上 GitHub，但尚未部署~~ **使用者已手動部署完成 ✅**：手機號碼帳號升級成執秘後仍能用「重設密碼」還原回手機號碼，救援管道缺口已修好。

**【第三十輪】帳號管理頁重構——「檢視↔可編輯」開關雙向切換** ~~待實測~~ **使用者已親自實測完成 ✅**：檢視→可編輯、可編輯→檢視都能正確切換，帳號留在同一張「帳號總覽」表不會消失，這輪要修的核心 bug（之前只能升級、無法降回檢視）確認修好。

**【第二十九輪，已驗證】視覺改版（統計卡片/分段控制/開關樣式/字級放大）已確認成功部署在正式站，儀表板新卡片正常顯示無跑版；發現並修好 TopNav 登出按鈕白底白字的 bug（`.btn-g` 全域樣式改成明確白色背景後，TopNav 針對深色背景的 override 沒有重設背景色）。

**【第二十七輪，優先】EDM 產生器：Anthropic 帳號額度用完，需要使用者到 [console.anthropic.com](https://console.anthropic.com) → Plans & Billing 加值或升級方案**——程式碼跟部署都沒問題，純粹帳務問題，Claude 這邊無法代為處理。加值完成後直接重試「AI 生成文案」即可，不用重新部署。

**【第二十六輪，權限模型改成 4 級，新增地區唯讀角色】migration + Edge Function + 前端部署都已完成 ✅，只剩最後一步登入實測**：
1. ~~使用者到 Supabase SQL Editor 執行 `supabase/migrations/030_district_view_tier.sql`~~ **已完成**（`district_role` 欄位確認存在、`district_access` 已移除）
2. ~~部署 5 支 Edge Function：`invite-user`、`delete-account`、`create-member-account`、`reset-member-password`、`generate-edm`~~ **已完成**（2026-07-02，Claude 用 CLI 直接部署，curl 驗證都回傳正常 401）
3. ~~部署新版前端到 Cloudflare Pages~~ **已確認完成**（第二十八輪發現其實早就部署了，Cloudflare Pages 接 GitHub 自動部署，見上方最新更新）
4. **【第二十八輪，只差這一步】待使用者登入實測**：Claude 這輪已經把測試帳號「Eric測試」（執秘，台北市和平扶輪社）的「可見範圍」改成「地區（唯讀）」並確認寫入 DB 成功（重新整理頁面後仍顯示「地區（唯讀）」）。**Claude 沒有這個帳號的密碼，無法代為登入測試**（涉及輸入密碼，屬於 Claude 不能代勞的動作）。麻煩使用者用「Eric測試」帳號登入 `https://d3481clubmanagementsystem.pages.dev/login`，確認：能看地區儀表板/社團總覽(含名冊幹部)/地區公告/總監獎彙總/EDM 產生器，但看不到功能開關/權限矩陣/帳號管理，社團總覽/地區公告頁面沒有新增/編輯/刪除按鈕。測試完如果要把「Eric測試」改回原本的「只能看到各社」，回「帳號邀請 / 管理」頁面改回來即可（第二十九輪後這個控制項的樣式從下拉選單換成了三顆藥丸按鈕，但底層邏輯沒變）

0. ~~在 Supabase SQL Editor 執行 `supabase/migrations/029_registration_title.sql`~~ **已完成**（第二十二輪的「3481地區辦公室」選項＋扶輪社職稱代碼已生效）
1. ~~在 Supabase SQL Editor 執行 `supabase/migrations/028_club_tier_role_management.sql`~~ **已完成**（第二十一輪的社長/執秘角色編輯權限已生效）
2. **【第十七輪，自助註冊功能上線前還要做】**（migration 已於 2026-07-02 執行完成 ✅，程式碼已寫完並推上 GitHub，剩下這幾步無法由 Claude 代勞）：
   - ~~在 Supabase SQL Editor 執行 `025_self_registration.sql`、`027_registration_zone.sql`~~ **已完成**
   - ~~Authentication → URL Configuration → Redirect URLs 新增 `/verify-email`、`/reset-password`~~ **已確認完成**（2026-07-02，使用者截圖確認清單裡已有 `https://d3481clubmanagementsystem.pages.dev/**` 萬用字元規則＋這兩條精確規則，三條並存沒有衝突）
   - 確認 Authentication → Providers → Email 的「Confirm email」是開啟的（自助註冊需要寄驗證信才能防止亂填 email）——**待使用者確認，本輪尚未回報**
   - Email 樣板（Confirm signup / Reset Password / Invite user）：**Claude 這輪已提供中文＋扶輪配色版本的 Subject/Body HTML**（深藍 `#17458F`＋金色 `#F7A81B`，跟平台視覺一致），使用者正在 Supabase Dashboard → Authentication → Emails 逐一貼上套用，**貼完後建議跑一次真實測試**（註冊一次、忘記密碼一次，確認收到的信是中文版且連結能正常導向 `/verify-email`、`/reset-password`）——這步是 Dashboard 內容編輯，不影響 repo 程式碼，貼完不用回來 commit
   - 部署到 Cloudflare Pages（新增了 4 個路由：`/register`、`/verify-email`、`/forgot-password`、`/reset-password`）——**待使用者執行**
   - 全部設定完成後，建議實際跑一次完整流程：註冊 → 收驗證信（中文版）→ 點擊驗證 → 登入 → 地區管理員在「帳號管理」頁看到「自助註冊待審核」名單 → 核准或維持社員
1. **【第十八輪，社員手機號碼帳號機制】migration + Edge Function 都已完成 ✅，剩下待使用者實測**：
   - ~~在 Supabase SQL Editor 執行 `026_member_phone_accounts.sql`~~ **已完成**
   - ~~部署兩個新 Edge Function~~ **已完成**（2026-07-02，Claude 直接用這台機器上已登入的 Supabase CLI 執行 `supabase link --project-ref xdwqrgthsxyzclnjlmvy` + `supabase functions deploy create-member-account` + `supabase functions deploy reset-member-password`，`supabase functions list` 確認兩支都是 `ACTIVE`，用 curl 打了一次沒帶 token，回傳乾淨的 `401 UNAUTHORIZED_NO_AUTH_HEADER`，不是伺服器錯誤，代表程式碼有正常執行）
   - ~~密碼長度死結~~ **已解決（第二十三輪）**：原本設計「初始密碼＝手機末四碼」在 Supabase 上完全行不通——使用者親自到 Dashboard 想把「Minimum password length」調到 4，UI 直接擋下來顯示 `Must be greater or equal to 6`，這是 Supabase 平台硬性下限，不是設定沒調對。改成「初始密碼＝完整手機號碼」（帳號、密碼都是同一組手機號碼，10 碼原生滿足 6 碼下限），`create-member-account`／`reset-member-password` 的 `defaultPassword()` 已改成回傳完整 `phone`、`AccountManagementView.vue` 的提示文字也同步改掉，兩支 Edge Function 已用 Supabase CLI 重新部署並 curl 驗證過（回傳乾淨的 401，非崩潰）。**這條路徑完全不需要碰 Supabase Dashboard 的密碼長度設定**
   - **待實測**：Cloudflare Pages 部署新版前端之後，到「帳號管理」頁測試：執秘/社長建立社員帳號（姓名+手機號碼，初始密碼＝完整手機號碼）、用手機號碼登入、忘記密碼一鍵重設回完整手機號碼、停用/刪除社員帳號
   - 本機沒有 `.env`（只有 `.env.example`），無法在這個環境跑真實 Supabase 連線驗證登入，只做了 `vue-tsc --noEmit` + `npm run build` 靜態驗證，皆通過
2. **地區/各社切換按鈕沒有顯示——已定位高度可疑根因，待使用者確認並修資料**（延續自第十六輪）：使用者確認測試帳號右上角角色徽章有顯示「＋地區」字樣，代表 `district_access` 已正確載入前端（`isDistrictAdmin` 為 true）。`canSwitchView = isDistrictAdmin && !!clubId`，徽章邏輯只吃 `role`/`isDistrictAdmin`、不吃 `clubId`，所以徽章正常但按鈕不出現，唯一合理解釋是該帳號的 `user_profiles.club_id` 其實是 `NULL`。
   - 回頭查 `supabase/migrations/014_fix_handle_new_user_metadata_source.sql` 的說明文字，發現這正是有前科的 bug：`handle_new_user()` 原本讀錯 metadata 欄位（讀 `raw_app_meta_data`，但 `inviteUserByEmail` 寫入的其實是 `raw_user_meta_data`），導致**在 014 套用之前，每一個被邀請建立的帳號，`club_id` 一律被寫成 NULL**。014 只修好了「以後」新邀請帳號會正確寫入 `club_id`，**不會回頭修正 014 套用之前就已經存在、`club_id` 已經是 NULL 的舊帳號**
   - 也就是說：如果這次拿來測試切換功能的帳號，是在 014 套用之前就已經邀請建立的舊帳號（例如很早期的測試帳號），它的 `club_id` 很可能從建立那一刻起就一直是 NULL，之後不管怎麼切換 `district_access` 都不會自動補上
   - **請先確認**：到「帳號管理」頁面看該測試帳號的「社團」欄位，如果顯示空白/`-`，就確定是這個問題
   - **修法**：SQL Editor 執行 `UPDATE user_profiles SET club_id = '<正確的 club id>' WHERE id = '<該帳號的 user id>';` 補上正確的 `club_id`；或者乾脆刪除該測試帳號重新邀請一次（014 已修好，新邀請的帳號 `club_id` 會正確寫入），應該就能看到切換按鈕
   - 這次確認：**不需要支援「單一帳號歸屬多個扶輪社」**，維持現有「地區權限 + 綁定單一 club_id」的雙重視角模式即可
3. ~~`generate-edm` Edge Function 尚未部署，且需要設定 `ANTHROPIC_API_KEY` secret~~ **已完成**（2026-07-02 確認：`supabase functions list` 顯示 `generate-edm` 是 `ACTIVE`，`supabase secrets list` 也看得到 `ANTHROPIC_API_KEY` 已設定，時間點是這次之前，推測是使用者自己或另一個 session 处理的，只是沒回來更新這份記錄）
4. **`B5_edm` 功能開關預設關閉**：需要地區管理員到「功能開關管理」把 `EDM 文案產生器（AI 輔助）` 打開，Sidebar 才會出現「EDM 產生器」連結（這步是應用層的操作，Claude 沒有自動處理）
5. 待使用者實測「例會管理」編輯儲存修正（本輪找到真正根因，見下方「第十六輪」）、地區儀表板分區收折後回報結果

其餘項目皆已由使用者在 Supabase Dashboard / SQL Editor 實際確認完成，邀請流程（邀請信 → `/accept-invite` → 設定密碼）三個問題（守衛攔截、版面跑版、`Auth session missing!`）也已全部修正並實測通過，詳見下方「第十一輪」與更早的紀錄。

## 本次完成（第三十五輪）：新增「歷屆社長」+「服務計劃總覽」兩個功能

延續上一輪「友好社」的社史資料需求，這次是「每屆社長、當年秘書、當年度社區服務計劃」。兩個畫面共用同一張新表 `club_history`：「歷屆社長」完整編輯（年份/社長/秘書/服務計劃），「服務計劃總覽」是唯讀彙整頁，只挑「有填服務計劃」的年度顯示（沒填的年度不會出現在總覽，但還是留在歷屆社長清單裡）。寫法完全比照上一輪「友好社」的模式（`sister_clubs` → `club_history`），沒有另外發明架構。

| 檔案 | 說明 |
|------|------|
| `supabase/migrations/032_club_history.sql`（**已寫好，尚未執行**） | 新表 `club_history`：`club_id`、`year_term`（沿用 `club_officers` 既有的 '2025-2026' 格式）、`president_name`、`secretary_name`、`service_plan`，`UNIQUE(club_id, year_term)` 避免同一年重複建兩筆。RLS 跟 `sister_clubs` 一模一樣：`SELECT` 只要 `club_id = current_club_id()`（同社任何角色都能看）；寫入需要 `is_club_tier()`。同樣沒有開放地區視角查詢 |
| `src/types/index.ts` | 新增 `ClubHistoryRecord`/`ClubHistoryInsert`/`ClubHistoryUpdate` |
| `src/stores/clubHistory.ts`（新檔） | `fetchAll(clubId)`／`create`／`update`／`remove`，複製 `sisterClubs.ts` 的 CRUD pattern，`fetchAll` 用 `order('year_term', { ascending: false })` 排序 |
| `src/views/club/ClubHistoryView.vue`（新檔，歷屆社長） | 複製 `SisterClubsView.vue` 的「表格 + 新增/編輯彈窗」骨架，四個欄位換成年份/社長/當年秘書/社區服務計劃；`canManage` 才看得到新增/編輯/刪除，`club_member` 唯讀 |
| `src/views/club/ServicePlanOverviewView.vue`（新檔，服務計劃總覽） | 純唯讀，`computed` 用 `clubHistory.list.filter(item => item.service_plan?.trim())` 只挑有填服務計劃的年度顯示成「年份＋服務計劃」兩欄，沒有任何編輯功能——頁面上方文字明講「要修改請到歷屆社長編輯」，避免使用者以為這裡也能編輯 |
| `src/router/index.ts` | 新增 `/club/history`、`/club/service-plans` 兩條路由，`meta.roles` 跟 `/club/officers`、`/club/sister-clubs` 一樣開放給三種角色（社友唯讀進得去） |
| `src/components/layout/Sidebar.vue` | 「社務管理」區塊在「友好社」後面依序加「📜 歷屆社長」「🌱 服務計劃總覽」 |

**沒有加**：跟「友好社」一樣，沒有加 feature flag、沒有開放地區視角查詢別社的歷史資料。

**驗證**：`npx vue-tsc --noEmit`、`npm run build` 皆通過。本機一樣用暫時 `.env`（假金鑰）+ 暫時掛 `window.__pinia`/`window.__router`（皆已還原不進 commit）模擬 Pinia state：塞 3 筆不同年份的假資料進 `clubHistory` store（其中一筆故意不填服務計劃），確認「歷屆社長」依年份新到舊排序（2025-2026→2024-2025→2023-2024），「服務計劃總覽」正確只顯示有填服務計劃的兩筆、跳過沒填的那筆；再切成 `club_member` 身分確認「歷屆社長」看得到清單但沒有新增/編輯/刪除。**同樣沒有測到「真的寫入 Supabase 資料庫」這一段**（migration 還沒執行），麻煩使用者照上面待辦第三十五輪跑一次真實流程確認。

## 本次完成（第三十四輪）：新增「友好社」功能

使用者以和平社為例，想把跟其他社的友好/姐妹社結盟關係記錄在系統上（新竹和平社、花蓮東南社、礁溪社、鹿耳島北社（姐妹社）、八德聯誼會（忠孝/仁愛/信義社）），欄位定案為「社名、結盟時間、當屆社長、兩社情誼說明」，全部可編輯新增，清單依結盟時間自動排序、最新在最上方。完全比照這個 repo 既有「社內公告」（`club_announcements`）的資料表/RLS/CRUD store/畫面模式做，沒有發明新架構。

| 檔案 | 說明 |
|------|------|
| `supabase/migrations/031_sister_clubs.sql`（**已寫好，尚未執行**） | 新表 `sister_clubs`：`club_id`、`partner_name`、`established_date`、`president_name`、`relationship_note`。RLS 完全比照 `022_district_announcements.sql` 裡 `club_announcements` 那份寫法：`SELECT` 只要 `club_id = current_club_id()`（同社任何角色都能看，含一般社友）；`INSERT`/`UPDATE`/`DELETE` 多加 `is_club_tier()`（僅社長/執秘）。沒有加地區管理員的例外——跟 `club_announcements` 一致，地區視角看不到各社的友好社資料，符合這個專案「地區只管地區、各社管各社」的一貫原則 |
| `src/types/index.ts` | 新增 `SisterClub`/`SisterClubInsert`/`SisterClubUpdate` 型別，跟著 `ClubAnnouncement` 那組的命名習慣 |
| `src/stores/sisterClubs.ts`（新檔） | `fetchAll(clubId)`／`create`／`update`／`remove`，寫法完全複製 `announcements.ts` 的 `fetchClubForAdmin`/`createClubAnnouncement` 那組 CRUD pattern |
| `src/views/club/SisterClubsView.vue`（新檔） | 複製 `ClubAnnouncementsView.vue` 的「表格 + 新增/編輯彈窗」骨架換成友好社的四個欄位；`canManage`（`club_admin`/`club_secretary`）才看得到「+ 新增友好社」按鈕跟每列的「編輯/刪除」，`club_member` 唯讀；清單排序由 store 的 `fetchAll` 查詢 `order('established_date', { ascending: false })` 做到，不需要額外的手動排序欄位 |
| `src/router/index.ts` | 新增 `/club/sister-clubs` 路由，`meta.roles` 跟 `/club/officers` 一樣開放給 `club_admin`/`club_secretary`/`club_member` 三種角色（社友唯讀進得去） |
| `src/components/layout/Sidebar.vue` | 「社務管理」區塊在「社的年度成員」後面加一項「🤝 友好社」連結 |

**沒有加**：功能開關（`features` 表）沒有幫這個功能加新的 flag key——參考 `/club/officers`（社的年度成員）同樣沒有 feature flag，直接常駐顯示，這次跟進同樣的模式，不需要地區管理員額外去「功能開關」頁面開啟。也沒有讓地區視角能瀏覽別社的友好社資料（沒被要求，且跟現有 `club_announcements` 的隔離原則一致）。

**驗證**：`npx vue-tsc --noEmit`、`npm run build` 皆通過。本機沒有真實 Supabase 連線，一樣用暫時 `.env`（假金鑰，驗證後已還原不進 commit）+ 暫時在 `main.ts` 掛 `window.__pinia`/`window.__router`（驗證後已還原）搭配模擬 Pinia state：用 `club_secretary` 身分開啟「+ 新增友好社」彈窗確認四個欄位（社名/結盟時間/當屆社長/兩社情誼說明）都在，直接把使用者提供的 5 筆友好社資料塞進 store 的 `list`（跳過真實網路寫入，因為沒有真的 Supabase 連線可以測），確認畫面依結盟時間新到舊排序（2021→2019→2015→2010→2008，最新的八德聯誼會排最上面）；再切成 `club_member` 身分確認同一頁看得到完整清單，但沒有「新增」按鈕、也沒有每列的「編輯/刪除」。**這次的驗證完全沒有測到「真的寫入 Supabase 資料庫」這一段**（migration 還沒執行、也沒有真帳號密碼），麻煩使用者照上面待辦第三十四輪跑一次真實流程確認。

## 本次完成（第三十三輪）：Sidebar 選單重整——地區/社務分流 + 新增「進階設定」分類（預設收合）

使用者指定完整目標選單結構，核心訴求三點：(1) 地區視角不該看到社務管理相關功能；(2) 功能開關/權限矩陣/帳號邀請這類設定項要獨立成「進階設定」分類，不要跟其他功能表混在一起；(3) 「進階設定」平常要收合，點一下才展開，避免有人誤觸。

| 檔案 | 說明 |
|------|------|
| `src/components/layout/Sidebar.vue` | 「地區」區塊不變（社團總覽/地區公告/總監獎項統整/EDM產生器）；把原本塞在「地區」區塊尾端的「功能開關」「權限矩陣」「帳號邀請/管理」抽成獨立的「進階設定」區塊（僅 `isDistrictAdminView` 顯示），「帳號邀請/管理」文字改成「邀請/管理地區帳號」；「社務管理」「進階設定（本社）」兩個區塊的條件都加上 `!auth.isDistrictView`——**這是這次真正修的 bug**：之前只用 `auth.role` 判斷，沒排除地區視角，導致「各社管理員 + 又有地區權限」的帳號切到地區視角時仍會看到社務管理選單；「社務管理」區塊內部重排順序成使用者指定的「社內公告→總監獎項申請→例會管理→社的年度成員→社友名冊→潛在社友→EDM產生器→地區通訊錄」（總監獎項申請使用者確認要保留，原本清單沒列到是列漏了，不是要移除）；移除原本「全角色共用」的獨立「通訊錄」區塊，「地區通訊錄」併入「社務管理」區塊尾端（地區視角不再顯示這個連結，但路由本身沒有角色限制，不影響既有存取權）；兩個「進階設定」的 `<div class="nav-section">` 換成 `<button class="nav-section nav-section-toggle">`，加上 `▸`/`▾` 箭頭，`@click.stop` 切換新增的 `advancedOpen` ref（預設 `false`，兩個進階設定共用同一個狀態，因為地區/各社視角互斥，不會同時渲染），並加了 `watch(() => auth.isDistrictView, () => advancedOpen.value = false)`，切換「地區介面」↔「本社介面」時自動重新收合，避免帶著上次展開的狀態跑到另一邊 |

**沒有動**：`AccountManagementView.vue`（帳號邀請/管理頁）——使用者要求的「地區視角只顯示有地區權限的帳號、不顯示各社的」在第三十二輪已經做完（`allAccounts` computed 用 `isDistrictAdminView` 過濾 `district_role`），這輪檢查過現有邏輯已經符合，不用重複改。

**驗證**：`npx vue-tsc --noEmit` 通過。本機沒有 `.env`／真實登入密碼，改用暫時的 `.env`（假 Supabase URL/Key，讓 `createClient` 不拋錯即可進到登入頁）+ 暫時在 `main.ts` 掛 `window.__pinia`/`window.__router`（驗證後已還原，未進 commit）在瀏覽器 console 直接改 Pinia `auth` store 的 `profile`/`viewScope`，模擬地區管理員／地區唯讀／「各社管理員+地區唯讀」三種身分，截圖＋accessibility snapshot 確認選單結構、順序、顯示/隱藏邏輯都符合預期，尤其第三種身分（過去的 bug 場景）在「地區介面」↔「本社介面」切換時選單能正確互斥；另外用 `element.click()` 實際觸發「進階設定」按鈕，確認初始狀態是收合（▸、看不到底下連結），點擊後展開（▾、露出邀請帳號/功能開關/權限矩陣等連結），兩種身分（地區/各社）都測過。**這台環境沒有真實帳號密碼，無法登入正式站做端對端驗證**，麻煩使用者找一個有雙重身分的真帳號複查一次，見上方待辦第三十三輪。

## 本次完成（第三十二輪）：角色模型簡化成 3 級 + 地區帳號總覽精簡 + 社團資訊頁補齊社務資料

使用者提出四項調整，核心精神是「地區只管地區的事，各社的事交給各社」。進 plan mode 先派兩個 Explore agent 查清楚現況：確認 `club_admin`（社長）跟 `club_secretary`（執秘）在 RLS（12 處 `IN ('club_admin','club_secretary')`）、Edge Function（`CLUB_TIER_ROLES` 常數）、`role_permissions` 資料表（migration 010 種子資料兩者數值完全相同）全部當作等價角色處理，**唯一差異只在畫面上的中文標籤**，所以這次全部是前端顯示層調整，沒有動 migration/RLS/Edge Function。

| 檔案 | 說明 |
|------|------|
| `src/views/admin/AccountManagementView.vue` | `roleLabel()` 合併 `club_admin`/`club_secretary` → 「各社管理員」、`club_member` → 「一般社友」；「帳號審核」角色下拉從 3 選項（社長/執秘/社員）改 2 選項；「邀請社友（Email）」表單重排欄位順序（Email→姓名→所屬社團→角色），角色從下拉選單改成跟「帳號總覽」一致的 `.toggle-switch`（檢視→寫入 `club_member`、編輯→寫入 `club_secretary`，**這是新增能力**：Email 邀請現在也能直接建立唯讀社友帳號，之前只能建立編輯權帳號）；`allAccounts` computed 加上地區視角過濾：`isDistrictAdminView` 時只保留 `district_role` 有值的帳號；移除「可見範圍」三段式分段控制欄位，「權限」欄位改成依視角分支：地區視角切 `district_role`（view/admin），各社自己視角維持原本的 `togglePermission()`（club_member/club_secretary）不變；要新增或撤銷地區權限，改到 `ClubDetailView.vue` 針對單一社團操作 |
| `src/views/admin/ClubDetailView.vue` | `accountRoleLabel()` 同樣合併角色標籤；新增「潛在社友」「例會管理」兩個唯讀區塊，沿用這個檔案本來就在用的「`store.fetchAll(id)` 打特定社團資料、渲染成唯讀表格」模式（跟既有的「社員名單」「社的年度成員」一樣），呼叫 `useProspectiveStore().fetchAll(id)`、`useMeetingsStore().fetchAll(id)`——這兩個 store 的 `fetchAll(clubId)` 本來就是通用的，不用改 store。明確**沒有**加「社內公告」區塊（使用者要求不顯示） |
| `src/views/admin/PermissionMatrixView.vue` | 這裡比較特別：`role_permissions` 對 `club_admin`/`club_secretary` 是兩筆獨立但數值相同的資料列，合併顯示成一列「各社管理員」後，點擊 toggle 要同時更新兩筆底層資料才不會讓兩個角色的權限悄悄跑掉。新增 `DisplayRole` 型別（`district_admin`/`club_tier`/`club_member`）跟 `cellsForRole()`/`isAllowed()` 輔助函式同時查兩個角色的資料列，`toggle()` 同時 `setPermission` 兩筆 |
| `src/components/layout/TopNav.vue` | `baseRoleLabel`/`roleBadgeClass` 合併角色徽章文字跟顏色 |
| `src/components/layout/Sidebar.vue` | 順手拿掉一個死連結：`role === 'club_admin'` 限定、指向不存在路由 `/club/reports` 的「出席統計」連結（調查時發現的唯一一處把 club_admin/club_secretary 當不同角色處理的地方，路由根本沒建） |

明確不動的部分：`clubs.pres_name`/`sec_name`（社團聯絡資訊，`ClubListView.vue`/`ClubEditView.vue` 的社長/執秘欄位）是完全不同的概念（社團的聯絡窗口，不是平台帳號角色），`OfficersView.vue`/`RegisterView.vue` 的社內職稱/扶輪職稱代碼也是另一回事，都沒有動。

**驗證**：`npx vue-tsc --noEmit`、`npm run build` 皆通過。本機用假 Supabase 金鑰起 dev server 確認登入頁沒有因為新 import（`useProspectiveStore`/`useMeetingsStore`）跑出 console 錯誤。這台環境沒有真實帳號密碼，沒辦法登入正式站測試互動流程（尤其是權限矩陣頁的雙寫同步、地區帳號總覽的過濾邏輯），麻煩使用者實測，見上方待辦。

## 本次完成（第三十一輪）：修掉「執秘帳號重設密碼」的既有缺口

第三十輪重構帳號總覽時發現、記錄在 HANDOFF 但沒動的一個既有系統缺口，使用者這輪問「為何權限關閉後才有重設密碼、可編輯卻沒有」，確認要修掉。

| 檔案 | 說明 |
|------|------|
| `supabase/functions/reset-member-password/index.ts`（**程式碼已改，尚未部署**） | 拿掉 `if (targetProfile.role !== 'club_member')` 這行限制，改成只檢查 `targetProfile.phone` 存在。原本的邏輯是「重設密碼只服務手機號碼登入的社員」，但沒考慮到這類帳號被「帳號總覽」的權限開關升級成執秘後，登入信箱是系統合成的 `<手機號碼>@member.d3481.local`，沒有真實收件匣，完全沒有救援管道——現在只要帳號有手機號碼欄位，不管角色是社員/執秘/社長都能用這顆按鈕重設回手機號碼 |
| `src/views/admin/AccountManagementView.vue` | 帳號總覽的「重設密碼」按鈕從 `v-if="a.role === 'club_member' && a.phone"` 改成 `v-if="a.phone"`，同時移除「角色」欄位（使用者反饋不需要顯示） |

**這台環境的 Supabase CLI 目前壞掉**：執行 `supabase functions deploy` 或 `supabase projects list` 都直接噴 `ENOTDIR: not a directory, access '/private/tmp/supabase/config.json'`——是這個沙盒環境的暫存路徑跟 CLI 二進位檔案本身撞名衝突，不是帳號登入或程式碼問題。前端已經推上 Cloudflare 自動部署，但這支 Edge Function 需要使用者在自己的機器上手動部署，見上方待辦第一項。

**驗證**：`npx vue-tsc --noEmit`、`npm run build` 皆通過。Edge Function 邏輯改動很單純（拿掉一個 if 判斷），沒有辦法在這台環境實際呼叫驗證（CLI 壞掉、也沒有真實帳號密碼），部署後麻煩使用者實測一次：把一個手機號碼建立的帳號升級成可編輯，確認「重設密碼」按鈕還在、點下去密碼真的能重設成手機號碼。

## 本次完成（第三十輪）：帳號管理頁重構——合併帳號總覽、修正「可編輯」權限無法關閉的 bug

使用者回報兩個問題：(1) 社員帳號一旦開啟「可編輯」會升級成執秘、跑進「社長／執秘帳號」表，但沒有任何地方能把權限關回「檢視」；(2) 頁面拆成「社長／執秘帳號」跟「社員帳號」兩張表沒必要，應該合併成一張「帳號總覽」，每個帳號用一個開關決定檢視或可編輯。

查出 bug 根因：`accounts.approveRole(id, role)`（`src/stores/accounts.ts:40`）本來就是通用雙向函式，`028_club_tier_role_management.sql` 也早就放行 `club_admin`/`club_secretary`/`club_member` 三者互轉（district_admin 任何社、club_admin/club_secretary 限本社）——**RLS 層完全支援雙向切換，純粹是 UI 只做了升級方向，沒做降級的路徑**。`accounts.managed`／`accounts.members` 這兩個 store 欄位用 grep 確認只有 `AccountManagementView.vue` 這一個檔案在用，所以這次完全不用動 store、migration、Edge Function。

| 檔案 | 說明 |
|------|------|
| `src/views/admin/AccountManagementView.vue` | 頁面改成「帳號邀請」（合併原本的 Email 邀請表單＋手機號碼新增社員表單，「邀請紀錄」收合區塊留在底下）→「帳號審核」（原「自助註冊待審核」，邏輯不變只改標題）→「帳號總覽」（新 computed `allAccounts` 合併 `accounts.managed`＋`accounts.members`，依姓名排序）三段式。帳號總覽表格新增統一的 `togglePermission(a)`（取代原本單向的 `changeMemberPermission`）：目前是 `club_member` 就切到 `club_secretary`（開啟可編輯），否則切回 `club_member`（關閉可編輯，這就是這次要補的路徑），底層都是同一個 `accounts.approveRole()`。「可見範圍」分段控制對合併後所有角色一致顯示（`district_role` 欄位跟 `setDistrictRole()` 本來就沒有角色限制，這是合併表格的自然結果）。「重設密碼」按鈕維持既有限制，改成 `v-if="a.role === 'club_member' && a.phone"`（`reset-member-password` Edge Function 本來就寫死只能重設 `club_member` 角色的密碼，這是既有限制沒有動） |

**已知的既有行為，非本輪引入**：社長（`club_admin`）關閉編輯權限後會變成一般社員，之後若重新打開，固定變成執秘（不會恢復社長身分）——社長身分本來就該透過「帳號邀請」重新指派。另外手機帳號一旦升級成執秘，既有的合成 email（`<手機>@member.d3481.local`）沒有真實收件匣，「重設密碼」按鈕也會消失（因為 Edge Function 只服務 `club_member`），忘記密碼會沒有救援管道——這是系統原本就有的缺口，這次沒有處理，需要的話請另外提出。

**驗證**：`npx vue-tsc --noEmit`、`npm run build` 皆通過。這台環境沒有真實帳號密碼，無法用真帳號登入正式站實測互動流程，麻煩使用者測試，見上方待辦第一項。

## 本次完成（第二十九輪）：視覺改版——整體配置更活潑、易讀，按鈕/開關更直白

使用者要求「改整個配置風格」，先確認定位：純內部社務管理工具（維持現狀，不做對外公開層），改的是視覺／品牌風格，不是功能或架構。用瀏覽器看過正式站現況後發現：儀表板幾乎空白、社團總覽的「查看/編輯」按鈕長得一樣分不出主次、帳號管理頁的「可見範圍」「權限」用原生 `<select>` 狀態不夠一目了然。

調查確認全站樣式集中在 `src/App.vue` 一個 `<style>` 區塊的全域 class（`.btn`/`.bdg`/`.fi`/`.tw` 等），24 個 view 檔案都直接吃這套 class、沒有各自重複定義，所以只改一個檔案就能讓全站視覺同步更新。本次刻意不做資訊架構重組（例如帳號管理頁拆分頁 tab），也不引入任何新套件（無 icon/chart/元件庫），維持這個 repo 手刻 CSS 的慣例。

| 檔案 | 說明 |
|------|------|
| `src/App.vue` | `:root` 新增 `--sky`（次要動作色）、間距 scale（`--sp-1~6`）、圓角 scale（`--r-sm/--r/--r-lg`，`--r` 從 8px 提升到 10px）、陰影 token（`--shadow-sm/md/lg`，原本完全沒有）；基礎字級 `body` 從 14px 提升到 16px（對長輩可讀性影響最大的單一改動），表格/表單字級同步從 13px 提升到 15px；`.btn` 家族每個變體各自的 hover/active 規則（背景加深＋陰影＋位移，取代原本統一的 `opacity:.88`），新增 `.btn-sky`；badge 底色 alpha 調高、文字加深以維持對比度；新增兩個全域 class：`.toggle-switch`（膠囊型二元開關，取代原生 `<select>` 二選一）、`.segmented`（三顆藥丸按鈕的分段控制，取代原生 `<select>` 三選一）；新增 `.stat-grid`/`.stat-card`（含 4 種色條變化）、`.bar-track`/`.bar-fill`（純 CSS 進度條，出席率視覺化用） |
| `src/views/admin/AccountManagementView.vue` | 「可見範圍」（`district_role`）從 `<select>` 換成 `.segmented` 三顆藥丸按鈕；「權限」（社員檢視／可編輯）從 `<select>` 換成 `.toggle-switch`，底層呼叫的 function（`changeDistrictRole`/`changeMemberPermission`）完全沒動，純樣式替換 |
| `src/views/admin/ClubDetailView.vue` | 同上，「可見範圍」換成 `.segmented` |
| `src/views/admin/ClubListView.vue` | 「編輯」按鈕從 `.btn-g`（跟「查看社團資訊」長得一樣）改成 `.btn-sky`，兩個按鈕視覺上能分出主次 |
| `src/views/DashboardView.vue` | 地區視角／各社視角的統計數字從純文字改成 `.stat-card` 彩色卡片；出席率（地區視角的各社列表、各社視角的平均出席率）加上 `.bar-track`/`.bar-fill` 進度條 |

**驗證方式**：`npx vue-tsc --noEmit`、`npm run build` 皆通過。這台環境沒有 `.env`（只有 `.env.example`），先建立臨時 `.env.local`（假的 Supabase URL，僅避免 `createClient()` 因空字串丟例外）起本機 dev server，確認登入頁在新字級/圓角下沒有跑版；接著用 `preview_eval` 把 `.stat-card`/`.segmented`/`.toggle-switch`/`.btn` 家族直接注入頁面截圖比對，確認色彩、圓角、陰影、開關的開/關狀態視覺區分都符合預期。驗證用的臨時 `.env.local` 已刪除，`git status` 乾淨。**沒有**用真帳號登入正式站確認這些控制項在實際資料下的互動流程（可見範圍/權限按下去後狀態是否正確持久化），麻煩使用者實測，見上方待辦第一項。

## 本次完成（第二十六輪）：權限模型重新整理成 4 級，新增「地區（唯讀）」

使用者提出要把權限模型講清楚，總共分 4 級：1. 一般社友（唯讀）2. 各社管理員（社長/執秘對等，可編輯本社）3. 地區（唯讀，可進地區後台看彙總分析/社團總覽/公告/總監獎/EDM，不能編輯）4. 地區管理員（原本的地區權限）。第 1、2、4 級系統本來就是這樣運作，真正要新做的是第 3 級——現有的 `district_access` 只有布林值，一旦是 true 就等同第 4 級，沒有唯讀這個中間層。

跟使用者確認過範圍：第 3 級可以看地區儀表板（後台分析）、社團總覽（含點進去看完整名冊/幹部）、地區公告、總監獎彙總、EDM 產生器；不能碰功能開關、權限矩陣、帳號管理，也不能編輯/刪除/新增任何東西。

| 檔案 | 說明 |
|------|------|
| `supabase/migrations/030_district_view_tier.sql`（**尚未套用**） | `user_profiles.district_access boolean` 換成 `district_role text CHECK (district_role IN ('view','admin'))`（既有 `district_access=true` 一律轉成 `'admin'`，不會有人被降級）；`is_district_admin()` 改吃 `district_role='admin'`；新增 `is_district_viewer()`（`district_role IN ('view','admin')` 或 `role='district_admin'`）；`protect_user_profile_privileged_fields()` 的 `district_access` 檢查換成 `district_role`；放寬 `roster_select`/`prospects_select`/`meetings_select`/`attendance_sessions_select`/`club_officers_select`/`district_announcements_select`/`governor_award_applications_select` 這幾個 SELECT policy，加上 `is_district_viewer()` 的 OR 條件（`attendance_details`、`member_care`、`invite_log`、`role_permissions`、`feature_flags` 的寫入 policy 都刻意沒動，維持地區管理員專屬） |
| `src/stores/auth.ts` | `isDistrictAdmin` 現在精確對應「第 4 級」；新增 `isDistrictViewer`（第 3 或第 4 級都算）；`canSwitchView` 改吃 `isDistrictViewer`（唯讀角色的雙重身分帳號也會有切換按鈕）；`isDistrictView` 語意變成「目前切到地區視角」（第 3、4 級都可能是 true）；新增 `isDistrictAdminView`（`isDistrictView && isDistrictAdmin`，専門給「地區視角 + 有編輯權限」的畫面判斷用，寫死不動的地方全部改用這個，不能只看 `isDistrictView`） |
| `src/router/index.ts` | 新增 `districtViewer: true` 這個 route meta，`/admin/clubs`、`/admin/clubs/:id`、`/admin/announcements`、`/admin/governor-awards`、`/admin/edm` 改用這個（唯讀+管理員都能進）；`/admin/features`、`/admin/clubs/:id/edit`、`/admin/permissions`、`/club/invite` 維持 `role: 'district_admin'`（唯獨管理員能進） |
| `src/components/layout/Sidebar.vue` | 「地區管理」選單改名「地區」；社團總覽/地區公告/總監獎/EDM 產生器對 `isDistrictView` 顯示（唯讀也看得到選單），功能開關/權限矩陣/帳號管理另外包一層 `isDistrictAdminView` |
| `src/components/layout/TopNav.vue` | 角色徽章：第 3 級顯示「＋地區（唯讀）」、第 4 級顯示「＋地區」；視角切換按鈕文字從「地區管理介面」改成「地區介面」（唯讀角色看了才不會誤解） |
| `src/views/admin/AccountManagementView.vue`、`ClubDetailView.vue` | 「可見範圍」下拉從 2 個選項（只能看到各社／同步看到地區）改成 3 個（只能看到各社／地區（唯讀）／地區管理員） |
| `src/views/admin/ClubListView.vue` | 「+ 新增社團」按鈕、排序上下箭頭、「編輯」連結都包 `auth.isDistrictAdminView`；「查看社團資訊」連結維持所有能進這頁的人都看得到 |
| `src/views/admin/DistrictAnnouncementsView.vue` | 「+ 新增公告」按鈕、每列的「編輯」「刪除」都包 `auth.isDistrictAdminView` |
| `src/stores/accounts.ts` | `setDistrictAccess(id, boolean)` 改成 `setDistrictRole(id, 'view'\|'admin'\|null)` |
| `src/types/index.ts` | `UserProfile.district_access: boolean` 換成 `district_role: 'view' \| 'admin' \| null` |
| `supabase/functions/invite-user`、`delete-account`、`create-member-account`、`reset-member-password`（**尚未重新部署**） | `.select()` 的 `district_access` 欄位改成 `district_role`，判斷式改吃 `district_role === 'admin'`（這 4 支都是純地區管理員專屬動作，邏輯不變只是換欄位） |
| `supabase/functions/generate-edm`（**尚未重新部署**） | `scope==='district'` 的授權從「只有 `isDistrictAdmin`」放寬成「`isDistrictAdmin` 或 `isDistrictViewer`」，讓地區唯讀角色也能用 |

**重要：migration 030 跟這 5 支 Edge Function 重新部署有嚴格的先後順序**——Edge Function 的程式碼已經改成查詢 `district_role` 這個新欄位，如果在 migration 030 套用之前就先部署，會直接把現有正常運作的邀請帳號/刪除帳號/EDM 產生器功能打壞（查詢一個還不存在的欄位）。這次沒有像前幾輪一樣直接用 CLI 部署，就是因為要等使用者先確認 migration 030 在 SQL Editor 跑成功。

**驗證**：`npx vue-tsc --noEmit`、`npm run build` 皆通過。這輪牽涉到 RLS policy 大量調整（7 張表的 SELECT policy），沒有真實資料庫連線沒辦法端對端驗證「地區唯讀角色實際登入後看到的畫面/擋掉的頁面」是否完全正確，麻煩使用者照上面待辦第二十六輪的第 3 步實測一次。

## 本次完成（第二十二輪）：註冊頁新增「3481地區辦公室」選項、職稱換成扶輪社真實職稱代碼

延續第二十一輪的自助註冊功能，使用者這輪加兩個需求：

1. 分區選單要多一個「3481地區辦公室」選項，給不屬於特定社團、直接在地區辦公室服務的人註冊時選
2. 職稱下拉原本只有社長/執秘/社員三個系統角色，要換成扶輪社實際會用的職稱代碼：DG/DS/DA/VDS/AG/VAG/CP/PP/P/PE/VP/S/RTN

| 檔案 | 說明 |
|------|------|
| `supabase/migrations/029_registration_title.sql`（新增，**尚未套用**） | `user_profiles` 新增 `requested_title text` 欄位；`handle_new_user()` trigger 同步從 `raw_user_meta_data->>'requested_title'` 寫入。不動既有的 `requested_role`（enum 型別，還是 `user_role` 那四種），因為這 13 種扶輪社職稱跟系統權限角色本來就對不上、沒必要硬塞進同一個 enum |
| `src/views/RegisterView.vue` | 新增 `DISTRICT_OFFICE` sentinel 值：「分區」下拉多一個「3481地區辦公室」選項，選了之後「所屬社團」欄位整個隱藏（`v-if="!isDistrictOffice"`），送出時 `club_id` 帶 `null`——沿用 `district_admin` 帳號本來就允許 `club_id` 是 `null` 的既有資料模型，沒有在 `clubs` 表新增一筆假社團（避免通訊錄、社團總覽、名冊等其他吃 `clubs` 表的功能被污染）。職稱下拉改成 `TITLE_OPTIONS`（13 個代碼＋中文標籤），每個代碼對應一個粗略的 `requested_role` 建議值（`P`/`PE`/`CP`→`club_admin`，`S`→`club_secretary`，其餘→`club_member`），送出時 `requested_role` 跟 `requested_title` 兩個欄位都會帶上去 |
| `src/views/admin/AccountManagementView.vue` | 「自助註冊待審核」的「申請職稱」欄改成優先顯示 `requested_title`（透過 `TITLE_LABELS` 對照表轉中文），沒有的話 fallback 回舊的 `roleLabel(requested_role)`（相容第二十一輪以前、還沒有 `requested_title` 的舊資料）；`clubName()` 補上 `id` 為 `null` 時顯示「3481地區辦公室」，而不是原本的「-」，「社團」欄位才看得出這是地區辦公室的人 |
| `src/types/index.ts` | `UserProfile` 新增 `requested_title: string \| null` |

**這功能只加在自助註冊頁（`/register`）**，地區管理員在「帳號管理」頁手動建立社員帳號（手機號碼那個流程）沒有加這個選項——那支 `create-member-account` Edge Function 目前 `club_id` 是必填，要讓它也支援「3481地區辦公室」的話要改 Edge Function 邏輯並重新部署，這台環境沒有 Supabase CLI 登入權限無法部署，先沒動；如果也需要這個，麻煩之後另外提出。

**驗證**：`npx vue-tsc --noEmit`、`npm run build` 皆通過。用假的 Supabase 連線資訊起本機 dev server，實際在瀏覽器操作註冊頁：確認「分區」下拉有「3481地區辦公室」選項、選了之後「所屬社團」欄位消失、職稱下拉正確列出 13 個代碼且預設是「社友 RTN」、填完 email/密碼後送出按鈕正確從 disabled 變成可點擊（不需要選社團）。驗證用的臨時 `.env.local` 已刪除。

## 本次完成（第二十一輪）：社長／執秘可編輯本社帳號角色、新增社員帳號拆分地區/各社流程、忘記密碼頁加提醒

使用者提三個需求：

1. 自助註冊的帳號，執秘或有編輯權限的人要能在後台編輯每個帳號的權限（不用每次都找地區管理員）
2. 各社自己在「帳號管理」頁新增社員帳號，不需要選社團（本來就固定是自己社）；只有地區管理員在地區介面新增社員帳號時，才需要先選分區再選社
3. 忘記密碼設定新密碼時，頁面要主動提醒密碼至少 8 碼、且不可跟舊密碼相同，避免使用者不斷試錯

| 檔案 | 說明 |
|------|------|
| `supabase/migrations/028_club_tier_role_management.sql`（新增，**尚未套用**） | 放寬 `024_user_profile_district_access.sql` 的 `protect_user_profile_privileged_fields()` trigger：原本只要動到 `role` 欄位就一律要求 `is_district_admin()`；改成社長／執秘（`is_club_tier()`）在**自己社**（`OLD.club_id = current_club_id()`）內，`club_admin`/`club_secretary`/`club_member` 三個角色之間互轉也放行。`club_id`、`district_access` 這兩個欄位維持原樣，只有地區管理員能改，避免社長/執秘藉這個入口把自己的社改掉或拿到地區權限。RLS 這邊不用額外調整——026 的 `profiles_club_tier_manage` policy 本來就已經允許這個範圍的 UPDATE，只是被這支 trigger 擋住 |
| `src/views/admin/AccountManagementView.vue` | ① 新增 `isClubTier`/`canManagePending` computed，「自助註冊待審核」區塊從 `v-if="isDistrictAdmin"` 改成 `v-if="canManagePending"`，執秘/社長也看得到本社的待審核名單（RLS 的 `profiles_select_club` 本來就只會回傳自己社的資料，不用額外過濾）；核准的操作從「核准為 XX／維持社員」兩顆固定按鈕，改成一個角色下拉（預設帶入使用者申請時選的職稱）+「套用」按鈕，可以自由改成任何一種角色，達到「編輯每個帳號的權限」的需求。② 「新增社員帳號」的社團選擇比照 `RegisterView.vue` 的分區→社兩層下拉，但用 `v-if="isDistrictAdmin"` 整個包起來——社長/執秘完全看不到這兩個欄位（`memberClubId` 在 `<script>` 就已經固定成 `auth.clubId`），只有地區管理員才會看到「分區」「所屬社團」兩個下拉，選分區後才能選社 |
| `src/stores/accounts.ts` | `approveRole()` 原本只有角色不是 `club_member` 時才 `fetchManaged()`；現在角色下拉可以自由選任何角色，帳號可能在「社長／執秘帳號」跟「社員帳號」兩個列表之間搬動，改成一律 `Promise.all([fetchManaged(), fetchMembers()])`，確保套用完兩個表格都是最新的 |
| `src/views/ResetPasswordView.vue` | 密碼欄位上方的提示文字補上「密碼至少需要 8 個字元，且不可與目前的密碼相同」；新增 `translateAuthError()`，把 Supabase 在新密碼跟目前密碼相同時回傳的 `should be different from the old password` 錯誤訊息轉成中文 |

**驗證**：`npx vue-tsc --noEmit`、`npm run build` 皆通過。這次額外在 `src/main.ts` 加了一個只在 `import.meta.env.DEV` 生效的暫時性 QA hook（把 `pinia`/`router` 掛到 `window.__qa`），用假的 Supabase URL 起本機 dev server，直接在瀏覽器 console 注入假的 `auth.profile`（分別模擬 `club_secretary` 跟 `district_admin`）與假的 `clubs`/`pending` 資料，實際確認：① 執秘身分能看到「自助註冊待審核」，下拉選單正確預帶申請時選的職稱、也能改選別的角色；② 執秘身分的「新增社員帳號」完全沒有社團/分區欄位，地區管理員身分則有「分區」→「所屬社團」兩層下拉，選分區後社團清單正確被過濾成只剩該分區的社。驗證完已把 `main.ts` 的 QA hook 跟臨時 `.env.local` 全部還原/刪除，`git status` 乾淨。`ResetPasswordView.vue` 的提示文字因為需要真的 Supabase recovery token 才能走到成功畫面，這次沒有另外 mock，是純文字新增、無邏輯風險，用 `vue-tsc`/`build` 通過佐證正確性。

## 本次完成（第二十輪）：通盤審查第十七～十九輪合併後的程式碼，找到密碼長度設定問題

使用者請 Claude 查一下最新 repo/HANDOFF 狀態並繼續執行。這台環境的 Supabase CLI（`npx supabase projects list`）跟 Cloudflare `wrangler`（`npx wrangler whoami`）都顯示尚未登入，跟上一輪 HANDOFF 記錄的「已登入」狀態不同（推測是不同執行環境/session，登入狀態不會跨環境保留），所以這輪沒辦法像第十八輪一樣直接用 CLI 部署，只能做程式碼層面的事。

- `npx vue-tsc --noEmit` + `npm run build` 重新確認目前 `origin/main` 最新狀態（含第十九輪的分區註冊、第十八輪的手機帳號）沒有型別錯誤、build 正常
- 通盤看過 `supabase/functions/create-member-account/index.ts`、`supabase/functions/reset-member-password/index.ts`、`supabase/migrations/026_member_phone_accounts.sql`、`027_registration_zone.sql`、`src/stores/auth.ts` 的 `resolveLoginEmail()`：手機↔合成 email 的轉換邏輯（`<phone>@member.d3481.local`）在建立帳號、登入兩處寫法一致，沒有發現邏輯不一致的問題
- **發現一個設定面的潛在阻塞**：兩支 Edge Function 都把社員密碼設成 `phone.slice(-4)`（只有 4 碼），但 Supabase Auth 專案預設的「Minimum password length」是 6 碼，`admin.createUser()`/`updateUserById()` 在密碼太短時會直接回傳錯誤（不是隱性失敗——两支 function 都有把 `error.message` 原樣往前端丟，使用者會看到明確錯誤，但如果沒人事先知道要調整 Dashboard 設定，第一次測試「建立社員帳號」大概率會卡在這裡，還以為是程式碼壞了）。這不是程式碼 bug，是 Supabase 專案設定跟這個功能的產品設計（給長輩用的極簡 4 碼密碼）本來就沒有互相配合，需要使用者到 Dashboard 手動調整，Claude 沒有 Dashboard 存取權限無法代勞，詳見上方待辦 1
- 沒有做任何程式碼修改（審查沒發現需要改程式碼的問題），只更新了這份 HANDOFF

## 本次完成（第十九輪）：註冊頁改成先選分區、再選社

使用者回報第十七輪的自助註冊頁「所屬社團」是單一長清單（全地區幾十個社），長輩/一般使用者要在裡面找自己的社不方便。改成跟後台「社團管理」頁一致的兩層結構：先選分區，再選該分區底下的社。

- `supabase/migrations/027_registration_zone.sql`（**尚未套用**）：`public_clubs_for_registration()` 從只回傳 `id`/`name` 改成也回傳 `zone`（`clubs.zone`，跟 `ClubListView.vue` 用的是同一個欄位）
- `src/views/RegisterView.vue`：
  - 沿用 `ClubListView.vue` 的 `ZONE_ORDER`／`zoneRank()` 排序邏輯（第一分區～第十一分區依序，沒對到的分區排最後），確保註冊頁的分區順序跟後台「社團管理」頁一致
  - 新增「分區」下拉（`zones` computed，從載入的 `clubs` 去重＋排序），選了分區後「所屬社團」下拉才會啟用，並用 `clubsInZone` computed 過濾成只顯示該分區的社；切換分區會清空已選的社（`onZoneChange`）
  - 欄位順序：電子郵件 → 分區 → 所屬社團 → 職稱 → 密碼 → 確認密碼
  - `canSubmit` 加上 `!!zone.value` 這個條件

**驗證**：`vue-tsc --noEmit` + `npm run build` 皆通過。這次額外在本機建立一個**不會進 git**的臨時 `.env.local`（假的 Supabase URL/anon key，只是為了讓 `createClient()` 不要因為空字串直接丟出例外、讓畫面能跑起來，不是真的連到任何專案），用瀏覽器 preview 實際跑過 `/register` 頁：攔截 `public_clubs_for_registration` 的網路請求、餵假資料（兩個分區＋一個沒對到排序表的怪分區名稱），確認排序正確、選「第一分區」後「所屬社團」正確只出現該分區的兩間社、未選分區前社團下拉維持 disabled。驗證完已刪除該臨時檔案。

## 本次完成（第十八輪）：社員手機號碼帳號機制——免 Email 註冊/登入

使用者提出：一般社員（`club_member`，之前在 `ARCHITECTURE.md` 標註「暫不開放」）很多是長輩，收 Email、走邀請信設密碼的流程對他們太不方便。討論後確認方向：改成後台由社長/執秘直接建帳號，社員用**手機號碼**登入；初始密碼＝**手機末四碼**；忘記密碼由社長/執秘**一鍵重設回手機末四碼**（不走 email 重設連結）。**這套跟第十七輪剛推上去的 Email 自助註冊機制並存**：懂得用 Email 的社員可以走自助註冊，長輩則由執秘/社長用這套手機號碼機制代為建帳號。

- `supabase/migrations/026_member_phone_accounts.sql`（**尚未套用，需使用者到 SQL Editor 執行**）：`user_profiles` 新增 `phone`（唯一）欄位；放寬 012 的 `profiles_club_tier_manage` UPDATE policy，讓社長/執秘除了能管理本社 `club_admin`/`club_secretary` 帳號外，也能管理本社 `club_member` 帳號（停用/啟用）
- `supabase/functions/create-member-account/index.ts`（新檔案，**尚未部署**）：跟 `invite-user` 同一套權限模型（地區可建任何社、各社只能建本社），但不寄邀請信——直接呼叫 `admin.createUser()`，`email` 欄位用合成信箱 `<手機號碼>@member.d3481.local`（社員完全不用知道有這個 email 存在），`email_confirm: true` 略過驗證，密碼預設手機末四碼。`handle_new_user()` trigger 會照常從 `user_metadata` 建立 `user_profiles`，這支再補一次 `UPDATE ... SET phone`
- `supabase/functions/reset-member-password/index.ts`（新檔案，**尚未部署**）：只能重設 `club_member` 角色的密碼，同社或地區管理員才能操作，重設回該帳號 `phone` 的末四碼
- `supabase/functions/delete-account/index.ts`：`CLUB_TIER_ROLES` 只用來判斷呼叫者權限，新增 `DELETABLE_ROLES` 允許刪除目標帳號的角色放寬到含 `club_member`（原本只能刪社長/執秘）
- `src/stores/auth.ts` 的 `signIn()`：改吃 `identifier`（email 或手機號碼皆可），內部 `resolveLoginEmail()` 判斷有無 `@`，沒有就正規化成純數字再組合 `<phone>@member.d3481.local` 呼叫 `signInWithPassword`——社長/執秘照舊用 email 登入，社員用手機號碼，同一個登入表單、同一支 function
- `src/views/LoginView.vue`：欄位改成「帳號（Email 或手機號碼）」單一輸入框，不用另外做分頁籤；跟第十七輪加的「忘記密碼？」「註冊新帳號」連結並存
- `src/views/admin/AccountManagementView.vue`：新增「新增社員帳號」表單（姓名+手機號碼，地區管理員多一個選社團欄位）與「社員帳號」列表（重設密碼／停用啟用／永久刪除），沿用既有「社長／執秘帳號」表格的 UI 風格，跟第十七輪加的「自助註冊待審核」區塊並存
- `src/stores/accounts.ts`：新增 `members`、`fetchMembers`、`createMember`、`resetMemberPassword`；`setActive`/`deleteAccount` 改成同時同步 `managed` 與 `members` 兩個列表；跟第十七輪加的 `pending`/`fetchPending`/`approveRole`/`dismissPending` 並存
- `src/types/index.ts`：`UserProfile` 加上 `phone: string | null`（跟第十七輪加的 `requested_role` 並存）

**這輪推上去時發現的狀況**：push 前 `git fetch` 才發現另一個 session 幾乎同時已經把「Email 自助註冊」推上 `origin/main`（`8b709bb`），改到的檔案高度重疊。已用 `git rebase origin/main` 手動合併兩邊邏輯（不是誰蓋掉誰），並把我的 migration 從 `025` 改名成 `026` 避免編號衝突。合併後重新跑過 `vue-tsc --noEmit` + `npm run build` 確認沒有壞掉。

**驗證方式與限制**：本機沒有 `.env`（只有 `.env.example`，credentials 不會進 git），這個環境連不上真實 Supabase 專案，所以只做了 `npx vue-tsc --noEmit`（通過）與 `npm run build`（通過）靜態驗證；也試著在瀏覽器 preview 開發伺服器，確認是「沒有 `.env`」導致整個 App 連登入頁都出不來（換成 stash 掉本輪修改後、原本的 main 分支一樣是空白畫面，確認不是本輪改動造成的問題，是這個環境本來就沒有連線）。**使用者拿到真實 credentials 後，麻煩務必實測**：套用 migration 026 → 部署兩支新 function → 用社長/執秘帳號建一個測試社員 → 用手機號碼登入 → 測試重設密碼。

## 本次完成（第十七輪）：開放自助註冊 + 忘記密碼

使用者提出兩項需求：(1) 登入頁開放自助註冊（email + 選社 + 職稱 + 密碼兩次，送驗證信，驗證後才能登入，沒選社不給送出）；(2) 登入頁加忘記密碼功能（寄信重設密碼）。

事先跟使用者確認過一個關鍵決策：自助註冊選的「職稱」（社長／執秘／社員）**不會**直接授權，一律先建立 `club_member`（最低權限）帳號，職稱只存成 `requested_role` 供地區管理員在「帳號管理」頁決定是否手動核准升級——避免任何人自稱社長就直接拿到整個社的編輯權限，維持原本邀請制的信任模型。

| 檔案 | 說明 |
|------|------|
| `supabase/migrations/025_self_registration.sql` | 新增 `user_profiles.requested_role user_role` 欄位；`handle_new_user()` trigger 同步寫入 `requested_role`（`role` 仍照舊邏輯，沒有 metadata 就 fallback `club_member`，自助註冊流程不會傳 `role`，所以一定是 `club_member`）；新增 `public_clubs_for_registration()`（`SECURITY DEFINER`，只回傳 `id`/`name`）並 `GRANT EXECUTE` 給 `anon`，讓未登入的註冊頁能顯示社團下拉選單，不必把整張 `clubs` 表（含社長電話等聯絡資訊）開放給匿名使用者 |
| `src/views/RegisterView.vue`（新增） | 註冊表單：email、社團下拉（呼叫 `public_clubs_for_registration` RPC）、職稱下拉、密碼 ×2。沒選社團時送出按鈕直接 disabled，送出呼叫 `supabase.auth.signUp()`，`options.data` 帶 `club_id`/`requested_role`，`emailRedirectTo` 指向 `/verify-email`，成功後導回 `/login?registered=1` |
| `src/views/VerifyEmailView.vue`（新增） | 驗證信連結的落地頁，比照 `AcceptInviteView` 處理三種連結格式（`token_hash`+`type` / `code` / hash 隱含 session），驗證成功後登出並導回 `/login?verified=1` |
| `src/views/ForgotPasswordView.vue`（新增） | 輸入 email 呼叫 `resetPasswordForEmail()`，`redirectTo` 指向 `/reset-password`；不論該 email 是否存在都顯示同一句成功訊息，避免帳號列舉 |
| `src/views/ResetPasswordView.vue`（新增） | 重設密碼信連結的落地頁，邏輯同 `AcceptInviteView` 但用於 `recovery` 類型，設定新密碼後登出並導回 `/login?reset=1` |
| `src/views/LoginView.vue` | 新增「忘記密碼？」「註冊新帳號」連結；依 query string（`registered`/`verified`/`reset`）顯示對應的綠色提示訊息 |
| `src/stores/accounts.ts` | 新增 `pending`（`requested_role` 非空的帳號清單）、`fetchPending()`、`approveRole(id, role)`（把 `role` 設成核准的角色並清空 `requested_role`）、`dismissPending(id)`（只清空 `requested_role`，維持 `club_member`） |
| `src/views/admin/AccountManagementView.vue` | 只有地區管理員看得到的新區塊「自助註冊待審核」，列出姓名/社團/申請職稱，可核准或維持社員 |
| `src/types/index.ts` | `UserProfile` 新增 `requested_role: UserRole \| null` |

角色升級的權限完全沿用既有機制，沒有新增 Edge Function：`011_invite_deactivate_gaps.sql` 的 `profiles_district_admin_manage` policy 本來就允許地區管理員 `UPDATE` 任何 `user_profiles`，`024` 的 `protect_user_profile_privileged_fields` trigger 也已限制只有 `is_district_admin()` 能改 `role`，所以「帳號管理」頁的核准按鈕直接呼叫 `supabase.from('user_profiles').update(...)` 就會被 RLS 正確擋掉/放行。

本輪只做到程式碼完成 + `npx vue-tsc --noEmit` 與 `npm run build` 都過、UI 用假的 Supabase 金鑰跑過畫面（表單驗證、disabled 邏輯、banner 文字都確認正常），**沒有**用真金鑰跑過完整 signUp → 收信 → 驗證 → 登入的端對端流程，因為這個 session 的 `/tmp` clone 沒有 `.env.local`（不在 repo 裡）也没有 Supabase CLI/MCP 可以直接連正式專案。上線前務必按照上面「待辦 0」跑一次真的流程再放心交給使用者用。

## 本次完成（第十六輪）：找到例會編輯儲存失敗的真正根因——GENERATED 欄位 `year_term` 誤入 update payload

使用者在第十三輪修過（加上錯誤提示）之後，回報同一個問題還是存在：例會編輯儲存後，總表仍顯示舊資料。重新檢查發現第十三輪的修正只解決了「失敗時不再靜默」，並沒有真正解決寫入失敗本身。

- 真正根因：`meetings` 表的 `year_term` 是 `005_add_year_term.sql` 建立的 `GENERATED ALWAYS AS (...) STORED` 欄位（依 `date` 自動算出扶輪年度，例如 `2025-2026`），Postgres 明確禁止對 GENERATED 欄位直接寫入，違反會直接拒絕整個 UPDATE/INSERT
- 但 `src/types/index.ts` 的 `Meeting` 介面完全沒有宣告 `year_term`（跟 `AttendanceSession.rate` 那種有註明「GENERATED column，唯讀」的正確寫法不一致）；第十三輪把 `openEdit()` 改成用解構排除 `id`/`created_at`/`updated_at`，但因為型別裡根本沒有 `year_term`，TypeScript 檢查不出來還漏了它——而 `select('*')` 在執行期真的會把 `year_term` 一起抓回來，所以解構出來的 `rest` 物件其實還是帶著 `year_term`，送進 `meetings.update()` 照樣被 Postgres 拒絕
- 換句話說：第十三輪加的 `error` 提示理論上這次應該真的有跳出來（因為 UPDATE 被 Postgres 拒絕會回傳明確的 error），但寫入失敗本身完全沒解決，使用者看到的還是「總表沒更新」的症狀
- 這次修正：
  1. `src/types/index.ts`：`Meeting` 介面補上 `year_term: string // GENERATED column，唯讀`，`MeetingInsert`/`MeetingUpdate` 的 `Omit` 加入 `'year_term'`，比照 `AttendanceSession` 的既有慣例
  2. `src/views/meetings/MeetingListView.vue` 的 `openEdit()`：不再用 `{...m}` 或解構排除法從 fetch 回來的 row 整包帶出 payload，改成把每個可編輯欄位明確列出來組成 `form.value`——這樣不管未來 `meetings` 表再加什麼 GENERATED/唯讀欄位，都不會意外夾帶進寫入 payload，不用每次都要記得回來補排除清單
- `vue-tsc --noEmit`、`npm run build` 皆通過；本地沒有這個專案的 Supabase 連線資訊無法用真實帳號重現原始 500/RLS 錯誤訊息驗證，請使用者這次實測時特別留意：如果編輯儲存還是失敗，畫面現在應該會跳出明確的 `alert` 錯誤訊息（不會再靜默），麻煩把錯誤訊息內容回報，才能確認是否還有其他根因

## 本次完成（第十二輪）：地區/各社視角切換 + EDM 產生器（Phase 2 第一階段）

使用者提出兩項需求：(1) 同時擁有地區與各社權限的人，要能在左上角切換「地區管理介面」/「各社介面」視角；(2) 想開始導入 Phase 2 的 EDM 功能。

### 1. 地區/各社視角切換

`user_profiles.district_access = true` 的社長/執秘/社員，原本一登入就被鎖死在地區檢視（`auth.isDistrictAdmin` 只要為 true 就強制顯示地區儀表板/介面標籤），沒辦法切回自己社的日常畫面。

| 檔案 | 說明 |
|------|------|
| `src/stores/auth.ts` | 新增 `viewScope`（`'district' \| 'club'`，依帳號存在 `localStorage`）、`canSwitchView`（同時有地區權限 *且* 有 `club_id` 才能切換）、`isDistrictView`（實際目前檢視的視角）、`setViewScope()` |
| `src/components/layout/TopNav.vue` | `canSwitchView` 為 true 時，左上角原本靜態的介面文字改成「地區管理介面／XX社」兩顆可點擊切換的 pill 按鈕 |
| `src/views/DashboardView.vue` | 改依 `auth.isDistrictView`（而非 `auth.isDistrictAdmin`）決定顯示地區儀表板或本社儀表板，並加上 `watch` 讓切換視角時即時重新載入資料，不用整頁重新整理 |
| `src/components/layout/Sidebar.vue` | 「地區管理」選單區塊改依 `auth.isDistrictView` 顯示/隱藏；「社務管理」區塊維持依實際角色顯示（不受視角影響，跟既有「帳號」區塊在地區/各社都各有一個入口的設計一致） |
| `src/views/directory/DirectoryView.vue` | 通訊錄頁「管理社團」按鈕改依 `auth.isDistrictView` |

真正的權限（router 守衛、`auth.isDistrictAdmin`、各頁面的 RLS）完全不受這個切換影響 —— 這只是「目前預設看哪個視角」的 UI 開關，純 `district_admin`（沒有 `club_id`）或純各社角色（沒有 `district_access`）不會看到切換按鈕，行為跟改動前一樣。

### 2. EDM 產生器（Phase 2 第一階段）

跟使用者確認過範圍：不寄送 Email（現有 Supabase 自訂 SMTP 主要是給邀請信用，大量群發的穩定性/追蹤功能不足），改成在平台上用 AI 產生 EDM 文案，管理員自行複製文字或列印成 PDF 後用既有管道（Email/Line 群組等）發送。AI 部分先做「協助生成/潤飾文案」，地區公告轉發、例會提醒範本等後續階段再加。

| 檔案 | 說明 |
|------|------|
| `supabase/functions/generate-edm/index.ts`（新檔案） | 驗證呼叫者角色（地區：`district_admin`/`district_access`；各社：`club_admin`/`club_secretary`，只能產生本社範圍）後，組 prompt 呼叫 Anthropic API（`claude-opus-4-8`，用 `output_config.format` 的 `json_schema` 強制回傳 `{title, body}`），回傳文案給前端。**尚未部署，需設定 `ANTHROPIC_API_KEY` secret（見上方待辦）** |
| `src/stores/edm.ts`（新檔案） | 呼叫 `supabase.functions.invoke('generate-edm', ...)`，管理 `loading`/`error`/`title`/`body` 狀態 |
| `src/views/edm/EdmGeneratorView.vue`（新檔案） | 表單：主題（必填）、重點內容、語氣（選填）→「AI 生成文案」；產生後標題/內文可直接編輯，提供「複製文字」（`navigator.clipboard`）與「下載 PDF」（`window.print()`，搭配 `@media print` 只顯示文案內容，其餘表單/按鈕/TopNav/Sidebar 都隱藏，使用者在瀏覽器列印對話框選「另存為 PDF」即可） |
| `src/router/index.ts` | 新增路由 `/admin/edm`（`district_admin`）、`/club/edm`（`club_admin`/`club_secretary`），兩者皆掛 `feature: 'B5_edm'` |
| `src/components/layout/Sidebar.vue` | 地區管理／社務管理區塊各加一個「EDM 產生器」連結，皆受 `features.isEnabled('B5_edm')` 控制 |
| `src/views/admin/FeatureFlagsView.vue` | `B5_edm` 標籤從「EDM 通知（AI 整合）」改成「EDM 文案產生器（AI 輔助）」，更貼近實際行為（不寄信） |
| `ARCHITECTURE.md` | 更新 Edge Function 列表、`B5_edm` 說明、Phase 2 規劃段落 |

**中文 PDF 為什麼用瀏覽器列印而不是 jsPDF**：jsPDF 預設字型（Helvetica 等）不支援中文字形，要嵌入 CJK 字型檔案才能正常顯示中文，成本較高；瀏覽器原生列印（`window.print()` → 另存為 PDF）直接沿用系統字型，中文顯示完全沒問題，也不用多裝套件，是這個情境下最低成本的做法。

**驗證方式**：本機沒有這個專案的 Supabase 連線資訊，用暫時性 `.env`（無效但格式正確的 URL）+ Pinia state 注入方式在瀏覽器內確認：視角切換 pill 按鈕在雙重權限帳號（`club_admin` + `district_access`）下正確顯示並可切換、切換後儀表板/Sidebar 即時改變；EDM 表單、AI 呼叫失敗時的錯誤訊息顯示、產生結果後的預覽/編輯/複製/PDF 按鈕皆正常顯示，`.print-only` 區塊在一般畫面下確認為 `display:none`。驗證用的暫時性修改（`.env`、`main.ts` 的 QA hook）已全部還原，`vue-tsc --noEmit` 確認無型別錯誤。

## 本次完成（第十四輪）：清查全站「儲存不檢查 error」寫法

延續第十三輪修 `MeetingListView.vue` 時留下的追蹤項目（同一種寫法在其他頁面也存在），這輪對 `src/views` 底下所有頁面做全面清查：`grep` 所有呼叫 store `insert`/`update` 的地方，找出沒有解構 `{ error }` 就直接往下走的呼叫點，逐一比照 `MeetingListView.vue`/`RosterView.vue` 的 `saveBulkEdit()`（已有的正確寫法）補上錯誤處理。

修正的 4 個檔案：

| 檔案 | 函式 | 修法 |
|------|------|------|
| `src/views/roster/RosterView.vue` | `save()` | 新增/編輯社友 modal，改成檢查 `error`，失敗時 `alert()` 並保留 modal 不關閉 |
| `src/views/roster/RosterView.vue` | `confirmImport()` | Excel 匯入迴圈，改成每筆檢查 `error`，失敗時 `alert()` 標明是第幾列/哪個姓名匯入失敗，並中止迴圈（不繼續匯入後面幾筆造成部分成功、使用者卻不知道匯到哪裡的情況） |
| `src/views/roster/ProspectiveView.vue` | `save()` | 新增/編輯潛在社友 modal，同 `RosterView.vue` 的 `save()` 修法 |
| `src/views/club/OfficersView.vue` | `saveSingleRoles()` | 主要幹部（社長/當選人/副社長/秘書）與委員會成員的新增/更新迴圈，原本完全沒檢查任何一次 `insert`/`update` 的結果；改成每次呼叫都檢查 `error`，失敗時 `alert()` 並中止（`saving.value = false`、直接 `return`，不繼續跑後面的幹部/委員，也不會誤觸發 `syncRosterAnnualPositions()`） |

檢查範圍涵蓋 `src/views` 下所有 `.vue` 檔（包含 `admin/`、`club/`、`meetings/`、`roster/`、`directory/`、`edm/` 等子目錄），確認除了上述 4 處，其餘呼叫 store `insert`/`update` 或直接呼叫 `supabase.from().update()` 的地方（如 `ClubDetailView.vue` 的 `changeDistrictAccess()`）都已經有檢查 `error`，不需要額外修正。這次沒有處理 `remove`/`delete` 呼叫（不在這輪清查範圍內，且大多數 `remove` 呼叫是批次收尾的次要操作，失敗風險與影響跟「使用者按儲存卻沒真的存到」不同，留待之後視需要再評估）。

本地沒有這個專案的 Supabase 連線資訊，無法用真實帳號重現/驗證原始情境下的錯誤訊息顯示，僅完成程式碼層面的檢查：`vue-tsc --noEmit`、`npm run build` 皆通過，無型別錯誤。

## 本次完成（第十三輪）：例會編輯儲存靜默失敗 + 地區儀表板改分區收折

使用者一次回報三個問題，本輪處理其中兩個（第三個切換按鈕問題見上方待辦 #1，需要使用者協助排查環境面才能繼續）。

### 例會管理：編輯已存在的例會，按儲存後總表仍顯示舊資料

- `src/views/meetings/MeetingListView.vue` 的 `save()` 呼叫 `meetings.update()`/`meetings.insert()` 都沒有檢查回傳的 `error`，Supabase/RLS 若寫入失敗（例如 `has_permission('meetings','edit')` 為 false），畫面上會照樣關閉 modal、看起來像「存過了」，但資料庫其實完全沒變，等於是靜默失敗——這正是使用者描述的症狀
- `openEdit(m)` 原本用 `form.value = { ...m }` 整包複製，因為 `MeetingInsert` 型別在結構上允許多餘欄位，實際上會把 `id`/`created_at`/`updated_at` 也一起塞進 update payload（雖然值相同不會造成資料錯誤，但型別不乾淨、容易誤導）
- 修正：`save()` 改成檢查 `error`，失敗時 `alert()` 顯示錯誤訊息並保留 modal 不關閉；`openEdit()` 改用解構把 `id`/`created_at`/`updated_at` 排除，只留乾淨的 `MeetingInsert` 欄位
- **這個修正能解決的是「失敗但看起來像成功」的體驗問題，讓真正的錯誤原因會显示出來**；如果實際根因是 RLS 權限判斷本身有問題（例如該帳號的 `role_permissions` 被地區管理員關掉了 `meetings.edit`），使用者下次重現時畫面會跳出明確的錯誤訊息，屆時再依錯誤內容進一步排查
- 本地沒有這個專案的 Supabase 連線資訊，無法用真實帳號重現/驗證原始 bug，僅完成程式碼層面的檢查（`vue-tsc --noEmit`、`npm run build` 皆通過）；已在 [task_9592cf3f] 標記同一種「儲存不檢查 error」的寫法在 `RosterView.vue` 等其他頁面也存在，列為後續待處理項目（不影響這次的三個回報問題）

### 地區儀表板：出席率 / 入退社人數統計改為依分區收折

- 使用者要求比照「社團總覽」（`ClubListView.vue`）的分區收折樣式：左邊是可收折的分區列，右邊才是出席率、入/退社人數統計欄位
- `src/stores/dashboard.ts`：`loadDistrict()` 原本回傳兩個分開的陣列 `districtClubAttendance`/`districtClubMovements`，且查 `clubs` 時沒有選 `zone` 欄位；改成合併成單一 `districtClubStats`（含 `zone`），因為畫面上這兩組資料本來就是要合併顯示在同一張表裡
- `src/views/DashboardView.vue`：地區檢視的「各社出席率」「各社申請入社/退社人數」兩張獨立表格，合併成一張表（欄位：社名｜出席率｜申請入社｜退社），並比照 `ClubListView.vue` 的 `ZONE_ORDER`/`groupedClubs`/`toggleZone` 邏輯做分區收折（同一套慣例，這個專案目前是每個頁面各自複製一份，沒有抽共用 composable）
- 移除不再使用的 `.district-grid` 雙欄版面 CSS，改用 `.zone-row`/`.zone-chevron`（樣式直接比照 `ClubListView.vue`）
- 本地沒有 Supabase 連線資訊無法用真實資料截圖驗證畫面，僅完成 `vue-tsc --noEmit` + `npm run build` 確認型別與建置正確；請使用者實際登入後確認分區收折、展開/收合、各社出席率與入退社人數是否正確對應

## 本次完成（第十一輪）：修正設定密碼頁 `Auth session missing!` 錯誤

使用者依「第九輪」的版面修正實測邀請信連結，確認能進入設定密碼頁；但輸入密碼送出後畫面顯示紅字 `Auth session missing!`，密碼沒有真的設定成功。

- 根因：`AcceptInviteView.vue` 完全沒有主動處理邀請連結網址上的驗證參數，單純假設 `supabase.auth.updateUser()` 呼叫當下已經有登入 session。這個假設只在邀請連結是「hash 隱含授權」格式（`#access_token=...`）時成立，因為 supabase-js 只會自動偵測網址 **hash** 片段建立 session；但 Supabase 目前預設的邀請信樣板改用 `?token_hash=...&type=invite`（query string），這種格式不會被自動處理，需要手動呼叫 `supabase.auth.verifyOtp({ token_hash, type })` 才能建立 session，這正是使用者實際遇到的情況
- 修正 `AcceptInviteView.vue`：`onMounted` 時解析網址上的 `token_hash`/`type`（呼叫 `verifyOtp`）或 `code`（PKCE flow，呼叫 `exchangeCodeForSession`）；若都沒有則退回檢查是否已有 session（相容舊的 hash 隱含授權格式，這種格式不需要額外處理）。驗證失敗會顯示「邀請連結無法使用」錯誤畫面，而不是讓使用者填完密碼送出才發現失敗；驗證成功後用 `router.replace` 把網址上的 token 參數清掉，避免殘留在瀏覽器紀錄或被重新整理時重複處理
- 已在本機用假 `token_hash` 驗證錯誤處理路徑：頁面會正確顯示「邀請連結無法使用」+ 錯誤訊息，卡片版面不會跑掉
- **使用者用另一組 Email 帳號實測確認整段邀請流程正常**，`Auth session missing!` 問題已解決，不再需要進一步排查

## 本次完成（第十輪）：018 migration 修正為可重複執行 + 確認 015~021、012~014 全數套用

使用者在正式環境依序執行 015~021 時，`018_club_officers.sql` 回報 `type "club_officer_role" already exists`（代表先前已部分執行過但沒跑完）。原始 018 沒有做重複執行保護（不像 015/019 用 `WHERE NOT EXISTS` / `IS NULL` 防呆），已改寫成每個物件（type/table/index/policy/trigger）建立前都先檢查是否存在，比照 015/019 的可重複執行設計。修正後使用者重新執行成功。

之後用診斷 SQL 依序確認 015~021、012~014 共 10 支 migration 在正式環境皆已正確套用，且「台北市和平扶輪社」/「台北和平扶輪社」重複資料問題已透過修正 seed 社名（見上方待辦 #2）從源頭解決，不需要事後合併。Edge Functions 部署版本、Site URL/Redirect URLs、自訂 SMTP 也逐一在 Dashboard 確認正常。至此 HANDOFF 待辦清單全數清空。

## 本次完成（第九輪）：設定密碼頁改版面

使用者確認邀請信連結已能正常進入設定密碼頁，但畫面卡在左上角、比例跟其他頁面不搭。

- 根因：`AcceptInviteView.vue` 沿用給「有側邊選單版面」用的 `.page`/`.tw` 共用 class，但這個路由是 `bare: true`（不掛 TopNav/Sidebar），少了外層 flex/padding 容器，畫面就直接貼在 `#app-root` 左上角
- `LoginView.vue`（同樣是 bare + public 頁面）本來就有自己一套「滿版置中卡片」樣式（`min-height:100vh` + flex 置中 + navy 底 + 金色斜紋裝飾），改成讓 `AcceptInviteView.vue` 比照這套視覺語言重寫，兩個頁面現在版面調性一致
- 桌機（1280px）與手機（375px）都截圖確認卡片置中、比例正常

## 本次完成（第八輪）：修正邀請信連結被導回登入畫面

使用者回報：兩組 Email 帳號收到邀請信後，點擊信件連結都進入登入畫面，沒有進到設定密碼頁面。

- 檢查 `src/router/index.ts` 的全域守衛，發現 `/accept-invite` 路由 `meta` 只有 `bare: true`，沒有 `public: true`（`/login` 有）。守衛邏輯是 `if (!to.meta.public && !auth.isLoggedIn) return { name: 'login' }`，代表使用者從邀請信連結進站時，只要當下 `auth.isLoggedIn` 還沒轉為 true（例如 Supabase 從網址 hash/`code` 建立 session 需要一點時間，或該次因故未能建立 session），守衛就會直接把人導回登入頁，`AcceptInviteView.vue` 完全沒有機會掛載
- 修正：`src/router/index.ts` 的 `/accept-invite` 加上 `public: true`，讓這個路由不受登入狀態把關；`AcceptInviteView.vue` 本身呼叫的 `supabase.auth.updateUser()` 會自己等待 session 就緒，不需要靠路由守衛先驗證登入
- 已在本機用暫時性 `.env`（無效但格式正確的 Supabase URL）+ 未登入狀態驗證：修正前 `/accept-invite` 會被導向 `/login`，修正後即使完全沒有 session 也能正常顯示「設定登入密碼」頁面；同時確認其他受保護頁面（如 `/directory`）在未登入時仍正確導向登入頁，守衛沒有被整個繞過
- **這個修正解決的是「連結有正確帶到 `/accept-invite` 但被守衛攔截」這種情況**。如果實際問題是邀請信連結本身網址就不對（沒帶到 `/accept-invite`，或網域是 localhost），這個修正沒辦法解決，需要照上方待辦 #6 檢查 Supabase Dashboard 的 Site URL / Redirect URLs 設定——這是我在這個環境沒有 Supabase MCP 存取權限、只能看程式碼層面的部分，Dashboard 設定要請使用者自行確認

## 本次完成（第七輪）：儀表板文案/統計 + 社友名冊欄位調整

使用者回饋儀表板與社友名冊顯示欄位需要更貼近社內使用方式。

| 檔案 | 說明 |
|------|------|
| `supabase/migrations/021_roster_member_profile_fields.sql` | `roster` 新增 `club_position`（`PP`/`IPP`/`P`/`VP`/`PE`/`S`/`社友`）、`member_status`（`normal`/`leave`/`resigned`，畫面顯示正常/請假/退社）、`personal_phone`、`company_phone`；既有 `phone` 會回填到 `personal_phone`，退社資料同步 `member_status='resigned'` |
| `src/views/DashboardView.vue`、`src/stores/dashboard.ts` | 儀表板「本屆例會數」改為「本月例會數」，統計改查當月 `meetings.date`；「在職社友人數」改顯示「社友人數」 |
| `src/views/roster/RosterView.vue` | 社友名冊列表改為英文名稱優先、再中文姓名；新增社內職稱、狀態、個人電話、公司電話；社內職稱/狀態在新增與編輯表單中以下拉選單編輯；匯入/匯出 Excel 同步新增欄位；狀態選 `退社` 時仍同步舊欄位 `is_active=false`，讓既有統計/出席邏輯相容 |
| `src/stores/roster.ts`、`src/types/index.ts` | 型別與排序同步新欄位；名冊載入改依 `nick_name`（英文名稱）優先排序，再依中文姓名 |
| `src/views/admin/ClubDetailView.vue`、`src/views/meetings/AttendanceView.vue` | 社團資訊頁與出席登記頁同步顯示英文名稱優先、社內職稱、正常/請假/退社狀態，以及個人/公司電話欄位 |

**注意**：`member_status='leave'` 仍視為可出席登記的社友；只有 `resigned` 會同步 `is_active=false` 並從出席登記名單排除。`phone` 欄位仍保留作相容欄位，前端儲存時會用個人電話同步更新。

## 本次完成（第六輪）：從 Excel 匯入全地區各社執秘與例會通訊錄資料

使用者提供 `/Users/yikaihuang/Downloads/2025-26年度各社社辦及例會 通訊錄_2026.03.20.xlsx`，要求將全地區各社執秘資料與例會地點資料匯入 `clubs` 表。

- 讀取主工作表 `D3481各社通訊錄及例會時間地點`，共解析 105 社；另一個工作表 `高爾夫快遞資料` 是 2020-21 舊資料，未使用
- 欄位映射：`執秘姓名 -> sec_name`、`電話 & 傳真` 第一列 `TEL -> phone`、`地址/E-mail` 第一列 `-> addr`、第二列 Email `-> email`、`例會 每週/單雙週 -> freq`、`時間 -> meeting_time`、`地點/地址` 兩列合併 `-> venue`、例會電話 `-> venue_tel`、`備註 -> note`
- `venue` 依使用者確認存為「地點｜地址」，例如 `台北君悅酒店｜11051台北市信義區松壽路2號`
- 比對方式：依 `015_seed_district_clubs.sql` 的社名 + 分區為準，將 Excel 社名去除 `社` / `扶輪社` 字尾、分區去除空白後精準比對；沒有用模糊比對硬塞
- 使用者確認兩筆人工對應：`第七分區 / 新店萃英社 -> 新北市新店萃英扶輪社`、`第十一分區 / 台北新星社 -> 台北新心扶輪社`
- 使用者確認這次採覆蓋式更新，不比照 `019` 的 `IS NULL` 保護；也就是會覆蓋既有 `clubs` 通訊錄欄位
- 新增 `supabase/migrations/020_seed_club_directory_from_excel.sql`：用 temp table 匯入 105 筆後 `UPDATE clubs ... FROM`，並檢查實際更新筆數必須剛好 105；若 `015` 尚未執行或社名/分區未對上，會 `RAISE EXCEPTION` 並 rollback，避免只更新部分資料
- 補充修正：第一次在 SQL Editor 執行時回報只更新 104 筆，代表 production DB 內有一筆社名與 seed 名稱不一致；已把上述兩筆使用者確認過的社名差異加成明確 alias（僅在正式 seed 名稱不存在時才啟用），並讓錯誤訊息列出找不到的社名，方便排查，不放寬成任意模糊比對。實際再次執行後列出缺 `第八分區/台北和平扶輪社`，確認是舊測試資料 `台北市和平扶輪社` 問題，已補 alias `台北市和平扶輪社 -> 台北和平扶輪社`
- 再補充修正：SQL Editor 後續回報 temp table `_020_club_directory_import` 不存在，代表前次 rollback 後只重跑了 `DO` block 或 SQL Editor 分段執行；已移除 temp table，改成完全自包含的單一 `DO` block，資料直接以 `VALUES` CTE 放在缺漏檢查與 UPDATE 內

**注意**：這個 migration 不會呼叫 Supabase MCP，也不會自動執行；需要管理員在 Supabase SQL Editor 依序跑完 `015`～`020`。`020` 會覆蓋 `019` 寫入的 `sec_name`（社長 `pres_name` 不受影響），這是本輪使用者明確確認的匯入策略。

## 本次完成（第五輪）：通訊錄卡片改版 + RWD 側邊選單

使用者參考 `vivianrotary-cloud/3481rotarymember`（來源平台的「各社通訊錄」功能）要求補齊本專案通訊錄欄位；另外也提出要考量手機/平板的呈現方式（來源是頂部選單，本專案是常駐左側選單，寬螢幕以外沒有應對方案）。

| 檔案 | 說明 |
|------|------|
| `src/views/directory/DirectoryView.vue` | 從純表格改成依分區分組的卡片 grid（`repeat(auto-fill,minmax(280px,1fr))`），比照來源平台補上執秘、Email、訂位電話欄位（`clubs` 表本來就有 `sec_name`/`email`/`venue_tel`，之前畫面沒有顯示）；搜尋範圍同步納入執秘/Email |
| `src/stores/ui.ts`（新檔案） | 新增 `sidebarOpen` 狀態的極簡 Pinia store，供 TopNav / Sidebar 共用 |
| `src/components/layout/TopNav.vue` | 新增漢堡選單按鈕，只在 `max-width:900px` 以下顯示，點擊切換 `ui.sidebarOpen` |
| `src/components/layout/Sidebar.vue` | ≤900px 時側邊選單改為固定定位的抽屜（`transform:translateX(-100%)` 滑入滑出），加半透明背景遮罩，點選單項目或點遮罩會自動收合；>900px（桌機）維持原本常駐顯示，不受影響 |
| `src/App.vue` | `.main` 在 ≤900px 縮小 padding；共用 `.tw`/`table` 加上橫向捲動（`overflow:auto` + `min-width:560px`），避免其他頁面的寬表格在手機上被硬擠爆版 |

**RWD 斷點設計**：900px 為單一斷點，同時涵蓋手機直向與平板；桌機（>900px）維持常駐側邊選單，是目前對此專案使用情境（社長/執秘多半用電腦作業，行動裝置多半是查通訊錄/例會資訊）最低成本的做法，且未來如果要再拆平板/手機兩種行為，斷點已經抽成 CSS media query，容易再細分。

**驗證方式**：本機沒有這個專案的 Supabase 連線資訊，無法用真實登入走完整流程；改用暫時的 fetch 攔截 + DOM 注入方式在瀏覽器內確認卡片版型、RWD 斷點、抽屜選單開關行為皆正常（桌機 1280px / 平板 768px / 手機 375px 皆截圖確認），驗證用的暫時性修改（`.env`、auth 繞過、mock 資料)已全部還原，`git diff` 只保留上述 5 個檔案的正式改動，並跑過 `vue-tsc --noEmit` 確認無型別錯誤。

## 本次完成（第四輪）：從外部資料來源匯入全社社長/執秘姓名

使用者要求把 `vivianrotary-cloud/3481rotarymember` repo（單檔 HTML 平台，`rotary3481_platform_12.html`，內嵌 `const CLUBS=[...]` 資料陣列）裡各社的社長/執秘姓名，撈回來更新到本專案的社團資料。

- 來源資料共 100 筆，欄位為 `{p:分區, n:社名, pres:社長, sec:執秘}`
- 比對本專案 `015_seed_district_clubs.sql` 既有 105 筆社名，8 筆因為來源用簡稱（例如「台北文山社」對本專案「台北文山扶輪社」）已手動對照補上「扶輪社」字尾後正確比對
- 有 5 社（台北人文、台北令和、台北優雅、台北新心、台北智群）本專案有但來源沒有，維持空白待該社自行補齊
- 新增 `supabase/migrations/019_seed_club_leaders.sql`：100 筆 `UPDATE clubs SET pres_name=..., sec_name=... WHERE name=... AND zone=... AND pres_name IS NULL AND sec_name IS NULL`，刻意加上 `IS NULL` 條件，避免覆蓋掉各社執秘/社長帳號建立後自行填寫的最新資料，可重複執行

## 本次完成（第三輪）：全地區社團名冊 seed + 社團總覽依分區收折 + 自訂排序

管理員要先把 3481 地區依 11 個分區把全部社團都建立起來，之後才能逐社邀請社長/執秘帳號；後續使用者要求同分區內社團可自訂排序（非成立日期，因為 `clubs` 表沒有這個欄位，選擇成本較低的自訂排序方案）。

| 檔案 | 說明 |
|------|------|
| `supabase/migrations/015_seed_district_clubs.sql` | 依使用者提供的 11 個分區名冊，建立 105 筆 `clubs` 資料（僅 `name` + `zone`，社長/執秘/聯絡資訊留空待各社自行補齊）。社名統一補上「扶輪社」字尾。用 `WHERE NOT EXISTS` 防重複，可重複執行 |
| `supabase/migrations/016_club_sort_order.sql` | 新增 `clubs.sort_order integer`，用 `row_number() OVER (PARTITION BY zone ORDER BY name)` 初始化現有資料，避免加欄位後畫面順序跳動 |
| `src/types/index.ts` | `Club` 型別新增 `sort_order: number` |
| `src/stores/club.ts` | 新增 `swapOrder(a, b)`：交換兩筆社團的 `sort_order` 並重新 `fetchAll()` |
| `src/views/admin/ClubListView.vue` | 社團總覽改成依分區分組顯示，依「第一分區～第十一分區」自然順序排列（非字串排序）；每個分區一列可點擊的標題列（顯示社數），可個別收折/展開，預設全部展開；分區內改依 `sort_order` 排序，每列新增上/下移按鈕（`moveClub()`，與相鄰社團交換順序），第一筆/最後一筆對應按鈕會 disable；新增社團時自動把 `sort_order` 設為該分區目前最大值 +1；新增「刪除」按鈕（`removeClub()`） |
| `src/stores/club.ts` | 新增 `checkDeletable(id)`（刪除前查該社的 `roster`/`user_profiles` 筆數）、`deleteClub(id)` |

### 新增：編輯改為獨立頁面（刪除移到編輯頁最下方）+ 地區通訊錄改分區顯示

使用者回饋：刪除應該在「進入各社編輯頁面」後才看得到，不該是總覽列表上的一顆按鈕；地區通訊錄的分區排列順序應該跟社團總覽一致，且欄位不需要跟社團總覽重複（社長/執秘），應該顯示例會/聯絡資訊。

| 檔案 | 說明 |
|------|------|
| `src/views/admin/ClubEditView.vue`（新檔案，路由 `/admin/clubs/:id/edit`） | 把原本 `ClubListView.vue` 裡的編輯 modal 搬成獨立頁面；表單下方新增「刪除社團」區塊（紅框），刪除邏輯（`checkDeletable` 防呆檢查）從 `ClubListView.vue` 搬過來 |
| `src/views/admin/ClubListView.vue` | 移除編輯 modal 與列表上的刪除按鈕，「編輯」改成連到 `/admin/clubs/:id/edit`；「查看社員」按鈕改名「查看社團資訊」（對應下一步待辦：`ClubDetailView.vue` 要重新設計成社團資訊儀表板）；modal 只保留「新增社團」 |
| `src/router/index.ts` | 新增路由 `/admin/clubs/:id/edit` |
| `src/views/directory/DirectoryView.vue` | 比照 `ClubListView.vue` 加上依分區分組 + 收折（同一套 `ZONE_ORDER`／`groupedClubs`／`toggleZone` 邏輯）；欄位拿掉社長/執秘，改成例會時間、例會地點、社辦公室地址、電話；搜尋欄位同步調整 |

### 新增：社團資訊儀表板（社員人數/領域分布/例會資訊/出席率/年度幹部）+ 職業分類欄位

使用者要求「查看社員」改成「查看社團資訊」，進去要看到 6 項摘要：社員人數、領域分布、例會時間地點、出席率、最後一次例會資訊、社的年度成員（社長/社長當選人/副社長/秘書/委員會成員）。其中「領域分布」需要新欄位、「年度成員」需要新資料表，這兩個是新的資料模型，已跟使用者確認方向：
- 領域分布：`roster` 新增 `classification`（職業分類，自由輸入文字），各社自行在社友名冊填寫
- 年度成員：新增獨立資料表 `club_officers`，依 `year_term`（扶輪年度）記錄，委員會成員可多筆；比照 `roster` 的權限模式，由各社自己的 `club_admin`/`club_secretary` 維護，地區管理員唯讀全區

| 檔案 | 說明 |
|------|------|
| `supabase/migrations/017_roster_classification.sql` | `roster` 新增 `classification text` |
| `supabase/migrations/018_club_officers.sql` | 新增 `club_officers` 表（`club_id`/`year_term`/`role` enum/`name`/`committee_name`/`note`），RLS 比照 roster（本社寫、district_admin 讀全區） |
| `src/types/index.ts` | `RosterMember`/`RosterExcelRow` 新增 `classification`；新增 `ClubOfficer`/`ClubOfficerRole`/`ClubOfficerInsert`/`ClubOfficerUpdate` |
| `src/stores/officers.ts`（新檔案） | `club_officers` CRUD；`currentYearTerm()`（跟 `dashboard.ts` 邏輯一致，7/1~6/30 為一屆，各自獨立一份沒有共用） |
| `src/views/club/OfficersView.vue`（新檔案，路由 `/club/officers`） | 各社自行維護本社年度幹部：社長/社長當選人/副社長/秘書（單一姓名輸入）+ 委員會成員（可新增多筆，含委員會名稱），依年度切換；`club_member` 唯讀 |
| `src/components/layout/Sidebar.vue` | 「社務管理」區塊新增「社的年度成員」連結（`club_secretary`/`club_admin`/`club_member` 可見） |
| `src/router/index.ts` | 新增路由 `/club/officers` |
| `src/views/roster/RosterView.vue` | 新增/編輯表單、表格欄位、Excel 匯入匯出（`職業分類` 欄）都加上 `classification` |
| `src/views/admin/ClubDetailView.vue` | 從單純的社員名單頁，改成社團資訊儀表板：卡片區顯示社員人數（在職）、本屆出席率（`attendance_sessions.rate` 平均）、例會時間地點、最後一次例會；下方分別是領域分布（依 `classification` 分組計數）、社的年度成員（唯讀顯示 `club_officers`）、社員名單（原本的表格） |

**注意**：`club_officers` 是全新的表，一開始全部社團都是空的，需要各社自己的 `club_admin`/`club_secretary` 登入 `/club/officers` 填寫，社團資訊頁才會顯示資料；`classification` 同理需要各社自己在社友名冊補填舊資料才有統計意義。

### 新增：主要幹部/委員姓名、職業分類改下拉選單

使用者回饋這兩個欄位用自由輸入文字容易打錯字、跟既有資料對不起來，改成下拉選單：

| 檔案 | 說明 |
|------|------|
| `src/views/club/OfficersView.vue` | 「主要幹部」（社長/社長當選人/副社長/秘書）與「新增委員」的姓名欄位，改成從該社 `roster`（在職社友）選人的下拉選單；`memberOptions()` 會把目前已存的值（如果不在在職名單裡，例如社友已離職）補回選項最前面，避免歷史資料在畫面上憑空消失 |
| `src/views/roster/RosterView.vue` | 「職業分類」欄位（新增/編輯表單）改成下拉選單，選項參考行政院主計總處行業標準分類大類（18 類：農林漁牧業、製造業、批發及零售業…～其他服務業）。底層欄位仍是自由文字（`roster.classification`），Excel 匯入的舊資料不受限制，只是新增/編輯畫面上改成選單 |

**注意**：`club_officers.name` 底層是純文字，不是社友 ID 的外鍵，所以選單選的是「名字字串」，如果社友之後改名，舊的幹部紀錄不會自動同步更新（跟社友名冊是各自獨立的資料）。

### 新增：刪除社團的防呆設計

`roster`/`meetings`/`attendance_*`/`feature_flags` 對 `clubs` 都是 `ON DELETE CASCADE`，直接刪除有資料的社團會連帶清光該社所有名冊/例會/出席紀錄且無法復原；`user_profiles` 沒有 CASCADE，社內還有帳號時刪除會被 FK 擋下。因此刪除流程改成：
1. 先查該社是否有帳號（`user_profiles`），有的話直接擋下，請管理員先去帳號管理停用/刪除
2. 再查該社是否有名冊資料（`roster`），有的話在 `confirm()` 訊息裡明確警告會一併清除所有紀錄且無法復原
3. 沒有任何資料的社團（例如這次 seed 進來、還沒被使用的社）則直接跳簡單確認

**注意**：
- seed 的「台北和平扶輪社」跟既有測試帳號綁定的「台北市和平扶輪社」是兩筆不同資料（名稱多一個「市」字），未合併，需要管理員手動處理
- `016` 必須在 `015` 之後、且在社團總覽有資料的情況下執行，才能正確初始化每筆的 `sort_order`

**已用 `npm run build` 驗證通過**（vue-tsc + vite build 皆無錯誤）。未在瀏覽器實際登入驗證（沒有 Supabase 登入憑證），需使用者自行用 `npm run dev` 或正式站確認畫面。

## 🕳️ 本次踩過的坑（依除錯順序記錄，下次遇到類似狀況先查這裡）

這些坑大多是因為「邀請帳號」這個功能路徑很長（前端 → Edge Function → Supabase Auth Admin API → DB trigger → 寄信 → 使用者點連結 → 設定密碼 → 重新登入），任何一環出錯，前端看到的錯誤訊息都很籠統，要一路往下查才找得到真正原因。

1. **Edge Function 的網址(slug) 可能跟你以為的名字對不上**：Supabase Dashboard 手動建立 function 時，如果建立當下沒有把 Function name 欄位改掉，會被塞一個隨機名稱（例如 `rapid-task`）當實際路由 slug。之後在 Settings 頁把「Name」改成你要的名字**不會**改變 slug/endpoint URL（畫面會明確提示「Your slug and endpoint URL will remain the same」）。前端呼叫寫死的 function 名稱如果對不上實際 slug，會打到不存在的網址，回傳的 404 沒有 CORS 標頭，瀏覽器會把它擋下來，看起來就像 CORS 錯誤。**要修正必須刪除重建，建立當下就要把 Function name 填對。**

2. **Edge Function 預設不會處理瀏覽器的 CORS 預檢請求**：前端呼叫時如果沒有在程式碼裡明確回應 `OPTIONS` 方法、並在每個 `Response` 加上 `Access-Control-Allow-Origin` 等標頭，瀏覽器會直接擋下實際請求，前端只會看到「Failed to send a request to the Edge Function」，看不到真正的錯誤內容。所有 Edge Function 開頭都要加：
   ```ts
   if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
   ```
   而且每一個 `Response` 都要帶上 `corsHeaders`。

3. **`auth.getUser()` 不帶參數，在全新建立的 client 裡永遠抓不到人**：Edge Function 裡用 `createClient(url, key, { global: { headers: { Authorization: authHeader } } })` 建立的全新 client 從沒呼叫過 `setSession()`，呼叫 `auth.getUser()`（不帶參數）看的是 client 內部的 session 狀態（是空的），即使把 token 塞進 header 也沒用，一律回傳 401。**正確寫法是把 token 當參數直接傳入 `auth.getUser(token)`**（Supabase 官方文件的標準寫法）。曾經懷疑是 Dashboard 上「Verify JWT with legacy secret」這個開關的問題，關掉之後還是 401，才確認問題出在這裡，不是那個開關——遇到類似狀況不用花時間在那個開關上打轉。

4. **`handle_new_user()` 讀錯 metadata 欄位，影響範圍最大的一個 bug**：`inviteUserByEmail(email, { data: {...} })` 的 `data` 參數寫入的是 `raw_user_meta_data`，Supabase Admin API 也沒有提供直接設定 `app_metadata` 的選項；但資料庫的 `handle_new_user()` trigger（008 版本）讀的是 `raw_app_meta_data`，兩邊對不上。結果是**從系統一開始，每一個透過邀請流程建立的帳號，`club_id` 都是 NULL、`role` 都 fallback 成 `club_member`**——只是先前一直卡在前面幾個問題，從來沒有邀請成功過，這次才踩到。已在 `014_fix_handle_new_user_metadata_source.sql` 修復，改讀 `raw_user_meta_data`。**後遺症**：014 修復之前建立的帳號資料是壞的，且 `ON CONFLICT (id) DO NOTHING` 代表對同一個 email 重新邀請不會回頭修正舊資料，只能去 Authentication → Users 直接刪除重邀。

5. **Site URL 設定卡在 localhost，且已寄出的信不會自動更新**：Authentication → URL Configuration 的 Site URL 殘留是本機開發用的 `localhost:3000`，邀請信連結點進去會顯示無法連線。改成正式網址（`https://d3481clubmanagementsystem.pages.dev`）後，**已經寄出的舊邀請信連結不會跟著更新**（連結網址是寄信當下就寫死進信件內容的），要重新邀請一次才會拿到新連結。另外 `redirectTo` 這個參數必須先被列在 Redirect URLs 允許清單裡才會生效，沒列的話 Supabase 會直接忽略、退回用預設 Site URL。

6. **Supabase 內建寄信服務的速率限制很低**：測試期間短時間內寄多封邀請信會撞到「email rate limit exceeded」，這是 Supabase 預設共用 SMTP 的限制，不是程式 bug。正式使用建議設定自訂 SMTP。

7. **Gmail 自訂 SMTP 的兩個地雷**：
   - 應用程式密碼（App Password）是**綁定在特定 Google 帳號**上的，用 A 帳號產生的密碼填到 B 帳號（例如團隊共用的 `rid3481aiteam@gmail.com`）的 SMTP 設定裡一定會被拒絕（`535 Username and Password not accepted`）。一定要先登入「實際當寄件人的那個帳號」本身，在那個帳號底下開兩步驟驗證、產生應用程式密碼。
   - Supabase Dashboard 設定頁本身也會跳警告：Gmail 是設計給個人使用，不是給應用程式大量寄送交易型郵件用的，可能有寄達率問題（可能被歸類成垃圾郵件）。正式營運建議改用 Resend / SendGrid 這類專門的交易型郵件服務。

8. **前端沒有解析 Edge Function 真正回傳的錯誤內容**：`supabase.functions.invoke()` 失敗時，`error.message` 預設只是 supabase-js 包裝過的通用文字（例如「Edge Function returned a non-2xx status code」），要另外用 `error.context.json()`（只有 `FunctionsHttpError` 才有 `.context`）才能拿到 Edge Function 實際回傳的 JSON 內容並顯示給使用者。`src/stores/invites.ts` 和 `src/stores/accounts.ts` 都已經加上這個解析邏輯，之後新增其他呼叫 Edge Function 的 store 也要比照辦理，不然使用者只會看到看不懂的通用錯誤或是 `{}`。

9. **帳號邀請權限模型原本設計成單向階層，不符合實際需求**：原本規則是「只有地區能邀執秘」「只有執秘能邀社長」，造成社長沒辦法邀請新執秘、執秘之間也無法互相交接，形成死結。改成三層對等模型（地區／各社／一般人，見下方「本次權限模型調整」），社長與執秘視為同一層級，可以互相邀請/管理本社帳號。連帶 `invite_log` 的 RLS 也有同樣的單向問題（007 只開放 `club_secretary` 能看本社邀請紀錄，`club_admin` 完全看不到），一併用 `013_invite_log_club_tier_select.sql` 修正。

10. **系統完全沒有「接受邀請後設定密碼」的頁面**：被邀請人點信件連結後，Supabase 只給一個一次性登入 session，原本系統沒有任何頁面讓他設定密碼，導致邀請流程實質上無法完成（之後用 email/密碼登入會失敗）。已新增 `/accept-invite` 頁面（`src/views/AcceptInviteView.vue`）。設計上，設定密碼成功後會 `signOut()` 並導回登入頁，要求使用者用新密碼重新登入，而不是無縫接軌直接進系統——這是使用者明確要求的行為，避免邀請 session 和正式登入 session 的狀態混在一起。

11. **側邊選單在「還沒設定密碼」的狀態下就整個顯示出來**：`App.vue` 原本只要 `auth.isLoggedIn` 就顯示完整 TopNav + Sidebar，被邀請人點連結後雖然只是暫時性 session、密碼都還沒設，卻已經能看到完整功能選單。已新增 route `meta.bare`，`/accept-invite` 這個路由即使已登入也不顯示側邊欄，只顯示密碼設定表單本身。

12. **顯示名稱預設用 Email 前段，且原本沒地方可以自己改**：邀請時如果沒有傳 `name` 欄位，`handle_new_user()` 就會 fallback 用 email `@` 前面那段當名字（例如顯示 `yhwang0928`）。已加上：邀請表單可先填姓名（選填）；TopNav 右上角名字改成可點擊，跳出 prompt 讓使用者自己修改（`user_profiles` 本來就有自己更新自己 profile 的 RLS，不用新增 SQL）。

13. **兩個順手修掉的小 bug**：
    - `features.ts` 的 `.or(\`club_id.is.null,club_id.eq.${clubId ?? 'null'}\`)`，當 `clubId` 是 `null`（district_admin 自己）時會組出不合法的 `club_id.eq.null`（PostgREST 的 NULL 比對只能用 `is.null`），造成 district_admin 每次登入 `feature_flags` 查詢都 400。
    - 帳號管理頁的「社團」欄位原本只有 district_admin 登入才會抓 `clubs` 全部資料（`club.fetchAll()` 被 `if (isDistrictAdmin.value)` 擋住），社長/執秘登入看到的社團名稱一律顯示 `-`（`clubs` 表本來就對所有登入者開放讀取，拿掉這個判斷即可）。

### 本次權限模型調整
使用者確認實際需求其實是單純的三層架構，比原本設計的角色邀請鏈更簡單：
- **地區層**（`district_admin`）：全區最高檢視權限，可看到所有社資料，但不能編輯各社資料（名冊/例會/出席/通訊錄皆須由各社自己編輯，這點原本就已符合）；新增「可為任何社 bootstrap 邀請第一組帳號」的能力，解決新社團剛建立、還沒有任何帳號時的雞生蛋問題
- **各社層**（`club_admin` + `club_secretary`，兩者對等）：全權編輯本社資料（原本就已符合），**新增**互相邀請 / 停用本社帳號的能力（原本規則是「只有地區能邀執秘」「只有執秘能邀社長」，造成社長沒辦法邀請新執秘、執秘之間也無法互相交接）
- **一般人層**（公開瀏覽）：目前系統完全沒有這個概念（所有頁面都需要登入），列為 Phase 2，需要另外設計「各社如何標記公開欄位」+ 匿名可讀 RLS + 對外頁面，範圍較大，這次不做

改動檔案：
| 檔案 | 說明 |
|------|------|
| `supabase/migrations/012_club_self_manage_accounts.sql` | 新增 `is_club_tier()` helper（SECURITY DEFINER，比照 009 的安全模式）；把 006 的 `profiles_secretary_manage_admin`（執秘→社長單向）換成 `profiles_club_tier_manage`（社長/執秘互相對等，同社才可管理） |
| `supabase/functions/invite-user/index.ts` | 移除角色階層限制，改為：district_admin 可為任何社邀請任何角色（bootstrap）；club_admin/club_secretary 只要 `club_id` 跟自己相同就能邀請任何角色（社長或執秘皆可）；同時補上 CORS 處理（`OPTIONS` 預檢 + 所有 Response 加 `corsHeaders`） |
| `src/router/index.ts` | `/club/invite` 的 `meta.roles` 加入 `club_admin`（原本只有 district_admin、club_secretary 能進） |
| `src/components/layout/Sidebar.vue` | 「帳號」選單從只有 `club_secretary` 看得到，改成 `club_secretary` 或 `club_admin` 都看得到，連結文字改為「邀請 / 管理本社帳號」 |
| `src/stores/accounts.ts` | `fetchManaged()` 拿掉 `targetRole` 參數，改成一次查詢本社（或地區看全部）的 `club_admin` + `club_secretary` 兩種角色帳號 |
| `src/views/admin/AccountManagementView.vue` | 邀請表單新增「角色」下拉選單（執秘／社長皆可選，不再由登入者角色寫死），帳號清單表格新增「角色」欄 |
| `ARCHITECTURE.md` | 更新帳號邀請流程、安全規則表、角色權限矩陣「帳號管理」列，反映三層對等模型；Phase 2 補上「一般人公開瀏覽層」項目 |

**已用 `npm run build` 驗證通過**（vue-tsc 型別檢查 + vite build 皆無錯誤），並在 production 環境實際走完整邀請流程反覆測試、修到能用（過程見上方踩坑紀錄）。

## 本次完成：細粒度權限系統 + 帳號邀請/管理 UI + club_member 角色定義

之前所有角色權限都寫死在程式碼裡（RLS 用 `role IN (...)`，前端用 `auth.role === '...'` 散落 4 處）。這次做成地區管理員可在 UI 上調整、且真的驅動後端 RLS 的權限矩陣，並補上完全沒做過的帳號邀請/停用前端頁面（之前 Sidebar 有一個死連結 `/club/invite`），以及定義 `club_member`（一般社友）的唯讀存取範圍。

| 檔案 | 說明 |
|------|------|
| `supabase/migrations/010_role_permissions.sql` | 新表 `role_permissions`（role/resource/action/allowed）+ `has_permission()` function（`SECURITY DEFINER`，比照 009 已驗證安全的模式）+ 種子資料（忠實反映現況：district_admin 對 5 個資源皆無 edit 權限，之前 `auth.canWrite` 誤把它算進去）+ 重寫 roster/prospective_members/meetings/attendance_sessions/attendance_details 的 write policy，改用 `has_permission()` 而非寫死的角色列表 |
| `supabase/migrations/011_invite_deactivate_gaps.sql` | 新增 `profiles_district_admin_manage` policy，讓 district_admin 能停用/啟用執秘帳號（原本完全沒有這個能力） |
| `supabase/functions/invite-user/index.ts` | 補上 `club_member` 邀請驗證分支 + 拒絕未知角色字串（原本這兩種情況會直接放行，是個授權漏洞）|
| `src/stores/permissions.ts` | 權限矩陣 store，登入後載入目前角色的權限 map（`can(resource, action)`），另外提供 `fetchAll()`/`setPermission()` 給矩陣管理頁用 |
| `src/stores/invites.ts` | 呼叫 `invite-user` Edge Function（`supabase.functions.invoke`）+ 讀 `invite_log` |
| `src/stores/accounts.ts` | 管理執秘/社長帳號的啟用/停用 |
| `src/views/admin/PermissionMatrixView.vue`（路由 `/admin/permissions`） | 地區管理員可視覺化調整各角色對 4 個資源（名冊/潛在社友/例會/出席）的檢視/編輯權限 |
| `src/views/admin/AccountManagementView.vue`（路由 `/club/invite`） | district_admin 邀執秘、club_secretary 邀本社社長；邀請紀錄列表；帳號停用/啟用 |
| `src/stores/auth.ts` | 移除誤導性的 `canWrite`（原本錯把 district_admin 算進可寫入），改成登入後同時載入 permissions store |
| `src/views/roster/RosterView.vue`、`src/views/roster/ProspectiveView.vue`、`src/views/meetings/MeetingListView.vue`、`src/views/meetings/AttendanceView.vue` | 權限判斷全部改用 `permissions.can(resource, 'edit')` |
| `src/components/layout/Sidebar.vue` | 修好死連結、新增「權限矩陣」「帳號邀請/管理」連結；`club_member` 現在能看到本社名冊（唯讀）+ 例會資訊（唯讀）|
| `src/router/index.ts` | 新增 `meta.roles` 陣列 guard（一個路由允許多種角色，用於帳號管理頁）|

**注意行為變化**：`ProspectiveView.vue` 改用 `permissions.can()` 後，`club_member` 會開始看到新增/編輯按鈕——因為 DB 的 RLS 本來就允許 club_member 寫入 `prospective_members`（跟其他表不同），只是之前前端沒開放，這是修正既有不一致，不是新開的漏洞。

### P2 社友名冊、P3 例會與出席、P4 通訊錄與管理後台（全部完成）

| 檔案 | 說明 |
|------|------|
| `src/stores/roster.ts` + `src/views/roster/RosterView.vue` | 社友列表、搜尋/篩選、新增編輯 Modal、停用/恢復、Excel 匯入匯出（xlsx） |
| `src/stores/meetings.ts` + `src/views/meetings/MeetingListView.vue` | 例會 CRUD（日期/講者/地點），連結到出席記錄頁 |
| `src/stores/attendance.ts` + `src/views/meetings/AttendanceView.vue` | 逐人出席登記、彙總統計（出席率等）、個人出席率總表 |
| `src/views/directory/DirectoryView.vue` | 地區通訊錄，讀取全部社別資料，H2 搜尋、H3 導向社團管理 |
| `src/views/admin/ClubListView.vue` | 社團總覽 CRUD（district_admin 專用） |
| `src/views/admin/FeatureFlagsView.vue` + `src/stores/features.ts` 擴充 | 地區層級功能開關管理（A 類鎖定不可關） |

角色寫入權限：`club_admin` / `club_secretary` 可寫，`district_admin` 對名冊/例會/出席只能讀（依 RLS）。

### 補做遺漏功能：儀表板、潛在社友追蹤

做完 P2~P4 後發現這兩個 `CODEX_PROMPT.md` 原始規格裡就有的功能，實際上一直是佔位頁面，沒人真的做過：

| 檔案 | 說明 |
|------|------|
| `src/stores/dashboard.ts` + `src/views/DashboardView.vue` | 本屆例會數、平均出席率（依 `year_term` 篩選）、在職社友人數、低出席率警示（<75%）、待追蹤潛在社友清單。**未做**：本週生日（規格提到但 `roster` 表沒有生日欄位，需要另外加欄位才能做，Phase 2 再評估） |
| `src/stores/prospective.ts` + `src/views/roster/ProspectiveView.vue` | 潛在社友清單、狀態篩選、新增/編輯、追蹤日期逾期/即將到期標色提醒 |

補做完後 Sidebar 也補上「儀表板」連結（原本所有角色都沒有連結可以回到儀表板，登入後直接被導向各角色的預設頁）。

### 調整：district_admin 的名冊瀏覽方式

一開始把「社友名冊 / 潛在社友 / 例會管理」也加進 district_admin 的 Sidebar，做成「全區檢視（唯讀）」直接看全地區資料。**使用者回饋這不是想要的設計**：地區管理員應該是從「社團總覽」點進某個社，才看到該社的社員名單，而不是一個全區大列表。

已調整為：
- Sidebar 拿掉「全區檢視」區塊，district_admin 只保留「社團總覽」「功能開關」
- `src/views/admin/ClubListView.vue` 每筆社團新增「查看社員」按鈕，連到新頁面
- 新增 `src/views/admin/ClubDetailView.vue`（路由 `/admin/clubs/:id`）：顯示該社基本資訊 + 社員名單（唯讀，直接用 roster store 查該社 `club_id`，不受登入者自己的 `club_id` 限制）

目前只做了社員名單的 drill-down，例會/潛在社友還沒有比照做（如果之後需要地區管理員查看特定社的例會或潛在社友名單，可以用同樣模式在 ClubDetailView 加分頁籤）。

### Cloudflare Pages 部署除錯（重要，花了不少來回）

上線網址：`https://d3481clubmanagementsystem.pages.dev`

踩過的坑，依序記錄：

1. **`npm run build` 本身就會失敗**：`tsconfig.node.json` 缺 `"composite": true` 且設了 `noEmit: true`（與 project reference 衝突）→ 已修正為 `composite: true`、移除 `noEmit`。
2. **缺 `src/vite-env.d.ts`**：導致 `import.meta.env.VITE_*` 型別錯誤，`vue-tsc` 直接擋下 build。已新增標準的 `/// <reference types="vite/client" />`。
   → 以上兩個問題代表**先前所有 push 到 Cloudflare Pages 的 build 應該都是失敗的**（如果 build command 有設定 `npm run build` 的話）。
3. **Cloudflare Pages Build configuration 一開始完全空白**（Build command / Output directory 都沒填）：代表 Cloudflare 沒有真的執行 build，只是把 repo 原始檔案當靜態站丟上去 → 手動設定 Build command `npm run build`、Output directory `dist`。
4. **環境變數 `VITE_SUPABASE_ANON_KEY` 設定後仍讀不到**：第一次存的值不知為何沒生效（`process.env` 讀不到），刪除重新增加一次後才正常。曾經用暫時加在 `vite.config.ts` 的 `console.log('ENV CHECK', ...)` 印到 build log 來確認（**已移除**，不要再加類似 debug log 進 repo）。
5. **`public/_redirects` 的 SPA fallback 規則被判定為 infinite loop 而整個被忽略**：這個專案用的是 Cloudflare 新版 Workers Assets Pages（build log 會出現 `Checking for configuration in a Wrangler configuration file`），舊版 `_redirects` 語法在這個產品上行不通。已改用 `wrangler.jsonc`：
   ```json
   { "assets": { "directory": "./dist", "not_found_handling": "single-page-application" } }
   ```
   `public/_redirects` 已刪除。
6. **登入頁 / TopNav 的齒輪 icon**：一開始用 emoji `⚙️`，後來手畫 SVG 都不是使用者要的圖。最終改用使用者提供的實體圖檔 `public/rotary-logo.png`，透過共用元件 `src/components/RotaryWheelIcon.vue`（單純 `<img src="/rotary-logo.png">`）在 LoginView 和 TopNav 共用。也同步把 `index.html` 的瀏覽器分頁 favicon 換成同一張圖。

**目前狀態**：`.env.local`（本機開發用，未進 git）與 Cloudflare Pages 的 Production 環境變數都已設定好真實的 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`。最新一次 deploy 已確認 build 成功、登入頁能正常顯示。

### 重大 Bug：user_profiles RLS infinite recursion（已修復，影響所有登入後功能）

登入後側邊選單一直只顯示「地區通訊錄」，即使 `user_profiles.role` 已經設成 `district_admin` 也一樣。

**根因**：`current_club_id()` / `is_district_admin()` / `is_club_secretary()` 這幾個 helper function 都是一般 SQL function（非 `SECURITY DEFINER`），內部會查詢 `user_profiles`。當它們（或直接寫在 policy 裡的子查詢，例如 001 的 `profiles_select_own`、006 的 `profiles_select_club`）被用在 **`user_profiles` 自己的 RLS policy** 裡時，內部查詢又要重新套用同一張表的 RLS，形成無窮遞迴（Postgres 錯誤碼 `42P17: infinite recursion detected in policy`）。前端 `fetchProfile()` 因為沒有處理 error，遞迴錯誤被靜默吞掉，`profile` 變成 `null`，所以所有角色判斷都失效，只剩下不需要角色的「通訊錄」選單會顯示。

**修復**：`supabase/migrations/009_fix_user_profiles_rls_recursion.sql` — 把上述 helper function 都改成 `SECURITY DEFINER SET search_path = public`（以 function owner 身分執行、略過 RLS），並把 policy 裡直接寫的子查詢改成呼叫 function（新增 `current_user_role()`）。**已在 production 執行並驗證**（用瀏覽器 console 直接打 REST API 確認 `user_profiles` select 回傳 200 且資料正確）。

**排查方式記錄**（下次遇到類似「登入後資料讀不到」問題可參考）：在瀏覽器 console 用 `localStorage.getItem('sb-<project-ref>-auth-token')` 拿到 access_token，直接 fetch Supabase REST API 帶 `apikey`（anon key）+ `Authorization: Bearer <access_token>`，可以繞過前端 store 直接看到 RLS 實際回傳的錯誤訊息。

**目前 `clubs` 表是空的**，需要地區管理員登入後到「社團總覽」新增第一筆社團資料，「地區通訊錄」才會有內容。

### 啟動方式
```bash
cd /tmp/d3481clubmanagementsystem   # 每次對話需重新 clone
npm install
# .env.local 需要填入真實的 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev   # port 5174
```

---

## Supabase 資料庫（全部完成）

| Migration | 內容 |
|-----------|------|
| 001_clubs_auth | clubs、user_profiles、RLS、helper functions |
| 002_roster_members | roster、prospective_members、member_care、RLS |
| 003_meetings_attendance | meetings、attendance_sessions、attendance_details、member_attendance_rate VIEW |
| 004_feature_flags | feature_flags（含 15 項預設值）、feature_enabled() |
| 005_add_year_term | meetings.year_term 自動計算欄位（扶輪年度 7/1~6/30） |
| 006_fix_rls_policies | is_club_secretary()、執秘可管理社長帳號的 RLS |
| 007_invite_log | invite_log 稽核表 |
| 008_fix_handle_new_user_search_path | 修復 handle_new_user() 缺少 search_path 導致建立/邀請使用者失敗 |
| 009_fix_user_profiles_rls_recursion | 修復 user_profiles RLS helper function 造成的 infinite recursion（詳見上方說明） |
| 010_role_permissions | role_permissions 表 + has_permission()，權限矩陣改由地區管理員在 UI 上調整 |
| 011_invite_deactivate_gaps | district_admin 可管理 user_profiles 的 UPDATE policy |
| 012_club_self_manage_accounts | is_club_tier() helper；社長／執秘互相對等管理本社帳號（見上方踩坑紀錄 #9） |
| 013_invite_log_club_tier_select | club_admin 也能看本社邀請紀錄，原本只有 club_secretary 能看 |
| 014_fix_handle_new_user_metadata_source | **關鍵修復**：handle_new_user() 改讀 raw_user_meta_data（見上方踩坑紀錄 #4） |
| 015_seed_district_clubs | 建立全地區 105 筆社團基本資料（依分區，僅 name + zone） |
| 016_club_sort_order | clubs 新增 sort_order，社團總覽/地區通訊錄的分區內自訂排序用 |
| 017_roster_classification | roster 新增 classification（職業分類），社團資訊頁「領域分布」統計用 |
| 018_club_officers | 新增 club_officers 表（社的年度幹部：社長/社長當選人/副社長/秘書/委員會成員） |
| 019_seed_club_leaders | 從外部資料來源補上 100 社 `pres_name`/`sec_name`，只在欄位為 NULL 時寫入 |
| 020_seed_club_directory_from_excel | 從 2025-26 Excel 通訊錄覆蓋匯入 105 社執秘、社辦、例會地點與訂位電話資料 |
| 021_roster_member_profile_fields | roster 新增社內職稱、正常/請假/退社狀態、個人電話、公司電話 |

---

## 角色體系（定案）

| 角色 | 說明 | 生命週期 |
|------|------|---------|
| district_admin | 地區管理員 | 長期 |
| club_secretary | 執秘，每社 1 個，日常操作主力 | 長期 |
| club_admin | 社長，每社 1 個，每年新帳號 | 一年一屆 |
| club_member | 保留 enum，暫不開放 | — |

---

## 下一步：Phase 2（暫緩，尚未排入開發）

- B5 EDM 通知（AI 整合）
- D4 社友關懷
- 社費 / 財務模組

其餘 P1~P4 功能已全部完成並上線。

---

## Cloudflare Pages 專案資訊

- **網址**：`https://d3481clubmanagementsystem.pages.dev`
- **Build command**：`npm run build`
- **Build output directory**：`dist`
- **環境變數**（Production）：`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`（已設定）
- **SPA fallback**：`wrangler.jsonc` 的 `not_found_handling: single-page-application`（不要再用 `public/_redirects`）

## Supabase 專案資訊

- **Project URL**：`https://xdwqrgthsxyzclnjlmvy.supabase.co`
- **Edge Functions**：`invite-user`（邀請帳號）、`delete-account`（永久刪除帳號，測試/離職用）
- **Auth Hook**：`handle_new_user`（已建於 SQL Editor，014 已修復 metadata 欄位讀取錯誤）
- **自訂 SMTP**：Gmail（`rid3481aiteam@gmail.com`），Authentication → Emails 設定（見上方踩坑紀錄 #7）

---

## 未解決問題

- 目前測試帳號分工：`yhwang0928@gmail.com` = district_admin（地區管理員），`yhwang0928@hotmail.com` = 台北市和平扶輪社 club_admin（社長）。正式上線前記得盤點、清掉純測試用的帳號與邀請紀錄。
- Sidebar 有一個 `club_admin` 專屬的「出席統計」連結指向 `/club/reports`，但 `router/index.ts` 沒有這個路由，是既有的死連結（非本輪造成），之後需要建立對應頁面或拿掉連結。
- 一般人公開瀏覽層（Phase 2）尚未設計，見上方「本次權限模型調整」段落。
