// 源：CDR1201 kubejs/startup_scripts/creative_tab/ae2.js（1.20.1）
// 迁移到 1.21.1：19 处命名空间重命名（createdelight→createdelightcore / alexscaves→alexscavesup）
StartupEvents.modifyCreativeTab('ae2:main', (e) => {
  e.add([
    'createdelightcore:universal_press',
    'createdelightcore:bleak_electron_tube',
    'createdelightcore:redstone_paste',
    'createdelightcore:glowstone_paste',
    'createdelightcore:initial_processing_of_printed_engineering_processor',
    'createdelightcore:initial_processing_of_printed_calculation_processor',
    'createdelightcore:initial_processing_of_printed_logic_processor',
    'createdelightcore:engineering_processor_inscribed',
    'createdelightcore:calculation_processor_inscribed',
    'createdelightcore:logic_processor_inscribed',
    'createdelightcore:item_cell_housing_blank',
    'createdelightcore:fluid_cell_housing_blank',
    'createdelightcore:initial_processing_of_item_cell_housing',
    'createdelightcore:initial_processing_of_fluid_cell_housing',
    'createdelightcore:unformed_item_cell_housing',
    'createdelightcore:unformed_fluid_cell_housing',
    'createdelightcore:quartz_glass_parts',
    'createdelightcore:quartz_vibrant_glass_parts',
    'createdelightcore:cell_housing_curving_head',
  ]);
});

StartupEvents.modifyCreativeTab('extendedae_plus:main', (e) => {
  e.remove([
    'extendedae_plus:infinity_core',
    'extendedae_plus:infinity_biginteger_cell',
    'extendedae_plus:assembler_matrix_upload_core',
    'extendedae_plus:assembler_matrix_speed_plus',
    'extendedae_plus:assembler_matrix_crafter_plus',
    'extendedae_plus:assembler_matrix_pattern_plus',
    'extendedae_plus:entity_speed_ticker',
    Item.of('extendedae_plus:entity_speed_card', '{"EAS:mult":2}'),
    Item.of('extendedae_plus:entity_speed_card', '{"EAS:mult":4}'),
    Item.of('extendedae_plus:entity_speed_card', '{"EAS:mult":8}'),
    Item.of('extendedae_plus:entity_speed_card', '{"EAS:mult":16}'),
    'extendedae_plus:oblivion_singularity',
    'extendedae_plus:basic_core',
    'extendedae_plus:storage_core',
    'extendedae_plus:spatial_core',
  ]);
});
