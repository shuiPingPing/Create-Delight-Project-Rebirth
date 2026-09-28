# Create Aeronautics（航空学）在 CDR1211 的接入记录

> 记录 CDR1211（1.21.1 NeoForge 版）引入 **Create Aeronautics 及其 33 个附属/兼容层** 的过程、
> 依赖链约束、实机踩坑与当前遗留问题。
> 原始过程记录见 `../移植作战图.md` §九「Create Aeronautics 附属安装（2026-09-20）」，
> 以及 `../移植台账.md` 里与上游升级相关的条目（§七 平台/依赖、§8.x 版本取舍）；
> 本文是整理版，遇到细节冲突以那两处为准。

## 1. 背景

- **CDR1201（1.20.1 源包）里没有这个模组体系**——它是 1.21.1 侧新增的。
- CDR1211 最初通过上游 PR #94 引入 **本体** `create-aeronautics-bundled-1.21.1-1.3.0` +
  Compatibility（Thick Air 1.1.2），2026-09-20 本次把**附属与兼容层补齐**：
  `mods/common` 的元数据从 361 个增加到 **397 个**（本批 +33 个附属，其余差额是同批的其它元数据变动）。
- 体系构成：本体（bundled，内部 jar-in-jar 带 `simulated` 等）+ 物理引擎 **Sable**
  （`sable-neoforge-1.21.1-2.0.5`）+ 各附属/兼容层。

## 2. 进包清单（33 个附属）

元数据都在 `mods/common/`。下表的 `side` 取自各自的 `.pw.toml`（本批 33 个里只有 4 个是 `client`）。

**核心 3 个（本批之前就有，sable 本批升级）**

| 模组 | 元数据 | jar |
| --- | --- | --- |
| Create Aeronautics（本体） | `create-aeronautics.pw.toml` | `create-aeronautics-bundled-1.21.1-1.3.0.jar` |
| Create Aeronautics: Compatibility | `create-aeronautics-compatibility.pw.toml` | `thick_air-1.21.1-NeoForge-1.1.2.jar` |
| Sable（物理引擎，本次升级） | `sable.pw.toml` | `sable-neoforge-1.21.1-2.0.5.jar` |

**兼容层 7 个**（主模组本就在包里，缺的是桥接层）

| 模组 | 元数据 | jar |
| --- | --- | --- |
| Copycats+ aeronautics weight | `copycats-aeronautics-weight.pw.toml` | `aerocopycats-1.1.1.jar` |
| Carry On + Create Aeronautics Compat | `carryon-aeronautics-compat.pw.toml` | `CarryOnAeroCompat-1.21.1-1.1.1.jar` |
| Waystones: Sable | `waystones-sable.pw.toml` | `waystonessable-1.0.7.jar` |
| Create Stuff 'N Additions x Sable & Aeronautics | `create-stuff-n-additions-x-sable-aeronautics-compat.pw.toml` | `SableStuffAdditionsCompat v1.0.3-1.21.1.jar` |
| TACZ Aeronautics Compat | `tacz-aeronautics-compat.pw.toml` | `tacz_aero_compat-1.8.0.jar` |
| Create: Northstar-Aeronautics Compatibility | `create-northstar-aeronautics-compatibility.pw.toml` | `cnbridge-1.0.0.jar` |
| Create: Design n' Decor - Aeronautics Compat | `create-design-n-decor-aeronautics-compat.pw.toml` | `dnd_aero_compat-1.0.0.jar` |

**功能附属 26 个**

| 模组 | 元数据 | jar | side |
| --- | --- | --- | --- |
| Aeronautics:Addition | `aeronautics-addition.pw.toml` | `aero_addition-1.0.2.jar` | both |
| Aeronautics: Calibrated | `aeronautics-calibrated.pw.toml` | `Neoforge-Aeronautics-Calibrated-1.4.0.jar` | both |
| Create Aeronautics: Claims | `aeronautics-claims.pw.toml` | `aeroclaims-0.9.4.jar` | both |
| Create Aeronautics: Dyeable Components | `aeronautics-dyeable-components.pw.toml` | `dyeable-components-1.0.4+mc1.21.1.jar` | both |
| Create Aeronautics: Automated Logistics | `create-aeronautics-automated-logistics.pw.toml` | `create_aeronautics_automated_logistics-0.6.2.jar` | both |
| Climbable Ropes for Create Aeronautics | `create-aeronautics-climbable-rope.pw.toml` | `climbable_ropes-2.1.3.jar` | both |
| Create Aeronautics: Encased Fluid Pipes | `create-aeronautics-encased-fluid-pipes.pw.toml` | `aeroencasedpipe-1.0.7.jar` | both |
| Create Aeronautics: Gadgets & Gizmos | `create-aeronautics-gadgets-and-gizmos.pw.toml` | `gadgets-and-gizmos-bundled-V1.2.4.jar` | both |
| Create Aeronautics: Gyro Stabilizers | `create-aeronautics-gyroscope-stabilizers.pw.toml` | `Create Aeronautics Gyroscope Stabilizers.jar` | both |
| Create Aeronautics Lift Patch | `create-aeronautics-lift-patch.pw.toml` | `create-aeronautics-lift-patch-1.1.0.jar` | both |
| Create Aeronautics [Offroad]: StickyWheels | `create-aeronautics-offroad-addon-stickywheels.pw.toml` | `stickywheels-1.21.1-0.0.3.jar` | both |
| Create Aeronautics Physics Gantry | `create-aeronautics-physics-gantry.pw.toml` | `createaerophysicsgantry-1.0.3.jar` | both |
| Portable Engine Liquid Fuel | `create-aeronautics-portable-engine-liquid-fuel.pw.toml` | `portable_engine_liquid_fuel-2.0.0-neoforge-1.21.1.jar` | both |
| Throwable Rope Connector | `create-aeronautics-throwable-rope-connector.pw.toml` | `create_aeronautics_throwable_rope_connector-0.4.3.jar` | both |
| Create Aeronautics: Toolgun | `create-aeronautics-toolgun.pw.toml` | `create_aeronautics_toolgun-0.3.6.jar` | both |
| Transmission & Linkage | `create-aeronautics-transmission-linkage.pw.toml` | `create_aeronautics_transmission_linkage-0.2.8.jar` | both |
| Create: Hangars (Aeronautics) | `create-hangars.pw.toml` | `create-hangars-V1.0.0.jar` | both |
| Create: Lift n' Load | `create-lift-n-load.pw.toml` | `Lift-n-Load-1.21.1-1.0c.jar` | both |
| Man of Many Planes | `man-of-many-planes.pw.toml` | `man_of_many_planes-0.2.2+1.21.1-neoforge.jar` | both |
| Aeronautics: simulated copycats | `simulated-copycats.pw.toml` | `sim_copycats-1.3.2.jar` | both |
| Separate Sable Render Distance（SSRD） | `ssrd.pw.toml` | `SSRD-1.8.6-1.21.1.jar` | both |
| Presence Footsteps x Sable | `presence-footsteps-x-sable.pw.toml` | `pfsable-1.0.jar` | both |
| Aeronautics Propeller Blur | `aeronautics-propeller-blur.pw.toml` | `AeroPropBlur-1.21.1-1.0a.jar` | **client** |
| Aeronautics Wind Sound | `aeronautics-wind-sound.pw.toml` | `aeronautics_windsound-1.0.1.jar` | **client** |
| Aeronautics Camera Sync | `aero_cam_sync.pw.toml` | `aero_cam_sync-1.4.0.jar` | **client** |
| Sable: Mass view | `create-aeronautics-(sable)-mass-view.pw.toml` | `sablemassview-1.0.0.jar` | **client** |

> Wind Tunnel 曾进包，后因 mixin 崩溃移除（见 §4 第 1 条），不在本表。

## 3. 没装的 5 个（有意跳过）

- **依赖未装 3 个**：`vista-aeronautics-fix`（要 Vista）、`create-avionics`（要 CC: Tweaked）、
  `create-aeronautics-rechiseled-compatibility`（要 Rechiseled）。
- **用户明确不装 2 个**：Sable: Collision damage、Delivery Required。

## 4. 依赖链要求（本次实际升级的主 mod）

附属声明/运行时检查的版本要求，把主 mod 一路顶上去了：

| 附属要求 | 主 mod 升级 | 备注 |
| --- | --- | --- |
| `aeroclaims` 要 sable ≥ 2.0.5 | sable 2.0.3 → **2.0.5** | Sable 升级是后面 Wind Tunnel mixin 崩的源头 |
| `sable_sa_compat` 要 create_sa ≥ 2.1.3 | create-stuff-additions 2.1.0e → **2.1.4b** | |
| `waystonessable` 要 waystones ≥ 21.1.39 | waystones 21.1.30 → **21.1.45** | 连带要升 balm |
| `createthrusters`（Gadgets & Gizmos 内部）**运行时**硬检查 create_connected ≥ 1.2.0 | create_connected 1.1.14 → **1.3.3** | 非 mods.toml 声明，静态查依赖看不出来 |

**连带依赖**：waystones 21.1.45 的 `LoginHandler` 调 `Balm.networking()`，而 Balm 21.0.56 没有这个方法
→ 创建世界、玩家加入时 `NoSuchMethodError` → balm 21.0.56 → **21.0.65**。

## 5. 踩坑与处置

静态检查 33 个附属全过，但实机启动/进世界连续崩了 6 次，全是「依赖版本 / 运行时硬检查 / mixin 兼容」问题。
下面 1~6 是那 6 个坑，7 是连带产生的工作量；Drippy 那条单独展开，因为它的结论订正过一次。

1. **mixin 冲突（移除）**：`windtunnel` 的 `BlockSubLevelLiftProviderMixin` 对 interface 用 `@Inject`
   （`InvalidInterfaceMixinException`）——Sable 升到 2.0.5 后 `BlockSubLevelLiftProvider` 变成了 interface，
   上游也没有兼容新版 → **移除 Wind Tunnel**。
2. **Drippy Loading Screen 早期崩溃**：`updateModuleReads` 用
   `Thread.currentThread().getContextClassLoader()` 而不是传入的 `ModuleLayer`，启动早期找不到主 mod 的
   `CustomLoadingOverlay` → 一度移除 Drippy。
   - 二分结论（2026-09-20 晚，用上游 clone 做的对照实验）：触发条件是 **SSRD**——它 "rewrites Sable"，
     会破坏 Drippy 依赖的 Thread context ClassLoader。验证链：上游原版（无 aeronautics）Drippy 正常 →
     + sable 2.0.5 仍正常 → + SSRD **精确复现崩溃**。
   - **2026-09-21 晚二次订正**：完整 411 mod 环境里 **Drippy + SSRD 可以共存**（aeronautics bundled 自带
     `simulated`，改变了加载状态，中和了 SSRD 的 rewrite）→ **Drippy 已装回**（3.1.5 + SSRD 1.8.6 + Sable 2.0.5
     两次启动均正常，加载屏背景换成 create_delight 主题图）。issue 报告搁置（复现不了）。
3. **`create_dragons_plus` 的 simulated 缺口（未定位）**：它的 ponder 集成硬引用
   `dev.simulated_team.simulated`（Create: Simulated）类，但 mods.toml 没声明依赖、也没有守卫；
   simulated 本体已停维护（Modrinth 404，被 Sable 取代），sable 在场时该集成会崩。
   去掉 Drippy 后未复现（疑被某附属中和）。注意 `create_dragons_plus` 被
   `create_integrated_farming` / `create_enchantment_industry` / `create_central_kitchen` 依赖，
   **移除它会连锁缺依赖**。
4. **上游升级 145 个模组后的 JEI 冲突（按 E 开背包硬崩）**：上游把 JEI 升到 19.57，而 aeronautics 内嵌的
   `simulated 1.3.0` 的 `silence_jei.ItemStackListFactoryMixin` 注入失败
   （`InjectionError … 0/1 succeeded. Scanned 0 target(s)`）→ 进游戏按 E 即崩。
   处置：**JEI 锁 19.27.0.336**，并连带回退 6 个要求更高 JEI 的模组
   （ldlib2 / polymorph / ftb-xmod-compat / sophisticatedcore / sophisticatedbackpacks / 其 create-integration）。
   因为 **aeronautics 体系是本 fork 独有的**（上游的兼容性 pin 清单里没有这些），这类兼容问题只能我们自己盯；
   逐条清单见 `MOD_UPDATE_COMPATIBILITY.md`。
5. **Flywheel 被 jar-in-jar 降级**：aeronautics 的 bundled（以及 `simulated` / `createthrusters` / `sable`）
   内嵌 Flywheel **1.0.4**，而 Create 6.0.10 需要 ≥ 1.0.6；JarJar 按发现顺序解析，旧版会静默生效并引发
   一连串渲染/启动问题。同类问题 2026-09-24 又在 Vanillin 上复现过一次（已移除 Vanillin）。
   → 升级/新增模组后**务必检查 `flywheel` 实际版本**（日志里 `Mod ID: 'flywheel', Requested by: ...,
   Actual version: ...` 那一行）。
6. **`pack-integrity.mjs` 解析不到 Create: Hangars 的 modId**：该 jar 本质是 datapack 伪装 mod，
   mods.toml 用新式 `mods = [ ... ]` + 单引号（modId `mr_create_hangars`），而脚本原来只认旧式
   `[[mods]]` + 双引号 → 生成完整性清单报错。已给 `getModIdsFromTomlText` 加新式数组 + 单引号支持。
7. **汉化**：这批附属带进来大量新键（如 `create_aeronautics_automated_logistics` 711 键、`sable` 302 键），
   已按 A~D 批次补齐（见 `../移植台账.md` 汉化相关章节）。

## 6. 当前状态与已知噪音

- **状态**：进游戏正常；这条体系（本体 + 附属 + Sable + 光影栈）是当前 fork 的核心玩法层之一。
- **Sable 物理属性 tag 警告**（噪音级）：`Failed to apply tag physics properties. Unknown block: …`
  ——`copycats:copycat_step|catwalk`、`gyro:removed_block_placeholder` 各 23 条，是物理属性 tag 引用了
  未安装的方块，不影响运行。
- **Sable 与光影栈是硬耦合的**（升级 Sable 时要留意）：它的 jar-in-jar 里带
  `veil-neoforge-1.21.1-4.3.2.jar`（另带 `sable_rapier`、`sable-companion-common-1.6.0`），
  并自带 Iris 兼容 mixin `compatibility.iris.ExtendedShaderMixin`（见 `sable.mixins.json`）。
  我们排查「双日」问题时已逐一排除 Sable / Colorwheel / Flywheel / Euphoria / EclipticSeasons，
  **最终根因是 Northstar 的 `renderSky` mixin 顶掉了 Iris 的日月开关**（处置见作战图 §11.5；
  当前方案＝**保留本地补丁** `scripts/patch-northstar-sun.ps1`，2026-09-24 用户决定，见作战图 §11.5 与台账 §8.2）。
- **Sable 自己声明的版本边界**（`sable.pw.toml` 对应 jar 的 `neoforge.mods.toml`）：
  `flywheel` ≥ 1.0.6（client）、`create` `[6.0.10, 6.1.0)`、`sodium` < 0.8.12-alpha.2 **不兼容**、
  `sablecompanion` > 1.6.0 **不兼容**（"Sable is out of date"）。
- **观察项**：`tacz_aero_compat 1.8.0` 早于其宿主 TACZ 1.1.8-hotfix-r6（Modrinth 无更新版），
  崩了就把 TACZ 锁回。

## 7. 维护提示（再动这套体系时）

1. **静态查依赖远远不够**：必须实机验证「版本范围 + 运行时硬检查 + mixin 目标 API 兼容」。
2. **依赖链是递进的**（waystones → balm 就是例子），升一个主 mod 往往带出一串。
3. **优先看 JarJar 内嵌物**：`flywheel` / `simulated` 这类被内嵌的库版本，决定实际运行时行为。
4. **新增附属后**：跑 `devtool.bat check`、进游戏看日志里有无 mixin/依赖 FATAL，
   必要时更新 `kubejs/config/createdelight_pack_integrity_expected.json`。
5. **纯客户端渲染附属**记得标 `side = "client"`，避免进服务端包。
