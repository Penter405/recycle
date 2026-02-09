# API 405 錯誤修復

## 問題分析

根據 `red.txt` 的錯誤日誌：

```
app.js:155 [DEBUG] ✅ Teachable Machine 模型載入成功
api/chat:1  Failed to load resource: the server responded with a status of 405 ()
app.js:766 [AI Chat] 發送失敗: Error: API Error: 405
```

**原因**: 
1. Vercel API 端點沒有正確配置 CORS headers
2. 沒有處理 OPTIONS 預檢請求

## 修復方案

### 1. 添加 CORS 支持 ([api/chat.js](file:///C:/Users/ba/OneDrive/桌面/04/docs/api/chat.js))

```javascript
// 設置 CORS headers
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

// 處理 OPTIONS 預檢請求
if (req.method === 'OPTIONS') {
    return res.status(200).end();
}
```

### 2. 創建 Vercel 配置 ([vercel.json](file:///C:/Users/ba/OneDrive/桌面/04/docs/vercel.json))

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ]
}
```

## 部署步驟

```bash
git add docs/api/chat.js docs/vercel.json
git commit -m "Fix API 405 error - add CORS support"
git push
```

Vercel 會自動重新部署。部署完成後再測試 AI Chat 功能。

## 測試

1. 開啟 Vercel 部署的網站
2. 點擊「檢查辨識」
3. 開啟 AI Chat
4. 發送訊息
5. 確認 API 正常回應（不再有 405 錯誤）
