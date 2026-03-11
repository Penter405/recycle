// Allow CORS helper
const allowCors = fn => async (req, res) => {
    const origin = req.headers.origin;

    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    return await fn(req, res);
};

async function handler(req, res) {
    // 只允許 POST 請求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, image, conversationHistory, category } = req.body;

        // ========== System Prompt ==========
        const systemPrompt = `你是一位親切且專業的環境保護專家，你的名字叫「SmartRecycle AI」。
你的任務是協助用戶辨識回收物並提供精確的處置建議。

運作準則：
1. 如果用戶上傳照片，請優先根據照片內容描述你看到了什麼，再結合分類建議進行回答。
2. 回答要自然、有溫暖，不要像機器人。可以使用 emoji。
3. 如果用戶問關於你的版本或開發者（Penter405），請誠實回答你是基於 Gemma 3 模型的 AI，由 Penter405 開發。
4. 對於回收建議，要具體（例如：這個要洗乾淨、那個要撕掉膠帶）。
5. 如果用戶問的問題跟回收無關，也要以友善的態度進行閒聊，但適時帶回環保主題。
6. 請隨時「記住」用戶上一次傳送的照片內容。當歷史訊息中出現 [系統資訊: 用戶在此訊息中上傳了照片] 時，代表該次對話有圖片。若用戶後續的提問（如「那這個呢？」、「要洗嗎？」）缺乏主詞，請務必基於當時你對該張照片的分析結果繼續回答，不要說「我無法回答」或「請上傳照片」。
7. **你可以使用 Markdown 語法**來讓回答更清晰易讀（例如：使用條列點、粗體強調重點、或程式碼區塊）。
8. **如果照片模糊不清或無法辨識**，請禮貌地告知用戶照片不清楚，並請他們重新拍攝更清晰的照片，或嘗試從不同角度拍攝。請不要胡亂猜測。`;

        // ========== 準備用戶輸入 ==========
        let currentMessageText = message;
        if (category) {
            currentMessageText = `[系統資訊: 影像辨識初步結果為 ${category.name}] \n用戶訊息: ${message}`;
        }

        // ========== 定義所有可用的 Gemini API Keys (優先順序) ==========
        const providers = [
            { key: process.env.Gemini_API_Key, label: 'Gemini(default)' },
            { key: process.env.Gemini_API_Key_1, label: 'Gemini(1)' },
            { key: process.env.Gemini_API_Key_3, label: 'Gemini(3)' },
            { key: process.env.Gemini_API_Key_4, label: 'Gemini(4)' },
        ].filter(p => p.key); // 過濾掉沒有設定的 key

        let lastReply = null;

        for (let i = 0; i < providers.length; i++) {
            const provider = providers[i];
            console.log(`[API] Trying ${provider.label}...`);

            const result = await tryGemini(provider.key, systemPrompt, currentMessageText, image, conversationHistory);

            // 成功 → 直接回傳
            if (result.success) {
                return res.status(200).json({ reply: result.reply });
            }

            lastReply = result.reply;

            // 如果不是 429，直接回傳錯誤（不需要換 key）
            if (!result.is429) {
                return res.status(200).json({ reply: result.reply });
            }

            // 429 → 嘗試下一個 key
            if (i < providers.length - 1) {
                const next = providers[i + 1];
                console.log(`[DEBUG] Changing to ${next.label}... (waiting 2s)`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // 所有 key 都失敗
        return res.status(200).json({
            reply: lastReply || '⚠️ 所有 AI 服務皆不可用，請稍後再試。'
        });

    } catch (error) {
        console.error('[API] Server Error:', error);
        res.status(200).json({
            reply: `⚠️ 伺服器錯誤: ${error.message}`
        });
    }
}

// ========== Google Gemini 呼叫 ==========
async function tryGemini(apiKey, systemPrompt, userMessage, image, conversationHistory) {
    try {
        // 組裝 Gemini contents 格式
        const contents = [];

        // 歷史紀錄 (最多 10 則)
        if (conversationHistory && conversationHistory.length > 0) {
            conversationHistory.slice(-10).forEach(msg => {
                contents.push({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                });
            });
        }

        // 當前 user message
        const parts = [{ text: userMessage }];

        // 圖片處理：Gemini 使用 inlineData 格式
        if (image) {
            // image 格式是 "data:image/jpeg;base64,xxxxx"
            const match = image.match(/^data:(.+?);base64,(.+)$/);
            if (match) {
                parts.push({
                    inlineData: {
                        mimeType: match[1],
                        data: match[2]
                    }
                });
            }
        }
        contents.push({ role: "user", parts });

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey
                },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: systemPrompt }]
                    },
                    contents: contents,
                    generationConfig: {
                        temperature: 0.7,
                        topP: 1
                    }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData?.error?.message || JSON.stringify(errorData);
            console.error('[API] Gemini Error:', response.status, errorMsg);
            const is429 = response.status === 429;
            return { success: false, is429, reply: `⚠️ Gemini 錯誤 (${response.status}): ${errorMsg}` };
        }

        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!reply) {
            console.error('[API] Gemini: No reply in response', JSON.stringify(data));
            return { success: false, is429: false, reply: '⚠️ Gemini 回傳了空的回應。' };
        }

        return { success: true, reply };

    } catch (error) {
        console.error('[API] Gemini Exception:', error);
        return { success: false, is429: false, reply: `⚠️ Gemini 連線失敗: ${error.message}` };
    }
}

export default allowCors(handler);
