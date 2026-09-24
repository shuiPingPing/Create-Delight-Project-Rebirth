// 源：CDR1201 kubejs/startup_scripts/creative_tab/megacells.js（1.20.1）
// 迁移到 1.21.1：9 处命名空间重命名（createdelight→createdelightcore / alexscaves→alexscavesup）
StartupEvents.modifyCreativeTab('megacells:tab', (e) => {
  e.add([
    'createdelightcore:sky_stone_paste',
    'createdelightcore:initial_processing_of_printed_accumulation_processor',
    'createdelightcore:accumulation_processor_inscribed',
    'createdelightcore:mega_item_cell_housing_blank',
    'createdelightcore:mega_fluid_cell_housing_blank',
    'createdelightcore:initial_processing_of_mega_item_cell_housing',
    'createdelightcore:initial_processing_of_mega_fluid_cell_housing',
    'createdelightcore:unformed_mega_item_cell_housing',
    'createdelightcore:unformed_mega_fluid_cell_housing',
  ]);
  e.remove([
    'megacells:mega_interface',
    'megacells:mega_pattern_provider',
    'megacells:cable_mega_interface',
    'megacells:cable_mega_pattern_provider',
  ]);
});
