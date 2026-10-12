export const TILE = 16;
export const MAP = 128;
export const VIEW_W = 160;
export const VIEW_H = 120;
export const SCALE = 4;
export const SCREEN_W = VIEW_W * SCALE;
export const SCREEN_H = VIEW_H * SCALE;

export const LEVEL = {
  SKY: 1,
  SURFACE: 0,
  CAVE1: -1,
  CAVE2: -2,
  CAVE3: -3,
};

export const DIR = { DOWN: 0, UP: 1, LEFT: 2, RIGHT: 3 };

export const TIER = { WOOD: 0, ROCK: 1, IRON: 2, GOLD: 3, GEM: 4 };
export const TOOL = { SHOVEL: 0, HOE: 1, SWORD: 2, PICK: 3, AXE: 4 };

export const SAVE_KEY = "minicraft-save-v1";
export const BIND_KEY = "minicraft-binds-v1";
