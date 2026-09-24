// 源：CDR1201 kubejs/startup_scripts/creative_tab/bakeries.js（1.20.1）
// 迁移到 1.21.1：标签页重映射 bakeries:bakeries_tab -> bakeries:0_bakeries_tab、bakeries:bakery_semi_manufactured_product_tab -> bakeries:1_bakeries_sfp_tab、bakeries:bakery_compat_tab -> bakeries:2_bakeries_compat_tab；剔除 9 个 1.21.1 已不存在的物品
StartupEvents.modifyCreativeTab('bakeries:0_bakeries_tab', (e) => {
  e.remove([
    'bakeries:blender',
    'bakeries:cheese_cube',
    'bakeries:cocoa_powder',
    'bakeries:whole_wheat_flour_bag',
    'bakeries:whole_wheat_flour',
    'bakeries:tomato',
    'bakeries:bottle_butter',
    'bakeries:bottle_cream',
    'bakeries:fermentation_tank',
    'bakeries:yeast_tank',
    'bakeries:cheese_tank',
    'bakeries:olive',
    'bakeries:black_white_concrete',
    'bakeries:butter_cube',
    'bakeries:flour_sieve',
    'bakeries:oven',
    'bakeries:moka_pot',
    'bakeries:moka_pot_fill',
    'bakeries:iced_american',
    'bakeries:iced_latte',
    'bakeries:brown_sugar_latte',
    'bakeries:cream_bingle_coffee',
    'bakeries:drink_cup',
    'bakeries:olive_oil',
    'bakeries:raw_coffee_bean',
    'bakeries:coffee_bean',
    'bakeries:ground_coffee',
    'bakeries:butter_flour_sand',
    'bakeries:whole_egg',
    'bakeries:raw_protein',
    'bakeries:raw_egg_yolk',
    'bakeries:fresh_cheese_cube',
    'bakeries:cake_base',
    'bakeries:carrot_cake',
    'bakeries:matcha_latte',
    'bakeries:coffee_table',
    'bakeries:sofa_light_gray',
    'bakeries:sofa_red',
    'bakeries:red_velvet_cake',
    //  'bakeries:red_velvet_cake_base',
    'bakeries:bearnaise',
    'bakeries:matcha_parfait',
    'bakeries:bake_sliced_toast',
  ]);
  e.add(['bakeries:mould_toast', 'bakeries:mould_cheese_cocoa_toast', 'bakeries:mould_pound_cake']);
});
StartupEvents.modifyCreativeTab('bakeries:1_bakeries_sfp_tab', (e) => {
  e.remove([
    'bakeries:salted_dough',
    'bakeries:cocoa_dough',
    'bakeries:pastry',
    'bakeries:cake_paste_bucket',
    'bakeries:egg_yolk_paste_bucket',
    'bakeries:foamed_protein_bucket',
    'bakeries:mould_cake_paste',
    'bakeries:mould_carrot_cake_paste',
    'bakeries:mould_red_velvet_cake_paste',
  ]);
});
StartupEvents.modifyCreativeTab('bakeries:2_bakeries_compat_tab', (e) => {
  e.remove([Item.of('bakeries:orange_american', '{Damage:0}')]);
});
