// 源：CDR1201 kubejs/startup_scripts/creative_tab/butchercraft.js（1.20.1）
// 迁移到 1.21.1：内容原样适用
StartupEvents.modifyCreativeTab('butchercraft:items', (e) => {
  e.remove([
    'butchercraft:sausage_block_item',
    'butchercraft:cooked_sausage_block_item',
    'butchercraft:sausage_linked',
    'butchercraft:sausage',
    'butchercraft:cooked_sausage',
  ]);
});
