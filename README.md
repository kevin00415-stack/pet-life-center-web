# 🐾 毛孩生活中心 App (Maohai Life Center)

> **安心陪伴每一天，為愛寵量身打造的單機優先排程與健康管理助手。**

毛孩生活中心是一款以手機優先（Mobile-First）設計，採用 **React + TypeScript + Vite** 建置的漸進式網頁應用程式（**PWA**）。專案更透過 **Capacitor** 強力封裝了 Android 與 iOS 原生專案，讓飼主在離線或無網路環境下，依然能流暢、私密地追蹤愛寵的所有生活照護細節。

---

## 🌟 核心設計特色 (Core Highlights)

1. **單機離線優先 (Local-First)**
   - 所有的毛孩檔案、照護提醒、看診準備、回憶日記照片及錄音，**完全保存在使用者的裝置本機中**（透過 IndexedDB 儲存）。
   - 不需要註冊會員，不需要雲端，100% 保障您的隱私，且離線隨時隨地皆可開啟。

2. **多毛孩專屬個人空間**
   - 支援自由切換多隻毛孩檔案，各自擁有專屬的生活封面照片（支援置中與縮放微調）、獨立的照護提醒表、健康時間軸與離線回憶日記。

3. **強大的照護排程與通知 (Capacitor Native Notifications)**
   - 整合 `@capacitor/local-notifications` 原生本機推送通知。
   - 支援服藥、吃飯、看診、疫苗、日常照護等五大類型。
   - 支援複雜週期設定（單次、每天多次、每週、每月、每季、每年）並具備月底與閏年防無效日期保護。
   - **藥品庫存預警與扣除**：記錄每次服藥劑量並自動扣減，當庫存低於警戒線時自動觸發本機通知提醒補藥。

4. **看診工作流整合 (Vet Visit Workflow)**
   - 看診前逐項勾選準備物品與醫師問題清單，看診後詳細記錄診斷、醫囑、處方箋及下次回診。

5. **離線舒壓音樂與協調機制**
   - 內建 3 首舒壓音樂，可於背景或鎖屏狀態下持續安心播放。
   - 具備語音/鈴聲提醒與背景音樂之協調播放器，提醒響起時會智慧暫停音樂，提醒完成或手動結束後則彈性恢復。

6. **全方位資料安全性 (IndexedDB JSON 備份/恢復)**
   - 支援一鍵導出完整 JSON 備份檔，將本機圖片（頭像與日記相簿照片）、自訂錄音 Blob 全數安全壓縮打包，支援跨裝置完美轉移與恢復。

---

## 📂 專案架構與檔案目錄說明 (Repository Layout)

```bash
├── android/                   # Capacitor 自動生成的 Android 原生工程專案
├── ios/                       # Capacitor 自動生成的 iOS 原生工程專案
├── public/                    # PWA 與靜態資源目錄
│   ├── manifest.webmanifest   # PWA 設定描述檔
│   ├── sw.js                  # Service Worker (離線 Cache-First 靜態資源快取代理)
│   ├── favicon.svg            # 網頁 Favicon
│   └── app-icon-192.png       # PWA 啟動圖示
├── external-media-source/     # 延遲載入的舒壓音樂源檔 (避開包裝進 App)
├── src/                       # 前端原始碼核心目錄
│   ├── assets/                # 系統 3D 設計圖示與視覺資源
│   ├── main.tsx               # 前端渲染進入點
│   ├── App.tsx                # 首頁控制中心與全域狀態管理
│   ├── App.css                # 精緻暖光居家島 3D 擬真視覺系統樣式
│   ├── domain.ts              # 核心領域模型、時間排程演算法與狀態計算
│   ├── device-store.ts        # IndexedDB 持久化存取與 Base64 備份/還原邏輯
│   ├── notifications.ts       # 原生 Capacitor 推送與精確鬧鐘排程橋接
│   ├── audio-coordination.ts  # 語音提醒與舒壓背景音樂播放的協調機制
│   ├── photo-position.ts      # 自訂頭像與封面 XY 置中裁剪與幾何縮放
│   ├── CareCalendar.tsx       # 離線照護月曆組件
│   ├── HealthTimeline.tsx     # 月份分組健康時間軸與體重成長趨勢圖
│   ├── VetVisitPanel.tsx      # 看診準備清單與病歷詳細紀錄
│   ├── MemoriesPage.tsx       # 離線生活日記與相簿 (照片本機壓縮)
│   ├── RelaxPage.tsx          # 背景音訊音樂播放器
│   ├── SettingsPage.tsx       # 設定中心、空間估算與實機驗收工具
│   └── domain.test.ts         # 核心邏輯與排程單元測試
├── package.json               # 專案相依性、編譯與同步指令設定
├── capacitor.config.ts        # Capacitor 封裝設定檔
├── vite.config.ts             # Vite 建置設定檔
└── PROJECT_STATUS.md          # 產品開發狀態與版本里程碑紀錄
```

---

## 🛠️ 本機執行與建置步驟 (Local Execution)

本專案需要安裝 **Node.js (推薦 v18+)**。

### 1. 安裝相依套件
```bash
npm ci
```

### 2. 開啟本機開發伺服器
```bash
npm run dev
```

### 3. 執行單元測試
專案使用 **Vitest** 進行測試，用以驗證複雜排程時間計算、藥庫與置中裁剪幾何運算：
```bash
npm run test
```

### 4. 正式建置 (PWA & Web Build)
```bash
npm run build
```
建置完成後會產生靜態資源於 `dist/` 資料夾中。

---

## 📱 原生行動平台同步與打包 (Capacitor Native Sync)

當您修改了網頁程式，需要同步到原生 Android / iOS 專案時，請使用以下指令：

目前三首舒壓音樂放在 `public/music/`，會隨 PWA 建置並由 Service Worker 預先快取，因此完成安裝與首次快取後可離線播放。三首 MP3 合計約 15 MB。

未來官網音樂庫上線後，可以在 Cloudflare Pages 設定下列環境變數，改用外部曲目來源；下載到 App 音樂庫的流程會另外實作：
```bash
# 同步網頁建置資產至雙原生平台
npm run native:sync

# 啟動 Android Studio 開發並安裝實機
npm run native:android

# 啟動 Xcode 開發並安裝實機
npm run native:ios
```

若設定外部網址，該網址下必須包含：
> ⚠️ **權限說明**
>
> 為了提供完美的提醒與回憶功能，原生 App 首次啟動時會要求使用者授予以下權限：
> - **通知與精確鬧鐘 (Exact Alarms)**：在預定時間推送服藥、吃飯或補藥提醒。
> - **麥克風/錄音**：用於讓飼主自行錄製 30 秒專屬語音提醒。
> - **相簿存取**：用於選擇毛孩照片或紀錄日記生活照。

---

## 資料匯出

- 「完整備份檔」是 App 專用 JSON，包含照片、錄音與本機資料，只能使用 App 的「恢復資料」匯入，不是一般閱讀文件。
- 「獸醫摘要 PDF」會在裝置本機建立可列印摘要，只包含目前毛孩的基本資料、服藥、看診、疫苗、體重與健康時間軸，不包含照片、影片或錄音。使用者可在手機列印畫面儲存為 PDF 或分享。

## PWA
## 🔒 安全性、漏洞與測試硬編碼自我診斷

1. **無雲端，零隱私洩露風險**
   專案完全運行於離線 Sandboxed Webview 中，沒有外部網路 API 回傳或第三方認證。所有敏感圖片與自訂聲音均以二進位（Blob）寫入 IndexedDB 本機沙盒中。

2. **備份安全性**
   導出 JSON 備份檔時，檔案僅存在使用者控制的硬碟上。導入備份時，`device-store.ts` 具備完整的 format 校驗（檢查格式標記 `maohai-care-backup`），防範不合規的 JSON 檔案導致系統崩潰。

3. **硬編碼測試資料安全**
   專案在主運行期（Production runtime）中**沒有任何硬編碼的測試資料**。在 `device-store.ts` 中設計了 `isUntouchedLegacySeed` 快取邏輯，若系統偵測到未經修改的歷史種子資料（如早期版本的測試數據），會主動在啟動載入時從本機 IndexedDB 中移除乾淨，確保使用者的工作區極致整潔，並維持 100% 真實資料完整性。

---

## 🤝 貢獻與開發導引

如果您想為「毛孩生活中心 App」貢獻代碼：
1. 請遵循本專案傳統中文（zh-TW）之語意化 UI 與精緻 3D 擬真居家島視覺風格。
2. 修改 `domain.ts` 中的算法時，請確保更新並執行 `domain.test.ts` 確保所有 20 項測試皆能 100% 通過。
3. 原生同步時避免手動在原生資產內修改 build 目錄，一切應回到前端 React 原始碼進行重置。

毛孩生活中心，與您一同守護毛孩的健康成長，用科技溫暖陪伴每一天！🐾
