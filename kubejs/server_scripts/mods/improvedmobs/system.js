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
  global.difficultyCache = number;
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

PlayerEvents.loggedIn((e) => {
  global.difficultyCache = Difficulty.getPlayerRawValue(e.player);
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
