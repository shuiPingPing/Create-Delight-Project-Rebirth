// 源：CDR1201 kubejs/startup_scripts/creative_tab/create_sa.js（1.20.1）
// 迁移到 1.21.1：内容原样适用
StartupEvents.modifyCreativeTab('create_sa:create_stuff_additions_tab', (e) => {
  e.remove([
    'create_sa:blazing_pickaxe',
    'create_sa:blazing_shovel',
    'create_sa:blazing_axe',
    'create_sa:blazing_cleaver',
    'create_sa:brass_cube',
    'create_sa:heap_of_experience',
    'create_sa:experience_pickaxe',
    'create_sa:experience_pickaxe',
    'create_sa:experience_axe',
    'create_sa:experience_sword',
    'create_sa:experience_shovel',
    'create_sa:flamethrower',
  ]);
});
