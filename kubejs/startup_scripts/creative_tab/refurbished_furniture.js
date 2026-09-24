// 源：CDR1201 kubejs/startup_scripts/creative_tab/refurbished_furniture.js（1.20.1）
// 迁移到 1.21.1：内容原样适用
StartupEvents.modifyCreativeTab('refurbished_furniture:creative_tab', (e) => {
  e.remove([
    'refurbished_furniture:sea_salt',
    'refurbished_furniture:wheat_flour',
    'refurbished_furniture:dough',
    'refurbished_furniture:cheese',
    'refurbished_furniture:bread_slice',
    'refurbished_furniture:toast',
    'refurbished_furniture:knife',
    'refurbished_furniture:sweet_berry_jam',
    'refurbished_furniture:sweet_berry_jam_toast',
    'refurbished_furniture:glow_berry_jam',
    'refurbished_furniture:glow_berry_jam_toast',
  ]);
});
