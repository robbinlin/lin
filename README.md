# 連結摘要收藏

丟一個連結進來（YouTube、TikTok 短片，或 Facebook、LinkedIn、Google Scholar、任何網頁）——自動擷取內容、用 Claude 摘要，並自動分類收藏。單人使用的 Next.js + SQLite MVP。

## 技術棧

- **Next.js 16**（App Router, TypeScript）— 前端 + API routes 合一
- **SQLite + Prisma 7** — 單一資料庫檔案，免另架服務
- **Claude API**（`@anthropic-ai/sdk`，預設 `claude-sonnet-5`）— 摘要與分類，使用結構化輸出
- **yt-dlp** — YouTube / TikTok 字幕擷取
- **@mozilla/readability + jsdom** — 一般網頁 / Google Scholar 正文擷取
- Facebook / LinkedIn 不做自動爬取，改為手動貼上貼文文字

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

編輯 `.env`，填入你的 `ANTHROPIC_API_KEY`（[取得 API key](https://console.anthropic.com/)）。`DATABASE_URL` 預設已指向本機 SQLite 檔案，不需修改。

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

## 測試

```bash
npm test        # 單元測試（來源判斷、VTT 字幕解析）
npm run build   # 型別檢查 + production build
npm run lint    # ESLint
```

## 部署

**必須部署到能安裝 `yt-dlp` 二進位檔、且能長時間執行 Node process 的主機**（VPS、Railway、Fly.io 等）——不建議部署到 Vercel 之類的 serverless 平台，因為 `yt-dlp` 無法在其預設 runtime 上安裝，YouTube/TikTok 字幕擷取會失效。

部署主機需要：
1. Node.js 20+
2. `yt-dlp` 二進位檔（`apt install yt-dlp` 或 `pip install yt-dlp`）
3. 環境變數：`DATABASE_URL`、`ANTHROPIC_API_KEY`、`CLAUDE_MODEL`（選填）、`YT_DLP_PATH`（選填）
4. 部署後執行一次 `npx prisma migrate deploy && npx prisma db seed`

## 專案結構

```
prisma/schema.prisma       # Link / Category 資料表定義
prisma/seed.ts             # 起始分類清單
src/lib/extract/           # 依來源型別擷取內容（YouTube/TikTok/一般網頁/手動貼文）
src/lib/llm/               # Claude 摘要 + 分類（含動態分類建立）
src/lib/pipeline.ts        # 擷取 + LLM 的完整處理流程
src/app/api/                # REST API：/api/links, /api/categories
src/app/                    # 首頁（提交）、/library（瀏覽/搜尋/篩選）、/item/[id]（詳情）
```

## MVP 範圍外（已知限制）

- 無字幕影片不做語音轉文字（可能之後加 Whisper API）
- Facebook/LinkedIn 不自動爬取，需手動貼上文字（長期方案，非過渡措施）
- 無瀏覽器擴充功能 / App / 分享選單整合
- 單人使用，無登入機制——若要公開部署，需自行加上存取控制
- 同步處理（提交當下直接跑完擷取+摘要），未使用非同步 job queue
