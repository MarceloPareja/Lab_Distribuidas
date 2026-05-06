import threading
import uuid
from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS

# Inicializar la app Flask
app = Flask(__name__)
app.config['SECRET_KEY'] = 'tu_clave_secreta_aqui'
CORS(app)  # Permitir solicitudes desde cualquier origen

# Inicializar SocketIO
socketio = SocketIO(app, cors_allowed_origins="*")

# Diccionarios en memoria (sin BD ni almacenamiento en disco)
usuarios = {}        # socket.id -> {'username': username, 'room': room}
active_messages = {} # message_id -> socket.id del emisor

@app.route('/')
def index():
    return "<h1>Bienvenido al Chat Privado con WebSockets</h1>"

@socketio.on('connect')
def handle_connect():
    print(f'Cliente conectado: {request.sid}')

@socketio.on('join_room')
def handle_join_room(data):
    username = data.get('username', 'Anónimo')
    room = data.get('room', 'General')
    
    # Si ya estaba registrado en otra sala, lo retiramos
    if request.sid in usuarios:
        old_room = usuarios[request.sid]['room']
        leave_room(old_room)
        emit('user_left', {'username': usuarios[request.sid]['username']}, room=old_room)
        emit('user_list', get_users_in_room(old_room), room=old_room)

    join_room(room)
    usuarios[request.sid] = {'username': username, 'room': room}
    
    print(f'{username} se ha unido a la sala {room}')
    
    # Notificar a los demás usuarios de la nueva sala
    emit('user_joined', {'username': username}, room=room, include_self=False)
    emit('user_list', get_users_in_room(room), room=room)

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

@socketio.on('message_read')
def handle_message_read(data):
    message_id = data.get('messageId')
    sender_sid = active_messages.get(message_id)
    
    # Retransmitir confirmación solo al emisor original
    if sender_sid:
        emit('message_read', {'messageId': message_id}, room=sender_sid)

@socketio.on('disconnect')
def handle_disconnect():
    user_info = usuarios.pop(request.sid, None)
    if user_info:
        username = user_info['username']
        room = user_info['room']
        print(f'Cliente desconectado: {request.sid} ({username})')
        
        emit('user_left', {'username': username}, room=room)
        emit('user_list', get_users_in_room(room), room=room)

def get_users_in_room(room):
    users_in_room = []
    for sid, info in usuarios.items():
        if info['room'] == room:
            users_in_room.append(info['username'])
    return users_in_room

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
