// Keyboard and touch input. The rest of the game never asks "is the W key
// down?". It asks about actions such as "up" or "attack", and this file works
// out the answer from whichever keys or on-screen buttons are set to that
// action.

import { BIND_KEY } from "./constants.js";

// Which keys trigger each action to begin with. The names are key codes: where
// the key sits on the keyboard, not the letter printed on it.
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

// Keeps track of what is pressed.
export class Input {
  // Load the key settings and start listening.
  constructor() {
    this.binds = loadBinds();
    // Keys that are held down right now.
    this.down = new Set();
    // Keys that went down since the last game tick. This is emptied every tick,
    // so a press is reported once however long the key is held.
    this.pressed = new Set();
    // Set while the Controls screen is waiting for the player to press the new
    // key for an action.
    this.waiting = null;
    // Actions held or just pressed on the on-screen controls. These are kept
    // by action rather than by key, so rebinding keys never affects them.
    this.touchDown = new Set();
    this.touchPressed = new Set();
    this.listen();
  }

  // Start listening to the keyboard.
  listen() {
    window.addEventListener("keydown", (e) => {
      // Stop the browser's own reaction to these keys, such as scrolling the
      // page.
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
      // Changing a key: this press is the new key, not a game action.
      if (this.waiting) {
        e.preventDefault();
        this.setBind(this.waiting.action, this.waiting.slot, e.code);
        this.waiting = null;
        return;
      }
      // Holding a key makes the browser repeat it. Only the first counts as a
      // press.
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener("keyup", (e) => this.down.delete(e.code));
    // If the window loses focus the key releases never arrive, so forget
    // everything that was held.
    window.addEventListener("blur", () => {
      this.down.clear();
      this.touchDown.clear();
    });
  }

  // Change the key for an action and remember it in the browser's storage. Each
  // action has up to two keys; `slot` says which of them to replace.
  setBind(action, slot, code) {
    const list = this.binds[action] ? [...this.binds[action]] : [];
    list[slot] = code;
    this.binds[action] = list;
    localStorage.setItem(BIND_KEY, JSON.stringify(this.binds));
  }

  // Make the next key press become the new key for an action.
  startRebind(action, slot) {
    this.waiting = { action, slot };
  }

  // Called by the on-screen controls (touch.js) when a button or direction goes
  // down...
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

  // ...and when it is let go.
  touchRelease(action) {
    this.touchDown.delete(action);
  }

  // Is this action being held down right now? Used for walking.
  held(action) {
    return this.touchDown.has(action) || (this.binds[action] || []).some((c) => this.down.has(c));
  }

  // Was this action pressed since the last tick? Used for things that should
  // happen once per press, such as attacking or moving a menu cursor.
  just(action) {
    return this.touchPressed.has(action) || (this.binds[action] || []).some((c) => this.pressed.has(c));
  }

  // The same, for one particular key. Not used at the moment.
  justCode(code) {
    return this.pressed.has(code);
  }

  // Called at the end of every game tick to forget that tick's presses.
  endFrame() {
    this.pressed.clear();
    this.touchPressed.clear();
  }
}

// Read the saved key settings, falling back to the defaults if there are none
// or they cannot be read. structuredClone makes a full copy, so the defaults
// themselves are never changed.
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
