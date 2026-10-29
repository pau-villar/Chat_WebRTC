const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
app.use(express.static('public'));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let usuarios = []; // { id, nombre, socket }
let contador = 1;

function enviarLista() {
  // No podemos enviar el socket por JSON, así que mandamos solo id y nombre
  const lista = usuarios.map(u => ({ id: u.id, nombre: u.nombre }));
  const mensaje = JSON.stringify({ tipo: 'usuarios', usuarios: lista });
  usuarios.forEach(u => u.socket.send(mensaje));
}

wss.on('connection', socket => {
  const miId = contador++;

  socket.on('message', texto => {
    const datos = JSON.parse(texto);

    if (datos.tipo === 'entrar') {
      usuarios.push({ id: miId, nombre: datos.nombre, socket });
      socket.send(JSON.stringify({ tipo: 'bienvenida', id: miId }));
      enviarLista();
    }

    if (['senal', 'ocupado'].includes(datos.tipo)) {
      const destino = usuarios.find(u => u.id === datos.para);
      if (destino) {
        datos.de = miId; // lo añade el servidor para que el destinatario sepa quién lo envía
        destino.socket.send(JSON.stringify(datos));
      }
    }

  });

  socket.on('close', () => {
    usuarios = usuarios.filter(u => u.id !== miId);
    enviarLista();
  });
});

server.listen(8080, () => console.log('http://localhost:8080'));