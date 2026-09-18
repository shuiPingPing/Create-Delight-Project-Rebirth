ServerEvents.recipes((event) => {
  const { create, fluidlogistics } = event.recipes;

  fluidlogistics
    .cooling_mixing('minecraft:blue_ice', [
      'minecraft:packed_ice',
      Fluid.of('minecraft:water', 1000),
    ])
    .id('createdelightcore:cooling_mixing/blue_ice');

  fluidlogistics
    .cooling_mixing('minecraft:packed_ice', ['minecraft:ice', Fluid.of('minecraft:water', 1000)])
    .id('createdelightcore:cooling_mixing/packed_ice');

  fluidlogistics
    .cooling_compacting(
      'alexscavesup:block_of_chocolate',
      Fluid.of('create_confectionery:black_chocolate', 100)
    )
    .id('createdelightcore:cooling_compacting/block_of_chocolate');

  fluidlogistics
    .cooling_mixing(Fluid.of('createdelightcore:ice_dragon_blood', 500), [
      'iceandfire:frost_lily',
      Fluid.of('createdelightcore:nuclear_waste', 100),
      Fluid.of('createdelightcore:ice_dragon_blood', 250),
    ])
    .id('createdelightcore:cooling_mixing/ice_dragon_blood_from_nuclear_waste');

  fluidlogistics
    .cooling_mixing(Fluid.of('createdelightcore:ice_lubricating_oil', 500), [
      Fluid.of('createdelightcore:lubricating_oil', 250),
      'northstar:enriched_glowstone_ore',
    ])
    .id('createdelightcore:cooling_mixing/ice_lubricating_oil');

  const seasons = ['spring', 'summer', 'autumn', 'winter'];
  seasons.forEach((season) => {
    const essence = `eclipticseasons:${season}_greenhouse_essence`;
    create
      .sequenced_assembly(`2x ${essence}`, essence, [
        create.deploying(essence, [essence, 'create:blaze_burner']),
        create.deploying(essence, [essence, 'fluidlogistics:blaze_cooler']),
        create.filling(essence, [essence, Fluid.of('create_enchantment_industry:experience', 250)]),
      ])
      .loops(1)
      .transitionalItem(essence)
      .id(`createdelightcore:${season}_greenhouse_essence_from_blaze_cooler`);
  });
});
