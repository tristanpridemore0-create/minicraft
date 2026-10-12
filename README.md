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
| Attack / confirm | Space or C |
| Inventory / use | E or X |
| Pause | Escape |
| Drop item (in inventory) | Q |

Face a tile or furniture and press **use**:

- Empty hand / most items: open inventory
- Power glove: pick up furniture
- Furniture in hand: place it
- Facing a workbench, oven, furnace, or anvil: crafting
- Facing a chest: transfer items
- Food: eat if you have stamina and missing health

You start with a **power glove** and a **workbench**. Place the bench, punch trees, then craft wooden tools.

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

The same numeric seed regenerates the same terrain; tile edits, inventory, and furniture are stored as a save overlay.

## Notes

See `APPROXIMATIONS.md` for behaviors that could not be verified against the original binary and were implemented from public descriptions.
