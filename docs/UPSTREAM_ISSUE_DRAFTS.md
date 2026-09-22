# 上游 issue 草稿（**未提交**，放着备用）

> 用途：把排查结论整理成可直接粘贴的 issue 文本。**当前没有提交**，因为整合包侧暂无升级 Northstar 的计划。
> 使用方式：复制下面「中文版」或「English」整段，贴到对应仓库的 issue 新建页即可；截图可用 `_dsh_tmp/icons/shot_odd_sun.png`（双日放大）、`vanilla_sun.png`（原版太阳贴图对照）。
> 目标仓库（按优先级）：
> 1. Core 本体：https://github.com/Jasons-impart/Create-Delight-Core/issues （mixin 在这里）
> 2. 整合包仓库：https://github.com/Jasons-impart/Create-Delight-Project-Rebirth/issues （pin 在这里）
> 3. 若两处都无 issue 功能，可走 CurseForge 评论/Discord。

---

## 中文版

**标题**：`TelescopeScreenMixin` 的 `@Shadow northstar$dimension` 在 Northstar 0.6.3 已被删除，导致无法升级到带「双日修复」的版本

**正文**：

不是催升级，只是把这个阻塞点反馈出来，方便你判断要不要处理。

**背景**：整合包在 Iris 光影下会出现「两个太阳」——一个是光影自绘的圆盘，另一个是原版方块 `sun.png`。

**已经定位**（我们在包里逐项排除过：与 Sable/机械子结构、Colorwheel/Flywheel 后端、Euphoria Patches、EclipticSeasons 都无关）：

- 光影包已声明 `sun=false` / `moon=false`（选项 `SUN_MOON_STYLE_DEFINE=2`，条件成立），Iris 本该隐藏原版太阳；
- **Northstar 0.6.1** 的 `com/lightning/northstar/mixin/client/LevelRendererMixin` 用 `@ModifyExpressionValue` 包住 `LevelRenderer.renderSky` 里的 `SUN_LOCATION` / `MOON_LOCATION`（`northstar$disableVanillaSunAndMoon` 等），与 Iris 的 `MixinLevelRenderer_SunMoonToggle`（同一 `renderSky`、同一对常量）**抢同一注入点**，使 Iris 的取消失效；
- 我们做了外科式验证：只从 `northstar.mixins.json` 里删掉 `"client.LevelRendererMixin"` 一项 → 双日立刻消失（证明就是这条）。

**上游已经修了**：Northstar **0.6.3** 的 changelog 写着
`- Fixed overworld sun/moon rendering compatibility (Enhanced Celestials, Ecliptic Seasons, Arctic Nights and others)`
——正是这一类问题。

**但升级被 Core 挡住**（这就是本 issue 想反馈的点）：

- Core 2.0.0.6 的 `io/github/jasonsimpart/mixin/northstar/TelescopeScreenMixin` `@Shadow` 了 `TelescopeScreen.northstar$dimension`；
- 该字段在 **0.6.3 中已被删除**（0.6.1 有）→ 升到 0.6.3 时 `@Shadow` 找不到目标 → 启动即崩；
- 顺带核对：`northstar$planet` 与 `PlanetRenderer.getViewRotation(DD…PlanetProperties, PlanetDimension)` 在 0.6.1/0.6.3 之间**未变**，改动只在这一处字段。

字段存在性实测（对两个 jar 的 `TelescopeScreen.class` 做常量池检查）：

| 符号 | Northstar 0.6.1 | Northstar 0.6.3 |
|---|---|---|
| `TelescopeScreen.northstar$dimension` | ✅ 有 | ❌ 已删除 |
| `TelescopeScreen.northstar$planet` | ✅ | ✅ |
| `PlanetRenderer.getViewRotation(DD…PlanetProperties,PlanetDimension)` | ✅ | ✅（签名不变） |

**可以怎么修**（任选，你更清楚哪条稳）：不再 `@Shadow` 该字段（从 `northstar$planet` 或 `PlanetDimension` 侧推）、改用版本容错的访问方式、或按 Northstar 版本拆成两份 mixin 配置。

**我们的现状**：因为暂时没有升级计划，整合包这边继续 pin **Northstar 0.6.1**，用户会看到双日；我们在本地准备了两个可逆的绕法（摘 mixin / 透明太阳资源包），但都**未启用**。

**环境**：Minecraft 1.21.1 / NeoForge 21.1.242 / Java 21；`createdelightcore-2.0.0.6+1.21.1.jar`；`Northstar-0.6.1+1.21.1.jar`（sha1 `1f588a45611ad29a0434fff235e187d925374252`，CurseForge file-id `8307391`）；Iris `1.8.14-beta.1`；Complementary Unbound `r5.9.3`（+ Euphoria Patches `1.10.5`）。

---

## English

**Title**: `TelescopeScreenMixin` shadows `northstar$dimension`, which was removed in Northstar 0.6.3 — this blocks upgrading to the version that fixes overworld sun/moon rendering

**Body**:

Not a request to upgrade, just a heads-up on a blocker so you can decide whether it is worth handling.

**Context**: with Iris shaders enabled the pack shows **two suns** — the shader's own sun plus the vanilla `sun.png` one.

**What we found** (we ruled out Sable/sub-levels, the Colorwheel/Flywheel backend, Euphoria Patches and EclipticSeasons one by one):

- The shaderpack does declare `sun=false` / `moon=false` (option `SUN_MOON_STYLE_DEFINE=2`, so the conditional applies), i.e. Iris is supposed to hide the vanilla sun;
- **Northstar 0.6.1**'s `com/lightning/northstar/mixin/client/LevelRendererMixin` uses `@ModifyExpressionValue` on `LevelRenderer.renderSky`'s `SUN_LOCATION` / `MOON_LOCATION` (`northstar$disableVanillaSunAndMoon` and friends). Iris' `MixinLevelRenderer_SunMoonToggle` targets the very same `renderSky` / constants, so Northstar's wrapper defeats Iris' cancel;
- Surgical proof: removing only `"client.LevelRendererMixin"` from `northstar.mixins.json` makes the duplicate sun disappear immediately.

**Already fixed upstream**: Northstar **0.6.3** changelog says
`- Fixed overworld sun/moon rendering compatibility (Enhanced Celestials, Ecliptic Seasons, Arctic Nights and others)`.

**But Core blocks the upgrade** (the actual point of this issue):

- Core 2.0.0.6's `io/github/jasonsimpart/mixin/northstar/TelescopeScreenMixin` `@Shadow`s `TelescopeScreen.northstar$dimension`;
- that field **no longer exists in 0.6.3** (it does in 0.6.1) → `@Shadow` cannot be applied → crash on startup when upgrading;
- for reference, `northstar$planet` and `PlanetRenderer.getViewRotation(DD…PlanetProperties, PlanetDimension)` are unchanged between 0.6.1 and 0.6.3 — only that one field moved.

Constant-pool check of `TelescopeScreen.class` in both jars:

| symbol | Northstar 0.6.1 | Northstar 0.6.3 |
|---|---|---|
| `TelescopeScreen.northstar$dimension` | present | **removed** |
| `TelescopeScreen.northstar$planet` | present | present |
| `PlanetRenderer.getViewRotation(DD…PlanetProperties, PlanetDimension)` | present | present (same signature) |

**Possible fixes** (your call — you know which is safest): stop shadowing that field (derive it from `northstar$planet` / `PlanetDimension`), use a version-tolerant accessor, or ship version-specific mixin configs.

**Our side for now**: since there is no upgrade plan right now, the pack stays pinned to **Northstar 0.6.1**, so players will see the duplicate sun. We prepared two reversible local workarounds (strip the mixin / transparent `sun.png` resource pack) but neither is enabled.

**Environment**: Minecraft 1.21.1 / NeoForge 21.1.242 / Java 21; `createdelightcore-2.0.0.6+1.21.1.jar`; `Northstar-0.6.1+1.21.1.jar` (sha1 `1f588a45611ad29a0434fff235e187d925374252`, CurseForge file-id `8307391`); Iris `1.8.14-beta.1`; Complementary Unbound `r5.9.3` (+ Euphoria Patches `1.10.5`).
