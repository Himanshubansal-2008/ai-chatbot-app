/**
 * Secure Backend Proxy for Hugging Face (Image Generation)
 * This runs on Vercel's servers, NOT in the user's browser.
 */

export default async function (req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt } = req.body;
    
    // Read key from Environment Variables (Vercel Dashboard)
    const apiKey = process.env.IMAGE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'IMAGE_API_KEY not configured in Vercel Dashboard!' });
    }

    try {
        const response = await fetch("https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-2-1", {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({ inputs: prompt }),
        });

        if (!response.ok) throw new Error('Hugging Face API failed');

        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', 'image/png');
        return res.status(200).send(Buffer.from(buffer));
    } catch (error) {
        return res.status(500).json({ error: 'Image generation failed on server' });
    }
}
