# Guardian Global I18N Completion

更新日期：2026-08-04

## 本批已遷移

- `App.tsx`、`CareHomeView.tsx`、`CareCalendar.tsx`、`VetVisitPanel.tsx`（整合前已完成並保留）
- `BottomNav.tsx`
- `ReminderCenterView.tsx`
- `ReminderEditor.tsx`
- `SettingsPage.tsx`
- `HealthTimeline.tsx` 的頁面框架、分類、日期時間、空狀態與 ARIA
- `GrowthTracker.tsx`
- `MemoriesPage.tsx`、`PetEditor.tsx`（部分已完成）

## 鍵值與格式策略

- 使用用途導向的語意鍵，例如 `reminderEditorAddTitle`、`settingsBackupRestore`、`timelineEmptyTitle`。
- 相同語意重用共用鍵，例如 `back`、`close`、`saving`、`dateLabel`。
- 動態文字使用 `interpolate`，不拼接介面語句。
- 日期、時間、數字與體重使用 `formatDate`、`formatTime`、`formatNumber`、`formatWeight`。
- 持久化的提醒種類、週期、庫存單位與狀態維持原值；只在 UI 邊界映射翻譯。
- 毛孩名稱、提醒標題、日記、備註、藥名及其他使用者輸入內容不翻譯、不改寫。

## 精準掃描結果

本輪指定的 11 個核心／相鄰畫面，初始掃描為 277 個含漢字行；目前剩 205 個，完成 72 個，依可重現的行級掃描計算為 **26.0%**。以畫面檔案計算，6/11 已達 UI 字串掃描通過或僅含允許的持久值，為 **54.5%**。

允許排除：

- `ReminderEditor.tsx` 的 `顆／包／錠／毫升／克` 是既有持久化單位值，畫面標籤已由 i18n 顯示。
- `HealthTimeline.tsx` 的中文只存在註解與舊資料前綴清理規則，不直接顯示。
- 字典、測試資料、註解、使用者內容與未直接顯示的持久值不列入。

## 尚未完成

### P0

- `MemoriesPage.tsx` 尚有健康選項與部分日記呈現文字。
- `PetEditor.tsx` 尚有少量錯誤訊息、標題與 placeholder。
- Guardian 服務產生的中文敘述仍需在 Timeline／Today 的 UI 邊界建立穩定映射，服務本身不得修改。
- 完整核心流程尚需 zh-TW／en-US 行動版手動操作驗證。

### P1

- `SeniorCareView.tsx`
- `VisualComparisonView.tsx`
- `EventCenterView.tsx`（Attachment UI）
- `vet-report.ts` 的可列印報告文字與日期格式
- 社群與公開網站仍有 inline locale 判斷；不影響本機核心照護流程，但尚未符合全 App 完成條件。

### P2

- Production build 的主 bundle 超過 500 kB。依任務要求列為 post-i18n optimization，本輪不做 bundle splitting。

## 版面 QA

- 型別與 production build 已驗證。
- 尚未完成 390 × 844、tablet、desktop 的瀏覽器視覺驗證，因此不宣稱真機或完整響應式驗收通過。
- 待驗項目：英文長標籤換行、底部導覽、modal 寬度、safe-area、橫向捲動與 ARIA。

## 資料與保護模組

本輪未修改 Observation、Context、Insight、Case Journey、Guardian Today、Timeline Aggregation、Attachment、Shared Media、device-store、備份格式、儲存 schema 或持久化 enum 的內部邏輯。
