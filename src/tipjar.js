// The tip jar: a link on top of the game that opens a page where players can
// leave a tip for the game's maker. The screen around it is drawn by
// render/ui.js; this file adds the one part a canvas cannot do, a real link.
//
// It has to be a real link because browsers only let a page open a new tab
// straight from a tap or a key press. The game reads its keys a moment later,
// in its own loop, which is too late. So a tap on the button follows the link
// itself, and a press of the attack key is caught here as it happens.

// Show the button whenever the tip jar screen is up, keep it over the game,
// and listen for the attack key on that screen.
export function initTipJar(game) {
  const link = document.createElement("a");
  link.className = "tip-link";
  link.textContent = "Open PayPal";
  link.target = "_blank";
  // The page that opens gets no way to reach back into the game.
  link.rel = "noopener noreferrer";
  link.hidden = true;
  document.body.append(link);
  const canvas = game.canvas;

  // Every frame: is the tip jar screen showing? If so, put the button over
  // the lower middle of the game picture, wherever that is on the page.
  const place = () => {
    const showing = game.ui.mode === "tip" && !!game.ui.tipUrl;
    if (link.hidden === showing) link.hidden = !showing;
    if (showing) {
      link.href = game.ui.tipUrl;
      const box = canvas.getBoundingClientRect();
      link.style.left = `${box.left + box.width / 2}px`;
      link.style.top = `${box.top + box.height * 0.75}px`;
      link.style.fontSize = `${Math.max(13, Math.round(box.width / 40))}px`;
    }
    requestAnimationFrame(place);
  };
  requestAnimationFrame(place);

  // The attack key on the tip jar screen opens the page, from inside the key
  // press so the browser allows it...
  const open = () => window.open(game.ui.tipUrl, "_blank", "noopener,noreferrer");
  const onTipScreen = () => game.ui.mode === "tip" && !!game.ui.tipUrl;
  window.addEventListener("keydown", (e) => {
    if (onTipScreen() && !e.repeat && (game.input.binds.attack || []).includes(e.code)) open();
  });
  // ...and so does the on-screen C button on a phone (see touch.js). It is
  // caught as the finger lifts, which is the moment a phone allows it.
  document.addEventListener("pointerup", (e) => {
    if (onTipScreen() && e.target instanceof Element && e.target.closest(".touch-c")) open();
  });
}
