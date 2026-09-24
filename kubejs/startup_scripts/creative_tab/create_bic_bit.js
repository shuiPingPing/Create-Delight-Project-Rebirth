// 源：CDR1201 kubejs/startup_scripts/creative_tab/create_bic_bit.js（1.20.1）
// 迁移到 1.21.1：标签页重映射 create_bic_bit:tabs -> create_bic_bit:base
StartupEvents.modifyCreativeTab('create_bic_bit:base', (e) => {
  e.remove([
    'create_bic_bit:unripe_cheese',
    'create_bic_bit:waxed_unripe_cheese',
    'create_bic_bit:young_cheese',
    'create_bic_bit:waxed_young_cheese',
    'create_bic_bit:aged_cheese',
    'create_bic_bit:waxed_aged_cheese',
    'create_bic_bit:unripe_cheese_wedge',
    'create_bic_bit:young_cheese_wedge',
    'create_bic_bit:aged_cheese_wedge',
    'create_bic_bit:crystallised_oil',
    'create_bic_bit:frying_oil_bottle',
    'create_bic_bit:frying_oil_bucket',
    'create_bic_bit:ketchup_bucket',
  ]);
});
