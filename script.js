/**
 * AI Persona - Main Application Logic
 * Implements Text Generation (OpenRouter) & Text-to-Image (Hugging Face)
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const clearChatBtn = document.getElementById('clear-chat');
    const newChatBtn = document.getElementById('new-chat-btn');
    const historyList = document.getElementById('history-list');
    const typingIndicator = document.getElementById('typing-indicator');

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
            item.textContent = chat.title;
            item.onclick = () => loadFromHistory(chat.id);
            historyList.appendChild(item);
        });
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
            contentHtml = content.replace(/\n/g, '<br>');
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
            const response = await fetch(CONFIG.TEXT_API_URL, {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": window.location.origin, // Required by OpenRouter
                },
                method: "POST",
                body: JSON.stringify({
                    model: CONFIG.TEXT_MODEL,
                    messages: messageHistory,
                }),
            });

            if (!response.ok) throw new Error('Text API failed');

            const result = await response.json();
            const reply = result.choices[0].message.content;

            // Add bot reply to history
            messageHistory.push({ role: "assistant", content: reply });
            return reply;
        } catch (error) {
            console.error(error);
            return "I'm having trouble connecting to my text engine. Please check your API key in config.js!";
        }
    }

    /** Part E: Calling the Image Model (Hugging Face) */
    async function generateImage(prompt) {
        const apiKey = localStorage.getItem('image_api_key') || CONFIG.IMAGE_API_KEY;

        try {
            const response = await fetch(CONFIG.IMAGE_API_URL, {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify({ inputs: prompt }),
            });

            if (!response.ok) throw new Error('Image API failed');

            const blob = await response.blob();
            // Convert the blob into a URL that the <img> tag can use
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
        alert('API keys saved successfully!');
    });

    // Optional: Open settings modal on logo click
    document.querySelector('.app-logo').addEventListener('click', () => {
        loadSettings();
        settingsModal.classList.remove('hidden');
    });

    // Close modal on click outside
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.add('hidden');
        }
    });
});
