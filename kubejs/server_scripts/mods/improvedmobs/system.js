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
  // 所以难度值只落在 persistentData 里；客户端 HUD 要的那份镜像走 sendData（见 syncToClient）。
  player.persistentData.putDouble('cdr_difficulty_level', number);
  Difficulty.syncToClient(player, number);
};

/**
 * 把当前难度镜像给客户端（`client_scripts/difficulty_hud.js` 读这个包画 HUD）。
 * 纯显示用途：任何异常都吞掉，绝不能影响难度写入本身。
 * @param {Internal.ServerPlayer} player
 * @param {number} [level] 不传则按 persistentData 里的现值发
 */
Difficulty.syncToClient = function (player, level) {
  try {
    if (player == null) return;
    let value = level == null ? Difficulty.getPlayerRawValue(player) : level;
    let payload = new (Java.loadClass('net.minecraft.nbt.CompoundTag'))();
    payload.putDouble('level', value);
    // KubeJS 2101 在 Java 侧只声明了 kjs$sendData（DataSenderKJS），脚本层用哪个名字没有实测过，
    // 两个都试；第一个名字不存在会抛 TypeError，被下面的 catch 接住再走第二个。
    try {
      player.sendData('cdr_difficulty', payload);
    } catch (inner) {
      player.kjs$sendData('cdr_difficulty', payload);
    }
  } catch (error) {
    console.error(`[CDPR] 难度 HUD 同步失败：${error}`);
  }
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
// 需要时用 Difficulty.getPlayerRawValue(player) 读即可。
// 现在它只负责「登录时把难度补发给客户端」，给 HUD 用（不发就只是 HUD 空白，不影响难度逻辑）。
PlayerEvents.loggedIn((e) => {
  Difficulty.syncToClient(e.player);
});

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
