// 源：CDR1201 kubejs/startup_scripts/creative_tab/the_bumblezone.js（1.20.1）
// 迁移到 1.21.1：1 处命名空间重命名（createdelight→createdelightcore / alexscaves→alexscavesup）
StartupEvents.modifyCreativeTab('the_bumblezone:main_tab', (e) => {
  e.add(['createdelightcore:unactivated_crystalline_flower']);
});
