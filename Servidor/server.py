from flask import Flask, render_template
from flask_socketio import SocketIO, emit, send
from flask_cors import CORS
from datetime import datetime
from flask import request

#Inicializar la aplicación Flask
app = Flask(__name__)
app.config['SECRET_KEY'] = 'mi_clave_secreta'
CORS(app) #Habilitar cors para todas las rutas

socketio = SocketIO(app, cors_allowed_origins="*")

usuarios = {}

@app.route("/")
def index():
    #return render_template("index.html")
    return "<h1>Bienvenidos a mi chat</h1>"

# Evento para manejar la conexión de un nuevo cliente
@socketio.on("connect")
def handle_connect():
    print(f"Nuevo cliente conectado: {request.sid}")

@socketio.on("set_username")
def handle_set_username(data):
    username = data.get('username','Anónimo')
    usuarios[request.sid] = username
    emit("user_joined", {"username":username},broadcast=True,include_self=False)
    emit("user_list",{"users":list(usuarios.values())},broadcast=True)

#Enviar un mensaje
@socketio.on("chat_message")
def handle_chat_message(data):
    username = usuarios.get(request.sid,'Anónimo')
    message = data.get('message','')
    timestamp = data.get('timestamp')
    emit("chat_message",{
        "username":username,
          "message":message,
          "timestamp":timestamp
          },broadcast=True)
    
@socketio.on("disconnect")
def handle_disconnect():
    username = usuarios.pop(request.sid, "Anónimo")
    print(f"Usuario desconectado: {request.sid} {username}")
    emit("user_left",{"username":username}, broadcast=True)
    emit("user_list",{"users":list(usuarios.values())},broadcast=True)

#Lanzar la aplicación
if __name__ == "__main__":
    socketio.run(app,host="0.0.0.0", port=5000, debug=True)
