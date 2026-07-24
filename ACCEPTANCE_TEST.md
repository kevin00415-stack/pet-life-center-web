# 毛孩生活中心 App 實機驗收指南

版本：0.14.0  
驗收平台：Android 實機、iPhone 實機

## Windows 固定專案位置

將新版 ZIP 解壓縮至：

`C:\Users\user\OneDrive\桌面\APP專案\APP網頁製作傳\APP`

## Android 測試安裝

1. 安裝 Node.js 22、JDK 21 與最新版 Android Studio。
2. 在專案資料夾執行 `npm install`。
3. 執行 `npm run native:sync`。
4. 使用 Android Studio 開啟專案內的 `android` 資料夾。
5. 連接已開啟「USB 偵錯」的 Android 手機。
6. 在 Android Studio 選擇手機並按 Run。
7. 若要產生測試 APK，選擇 Build > Build APK(s)。
8. APK 通常位於 `android\app\build\outputs\apk\debug\app-debug.apk`。

## iPhone 測試安裝

iPhone 原生 App 必須使用 macOS、Xcode 與 Apple 簽署，無法在 Windows 直接產生安裝檔。

1. 在 Mac 安裝 Node.js、Xcode 及 Xcode Command Line Tools。
2. 執行 `npm install` 與 `npm run native:sync`。
3. 使用 Xcode 開啟 `ios/App/App.xcodeproj`。
4. 在 Signing & Capabilities 選擇自己的 Apple Team。
5. 連接 iPhone、信任開發者並按 Run。

## 必測項目

- 通知權限與 10 秒測試通知。
- 吃藥：每天多次、完成、漏吃、補吃、藥品庫存。
- 吃飯：早餐、午餐、晚餐與多次提醒。
- 看診：提前一天、提前兩小時、準時提醒、清單與醫囑。
- 疫苗及照護：每週、每月、每季與每年。
- 多毛孩：資料切換、照片頭像與裁切位置。
- 回憶：文字、心情、五張照片及刪除。
- 健康：時間軸、體重與成長趨勢。
- 月曆：跨月份、月底與閏年行程。
- 備份：下載後確認檔案存在。
- 恢復：新增測試資料後恢復備份，核對照片、錄音與紀錄。
- Android 重新開機後，確認排定通知仍存在。
- 靜音與勿擾模式下，記錄系統實際提示方式。

## 已知限制

- 自訂語音可錄製、保存、備份與 App 內試聽。
- App 關閉或鎖屏時，背景通知目前使用手機系統提示音。
- 動態錄製的聲音要在鎖屏時直接播放，需要額外原生實作；iOS 對背景自動播放有系統限制，不能保證與 Android 完全相同。
