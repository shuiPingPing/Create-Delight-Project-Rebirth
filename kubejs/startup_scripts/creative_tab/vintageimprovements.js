// 源：CDR1201 kubejs/startup_scripts/creative_tab/vintageimprovements.js（1.20.1）
// 迁移到 1.21.1：内容原样适用
StartupEvents.modifyCreativeTab('vintageimprovements:vintage_improvement_tab', (e) => {
  e.remove([
    'vintageimprovements:belt_grinder',
    'vintageimprovements:grinder_belt',
    'vintageimprovements:sulfur',
    'vintageimprovements:sulfur_block',
  ]);
});
