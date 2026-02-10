# API 錯誤修復 (第四階段) - 最終 CORS 修正

## 問題分析

錯誤訊息顯示：
1. `Access-Control-Allow-Origin` 缺失或不匹配
2. `OPTIONS` 請求返回 401 或無效

**根本原因**:
`Access-Control-Allow-Credentials: true` 不能與 `Access-Control-Allow-Origin: *` 同時使用。這是瀏覽器安全規範強制執行的。當這兩個頭同時存在時，瀏覽器會直接阻擋請求。

## 修復方案

### 1. 修正 Vercel Headers ([docs/vercel.json](file:///C:/Users/ba/OneDrive/桌面/04/docs/vercel.json))

- 使用標準路徑匹配 `/api/:path*`
- **移除** `Access-Control-Allow-Credentials`
- 保留 `Access-Control-Allow-Origin: *`

```json
{
    "headers": [
        {
            "source": "/api/:path*",
            "headers": [
                { "key": "Access-Control-Allow-Origin", "value": "*" },
                { "key": "Access-Control-Allow-Methods", "value": "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
                { "key": "Access-Control-Allow-Headers", "value": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" }
            ]
        }
    ]
}
```

### 2. 關於 chat.js 的確認

`chat.js` 中已經包含了處理 OPTIONS 請求的代碼：
```javascript
if (req.method === 'OPTIONS') {
    return res.status(200).end();
}
```
這與 `vercel.json` 的 headers 配合，確保預檢請求 (Preflight) 能成功返回 200 OK 和正確的 CORS headers。

## 部署步驟

```bash
git add docs/vercel.json
git commit -m "Fix CORS: Remove Allow-Credentials to allow wildcard Origin"
git push
```
