// The multiplayer server. Everything else in this project runs in the player's
// browser; this one file runs on Cloudflare. Its only job is to pass messages
// between the browsers that are in the same room. It knows nothing about the
// game itself: the host's browser holds the real world (see src/net.js).

import { DurableObject } from "cloudflare:workers";

// The most players one room will take.
const MAX_PLAYERS = 8;
// The biggest message allowed, in characters. The big one is the copy of the
// world that a host sends to somebody joining.
const MAX_MESSAGE = 2000000;

// Every request that is not for one of the game's files arrives here. The only
// address this answers is /room/ABCD, where ABCD is a room code, and only for a
// WebSocket: a connection that stays open so both ends can send at any time.
export default {
  async fetch(request, env) {
    const match = new URL(request.url).pathname.match(/^\/room\/([A-Z]{4})$/);
    if (!match) return new Response("Not found", { status: 404 });
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("This address is for the game to connect to.", { status: 426 });
    }
    // Everybody who asks for the same code is handed to the same Room.
    const room = env.ROOMS.get(env.ROOMS.idFromName(match[1]));
    return room.fetch(request);
  },
};

// One room. Cloudflare starts one of these for each room code in use, and lets
// it sleep whenever nobody is sending anything. Because it can sleep, it keeps
// nothing in ordinary variables: who each connection belongs to is stored on
// the connection itself, as its "attachment".
export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // Browsers send "ping" now and then to keep the connection open. This
    // answers "pong" without waking the room up.
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  // Everyone in the room: each connection with the { id, host } stored on it.
  players() {
    const out = [];
    for (const ws of this.ctx.getWebSockets()) {
      const who = ws.deserializeAttachment();
      if (who) out.push({ ws, who });
    }
    return out;
  }

  // Somebody is connecting. The host goes first and must find the room empty;
  // everyone after that must find a host already there.
  async fetch(request) {
    const asHost = new URL(request.url).searchParams.get("host") === "1";
    const players = this.players();
    const host = players.find((p) => p.who.host);
    const [client, server] = Object.values(new WebSocketPair());

    let refusal = null;
    if (asHost && players.length) refusal = "taken";
    else if (!asHost && !host) refusal = "noroom";
    else if (players.length >= MAX_PLAYERS) refusal = "full";
    if (refusal) {
      // A browser cannot read why a WebSocket was refused, so let it connect,
      // tell it why, and hang up. It is never given an attachment, so it never
      // counts as a player.
      this.ctx.acceptWebSocket(server);
      server.send(JSON.stringify({ t: "error", why: refusal }));
      server.close(1000, refusal);
      return new Response(null, { status: 101, webSocket: client });
    }

    // Each player gets a number one higher than the highest in the room.
    const id = players.reduce((max, p) => Math.max(max, p.who.id), 0) + 1;
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ id, host: asHost });
    // Tell the newcomer who they are and who is here, and tell the others.
    server.send(JSON.stringify({ t: "hello", id, host: host ? host.who.id : id, peers: players.map((p) => p.who.id) }));
    for (const p of players) this.send(p.ws, JSON.stringify({ t: "join", id }));
    return new Response(null, { status: 101, webSocket: client });
  }

  // A message from one player. It is stamped with who sent it, so nobody can
  // pretend to be someone else, and passed on: to one player if it names one
  // in `to`, otherwise to everyone else. A message marked `echo` also goes
  // back to its sender, which is how players agree on the order of changes.
  webSocketMessage(ws, text) {
    const me = ws.deserializeAttachment();
    if (!me || typeof text !== "string" || text.length > MAX_MESSAGE) return;
    let msg;
    try {
      msg = JSON.parse(text);
    } catch {
      return;
    }
    if (!msg || typeof msg !== "object" || Array.isArray(msg)) return;
    msg.from = me.id;
    const out = JSON.stringify(msg);
    for (const p of this.players()) {
      if (msg.to !== undefined) {
        if (p.who.id !== msg.to) continue;
      } else if (p.ws === ws && !msg.echo) continue;
      this.send(p.ws, out);
    }
  }

  // Cloudflare calls one of these when a connection ends.
  webSocketClose(ws) {
    this.gone(ws);
  }

  webSocketError(ws) {
    this.gone(ws);
  }

  // A player has left. If it was the host the room is over, so everyone else
  // is told and disconnected; otherwise the others are told who left.
  gone(ws) {
    const me = ws.deserializeAttachment();
    try {
      // Forget who this was, in case both of the calls above arrive for it.
      ws.serializeAttachment(null);
      ws.close();
    } catch {
      // It was already closed.
    }
    if (!me) return;
    for (const p of this.players()) {
      if (p.ws === ws) continue;
      if (me.host) {
        this.send(p.ws, JSON.stringify({ t: "end" }));
        try {
          p.ws.close(1000, "host left");
        } catch {
          // Already closed.
        }
      } else {
        this.send(p.ws, JSON.stringify({ t: "leave", id: me.id }));
      }
    }
  }

  // Send to one connection, ignoring one that has just gone away.
  send(ws, text) {
    try {
      ws.send(text);
    } catch {
      // That player has disconnected; their own close will tidy up.
    }
  }
}
