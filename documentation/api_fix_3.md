# API 錯誤修復 (第三階段) - CORS 與 401

## 問題分析

錯誤訊息：
1. `red.txt`: `Access to fetch ... has been blocked by CORS policy`
2. `logs_result.json`: `OPTIONS ... responseStatusCode: 401`

**原因**:
- 瀏覽器因 CORS 政策阻擋請求（Header 缺失）
- Vercel 對 OPTIONS 請求返回 401（未授權），這導致預檢失敗。可能是因為 API 函數未正確處理 OPTIONS，或者 Vercel 專案有部署保護。

## 修復方案

### 1. 更新 Vercel 配置 ([docs/vercel.json](file:///C:/Users/ba/OneDrive/桌面/04/docs/vercel.json))

將 CORS 配置移至 `vercel.json`，讓 Vercel 在邊緣層處理 Headers，而不是依賴函數代碼：

```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Credentials", "value": "true" },
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
        { "key": "Access-Control-Allow-Headers", "value": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" }
      ]
    }
  ]
}
```

## 注意事項 (401 錯誤)

如果部署後仍然出現 401 錯誤，請檢查 Vercel 專案設定：
1. Settings > Deployment Protection
2. 確認是否開啟了 "Vercel Authentication" 或 "Password Protection"
3. 如果是公開 API，應該關閉這些保護

## 部署步驟

```bash
git add docs/vercel.json
git commit -m "Configure CORS headers in vercel.json"
git push
```
