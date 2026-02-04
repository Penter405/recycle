# SmartRecycle AI - 開發文件

## 📋 目錄

- [環境需求](#環境需求)
- [專案結構](#專案結構)
- [模型訓練](#模型訓練)
- [前端開發](#前端開發)
- [部署指南](#部署指南)
- [API 預留](#api-預留)

---

## 環境需求

### Python 訓練環境

```bash
Python 3.10+
TensorFlow 2.15+
tensorflowjs
Pillow
requests
```

### 安裝依賴

```bash
pip install tensorflow tensorflowjs Pillow requests
```

---

## 專案結構

```
04/
├── docs/                      # Web 應用 (部署到 GitHub Pages)
│   ├── index.html             # 主頁面結構
│   ├── styles.css             # 全域樣式 (響應式、深色模式)
│   ├── app.js                 # 主要邏輯 (相機、辨識、UI)
│   ├── config.js              # 設定檔 (類別、閾值)
│   ├── capture.html           # 訓練資料收集工具
│   └── model/                 # TensorFlow.js 模型檔案
│       ├── model.json         # 模型架構
│       ├── group1-shard*.bin  # 權重檔案
│       └── labels.json        # 類別標籤
│
├── train/                     # 訓練資料 (gitignored)
│   ├── garbage/               # 278 張
│   ├── metal_can/             # 80 張
│   ├── paper/                 # 160 張
│   ├── paper_container/       # 27 張
│   └── plastic/               # 80 張
│
├── train_model.py             # MobileNetV2 Transfer Learning
├── collect_data.py            # TrashNet 資料集下載
├── convert_tfjs.py            # 模型轉換腳本
├── README.md                  # 專案說明
├── DEVELOP.md                 # 開發文件 (本檔案)
└── .gitignore
```

---

## 模型訓練

### 1. 收集訓練資料

```bash
# 下載 TrashNet 資料集
python collect_data.py
```

資料會自動整理到 `train/` 目錄下的對應類別資料夾。

### 2. 手動補充資料

對於 TrashNet 沒有的類別（如紙餐盒），可以使用：

1. 開啟 `docs/capture.html`
2. 用手機拍攝物品
3. 下載後放到對應資料夾

### 3. 訓練模型

```bash
python train_model.py
```

訓練參數：
- **基礎模型**: MobileNetV2 (ImageNet 預訓練)
- **輸入尺寸**: 224×224
- **Batch Size**: 16
- **Epochs**: 20 (Early Stopping)
- **資料增強**: 旋轉、平移、縮放、翻轉

### 4. 轉換為 TensorFlow.js

由於 Python 3.13 與 tensorflowjs 的相容性問題，建議使用 Google Colab：

```python
!pip install tensorflowjs
import tensorflowjs as tfjs
import tensorflow as tf

model = tf.keras.models.load_model('model.h5')
tfjs.converters.save_keras_model(model, 'tfjs_model')
```

### 5. 類別順序

**重要**: `config.js` 中的 `CATEGORIES` 順序必須與模型輸出一致：

```javascript
// 順序: garbage, metal_can, paper, paper_container, plastic
CATEGORIES: [
    { id: 'garbage', ... },
    { id: 'metal_can', ... },
    { id: 'paper', ... },
    { id: 'paper_container', ... },
    { id: 'plastic', ... }
]
```

---

## 前端開發

### 檔案說明

| 檔案 | 說明 |
|------|------|
| `index.html` | 頁面結構、載入 TensorFlow.js |
| `styles.css` | 響應式佈局、深色模式、動畫 |
| `app.js` | 相機控制、模型載入、辨識邏輯 |
| `config.js` | 類別定義、模型路徑、API 設定 |

### 核心流程

```
initCamera() → loadModel() → captureAndPredict() → displayResult()
```

### 設定選項

編輯 `config.js`：

```javascript
MODEL: {
    URL: './model/model.json',
    INPUT_SIZE: 224,
    IS_CUSTOM_MODEL: true  // 使用自訓練模型
},
RECOGNITION: {
    CONFIDENCE_THRESHOLD: 0.7  // 信心度閾值
}
```

---

## 部署指南

### GitHub Pages

1. 確保 `docs/` 資料夾包含所有前端檔案
2. 到 Repository Settings → Pages
3. Source 選擇 `main` branch, `/docs` folder
4. 儲存後等待部署完成

### 本地測試

```bash
cd docs
python -m http.server 8000
# 開啟 http://localhost:8000
```

---

## API 預留

### AI 解說功能 (Phase 3)

`config.js` 已預留 API 端點：

```javascript
API: {
    ENABLED: false,
    EXPLANATION_ENDPOINT: '/api/explain',
    TIMEOUT: 10000
}
```

### Vercel Serverless Function 範例

```javascript
// api/explain.js
export default async function handler(req, res) {
    const { category } = req.body;
    
    // 呼叫 Gemini/OpenAI API 取得解說
    const explanation = await getAIExplanation(category);
    
    res.json({ explanation });
}
```

---

## 常見問題

### Q: 模型載入失敗？

確認：
1. `model.json` 和 `.bin` 檔案都在 `docs/model/`
2. 使用 HTTP 伺服器（不能直接開啟 HTML 檔案）

### Q: 辨識不準確？

嘗試：
1. 確保物品在畫面中央
2. 保持穩定，避免模糊
3. 確保光線充足

### Q: 相機無法使用？

確認：
1. 使用 HTTPS 或 localhost
2. 已允許相機權限
3. 無其他應用佔用相機
