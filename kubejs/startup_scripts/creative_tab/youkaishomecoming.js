// 源：CDR1201 kubejs/startup_scripts/creative_tab/youkaishomecoming.js（1.20.1）
// 迁移到 1.21.1：剔除 3 个 1.21.1 已不存在的物品
StartupEvents.modifyCreativeTab('youkaishomecoming:youkais_homecoming', (e) => {
  e.remove([
    'youkaishomecoming:tea_leaves',
    'youkaishomecoming:tea_leaf_bag',
    'youkaishomecoming:black_tea',
    'youkaishomecoming:green_tea',
    'youkaishomecoming:kettle',
    'youkaishomecoming:oolong_tea',
    'youkaishomecoming:cucumber_seeds',
    'youkaishomecoming:mayonnaise_bottle',
    'youkaishomecoming:sake_bottle',
    'youkaishomecoming:black_grape_juice',
    'youkaishomecoming:white_grape_juice',
    'youkaishomecoming:red_grape_juice',
    'youkaishomecoming:white_wine_bottle',
    'youkaishomecoming:red_wine_bottle',
    'youkaishomecoming:van_allen_bottle',
    'youkaishomecoming:burgundy_bottle',
    'youkaishomecoming:champagne_bottle',
  ]);
});
