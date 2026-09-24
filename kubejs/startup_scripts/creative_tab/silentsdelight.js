// 源：CDR1201 kubejs/startup_scripts/creative_tab/silentsdelight.js（1.20.1）
// 迁移到 1.21.1：内容原样适用
StartupEvents.modifyCreativeTab('silentsdelight:silentsdelight', (e) => {
  e.remove([
    'silentsdelight:sculk_catalyst_pie',
    'silentsdelight:sculk_catalyst_pie_slice',
    'silentsdelight:sculk_catalyst_pie_crust',
  ]);
});
