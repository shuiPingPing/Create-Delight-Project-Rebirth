// 源：CDR1201 kubejs/startup_scripts/creative_tab/minecraft.js（1.20.1）
// 迁移到 1.21.1：剔除 8 个 1.21.1 已不存在的物品；2 个已无内容的标签页改动被移除
StartupEvents.modifyCreativeTab('minecraft:redstone_blocks', (e) => {
  e.remove(['mbd2:mbd_gadgets']);
});
StartupEvents.modifyCreativeTab('minecraft:functional_blocks', (e) => {
  e.remove(['quark:iron_ladder']);
});
