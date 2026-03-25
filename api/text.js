/**
 * Secure Backend Proxy for OpenRouter (Text Generation)
 * This runs on Vercel's servers, NOT in the user's browser.
 */

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { messages, model } = req.body;
    
    // Read key from Environment Variables (Vercel Dashboard)
    const apiKey = process.env.TEXT_API_KEY;

    if (!apiKey || apiKey.trim() === "") {
        return res.status(500).json({ error: { message: 'TEXT_API_KEY is missing from Vercel Dashboard! Go to Settings > Environment Variables, add it, and REDEPLOY.' } });
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://ai-persona.vercel.app", 
            },
            method: "POST",
            body: JSON.stringify({
                model: model || "openai/gpt-oss-120b",
                messages: messages,
            }),
        });

        const data = await response.json();
        const status = response.ok ? 200 : response.status;
        return res.status(status).json(data);
    } catch (error) {
        return res.status(500).json({ error: { message: 'Failed to connect to OpenRouter server' } });
    }
}
