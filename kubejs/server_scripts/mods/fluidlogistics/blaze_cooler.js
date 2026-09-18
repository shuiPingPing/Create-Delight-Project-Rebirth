ServerEvents.recipes((event) => {
  const { create } = event.recipes;

  // fluidlogistics 1.3.0 无 KubeJS 插件，cooling_mixing / cooling_compacting 用原生 JSON 写
  const cooling = (type, id, ingredients, result) => {
    event
      .custom({
        type: `fluidlogistics:${type}`,
        ingredients: ingredients,
        results: [result],
        supercooled: false,
      })
      .id(id);
  };

  cooling(
    'cooling_mixing',
    'createdelightcore:cooling_mixing/blue_ice',
    [
      { item: 'minecraft:packed_ice' },
      { type: 'fluid_stack', amount: 1000, fluid: 'minecraft:water' },
    ],
    { id: 'minecraft:blue_ice' }
  );

  cooling(
    'cooling_mixing',
    'createdelightcore:cooling_mixing/packed_ice',
    [{ item: 'minecraft:ice' }, { type: 'fluid_stack', amount: 1000, fluid: 'minecraft:water' }],
    { id: 'minecraft:packed_ice' }
  );

  cooling(
    'cooling_compacting',
    'createdelightcore:cooling_compacting/block_of_chocolate',
    [{ type: 'fluid_stack', amount: 100, fluid: 'create_confectionery:black_chocolate' }],
    { id: 'alexscavesup:block_of_chocolate' }
  );

  cooling(
    'cooling_mixing',
    'createdelightcore:cooling_mixing/ice_dragon_blood_from_nuclear_waste',
    [
      { item: 'iceandfire:frost_lily' },
      { type: 'fluid_stack', amount: 100, fluid: 'createdelightcore:nuclear_waste' },
      { type: 'fluid_stack', amount: 250, fluid: 'createdelightcore:ice_dragon_blood' },
    ],
    { id: 'createdelightcore:ice_dragon_blood', amount: 500 }
  );

  cooling(
    'cooling_mixing',
    'createdelightcore:cooling_mixing/ice_lubricating_oil',
    [
      { type: 'fluid_stack', amount: 250, fluid: 'createdelightcore:lubricating_oil' },
      { item: 'northstar:enriched_glowstone_ore' },
    ],
    { id: 'createdelightcore:ice_lubricating_oil', amount: 500 }
  );

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
