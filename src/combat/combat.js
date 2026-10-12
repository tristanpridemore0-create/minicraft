import { DIR } from "../constants.js";
import { toolBonus } from "../items/defs.js";
import { dropItems } from "../entities/itemEntity.js";
import { TextParticle } from "../entities/particles.js";
import { C } from "../render/palette.js";

export function playerAttack(game, player) {
  const dir = player.dir;
  let x0 = player.x - 8;
  let y0 = player.y - 8;
  let x1 = player.x + 8;
  let y1 = player.y + 8;
  if (dir === DIR.UP) {
    y0 -= 12;
    y1 -= 4;
  } else if (dir === DIR.DOWN) {
    y0 += 4;
    y1 += 12;
  } else if (dir === DIR.LEFT) {
    x0 -= 12;
    x1 -= 4;
  } else {
    x0 += 4;
    x1 += 12;
  }

  const item = player.activeItem();
  let dmg = 1 + toolBonus(item, "mob");
  if (player.stamina >= player.maxStamina - 1) dmg += 1;

  let hit = false;
  for (const e of player.level.entitiesIn(x0, y0, x1, y1, player)) {
    if (e.type !== "mob" && e.type !== "wizard") continue;
    const level = e.level;
    if (e.hurt(dmg, player.x, player.y, game)) level.add(new TextParticle(dmg, e.x, e.y, C(500)));
    hit = true;
  }

  const { tx, ty } = player.facingTile(dir);
  const drops = [];
  if (player.level.tryHitTile(tx, ty, player, drops)) hit = true;
  dropItems(player.level, tx * 16 + 8, ty * 16 + 8, drops);
  game.audio[hit ? "hit" : "swing"]();
}
