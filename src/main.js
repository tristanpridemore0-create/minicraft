import { SCREEN_W, SCREEN_H } from "./constants.js";
import { Game } from "./game.js";

const canvas = document.getElementById("game");
canvas.width = SCREEN_W;
canvas.height = SCREEN_H;

const game = new Game(canvas);
// Handy for poking at the game from the browser console.
window.game = game;
game.start();
