// 源：CDR1201 kubejs/startup_scripts/creative_tab/iceandfire.js（1.20.1）
// 迁移到 1.21.1：剔除 5 个 1.21.1 已不存在的物品
StartupEvents.modifyCreativeTab('iceandfire:items', (e) => {
  e.add([]);
  e.remove([
    'iceandfire:dragonsteel_fire_sword',
    'iceandfire:dragonsteel_fire_pickaxe',
    'iceandfire:dragonsteel_fire_axe',
    'iceandfire:dragonsteel_fire_shovel',
    'iceandfire:dragonsteel_fire_hoe',
    'iceandfire:dragonsteel_ice_pickaxe',
    'iceandfire:dragonsteel_ice_sword',
    'iceandfire:dragonsteel_ice_axe',
    'iceandfire:dragonsteel_ice_shovel',
    'iceandfire:dragonsteel_ice_hoe',
    'iceandfire:dragonsteel_lightning_sword',
    'iceandfire:dragonsteel_lightning_pickaxe',
    'iceandfire:dragonsteel_lightning_axe',
    'iceandfire:dragonsteel_lightning_shovel',
    'iceandfire:dragonsteel_lightning_hoe',
    'iceandfire:copper_axe',
    'iceandfire:copper_hoe',
    'iceandfire:copper_pickaxe',
    'iceandfire:copper_shovel',
    'iceandfire:copper_sword',
    'iceandfire:armor_copper_metal_boots',
    'iceandfire:armor_copper_metal_chestplate',
    'iceandfire:armor_copper_metal_helmet',
    'iceandfire:armor_copper_metal_leggings',
  ]);
});
