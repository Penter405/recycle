# 我們依照流程圖做了什麼

## 📊 流程圖 (Flowchart)

```
┌─────────────────┐
│  開始程式 Start  │
└────────┬────────┘
         ▼
┌─────────────────────────────┐
│ 使用手機鏡頭取得圖片          │
│ Use phone camera to capture │
└────────┬────────────────────┘
         ▼
┌─────────────────────────────┐
│ 圖片 Image                   │
└────────┬────────────────────┘
         ▼
┌──────────────────────────────────────┐
│ 使用 Teachable Machine 演算法分析圖片  │
│ Analyze image with TM algorithm      │
└────────┬─────────────────────────────┘
         ▼
┌─────────────────────────────┐
│ 結果 Result                  │
└────────┬────────────────────┘
         ▼
┌────────────────────────────────────────┐
│ 利用手機螢幕與喇叭告知分析結果           │
│ Notify result via screen & speaker    │
└────────┬──────────────────────────────┘
         ▼
    ┌──────────┐
    │ 程式是否  │
    │ 被關閉？  │
    └──┬───┬───┘
  否   │   │ 是
  No   │   │ Yes
       ▼   ▼
  ┌──────┐ ┌──────────┐
  │ 繼續 │ │ 結束程式  │
  │ 辨識 │ │  End     │
  └──┬───┘ └──────────┘
     │
     └──→ (回到「使用手機鏡頭取得圖片」)
```

---

## 步驟一：開始程式 (Start Program)

### 說明
當使用者打開網頁 (`index.html`) 時，程式會自動初始化。`DOMContentLoaded` 事件觸發後，系統依序執行初始化函式。

### 對應程式碼
📁 **檔案**: `docs/app.js` — **第 22~28 行**

```javascript
// ===== 初始化 =====
// 當網頁 DOM 載入完成時，自動執行初始化流程
document.addEventListener('DOMContentLoaded', () => {
    initElements();       // 初始化 DOM 元素參照（取得頁面上的各個 HTML 元素）
    initEventListeners(); // 初始化事件監聽器（設定按鈕點擊等互動行為）
    loadUserSettings();   // 載入使用者設定（例如語音開關狀態）
    initCamera();         // 自動初始化相機（開始取得鏡頭畫面）
});
```

### 📸 截圖建議
> **請截圖**: 開啟 `https://penter405.github.io/recycle/` 的初始畫面（相機正在載入中的狀態）

---

## 步驟二：使用手機鏡頭取得圖片 (Use Phone Camera to Capture Image)

### 說明
系統透過 `navigator.mediaDevices.getUserMedia` API 請求手機的後鏡頭權限，取得即時影像串流並顯示在 `<video>` 元素上。當使用者點擊「檢查辨識」按鈕時，系統會將當前影像畫面擷取到 `<canvas>` 上。

### 對應程式碼

#### 2-1. 啟動相機
📁 **檔案**: `docs/app.js` — **第 109~148 行**

```javascript
// 初始化相機函式
async function initCamera() {
    updateStatus('正在啟動相機...', 'loading'); // 更新狀態提示為「載入中」

    try {
        // 定義相機限制條件
        const constraints = {
            video: {
                facingMode: 'environment', // 使用後鏡頭（手機背面的相機）
                width: { ideal: 640 },     // 理想寬度 640 像素
                height: { ideal: 640 }     // 理想高度 640 像素（正方形）
            },
            audio: false                   // 不需要麥克風
        };

        // 向瀏覽器請求相機權限，取得影像串流
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        AppState.videoStream = stream; // 將串流保存到全域狀態

        if (Elements.video) {
            Elements.video.srcObject = stream; // 將串流連接到 <video> 元素
            Elements.video.play();             // 開始播放即時影像
            AppState.isCameraActive = true;    // 標記相機已啟動

            // 當影片 metadata 載入完成後，載入 AI 模型
            Elements.video.onloadedmetadata = () => {
                updateStatus('🚀 相機就緒', 'ready');
                loadModel(); // 接著載入辨識模型
            };
        }
    } catch (error) {
        // 錯誤處理：權限被拒、找不到裝置等
        console.error('相機初始化失敗:', error);
        if (error.name === 'NotAllowedError') {
            updateStatus('⚠️ 請允許相機權限', 'error');
        } else if (error.name === 'NotFoundError') {
            updateStatus('⚠️ 找不到相機裝置', 'error');
        } else {
            updateStatus('⚠️ 相機啟動失敗', 'error');
        }
    }
}
```

#### 2-2. 擷取畫面
📁 **檔案**: `docs/app.js` — **第 222~261 行**

```javascript
// 擷取畫面並執行辨識
async function captureAndPredict() {
    // 檢查系統是否就緒
    if (!AppState.isModelLoaded || !AppState.isCameraActive) {
        updateStatus('⚠️ 系統尚未就緒', 'error');
        return;
    }

    if (AppState.isProcessing) return; // 防止重複點擊

    AppState.isProcessing = true;  // 標記正在處理中
    showLoading(true);             // 顯示載入動畫

    try {
        // 1. 擷取當前畫面到 Canvas（把影像「拍」下來）
        const ctx = Elements.canvas.getContext('2d');
        Elements.canvas.width = Elements.video.videoWidth;
        Elements.canvas.height = Elements.video.videoHeight;
        ctx.drawImage(Elements.video, 0, 0); // 將 video 畫面繪製到 canvas

        // 2. 凍結相機預覽（讓使用者看到拍下的畫面）
        freezeCamera();

        // 3. 執行辨識（送入 AI 模型分析）
        const result = await predict(Elements.canvas);

        // 4. 顯示結果
        displayResult(result);

        // 5. 語音播報（如果使用者有開啟語音功能）
        if (AppState.voiceEnabled && result.confidence >= CONFIG.RECOGNITION.CONFIDENCE_THRESHOLD) {
            speak(result.category.name); // 唸出分類名稱
        }
    } catch (error) {
        console.error('辨識失敗:', error);
        updateStatus('⚠️ 辨識發生錯誤', 'error');
    } finally {
        AppState.isProcessing = false; // 解除處理中狀態
        showLoading(false);            // 隱藏載入動畫
    }
}
```

### 📸 截圖建議
> **請截圖**: 手機相機已啟動，畫面顯示即時影像預覽的狀態（狀態列顯示「🚀 系統就緒」）

---

## 步驟三：圖片 (Image)

### 說明
當使用者點擊「檢查辨識」後，`<video>` 的當前影格被繪製到 `<canvas>` 上。這個 canvas 上的圖片就是接下來要送給 AI 模型辨識的「圖片」。系統也支援直接上傳圖片檔案作為替代。

### 對應程式碼
📁 **檔案**: `docs/app.js` — **第 234~238 行** (canvas 擷取)

```javascript
// 擷取影像到 Canvas
const ctx = Elements.canvas.getContext('2d');            // 取得 canvas 的 2D 繪圖環境
Elements.canvas.width = Elements.video.videoWidth;       // 設定 canvas 寬度 = 影像寬度
Elements.canvas.height = Elements.video.videoHeight;     // 設定 canvas 高度 = 影像高度
ctx.drawImage(Elements.video, 0, 0);                     // 將 video 當前畫面繪製到 canvas
```

📁 **檔案**: `docs/app.js` — **第 471~505 行** (圖片上傳替代路徑)

```javascript
// 處理圖片上傳
function handleImageUpload(event) {
    const file = event.target.files?.[0]; // 取得使用者選擇的檔案
    if (!file) return;

    const reader = new FileReader(); // 建立檔案讀取器
    reader.onload = async (e) => {
        const img = new Image();     // 建立 Image 物件
        img.onload = async () => {
            // 將上傳的圖片繪製到 canvas
            const ctx = Elements.canvas.getContext('2d');
            Elements.canvas.width = img.width;
            Elements.canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            freezeCamera();          // 凍結顯示

            // 執行辨識
            showLoading(true);
            const result = await predict(Elements.canvas);
            displayResult(result);   // 顯示結果
            showLoading(false);
        };
        img.src = e.target.result;   // 設定圖片來源為讀取的檔案
    };
    reader.readAsDataURL(file);       // 以 Data URL 格式讀取檔案
}
```

### 📸 截圖建議
> **請截圖**: 點擊「檢查辨識」後，畫面凍結的狀態（可以看到靜止的圖片而非即時影像）

---

## 步驟四：使用 Teachable Machine 演算法分析圖片 (Analyze Image with TM Algorithm)

### 說明
系統使用 Google Teachable Machine 匯出的模型來分析圖片。模型透過 `tmImage.load()` 載入，然後使用 `model.predict()` 對輸入圖片進行分類。模型會回傳每個類別的機率值（probability），系統取最高機率的類別作為辨識結果。

### 4-1. 載入模型
📁 **檔案**: `docs/app.js` — **第 153~217 行**

```javascript
// 載入模型
async function loadModel() {
    updateStatus('正在載入模型...', 'loading');

    try {
        // 檢查是否使用 Teachable Machine 模型
        if (CONFIG.MODEL.IS_TEACHABLE_MACHINE) {
            // 組合模型檔案的 URL
            const modelURL = CONFIG.MODEL.URL + 'model.json';       // 模型架構檔案
            const metadataURL = CONFIG.MODEL.URL + 'metadata.json'; // 類別標籤檔案

            // 使用 Teachable Machine 庫載入模型
            // tmImage 是 @teachablemachine/image 提供的全域物件
            AppState.model = await tmImage.load(modelURL, metadataURL);
            AppState.maxPredictions = AppState.model.getTotalClasses(); // 取得類別總數
        }

        AppState.isModelLoaded = true; // 標記模型已載入

        // 暖機：執行一次假預測，讓 TF.js 預先編譯 GPU shaders
        // 這樣第一次真正辨識時不會卡頓
        updateStatus('🔧 系統暖機中...', 'loading');
        // ...暖機程式碼省略...

        updateStatus('🚀 系統就緒', 'ready');
    } catch (error) {
        updateStatus('⚠️ 模型載入失敗: ' + error.message, 'error');
    }
}
```

### 4-2. 模型設定
📁 **檔案**: `docs/config.js` — **第 6~19 行**

```javascript
const CONFIG = {
    // ===== 模型設定 =====
    MODEL: {
        URL: './model/',             // 模型檔案的路徑（相對於 docs/ 資料夾）
        METADATA_URL: './model/metadata.json', // 類別標籤的 metadata 路徑
        INPUT_SIZE: 224,             // 輸入圖片尺寸（224x224 像素，MobileNet 標準）
        IS_TEACHABLE_MACHINE: true,  // 是否使用 Teachable Machine 格式的模型
        IS_CUSTOM_MODEL: true        // 是否為自訓練模型（非預訓練 MobileNetV2）
    },
    // ...
};
```

### 4-3. 執行預測
📁 **檔案**: `docs/app.js` — **第 279~305 行**

```javascript
// 使用 Teachable Machine 模型預測
async function predictWithCustomModel(imageElement) {
    if (CONFIG.MODEL.IS_TEACHABLE_MACHINE) {
        // 使用 Teachable Machine 預測（直接傳入 canvas 元素）
        const predictions = await AppState.model.predict(imageElement);

        // 找出最高信心度的類別
        let maxIndex = 0;
        let maxConfidence = predictions[0].probability; // 第一個類別的機率

        for (let i = 1; i < predictions.length; i++) {
            // 逐一比較每個類別的機率，找出最大值
            if (predictions[i].probability > maxConfidence) {
                maxConfidence = predictions[i].probability;
                maxIndex = i; // 記錄最高機率的索引
            }
        }

        // 根據 className（類別名稱）找到對應的 CONFIG 設定
        const predictedClassName = predictions[maxIndex].className;
        const category = CONFIG.CATEGORIES.find(cat => cat.id === predictedClassName)
                         || CONFIG.CATEGORIES[maxIndex];

        return {
            category: category,          // 辨識出的類別
            confidence: maxConfidence,   // 信心度（0~1）
            allPredictions: predictions.map(p => p.probability) // 所有類別的機率
        };
    }
}
```

### 4-4. 類別定義
📁 **檔案**: `docs/config.js` — **第 31~73 行**

```javascript
// 6 個回收類別定義
// 順序必須與模型輸出一致：aseptic carton, garbage, metal_can, paper, paper_container, plastic
CATEGORIES: [
    { id: 'aseptic carton', name: '鋁箔包', icon: '🧃', color: '#20c997',
      description: '利樂包、鋁箔包飲料盒，需壓扁回收' },
    { id: 'garbage',        name: '垃圾',   icon: '🗑️', color: '#6c757d',
      description: '一般垃圾，無法回收' },
    { id: 'metal_can',      name: '鐵鋁罐', icon: '🥫', color: '#6f42c1',
      description: '鐵罐、鋁罐、金屬容器' },
    { id: 'paper',          name: '紙類',   icon: '📄', color: '#ffc107',
      description: '紙張、報紙、書籍等' },
    { id: 'paper_container',name: '紙餐盒', icon: '🥡', color: '#fd7e14',
      description: '紙製餐盒、紙杯等，需清洗後回收' },
    { id: 'plastic',        name: '塑膠類', icon: '🧴', color: '#0d6efd',
      description: '塑膠瓶、塑膠容器等' }
]
```

### 📸 截圖建議
> **請截圖**: 瀏覽器開發者工具 Console，顯示模型載入成功的 log 訊息（`✅ Teachable Machine 模型載入成功`）

---

## 步驟五：結果 (Result)

### 說明
模型回傳預測結果後，系統根據 **信心度閾值**（預設 70%）判斷是否為有效辨識。結果包含：辨識出的類別（如「塑膠類」）、信心度百分比、類別圖示和說明。

### 對應程式碼
📁 **檔案**: `docs/config.js` — **第 22~27 行**

```javascript
// 辨識設定
RECOGNITION: {
    CONFIDENCE_THRESHOLD: 0.7,    // 信心度閾值：70%（低於此值視為辨識不確定）
    LOW_CONFIDENCE_MESSAGE: '無法辨識，請調整角度或光線後重試' // 低信心度提示文字
},
```

### 📸 截圖建議
> **請截圖**: 辨識完成後，結果卡片顯示辨識類別、圖示、信心度百分比的畫面

---

## 步驟六：利用手機螢幕與喇叭告知分析結果 (Notify via Screen & Speaker)

### 說明
辨識完成後，系統透過兩種方式告知使用者結果：
1. **螢幕顯示**：更新結果卡片的內容，包含類別圖示、名稱、信心度進度條
2. **語音播報**：如果使用者開啟語音功能，系統會使用 Web Speech API 唸出分類結果

### 6-1. 螢幕顯示結果
📁 **檔案**: `docs/app.js` — **第 427~466 行**

```javascript
// 顯示辨識結果
function displayResult(result) {
    AppState.currentResult = result; // 儲存當前結果到全域狀態

    const { category, confidence } = result;                     // 解構取得類別和信心度
    const confidencePercent = Math.round(confidence * 100);      // 轉為百分比（例如 0.85 → 85）
    const isHighConfidence = confidence >= CONFIG.RECOGNITION.CONFIDENCE_THRESHOLD; // 是否高於閾值

    // 更新結果卡片上的各個元素
    if (Elements.resultIcon) Elements.resultIcon.textContent = category.icon;           // 圖示 🧴
    if (Elements.resultName) Elements.resultName.textContent = category.name;           // 名稱 "塑膠類"
    if (Elements.resultConfidence) Elements.resultConfidence.textContent = `${confidencePercent}%`; // 85%
    if (Elements.resultBar) {
        Elements.resultBar.style.width = `${confidencePercent}%`;            // 進度條寬度
        Elements.resultBar.style.backgroundColor = category.color;           // 進度條顏色
    }

    // 信心度不足時顯示警告訊息
    if (Elements.resultDescription) {
        if (isHighConfidence) {
            Elements.resultDescription.textContent = category.description;   // 顯示分類說明
        } else {
            Elements.resultDescription.textContent = CONFIG.RECOGNITION.LOW_CONFIDENCE_MESSAGE;
        }
    }

    // 動畫顯示結果卡片
    Elements.resultCard?.classList.add('show');
}
```

### 6-2. 語音播報
📁 **檔案**: `docs/app.js` — **第 525~534 行**

```javascript
// 語音播報功能
function speak(text) {
    if (!('speechSynthesis' in window)) return; // 檢查瀏覽器是否支援語音合成

    // 建立語音合成訊息（會唸出「發現塑膠類」等）
    const msg = new SpeechSynthesisUtterance(`發現${text}`);
    msg.lang = CONFIG.DEFAULTS.VOICE_LANG;   // 設定語言為 'zh-TW'（台灣中文）
    msg.rate = CONFIG.DEFAULTS.VOICE_RATE;   // 設定語速為 1.2 倍速

    window.speechSynthesis.cancel();          // 取消正在播放的語音
    window.speechSynthesis.speak(msg);        // 開始播報
}
```

### 📸 截圖建議
> **請截圖 1**: 辨識成功的結果卡片（顯示類別圖示、名稱、信心度進度條、綠色勾勾狀態）
> **請截圖 2**: 設定選單中的語音開關（🔊 語音播報的 toggle）

---

## 步驟七：程式是否被關閉？ (Is the Program Closed?)

### 說明
這是一個迴圈判斷點。在 Web 應用中，程式碼本身不需要顯式的迴圈——只要使用者不關閉瀏覽器頁面，程式就持續運作。使用者可以隨時點擊「重新拍攝」按鈕來回到拍照狀態，繼續辨識下一個物品。

### 對應程式碼

#### 7-1. 否 → 繼續辨識（重新拍攝）
📁 **檔案**: `docs/app.js` — **第 406~422 行**

```javascript
// 重置相機（解除凍結，回到即時預覽）
function resetCamera() {
    AppState.isFrozen = false;          // 解除凍結狀態
    AppState.currentResult = null;      // 清除上一次辨識結果

    // 顯示 video（即時影像），隱藏 canvas（靜態截圖）
    Elements.video?.classList.remove('hidden');
    Elements.canvas?.classList.add('hidden');

    // 切換按鈕：顯示「檢查辨識」，隱藏「重新拍攝」
    Elements.checkBtn?.classList.remove('hidden');
    Elements.retakeBtn?.classList.add('hidden');

    // 隱藏上一次的結果卡片
    Elements.resultCard?.classList.remove('show');

    updateStatus('🚀 系統就緒', 'ready');  // 更新狀態為就緒
    // → 使用者可以再次點擊「檢查辨識」，回到步驟二
}
```

#### 7-2. 是 → 結束程式
使用者直接關閉瀏覽器分頁即可。Web 應用不需要額外的關閉邏輯。

### 📸 截圖建議
> **請截圖**: 「重新拍攝」按鈕的畫面（辨識完成後出現的按鈕）

---

## 總結

| 流程圖步驟 | 對應檔案 | 對應行數 | 核心函式 |
|------------|----------|----------|----------|
| 開始程式 | `app.js` | L22-28 | `DOMContentLoaded` 事件 |
| 使用手機鏡頭 | `app.js` | L109-148 | `initCamera()` |
| 擷取圖片 | `app.js` | L222-261 | `captureAndPredict()` |
| TM 演算法分析 | `app.js` | L153-217, L279-305 | `loadModel()`, `predictWithCustomModel()` |
| 結果判定 | `config.js` | L22-27 | `CONFIDENCE_THRESHOLD` |
| 螢幕顯示結果 | `app.js` | L427-466 | `displayResult()` |
| 語音播報 | `app.js` | L525-534 | `speak()` |
| 繼續辨識 | `app.js` | L406-422 | `resetCamera()` |
