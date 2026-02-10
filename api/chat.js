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

        // 1. 定義「系統人格」 (這會讓它更像人類，而不是機器人)
        const systemInstruction = {
            role: "system",
            parts: [{
                text: `你是一位親切且專業的環境保護專家，你的名字叫「SmartRecycle AI」。
            你的任務是協助用戶辨識回收物並提供精確的處置建議。
            
            運作準則：
            1. 如果用戶上傳照片，請優先根據照片內容描述你看到了什麼，再結合分類建議進行回答。
            2. 回答要自然、有溫暖，不要像機器人。可以使用 emoji。
            3. 如果用戶問關於你的版本或開發者（Penter405），請誠實回答你是基於 Gemini 模型的 AI，由 Penter405 開發。
            4. 對於回收建議，要具體（例如：這個要洗乾淨、那個要撕掉膠帶）。
            5. 如果用戶問的問題跟回收無關，也要以友善的態度進行閒聊，但適時帶回環保主題。
            6. 請隨時「記住」用戶上一次傳送的照片內容。當歷史訊息中出現 [系統資訊: 用戶在此訊息中上傳了照片] 時，代表該次對話有圖片。若用戶後續的提問（如「那這個呢？」、「要洗嗎？」）缺乏主詞，請務必基於當時你對該張照片的分析結果繼續回答，不要說「我無法回答」或「請上傳照片」。`
            }]
        };

        // 2. 整理對話歷史 (確保順序：舊 -> 新)
        let contents = [];
        if (conversationHistory && conversationHistory.length > 0) {
            contents = conversationHistory.slice(-10).map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));
        }

        // 3. 準備當前用戶的輸入 (文字 + 圖片 + 辨識到的分類)
        let currentMessageText = message;
        if (category) {
            currentMessageText = `[系統資訊: 影像辨識初步結果為 ${category.name}] \n用戶訊息: ${message}`;
        }

        const currentUserPart = {
            role: "user",
            parts: [{ text: currentMessageText }]
        };

        if (image) {
            // 解析 MIME Type (例如 data:image/png;base64,...)
            const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

            const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

            // 圖片必須放在文字之前
            currentUserPart.parts.unshift({
                inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                }
            });
        }

        contents.push(currentUserPart);

        // 4. 呼叫 Gemini 2.0 Flash API (加上 system_instruction)
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    system_instruction: systemInstruction, // <--- 關鍵：放入系統指令
                    contents,
                    generationConfig: {
                        temperature: 0.8, // 提高一點隨機性，讓說話比較自然
                        maxOutputTokens: 1000,
                    }
                })
            }
        );

        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.json().catch(() => ({}));
            console.error('[API] Gemini API error:', geminiResponse.status, errorData);

            // 處理 Rate Limit
            if (geminiResponse.status === 429) {
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: '今日額度已用完'
                });
            }

            // 處理 404 (Model Not Found)
            if (geminiResponse.status === 404) {
                return res.status(404).json({
                    error: 'Model not found',
                    message: 'AI 模型暫時無法使用，請通知管理員檢查模型名稱設定。'
                });
            }

            return res.status(500).json({ error: 'AI service error' });
        }

        const data = await geminiResponse.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '抱歉，我無法回答這個問題。';

        // 回傳結果
        res.status(200).json({ reply });

    } catch (error) {
        console.error('[API] Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
