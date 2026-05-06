export class ChatRoom extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.render();
    }

    setUsers(users) {
        const usersList = this.shadowRoot.querySelector('#users-list');
        if (usersList) {
            usersList.innerHTML = users.map(user => `<li>${user}</li>`).join('');
        }
    }

    addMessage(msgData, isOwnMessage, onReadCallback) {
        const messagesDiv = this.shadowRoot.querySelector('.messages');
        if (!messagesDiv) return;

        const messageEl = document.createElement('div');
        messageEl.classList.add('message');
        if (isOwnMessage) {
            messageEl.classList.add('own');
        } else {
            messageEl.classList.add('received');
        }

        // Cuenta regresiva
        let timerDisplay = '';
        if (msgData.ttl && parseInt(msgData.ttl) > 0) {
            let timeLeft = parseInt(msgData.ttl);
            timerDisplay = `<span class="countdown" id="timer-${msgData.id}">${timeLeft}s</span>`;
            
            const interval = setInterval(() => {
                timeLeft--;
                const timerEl = this.shadowRoot.querySelector(`#timer-${msgData.id}`);
                if (timerEl) {
                    timerEl.textContent = `${timeLeft}s`;
                }
                if (timeLeft <= 0) {
                    clearInterval(interval);
                    if (messageEl && messageEl.parentNode) {
                        messagesDiv.removeChild(messageEl);
                    }
                }
            }, 1000);
        }

        // Icono de lectura (Read Receipt)
        let checkIcon = '';
        if (isOwnMessage) {
            checkIcon = `<span class="check-icon" id="check-${msgData.id}">✓</span>`;
        }

        messageEl.id = `msg-${msgData.id}`;
        messageEl.innerHTML = `
            <strong>${msgData.username}:</strong>
            <span>${msgData.message}</span>
            <span class="timestamp">
                ${msgData.timestamp || ''}
                ${checkIcon}
                ${timerDisplay}
            </span>
        `;

        messagesDiv.appendChild(messageEl);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        if (!isOwnMessage && onReadCallback) {
            onReadCallback(msgData.id);
        }
    }

    markMessageAsRead(messageId) {
        const checkEl = this.shadowRoot.querySelector(`#check-${messageId}`);
        if (checkEl) {
            checkEl.textContent = '✓✓';
            checkEl.style.color = '#388e3c';
        }
    }

    connectedCallback() {
        this.setupListeners();
    }

    setupListeners() {
        const sendBtn = this.shadowRoot.querySelector('#send-btn');
        const msgInput = this.shadowRoot.querySelector('#msg-input');
        const ttlSelect = this.shadowRoot.querySelector('#ttl-select');

        const sendMessage = () => {
            const message = msgInput.value.trim();
            const ttl = ttlSelect.value;
            
            if (message) {
                this.dispatchEvent(new CustomEvent('send-message', {
                    detail: { message, ttl, timestamp: new Date().toLocaleTimeString() },
                    bubbles: true,
                    composed: true
                }));
                msgInput.value = '';
            }
        };

        sendBtn.addEventListener('click', sendMessage);
        msgInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: flex; width: 100%; height: 100%; background: #fff; }
                .sidebar {
                    width: 140px; background: #f4f6f9; padding: 15px; 
                    border-right: 1px solid #e0e0e0; display: flex; flex-direction: column;
                }
                .sidebar h3 { font-size: 13px; margin-bottom: 10px; color: #333; }
                #users-list {
                    list-style: none; padding: 0; margin: 0; 
                    overflow-y: auto; max-height: 280px;
                }
                #users-list li {
                    font-size: 12px; margin-bottom: 6px; color: #555; 
                    padding: 5px 8px; background: #fff; border-radius: 4px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                .main-chat {
                    flex: 1; display: flex; flex-direction: column; 
                    padding: 15px; justify-content: space-between;
                }
                .messages {
                    flex: 1; overflow-y: auto; margin-bottom: 15px; 
                    border-bottom: 1px solid #eee; padding-bottom: 10px; 
                    display: flex; flex-direction: column; gap: 8px; max-height: 280px;
                }
                .message {
                    font-size: 13px; padding: 8px 12px; border-radius: 6px; 
                    max-width: 80%; display: flex; flex-direction: column;
                }
                .message.own { background: #e3f2fd; align-self: flex-end; }
                .message.received { background: #f1f3f5; align-self: flex-start; }
                .message strong { color: #4a6fa5; }
                .timestamp {
                    font-size: 9px; color: #888; display: flex; 
                    justify-content: space-between; align-items: center; margin-top: 4px;
                }
                .check-icon { font-size: 10px; color: #666; margin-left: 5px; }
                .countdown { color: #d32f2f; font-weight: bold; margin-left: 8px; }
                .control-area { display: flex; flex-direction: column; gap: 8px; }
                .input-area { display: flex; gap: 8px; }
                .input-area input { flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
                .input-area button {
                    padding: 8px 14px; background: #4a6fa5; color: white; 
                    border: none; border-radius: 4px; cursor: pointer; font-weight: bold;
                }
                .input-area button:hover { background: #334e7a; }
                .ttl-area { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #555; }
                .ttl-area select { padding: 4px; border-radius: 4px; border: 1px solid #ccc; }
            </style>
            <div class="sidebar">
                <h3>En sala</h3>
                <ul id="users-list"></ul>
            </div>
            <div class="main-chat">
                <div class="messages"></div>
                <div class="control-area">
                    <div class="ttl-area">
                        <label for="ttl-select">Auto-destrucción (TTL):</label>
                        <select id="ttl-select">
                            <option value="0">Desactivado</option>
                            <option value="10">10 Segundos</option>
                            <option value="60">1 Minuto</option>
                            <option value="300">5 Minutos</option>
                        </select>
                    </div>
                    <div class="input-area">
                        <input type="text" id="msg-input" placeholder="Escribe un mensaje..." autocomplete="off"/>
                        <button id="send-btn">Enviar</button>
                    </div>
                </div>
            </div>
        `;
    }
}
customElements.define('chat-room', ChatRoom);