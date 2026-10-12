# Approximations vs original Minicraft (2011)

This project was implemented from public descriptions of Notch's Ludum Dare 22 game (wiki pages, contemporary write-ups). The original Java binary was not downloaded or decompiled.

## World generation

The original generator used Notch's 48-hour noise and cave-carving pass. This recreation uses seeded value-noise (same seed → same map) with the same *kinds* of regions: forest, plain, desert, mountain, ocean on the surface; iron / water / lava caves below; cloud islands in the sky. Exact coastline and vein shapes will not match a given original seed.

Staircases are aligned across levels. Sky stairs are ringed with hard rock that only a gem pickaxe can break.

## Lighting and day/night

Underground light is a coarse tile radius around the player, lanterns, and lava rather than the original per-pixel shader. Surface night still darkens the HUD cycle and enables monster spawns; the overworld stays readable (original night was also playable, not pitch black).

## Audio

Original sounds were tiny Java samples. This build uses Web Audio square-wave beeps for hit, swing, pickup, craft, hurt, death, and victory.

## Art

All sprites and tiles are newly drawn procedural pixel art in a limited palette. They follow the original's 16×16 top-down look (small character, blob slimes, simple zombies) but are not copies of the 2011 sprite sheet.

## Combat and tools

Tool tiers, energy costs, and extra damage vs trees / rock / ore follow published wiki values. Exact original knockback, i-frames, and Air Wizard spark patterns are approximated. The wizard has 2000 HP and ranged sparks as described.

## Death and saving

Original Minicraft had **no save** and death was a full restart. This recreation keeps that death rule (game over, no corpse run) but adds optional local save/load as required for a modern browser build.

## Armor

Original Minicraft had **no armor**. Armor from later Minicraft+ / Minecraft was not added.

## Cloth

Zombies drop cloth. In the 2011 game cloth had no crafting recipe; it is still collected here for fidelity.

## Furniture

Workbench, chest, oven, furnace, anvil, and lantern match published recipes. Chests keep their contents when picked up with the power glove. Furniture can be pushed by walking into it.

## Controls

Original defaults were arrows, C (attack), X (menu). This build also binds WASD, Space, and E, and allows rebinding.
