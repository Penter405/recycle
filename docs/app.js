/**
 * SmartRecycle AI - 主要應用邏輯
 * 相機控制、模型載入、辨識邏輯
 */

// ===== 全域狀態 =====
const AppState = {
    isModelLoaded: false,
    isCameraActive: false,
    isFrozen: false,
    isProcessing: false,
    voiceEnabled: false,
    currentResult: null,
    model: null,
    videoStream: null
};

// ===== DOM 元素參照 =====
let Elements = {};

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
    initElements();
    initEventListeners();
    loadUserSettings();
    // 自動初始化相機
    initCamera();
});

/**
 * 初始化 DOM 元素參照
 */
function initElements() {
    Elements = {
        // 相機相關
        video: document.getElementById('camera-video'),
        canvas: document.getElementById('camera-canvas'),
        cameraContainer: document.getElementById('camera-container'),

        // 按鈕
        checkBtn: document.getElementById('check-btn'),
        retakeBtn: document.getElementById('retake-btn'),

        // 結果顯示
        resultCard: document.getElementById('result-card'),
        resultIcon: document.getElementById('result-icon'),
        resultName: document.getElementById('result-name'),
        resultConfidence: document.getElementById('result-confidence'),
        resultBar: document.getElementById('result-bar'),
        resultDescription: document.getElementById('result-description'),
        aiExplanation: document.getElementById('ai-explanation'),

        // 狀態提示
        statusBadge: document.getElementById('status-badge'),
        loadingOverlay: document.getElementById('loading-overlay'),

        // 選單
        menuToggle: document.getElementById('menu-toggle'),
        menuDropdown: document.getElementById('menu-dropdown'),
        voiceToggle: document.getElementById('voice-toggle'),
        uploadInput: document.getElementById('upload-input'),
        uploadBtn: document.getElementById('upload-btn')
    };
}

/**
 * 初始化事件監聽器
 */
function initEventListeners() {
    // 檢查按鈕
    Elements.checkBtn?.addEventListener('click', captureAndPredict);

    // 重新拍攝按鈕
    Elements.retakeBtn?.addEventListener('click', resetCamera);

    // 選單切換
    Elements.menuToggle?.addEventListener('click', toggleMenu);

    // 語音開關
    Elements.voiceToggle?.addEventListener('change', toggleVoice);

    // 上傳圖片
    Elements.uploadBtn?.addEventListener('click', () => Elements.uploadInput?.click());
    Elements.uploadInput?.addEventListener('change', handleImageUpload);

    // 點擊外部關閉選單
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.menu-container')) {
            Elements.menuDropdown?.classList.remove('show');
        }
    });
}

/**
 * 載入使用者設定
 */
function loadUserSettings() {
    const savedVoice = localStorage.getItem('voiceEnabled');
    AppState.voiceEnabled = savedVoice === 'true';

    if (Elements.voiceToggle) {
        Elements.voiceToggle.checked = AppState.voiceEnabled;
    }
}

/**
 * 初始化相機
 */
async function initCamera() {
    updateStatus('正在啟動相機...', 'loading');

    try {
        // 請求後鏡頭權限
        const constraints = {
            video: {
                facingMode: 'environment', // 預設使用後鏡頭
                width: { ideal: 640 },
                height: { ideal: 640 }
            },
            audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        AppState.videoStream = stream;

        if (Elements.video) {
            Elements.video.srcObject = stream;
            Elements.video.play();
            AppState.isCameraActive = true;

            // 等待影片準備好
            Elements.video.onloadedmetadata = () => {
                updateStatus('🚀 相機就緒', 'ready');
                loadModel();
            };
        }
    } catch (error) {
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

/**
 * 載入模型
 */
async function loadModel() {
    updateStatus('正在載入模型...', 'loading');
    console.log('[DEBUG] 開始載入模型...');
    console.log('[DEBUG] CONFIG.MODEL.URL:', CONFIG.MODEL.URL);
    console.log('[DEBUG] CONFIG.MODEL.IS_TEACHABLE_MACHINE:', CONFIG.MODEL.IS_TEACHABLE_MACHINE);

    try {
        // 檢查是否使用 Teachable Machine 模型
        if (CONFIG.MODEL.IS_TEACHABLE_MACHINE) {
            console.log('[DEBUG] 嘗試載入 Teachable Machine 模型...');
            const modelURL = CONFIG.MODEL.URL + 'model.json';
            const metadataURL = CONFIG.MODEL.URL + 'metadata.json';

            // 使用 Teachable Machine 庫載入模型
            AppState.model = await tmImage.load(modelURL, metadataURL);
            AppState.maxPredictions = AppState.model.getTotalClasses();

            console.log('[DEBUG] ✅ Teachable Machine 模型載入成功');
            console.log('[DEBUG] 類別數量:', AppState.maxPredictions);
        } else if (CONFIG.MODEL.IS_CUSTOM_MODEL) {
            console.log('[DEBUG] 嘗試載入自訓練模型...');
            // 使用標準 TensorFlow.js 載入 Colab 訓練的模型
            AppState.model = await tf.loadLayersModel(CONFIG.MODEL.URL);
            console.log('[DEBUG] ✅ Colab 訓練模型載入成功');
            console.log('[DEBUG] 模型輸入形狀:', AppState.model.inputs[0].shape);
            console.log('[DEBUG] 模型輸出形狀:', AppState.model.outputs[0].shape);
        } else {
            console.log('[DEBUG] 嘗試載入 MobileNetV2...');
            // 使用預訓練的 MobileNetV2 (用於展示)
            AppState.model = await mobilenet.load({
                version: 2,
                alpha: 1.0
            });
            console.log('[DEBUG] ✅ MobileNetV2 預訓練模型載入成功');
        }

        AppState.isModelLoaded = true;
        updateStatus('🚀 系統就緒', 'ready');

    } catch (error) {
        console.error('[DEBUG] ❌ 模型載入失敗!');
        console.error('[DEBUG] 錯誤類型:', error.name);
        console.error('[DEBUG] 錯誤訊息:', error.message);
        console.error('[DEBUG] 完整錯誤堆疊:', error.stack);
        updateStatus('⚠️ 模型載入失敗: ' + error.message, 'error');
    }
}

/**
 * 擷取畫面並執行辨識
 */
async function captureAndPredict() {
    if (!AppState.isModelLoaded || !AppState.isCameraActive) {
        updateStatus('⚠️ 系統尚未就緒', 'error');
        return;
    }

    if (AppState.isProcessing) return;

    AppState.isProcessing = true;
    showLoading(true);

    try {
        // 1. 擷取當前畫面到 Canvas
        const ctx = Elements.canvas.getContext('2d');
        Elements.canvas.width = Elements.video.videoWidth;
        Elements.canvas.height = Elements.video.videoHeight;
        ctx.drawImage(Elements.video, 0, 0);

        // 2. 凍結相機預覽
        freezeCamera();

        // 3. 執行辨識
        const result = await predict(Elements.canvas);

        // 4. 顯示結果
        displayResult(result);

        // 5. 語音播報
        if (AppState.voiceEnabled && result.confidence >= CONFIG.RECOGNITION.CONFIDENCE_THRESHOLD) {
            speak(result.category.name);
        }

    } catch (error) {
        console.error('辨識失敗:', error);
        updateStatus('⚠️ 辨識發生錯誤', 'error');
    } finally {
        AppState.isProcessing = false;
        showLoading(false);
    }
}

/**
 * 執行模型預測
 */
async function predict(imageElement) {
    if (CONFIG.MODEL.IS_CUSTOM_MODEL) {
        // 使用自訓練模型
        return await predictWithCustomModel(imageElement);
    } else {
        // 使用 MobileNetV2 + 類別映射 (展示用)
        return await predictWithMobileNet(imageElement);
    }
}

/**
 * 使用自訓練模型預測 (支持 Teachable Machine 和 Colab 訓練的模型)
 */
async function predictWithCustomModel(imageElement) {
    // 檢查是否使用 Teachable Machine 模型
    if (CONFIG.MODEL.IS_TEACHABLE_MACHINE) {
        // 使用 Teachable Machine 預測
        const predictions = await AppState.model.predict(imageElement);

        // 找出最高信心度的類別
        let maxIndex = 0;
        let maxConfidence = predictions[0].probability;

        for (let i = 1; i < predictions.length; i++) {
            if (predictions[i].probability > maxConfidence) {
                maxConfidence = predictions[i].probability;
                maxIndex = i;
            }
        }

        // 根據 className 找到對應的 CONFIG.CATEGORIES
        const predictedClassName = predictions[maxIndex].className;
        const category = CONFIG.CATEGORIES.find(cat => cat.id === predictedClassName) || CONFIG.CATEGORIES[maxIndex];

        return {
            category: category,
            confidence: maxConfidence,
            allPredictions: predictions.map(p => p.probability)
        };
    }

    // 原有的 Colab 訓練模型預測邏輯
    // 預處理圖片 - 手動做 rescaling (因為 Keras 的 Rescaling 層可能不被 TF.js 支援)
    const tensor = tf.browser.fromPixels(imageElement)
        .resizeNearestNeighbor([CONFIG.MODEL.INPUT_SIZE, CONFIG.MODEL.INPUT_SIZE])
        .toFloat()
        .div(tf.scalar(255))
        .expandDims();

    // 執行預測
    const predictions = await AppState.model.predict(tensor).data();
    tensor.dispose();

    // 找出最高信心度的類別
    let maxIndex = 0;
    let maxConfidence = predictions[0];

    for (let i = 1; i < predictions.length; i++) {
        if (predictions[i] > maxConfidence) {
            maxConfidence = predictions[i];
            maxIndex = i;
        }
    }

    return {
        category: CONFIG.CATEGORIES[maxIndex],
        confidence: maxConfidence,
        allPredictions: Array.from(predictions)
    };
}

/**
 * 使用 MobileNetV2 預測 (展示用，需要類別映射)
 */
async function predictWithMobileNet(imageElement) {
    const predictions = await AppState.model.classify(imageElement, 5);

    // 簡單的類別映射 (展示用)
    const classMapping = {
        // 塑膠類
        'water_bottle': 'plastic',
        'pop_bottle': 'plastic',
        'plastic_bag': 'plastic',
        // 鐵鋁罐
        'can_opener': 'metal_can',
        'beer_bottle': 'metal_can',
        // 紙類
        'envelope': 'paper',
        'notebook': 'paper',
        // 紙餐盒
        'carton': 'paper_container',
        // 鋁箔包
        'packet': 'tetra_pak'
    };

    // 嘗試映射到我們的類別
    let bestMatch = null;
    let bestConfidence = 0;

    for (const pred of predictions) {
        const className = pred.className.toLowerCase().replace(/ /g, '_');
        const mappedCategory = classMapping[className];

        if (mappedCategory && pred.probability > bestConfidence) {
            bestMatch = CONFIG.CATEGORIES.find(c => c.id === mappedCategory);
            bestConfidence = pred.probability;
        }
    }

    // 如果沒有找到匹配，返回「垃圾」類別
    if (!bestMatch) {
        bestMatch = CONFIG.CATEGORIES[0]; // 垃圾
        bestConfidence = predictions[0]?.probability || 0;
    }

    return {
        category: bestMatch,
        confidence: bestConfidence,
        rawPredictions: predictions
    };
}

/**
 * 凍結相機預覽
 */
function freezeCamera() {
    AppState.isFrozen = true;

    // 隱藏 video，顯示 canvas
    Elements.video?.classList.add('hidden');
    Elements.canvas?.classList.remove('hidden');

    // 切換按鈕
    Elements.checkBtn?.classList.add('hidden');
    Elements.retakeBtn?.classList.remove('hidden');
}

/**
 * 重置相機（解除凍結）
 */
function resetCamera() {
    AppState.isFrozen = false;
    AppState.currentResult = null;

    // 顯示 video，隱藏 canvas
    Elements.video?.classList.remove('hidden');
    Elements.canvas?.classList.add('hidden');

    // 切換按鈕
    Elements.checkBtn?.classList.remove('hidden');
    Elements.retakeBtn?.classList.add('hidden');

    // 隱藏結果卡片
    Elements.resultCard?.classList.remove('show');

    updateStatus('🚀 系統就緒', 'ready');
}

/**
 * 顯示辨識結果
 */
function displayResult(result) {
    AppState.currentResult = result;

    const { category, confidence } = result;
    const confidencePercent = Math.round(confidence * 100);
    const isHighConfidence = confidence >= CONFIG.RECOGNITION.CONFIDENCE_THRESHOLD;

    // 更新結果卡片
    if (Elements.resultIcon) Elements.resultIcon.textContent = category.icon;
    if (Elements.resultName) Elements.resultName.textContent = category.name;
    if (Elements.resultConfidence) Elements.resultConfidence.textContent = `${confidencePercent}%`;
    if (Elements.resultBar) {
        Elements.resultBar.style.width = `${confidencePercent}%`;
        Elements.resultBar.style.backgroundColor = category.color;
    }

    // 顯示描述或低信心度訊息
    if (Elements.resultDescription) {
        if (isHighConfidence) {
            Elements.resultDescription.textContent = category.description;
            Elements.resultDescription.classList.remove('low-confidence');
        } else {
            Elements.resultDescription.textContent = CONFIG.RECOGNITION.LOW_CONFIDENCE_MESSAGE;
            Elements.resultDescription.classList.add('low-confidence');
        }
    }

    // 設定結果卡片顏色
    Elements.resultCard?.style.setProperty('--result-color', category.color);

    // 顯示結果卡片
    Elements.resultCard?.classList.add('show');

    // 更新狀態
    if (isHighConfidence) {
        updateStatus(`✅ 辨識完成: ${category.name}`, 'success');
    } else {
        updateStatus('⚠️ 信心度不足', 'warning');
    }
}

/**
 * 處理圖片上傳
 */
function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const img = new Image();
        img.onload = async () => {
            // 繪製到 canvas
            const ctx = Elements.canvas.getContext('2d');
            Elements.canvas.width = img.width;
            Elements.canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // 凍結顯示
            freezeCamera();

            // 執行辨識
            showLoading(true);
            const result = await predict(Elements.canvas);
            displayResult(result);
            showLoading(false);

            // 語音播報
            if (AppState.voiceEnabled && result.confidence >= CONFIG.RECOGNITION.CONFIDENCE_THRESHOLD) {
                speak(result.category.name);
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // 清除 input 以允許重複上傳相同檔案
    event.target.value = '';
}

/**
 * 切換選單
 */
function toggleMenu() {
    Elements.menuDropdown?.classList.toggle('show');
}

/**
 * 切換語音播報
 */
function toggleVoice(event) {
    AppState.voiceEnabled = event.target.checked;
    localStorage.setItem('voiceEnabled', AppState.voiceEnabled);
}

/**
 * 語音播報
 */
function speak(text) {
    if (!('speechSynthesis' in window)) return;

    const msg = new SpeechSynthesisUtterance(`發現${text}`);
    msg.lang = CONFIG.DEFAULTS.VOICE_LANG;
    msg.rate = CONFIG.DEFAULTS.VOICE_RATE;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(msg);
}

/**
 * 更新狀態顯示
 */
function updateStatus(message, type = 'info') {
    if (!Elements.statusBadge) return;

    Elements.statusBadge.textContent = message;
    Elements.statusBadge.className = `status-badge status-${type}`;
}

/**
 * 顯示/隱藏載入遮罩
 */
function showLoading(show) {
    if (Elements.loadingOverlay) {
        Elements.loadingOverlay.classList.toggle('show', show);
    }
}

// ===== API 預留 (Phase 3) =====

/**
 * 獲取 AI 解說 (未來整合)
 */
async function getAIExplanation(category) {
    if (!CONFIG.API.ENABLED || !CONFIG.API.EXPLANATION_ENDPOINT) {
        return null;
    }

    try {
        const response = await fetch(CONFIG.API.EXPLANATION_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: category.id }),
            signal: AbortSignal.timeout(CONFIG.API.TIMEOUT)
        });

        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();
        return data.explanation;

    } catch (error) {
        console.error('AI 解說請求失敗:', error);
        return null;
    }
}

// ===== AI Chat Bottom Sheet =====

const AIChatState = {
    isExpanded: false,
    didMainSubmit: false,
    currentPhoto: null,
    conversationHistory: [],
    isProcessing: false
};

let AIChatElements = {};

// 初始化 AI Chat 元素和監聽器
document.addEventListener('DOMContentLoaded', () => {
    initAIChatElements();
    initAIChatListeners();
});

function initAIChatElements() {
    AIChatElements = {
        sheet: document.getElementById('ai-chat-sheet'),
        handle: document.getElementById('ai-chat-handle'),
        toggle: document.getElementById('ai-chat-toggle'),
        messages: document.getElementById('ai-chat-messages'),
        input: document.getElementById('ai-chat-input'),
        sendBtn: document.getElementById('ai-chat-send')
    };
}

function initAIChatListeners() {
    // 展開/收合按鈕
    AIChatElements.toggle?.addEventListener('click', toggleAIChat);

    // 滑動手勢
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    AIChatElements.handle?.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        isDragging = true;
    });

    AIChatElements.handle?.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;

        // 只允許向下滑動收合，向上滑動展開
        if (AIChatState.isExpanded && deltaY > 0) {
            // 展開狀態下向下滑動 → 收合
            e.preventDefault();
        } else if (!AIChatState.isExpanded && deltaY < 0) {
            // 收合狀態下向上滑動 → 展開
            e.preventDefault();
        }
    });

    AIChatElements.handle?.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;

        const deltaY = currentY - startY;
        const threshold = 50; // 滑動閾值

        if (Math.abs(deltaY) > threshold) {
            if (deltaY > 0 && AIChatState.isExpanded) {
                // 向下滑動超過閾值 → 收合
                closeAIChat();
            } else if (deltaY < 0 && !AIChatState.isExpanded) {
                // 向上滑動超過閾值 → 展開
                openAIChat();
            }
        }
    });

    // 發送按鈕
    AIChatElements.sendBtn?.addEventListener('click', sendMessage);

    // Enter 鍵發送
    AIChatElements.input?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 監聽主要辨識按鈕，標記 didMainSubmit
    Elements.checkBtn?.addEventListener('click', () => {
        // 當用戶點擊「檢查辨識」後，標記為新的回收物
        setTimeout(() => {
            if (AppState.currentResult) {
                AIChatState.didMainSubmit = true;
                // 保存當前畫面為 base64
                captureCurrentPhoto();
            }
        }, 100);
    });
}

function toggleAIChat() {
    if (AIChatState.isExpanded) {
        closeAIChat();
    } else {
        openAIChat();
    }
}

function openAIChat() {
    AIChatState.isExpanded = true;
    AIChatElements.sheet?.classList.add('expanded');
}

function closeAIChat() {
    AIChatState.isExpanded = false;
    AIChatElements.sheet?.classList.remove('expanded');
}

// 擷取當前圖片為 base64
function captureCurrentPhoto() {
    if (!Elements.canvas) return;

    try {
        // 將 canvas 轉為 base64
        AIChatState.currentPhoto = Elements.canvas.toDataURL('image/jpeg', 0.8);
        console.log('[AI Chat] 已保存當前圖片');
    } catch (error) {
        console.error('[AI Chat] 圖片擷取失敗:', error);
        AIChatState.currentPhoto = null;
    }
}

// 發送訊息
async function sendMessage() {
    const message = AIChatElements.input?.value.trim();
    if (!message || AIChatState.isProcessing) return;

    // 清空輸入框
    if (AIChatElements.input) AIChatElements.input.value = '';

    // 添加用戶訊息到聊天
    addMessageToChat('user', message);

    // 檢查是否需要傳送圖片
    const shouldSendPhoto = AIChatState.didMainSubmit;
    const photoToSend = shouldSendPhoto ? AIChatState.currentPhoto : null;

    // 重置 didMainSubmit
    if (shouldSendPhoto) {
        AIChatState.didMainSubmit = false;
    }

    // 顯示載入動畫
    const loadingId = addLoadingMessage();

    AIChatState.isProcessing = true;
    AIChatElements.sendBtn?.setAttribute('disabled', 'true');

    try {
        // 呼叫 API
        const response = await fetch(CONFIG.API.CHAT_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message,
                image: photoToSend,
                conversationHistory: AIChatState.conversationHistory,
                category: AppState.currentResult?.category
            })
        });

        // 移除載入動畫
        removeMessage(loadingId);

        if (!response.ok) {
            if (response.status === 429) {
                // Rate Limit 錯誤
                addMessageToChat('error', '今日 AI 額度已用完，請明天再試！😅');
            } else {
                throw new Error(`API Error: ${response.status}`);
            }
            return;
        }

        const data = await response.json();

        if (data.reply) {
            // 添加 AI 回覆
            addMessageToChat('ai', data.reply);

            // 更新對話歷史
            AIChatState.conversationHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: data.reply }
            );
        }

    } catch (error) {
        console.error('[AI Chat] 發送失敗:', error);
        removeMessage(loadingId);
        addMessageToChat('error', '發送失敗，請稍後再試。');
    } finally {
        AIChatState.isProcessing = false;
        AIChatElements.sendBtn?.removeAttribute('disabled');
    }
}

// 添加訊息到聊天視窗
function addMessageToChat(type, content) {
    if (!AIChatElements.messages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}-message`;

    if (type === 'error') {
        messageDiv.innerHTML = `
            <span class="message-avatar">⚠️</span>
            <div class="message-bubble">${content}</div>
        `;
    } else if (type === 'user') {
        messageDiv.innerHTML = `
            <span class="message-avatar">👤</span>
            <div class="message-bubble">${escapeHtml(content)}</div>
        `;
    } else if (type === 'ai') {
        messageDiv.innerHTML = `
            <span class="message-avatar">🤖</span>
            <div class="message-bubble">${escapeHtml(content)}</div>
        `;
    }

    AIChatElements.messages.appendChild(messageDiv);

    // 滾動到底部
    AIChatElements.messages.scrollTop = AIChatElements.messages.scrollHeight;
}

// 添加載入動畫
function addLoadingMessage() {
    if (!AIChatElements.messages) return null;

    const messageDiv = document.createElement('div');
    const id = 'loading-' + Date.now();
    messageDiv.id = id;
    messageDiv.className = 'chat-message ai-message';
    messageDiv.innerHTML = `
        <span class="message-avatar">🤖</span>
        <div class="message-bubble loading">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;

    AIChatElements.messages.appendChild(messageDiv);
    AIChatElements.messages.scrollTop = AIChatElements.messages.scrollHeight;

    return id;
}

// 移除訊息
function removeMessage(id) {
    const msg = document.getElementById(id);
    if (msg) msg.remove();
}

// HTML 轉義（防止 XSS）
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
