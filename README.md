# Minicraft (browser recreation)

A complete, playable recreation of **Minicraft (2011)** by Markus "Notch" Persson for Ludum Dare 22. This is the top-down 2D survival/crafting game, not Minecraft.

Open `index.html` through a local static server. Do not load it as a `file://` URL (ES modules require HTTP).

## Run locally

```bash
npx --yes serve . -p 5173
```

Or:

```bash
python -m http.server 5173
```

Then open http://localhost:5173

Those two run the game for one player. To try multiplayer on your own computer you also need the small server that connects players, which needs [Node.js](https://nodejs.org) installed:

```bash
npm run multiplayer
```

Then open http://localhost:8787 in two browser tabs, host in one and join from the other.

## Goal

Gather resources, craft through wood → rock → iron → gold → gem tools, reach the sky, and defeat the **Air Wizard**.

## Controls (defaults, rebindable)

| Action | Keys |
| --- | --- |
| Move | WASD or arrows |
| Attack / use the item in your hand | C or Space |
| Inventory / open furniture | X or E |
| Pause | Escape |
| Drop item (in inventory) | Q |

On a phone or tablet, on-screen controls appear by themselves: a thumb pad to move, **C** and **X** buttons that do what those keys do, and a pause button in the corner. Add `?touch=1` to the address to see them on a computer, or `?touch=0` to turn them off.

The **TILT** button turns on tilt to walk: lean the phone and you walk that way. However you are holding the phone when you switch it on counts as level. Menus still use the pad. An iPhone asks for permission to use motion the first time.

To play full screen on a phone, with no address bar: on an iPhone, open the game in Safari, tap **Share**, then **Add to Home Screen**, and start it from the new icon. On Android, use the full-screen button next to pause, or **Add to Home screen** from the browser menu.

You hold one item at a time. Press **X** to open your pack, pick something with up and down, and press **C** to take it in hand. Closing the pack without choosing leaves your hands empty.

**C** then does whatever that item is for:

- Empty hands or a tool: hit what is in front of you. The right tool does far more (axe on trees, pickaxe on rock and ore, shovel and hoe on the ground).
- Furniture: put it down.
- Power glove: pick furniture up.
- Seeds, acorns, flowers, sand, dirt: plant or place them.
- Food: eat it, if you are hurt and have 5 stamina to spare.
- Armor: put it on. It shows under the item in your hand, and takes some of the sting out of every blow from a monster. Make cloth armor from 10 cloth at a workbench, and iron, gold and gem armor at an anvil.

To farm, till grass with a hoe (it sometimes turns up seeds, more often with a better hoe), plant seeds on the farmland, and pick the wheat when it turns gold. Picking it with a hoe gets you extra wheat. An oven bakes 4 wheat into bread.

Caves are dark. A lantern lights up more around you while it is anywhere in your pack, so you can hold a sword and still see. Put one down to light a spot for good.

Walk up against a workbench, oven, furnace, anvil or chest and press **X** to open it. In a chest, left and right switch between the chest and your pack.

Every swing costs stamina. Run out and you are worn out for a moment: the stamina row flashes, you move at half speed, and nothing comes back until it stops.

You start with a **workbench** and a **power glove** in your pack and nothing in your hands. Punch a tree for wood, put the workbench down, and craft wooden tools.

## Build mode

Pick **Build mode** on the title screen for a world to build in and explore with no danger. There are no monsters and no Air Wizard, nothing hurts you, you never tire, and you can see further underground. You start with gem tools, every kind of furniture and a stack of things to place, and none of it runs out. Everything breaks in one hit.

In build mode only, **Stone** can be put down as a rock wall, so you can build with it. Break a wall again with the pickaxe.

There is one save slot, shared between build mode and the normal game.

## Multiplayer

Play in the same world with friends, each on their own phone or computer. It works the same whether they are in the room with you or far away.

1. One player starts or continues a world, pauses, and picks **Host game**. A four-letter room code appears. It stays on the pause screen and in the bottom corner of the screen.
2. Everyone else picks **Join game** on the title screen and types that code. They appear where the host is standing.

It works in both the normal game and build mode, with up to eight players in a room.

What everyone shares:

- You see each other walk, swim and swing.
- Digging, chopping, mining, planting and building.
- Furniture, and what is inside chests.
- Monsters. Everyone on a level sees and fights the same ones, and they chase whoever is nearest. Whoever lands the last blow gets the drops and the points.
- The Air Wizard and his sparks. When he is beaten, everybody in the room wins, and can carry on playing.

What is not shared yet:

- Items lying on the ground. To give a friend something, put it in a chest.

Good to know:

- The world belongs to the host, and only the host's game is saved. A guest's own saved game is left alone.
- A guest keeps what they are carrying. Leave a friend's world and join it again later, and your pack, the item in your hand, your hearts and your score are as you left them. This is remembered on the phone or computer you played on, separately for each world, and not in build mode.
- If the host leaves or loses their connection, the room closes and the guests go back to the title screen.
- If you die in a room, you come back at the starting point with everything you were carrying.

## Progression

1. Wood tools at a workbench
2. Stone tools, oven, furnace
3. Stairs in mountains → iron caves
4. Smelt iron, craft anvil
5. Gold caves (water), gem caves (lava)
6. Gem pickaxe breaks **hard rock** around sky stairs
7. Sky: Air Wizard

## Save

Progress is stored in the browser (`localStorage`), so it stays on that device and browser. The game autosaves about every two minutes and whenever you leave the page or switch away from it. Pause → Save also works.

The same numeric seed regenerates the same terrain; tile edits, crop growth, your pack and score, furniture, dropped items, and the Air Wizard's health are stored as a save overlay. Monsters are not saved; the world repopulates on load.

## Publishing

The game is published at https://minicraft.tri-boi.workers.dev by Cloudflare. Every merge to `main` publishes itself there a minute or two later. There is no build step: the files in this folder are the website.

A second copy at https://minicraft.doublec.biz is updated by hand, so it can be a little behind.

- `wrangler.jsonc` tells Cloudflare which site this is.
- `server/worker.js` is the multiplayer server. It is the one file that runs on Cloudflare and not in the player's browser, and all it does is pass messages between the players in a room.
- `.assetsignore` lists the files that are part of the project but not the website, such as this README. Anything not listed there is published, so add a line for any new file that should stay private to the repo.

## Notes

See `APPROXIMATIONS.md` for what follows the original game's rules and what is this project's own.
