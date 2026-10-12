import { SCREEN_W, SCREEN_H } from "./constants.js";
import { Game } from "./game.js";
import { initTouch } from "./touch.js";

const canvas = document.getElementById("game");
canvas.width = SCREEN_W;
canvas.height = SCREEN_H;

const game = new Game(canvas);
// Handy for poking at the game from the browser console.
window.game = game;
initTouch(game);

// Save when the page goes out of view: a closed tab, a switch to another app,
// or a phone screen turning off. Phones often give no other warning.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") game.saveOnLeave();
});
window.addEventListener("pagehide", () => game.saveOnLeave());
game.start();
