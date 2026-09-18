ServerEvents.recipes((e) => {
  const { kubejs } = e.recipes;

  remove_recipes_id(e, [
    'fluidlogistics:multi_fluid_tank',
    'fluidlogistics:horizontal_multi_fluid_tank',
    'fluidlogistics:mechanical_fluid_gun',
    'fluidlogistics:faucet',
    'fluidlogistics:fluid_transporter',
    'fluidlogistics:multi_fluid_access_port_h',
    'fluidlogistics:multi_fluid_access_port',
    'fluidlogistics:fluid_packager',
    'fluidlogistics:cooling/snow_block_to_powder_snow',
  ]);

  e.replaceInput(
    { id: 'fluidlogistics:copper_basin' },
    'minecraft:copper_ingot',
    'create:copper_sheet'
  );
  e.replaceInput({ id: 'fluidlogistics:fluid_pump' }, 'create:cogwheel', 'create:fluid_pipe');
  e.replaceInput(
    { id: 'fluidlogistics:mechanical_crafting/infinite_fluid_tank' },
    'minecraft:netherite_ingot',
    'northstar:martian_steel_sheet'
  );
  e.replaceInput(
    { id: 'fluidlogistics:mechanical_crafting/infinite_fluid_tank' },
    'create:railway_casing',
    'ae2:spatial_io_port'
  );
  e.replaceInput(
    { id: 'fluidlogistics:mechanical_crafting/infinite_fluid_tank' },
    'create:sturdy_sheet',
    'createdelightcore:space_casing'
  );
  e.replaceInput(
    { id: 'fluidlogistics:smart_faucet' },
    'minecraft:copper_ingot',
    'fluidlogistics:faucet'
  );

  e.forEachRecipe({ id: 'fluidlogistics:fluid_inventory_access_port' }, (recipe) => {
    recipe.set('result', Item.of('fluidlogistics:fluid_inventory_access_port', 2));
  });

  kubejs
    .shapeless('fluidlogistics:blaze_cooler', [
      'create:blaze_burner',
      'minecraft:snow_block',
      'minecraft:snow_block',
      'minecraft:carved_pumpkin',
    ])
    .id('createdelightcore:crafting/blaze_cooler');

  kubejs
    .shaped('fluidlogistics:mechanical_fluid_gun', ['AAB', 'AC ', 'DE '], {
      A: 'create:copper_sheet',
      B: 'create:spout',
      C: '#forge:spring/between_500_2_1000',
      D: 'create_sa:hydraulic_engine',
      E: 'create:copper_casing',
    })
    .id('createdelightcore:mechanical_fluid_gun');

  kubejs
    .shaped('2x fluidlogistics:faucet', [' A ', 'BCB', ' D '], {
      A: 'create:copper_valve_handle',
      B: 'create:copper_sheet',
      C: '#forge:spring/below_500',
      D: 'minecraft:dried_kelp',
    })
    .id('createdelightcore:faucet');

  kubejs
    .shaped('fluidlogistics:fluid_transporter', [' A ', 'BCB', ' A '], {
      A: 'create:brass_funnel',
      B: 'fluidlogistics:smart_faucet',
      C: 'create_sa:hydraulic_engine',
    })
    .id('createdelightcore:fluid_transporter');

  kubejs
    .shaped('fluidlogistics:multi_fluid_access_port', [' A ', 'BCB', ' B '], {
      A: 'create:copper_sheet',
      B: 'create:smart_fluid_pipe',
      C: 'fluidlogistics:fluid_transporter',
    })
    .id('createdelightcore:multi_fluid_access_port');

  kubejs
    .shaped('fluidlogistics:copper_schematicannon', ['AAA', 'ABA', 'AAA'], {
      A: 'create:copper_sheet',
      B: 'create:schematicannon',
    })
    .id('createdelightcore:copper_schematicannon');
});
