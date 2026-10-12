// On-screen controls for phones and tablets: a thumb pad on the left and two
// buttons on the right. The buttons are labelled C and X, after the keys they
// stand in for, so the hints in the game read the same on every device.

// How far the thumb must move from the middle of the pad, as a fraction of
// its radius, before a direction counts.
const DEAD_ZONE = 0.28;
// In open play the pad is 8-way: an axis is on when it carries at least this
// share of the push. In menus it is 4-way, so a sloppy "up" is never also "left".
const AXIS_SHARE = 0.38;
const DIRECTIONS = ["up", "down", "left", "right"];

function el(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function initTouch(game) {
  const forced = new URLSearchParams(location.search).get("touch");
  if (forced === "0") return;
  let built = false;
  const enable = () => {
    if (built) return;
    built = true;
    build(game);
  };
  // Show the controls straight away when the main pointer is a finger, or
  // when asked for with ?touch=1. Otherwise wait for a first real touch, so
  // a laptop with a touchscreen is left alone until someone uses it.
  if (forced === "1" || matchMedia("(pointer: coarse)").matches) enable();
  else window.addEventListener("touchstart", enable, { once: true, passive: true });
}

function build(game) {
  const input = game.input;
  const root = el("div", "touch");
  root.id = "touch";

  const pad = el("div", "touch-pad");
  const knob = el("div", "touch-knob");
  pad.append(knob);

  const buttons = el("div", "touch-buttons");
  const use = el("button", "touch-btn touch-c", "C");
  const pack = el("button", "touch-btn touch-x", "X");
  use.append(el("span", "touch-label", "use"));
  pack.append(el("span", "touch-label", "pack"));
  buttons.append(pack, use);

  const pause = el("button", "touch-pause", "II");
  pause.setAttribute("aria-label", "Pause");

  root.append(pad, buttons, pause);
  document.body.classList.add("touch-on");
  document.body.append(root);

  // Browsers keep sound off until the page is touched; the canvas listens
  // for that, but thumbs land on these controls first.
  root.addEventListener("pointerdown", () => game.audio.unlock());
  root.addEventListener("contextmenu", (e) => e.preventDefault());

  // --- thumb pad ---
  let padPointer = null;

  const steer = (dx, dy) => {
    const mag = Math.hypot(dx, dy);
    const want = { up: false, down: false, left: false, right: false };
    if (mag > DEAD_ZONE) {
      if (game.ui.mode !== "play") {
        if (Math.abs(dx) > Math.abs(dy)) want[dx < 0 ? "left" : "right"] = true;
        else want[dy < 0 ? "up" : "down"] = true;
      } else {
        want.left = dx / mag < -AXIS_SHARE;
        want.right = dx / mag > AXIS_SHARE;
        want.up = dy / mag < -AXIS_SHARE;
        want.down = dy / mag > AXIS_SHARE;
      }
    }
    for (const d of DIRECTIONS) {
      if (want[d]) input.touchPress(d);
      else input.touchRelease(d);
    }
  };

  const track = (e) => {
    const box = pad.getBoundingClientRect();
    const r = box.width / 2;
    let dx = (e.clientX - (box.left + r)) / r;
    let dy = (e.clientY - (box.top + r)) / r;
    const mag = Math.hypot(dx, dy);
    if (mag > 1) {
      dx /= mag;
      dy /= mag;
    }
    knob.style.transform = `translate(${dx * r * 0.55}px, ${dy * r * 0.55}px)`;
    steer(dx, dy);
  };

  const letGo = (e) => {
    if (e.pointerId !== padPointer) return;
    padPointer = null;
    knob.style.transform = "";
    steer(0, 0);
  };

  pad.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    padPointer = e.pointerId;
    try {
      pad.setPointerCapture(e.pointerId);
    } catch {
      // Not every pointer can be captured; the pad still works without it.
    }
    track(e);
  });
  pad.addEventListener("pointermove", (e) => {
    if (e.pointerId === padPointer) track(e);
  });
  pad.addEventListener("pointerup", letGo);
  pad.addEventListener("pointercancel", letGo);

  // --- buttons ---
  const bind = (node, action) => {
    const release = () => {
      node.classList.remove("held");
      input.touchRelease(action);
    };
    node.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      node.classList.add("held");
      input.touchPress(action);
    });
    node.addEventListener("pointerup", release);
    node.addEventListener("pointercancel", release);
    node.addEventListener("pointerleave", release);
  };
  bind(use, "attack");
  bind(pack, "menu");
  bind(pause, "pause");
}
