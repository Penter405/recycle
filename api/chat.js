export default async function handler(req, res) {
    // 設置 CORS headers (針對 GitHub Pages)
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', 'https://penter405.github.io');
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
        messages.push({
            role: "user",
            content: `你是一位親切且專業的環境保護專家，你的名字叫「SmartRecycle AI」。
你的任務是協助用戶辨識回收物並提供精確的處置建議。

運作準則：
1. 如果用戶上傳照片，請優先根據照片內容描述你看到了什麼，再結合分類建議進行回答。
2. 回答要自然、有溫暖，不要像機器人。可以使用 emoji。
3. 如果用戶問關於你的版本或開發者（Penter405），請誠實回答你是基於 Gemma 3 模型的 AI，由 Penter405 開發。
4. 對於回收建議，要具體（例如：這個要洗乾淨、那個要撕掉膠帶）。
5. 如果用戶問的問題跟回收無關，也要以友善的態度進行閒聊，但適時帶回環保主題。
6. 請隨時「記住」用戶上一次傳送的照片內容。當歷史訊息中出現 [系統資訊: 用戶在此訊息中上傳了照片] 時，代表該次對話有圖片。若用戶後續的提問（如「那這個呢？」、「要洗嗎？」）缺乏主詞，請務必基於當時你對該張照片的分析結果繼續回答，不要說「我無法回答」或「請上傳照片」。`
        });

        // 加入歷史紀錄
        if (conversationHistory && conversationHistory.length > 0) {
            conversationHistory.slice(-10).forEach(msg => {
                messages.push({
                    role: msg.role === 'assistant' ? 'assistant' : 'user',
                    content: msg.content
                });
            });
        }

        // 準備當前用戶的輸入
        let currentMessageText = message;
        if (category) {
            currentMessageText = `[系統資訊: 影像辨識初步結果為 ${category.name}] \n用戶訊息: ${message}`;
        }

        // 組裝 user content（支援圖片的 OpenAI 格式）
        const userContent = [
            { type: "text", text: currentMessageText }
        ];

        if (image) {
            // image 是完整的 data URI: data:image/jpeg;base64,xxxxx
            userContent.push({
                type: "image_url",
                image_url: {
                    url: image
                }
            });
        }

        messages.push({
            role: "user",
            content: userContent
        });

        console.log('[API] 使用 OpenRouter → google/gemma-3-27b-it:free');

        // 呼叫 OpenRouter API（OpenAI 相容格式）
        const response = await fetch(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://penter405.github.io',  // OpenRouter 要求
                    'X-Title': 'recycle chat'                       // OR 網站上的 App 名稱
                },
                body: JSON.stringify({
                    model: 'google/gemma-3-27b-it:free',
                    messages: messages,
                    max_tokens: 1000,
                    temperature: 0.8
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData?.error?.message || errorData?.error || JSON.stringify(errorData);
            console.error('[API] OpenRouter Error:', response.status, errorMsg);

            // 把錯誤訊息直接當作 reply 回傳，方便在聊天視窗看到
            return res.status(200).json({
                reply: `⚠️ AI 錯誤 (${response.status}): ${errorMsg}`
            });
        }

        const data = await response.json();
        console.log('[API] 實際使用模型:', data.model);

        const reply = data.choices?.[0]?.message?.content || '抱歉，我無法回答這個問題。';

        res.status(200).json({ reply });

    } catch (error) {
        console.error('[API] Error:', error.message || error);
        // 同樣把錯誤當作 reply 回傳，方便除錯
        res.status(200).json({
            reply: `⚠️ 伺服器錯誤: ${error.message}`
        });
    }
}
