// 源：CDR1201 kubejs/startup_scripts/creative_tab/appliedcreate.js（1.20.1）
// 迁移到 1.21.1：内容原样适用
StartupEvents.modifyCreativeTab('appliedcreate:main', (e) => {
  e.remove([
    'appliedcreate:me_gearbox',
    'appliedcreate:kinetic_energy_acceptor',
    'appliedcreate:creative_stress_cell',
    '/appliedcreate:stress_storage_.*/',
    '/appliedcreate:.*board/',
    '/appliedcreate:.*processor/',
    '/appliedcreate:.*housing/',
  ]);
});
