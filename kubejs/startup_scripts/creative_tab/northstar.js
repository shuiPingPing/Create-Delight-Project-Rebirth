// 源：CDR1201 kubejs/startup_scripts/creative_tab/northstar.js（1.20.1）
// 迁移到 1.21.1：2 处命名空间重命名（createdelight→createdelightcore / alexscaves→alexscavesup）；标签页重映射 northstar:northstar_items -> northstar:items；剔除 2 个 1.21.1 已不存在的物品
StartupEvents.modifyCreativeTab('northstar:items', (e) => {
  e.remove([
    'northstar:vanilla_ice_cream',
    'northstar:chocolate_ice_cream',
    'northstar:strawberry_ice_cream',
    'northstar:raw_ice_cream_cone',
    'northstar:ice_cream_cone',
    'northstar:hydrocarbon_bucket',
    'northstar:solar_panel',
    'northstar:circuit_engraver',
    'northstar:electrolysis_machine',
    // 月球钛矿生成已禁用，避免创造标签和物品列表继续展示。
    'northstar:moon_titanium_ore',
    'northstar:moon_deep_titanium_ore',
  ]);
  e.add([]);
});
