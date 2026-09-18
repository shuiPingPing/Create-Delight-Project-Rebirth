// priority: 100

/**
 *
 * @param {Internal.ServerPlayer} player
 * @returns {number}
 */
function GetPlayerDifficulty(player) {
  return player.persistentData.getDouble('cdr_difficulty_level');
}
