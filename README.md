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

You hold one item at a time. Press **X** to open your pack, pick something with up and down, and press **C** to take it in hand. Closing the pack without choosing leaves your hands empty.

**C** then does whatever that item is for:

- Empty hands or a tool: hit what is in front of you. The right tool does far more (axe on trees, pickaxe on rock and ore, shovel and hoe on the ground).
- Furniture: put it down.
- Power glove: pick furniture up.
- Seeds, acorns, flowers, sand, dirt: plant or place them.
- Food: eat it, if you are hurt and have 5 stamina to spare.

Walk up against a workbench, oven, furnace, anvil or chest and press **X** to open it. In a chest, left and right switch between the chest and your pack.

Every swing costs stamina. Run out and you are worn out for a moment: the stamina row flashes, you move at half speed, and nothing comes back until it stops.

You start with a **workbench** and a **power glove** in your pack and nothing in your hands. Punch a tree for wood, put the workbench down, and craft wooden tools.

## Build mode

Pick **Build mode** on the title screen for a world to build in and explore with no danger. There are no monsters and no Air Wizard, nothing hurts you, you never tire, and you can see further underground. You start with gem tools, every kind of furniture and a stack of things to place, and none of it runs out. Everything breaks in one hit.

In build mode only, **Stone** can be put down as a rock wall, so you can build with it. Break a wall again with the pickaxe.

There is one save slot, shared between build mode and the normal game.

## Progression

1. Wood tools at a workbench
2. Stone tools, oven, furnace
3. Stairs in mountains → iron caves
4. Smelt iron, craft anvil
5. Gold caves (water), gem caves (lava)
6. Gem pickaxe breaks **hard rock** around sky stairs
7. Sky: Air Wizard

## Save

Progress is stored in the browser (`localStorage`). The game autosaves about every two minutes. Pause → Save also works.

The same numeric seed regenerates the same terrain; tile edits, crop growth, your pack and score, furniture, dropped items, and the Air Wizard's health are stored as a save overlay. Monsters are not saved; the world repopulates on load.

## Notes

See `APPROXIMATIONS.md` for what follows the original game's rules and what is this project's own.
