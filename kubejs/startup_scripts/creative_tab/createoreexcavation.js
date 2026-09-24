// 源：CDR1201 kubejs/startup_scripts/creative_tab/createoreexcavation.js（1.20.1）
// 迁移到 1.21.1：11 处命名空间重命名（createdelight→createdelightcore / alexscaves→alexscavesup）
StartupEvents.modifyCreativeTab('createoreexcavation:create_ore_excavation', (e) => {
  e.add([
    'createdelightcore:prospector',
    'createdelightcore:prospector_core',
    'createdelightcore:overworld_metal_ore_cluster',
    'createdelightcore:overworld_noble_metal_ore_cluster',
    'createdelightcore:nether_ore_cluster',
    'createdelightcore:moon_ore_cluster',
    'createdelightcore:mars_ore_cluster',
    'createdelightcore:mars_gemstone_cluster',
    'createdelightcore:mercury_ore_cluster',
    'createdelightcore:venus_ore_cluster',
    'createdelightcore:glacio_ore_cluster',
  ]);
  e.remove(['createoreexcavation:vein_finder']);
});
