# Approximations vs original Minicraft (2011)

The rules of play (stamina, tool damage, monster behaviour, the Air Wizard's attack, how tiles grow and spread, scoring) were re-implemented in JavaScript from a reading of the original game's published Java source. No original code, art, or sound is included. World generation, art, sound, saving, and a few conveniences listed below are this project's own.

## World generation

The original generator used Notch's 48-hour noise and cave-carving pass. This recreation uses seeded value-noise (same seed → same map) with the same *kinds* of regions: forest, plain, desert, mountain, ocean on the surface; iron / water / lava caves below; cloud islands in the sky. Exact coastline and vein shapes will not match a given original seed.

Staircases are aligned across levels. Sky stairs are ringed with hard rock that only a gem pickaxe can break.

## Lighting and day/night

Underground darkness is a per-pixel dithered overlay with round pools of light around the player, lanterns, and lava, in the style of the original. The light radii are this project's own choices (the player's is larger than the original's so caves are easier to read). A lantern lights your way from anywhere in your pack; in the original it only did so in your hand, which meant putting it away to fight.

There is no day/night cycle. As in the original, monsters are about at all hours: each level starts populated and tops itself up over time, keeping its distance from the player and from other creatures.

## Audio

Original sounds were tiny Java samples. This build uses Web Audio square-wave beeps for hit, swing, pickup, craft, hurt, death, and victory.

## Art

All sprites, tiles, and the font are newly drawn for this project. They follow the original's look: 16×16 tiles built from 8×8 quarters that blend into their neighbours, the muted six-level colour palette, hearts and stamina bolts along the bottom, and blue framed menus. None of it is copied from the 2011 sprite sheet.

## Combat and tools

These follow the original's numbers:

- An attack costs 1 stamina. Using the right tool on a tile costs a further 4 minus the tool's tier (6 minus the tier on ore) and does 10-19 damage plus 5 per tier; anything else is a 1-3 punch.
- Trees fall at 20 damage, rock at 50, hard rock at 200 (gem pickaxe only). Ore gives up to one piece per hit and breaks somewhere between the third and twelfth. Damage to trees and rock slowly wears off.
- Against monsters a hit does 1-3, plus a bonus for swords and axes that grows with the tier.
- Stamina refills one point every 10 ticks. Emptying it means a 40-tick wait at half walking speed first. Swimming costs a point a second, then health.
- Being hit knocks you back six pixels and makes you untouchable for half a second.
- Zombies chase within 50 pixels at half speed; slimes hop. Tougher colours live deeper and in the sky.
- The Air Wizard has 2000 health, keeps his distance, and when provoked stands still for two seconds and then throws 120 sparks in a double spiral. The sparks get faster below 1000 and again below 200 health.
- Cactus and ore hurt when you walk into them.

Differences: monsters and the player do not block each other here (the original's do), and monsters on levels you are not on stand still until you return.

## The living world

As in the original, a random fiftieth of the map gets a turn every tick: grass creeps onto bare dirt, water and lava run into neighbouring holes, crops and saplings grow, footprints in sand fade, and walking over farmland can trample it.

One difference: this project has a separate cave-floor tile, so rock mined underground leaves cave floor and rock mined on the surface leaves dirt.

## Farming

Farming pays better than in the original, where food was hard to come by and a farm slowly shrank:

- Ripe wheat gives back one or two seeds, not none or one. Wheat pulled up before it is ripe gives back the one seed that was planted.
- Tilling grass with a hoe always makes farmland, and turns up seeds one time in five with a wooden hoe, rising to every time with a gem hoe. In the original, one swing in five gave seeds and did not till.
- Harvesting ripe wheat with a hoe gives extra wheat: one more with a wooden hoe, up to five more with a gem hoe. It costs no more stamina than harvesting by hand.

Food heals the same as in the original, and there is still no healing over time.

## Controls and inventory

The item in your hand is separate from your pack, as in the original: attack uses it, and the menu key opens your pack or the furniture in front of you. Opening the pack puts the held item back on top. Dropping an item with Q is an addition.

## Death and saving

Original Minicraft had **no save** and death was a full restart. This recreation keeps that death rule (game over, no corpse run) but adds optional local save/load. The end screens show play time and score as the original did: 1 point per item picked up, 25 or 50 per slime or zombie multiplied by its level, and 1000 for the Air Wizard.

## Armor

Original Minicraft had **no armor**. This project adds four kinds, because a play-tester found the player too easily killed in the caves:

| Armor | Made from | Takes off each blow |
| --- | --- | --- |
| Cloth | 10 cloth, at a workbench | 1 |
| Iron | 10 iron, at an anvil | 2 |
| Gold | 10 gold, at an anvil | 3 |
| Gem | 50 gems, at an anvil | 4 |

Hold it and press the attack key to put it on. It only softens blows from monsters, the Air Wizard and his sparks, never below 1, and does nothing against lava, cactus, ore or drowning. It does not wear out. Cloth, which the original had no use for, is now what cloth armor is made of.

## Cloth

Zombies drop cloth. In the 2011 game cloth had no crafting recipe; here it makes cloth armor (see Armor above).

## Furniture

Workbench, chest, oven, furnace, anvil, and lantern match published recipes. Chests keep their contents when picked up with the power glove. Furniture can be pushed slowly by leaning on it and is not damaged by attacks.

## Key bindings

Original defaults were arrows, C (attack), X (menu). This build also binds WASD, Space, and E, and allows rebinding.

The on-screen touch controls are an addition; the original was keyboard only.

## Build mode

Build mode is an addition; the original had one way to play. Placing stone as a wall exists only there.

## Multiplayer

Multiplayer is an addition; the original was for one player. One player hosts their world and others join it with a room code.

- Shared: where each player is and what they are doing, every change to a tile, furniture, the contents of chests, and the monsters, Air Wizard and sparks near any player.
- Not shared: items lying on the ground, footprints in sand, and how damaged a half-broken tree or rock is. Each player has their own. So does each player for the monsters in parts of a level that nobody is near, which means a monster you walked away from may not be there when you come back.
- One player's browser runs the monsters on each level: the first to arrive there. If they leave, open a menu or lose their connection, another player on the level takes over. Monsters chase the nearest player, and each player's own browser decides when that player is hurt.
- A monster's drops and points go to the player who lands the last blow. Beating the Air Wizard wins the game for everybody in the room, the 1000 points go to whoever struck last, and play carries on afterwards.
- Only the host's game is saved. A guest's pack, held item, health and score are kept in the guest's own browser, filed under the world they belong to, and given back when the guest joins that world again. Build mode is left out.
- Dying in a room does not end the game. You come back at the starting point with full health and everything you were carrying. Alone, death is still a full restart.
- Opening your pack or pausing freezes your own player and what you see, but the world carries on for the other players and nothing can hurt you until you come back.
