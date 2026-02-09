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

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // 取得 API Key
        const apiKey = process.env.Gemini_API_Key;
        if (!apiKey) {
            console.error('[API] Gemini API Key not found');
            return res.status(500).json({ error: 'API configuration error' });
        }

        // 建構提示詞
        let systemPrompt = `你是一個專業的回收小助手。請用繁體中文回答用戶關於回收的問題。回答要簡潔、友善、實用。`;

        if (category) {
            systemPrompt += `\n\n目前辨識到的物品是：${category.name}（${category.description}）`;
        }

        // 建構 Gemini API 請求內容
        const contents = [];

        // 如果有圖片，將圖片加入第一個訊息
        if (image) {
            // 移除 base64 前綴
            const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

            contents.push({
                role: 'user',
                parts: [
                    {
                        inline_data: {
                            mime_type: 'image/jpeg',
                            data: base64Data
                        }
                    },
                    {
                        text: systemPrompt + '\n\n用戶問題：' + message
                    }
                ]
            });
        } else {
            // 只有文字
            contents.push({
                role: 'user',
                parts: [{ text: systemPrompt + '\n\n用戶問題：' + message }]
            });
        }

        // 添加對話歷史（最多保留最近 5 輪對話）
        if (conversationHistory && conversationHistory.length > 0) {
            const recentHistory = conversationHistory.slice(-10); // 最多 10 則（5 輪）
            for (const msg of recentHistory) {
                contents.push({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                });
            }
        }

        // 呼叫 Gemini 2.5 Flash API
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 500,
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
