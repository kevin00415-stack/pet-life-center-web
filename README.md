# 毛孩生活中心 App

毛孩生活中心是以手機優先設計的 React + TypeScript + Vite PWA，並保留 Capacitor 的 Android / iOS 專案。

## 本機執行

```bash
npm ci
npm run dev
```

## 正式建置

```bash
npm run build
```

- 建置指令：`npm run build`
- 輸出資料夾：`dist`
- Cloudflare Pages：Framework preset 選 `Vite`，Production branch 選 `main`

## 音樂檔

為避免大型 MP3 被打包進 App，舒壓音樂採用延遲載入的外部網址。預設來源為 GitHub Release `media-v1`，也可以在 Cloudflare Pages 環境變數設定：

```text
VITE_MEDIA_BASE_URL=https://your-media-host.example.com/music
```

網址下必須包含：

- `PLC-001-Crystal-Forest-Drift.mp3`
- `PLC-002-Forest-Drift.mp3`
- `PLC-003-Ocean-Whisper.mp3`

## PWA

`public/manifest.webmanifest`、`public/sw.js`、192/512 圖示皆會隨建置輸出。Service Worker 快取版本請在每次需要強制更新手機內容時調整 `CACHE_VERSION`。

## 原生 App

```bash
npm run native:sync
```

此指令會先建置網頁，再同步到 Android 與 iOS。產生的原生 Web 資產不納入 Git，避免重複打包。
