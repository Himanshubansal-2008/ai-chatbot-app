# Persona AI - Chat & Create ✨

A premium, unified AI dashboard featuring advanced text generation and text-to-image capabilities. 

---


> *This project was built with AI.*

---

## 🚀 Features

- 💬 **Smart Chat**: Powered by OpenRouter (Mistral-7B / GPT models) with **Markdown support** and **Code Highlighting**.
- 🎨 **Image Generation**: High-quality text-to-image creation via Hugging Face.
- 🔐 **Secure Configuration**: Supports `.env`, `config.js` (ignored by Git), and browser-based `localStorage` for API keys.
- ✨ **Rich Aesthetics**: Modern dark-theme UI with glassmorphism, animated backgrounds, and smooth transitions.
- 💾 **Session History**: Automatically saves your conversations locally with **Individual Chat Deletion**.

## 🛠️ Setup

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/Himanshubansal-2008/ai-chatbot-app.git
    cd ai-chatbot-app
    ```

2.  **Environment Variables**:
    You can provide your keys in two ways:
    
    **Option: Using `config.js` (Easiest)**
    Edit `config.js` and add your keys:
    ```javascript
    TEXT_API_KEY: "sk-or-v1-...",
    IMAGE_API_KEY: "hf_..."
    ```
    *(Note: `config.js` is automatically ignored by Git so your keys stay private.)*

3.  **Run Locally**:
    Open `index.html` in your browser (e.g., using VS Code Live Server).

## 🚀 Vercel Deployment (Secure Backend)

This project is optimized for Vercel using a secure **Serverless Proxy**. To ensure it works in production without exposing your keys:

1.  In your **Vercel Dashboard**, go to **Settings > Environment Variables**.
2.  Add the following **Secrets**:
    *   `TEXT_API_KEY`: Your OpenRouter Key (`sk-or-v1-...`)
    *   `IMAGE_API_KEY`: Your Hugging Face Token (`hf_...`)
3.  **Save** and **Redeploy**.

## 🎛️ UI-Based Key Management

Don't want to edit files at all? You can also save your keys directly in your browser:
1.  Open the app and click the **"Persona AI" logo** in the sidebar.
2.  Enter your keys and click **Save Changes**. 
*(Note: This stores keys only in your browser's local memory.)*

---
*Built with ❤️ via AI by Himanshu Bansal.*