// 源：CDR1201 kubejs/startup_scripts/creative_tab/vintagedelight.js（1.20.1）
// 迁移到 1.21.1：内容原样适用
StartupEvents.modifyCreativeTab('vintagedelight:vintage_tab', (e) => {
  e.remove([
    'vintagedelight:meat_pizza',
    'vintagedelight:meat_pizza_slice',
    'vintagedelight:apple_sauce_bottle',
    'vintagedelight:sweet_berry_jam_bottle',
    'vintagedelight:glow_berry_jam_bottle',
    'vintagedelight:gearo_berry_mason_jar',
    'vintagedelight:gearo_berry_jam_bottle',
    'vintagedelight:cheese_pizza',
    'vintagedelight:cheese_pizza_slice',
  ]);
});
