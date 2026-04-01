# 🗑️ SmartRecycle AI

一個手機友善的垃圾分類 Web 應用，使用 MobileNetV2 Transfer Learning 即時辨識回收物品。

![Demo](docs/assets/demo.gif)

## ✨ 功能特色

- 📷 **即時相機辨識** - 使用裝置相機即時辨識垃圾類別
- 🤖 **AI 分類** - 基於 MobileNetV2 的深度學習模型
- 📱 **手機優先** - 響應式設計，支援深色模式
- 🔊 **語音播報** - 可選的語音回饋功能
- 🖼️ **圖片上傳** - 也支援上傳圖片進行辨識

## 📊 支援類別

| 類別 | 說明 |
|------|------|
| 🗑️ 垃圾 | 一般垃圾，無法回收 |
| 🥫 鐵鋁罐 | 鐵罐、鋁罐、金屬容器 |
| 📄 紙類 | 紙張、報紙、書籍等 |
| 🥡 紙餐盒 | 紙製餐盒、紙杯等 |
| 🧴 塑膠類 | 塑膠瓶、塑膠容器等 |

## 🚀 快速開始

### 線上使用

開啟 [GitHub Pages 連結](https://penter405.github.io/recycle/) 即可使用（需允許相機權限）

### 問卷調查

[問卷連結](https://penter405.github.io/recycle/questionnaire.html)

### 本地執行

```bash
# 1. Clone 專案
git clone https://github.com/your-username/smartrecycle-ai.git
cd smartrecycle-ai

# 2. 啟動本地伺服器
cd docs
python -m http.server 8000

# 3. 開啟瀏覽器
# 電腦: http://localhost:8000
# 手機: http://<電腦IP>:8000
```

## 🛠️ 技術架構

- **前端**: HTML5 + CSS3 + Vanilla JS
- **AI 模型**: TensorFlow.js + MobileNetV2 Transfer Learning
- **訓練框架**: TensorFlow/Keras (Python)

### 系統架構圖

```mermaid
flowchart TB
    subgraph User["👤 使用者"]
        Phone["📱 手機瀏覽器"]
    end

    subgraph Frontend["🌐 前端 (GitHub Pages)"]
        direction TB
        HTML["index.html<br/>頁面結構"]
        CSS["styles.css<br/>響應式樣式"]
        JS["app.js<br/>應用邏輯"]
        CFG["config.js<br/>設定檔"]
    end

    subgraph Camera["📷 相機模組"]
        GetMedia["getUserMedia API<br/>取得鏡頭權限"]
        Video["&lt;video&gt; 即時預覽"]
        Canvas["&lt;canvas&gt; 擷取畫面"]
    end

    subgraph AI["🤖 AI 辨識引擎"]
        TM["Teachable Machine<br/>tmImage 庫"]
        Model["model.json + weights.bin<br/>訓練好的模型"]
        Meta["metadata.json<br/>類別標籤"]
    end

    subgraph Output["📊 輸出結果"]
        Screen["🖥️ 螢幕顯示<br/>結果卡片 + 信心度"]
        Voice["🔊 語音播報<br/>Web Speech API"]
        Chat["💬 AI Chat<br/>Vercel API"]
    end

    Phone -->|開啟網頁| Frontend
    Frontend -->|初始化| Camera
    GetMedia -->|影像串流| Video
    Video -->|點擊辨識| Canvas
    Canvas -->|圖片資料| AI
    TM --> Model
    TM --> Meta
    AI -->|辨識結果| Output
    Screen -->|重新拍攝| Camera
```

### 資料流程圖

```mermaid
flowchart LR
    A["📷 相機擷取<br/>640x640"] --> B["🖼️ Canvas<br/>繪製影像"]
    B --> C["🔄 前處理<br/>224x224"]
    C --> D["🧠 TM 模型<br/>predict()"]
    D --> E["📊 6 類機率<br/>softmax"]
    E --> F{"信心度<br/>≥ 70%?"}
    F -->|是| G["✅ 顯示結果"]
    F -->|否| H["⚠️ 無法辨識"]
```

## 📁 專案結構

```
├── docs/                  # Web 應用 (GitHub Pages)
│   ├── index.html         # 主頁面
│   ├── styles.css         # 樣式
│   ├── app.js             # 應用邏輯
│   ├── config.js          # 設定檔
│   └── model/             # TensorFlow.js 模型
├── train/                 # 訓練資料
├── train_model.py         # 訓練腳本
└── collect_data.py        # 資料收集腳本
```

## 📖 開發文件

詳細的開發說明與技術細節請參考 [DEVELOP.md](https://github.com/Penter405/recycle/blob/main/DEVELOP.md)
<!--
## 📈 模型效能

- **準確率**: ~93%
- **模型大小**: ~10MB
- **推論速度**: <500ms (視裝置而定)
-->

## 🙏 致謝

## [colab](https://colab.research.google.com/drive/1J_5QDh8ikT-NIAgqIDr9wtHJvxWTJd0S?usp=sharing)
- [TrashNet](https://github.com/garythung/trashnet) - 訓練資料來源
- [TeachableMachine](https://teachablemachine.withgoogle.com/) - 模型訓練工具
<!--- [TensorFlow.js](https://www.tensorflow.org/js) - 瀏覽器端機器學習(not using ,beacuse too tried)
- [MobileNetV2](https://arxiv.org/abs/1801.04381) - 基礎模型架構(not using ,beacuse too tried)
-->