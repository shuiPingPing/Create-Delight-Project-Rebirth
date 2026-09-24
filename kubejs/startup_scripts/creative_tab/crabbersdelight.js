// 源：CDR1201 kubejs/startup_scripts/creative_tab/crabbersdelight.js（1.20.1）
// 迁移到 1.21.1：标签页重映射 crabbersdelight:test_tab -> crabbersdelight:farmersdelight
StartupEvents.modifyCreativeTab('crabbersdelight:farmersdelight', (e) => {
  e.remove(['crabbersdelight:cooked_glow_squid_tentacles']);
});
