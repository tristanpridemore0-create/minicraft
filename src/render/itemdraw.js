import { C } from "./palette.js";
import { drawText } from "./font.js";
import { icon } from "./sprites.js";
import { itemDef } from "../items/defs.js";

// One inventory row: icon, then either the name (tools and furniture) or a
// count followed by the name (stackable things).
export function drawItem(ctx, slot, x, y, color = C(555)) {
  const def = itemDef(slot.id);
  ctx.drawImage(icon(slot.id), x, y);
  if (!def) return;
  if (def.kind === "tool" || def.kind === "furniture") {
    drawText(ctx, def.name, x + 8, y, color);
  } else {
    drawText(ctx, String(Math.min(slot.count, 999)), x + 8, y, C(222));
    drawText(ctx, def.name, x + 32, y, color);
  }
}
