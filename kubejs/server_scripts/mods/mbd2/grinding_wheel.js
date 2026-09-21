if (global.hasAllMods(['createdelightcore', 'mbd2', 'create'])) {
  ServerEvents.recipes((event) => {
    // Core 2.0.0.6 的 24 台机器清单与其 lang 里都没有 mechanic_grinding_wheel，
    // 该物品不存在时 KubeJS 读不出 result 会直接报错；等 Core 补上后本配方自动生效。
    if (!global.itemExists('createdelightcore:mechanic_grinding_wheel')) return;
    event
      .shaped('createdelightcore:mechanic_grinding_wheel', ['AAA', 'ACB', 'AAA'], {
        A: 'create:andesite_alloy',
        B: 'create:shaft',
        C: 'minecraft:grindstone',
      })
      .id('createdelightcore:mbd2/mechanic_grinding_wheel');
  });
}
