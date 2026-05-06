
let username = '';
let socket   = null;

const loginScreen   = document.getElementById('login-screen');
const chatScreen    = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username-input');
const joinBtn       = document.getElementById('join-btn');
const messagesDiv   = document.getElementById('messages');
const msgInput      = document.getElementById('msg-input');
const sendBtn       = document.getElementById('send-btn');
const connDot       = document.getElementById('conn-dot');
const connLabel     = document.getElementById('conn-label');
const userListDiv   = document.getElementById('user-list');

function addMessage(type, data) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('msg', type);

  if (type === 'system') {
    wrapper.innerHTML = `<div class="msg-body">${data.text}</div>`;
  } else {
    const isOwn = (data.username === username);
    wrapper.classList.add(isOwn ? 'own' : 'other');
  
    const displayName = isOwn ? 'Tú' : escapeHtml(data.username);

    wrapper.innerHTML = `
      <div class="msg-header">
        <span class="msg-username">${displayName}</span>
        <span class="msg-time">${data.timestamp || ''}</span>
      </div>
      <div class="msg-body">${escapeHtml(data.message)}</div>
    `;
  }

  messagesDiv.appendChild(wrapper);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
function updateUserList(users) {
  userListDiv.innerHTML = '';
  users.forEach(u => {
    const item = document.createElement('div');
    item.classList.add('user-item');
    if (u === username) item.classList.add('me');
    item.textContent = u === username ? `${u} (tú)` : u;
    userListDiv.appendChild(item);
  });
}

function setConnStatus(connected) {
  connDot.classList.toggle('connected', connected);
  connLabel.textContent = connected ? 'Conectado' : 'Desconectado';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

//  Login
function joinChat() {
  const name = usernameInput.value.trim();
  if (!name) {
    usernameInput.focus();
    return;
  }
  username = name;

  // Mostrar pantalla de chat
  loginScreen.style.display = 'none';
  chatScreen.style.display  = 'block';

  // Conectar socket
  initSocket();
}

joinBtn.addEventListener('click', joinChat);
usernameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') joinChat();
});

//  Socket.IO
function initSocket() {
  socket = io('http://localhost:5000', {
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    setConnStatus(true);
    socket.emit('set_username', { username });
    msgInput.focus();
  });

  socket.on('disconnect', () => {
    setConnStatus(false);
    addMessage('system', { text: '⚠️ Desconectado del servidor' });
  });

  socket.on('user_joined', data => {
    addMessage('system', { text: `👋 ${escapeHtml(data.username)} se ha unido al chat` });
  });

  socket.on('user_left', data => {
    addMessage('system', { text: `👋 ${escapeHtml(data.username)} ha salido del chat` });
  });

  socket.on('user_list', data => {
    updateUserList(data.users);
  });

  socket.on('chat_message', data => {
    addMessage('chat', data);
  });
}

//  Enviar mensaje
function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !socket) return;
  socket.emit('chat_message', { message: text });
  msgInput.value = '';
  msgInput.focus();
}

sendBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') sendMessage();
});
