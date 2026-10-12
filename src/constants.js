// Numbers and names that are used all over the game, kept in one place so each
// only has to be changed once.

// One square of the map is 16x16 pixels.
export const TILE = 16;
// Every level is 128 tiles wide and 128 tall.
export const MAP = 128;
// The game is drawn as a small 160x120 picture, which is what gives it chunky
// pixels...
export const VIEW_W = 160;
export const VIEW_H = 120;
// ...and that picture is then stretched to four times the size on the page.
export const SCALE = 4;
export const SCREEN_W = VIEW_W * SCALE;
export const SCREEN_H = VIEW_H * SCALE;

// The five levels, by number. Stairs up add 1 and stairs down take 1 away.
export const LEVEL = {
  SKY: 1,
  SURFACE: 0,
  CAVE1: -1,
  CAVE2: -2,
  CAVE3: -3,
};

// Which way something is facing. The numbers are paired up so that `dir ^ 1`
// gives the opposite way: down (0) and up (1), left (2) and right (3).
export const DIR = { DOWN: 0, UP: 1, LEFT: 2, RIGHT: 3 };

// What a tool is made of, weakest first. A higher number hits harder and costs
// less stamina to swing.
export const TIER = { WOOD: 0, ROCK: 1, IRON: 2, GOLD: 3, GEM: 4 };
// The five kinds of tool.
export const TOOL = { SHOVEL: 0, HOE: 1, SWORD: 2, PICK: 3, AXE: 4 };

// The names the browser stores the saved game and the key settings under (see
// save/save.js and input.js).
export const SAVE_KEY = "minicraft-save-v1";
export const BIND_KEY = "minicraft-binds-v1";
