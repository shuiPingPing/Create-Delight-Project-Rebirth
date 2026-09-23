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
  // Client.tell(number)
  // 注意：KubeJS 2101 只有 startup 域能写 global（server/client 绑到 unmodifiableMap），
  // 这里原来写的 global.difficultyCache 会抛 UnsupportedOperationException。
  // 1.20.1 里它是给客户端 HUD（client_scripts/render/render_difficulty_gui.js）读的，
  // 该 HUD 还没迁到 CDR1211；等迁过来时按本包惯例用 player.sendData() 做本地镜像，不要写 global。
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
// 若之后要恢复客户端 HUD，用 player.sendData() 同步，不要写 global。

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
