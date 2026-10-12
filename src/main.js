import { SCREEN_W, SCREEN_H } from "./constants.js";
import { Game } from "./game.js";

const canvas = document.getElementById("game");
canvas.width = SCREEN_W;
canvas.height = SCREEN_H;

const game = new Game(canvas);
game.start();
