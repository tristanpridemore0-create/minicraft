// Multiplayer: hosting a room, joining one, and talking to the server.
//
// One player hosts. Their browser holds the real world, and they are given a
// four-letter room code. A friend who joins with that code is sent a copy of
// the host's world and appears where the host is standing. Every message goes
// through the small server in server/worker.js, which only passes it on.
//
// A message is a small object with a `t` saying what kind it is. The server
// adds `from`, the number of the player who sent it. Everything that arrives
// was written by somebody else's browser, so none of it is trusted: each value
// is checked before it is used.

import { MAP, TILE, LEVEL } from "./constants.js";
import { NAMES } from "./world/tiles.js";
import { itemDef } from "./items/defs.js";
import { makeSave } from "./save/save.js";
import { RemotePlayer } from "./entities/remotePlayer.js";

// Room codes leave out I and O, which look like 1 and 0.
const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const FURNITURE_KINDS = ["workbench", "chest", "oven", "furnace", "anvil", "lantern"];
// How long a joiner waits for the host's world before giving up: 15 seconds.
const JOIN_WAIT = 900;
// Our position goes out every 6 ticks, which is ten times a second.
const SEND_EVERY = 6;

// A fresh room code, such as "KQWZ".
function randomCode() {
  let code = "";
  for (let i = 0; i < 4; i++) code += CODE_LETTERS[(Math.random() * CODE_LETTERS.length) | 0];
  return code;
}

// Is v a whole number from min to max?
function whole(v, min, max) {
  return Number.isInteger(v) && v >= min && v <= max;
}

// Is v a position, in pixels, that is on the map?
function onMap(v) {
  return Number.isFinite(v) && v >= 0 && v < MAP * TILE;
}

// A list of item stacks (a chest's contents) with anything this game does not
// recognise taken out. A carried chest keeps its own contents in `extra`, so
// this goes one list deeper for those.
function cleanSlots(list, depth = 0) {
  if (!Array.isArray(list) || depth > 2) return [];
  const out = [];
  for (const s of list.slice(0, 200)) {
    if (!s || !itemDef(s.id)) continue;
    out.push({ id: s.id, count: whole(s.count, 1, 9999) ? s.count : 1, extra: s.extra ? cleanSlots(s.extra, depth + 1) : null });
  }
  return out;
}

// One piece of furniture as described by another browser, or null if the
// description makes no sense.
function cleanFurniture(f) {
  if (!f || !FURNITURE_KINDS.includes(f.kind) || !onMap(f.x) || !onMap(f.y)) return null;
  return { x: f.x, y: f.y, kind: f.kind, extra: cleanSlots(f.extra) };
}

// The world a host sent, cut down to what a guest needs and with every value
// checked. It has the same shape as a saved game, so Game.restore can read it.
function cleanWorld(s) {
  if (!s || typeof s !== "object" || !Number.isFinite(s.seed)) throw new Error("That is not a world");
  // Tile lists are [position, value] pairs, one list for each level.
  const pairs = (list, ok) => (Array.isArray(list) ? list.filter((p) => Array.isArray(p) && whole(p[0], 0, MAP * MAP - 1) && ok(p[1])) : []);
  const perLevel = (all, clean) => {
    const out = {};
    for (const id of Object.values(LEVEL)) out[id] = clean((all && all[id]) || []);
    return out;
  };
  const p = s.player || {};
  const w = s.wizard;
  return {
    version: 2,
    seed: s.seed,
    build: !!s.build,
    wizardDead: !!s.wizardDead,
    wizard: w && onMap(w.x) && onMap(w.y) && Number.isFinite(w.health) ? { x: w.x, y: w.y, health: w.health } : null,
    levelId: whole(s.levelId, LEVEL.CAVE3, LEVEL.SKY) ? s.levelId : LEVEL.SURFACE,
    // Only where the host is standing; the guest brings their own player.
    player: { x: onMap(p.x) ? p.x : MAP * 8, y: onMap(p.y) ? p.y : MAP * 8 },
    mutations: perLevel(s.mutations, (list) => pairs(list, (tile) => !!NAMES[tile])),
    tileData: perLevel(s.tileData, (list) => pairs(list, (v) => whole(v, 0, 255))),
    furniture: perLevel(s.furniture, (list) => (Array.isArray(list) ? list.map(cleanFurniture).filter(Boolean) : [])),
  };
}

// There is one Net, made by the Game. Most of the time it does nothing: it only
// comes to life when the player hosts or joins.
export class Net {
  constructor(game) {
    this.game = game;
    // The connection to the server, or null when playing alone.
    this.ws = null;
    this.room = "";
    // Did this browser open the room? If not, and there is a connection, it is
    // a guest in somebody else's.
    this.hosting = false;
    // True once we are properly in: straight away for a host, and for a guest
    // when the host's world has arrived.
    this.inRoom = false;
    // Our own player number and the host's, given out by the server.
    this.id = 0;
    this.hostId = 0;
    // The other players in the room, by number. Each is a RemotePlayer.
    this.peers = new Map();
    // For sendPosition: a tick counter, and what was last sent.
    this.sendClock = 0;
    this.sentText = "";
    this.sentAttacks = 0;
    // A line for the title screen, such as "Joining KQWZ..." or why it failed.
    this.note = "";
    this.codeTries = 0;
    this.waitTicks = 0;
    this.pingTimer = 0;
  }

  // In somebody else's room, or on the way in.
  get isGuest() {
    return !!this.ws && !this.hosting;
  }

  // Connected as a guest, but the host's world has not arrived yet.
  get joining() {
    return this.isGuest && !this.inRoom;
  }

  // How many players are in the room, counting this one.
  get count() {
    return this.peers.size + 1;
  }

  // Open a room for the world being played.
  host() {
    if (this.ws) return;
    this.hosting = true;
    this.codeTries = 0;
    this.connect(randomCode());
  }

  // Join the room with this code.
  join(code) {
    if (this.ws) return;
    code = String(code || "")
      .toUpperCase()
      .replace(/[^A-Z]/g, "");
    if (code.length !== 4) {
      this.note = "A code is 4 letters";
      return;
    }
    this.hosting = false;
    this.waitTicks = 0;
    this.note = `Joining ${code}...`;
    this.connect(code);
  }

  // Open the connection. The server lives at the same address as the game, so
  // this works wherever the game is published.
  connect(code) {
    this.room = code;
    const scheme = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${scheme}://${location.host}/room/${code}${this.hosting ? "?host=1" : ""}`);
    this.ws = ws;
    // The checks against this.ws ignore anything from a connection we have
    // already given up on.
    ws.onmessage = (e) => {
      if (ws === this.ws) this.receive(e.data);
    };
    ws.onclose = () => {
      if (ws === this.ws) this.stop(this.inRoom ? "Connection lost" : this.hosting ? "Could not start a room" : "Could not join");
    };
  }

  // The player chose to leave: back to playing alone. A guest's copy of the
  // host's world is thrown away.
  leave() {
    if (!this.ws) return;
    const guest = this.isGuest;
    this.hangUp();
    if (guest) this.game.dropWorld();
  }

  // The connection is over without the player asking: say why. A host carries
  // on alone in their own world; a guest goes back to the title screen.
  stop(why) {
    const hosting = this.hosting;
    this.hangUp();
    if (hosting) this.game.ui.toast(why);
    else this.game.leftRoom(why);
  }

  // Close the connection and forget everything about the room.
  hangUp() {
    const ws = this.ws;
    // Cleared first, so the close below is not mistaken for a lost connection.
    this.ws = null;
    if (ws) {
      try {
        ws.close();
      } catch {
        // It was already closed.
      }
    }
    clearInterval(this.pingTimer);
    this.hosting = false;
    this.inRoom = false;
    this.id = 0;
    this.hostId = 0;
    this.peers.clear();
    this.note = "";
  }

  // Send one message, if connected.
  send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  // Something arrived from the server. Whatever is wrong with it, it must not
  // be able to stop the game, so mistakes are caught here and noted in the
  // browser console.
  receive(text) {
    if (text === "pong") return;
    try {
      const m = JSON.parse(text);
      if (m && typeof m === "object") this.handle(m);
    } catch (err) {
      console.warn("Multiplayer message ignored:", err);
    }
  }

  // Act on one message.
  handle(m) {
    const ui = this.game.ui;
    switch (m.t) {
      // From the server: we are in, and this is who we are.
      case "hello":
        this.id = m.id;
        this.hostId = m.host;
        for (const id of m.peers || []) this.peers.set(id, new RemotePlayer(id));
        // A quiet connection can be dropped along the way, so say something
        // every 20 seconds.
        this.pingTimer = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send("ping");
        }, 20000);
        if (this.hosting) {
          this.inRoom = true;
          ui.toast(`Room ${this.room}. Friends pick Join game.`);
        }
        break;
      // From the server: we were turned away.
      case "error":
        if (m.why === "taken" && this.hosting && ++this.codeTries < 6) {
          // Somebody else has that code. Try another.
          const tries = this.codeTries;
          this.hangUp();
          this.hosting = true;
          this.codeTries = tries;
          this.connect(randomCode());
          break;
        }
        this.stop({ noroom: `No room ${this.room}`, full: "That room is full" }[m.why] || "Could not start a room");
        break;
      // From the server: somebody arrived. The host sends them the world.
      case "join":
        this.peers.set(m.id, new RemotePlayer(m.id));
        // Forget what was last sent, so the newcomer is told where we are.
        this.sentText = "";
        if (this.inRoom) ui.toast("A friend joined");
        if (this.hosting) this.send({ t: "world", to: m.id, save: makeSave(this.game) });
        break;
      case "leave":
        if (this.peers.delete(m.id) && this.inRoom) ui.toast("A friend left");
        break;
      // From the server: the host has gone, and the room with them.
      case "end":
        this.stop("The host left");
        break;
      // From the host: their world. Only a guest who is waiting for it listens.
      case "world":
        if (!this.joining || m.from !== this.hostId) break;
        try {
          this.game.joinWorld(cleanWorld(m.save));
        } catch (err) {
          console.warn("Could not use the host's world:", err);
          this.stop("Could not join");
          break;
        }
        this.inRoom = true;
        this.note = "";
        break;
      // From another player: where they are and what they are doing.
      case "p": {
        const peer = this.peers.get(m.from);
        if (!peer || !onMap(m.x) || !onMap(m.y) || !whole(m.l, LEVEL.CAVE3, LEVEL.SKY) || !whole(m.d, 0, 3)) break;
        peer.update({
          x: m.x,
          y: m.y,
          level: m.l,
          dir: m.d,
          held: itemDef(m.h) ? m.h : null,
          swimming: !!m.s,
          down: !!m.k,
          attacks: whole(m.a, 0, 1e9) ? m.a : 0,
        });
        break;
      }
    }
  }

  // Called every game tick.
  tick() {
    if (this.joining && ++this.waitTicks > JOIN_WAIT) this.stop("The host did not answer");
    for (const peer of this.peers.values()) peer.tick();
    this.sendPosition();
  }

  // Tell the others where our player is. It goes out ten times a second while
  // anything is changing, straight away on an attack so the swing shows on
  // time, and every two seconds regardless so that nobody is left guessing.
  sendPosition() {
    const p = this.game.player;
    if (!this.inRoom || !p) return;
    this.sendClock++;
    const m = {
      t: "p",
      x: p.x | 0,
      y: p.y | 0,
      d: p.dir,
      l: p.level.id,
      h: p.held ? p.held.id : 0,
      s: p.swimming ? 1 : 0,
      a: p.attacks,
      k: this.game.dead ? 1 : 0,
    };
    const text = JSON.stringify(m);
    const changed = this.sendClock % SEND_EVERY === 0 && text !== this.sentText;
    if (!changed && p.attacks === this.sentAttacks && this.sendClock % 120 !== 0) return;
    this.sentText = text;
    this.sentAttacks = p.attacks;
    this.send(m);
  }
}
