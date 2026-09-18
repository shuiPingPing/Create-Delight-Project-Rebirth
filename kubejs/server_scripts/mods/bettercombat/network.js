NetworkEvents.dataReceived('show_bettercombat_mine_key', (e) => {
  if (!e.player.persistentData.getBoolean('betterCombatMineKey'))
    e.player.tell(Component.translate('message.createdelightcore.show_bettercombat_mine_key'));
  e.player.persistentData.putBoolean('betterCombatMineKey', true);
});
