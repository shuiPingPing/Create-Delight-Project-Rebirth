// 源：CDR1201 kubejs/startup_scripts/creative_tab/create_deepfried.js（1.20.1）
// 迁移到 1.21.1：标签页重映射 create_deepfried:deepfried -> create_deepfried:base
StartupEvents.modifyCreativeTab('create_deepfried:base', (e) => {
  e.remove([
    'create_deepfried:apple_slices',
    'create_deepfried:chicken_nuggets',
    'create_deepfried:fish_and_chips',
    'create_deepfried:raw_chicken_nuggets',
    'create_deepfried:raw_springroll',
    'create_deepfried:springroll',
    'create_deepfried:yuca',
  ]);
});
