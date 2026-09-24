// 源：CDR1201 kubejs/startup_scripts/creative_tab/brewinandchewin.js（1.20.1）
// 迁移到 1.21.1：内容原样适用
StartupEvents.modifyCreativeTab('brewinandchewin:brewinandchewin', (e) => {
  e.remove([
    'brewinandchewin:kimchi',
    'brewinandchewin:pizza_slice',
    'brewinandchewin:quiche',
    'brewinandchewin:quiche_slice',
    'brewinandchewin:sweet_berry_jam',
    'brewinandchewin:glow_berry_marmalade',
    'brewinandchewin:apple_jelly',
    'brewinandchewin:pizza',
  ]);
});
