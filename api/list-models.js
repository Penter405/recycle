export default async function handler(req, res) {
    // 設置 CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const apiKey = process.env.Gemini_API_Key;
        if (!apiKey) {
            return res.status(500).json({ error: 'No Gemini API key configured' });
        }

        // Call the Gemini ListModels API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return res.status(response.status).json({
                error: `ListModels failed (${response.status})`,
                details: errorData
            });
        }

        const data = await response.json();

        // Extract useful info for each model
        const models = (data.models || []).map(m => ({
            name: m.name,
            displayName: m.displayName,
            description: m.description,
            version: m.version,
            inputTokenLimit: m.inputTokenLimit,
            outputTokenLimit: m.outputTokenLimit,
            supportedGenerationMethods: m.supportedGenerationMethods,
            temperature: m.temperature,
            maxTemperature: m.maxTemperature,
            topP: m.topP,
            topK: m.topK
        }));

        // Filter to only models that support generateContent
        const generateContentModels = models.filter(m =>
            m.supportedGenerationMethods?.includes('generateContent')
        );

        return res.status(200).json({
            total: models.length,
            generateContentSupported: generateContentModels.length,
            models: generateContentModels,
            allModels: models
        });

    } catch (error) {
        console.error('[API] ListModels Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
