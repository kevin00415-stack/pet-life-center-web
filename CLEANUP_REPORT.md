# 專案容量清理紀錄

## 原始狀態

- 原始專案：247,406,273 bytes（約 247.4 MB）
- 原始檔案數：12,286

### 原始根目錄容量

| 排名 | 資料夾 | Bytes |
|---:|---|---:|
| 1 | `node_modules/` | 163,139,062 |
| 2 | `ios/` | 19,618,718 |
| 3 | `android/` | 18,939,556 |
| 4 | `dist/` | 18,526,377 |
| 5 | `public/` | 15,180,119 |
| 6 | `src/` | 4,632,665 |

### 原始最大 20 個檔案

| 排名 | Bytes | 檔案 |
|---:|---:|---|
| 1 | 20,510,208 | `node_modules/@rolldown/binding-win32-x64-msvc/rolldown-binding.win32-x64-msvc.node` |
| 2 | 14,860,800 | `node_modules/@oxlint/binding-win32-x64-msvc/oxlint.win32-x64-msvc.node` |
| 3 | 9,497,600 | `node_modules/lightningcss-win32-x64-msvc/lightningcss.win32-x64-msvc.node` |
| 4 | 9,144,216 | `node_modules/typescript/lib/typescript.js` |
| 5 | 8,317,662 | `node_modules/.vite/deps/@phosphor-icons_react.js.map` |
| 6 | 6,475,018 | `node_modules/.vite/deps/@phosphor-icons_react.js` |
| 7 | 6,239,091 | `node_modules/typescript/lib/_tsc.js` |
| 8 | 6,110,712 | `public/music/PLC-001-Crystal-Forest-Drift.mp3` |
| 9 | 6,110,712 | `ios/App/App/public/music/PLC-001-Crystal-Forest-Drift.mp3` |
| 10 | 6,110,712 | `dist/music/PLC-001-Crystal-Forest-Drift.mp3` |
| 11 | 6,110,712 | `android/app/src/main/assets/public/music/PLC-001-Crystal-Forest-Drift.mp3` |
| 12 | 5,054,876 | `node_modules/@phosphor-icons/react/dist/index.cjs.js` |
| 13 | 5,036,841 | `node_modules/@phosphor-icons/react/dist/index.umd.js` |
| 14 | 4,780,806 | `public/music/PLC-002-Forest-Drift.mp3` |
| 15 | 4,780,806 | `ios/App/App/public/music/PLC-002-Forest-Drift.mp3` |
| 16 | 4,780,806 | `dist/music/PLC-002-Forest-Drift.mp3` |
| 17 | 4,780,806 | `android/app/src/main/assets/public/music/PLC-002-Forest-Drift.mp3` |
| 18 | 4,001,792 | `ios/App/App/public/music/PLC-003-Ocean-Whisper.mp3` |
| 19 | 4,001,792 | `android/app/src/main/assets/public/music/PLC-003-Ocean-Whisper.mp3` |
| 20 | 4,001,792 | `dist/music/PLC-003-Ocean-Whisper.mp3` |

## 已移除或排除

- `node_modules/`：相依套件，可用 `npm ci` 重建
- `dist/`：Vite 產物，可用 `npm run build` 重建
- `edge-qa-profile/`：瀏覽器測試暫存資料
- `android/app/src/main/assets/public/`：Capacitor 產生的重複 Web 資產
- `ios/App/App/public/`：Capacitor 產生的重複 Web 資產
- 根目錄 QA／設計截圖：非執行必要素材；設計參考另存於交付資料夾
- 未使用素材：`app-icon-master.png`、`home-hero-v1.jpg`、`hero.png`、`vite.svg`、`react.svg`
- 3 個內建 MP3：移至 GitHub Release／外部媒體來源，App 改為點選後載入

## 圖片最佳化

- `src/assets/home-island-v1.png`：2,735,191 bytes → `home-island-v1.webp`：280,588 bytes
- `src/assets/brand-mark.png`：27,810 bytes → `brand-mark.webp`：15,036 bytes
- PWA 安裝圖示保留 PNG，以維持 manifest 與手機安裝相容性

## PWA 保留與更新

- 保留 192×192、512×512 App 圖示
- 新增 `manifest.webmanifest`
- 新增並註冊 Service Worker
- 快取版本：`maohai-life-center-v20260724-1`

## 清理後與驗證結果

- GitHub／交付包追蹤檔案：2,578,190 bytes（約 2.46 MiB），121 個檔案
- 正式建置輸出 `dist/`：1,168,505 bytes（約 1.11 MiB）
- 與原始專案相比，交付原始碼減少約 98.96%
- `npm run lint`：通過
- `npm test`：17/17 通過
- `npm run build`：通過（Vite 8.1.5）
- 正式建置中不含 MP3

> 兩張已被 WebP 取代的原始 PNG 目前仍留在本機完整工作目錄，但已由 `.gitignore` 排除，不會進入 GitHub、ZIP 或 Cloudflare 建置。這是為了遵守系統目前對刪除動作的安全限制。
