// See ./README.md for instructions on how to run this benchmark.
const CLIENTS_TO_WAIT_FOR = parseInt(process.env.CLIENTS_COUNT || "", 10) || 16;
var remainingClients = CLIENTS_TO_WAIT_FOR;
const port = process.PORT || 4001;

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const uws = require('uWebSockets.js');
const app = uws.App();
app.ws('/*', {
  compression: uws.DISABLED,
  upgrade: (res, req, context) => {
    res.upgrade(
      { name: req.getQuery().startsWith("name") ? req.getQuery().slice(5) : "Client #" + (CLIENTS_TO_WAIT_FOR - remainingClients) },
      req.getHeader('sec-websocket-key'),
      req.getHeader('sec-websocket-protocol'),
      req.getHeader('sec-websocket-extensions'),
      context
    );
  },
  open: (ws) => {
    ws.subscribe("room");

    remainingClients--;
    console.log(`${ws.getUserData().name} connected (${remainingClients} remain)`);

    if (remainingClients === 0) {
      console.log("All clients connected");
      setTimeout(() => {
        console.log('Starting benchmark by sending "ready" message');
        app.publish("room", "ready");
      }, 100);
    }
  },
  message: (ws, msg) => {
    const out = `${ws.getUserData().name}: ${new TextDecoder().decode(msg)}`;
    const ok = app.publish("room", out);
    if (!ok) {
      console.log(ok);
    }
  },
  close: () => {
    remainingClients++;
  }
}).listen(port, (listenSocket) => {
  if (listenSocket) {
    console.log('Listening to port ' + port);
  }
});

console.log(`Waiting for ${remainingClients} clients to connect...\n`);
