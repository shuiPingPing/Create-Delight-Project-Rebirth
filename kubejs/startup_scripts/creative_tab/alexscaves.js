// 源：CDR1201 kubejs/startup_scripts/creative_tab/alexscaves.js（1.20.1）
// 迁移到 1.21.1：4 处命名空间重命名（createdelight→createdelightcore / alexscaves→alexscavesup）
//糖果洞穴
StartupEvents.modifyCreativeTab('alexscavesup:candy_cavity', (e) => {
  e.remove(['alexscavesup:hot_chocolate_bottle']);
});
StartupEvents.modifyCreativeTab('alexscavesup:toxic_caves', (e) => {
  e.remove(['alexscavesup:nuclear_furnace_component']);
});
