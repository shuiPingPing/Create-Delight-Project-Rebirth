// 源：CDR1201 kubejs/startup_scripts/creative_tab/ae2omnicells.js（1.20.1）
// 迁移到 1.21.1：16 处命名空间重命名（createdelight→createdelightcore / alexscaves→alexscavesup）
StartupEvents.modifyCreativeTab('ae2omnicells:ae2_omni_cells_creative_tab', (e) => {
  e.add([
    'createdelightcore:initial_processing_of_printed_omni_link_processor',
    'createdelightcore:omni_link_processor_inscribed',
    'createdelightcore:initial_processing_of_printed_complex_link_processor',
    'createdelightcore:complex_link_processor_inscribed',
    'createdelightcore:initial_processing_of_printed_multidimensional_expansion_processor',
    'createdelightcore:multidimensional_expansion_processor_inscribed',
    'createdelightcore:initial_processing_of_omni_cell_housing',
    'createdelightcore:omni_cell_housing_blank',
    'createdelightcore:unformed_omni_cell_housing',
    'createdelightcore:initial_processing_of_complex_omni_cell_housing',
    'createdelightcore:complex_omni_cell_housing_blank',
    'createdelightcore:unformed_complex_omni_cell_housing',
    'createdelightcore:initial_processing_of_quantum_omni_cell_housing',
    'createdelightcore:quantum_omni_cell_housing_blank',
    'createdelightcore:unformed_quantum_omni_cell_housing',
    'createdelightcore:ultimate_universal_press',
  ]);
});
