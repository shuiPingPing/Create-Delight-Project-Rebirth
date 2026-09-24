// 源：CDR1201 kubejs/startup_scripts/creative_tab/createfluidstuffs.js（1.20.1）
// 迁移到 1.21.1：内容原样适用
StartupEvents.modifyCreativeTab('createfluidstuffs:base', (e) => {
  e.remove(['createfluidstuffs:multi_fluid_tank']);
});
