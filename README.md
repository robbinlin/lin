# 連結摘要收藏

丟一個連結進來（YouTube、TikTok 短片，或 Facebook、LinkedIn、Google Scholar、任何網頁）——自動擷取內容、用 Claude 摘要，並自動分類收藏。單人使用的 Next.js + SQLite MVP。

連結可以透過網頁表單提交，也可以直接丟進 Slack 專用頻道——機器人會即時處理並在該則訊息串回覆摘要與分類。分類支援複選——一個連結可以同時掛多個分類標籤，不管是丟連結時預選、還是之後在 `/item/[id]` 用快速分類，都能一次勾多個。

## 技術棧

- **Next.js 16**（App Router, TypeScript）— 前端 + API routes 合一
- **SQLite + Prisma 7** — 單一資料庫檔案，免另架服務
- **Claude API**（`@anthropic-ai/sdk`，預設 `claude-sonnet-5`）— 摘要與分類，使用結構化輸出
- **yt-dlp** — YouTube / TikTok 字幕擷取
- **@mozilla/readability + jsdom** — 一般網頁 / Google Scholar 正文擷取
- **Slack Events API**（即時 webhook）— 把連結丟進指定頻道即可觸發處理，簽章驗證 + 串內回覆
- Facebook 預設不自動爬取，改為手動貼上貼文文字；可選擇性啟用 **Playwright**（見下方「⚠️ Facebook 內容擷取」）用你自己登入的帳號嘗試自動擷取，失敗時仍會退回手動貼文字
- LinkedIn 不做自動爬取，改為手動貼上貼文文字

## 本機開發

### 1. 安裝相依套件

```bash
npm install
```

### 2. 安裝 `yt-dlp`（非 npm 套件）

YouTube/TikTok 字幕擷取需要 `yt-dlp` 二進位檔：

```bash
pip install --user yt-dlp
# 或
brew install yt-dlp
```

若不在 PATH 中，於 `.env` 設定 `YT_DLP_PATH` 指向執行檔路徑。

### 3. 設定環境變數

```bash
cp .env.example .env
```

編輯 `.env`，填入你的 `ANTHROPIC_API_KEY`（[取得 API key](https://console.anthropic.com/)）。`DATABASE_URL` 預設已指向本機 SQLite 檔案，不需修改。若要用 Slack 丟連結，另見下方「Slack 整合設定」填入 `SLACK_BOT_TOKEN`、`SLACK_SIGNING_SECRET`。

### 4. 建立資料庫並填入起始分類

```bash
npm run db:migrate
npm run db:seed
```

### 5. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)。

## 批次匯入既有連結

手上有一大批舊連結（例如從聊天紀錄整理出來的）想一次匯入，不用一個個貼網頁：

1. 把連結（一行一個）放進 `scripts/bulk-import-urls.txt`（repo 裡已經放了一份範例）。
2. 跑：
   ```bash
   npm run import:bulk
   ```
   建議先用 `--limit` 跑一小批確認沒問題，再跑全部：
   ```bash
   npm run import:bulk -- --limit 20
   ```
3. 腳本會依序處理每個連結（跟網頁提交、Slack 丟連結走的是同一套擷取+摘要邏輯），在終端機印出每筆的結果。**可以安全地中斷、重新執行**——已經存過的連結會自動跳過，不會重複處理。
4. 連結量大、又混了很多 TikTok 時，預期會有不少筆落在「擷取失敗」或「待補文字」——這是正常的（見上面「TikTok/Facebook 抓不到內容」的討論），跑完之後可以到 `/library` 左側篩選點「未分類」，一次看到所有還沒有分類標籤的連結。這種完全沒內容的連結沒辦法讓 AI 自動分類（沒東西可以讀），但 `/library` 支援**多選批次貼標籤**：每張卡片右上角有勾選框，勾選多筆之後畫面上方會出現分類選單，選好分類按「套用」就會一次幫所有勾選的連結加上（不會動到它們原本已有的分類）。可以搭配搜尋列輸入網址關鍵字（例如網域名稱）先篩出同一來源的一批連結，再全選套用同一個分類，比一筆一筆點快很多；篩選/搜尋結果超過 20 筆時，網址列加上 `&limit=200` 之類的參數可以一次看更多筆（上限 300）。
5. 全部跑完後可以把 `scripts/bulk-import-urls.txt` 清空或刪除，它只是一次性的匯入清單，不影響其他功能。

## ⚠️ Facebook 內容擷取（實驗性，會用到你自己的帳號）

**先讀完這一段風險說明，再決定要不要用。**

預設情況下 Facebook 連結一律走「手動貼文字」——這是刻意的設計，因為 Facebook 的貼文/分享連結幾乎都需要登入才能看。這裡提供一個**選用**的替代方案：用 [Playwright](https://playwright.dev/) 重複使用你自己瀏覽器登入 Facebook 後的 session，讓伺服器端能像真人一樣看到已登入的內容，不用每次手動貼文字。

**風險（自己評估要不要接受）：**
- 用自動化程式重複使用登入 session 去抓取內容，**違反 Facebook 服務條款**
- Facebook 可能偵測到、限制帳號功能，甚至要求驗證或封鎖帳號——**建議用一個你不介意被限制的次要帳號**，不要用主帳號
- 存下來的 session 檔案等同於你的登入憑證，外流等於帳號被盜——已加進 `.gitignore`，但**絕對不要**把 `facebook-session.json` 分享給任何人或上傳到任何地方
- Session 會過期，過期後這條路徑會自動失敗、退回手動貼文字（不會讓程式崩潰），但你需要重新登入一次

**設定方式（選用）：**

```bash
npm run facebook:login
```

會跳出一個真的瀏覽器視窗，你自己在裡面手動輸入帳密登入 Facebook（這個腳本完全看不到、也不經手你的密碼）。登入成功、看得到動態消息後，回到終端機按 Enter，session 就會存到本機的 `facebook-session.json`。

存好之後，Facebook 連結會**優先**嘗試用這個 session 自動擷取內容；失敗（session 過期、被導去登入頁、抓不到文字）時會自動退回原本的手動貼文字流程，不影響既有功能。

**不想用了怎麼辦：** 刪除 `facebook-session.json` 即可，系統會自動偵測不到 session、退回預設的手動貼文字模式。

**部署時注意：** Playwright 需要下載瀏覽器執行檔（`npx playwright install chromium`，約 100-300MB），部署到 VPS 時記得執行這一步；且這個功能只在你已經在該主機上跑過 `npm run facebook:login` 存好 session 後才會啟用。

**補跑先前擷取失敗/待補文字的 Facebook 連結：** 設定好 session 之後，之前存進資料庫、狀態還卡在「擷取失敗」或「待補文字」的 Facebook 連結不會自動重跑，需要手動觸發。單筆的話可以到 `/item/[id]` 點「重試」；一次要補一大批的話可以跑：

```bash
npm run retry:facebook
```

會找出所有 `sourceType` 是 Facebook、且狀態仍是「擷取失敗」或「待補文字」的連結，依序重新走一次擷取＋摘要流程（跟前面「批次匯入」一樣，可安全中斷、重複執行；沒 session 或抓不到內容的連結會維持原狀，不會被覆寫成錯誤資料）。同樣支援 `--limit`（先跑一小批確認）與 `--delay`（預設 2000ms）。

**補摘要（內容已擷取成功、但摘要/分類卡住的連結）：** 有些連結是「內容有抓到，但摘要沒有成功」（例如批次匯入或補跑當下 `ANTHROPIC_API_KEY` 沒被正確讀到）——這種不算「待補文字」，`npm run retry:facebook` 不會處理到。要補這種的話跑：

```bash
npm run resummarize
```

會找出所有已經有擷取內容、但 `llmStatus` 不是成功的連結（不限來源，YouTube/一般網頁/Facebook 都算），**只重跑摘要這一步**、不重新擷取內容（避免浪費一次 yt-dlp/Playwright 呼叫，也不會有「這次重新擷取反而失敗，把原本抓到的內容洗掉」的風險）。同樣支援 `--limit`／`--delay`，可安全中斷重跑。

## Slack 整合設定

丟連結給 Slack 機器人比開網頁貼上更順手，尤其是手機上用分享選單。設定一次即可：

1. 到 [api.slack.com/apps](https://api.slack.com/apps) 建立一個新 App（From scratch），選擇你的 workspace。
2. **OAuth & Permissions** 頁面 → Scopes → Bot Token Scopes，加入：
   - `channels:history`（讀取頻道訊息）
   - `chat:write`（回覆訊息）
3. **Event Subscriptions** 頁面：
   - 打開 Enable Events
   - Request URL 填 `https://<你的部署網域>/api/slack/events`（本機開發可用 `ngrok http 3000` 或 `cloudflared tunnel` 開一個對外網址；Slack 會立刻打一個 `url_verification` 請求驗證，這個 App 已經處理好簽章驗證與 challenge 回覆）
   - Subscribe to bot events → 加入 `message.channels`
4. **Basic Information** 頁面 → App Credentials → 複製 **Signing Secret**，填入 `.env` 的 `SLACK_SIGNING_SECRET`。
5. 回到 **OAuth & Permissions** 頁面 → Install to Workspace，安裝後複製 **Bot User OAuth Token**（`xoxb-...`），填入 `.env` 的 `SLACK_BOT_TOKEN`。
6. 在 Slack 建一個專用頻道（例如 `#links-inbox`），把機器人加進去（`/invite @你的App名稱`）。右鍵頻道名稱 → 檢視頻道詳細資訊，複製 Channel ID，填入 `.env` 的 `SLACK_CHANNEL_ID`（選填，但建議設定，避免機器人被加進其他頻道時誤處理）。
7. 若已部署，設定 `APP_URL` 為你的正式網址，Slack 回覆訊息會附上「查看詳情」連結。

設定完成後，把任何連結丟進該頻道，機器人會在幾秒內於原訊息串回覆摘要、分類，或（Facebook/LinkedIn）提示需要補貼文字——這時直接到網頁的 `/item/[id]` 頁面補上文字即可。

## 測試

```bash
npm test        # 單元測試（來源判斷、VTT 字幕解析、Slack 簽章驗證與連結擷取）
npm run build   # 型別檢查 + production build
npm run lint    # ESLint
```

## 部署

**必須部署到能安裝 `yt-dlp` 二進位檔、且能長時間執行 Node process 的主機**（VPS、Railway、Fly.io 等）——不建議部署到 Vercel、Cloudflare Workers/Pages 之類的 serverless 平台：這類平台的 function 執行環境沒有完整 Node.js（裝不了 `yt-dlp`、`better-sqlite3` 這類原生模組/外部執行檔），檔案系統也不是持久化的（每次部署 SQLite 資料就會被重置）。

repo 根目錄的 `Dockerfile` 已經處理好這些（裝 `yt-dlp`、`npm run build`、啟動時自動跑 `prisma migrate deploy` + `prisma db seed`），任何支援用 Dockerfile 部署的主機（Railway、Fly.io、VPS 上自己跑 `docker run`）都可以直接用。

### 部署到 Railway（推薦）

1. 到 [railway.app](https://railway.app) 用 GitHub 帳號登入。
2. **New Project → Deploy from GitHub repo**，選這個 repo（`robbinlin/lin`）、選 `claude/link-summary-classifier-app-jxh2ax`（或之後合併進的正式分支）。Railway 會偵測到 `Dockerfile` 並自動用它建置，不用另外設定 build command。
3. **加一個 Volume（非常重要，沒做這步資料會不見）**：進 Service → Settings → Volumes → New Volume，Mount path 填 `/data`。這是 SQLite 資料庫檔案要放的地方——沒有 Volume 的話，容器每次重啟/重新部署都會是全新的空檔案系統，之前存的連結會全部消失。
4. 進 Service → Variables，加入環境變數：
   - `DATABASE_URL` = `file:/data/prod.db` （對應上一步的 Volume 路徑）
   - `ANTHROPIC_API_KEY` = 你的 Claude API key
   - `CLAUDE_MODEL` = `claude-sonnet-5`（選填，不填會用預設值）
   - 若要用 Slack：`SLACK_BOT_TOKEN`、`SLACK_SIGNING_SECRET`、`SLACK_CHANNEL_ID`（見下方「Slack 整合設定」）
   - `APP_URL`：先留空，拿到網域後回來補（下一步）
5. 設定完變數後 Railway 會自動重新部署。等它跑完，到 Service → Settings → Networking → **Generate Domain**，會拿到一個 `https://xxx.up.railway.app` 的公開網址。
6. 回到 Variables，把 `APP_URL` 填成上一步拿到的網址，讓 Slack 回覆訊息能附上「查看詳情」連結。
7. 若要用 Slack 整合，回到 [api.slack.com/apps](https://api.slack.com/apps) 你的 App 設定頁，把 Event Subscriptions 的 Request URL 改成 `https://xxx.up.railway.app/api/slack/events`。
8. 打開 `https://xxx.up.railway.app` 應該就能看到網頁了；丟一個連結測試看看。

**Facebook Playwright 擷取在 Railway 上預設不會啟用**——那個功能需要跳出真的瀏覽器視窗讓你手動登入一次（`npm run facebook:login`），但 Railway 是無頭的伺服器環境，沒有畫面可以顯示瀏覽器。沒設定 `FACEBOOK_SESSION_PATH`/session 檔案的話，Facebook 連結會照原本設計自動退回手動貼文字，不影響其他功能。

### 部署到其他主機（Fly.io / VPS）

只要主機支援 `Dockerfile` 部署，流程概念是一樣的：
1. Node.js 20+ 的執行環境（Dockerfile 裡已經指定 `node:20-slim`）
2. 一個持久化的檔案系統路徑，`DATABASE_URL` 指過去（VPS 上直接用本機路徑即可，不像 Railway 需要額外設定 Volume）
3. 環境變數同上：`ANTHROPIC_API_KEY`、`CLAUDE_MODEL`（選填）、`SLACK_BOT_TOKEN`/`SLACK_SIGNING_SECRET`/`SLACK_CHANNEL_ID`（選填）、`APP_URL`（選填）、`FACEBOOK_SESSION_PATH`（選填）
4. VPS 上如果不想用 Docker，也可以照 Dockerfile 裡的步驟手動裝：Node 20+、`yt-dlp` 二進位檔、`npm ci && npm run build`，啟動時跑 `npx prisma migrate deploy && npx prisma db seed && npm run start`
5. 若要用 Facebook Playwright 擷取，且主機有辦法跑圖形介面（或用 `xvfb` 之類的虛擬顯示），可以執行 `npx playwright install chromium` 裝瀏覽器執行檔，再跑 `npm run facebook:login`（見上方「⚠️ Facebook 內容擷取」）——多數雲端主機沒有這個條件，通常還是本機跑這個功能比較實際。

## 專案結構

```
Dockerfile                 # 部署用（見「部署」— Railway/Fly.io/VPS 皆可用）
prisma/schema.prisma       # Link / Category 資料表定義
prisma/seed.ts             # 起始分類清單
src/lib/extract/           # 依來源型別擷取內容（YouTube/TikTok/一般網頁/手動貼文/Facebook Playwright）
src/lib/llm/               # Claude 摘要 + 分類（含動態分類建立）
src/lib/slack/             # Slack 簽章驗證、連結擷取、回覆訊息
src/lib/pipeline.ts        # 擷取 + LLM 的完整處理流程
src/app/api/                # REST API：/api/links, /api/categories, /api/slack/events
src/app/                    # 首頁（提交）、/library（瀏覽/搜尋/篩選）、/item/[id]（詳情）
```

## MVP 範圍外（已知限制）

- 無字幕影片不做語音轉文字（可能之後加 Whisper API）
- Facebook 預設不自動爬取，需手動貼上文字；可選擇性用 Playwright 重用登入 session 自動擷取（見「⚠️ Facebook 內容擷取」，有帳號風險，非預設啟用）
- LinkedIn 不自動爬取，需手動貼上文字（長期方案，非過渡措施）
- 無瀏覽器擴充功能 / App 分享選單整合（Slack 頻道是目前的低摩擦入口）
- 單人使用，無登入機制——若要公開部署，需自行加上存取控制
- 同步處理（提交當下直接跑完擷取+摘要），未使用非同步 job queue
- Slack 端沒有針對 retry 事件做去重表，靠 `Link.url` 的 unique constraint 避免重複建立資料（見 `src/app/api/slack/events/route.ts`）
