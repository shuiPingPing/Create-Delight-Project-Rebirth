// 源：CDR1201 kubejs/startup_scripts/creative_tab/createdieselgenerators.js（1.20.1）
// 迁移到 1.21.1：源包用 NBT 区分 4 种模具（bowl / lines / chain / bar）并把它们全从创造栏剔除；
// 1.21.1 的 createdieselgenerators 把模具改成「同一个物品 + MoldType」，
// 因此按 id 删除即可覆盖全部 4 种，不再需要 Item.of(…, NBT)。
StartupEvents.modifyCreativeTab('createdieselgenerators:cdg_creative_tab', (e) => {
  e.remove([
    'createdieselgenerators:mold',
    'createdieselgenerators:burner',
    'createdieselgenerators:wire_cutters',
    'createdieselgenerators:hammer',
    'createdieselgenerators:chemical_turret',
    'createdieselgenerators:chemical_sprayer',
    'createdieselgenerators:chemical_sprayer_lighter',
  ]);
});
