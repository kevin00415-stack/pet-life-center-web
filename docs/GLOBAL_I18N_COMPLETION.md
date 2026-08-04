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

I18N Visual Acceptance Gate 已於 PR #9 head `92ee47d4113b5a00a4ecc4b47420b3d966664cd1` 完成。Cloudflare check 對應 preview 為 `https://31c0702b.pet-life-center-web.pages.dev`；因自動化執行環境禁止 Playwright 直接連外，互動矩陣使用同一 commit 的本機 Vite preview 驗證。

- Playwright：12/12 通過，涵蓋 390×844、768×1024、1440×900，以及 zh-TW／en-US。
- 畫面：Public Website、建立毛孩、CareHome、Settings、Memories、Health Timeline、Community、Reminder Center、Senior Care、Event Center、Visual Comparison。
- 驗證：語言 `html[lang]`、重新載入後語言／本機資料持續存在、水平溢位、被裁切文字／控制項、底部導覽與主要頁面往返。
- 證據：`docs/evidence/i18n-visual-gate/` 共 66 張 PNG（每個 viewport／語言 11 張）。
- P1 修正：首頁 `WELCOME HOME` 移入 i18n；390px 英文底部 `Community` 保持單行；健康摘要 `Medication` 不再斷字。
- 未在這個自動化案例中宣稱完成：真機 safe-area、系統通知／權限、PDF 系統列印對話框、相機／麥克風／大型附件 OS 整合。這些仍屬真機發佈驗收。

## 風險分級

- P0：無已知編譯、測試或資料相容性阻塞。
- P1：本輪已驗證的視覺與語言流程無未解決 P1。真機通知、系統列印與媒體權限仍由發佈 smoke test 驗收。
- P2：主 bundle 664.60 kB（gzip 192.90 kB），超過 Vite 500 kB 提示；依任務範圍留待後續 code-splitting optimization，本次不拆包。
