export function checkProgress(game) {
  if (game.build) return;
  const p = game.player;
  const has = (id) => p.inv.has(id) || (p.held && p.held.id === id);
  const tell = (flag, text) => {
    game.flags[flag] = true;
    game.ui.toast(text);
  };
  if (!game.flags.wood && has("wood")) tell("wood", "Wood! Put the workbench down and press X at it.");
  if (!game.flags.stone && has("stone")) tell("stone", "Stone for stronger tools");
  if (!game.flags.iron && (has("iron") || has("ironOre"))) tell("iron", "Iron. Smelt it in a furnace");
  if (!game.flags.gem && has("gem")) tell("gem", "Gems. Craft a gem pick for the sky");
  if (!game.flags.sky && p.level.id === 1) tell("sky", "Find the Air Wizard");
}
