let Difficulty = {};

/**
 *
 * @param {Internal.ServerPlayer} player
 * @returns {number}
 */
Difficulty.getPlayerRawValue = function (player) {
  return player.persistentData.getDouble('cdr_difficulty_level');
};

Difficulty.setPlayerRawValue = function (player, number) {
  // 注意：KubeJS 2101 只有 startup 域能写 global（server/client 绑到 unmodifiableMap），
  // 这里原来写的 global.difficultyCache 会抛 UnsupportedOperationException，别再写 global。
  // 屏幕上的难度显示不用我们操心：Improved Mobs 自带右上角 overlay，值就是本函数写进去的这个数
  // （lang 键 `improvedmobs.overlay.difficulty`），它自己跟服务端同步，不需要再发网络包。
  // 本轮曾试做过一份文字 HUD（`cdr_difficulty` 镜像包，提交 8f3f7af），确认 upstream overlay 够用后已撤回。
  player.persistentData.putDouble('cdr_difficulty_level', number);
};

Difficulty.getPlayerTier = function (player) {
  for (let index = 0; index < this.tierThreshold.length; index++) {
    if (this.getPlayerRawValue(player) <= this.tierThreshold[index]) return index;
  }
  return this.tierThreshold.length;
};

Difficulty.getPlayerCurrentProcess = function (player) {
  let tier = Difficulty.getPlayerTier(player);
  let rawValue = Difficulty.getPlayerRawValue(player);
  if (tier != this.tierThreshold.length) {
    return (
      (rawValue - this.tierThreshold[tier]) /
      (this.tierThreshold[tier + 1] - this.tierThreshold[tier])
    );
  } else return 0;
};

Difficulty.setPlayerCurrentProcess = function (player, process) {
  let tier = Difficulty.getPlayerTier(player);
  if (tier != this.tierThreshold.length) {
    Difficulty.setPlayerRawValue(
      player,
      (this.tierThreshold[tier + 1] - this.tierThreshold[tier]) * process + this.tierThreshold[tier]
    );
  }
};

Difficulty.getPlayerCurrentProcessValue = function (player, process) {
  let tier = Difficulty.getPlayerTier(player);
  if (tier != this.tierThreshold.length)
    return (
      this.tierThreshold[tier - 1] +
      (this.tierThreshold[tier] - this.tierThreshold[tier - 1]) * process
    );
  else return this.tierThreshold[tier - 1];
};

// 原来这里有一个 PlayerEvents.loggedIn 回调，只为把难度写进 global.difficultyCache（server 域不能写 global，
// 每次玩家登录都会抛 UnsupportedOperationException）。玩家难度值本来就存在 persistentData 里，
// 需要时用 Difficulty.getPlayerRawValue(player) 读即可，因此该回调整体删除；
// 屏幕显示由 Improved Mobs 自带 overlay 负责，不需要我们补发（要自己画也别写 global，用 player.sendData()）。

Difficulty.tierThreshold = [0, 100, 200, 300, 450, 600];

Difficulty.tierLangKeys = [
  'difficulty.createdelightcore.tier.0',
  'difficulty.createdelightcore.tier.1',
  'difficulty.createdelightcore.tier.2',
  'difficulty.createdelightcore.tier.3',
  'difficulty.createdelightcore.tier.4',
  'difficulty.createdelightcore.tier.5',
  'difficulty.createdelightcore.tier.6',
];

Difficulty.getTierFromValue = function (value) {
  for (let index = 0; index < this.tierThreshold.length; index++) {
    if (value <= this.tierThreshold[index]) return index;
  }
  return this.tierThreshold.length;
};
