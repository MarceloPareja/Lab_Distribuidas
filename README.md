<div>
<img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSd8Qqt8hiw1D8iE0u6roFsDdvH5LjXn3p_bQ&s" style="text-align: center"/>
</div>

# Laboratorio 2
## Aplicaciones distribuidas

### Integrantes
* Mateo Llumigusín
* Eduardo Mortensen
* Marcelo Pareja

**Fecha:** 06/05/2026

## 2. Instrucciones paso a paso para ejecutar la aplicación

### Requisitos Previos
- Python 3.x instalado.
- Node.js instalado (necesario solo si se desea usar el cliente de consola `cliente.js`).

### Configuración del Servidor (Backend)
1. Abrir una terminal en el directorio del proyecto.
2. (Opcional pero recomendado) Activar el entorno virtual:
   - En Windows: `venv\Scripts\activate`
   - En Linux/Mac: `source venv/bin/activate`
3. Instalar las dependencias necesarias:
   ```bash
   pip install flask flask-socketio flask-cors
   ```
4. Ejecutar el servidor:
   ```bash
   python server.py
   ```
   El servidor se iniciará en `http://localhost:5000` o `http://0.0.0.0:5000`.

### Ejecución de los Clientes (Frontend)

**Opción A: Cliente Web**
Haz doble clic o abre el archivo `index.html` en un navegador web.

**Opción B: Cliente de Consola (Node.js)**
1. Abre una nueva ventana de terminal en el mismo directorio.
2. Instala las dependencias de Node.js:
   ```bash
   npm install
   ```
3. Ejecuta el cliente:
   ```bash
   node cliente.js
   ```

## Funcionalidades Implementadas

### Confirmación de lectura de mensajes

El cliente de Javascript compara y verifica si el mensaje es propio o de otros, cada vez que recibe el evento "chat_message". El evento llega al servidor, y también llega al cliente correspondiente, que activa una función "markMessageAsRead" en el webcomponent.

```javascript
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
```


El servidor de Python recibe el evento "message_read" y notifica al cliente que lo envió que su mensaje fue leído.

```python
@socketio.on('message_read')
def handle_message_read(data):
    message_id = data.get('messageId')
    sender_sid = active_messages.get(message_id)
    
    # Retransmitir confirmación solo al emisor original
    if sender_sid:
        emit('message_read', {'messageId': message_id}, room=sender_sid)
```

Por último, la interfaz del webcomponent se actualiza y muestra el indicador visual:

```javascript
markMessageAsRead(messageId) {
        const checkEl = this.shadowRoot.querySelector(`#check-${messageId}`);
        if (checkEl) {
            checkEl.textContent = '✓✓';
            checkEl.style.color = '#388e3c';
        }
    }
```

### Temporalidad de mensajes

La función para manejar un nuevo mensaje se modificó para enviar un nuevo atributo "ttl", que indica el tiempo de vida del mensaje tras ser leído.


```python
@socketio.on('chat_message')
def handle_chat_message(data):
    user_info = usuarios.get(request.sid)
    if not user_info:
        return  # No se permite operar si el usuario no existe
    
    room = user_info['room']
    username = user_info['username']
    message = data.get('message', '')
    timestamp = data.get('timestamp', '')
    ttl = data.get('ttl', '0')
    
    # Generar un ID único para el mensaje
    message_id = str(uuid.uuid4())
    active_messages[message_id] = request.sid
    
    msg_data = {
        'id': message_id,
        'username': username,
        'message': message,
        'timestamp': timestamp,
        'ttl': ttl,
        'room': room
    }
    
    # Retransmitir mensaje únicamente dentro de la sala
    emit('chat_message', msg_data, room=room)
    
    # Temporizador para eliminar mensaje de memoria (TTL)
    ttl_int = int(ttl)
    if ttl_int > 0:
        def clear_msg():
            if message_id in active_messages:
                del active_messages[message_id]
        
        timer = threading.Timer(ttl_int + 5, clear_msg)
        timer.daemon = True
        timer.start()
```

Por su parte, el cliente recibe el mensaje, y verifica si tiene un ttl para iniciar la cuenta regresiva.

```javascript
this.addEventListener('send-message', (e) => {
            this.socket.emit('chat_message', {
                message: e.detail.message,
                timestamp: e.detail.timestamp,
                ttl: e.detail.ttl
            });
        });
```

Si tiene ttl, se muestra un temporizador en el globo de mensaje, y al terminar, se elimina completamente del html.

```javascript
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
```
