import { BIND_KEY } from "./constants.js";

const DEFAULT_BINDS = {
  up: ["KeyW", "ArrowUp"],
  down: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  attack: ["Space", "KeyC"],
  menu: ["KeyE", "KeyX"],
  pause: ["Escape"],
  drop: ["KeyQ"],
};

export class Input {
  constructor() {
    this.binds = loadBinds();
    this.down = new Set();
    this.pressed = new Set();
    this.waiting = null;
    // Actions held or just pressed on the on-screen controls. These are kept
    // by action rather than by key, so rebinding keys never affects them.
    this.touchDown = new Set();
    this.touchPressed = new Set();
    this.listen();
  }

  listen() {
    window.addEventListener("keydown", (e) => {
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
      if (this.waiting) {
        e.preventDefault();
        this.setBind(this.waiting.action, this.waiting.slot, e.code);
        this.waiting = null;
        return;
      }
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener("keyup", (e) => this.down.delete(e.code));
    window.addEventListener("blur", () => {
      this.down.clear();
      this.touchDown.clear();
    });
  }

  setBind(action, slot, code) {
    const list = this.binds[action] ? [...this.binds[action]] : [];
    list[slot] = code;
    this.binds[action] = list;
    localStorage.setItem(BIND_KEY, JSON.stringify(this.binds));
  }

  startRebind(action, slot) {
    this.waiting = { action, slot };
  }

  touchPress(action) {
    // The key-rebinding screen waits for a key. With no keyboard, a touch
    // backs out of the wait instead of leaving the screen stuck.
    if (this.waiting) {
      this.waiting = null;
      return;
    }
    if (!this.touchDown.has(action)) this.touchPressed.add(action);
    this.touchDown.add(action);
  }

  touchRelease(action) {
    this.touchDown.delete(action);
  }

  held(action) {
    return this.touchDown.has(action) || (this.binds[action] || []).some((c) => this.down.has(c));
  }

  just(action) {
    return this.touchPressed.has(action) || (this.binds[action] || []).some((c) => this.pressed.has(c));
  }

  justCode(code) {
    return this.pressed.has(code);
  }

  endFrame() {
    this.pressed.clear();
    this.touchPressed.clear();
  }
}

function loadBinds() {
  try {
    const raw = localStorage.getItem(BIND_KEY);
    if (!raw) return structuredClone(DEFAULT_BINDS);
    return { ...structuredClone(DEFAULT_BINDS), ...JSON.parse(raw) };
  } catch {
    return structuredClone(DEFAULT_BINDS);
  }
}

export { DEFAULT_BINDS };
