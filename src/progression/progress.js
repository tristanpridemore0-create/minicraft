// Hints for a new player. Each pops up the first time something happens, such
// as picking up wood, and never again in that world.

// Called every tick while playing.
export function checkProgress(game) {
  // Build mode starts with everything, so the hints would only get in the way.
  if (game.build) return;
  const p = game.player;
  // Counts the item in hand as well as the pack.
  const has = (id) => p.inv.has(id) || (p.held && p.held.id === id);
  // Show a hint and remember that it has been shown. The flags are part of the
  // saved game.
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
