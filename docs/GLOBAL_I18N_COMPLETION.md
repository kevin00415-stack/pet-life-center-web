# Guardian Global I18N Completion

更新日期：2026-08-04

## 完成範圍

本次指定的核心與最終批次已完成 zh-TW／en-US 介面遷移：App、CareHome、Care Calendar、Vet Visit、Bottom Navigation、Reminder Center、Reminder Editor、Settings、Health Timeline、Growth & Weight、Memories、Pet Editor、Senior Care、Visual Comparison、Event／Attachment UI、Veterinary PDF、Community UI 與 Public Website。

指定畫面檔案完成率為 **100%（19/19）**。剩餘含中文來源僅為允許排除的使用者／示例內容、註解、測試 fixture，以及為相容既有資料而保留的持久化列舉值；顯示時皆透過 UI-boundary mapping 轉譯。

## 實作原則與資料保護

- 使用穩定語意鍵與 zh-TW 權威 fallback。
- 日期、時間、數字與單位使用共用 locale formatter。
- 未翻譯或改寫毛孩名稱、日記、提醒標題、藥名、備註、照片／影片文字等使用者內容。
- 回憶健康選項、提醒種類、週期、狀態及事件預設來源值維持原始儲存值，只在畫面邊界映射。
- Veterinary PDF 依目前語系輸出標題、欄位、狀態、日期與單位，使用者輸入仍保持原文。
- Protected Guardian engines、Attachment／Shared Media services、device-store、storage schema 與 backup format 均未變更。

## 混合語言與程式掃描

- 最終批次元件的 `locale ===`／`locale !==`：0。
- 最終批次元件直接 `toLocaleDateString`／`toLocaleTimeString`／`toLocaleString`：0。
- 公開網站語言切換透過 `alternateLocale`，不在元件內分支。
- 社群示例貼文視為 mock／內容資料，不屬介面字串；不自動翻譯。
- Protected `GuardianTodayService` 仍含既有 `toLocaleTimeString('zh-TW')`，依任務禁止修改服務，本輪未動；若該來源文字直接顯示於英文畫面，需在後續獨立核准工作於 UI boundary 補齊。

## 驗證結果

- 測試：25 個檔案，131 項通過，0 失敗，0 skipped。
- Production build：通過，0 error。
- Lint：通過，0 error、0 warning。
- `git diff --check`：通過；僅 Git 提示 Windows 下未來可能做 LF→CRLF 正規化，不是 diff error。
- Bundle：主 JS 664.47 kB（gzip 192.87 kB），Vite 提示超過 500 kB。

## Viewport QA

程式建置與靜態響應式規則已驗證，但本輪工具未提供可可靠完成 390×844、tablet、desktop 三尺寸互動截圖與逐頁操作的瀏覽器自動化證據，因此不宣稱真機或完整視覺驗收通過。需在部署預覽或可用瀏覽器工作階段補驗：英文長字串、bottom navigation、modal、safe-area、橫向捲動、PDF 列印與 attachment controls。

## 風險分級

- P0：無已知編譯、測試或資料相容性阻塞。
- P1：三種 viewport 的人工／瀏覽器逐頁視覺驗收尚未完成；Protected GuardianTodayService 產生文字的英文 UI-boundary 顯示需在實際核心流程驗收中特別確認。
- P2：i18n 後主 bundle 超過 500 kB；依任務要求留待 post-i18n code-splitting optimization，本次不拆包。
