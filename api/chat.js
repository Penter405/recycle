export default async function handler(req, res) {
    // 設置 CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 處理 OPTIONS 預檢請求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 只允許 POST 請求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, image, conversationHistory, category } = req.body;
        const apiKey = process.env.OpenRouter_API_Key;

        // ========== 使用 OpenRouter API 呼叫 Gemma 3 27B IT (Free) ==========
        const messages = [];

        // 系統提示
        // 注意：Gemma 3 on OpenRouter 不支援 "system" role，所以我們把它放在第一個 user message
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

        // 準備當前用戶的輸入
        let currentMessageText = message;
        if (category) {
            currentMessageText = `[系統資訊: 影像辨識初步結果為 ${category.name}] \n用戶訊息: ${message}`;
        }

        // 組合第一個 User Message (包含 System Prompt)
        // 如果有歷史紀錄，我們需要把 System Prompt 放在最前面
        // 這裡的邏輯是：每次請求都把 System Prompt 放在第一個訊息的開頭，或者作為獨立的第一個 user message

        // 策略：重組 messages 陣列
        // 1. 第一則訊息固定是 User Role，包含 System Prompt
        messages.push({
            role: "user",
            content: systemPrompt
        });

        // 2. 插入歷史紀錄 (最多 10 則)
        if (conversationHistory && conversationHistory.length > 0) {
            conversationHistory.slice(-10).forEach(msg => {
                messages.push({
                    role: msg.role === 'assistant' ? 'assistant' : 'user',
                    content: msg.content
                });
            });
        }

        // 3. 插入當前 user message (包含圖片)
        const userContent = [
            { type: "text", text: currentMessageText }
        ];

        if (image) {
            userContent.push({
                type: "image_url",
                image_url: {
                    url: image // 已經是 data:image/jpeg;base64,...
                }
            });
        }

        messages.push({
            role: "user",
            content: userContent
        });

        // 呼叫 OpenRouter
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://penter405.github.io", // Required by OpenRouter for free models
                "X-Title": "SmartRecycle AI", // Optional
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "google/gemma-3-27b-it:free",
                "messages": messages,
                "top_p": 1,
                "temperature": 0.7,
                "repetition_penalty": 1
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData?.error?.message || errorData?.error || JSON.stringify(errorData);
            console.error('[API] OpenRouter Error:', response.status, errorMsg);

            // 把錯誤訊息直接當作 reply 回傳，方便在聊天視窗看到
            // 前端會根據 429 狀態碼做處理
            if (response.status === 429) {
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    reply: '⚠️ 模型忙碌中 (429 Rate Limit)，請稍候再試。'
                });
            }

            return res.status(200).json({
                reply: `⚠️ AI 錯誤 (${response.status}): ${errorMsg}`
            });
        }

        const data = await response.json();
        const reply = data.choices[0].message.content;

        res.status(200).json({ reply });

    } catch (error) {
        console.error('[API] Server Error:', error);
        res.status(200).json({
            reply: `⚠️ 伺服器錯誤: ${error.message}`
        });
    }
}
