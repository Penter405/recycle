# API 405 錯誤修復 (第二階段)

## 問題分析

錯誤訊息：
```
app.js:726 POST https://penter405.github.io/api/chat 405 (Method Not Allowed)
```

**原因**: 
前端 JavaScript 嘗試向 GitHub Pages (`penter405.github.io`) 發送 API 請求。
由於 GitHub Pages 是靜態託管，不支援 serverless functions，因此返回 405 錯誤。
API 請求應該發送到 Vercel 域名。

## 修復方案

### 1. 更新 Config ([docs/config.js](file:///C:/Users/ba/OneDrive/桌面/04/docs/config.js))

添加 `CHAT_ENDPOINT` 指向 Vercel 域名：

```javascript
API: {
    // Vercel Serverless Function 完整 URL
    CHAT_ENDPOINT: 'https://recycle-kmtr8gjuu-penter405s-projects.vercel.app/api/chat',
    ...
}
```

### 2. 更新 App 邏輯 ([docs/app.js](file:///C:/Users/ba/OneDrive/桌面/04/docs/app.js))

修改 `fetch` 呼叫以使用配置的 URL：

```javascript
// Before
const response = await fetch('/api/chat', ...);

// After
const response = await fetch(CONFIG.API.CHAT_ENDPOINT, ...);
```

## 部署步驟

```bash
git add docs/config.js docs/app.js
git commit -m "Fix API URL to point to Vercel"
git push
```

Vercel 部署完成後，GitHub Pages 上的前端將會正確呼叫 Vercel 的 API。
