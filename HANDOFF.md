# D3481 扶輪社管理系統 — 工作交接紀錄

> 最後更新：2026-07-02（第九輪，Claude 重新設計設定密碼頁版面）

---

## ⚠️ 待辦
1. **依序執行 `015`～`021` 七支尚未跑過的 migration**（SQL Editor 貼上執行）：
   - `015_seed_district_clubs.sql`：建立全地區 105 筆社團基本資料（依分區，僅 name + zone）
   - `016_club_sort_order.sql`：新增 `clubs.sort_order`，社團總覽的上/下移按鈕需要這個欄位
   - `017_roster_classification.sql`：`roster` 新增 `classification`（職業分類），社團資訊頁的「領域分布」需要這個欄位，且要各社自行在社友名冊補填才有統計意義
   - `018_club_officers.sql`：新增 `club_officers` 表（社的年度幹部），社團資訊頁的「社的年度成員」跟 `/club/officers` 頁都需要這張表
   - `019_seed_club_leaders.sql`：從外部資料來源補上 100 社的 `pres_name`/`sec_name`，只在欄位為 NULL 時才寫入，不會覆蓋各社自行填的資料
   - `020_seed_club_directory_from_excel.sql`：從 Excel 匯入 105 社 `sec_name`/`email`/`phone`/`addr`/`freq`/`meeting_time`/`venue`/`venue_tel`/`note`，採覆蓋式更新；內建 105 筆 row-count guard，未完整對上會 rollback
   - `021_roster_member_profile_fields.sql`：`roster` 新增 `club_position`、`member_status`、`personal_phone`、`company_phone`，並用既有 `phone` 初始化 `personal_phone`
2. ~~檢查「台北和平扶輪社」是否要跟舊測試資料「台北市和平扶輪社」合併/改名~~ **已修正**：`015`/`019` 尚未執行過正式環境，直接把 seed 社名改成正確的正式社名「台北市和平扶輪社」，`020` 既有的 alias 比對邏輯會自動接上這筆既有資料，不會再產生重複的 `clubs` 列（見下方踩坑紀錄）
3. **Edge Functions → delete-account**（如果還沒建立）：新建，Function name 務必在建立當下就填對（見下方踩坑紀錄 #1），內容見 `supabase/functions/delete-account/index.ts`
4. 確認 SQL Editor 已依序執行 `012`、`013`、`014` 三支 migration（如果前面對話已經跑過可以跳過，見下方「Supabase 資料庫」表格）
5. ~~邀請信連結被導回登入畫面~~ **已解決**：Site URL / Redirect URLs / 已部署的 `invite-user` 都確認正常，根因是 `src/router/index.ts` 的 `/accept-invite` 路由缺少 `public: true`（見「第八輪」），已修正並由使用者實測確認新邀請信可以正常進入設定密碼頁

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
