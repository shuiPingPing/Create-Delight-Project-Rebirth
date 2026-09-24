// 源：CDR1201 kubejs/startup_scripts/creative_tab/createdieselgenerators.js（1.20.1）
// 迁移到 1.21.1：剔除 4 个 1.21.1 已不存在的物品
StartupEvents.modifyCreativeTab('createdieselgenerators:cdg_creative_tab', (e) => {
  e.remove([
    Item.of('createdieselgenerators:mold', '{Mold:}'),
    Item.of('createdieselgenerators:mold', '{Mold:}'),
    Item.of('createdieselgenerators:mold', '{Mold:}'),
    Item.of('createdieselgenerators:mold', '{Mold:}'),
    'createdieselgenerators:burner',
    'createdieselgenerators:wire_cutters',
    'createdieselgenerators:hammer',
    'createdieselgenerators:chemical_turret',
    'createdieselgenerators:chemical_sprayer',
    'createdieselgenerators:chemical_sprayer_lighter',
  ]);
});
