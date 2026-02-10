export default async function handler(req, res) {
    // 設置 CORS headers (針對 GitHub Pages)
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', 'https://penter405.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
        const apiKey = process.env.Gemini_API_Key;

        // 2. 準備 OpenAI 格式的 messages
        const messages = [];

        // 加入系統提示 (System Instruction)
        messages.push({
            role: "system",
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

        // 準備當前用戶的輸入 (文字 + 圖片 + 辨識到的分類)
        let currentMessageText = message;
        if (category) {
            currentMessageText = `[系統資訊: 影像辨識初步結果為 ${category.name}] \n用戶訊息: ${message}`;
        }

        const userContent = [
            { type: "text", text: currentMessageText }
        ];

        if (image) {
            // 解析 MIME Type (例如 data:image/png;base64,...)
            // 轉成 OpenAI 能懂的 image_url 格式 (支援 base64)
            // image 變數本身就是完整的 data URI (包含 data:image/jpeg;base64,...)
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

        // 3. 呼叫 Google 的 OpenAI 相容 Endpoint
        // 使用 gemma-3-27b 模型
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}` // 注意：這裡改用 Bearer Token
                },
                body: JSON.stringify({
                    model: "gemma-3-27b",
                    messages: messages,
                    max_tokens: 512,
                    temperature: 0.7
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[API] OpenAI-Compat API error:', response.status, errorData);

            if (response.status === 429) {
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: '今日額度已用完'
                });
            }
            return res.status(500).json({ error: 'AI service error' });
        }

        const data = await response.json();
        // OpenAI 格式的回傳解析
        let reply = data.choices?.[0]?.message?.content || '抱歉，我無法回答這個問題。';

        // 偵錯用：強制顯示模型資訊
        if (data.model) {
            reply += `\n\n(Debug: Served by ${data.model})`;
        } else {
            reply += `\n\n(Debug: Served by Unknown - Likely Gemini Gateway)`;
        }

        // 回傳結果
        res.status(200).json({ reply });

    } catch (error) {
        console.error('[API] Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
