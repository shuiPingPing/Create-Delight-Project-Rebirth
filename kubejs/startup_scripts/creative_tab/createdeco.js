// 源：CDR1201 kubejs/startup_scripts/creative_tab/createdeco.js（1.20.1）
// 迁移到 1.21.1：内容原样适用
StartupEvents.modifyCreativeTab('createdeco:props_tab', (e) => {
  e.remove([
    'createdeco:industrial_iron_coin',
    'createdeco:zinc_coin',
    'createdeco:brass_coin',
    'createdeco:iron_coinstack',
    'createdeco:copper_coinstack',
    'createdeco:industrial_iron_coinstack',
    'createdeco:zinc_coinstack',
    'createdeco:gold_coinstack',
    'createdeco:netherite_coinstack',
    'createdeco:brass_coinstack',
    'createdeco:netherite_nugget',
  ]);
});
