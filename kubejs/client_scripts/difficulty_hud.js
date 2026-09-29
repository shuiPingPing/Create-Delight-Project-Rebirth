// 难度 HUD（纯文字版）
//
// 源：CDR1201 `kubejs/client_scripts/render/render_difficulty_gui.js`（1.20.1）。
// 1.20.1 那版画的是左侧的进度条（`createdelightcore:textures/gui/difficulty_progress_bar*.png`），
// 但这几张条状贴图本包没有，所以先只画文字：档位名 + 当前难度值/下一档阈值。
// 难度值由服务端 `server_scripts/mods/improvedmobs/system.js` 通过 `cdr_difficulty` 频道镜像过来
// （客户端的 global 在 KubeJS 2101 里不可写，所以只能用网络包）。
(() => {
  const MinecraftClient = Java.loadClass('net.minecraft.client.Minecraft');
  const Component = Java.loadClass('net.minecraft.network.chat.Component');

  const DIFFICULTY_CHANNEL = 'cdr_difficulty';
  // 与 system.js 的 Difficulty.tierThreshold 保持一致
  const TIER_THRESHOLDS = [0, 100, 200, 300, 450, 600];
  const TIER_TEXT_COLORS = [0xcccccc, 0xadd8e6, 0xccffcc, 0xffcc4d, 0xff9999, 0xff8080, 0xc84646];

  // 服务端还没发过包时保持 null：不要在 HUD 上先显示一个错误的 0
  let difficultyLevel = null;

  NetworkEvents.dataReceived(DIFFICULTY_CHANNEL, (event) => {
    const data = event.data;
    if (data == null) return;
    difficultyLevel = data.getDouble('level');
  });

  ClientEvents.loggedOut(() => {
    difficultyLevel = null;
  });

  const getTier = (value) => {
    for (let index = 0; index < TIER_THRESHOLDS.length; index++) {
      if (value <= TIER_THRESHOLDS[index]) return index;
    }
    return TIER_THRESHOLDS.length;
  };

  RenderJSEvents.onGuiPreRender((event) => {
    if (difficultyLevel == null) return;
    // 开着界面时不画，免得压住 GUI（HUD 在界面后面仍会渲染）
    if (MinecraftClient.getInstance().screen != null) return;

    const tier = getTier(difficultyLevel);
    const color = TIER_TEXT_COLORS[Math.min(tier, TIER_TEXT_COLORS.length - 1)];
    const window = event.window;
    const x = Math.round(window.guiScaledWidth * 0.02) + 14;
    const y = Math.round(window.guiScaledHeight * 0.5) - 10;
    const value = Math.round(difficultyLevel);
    const nextThreshold = TIER_THRESHOLDS[Math.min(tier + 1, TIER_THRESHOLDS.length - 1)];
    const valueText =
      tier >= TIER_THRESHOLDS.length ? `§7${value}` : `§7${value}§8/§7${nextThreshold}`;

    event.drawString(
      Component.translatable(`difficulty.createdelightcore.tier.${tier}`),
      x,
      y,
      color
    );
    event.drawString(Component.literal(valueText), x, y + 10, 0xaaaaaa);
  });
})();
