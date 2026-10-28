let socket;
let miId = null;
let listaUsuarios = [];

document.getElementById('boton-entrar').onclick = () => {
  const nombre = document.getElementById('input-nombre').value.trim();
  if (!nombre) return;

  socket = new WebSocket('ws://' + location.host);

  socket.onopen = () => {
    socket.send(JSON.stringify({ tipo: 'entrar', nombre }));
    document.getElementById('mi-nombre').textContent = nombre;
    mostrarPantalla('pantalla-usuarios');
  };

  socket.onmessage = evento => {
    const datos = JSON.parse(evento.data);

    if (datos.tipo === 'bienvenida') miId = datos.id;
    if (datos.tipo === 'usuarios') mostrarUsuarios(datos.usuarios);
    if (datos.tipo === 'senal') recibirSenal(datos);
  };
};

function mostrarUsuarios(usuarios) {
  listaUsuarios = usuarios;
  const lista = document.getElementById('lista-usuarios');
  lista.innerHTML = '';

  // Quitamos nuestro propio usuario de la lista
  const otros = usuarios.filter(u => u.id !== miId);

  otros.forEach(u => {
    const li = document.createElement('li');
    li.textContent = u.nombre;
    li.onclick = () => llamar(u.id);
    lista.appendChild(li);
  });

  document.getElementById('sin-usuarios').classList.toggle('oculto', otros.length > 0);
}

// ---------- WebRTC con simple-peer ----------

let peer = null;
let otroId = null;

function enviar(objeto) {
  socket.send(JSON.stringify(objeto));
}

function crearPeer(idRemoto, iniciador) {
  otroId = idRemoto;
  peer = new SimplePeer({ initiator: iniciador });

  // simple-peer genera datos de señalización y nos pide que se los hagamos llegar al otro
  peer.on('signal', datos => {
    enviar({ tipo: 'senal', para: otroId, datos });
  });

  peer.on('connect', () => {
    const otro = listaUsuarios.find(u => u.id === otroId);
    document.getElementById('nombre-otro').textContent = otro ? otro.nombre : 'usuario';
    document.getElementById('mensajes').innerHTML = '';
    mostrarPantalla('pantalla-chat');
  });

  peer.on('data', datos => {
    añadirMensaje(datos.toString(), 'suyo');
  });

  peer.on('close', () => {
    añadirMensaje('La conexión se ha cerrado.', 'sistema');
    peer = null;
  });

  peer.on('error', error => console.log('Error:', error.message));
}

// Lado que inicia (el que pulsa en la lista)
function llamar(idRemoto) {
  crearPeer(idRemoto, true);
}

// Llega una señal del otro lado
function recibirSenal(datos) {
  if (!peer) crearPeer(datos.de, false); // si es la primera, creamos nuestro peer
  peer.signal(datos.datos);
}

// ---------- Pantalla de chat ----------

function mostrarPantalla(id) {
  document.getElementById('pantalla-nombre').classList.add('oculto');
  document.getElementById('pantalla-usuarios').classList.add('oculto');
  document.getElementById('pantalla-chat').classList.add('oculto');
  document.getElementById(id).classList.remove('oculto');
}

function añadirMensaje(texto, clase) {
  const div = document.createElement('div');
  div.className = 'mensaje ' + clase;
  div.textContent = texto;
  const caja = document.getElementById('mensajes');
  caja.appendChild(div);
  caja.scrollTop = caja.scrollHeight; // baja al último mensaje
}

function enviarMensaje() {
  const input = document.getElementById('input-mensaje');
  const texto = input.value.trim();
  if (!texto || !peer || !peer.connected) return;

  peer.send(texto);
  añadirMensaje(texto, 'mio');
  input.value = '';
}

document.getElementById('boton-enviar').onclick = enviarMensaje;

document.getElementById('input-mensaje').onkeydown = evento => {
  if (evento.key === 'Enter') enviarMensaje();
};

document.getElementById('boton-volver').onclick = () => {
  if (peer) peer.destroy(); // cierra la conexión P2P
  peer = null;
  mostrarPantalla('pantalla-usuarios');
};