import './username-prompt.js';
import './chat-room.js';

class ChatApp extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        this.socket = io('http://127.0.0.1:5000');
        this.username = null;
        this.room = null;
        this.state = 'connecting'; // 'connecting', 'username', 'chat'
        this.users = [];
        
        this.render();
    }

    connectedCallback() {
        this.setupSocketEvents();

        this.addEventListener('join-room', (e) => {
            this.username = e.detail.username;
            this.room = e.detail.room;

            this.socket.emit('join_room', { username: this.username, room: this.room });
            this.state = 'chat';
            this.render();
        });

        this.addEventListener('send-message', (e) => {
            this.socket.emit('chat_message', {
                message: e.detail.message,
                timestamp: e.detail.timestamp,
                ttl: e.detail.ttl
            });
        });
    }

    setupSocketEvents() {
        this.socket.on('connect', () => {
            if (!this.username) {
                this.state = 'username';
                this.render();
            }
        });

        this.socket.on('user_list', (users) => {
            this.users = users;
            const chatRoom = this.shadowRoot.querySelector('chat-room');
            if (chatRoom) chatRoom.setUsers(users);
        });

        this.socket.on('chat_message', (data) => {
            const chatRoom = this.shadowRoot.querySelector('chat-room');
            if (chatRoom) {
                const isOwn = data.username === this.username;
                chatRoom.addMessage(data, isOwn, (msgId) => {
                    this.socket.emit('message_read', { messageId: msgId });
                });
            }
        });

        this.socket.on('message_read', (data) => {
            const chatRoom = this.shadowRoot.querySelector('chat-room');
            if (chatRoom) {
                chatRoom.markMessageAsRead(data.messageId);
            }
        });

        this.socket.on('user_joined', (data) => {
            const chatRoom = this.shadowRoot.querySelector('chat-room');
            if (chatRoom) {
                chatRoom.addMessage({ username: 'Sistema', message: `${data.username} se ha unido a la sala.` }, false);
            }
        });

        this.socket.on('user_left', (data) => {
            const chatRoom = this.shadowRoot.querySelector('chat-room');
            if (chatRoom) {
                chatRoom.addMessage({ username: 'Sistema', message: `${data.username} ha abandonado la sala.` }, false);
            }
        });
    }

    render() {
        let contentHTML = '';

        if (this.state === 'connecting') {
            contentHTML = `<p>Conectando al servidor...</p>`;
        } else if (this.state === 'username') {
            contentHTML = `<username-prompt></username-prompt>`;
        } else if (this.state === 'chat') {
            contentHTML = `<chat-room></chat-room>`;
        }

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block; width: 520px; max-width: 100%;
                    height: 480px; background: #ffffff; border-radius: 12px;
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
                    overflow: hidden; display: flex; flex-direction: column;
                }
                header { background: #4a6fa5; color: white; padding: 16px; text-align: center; }
                .content {
                    flex: 1; display: flex; flex-direction: column;
                    justify-content: center; align-items: center;
                    color: #555; height: 100%;
                }
            </style>
            <header>
                <h2>Chat Web Components ${this.room ? `[Sala: ${this.room}]` : ''} - ${this.username || ''}</h2>
            </header>
            <div class="content">
                ${contentHTML}
            </div>
        `;

        if (this.state === 'chat') {
            const chatRoom = this.shadowRoot.querySelector('chat-room');
            if (chatRoom) chatRoom.setUsers(this.users);
        }
    }
}
customElements.define('chat-app', ChatApp);