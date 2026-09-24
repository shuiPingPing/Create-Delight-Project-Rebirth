// 源：CDR1201 kubejs/startup_scripts/creative_tab/torchmaster.js（1.20.1）
// 迁移到 1.21.1：标签页重映射 torchmaster:creative_tab -> torchmaster:torchmaster
StartupEvents.modifyCreativeTab('torchmaster:torchmaster', (e) => {
  e.remove(['torchmaster:feral_flare_lantern', 'torchmaster:frozen_pearl']);
});
