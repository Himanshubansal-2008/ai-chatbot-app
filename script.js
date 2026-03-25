/**
 * AI Persona - Main Application Logic
 * Implements Text Generation (OpenRouter) & Text-to-Image (Hugging Face)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Configure Marked with Highlight.js
    marked.setOptions({
        highlight: function (code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'hljs language-',
        breaks: true,
        gfm: true
    });

    // DOM Elements
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const clearChatBtn = document.getElementById('clear-chat');
    const newChatBtn = document.getElementById('new-chat-btn');
    const historyList = document.getElementById('history-list');
    const typingIndicator = document.getElementById('typing-indicator');
    
    // Safety check for CONFIG (for Vercel deployment)
    if (typeof CONFIG === 'undefined') {
        window.CONFIG = {
            TEXT_API_URL: "/api/text", // Fallback to secure API
            IMAGE_API_URL: "/api/image", // Fallback to secure API
            TEXT_MODEL: "openai/gpt-oss-120b",
            TEXT_API_KEY: "", 
            IMAGE_API_KEY: ""
        };
    }

    // Settings Modal (Logic added now)
    const settingsModal = document.getElementById('settings-modal');
    const textKeyInput = document.getElementById('text-key-input');
    const imageKeyInput = document.getElementById('image-key-input');
    const saveConfigBtn = document.getElementById('save-config');

    // Mode Toggles
    const modeTextBtn = document.getElementById('mode-text');
    const modeImageBtn = document.getElementById('mode-image');

    let currentMode = 'text'; // 'text' or 'image'
    let messageHistory = []; // Stores text conversation for context
    let chatId = Date.now(); // Current session ID

    // --- History Persistence Logic ---

    const saveToHistory = () => {
        if (messageHistory.length === 0) return;
        
        const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        const currentChat = {
            id: chatId,
            title: messageHistory[0].content.substring(0, 30) + (messageHistory[0].content.length > 30 ? '...' : ''),
            messages: messageHistory,
            html: chatMessages.innerHTML,
            timestamp: new Date().toISOString()
        };

        const existingIndex = history.findIndex(h => h.id === chatId);
        if (existingIndex > -1) {
            history[existingIndex] = currentChat;
        } else {
            history.unshift(currentChat);
        }
        
        localStorage.setItem('chatHistory', JSON.stringify(history.slice(0, 50)));
        renderHistory();
    };

    const renderHistory = () => {
        const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        historyList.innerHTML = '';
        
        history.forEach(chat => {
            const item = document.createElement('div');
            item.className = `history-item ${chat.id === chatId ? 'active' : ''}`;
            
            item.innerHTML = `
                <span class="history-title">${chat.title}</span>
                <button class="delete-chat-btn" title="Delete chat">
                    <ion-icon name="close-outline"></ion-icon>
                </button>
            `;

            // Click to load
            item.querySelector('.history-title').onclick = (e) => {
                e.stopPropagation();
                loadFromHistory(chat.id);
            };

            // Click to delete
            item.querySelector('.delete-chat-btn').onclick = (e) => {
                e.stopPropagation();
                deleteFromHistory(chat.id);
            };

            historyList.appendChild(item);
        });
    };

    const deleteFromHistory = (id) => {
        if (!confirm('Delete this conversation?')) return;
        const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        const updatedHistory = history.filter(h => h.id !== id);
        localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
        
        if (chatId === id) {
            chatId = Date.now();
            chatMessages.innerHTML = '';
            messageHistory = [];
            addMessage('bot', "Conversation deleted.");
        }
        renderHistory();
    };

    const loadFromHistory = (id) => {
        if (messageHistory.length > 0) saveToHistory();
        const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        const chat = history.find(h => h.id === id);
        if (chat) {
            chatId = chat.id;
            messageHistory = chat.messages;
            chatMessages.innerHTML = chat.html;
            chatMessages.scrollTop = chatMessages.scrollHeight;
            renderHistory();
        }
    };

    renderHistory();

    // --- Mode Switching Logic ---

    const setMode = (mode) => {
        currentMode = mode;
        if (mode === 'text') {
            modeTextBtn.classList.add('active');
            modeImageBtn.classList.remove('active');
            userInput.placeholder = "Type a message...";
        } else {
            modeImageBtn.classList.add('active');
            modeTextBtn.classList.remove('active');
            userInput.placeholder = "Describe an image you'd like to create...";
        }
    };

    modeTextBtn.addEventListener('click', () => setMode('text'));
    modeImageBtn.addEventListener('click', () => setMode('image'));

    // --- UI Update Helpers ---

    /** Adds a message bubble to the chat */
    const addMessage = (role, content, isImage = false) => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;

        let contentHtml = '';
        if (isImage) {
            contentHtml = `<img src="${content}" class="msg-image" alt="AI Generated Image">`;
        } else {
            contentHtml = marked.parse(content);
        }

        messageDiv.innerHTML = `
            <div class="msg-avatar">${role === 'bot' ? 'AI' : 'U'}</div>
            <div class="msg-bubble">
                ${contentHtml}
                <div class="msg-time">${time}</div>
            </div>
        `;

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        saveToHistory();
    };

    /** Toggle typing indicator */
    const showTyping = (show) => {
        if (show) {
            typingIndicator.classList.remove('hidden');
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } else {
            typingIndicator.classList.add('hidden');
        }
    };

    // --- API Service Logic ---

    /** Part B & D: Calling the Text Model (OpenRouter) */
    async function fetchAiText(prompt) {
        // Add user prompt to history
        messageHistory.push({ role: "user", content: prompt });

        const apiKey = localStorage.getItem('text_api_key') || CONFIG.TEXT_API_KEY;

        try {
            // Determine the URL (use Vercel API Proxy if on Vercel)
            const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
            const targetUrl = isLocalhost && apiKey ? CONFIG.TEXT_API_URL : "/api/text";

            const response = await fetch(targetUrl, {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": window.location.origin, 
                },
                method: "POST",
                body: JSON.stringify({
                    model: CONFIG.TEXT_MODEL,
                    messages: messageHistory,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Text API failed');
            }

            const result = await response.json();
            const reply = result.choices[0].message.content;

            // Add bot reply to history
            messageHistory.push({ role: "assistant", content: reply });
            return reply;
        } catch (error) {
            console.error(error);
            return `I'm having trouble connecting to my text engine. <br><br>**Tip**: ${error.message}`;
        }
    }

    /** Part E: Calling the Image Model (Hugging Face) */
    async function generateImage(prompt) {
        const apiKey = localStorage.getItem('image_api_key') || CONFIG.IMAGE_API_KEY;

        try {
             // Determine the URL (use Vercel API Proxy if on Vercel)
            const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
            const targetUrl = isLocalhost && apiKey ? CONFIG.IMAGE_API_URL : "/api/image";

            const response = await fetch(targetUrl, {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify({ prompt: prompt }),
            });

            if (!response.ok) throw new Error('Image API failed');

            const blob = await response.blob();
            return URL.createObjectURL(blob);
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    // --- Action Handlers ---

    const handleSend = async () => {
        const text = userInput.value.trim();
        if (!text) return;

        const textApiKey = localStorage.getItem('text_api_key') || CONFIG.TEXT_API_KEY;
        const imageApiKey = localStorage.getItem('image_api_key') || CONFIG.IMAGE_API_KEY;

        if (!textApiKey || !imageApiKey) {
            addMessage('bot', "Wait! You haven't configured your API keys yet. <br><br>Please click the **Persona AI logo** in the sidebar to enter your keys, or edit `config.js` if running locally.");
            return;
        }

        // 1. Show user message
        addMessage('user', text);
        userInput.value = '';
        userInput.style.height = 'auto';

        // 2. Show indicator
        showTyping(true);

        // 3. Process based on mode
        if (currentMode === 'text') {
            const reply = await fetchAiText(text);
            showTyping(false);
            addMessage('bot', reply);
        } else {
            const imageUrl = await generateImage(text);
            showTyping(false);
            if (imageUrl) {
                addMessage('bot', imageUrl, true);
            } else {
                addMessage('bot', "I couldn't generate that image. Make sure your Hugging Face token is valid!");
            }
        }
    };

    // --- Event Listeners ---

    sendBtn.addEventListener('click', handleSend);

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    // Auto-expand textarea
    userInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    newChatBtn.addEventListener('click', () => {
        saveToHistory();
        chatId = Date.now();
        chatMessages.innerHTML = '';
        messageHistory = [];
        addMessage('bot', "A brand new conversation has started! How can I assist you?");
        renderHistory();
    });

    clearChatBtn.addEventListener('click', () => {
        if (!confirm('Are you sure you want to clear the entire chat history?')) return;
        localStorage.removeItem('chatHistory');
        chatId = Date.now();
        chatMessages.innerHTML = '';
        messageHistory = [];
        addMessage('bot', "Conversation cleared and history erased.");
        renderHistory();
    });

    // --- Settings Modal Logic ---

    // Function to load saved keys into inputs
    const loadSettings = () => {
        textKeyInput.value = localStorage.getItem('text_api_key') || '';
        imageKeyInput.value = localStorage.getItem('image_api_key') || '';
    };

    saveConfigBtn.addEventListener('click', () => {
        const textKey = textKeyInput.value.trim();
        const imageKey = imageKeyInput.value.trim();
        
        if (textKey) localStorage.setItem('text_api_key', textKey);
        if (imageKey) localStorage.setItem('image_api_key', imageKey);
        
        settingsModal.classList.add('hidden');
        updateApiStatus(); // Refresh the dots
        alert('API keys saved successfully!');
    });

    /* Settings modal interaction removed for final privacy */

    // Close modal on click outside
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.add('hidden');
        }
    });

    // Update status dots based on key availability
    const updateApiStatus = () => {
        const textStatusDot = document.querySelector('#status-text span');
        const imageStatusDot = document.querySelector('#status-image span');
        
        const hasTextKey = localStorage.getItem('text_api_key') || CONFIG.TEXT_API_KEY;
        const hasImageKey = localStorage.getItem('image_api_key') || CONFIG.IMAGE_API_KEY;

        textStatusDot.className = `status-dot ${hasTextKey ? 'green' : 'red'}`;
        imageStatusDot.className = `status-dot ${hasImageKey ? 'blue' : 'red'}`;
    };

    updateApiStatus();
    settingsModal.classList.add('hidden'); // Ensure it starts hidden
});
