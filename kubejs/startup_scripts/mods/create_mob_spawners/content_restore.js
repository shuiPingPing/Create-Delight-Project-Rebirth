// CDC 2.0 删除了 life_matter 物品与 genetic_culture 流体（1.x 内容），此处用 KubeJS 补回，
// 供 create_mob_spawners 的基因培养系统使用。
StartupEvents.registry('item', (event) => {
  event.create('createdelightcore:life_matter').texture('createdelightcore:item/life_matter');
});

StartupEvents.registry('fluid', (event) => {
  event
    .create('createdelightcore:genetic_culture')
    .stillTexture('create:fluid/milk_still')
    .flowingTexture('create:fluid/milk_flow')
    .noBucket();
});
