# 專案結構重構與 Vercel 標準設定

鑑於目前的設定導致了混淆和錯誤，我已經將專案結構標準化。現在符合 Vercel 的官方建議結構。

## 1. 檔案結構變更

已執行以下移動操作：
- `docs/api/` -> `api/` (根目錄)
- `docs/vercel.json` -> `vercel.json` (根目錄)

現在結構如下：
```
/ (Project Root)
├── api/
│   └── chat.js   <-- Serverless Function
├── docs/
│   ├── index.html <-- 前端入口
│   └── ...
├── vercel.json   <-- 配置檔
└── ...
```

## 2. Vercel 設定修改 (重要！)

請至 Vercel Dashboard > Settings > General 修改以下設定：

1. **Root Directory**: 清空 (預設值 `.`)
   - 讓 Vercel 從根目錄開始構建，這樣它能同時找到 `api/` 和 `docs/`。

2. **Output Directory**: 設定為 `docs`
   - 告訴 Vercel 你的靜態檔案 (HTML/CSS/JS) 在這裡。

## 3. Deployment Protection (解決 401 錯誤)

請至 Vercel Dashboard > Settings > Deployment Protection：
- 確保 **Vercel Authentication** 是 **Disabled**。
- 如果這是一個公開的 API，不應該開啟任何密碼保護。

## 4. 部署步驟

```bash
git add api/ vercel.json docs/
git commit -m "Refactor: Move API to root for standard Vercel structure"
git push
```

這樣做之後：
- API 網址將維持為 `/api/chat`
- 前端網頁將位於根路徑 (因為 Output Directory = `docs`)
- CORS 和 OPTIONS 問題應該能被根目錄的 `vercel.json` 正確處理

這是最穩健的配置方式。
