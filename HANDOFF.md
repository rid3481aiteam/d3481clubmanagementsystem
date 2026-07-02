# D3481 扶輪社管理系統 — 工作交接紀錄

> 最後更新：2026-07-02（第二輪，Claude 協助除錯帳號邀請流程 + 重新設計權限模型，共 12 個 commit）

---

## ⚠️ 待辦
1. **Edge Functions → invite-user**：確認部署的是最新版本（含 `name` 欄位，commit `61ae44c`），內容見 `supabase/functions/invite-user/index.ts`
2. **Edge Functions → delete-account**（如果還沒建立）：新建，Function name 務必在建立當下就填對（見下方踩坑紀錄 #1），內容見 `supabase/functions/delete-account/index.ts`
3. 確認 SQL Editor 已依序執行 `012`、`013`、`014` 三支 migration（如果前面對話已經跑過可以跳過，見下方「Supabase 資料庫」表格）
4. 確認 Authentication → URL Configuration 的 Site URL / Redirect URLs 已改成正式網址（不是 localhost），且自訂 SMTP 已設定並測試成功寄信

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
