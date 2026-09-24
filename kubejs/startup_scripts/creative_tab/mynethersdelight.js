// 源：CDR1201 kubejs/startup_scripts/creative_tab/mynethersdelight.js（1.20.1）
// 迁移到 1.21.1：内容原样适用
StartupEvents.modifyCreativeTab('mynethersdelight:main', (e) => {
  e.remove([
    'mynethersdelight:roasted_sausage',
    'mynethersdelight:hoglin_sausage',
    'mynethersdelight:slices_of_bread',
    'mynethersdelight:toasts',
  ]);
});
