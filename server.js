const http = require('http');
const Koa = require('koa');
const koaBody = require('koa-body');
const cors = require('@koa/cors');
const app = new Koa();
const WS = require('ws');
const { v4: uuidv4 } = require('uuid');

const users = [];
const messages = [];

const corsOptions = {
  origin: '*',
};

app.use(cors(corsOptions));
app.use(
  koaBody({
    multipart: true,
  })
);

const port = process.env.PORT || 7070;
const server = http.createServer(app.callback());
const wsServer = new WS.Server({ server });

function sendToAll(data) {
  [...wsServer.clients]
    .filter((user) => user.readyState === WS.OPEN)
    .forEach((user) => user.send(JSON.stringify(data)));
}

wsServer.on('connection', (ws) => {
  const id = uuidv4();
  sendToAll({ action: 'connection', users, messages });

  ws.on('message', (message) => {
    const eventMessage = JSON.parse(message);

    if (eventMessage.action === 'login') {
      if (users.find((user) => user.name === eventMessage.data)) {
        ws.send(JSON.stringify({ action: 'login', status: false }));
      } else {
        users.push({ id, name: eventMessage.data });
        ws.send(JSON.stringify({ action: 'login', status: true, user: eventMessage.data }));
        sendToAll({ action: 'connection', users, messages });
      }
    } else if (eventMessage.action === 'message') {
      const message = eventMessage.data;
      message.date = Date.now();
      messages.push(message);
      sendToAll({ action: 'message', status: true, message });
    }
  });

  ws.on('close', () => {
    const index = users.findIndex((user) => user.id === id);
    if (index !== -1) {
      users.splice(index, 1);
    }
    if (wsServer.clients.length !== 0) {
      sendToAll({ action: 'close', message: users });
    }
  });
});

server.listen(port);
