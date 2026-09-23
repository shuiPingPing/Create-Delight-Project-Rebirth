// ME 无限元件（ExtendedAE 的 custom_infinity_cell）。
// 1.20.1 源包用的是 expatternprovider:infinity_cell 单物品 + NBT(record) 的写法，
// 1.21 的 ExtendedAE 改成「一种来源一个物品」，由 KubeJS 逐个注册。
// 下面两项缺任何一个都会显示成黑紫块：
//   1. texture(...)   —— 物品栏/手上的物品模型（KubeJS 生成的 item/generated 模型，layer0 指向 ExtendedAE 自带贴图）；
//   2. cellModel(...) —— ME 驱动/元件仓内的方块渲染（AE2 StorageCellModels.registerModel，模型由本包 assets/extendedae 提供）。
// 元件表面那枚流体图标由 createdelightcore 自带的 ExtendedAeInfinityCellRenderer 按 ItemInfinityCell 类型统一叠加。
StartupEvents.registry('item', (event) => {
  if (!global.hasMod('extendedae')) {
    return;
  }

  const CELL_TEXTURE = 'extendedae:item/infinity_cell';
  const CELL_MODEL = 'extendedae:block/drive/infinity_cell';
  // ExtendedAE 自带水/圆石两种无限元件（extendedae:infinity_water_cell / infinity_cobblestone_cell），
  // 名称模板相同（都是「ME无限%s元件」），再注册一份只会让 JEI 里出现两个「ME无限水元件」→ 跳过。
  const MOD_PROVIDED = ['minecraft:water'];

  global.INFINITE_SOURCE_FLUIDS.forEach((fluid) => {
    if (MOD_PROVIDED.includes(fluid) || !global.fluidExists(fluid)) {
      return;
    }

    const cellId = fluid.replace(':', '_');

    event
      .create(`createdelightcore:${cellId}_cell`, 'extendedae:custom_infinity_cell')
      .fluidType(fluid)
      .cellModel(CELL_MODEL)
      .texture(CELL_TEXTURE);
  });
});
