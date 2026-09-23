// ME 无限元件配方：自 1.20.1 源包 kubejs/server_scripts/AE2/infinity_cell.js 迁移。
// 源包是单物品 expatternprovider:infinity_cell + NBT(record) 输出，1.21 一个来源一个物品，
// 所以输出改成 createdelightcore:<流体id>_cell（与 startup_scripts/mods/ae2/eae/inf_cells.js 的注册 id 一一对应），
// 中间物沿用 Core 自带的 createdelightcore:incomplete_infinity_cell，配方形状与源包保持一致（注液 → 4096 次）。
if (global.hasAllMods(['ae2', 'create', 'extendedae', 'createdelightcore'])) {
  ServerEvents.recipes((event) => {
    const { create } = event.recipes;
    const id = (path) => `createdelightcore:ae2/infinity_cell/${path}`;
    const transitionalItem = 'createdelightcore:incomplete_infinity_cell';
    // 与 startup_scripts/mods/ae2/eae/inf_cells.js 保持同一份跳过表：ExtendedAE 自带的水/圆石元件不再重复注册。
    const MOD_PROVIDED = ['minecraft:water'];

    global.INFINITE_SOURCE_FLUIDS.forEach((fluid) => {
      if (MOD_PROVIDED.includes(fluid) || !global.fluidExists(fluid)) {
        return;
      }

      const cellId = fluid.replace(':', '_');

      create
        .sequenced_assembly(
          `createdelightcore:${cellId}_cell`,
          'ae2:cell_component_256k',
          create.filling(transitionalItem, [transitionalItem, Fluid.of(fluid, 1000)])
        )
        .loops(4096)
        .transitionalItem(transitionalItem)
        .id(id(cellId));
    });
  });
}
