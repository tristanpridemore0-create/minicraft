# Minicraft: notes for coding assistants

A browser remake of the 2011 game Minicraft, written in plain JavaScript. This file tells AI coding tools how the project works. People should start with `README.md`.

## This is a learning project

The owner is learning to program by working on this game. That changes how you should help:

- Say what you are going to change and why, in plain language, before you change it.
- Keep changes small. One idea per change, so each one can be read and understood.
- When asked how to do something, explain it and point to the file and function. Do not write the code unless asked to.
- Do not rewrite whole files or reorganise the project unless asked to.

## Running the game

There is nothing to install and no build step. The game uses ES modules, which need a web server; opening `index.html` straight from disk will not work.

```bash
npx --yes serve . -p 5173
```

or

```bash
python -m http.server 5173
```

Then open http://localhost:5173. Add `?touch=1` to the address to see the phone controls on a computer.

## Checking a change

There are no automated tests. After a change:

1. Reload the page and look in the browser console for errors.
2. Play the part you changed.
3. If you touched the player, the level rules or the game loop, try both **New world** and **Build mode**.

The running game is available in the console as `window.game`.

## Where things are

- `index.html`, `styles.css`: the page. The layout of the phone controls is in `styles.css`.
- `src/main.js`: starts everything.
- `src/game.js`: the game loop (60 ticks a second), starting a world, saving and loading, monster spawning.
- `src/input.js`: keyboard and touch input, as named actions such as `attack` and `up`.
- `src/touch.js`: the on-screen controls, tilt to walk, and the guard against the page zooming.
- `src/world/`: `generator.js` builds the world from a seed, `level.js` holds the tile rules (digging, chopping, growing, spreading), `tiles.js` lists the tile types.
- `src/entities/`: `player.js`, `mobs.js` (zombie, slime, Air Wizard, sparks), `furniture.js`, `itemEntity.js` (dropped items), `particles.js`, and `entity.js` for the movement and knockback they share.
- `src/items/`: `defs.js` defines every item, `inventory.js` is the pack.
- `src/crafting/recipes.js`: what each workbench, oven, furnace and anvil can make.
- `src/render/`: `renderer.js` draws the world, `tileart.js` the terrain, `sprites.js` the characters and icons, `ui.js` the menus, `font.js` the text, `palette.js` the colours.
- `src/save/save.js`: saving to the browser's storage.
- `src/progression/progress.js`: the hint messages.

## Conventions

- Plain ES modules with no dependencies. Do not add packages, a framework or a build step.
- The screen is 160x120 pixels, scaled up. Tiles are 16x16, the map is 128x128 tiles, and there are five levels: `1` is the sky, `0` the surface, `-1` to `-3` the caves.
- Colours come from `C(n)` in `palette.js`: three digits from 0 to 5 for red, green and blue. `C(141)` is the grass green.
- Sprites are lists of strings, one letter per pixel, with `.` for see-through. Every row in a sprite must be the same length.
- On-screen text is 8 pixels a character, so 20 characters fit across. Item names must be 9 characters or fewer for tools and furniture, and 6 or fewer for things that stack.
- The rules follow the original game where practical. `APPROXIMATIONS.md` lists what differs; update it when you change a rule, and update `README.md` when you change the controls.
- There are two ways to play, normal and build mode (`game.build`). A change to the rules usually needs to behave sensibly in both.
- Saves carry a `version` number (`save.js`). Keep older saves loading.
- Every file starts with a comment saying what it is for, and every function has one saying what it does. Comments are in plain language and explain why, not only what. When you change code, update the comment above it so the two still agree.

## Publishing

This folder is the website, published at https://minicraft.doublec.biz. Any file that is part of the project but not part of the website, like this one, must be listed in `.assetsignore`. Do not publish or deploy the site unless asked to.

## Changes go through pull requests

Work on a branch and open a pull request against `main`. Say what changed and how you checked it. Do not push straight to `main`.
