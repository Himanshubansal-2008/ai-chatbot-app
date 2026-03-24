/**
 * AI Persona - Configuration
 * Replace the placeholders with your actual API keys.
 */

const CONFIG = {
    // Text Generation
    TEXT_API_URL: "https://openrouter.ai/api/v1/chat/completions",
    TEXT_MODEL: "openai/gpt-oss-120b",
    // Replace with your OpenRouter API Key (sk-...)
    TEXT_API_KEY: "", 

    // Image Generation
    IMAGE_API_URL: "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0",
    // Replace with your Hugging Face Access Token (hf_...)
    IMAGE_API_KEY: ""
};
