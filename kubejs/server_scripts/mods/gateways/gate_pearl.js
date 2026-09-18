ServerEvents.recipes((e) => {
  //增加配方：冰龙试炼珍珠合成
  e.shaped(
    Item.of('gateways:gate_pearl', 1, { 'gateways:gateway': 'createdelightcore:ice_dragon' }),
    ['ABA', 'CDC', 'ABA'],
    {
      A: 'iceandfire:ice_dragon_blood',
      B: 'iceandfire:dragon_skull_ice',
      C: '#iceandfire:scales/dragon/ice',
      D: 'minecraft:nether_star',
    }
  );
  //增加配方：火龙试炼珍珠合成
  e.shaped(
    Item.of('gateways:gate_pearl', 1, { 'gateways:gateway': 'createdelightcore:fire_dragon_eyes' }),
    ['ABA', 'CDC', 'ABA'],
    {
      A: 'iceandfire:fire_dragon_blood',
      B: 'iceandfire:dragon_skull_fire',
      C: '#iceandfire:scales/dragon/fire',
      D: 'minecraft:nether_star',
    }
  );
  //增加配方：雷龙试炼珍珠合成
  e.shaped(
    Item.of('gateways:gate_pearl', 1, { 'gateways:gateway': 'createdelightcore:lightning_dragon' }),
    ['ABA', 'CDC', 'ABA'],
    {
      A: 'iceandfire:lightning_dragon_blood',
      B: 'iceandfire:dragon_skull_lightning',
      C: '#iceandfire:scales/dragon/lightning',
      D: 'minecraft:nether_star',
    }
  );
  //添加配方：永寒悚怖之门合成
  const { create, vintageimprovements } = e.recipes;
  const incomplete = 'gateways:gate_pearl';

  create
    .sequenced_assembly(
      [
        Item.of(
          Item.of('gateways:gate_pearl', 1, {
            'gateways:gateway': 'createdelightcore:the_gate_of_eternal_cold',
          })
        ),
      ],
      'minecraft:ender_pearl',
      [
        create.deploying(incomplete, [incomplete, 'iceandfire:dragonsteel_ice_ingot']),
        create.cutting(incomplete, incomplete),
        vintageimprovements.vibrating(incomplete, incomplete),
        create.filling(incomplete, [
          incomplete,
          Fluid.of('createdelightcore:ice_dragon_blood', 250),
        ]),
        create.deploying(incomplete, [incomplete, 'createdelightcore:dread_heart']),
      ]
    )
    .transitionalItem(incomplete)
    .loops(4)
    .id('createdelightcore:sequenced_assembly/the_gate_of_eternal_cold');
  //添加配方：枯萎穿刺试炼合成
  create
    .sequenced_assembly(
      [
        Item.of(
          Item.of('gateways:gate_pearl', 1, {
            'gateways:gateway': 'createdelightcore:piercing_withering_trial',
          })
        ),
      ],
      'minecraft:ender_pearl',
      [
        create.deploying(incomplete, [incomplete, 'minecraft:wither_skeleton_skull']),
        create.cutting(incomplete, incomplete),
        vintageimprovements.vibrating(incomplete, incomplete),
        create.deploying(incomplete, [incomplete, 'minecraft:nether_star']),
        create.deploying(incomplete, [incomplete, 'iceandfire:witherbone']),
        create.deploying(incomplete, [incomplete, 'alexscavesup:immortal_embryo']).keepHeldItem(),
        create.deploying(incomplete, [incomplete, 'createdelightcore:otherworld_note']),
      ]
    )
    .transitionalItem(incomplete)
    .loops(4)
    .id('createdelightcore:sequenced_assembly/piercing_withering_trial');
  //添加恶魂试炼
  e.shaped(
    Item.of('gateways:gate_pearl', 1, { 'gateways:gateway': 'createdelightcore:ghast_trial' }),
    ['AAA', 'ABA', 'AAA'],
    {
      A: 'minecraft:ghast_tear',
      B: 'minecraft:ender_pearl',
    }
  );
  //添加配方：糖分临界点合成
  create
    .sequenced_assembly(
      [
        Item.of(
          Item.of('gateways:gate_pearl', 1, {
            'gateways:gateway': 'createdelightcore:sweettide_brokenpoint',
          })
        ),
      ],
      'minecraft:ender_pearl',
      [
        create.deploying(incomplete, [incomplete, 'alexscavesup:radiant_essence']),
        create.cutting(incomplete, incomplete),
        vintageimprovements.vibrating(incomplete, incomplete),
        create.filling(incomplete, [incomplete, Fluid.of('alexscavesup:purple_soda', 250)]),
        create.deploying(incomplete, [incomplete, 'alexscavesup:conversion_crucible']),
        create.deploying(incomplete, [incomplete, 'alexscavesup:biome_treat']),
      ]
    )
    .transitionalItem(incomplete)
    .loops(4)
    .id('createdelightcore:sequenced_assembly/sweettide_brokenpoint');
  ////添加配方：黯渊之视合成
  create
    .sequenced_assembly(
      [
        Item.of(
          Item.of('gateways:gate_pearl', 1, {
            'gateways:gateway': 'createdelightcore:infinite_and_dark_trials',
          })
        ),
      ],
      'minecraft:ender_pearl',
      [
        create.deploying(incomplete, [incomplete, 'alexscavesup:pure_darkness']),
        create.cutting(incomplete, incomplete),
        vintageimprovements.vibrating(incomplete, incomplete),
        create.deploying(incomplete, [incomplete, 'createdelightcore:devil_eye']),
        create.deploying(incomplete, [incomplete, 'alexscavesup:desolate_dagger']).keepHeldItem(),
        create.deploying(incomplete, [incomplete, 'alexscavesup:dreadbow']).keepHeldItem(),
      ]
    )
    .transitionalItem(incomplete)
    .loops(2)
    .id('createdelightcore:sequenced_assembly/infinite_and_dark_trials');
  ////添加配方：磁暴领域合成
  create
    .sequenced_assembly(
      [
        Item.of(
          Item.of('gateways:gate_pearl', 1, {
            'gateways:gateway': 'createdelightcore:magnetic_storm_field',
          })
        ),
      ],
      'minecraft:ender_pearl',
      [
        create.deploying(incomplete, [incomplete, 'alexscavesup:telecore']),
        create.cutting(incomplete, incomplete),
        create.pressing(incomplete, incomplete),
        create.deploying(incomplete, [incomplete, 'alexscavesup:scarlet_neodymium_ingot']),
        create.deploying(incomplete, [incomplete, 'alexscavesup:azure_neodymium_ingot']),
        create.deploying(incomplete, [incomplete, 'alexscavesup:heart_of_iron']),
      ]
    )
    .transitionalItem(incomplete)
    .loops(4)
    .id('createdelightcore:sequenced_assembly/magnetic_storm_field');
  ////添加配方：熔蚀之地合成
  create
    .sequenced_assembly(
      [
        Item.of(
          Item.of('gateways:gate_pearl', 1, {
            'gateways:gateway': 'createdelightcore:a_place_of_melting',
          })
        ),
      ],
      'minecraft:ender_pearl',
      [
        create.deploying(incomplete, [incomplete, 'alexscavesup:uranium']),
        create.cutting(incomplete, incomplete),
        create.pressing(incomplete, incomplete),
        create.deploying(incomplete, [incomplete, 'alexscavesup:fissile_core']),
        create.deploying(incomplete, [incomplete, 'alexscavesup:nuclear_bomb']).keepHeldItem(),
        create.deploying(incomplete, [incomplete, 'alexscavesup:tremorzilla_egg']).keepHeldItem(),
      ]
    )
    .transitionalItem(incomplete)
    .loops(4)
    .id('createdelightcore:sequenced_assembly/a_place_of_melting');
  ////添加配方：远古终焉合成
  create
    .sequenced_assembly(
      [
        Item.of(
          Item.of('gateways:gate_pearl', 1, {
            'gateways:gateway': 'createdelightcore:the_ancient_end',
          })
        ),
      ],
      'minecraft:ender_pearl',
      [
        create.deploying(incomplete, [incomplete, 'alexscavesup:heavy_bone']),
        create.pressing(incomplete, incomplete),
        create.cutting(incomplete, incomplete),
        create.deploying(incomplete, [incomplete, 'alexscavesup:amber_curiosity']),
        create.deploying(incomplete, [incomplete, 'alexscavesup:tectonic_shard']),
        create.deploying(incomplete, [incomplete, 'alexscavesup:extinction_spear']).keepHeldItem(),
      ]
    )
    .transitionalItem(incomplete)
    .loops(4)
    .id('createdelightcore:sequenced_assembly/the_ancient_end');
  ////添加配方：自噬之潮合成
  create
    .sequenced_assembly(
      [
        Item.of(
          Item.of('gateways:gate_pearl', 1, {
            'gateways:gateway': 'createdelightcore:the_legacy_of_the_abyss',
          })
        ),
      ],
      'minecraft:ender_pearl',
      [
        create.deploying(incomplete, [incomplete, 'alexscavesup:gazing_pearl']),
        create.pressing(incomplete, incomplete),
        create.deploying(incomplete, [incomplete, 'alexscavesup:enigmatic_engine']),
        vintageimprovements.vibrating(incomplete, incomplete),
        create.deploying(incomplete, [incomplete, 'alexscavesup:immortal_embryo']),
        create.deploying(incomplete, [incomplete, 'alexscavesup:magic_conch']).keepHeldItem(),
      ]
    )
    .transitionalItem(incomplete)
    .loops(4)
    .id('createdelightcore:sequenced_assembly/the_legacy_of_the_abyss');
  ////添加配方：不再有梦合成
  create
    .sequenced_assembly(
      [
        Item.of(
          Item.of('gateways:gate_pearl', 1, {
            'gateways:gateway': 'createdelightcore:dream_no_more',
          })
        ),
      ],
      'minecraft:ender_pearl',
      [
        create.deploying(incomplete, [incomplete, 'alexscavesup:sweet_tooth']),
        create.pressing(incomplete, incomplete),
        create.deploying(incomplete, [incomplete, 'alexscavesup:enigmatic_engine']),
        vintageimprovements.vibrating(incomplete, incomplete),
        create.deploying(incomplete, [incomplete, 'alexsmobsup:void_worm_eye']),
        create.deploying(incomplete, [incomplete, 'dungeonsdelight:monster_cake']).keepHeldItem(),
      ]
    )
    .transitionalItem(incomplete)
    .loops(6)
    .id('createdelightcore:sequenced_assembly/dream_no_more');
  ////添加配方：炽锋之誓合成（依赖缺失模组，套守卫）
  if (global.hasAllMods(['more_mod_tetra', 'blackknightarmor', 'cataclysm'])) {
    create
      .sequenced_assembly(
        [
          Item.of('gateways:gate_pearl', 1, {
            'gateways:gateway': 'createdelightcore:oath_of_fierce_blade_ouel',
          }),
        ],
        'minecraft:fire_charge',
        [
          create.deploying(incomplete, [incomplete, 'iceandfire:dragonsteel_fire_ingot']),
          create.deploying(incomplete, [incomplete, 'minecraft:netherite_block']),
          vintageimprovements.vibrating(incomplete, incomplete),
          create.deploying(incomplete, [incomplete, 'more_mod_tetra:ignitium_core']),
          create.deploying(incomplete, [incomplete, 'blackknightarmor:dragon_fire_ingot']),
          create.deploying(incomplete, [incomplete, 'cataclysm:monstrous_horn']).keepHeldItem(),
        ]
      )
      .transitionalItem(incomplete)
      .loops(6)
      .id('createdelightcore:sequenced_assembly/oath_of_fierce_blade_ouel');
  }
  ////添加配方：沧海桑田合成（依赖 cataclysm，套守卫）
  if (global.hasMod('cataclysm')) {
    create
      .sequenced_assembly(
        [
          Item.of('gateways:gate_pearl', 1, {
            'gateways:gateway': 'createdelightcore:shattered_past',
          }),
        ],
        'alexsmobsup:void_worm_eye',
        [
          create.deploying(incomplete, [incomplete, 'cataclysm:witherite_ingot']),
          create.deploying(incomplete, [incomplete, 'cataclysm:ancient_metal_ingot']),
          vintageimprovements.vibrating(incomplete, incomplete),
          create.deploying(incomplete, [incomplete, 'minecraft:nether_star']),
          create.deploying(incomplete, [incomplete, 'minecraft:dragon_breath']),
          create
            .deploying(incomplete, [incomplete, 'cataclysm:sandstorm_in_a_bottle'])
            .keepHeldItem(),
        ]
      )
      .transitionalItem(incomplete)
      .loops(8)
      .id('createdelightcore:sequenced_assembly/shattered_past');
  }
  ////添加配方：风溟雷殛合成（依赖缺失模组，套守卫）
  if (global.hasAllMods(['more_mod_tetra', 'cataclysm'])) {
    create
      .sequenced_assembly(
        [
          Item.of('gateways:gate_pearl', 1, {
            'gateways:gateway': 'createdelightcore:wind_mist_and_thunder_strike',
          }),
        ],
        'alexscavesup:pearl',
        [
          create.deploying(incomplete, [incomplete, 'more_mod_tetra:abyssal_ingot']),
          create.deploying(incomplete, [incomplete, 'cataclysm:cursium_ingot']),
          create.deploying(incomplete, [incomplete, 'more_mod_tetra:storm_ingot']),
          vintageimprovements.vibrating(incomplete, incomplete),
          create.deploying(incomplete, [incomplete, 'cataclysm:blessed_amethyst_crab_meat']),
          create.deploying(incomplete, [incomplete, 'minecraft:conduit']).keepHeldItem(),
        ]
      )
      .transitionalItem(incomplete)
      .loops(8)
      .id('createdelightcore:sequenced_assembly/wind_mist_and_thunder_strike');
  }
});
