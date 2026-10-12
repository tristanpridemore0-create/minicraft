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

// Phones zoom the page on a pinch or a double tap. In a game that is always an
// accident, and a nasty one: the controls are pinned to the page rather than
// to the glass, so zooming slides them out of reach.
function guardZoom(root) {
  const zoomed = () => !!window.visualViewport && window.visualViewport.scale > 1.01;

  // First, stop it happening. Once zoomed we stop interfering, so the same
  // pinch that caused it can undo it.
  const stop = (e) => {
    if (!zoomed() && e.cancelable) e.preventDefault();
  };
  const active = { passive: false };
  // Safari reports a pinch as its own "gesture" events.
  for (const type of ["gesturestart", "gesturechange", "gestureend"]) document.addEventListener(type, stop, active);
  // Elsewhere a pinch is two fingers moving, and nothing here needs to scroll.
  document.addEventListener("touchstart", (e) => e.touches.length > 1 && stop(e), active);
  document.addEventListener("touchmove", stop, active);
  // Two quick taps zoom as well, and mashing the C button is exactly that.
  let lastTap = 0;
  document.addEventListener(
    "touchend",
    (e) => {
      const now = Date.now();
      if (now - lastTap < 350) stop(e);
      lastTap = now;
    },
    active
  );

  // Second, if the page ends up zoomed anyway, keep the controls on the glass
  // by shrinking and sliding them to match the part of the page in view, and
  // ask the browser to snap back.
  if (!window.visualViewport) return;
  const meta = document.querySelector('meta[name="viewport"]');
  const normal = meta ? meta.content : "";
  let resetting = 0;
  const sync = () => {
    const v = window.visualViewport;
    const z = zoomed();
    document.body.classList.toggle("touch-zoomed", z);
    root.style.transform = z ? `translate(${v.offsetLeft}px, ${v.offsetTop}px) scale(${1 / v.scale})` : "";
    if (z && meta && !resetting) {
      // Re-stating the scale limits makes many phones snap back inside them.
      meta.content = `${normal}, minimum-scale=1.0`;
      resetting = setTimeout(() => {
        meta.content = normal;
        resetting = 0;
      }, 400);
    }
  };
  window.visualViewport.addEventListener("resize", sync);
  window.visualViewport.addEventListener("scroll", sync);
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

  const note = el("div", "touch-zoom-note", "Zoomed in. Pinch out to fix.");

  root.append(pad, buttons, pause, note);

  // A full-screen button, where the browser can do it. iPhones cannot from
  // inside Safari; there the way to lose the address bar is to add the game
  // to the home screen. Opened from there it is already full screen, so the
  // button is left out.
  const installed = matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches || navigator.standalone;
  const page = document.documentElement;
  if (!installed && document.fullscreenEnabled && page.requestFullscreen) {
    const full = el("button", "touch-full", "[ ]");
    full.setAttribute("aria-label", "Full screen");
    full.addEventListener("pointerup", () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else page.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
    });
    root.append(full);
  }
  document.body.classList.add("touch-on");
  document.body.append(root);

  // Browsers keep sound off until the page is touched; the canvas listens
  // for that, but thumbs land on these controls first. Some phones only
  // count the finger lifting, so listen for both ends of the tap.
  const unlock = () => game.audio.unlock();
  root.addEventListener("pointerdown", unlock);
  root.addEventListener("pointerup", unlock);
  document.addEventListener("touchend", unlock);
  root.addEventListener("contextmenu", (e) => e.preventDefault());

  guardZoom(root);

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
