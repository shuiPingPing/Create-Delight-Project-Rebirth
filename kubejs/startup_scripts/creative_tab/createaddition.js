// 源：CDR1201 kubejs/startup_scripts/creative_tab/createaddition.js（1.20.1）
// 迁移到 1.21.1：标签页重映射 createaddition:main -> createaddition:createaddition
StartupEvents.modifyCreativeTab('createaddition:createaddition', (e) => {
  e.remove([
    'createaddition:chocolate_cake',
    'createaddition:biomass_pellet_block',
    'createaddition:biomass_pellet',
    'createaddition:straw',
    'createaddition:seed_oil_bucket',
    'createaddition:bioethanol_bucket',
    'createaddition:tesla_coil',
  ]);
});
