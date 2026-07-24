# iPhone／TestFlight 發佈準備

版本：0.14.0（Build 14）  
Bundle ID：`tw.maohai.lifecenter`

## 已完成

- iPhone 原生 Xcode 專案。
- App 名稱與 Bundle ID。
- 麥克風用途說明。
- 照片選取用途說明。
- 非豁免加密聲明。
- App Icon 與啟動畫面資源。
- Capacitor 與 Local Notifications 的隱私清單由套件提供。
- Android／iPhone 共用功能與 17 項自動測試。

## 需要在 Mac 完成

1. 將專案複製到 Mac。
2. 安裝最新版正式版 Xcode、Node.js 及 Xcode Command Line Tools。
3. 在專案執行 `npm install` 及 `npm run native:sync`。
4. 開啟 `ios/App/App.xcodeproj`。
5. 在 Signing & Capabilities 選擇 Apple Team，確認 Bundle ID 唯一。
6. 先連接自己的 iPhone，選擇實機後按 Run。
7. 實機功能通過後，選擇 Any iOS Device (arm64)。
8. 選擇 Product > Archive。
9. 在 Organizer 選擇 Distribute App > App Store Connect > Upload。
10. 到 App Store Connect 的 TestFlight 頁等待處理完成，再加入測試者。

## App Store Connect 建議資料

- 名稱：毛孩生活中心
- 副標題：離線照護提醒與生活回憶
- 類別：生活風格（主要）、醫療（次要，若 Apple 接受）
- 關鍵字：寵物,毛孩,吃藥提醒,餵食,看診,回憶,健康,體重
- 隱私現況：本版本資料只保存在裝置；不建立帳號、不追蹤、不上傳健康、照片或錄音。
- 加密：只使用 Apple 系統／標準網路加密，已設定非豁免加密為否。

## 上傳前仍缺少

- Apple Developer Program 有效會員。
- Apple Team 簽署。
- App Store Connect 建立 App 紀錄。
- 可公開瀏覽的隱私權政策網址。
- 支援網址與聯絡信箱。
- iPhone 尺寸的 App Store 截圖。
- TestFlight 測試說明與聯絡資料。

## TestFlight 測試重點

- 本機通知、精確時間與重新開機後排程。
- 吃藥、吃飯、看診、疫苗及週期照護。
- 錄音、App 內試聽與系統背景通知聲音。
- 多毛孩、照片頭像、回憶照片及體重趨勢。
- 完整備份與恢復。
- 靜音及勿擾模式的實際系統行為。

## 已知限制

動態錄製的提醒語可在 App 內試聽，但 iPhone 鎖屏或 App 關閉時，背景通知目前使用系統提示音。iOS 不允許一般網頁程式任意在背景自動播放使用者錄音，需另行評估原生方案，且必須遵守系統限制。
