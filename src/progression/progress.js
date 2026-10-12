export function checkProgress(game) {
  const inv = game.player.inv;
  if (!game.flags.wood && inv.has("wood")) {
    game.flags.wood = true;
    game.ui.toast("Wood! Place the workbench");
  }
  if (!game.flags.stone && inv.has("stone")) {
    game.flags.stone = true;
    game.ui.toast("Stone for stronger tools");
  }
  if (!game.flags.iron && (inv.has("iron") || inv.has("ironOre"))) {
    game.flags.iron = true;
    game.ui.toast("Iron. Smelt it in a furnace");
  }
  if (!game.flags.gem && inv.has("gem")) {
    game.flags.gem = true;
    game.ui.toast("Gems. Craft a gem pick for the sky");
  }
  if (!game.flags.sky && game.player.level.id === 1) {
    game.flags.sky = true;
    game.ui.toast("Find the Air Wizard");
  }
}
