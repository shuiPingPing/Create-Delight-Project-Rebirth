// 源：CDR1201 kubejs/startup_scripts/creative_tab/create_fantasizing.js（1.20.1）
// 迁移到 1.21.1：内容原样适用
StartupEvents.modifyCreativeTab('create_fantasizing:create_fantasizing_tab', (e) => {
  e.remove(['create_fantasizing:block_placer']);
});
