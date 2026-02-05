/**
 * SmartRecycle AI - 設定檔
 * 類別定義、模型設定、API 端點預留
 */

const CONFIG = {
    // ===== 模型設定 =====
    MODEL: {
        // 模型路徑 (TensorFlow.js 格式)
        URL: './model/model.json',
        // 輸入圖片尺寸
        INPUT_SIZE: 224,
        // 是否已載入自訓練模型
        IS_CUSTOM_MODEL: true
    },

    // ===== 辨識設定 =====
    RECOGNITION: {
        // 信心度閾值 (0-1)
        CONFIDENCE_THRESHOLD: 0.7,
        // 低於閾值時的提示訊息
        LOW_CONFIDENCE_MESSAGE: '無法辨識，請調整角度或光線後重試'
    },

    // ===== 類別定義 (6 個類別) =====
    // 順序必須與模型輸出一致：aseptic carton, garbage, metal_can, paper, paper_container, plastic
    CATEGORIES: [
        {
            id: 'aseptic carton',
            name: '鋁箔包',
            icon: '🧃',
            color: '#20c997',
            description: '利樂包、鋁箔包飲料盒，需壓扁回收'
        },
        {
            id: 'garbage',
            name: '垃圾',
            icon: '🗑️',
            color: '#6c757d',
            description: '一般垃圾，無法回收'
        },
        {
            id: 'metal_can',
            name: '鐵鋁罐',
            icon: '🥫',
            color: '#6f42c1',
            description: '鐵罐、鋁罐、金屬容器'
        },
        {
            id: 'paper',
            name: '紙類',
            icon: '📄',
            color: '#ffc107',
            description: '紙張、報紙、書籍等'
        },
        {
            id: 'paper_container',
            name: '紙餐盒',
            icon: '🥡',
            color: '#fd7e14',
            description: '紙製餐盒、紙杯等，需清洗後回收'
        },
        {
            id: 'plastic',
            name: '塑膠類',
            icon: '🧴',
            color: '#0d6efd',
            description: '塑膠瓶、塑膠容器等'
        }
    ],

    // ===== 使用者設定預設值 =====
    DEFAULTS: {
        // 語音播報預設關閉
        VOICE_ENABLED: false,
        // 語音速度
        VOICE_RATE: 1.2,
        // 語音語言
        VOICE_LANG: 'zh-TW'
    },

    // ===== API 端點預留 (Phase 3) =====
    API: {
        // 是否啟用 AI 解說
        ENABLED: false,
        // AI 解說 API 端點 (Vercel Serverless Function)
        EXPLANATION_ENDPOINT: null, // '/api/explain'
        // API 超時時間 (ms)
        TIMEOUT: 10000
    },

    // ===== 版本資訊 =====
    VERSION: '1.0.0',
    GITHUB_URL: 'https://github.com/your-username/your-repo'
};

// 匯出設定 (for ES modules)
// export default CONFIG;
