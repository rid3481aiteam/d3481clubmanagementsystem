# D3481 SOP 專案進度記錄

> 記錄時間：2026-07-07（中途被使用者中斷，要換帳號繼續編輯）

## 兩份文件的整體目標
1. **文件一（建置歷程 SOP）**：從 0 到現在怎麼跟 AI 建置整個平台，含 prompt/工具/評估理由，PDF 格式
2. **文件二（功能操作 SOP）**：各功能圖文操作步驟拆解，用實體截圖，PDF 格式
   - 範圍已跟使用者確認：地區管理員（邀請/管理地區帳號、社團總覽、地區通訊錄）+ 社長/執秘（邀請/管理本社帳號、社友名冊、例會與出席登記、地區通訊錄）

## 文件一：已完成，等待使用者審閱
- Markdown 原始檔：`docs/sop/01-建置歷程.md`（repo 內，`/tmp/d3481clubmanagementsystem/docs/sop/`）
- PDF 成品：`docs/sop/D3481建置歷程SOP.pdf`（17 頁，深藍/古銅金雜誌式排版，CJK 正常）
- 建置腳本：`/private/tmp/.../scratchpad/d3481-sop/build_pdf.py`（Markdown→HTML→用 headless Chrome print-to-pdf，因為機器上沒有 weasyprint/pandoc）
- **狀態：尚未 commit + push**——內容是敘事詮釋，等使用者確認語氣/史實正確再上。
- 素材來源：`STORY.md`、`CODEX_PROMPT.md`、`ARCHITECTURE.md`、`HANDOFF.md`（41輪）、git log

## 文件二：進行中

> 2026-07-08 接手記錄：上一輪遺失的 6 張截圖已補拍存檔，細節見下方「第二輪」。

### 已建立的示範資料（正式站 Supabase，非本機）
- 示範社團：`clubs` 表新增一筆「示範扶輪社（SOP教材用）」，zone=`教材示範`，id=`ec8e7b54-431f-49c1-a770-5a7e8e7ebf53`
- 示範帳號：`sop@gmail.com`（密碼由使用者保管，不寫入 repo；接手時直接跟使用者要），`user_profiles.role=club_secretary`，綁定上述示範社團
- 示範社團「社友名冊」目前有兩筆真實資料：
  1. 「王小明」（第一輪截圖過程存入，其餘欄位空白）
  2. 「陳小華（示範資料）」（第二輪補拍「新增社友」流程時存入，用來示範新增操作，故意用括號標註避免誤認成真人）
  - **重要限制**：這個平台的社友名冊沒有刪除功能，`src/stores/roster.ts` 只有 `insert`/`update`/`setActive`（退社=軟刪除），沒有 delete。所以這兩筆示範資料目前**無法從畫面清掉**，只能標記「退社」或之後請有 DB 權限的人手動清。之後不要再嘗試繞過 UI 直接打 API 刪資料——auto mode 安全機制會擋，而且這是刻意的產品設計（不做硬刪除）
- 地區管理員視角（邀請/管理地區帳號、社團總覽）**還沒有示範帳號**，Task #5 待處理，暫時擱置（使用者已確認第二輪先跳過）

### 環境設定
- `/tmp/d3481clubmanagementsystem/.env.local` 每次重新 clone 都要重建（不在 git 裡），內容：`VITE_SUPABASE_URL=https://xdwqrgthsxyzclnjlmvy.supabase.co` + `VITE_SUPABASE_ANON_KEY`（跟使用者要）
- dev server：launch.json 設定名稱 `d3481-dev`（port 5174），**每次都要重新 `npm install`**（fresh clone 沒有 node_modules）

### 已完成並落地存檔的截圖（第二輪，2026-07-08）
存放位置：`scratchpad/d3481-sop/screenshots/`（session 專屬暫存目錄，**尚未搬進 repo，下次接手要先確認這些檔案還在不在，不在的話要重截**）
1. `01-login-empty.png` 登入頁（空白狀態）
2. `02-login-filled.png` 登入頁（已填 sop@gmail.com / 密碼）
3. `03-roster-list-existing.png` 登入後導向社友名冊頁（此時已有「王小明」一筆，**不是空清單**——因為平台沒有刪除功能，無法重現空清單畫面，文件撰寫時這張要說明成「名冊現況」而非「初次進入的空狀態」）
4. `04-add-member-empty-form.png` 點「+ 新增社友」彈出空白表單
5. `05-add-member-filled-form.png` 表單填入「陳小華（示範資料）」
6. `06-roster-list-after-add.png` 儲存後名冊列表出現第 2 筆「陳小華（示範資料）」

### 技術細節（下次操作 UI 要注意）
- Modal 儲存按鈕沒有 `type="submit"` 屬性，一般 CSS 選不到，要找 `textContent.trim()==='儲存'` 的 button 直接 `.click()`
- 這次改用 **puppeteer-core 驅動本機真實 Chrome**（`scratchpad/d3481-sop/shoot.js`，非 headless 才能正確渲染中文字型)，直接 `page.screenshot()` 存檔，而不是用 `mcp__Claude_Preview__preview_screenshot`（那個工具的圖只會顯示在對話裡，沒有辦法另存成檔案）。腳本用 `puppeteer-core` + `executablePath` 指向 `/Applications/Google Chrome.app/...`，不用整包下載 Chromium
- 寫入正式站資料（按下「儲存」）這類動作，auto mode 分類器會擋下並要求明確使用者授權，這次有先問過使用者才動手

### 待完成流程（Task #1~#4 剩餘部分）
- [ ] 社友名冊：編輯既有社友（可用「王小明」示範）、Excel 匯入/匯出（Task #1 剩餘）
- [ ] 帳號管理：邀請本社帳號、帳號列表、停用/啟用（Task #2）
- [ ] 例會管理：新增例會、出席彙總登記、逐人出席勾選（Task #3）
- [ ] 地區通訊錄：瀏覽、分區篩選、搜尋（Task #4，唯讀，用 sop@gmail.com 即可測）
- [ ] 地區管理員視角：邀請/管理地區帳號、社團總覽（Task #5，暫緩，需要先取得地區示範帳號）
- [ ] 把所有截圖 + 步驟文字整理成 Markdown，套用跟文件一同款視覺（`build_pdf.py` 那套 navy/gold 樣式），輸出 PDF 到 `docs/sop/`（Task #6）
