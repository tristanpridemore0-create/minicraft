# Approximations vs original Minicraft (2011)

This project was implemented from public descriptions of Notch's Ludum Dare 22 game (wiki pages, contemporary write-ups). The original Java binary was not downloaded or decompiled.

## World generation

The original generator used Notch's 48-hour noise and cave-carving pass. This recreation uses seeded value-noise (same seed → same map) with the same *kinds* of regions: forest, plain, desert, mountain, ocean on the surface; iron / water / lava caves below; cloud islands in the sky. Exact coastline and vein shapes will not match a given original seed.

Staircases are aligned across levels. Sky stairs are ringed with hard rock that only a gem pickaxe can break.

## Lighting and day/night

Underground darkness is a per-pixel dithered overlay with round pools of light around the player, lanterns, and lava, in the style of the original. The light radii are this project's own choices (the player's is larger than the original's so caves are easier to read).

There is a day/night clock that only controls surface monster spawns; nothing on screen changes at night. The 2011 game is believed to have had no day/night cycle at all.

## Audio

Original sounds were tiny Java samples. This build uses Web Audio square-wave beeps for hit, swing, pickup, craft, hurt, death, and victory.

## Art

All sprites, tiles, and the font are newly drawn for this project. They follow the original's look: 16×16 tiles built from 8×8 quarters that blend into their neighbours, the muted six-level colour palette, hearts and stamina bolts along the bottom, and blue framed menus. None of it is copied from the 2011 sprite sheet.

## Combat and tools

Tool tiers exist as in the original, but damage numbers, stamina costs, knockback, invulnerability frames, and the Air Wizard's attack pattern are this project's own approximations and have not been checked against the original source. The wizard has 2000 HP and ranged sparks as described.

Cactus and ore hurt when you walk into them, not when you stand beside them. Ore needs a pickaxe.

## Death and saving

Original Minicraft had **no save** and death was a full restart. This recreation keeps that death rule (game over, no corpse run) but adds optional local save/load as required for a modern browser build.

## Armor

Original Minicraft had **no armor**. Armor from later Minicraft+ / Minecraft was not added.

## Cloth

Zombies drop cloth. In the 2011 game cloth had no crafting recipe; it is still collected here for fidelity.

## Furniture

Workbench, chest, oven, furnace, anvil, and lantern match published recipes. Chests keep their contents when picked up with the power glove. Furniture can be pushed by walking into it and is not damaged by attacks.

## Controls

Original defaults were arrows, C (attack), X (menu). This build also binds WASD, Space, and E, and allows rebinding.
