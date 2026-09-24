// 源：CDR1201 kubejs/startup_scripts/creative_tab/ratatouille.js（1.20.1）
// 迁移到 1.21.1：22 处命名空间重命名（createdelight→createdelightcore / alexscaves→alexscavesup）；剔除 6 个 1.21.1 已不存在的物品
StartupEvents.modifyCreativeTab('ratatouille:base', (e) => {
  e.remove([
    'ratatouille:compost_residue',
    'ratatouille:boil_stone',
    'ratatouille:ripen_matter_fold',
    'ratatouille:compost_mass',
    'ratatouille:bio_gas_bucket',
    'ratatouille:compost_tea_bucket',
    'ratatouille:egg_yolk_bucket',
    'ratatouille:cake_batter_bucket',
    'ratatouille:mince_meat_bucket',
    'ratatouille:compost_tower',
  ]);
  e.add([
    'createdelightcore:empty_popsicle_mold_filled',
    'createdelightcore:empty_popsicle_mold_solid',
    'createdelightcore:chorus_fruit_popsicle_mold_filled',
    'createdelightcore:chorus_fruit_popsicle_mold_solid',
    'createdelightcore:tear_popsicle_mold_filled',
    'createdelightcore:tear_popsicle_mold_solid',
    'createdelightcore:milk_popsicle_mold_filled',
    'createdelightcore:milk_popsicle_mold_solid',
    'createdelightcore:hamimelon_popsicle_mold_filled',
    'createdelightcore:hamimelon_popsicle_mold_solid',
    'createdelightcore:lime_popsicle_mold_filled',
    'createdelightcore:lime_popsicle_mold_solid',
    'createdelightcore:kiwi_popsicle_mold_filled',
    'createdelightcore:kiwi_popsicle_mold_solid',
    'createdelightcore:berry_popsicle_mold_filled',
    'createdelightcore:berry_popsicle_mold_solid',
    'createdelightcore:big_popsicle_mold_filled',
    'createdelightcore:big_popsicle_mold_solid',
    'createdelightcore:green_tongue_mold_filled',
    'createdelightcore:green_tongue_mold_solid',
  ]);
});
