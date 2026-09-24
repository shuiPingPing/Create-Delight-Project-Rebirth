// 源：CDR1201 kubejs/startup_scripts/creative_tab/create_confectionery.js（1.20.1）
// 迁移到 1.21.1：内容原样适用
StartupEvents.modifyCreativeTab('create_confectionery:create_confectionery_tab', (e) => {
  e.remove([
    'create_confectionery:crushed_cocoa',
    'create_confectionery:cocoa_powder',
    'create_confectionery:cocoa_butter',
    'create_confectionery:candy_cane_block',
  ]);
});
