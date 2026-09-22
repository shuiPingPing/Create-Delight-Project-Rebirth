# 2026-09-20 模组更新兼容性记录

基线保持 Minecraft 1.21.1、NeoForge 21.1.242、Java 21。
本次更新 145 个现有模组，补充 Advanced Loot Info 所需的 Advanced Core Info，
将 Complementary Unbound 升至 r5.9.3；Waystones2Waypoints2 移至 common，以满足服务端握手。
Mechanical Spawner 配方同步使用新的 `spawn_fluid_piglin` 流体 ID。

## 暂缓更新

以下描述符设置 `pin = true`。解除锁定前，应先解决对应兼容性问题，并验证启动、脚本 reload 和客户端连接。

| 描述符 | 原因 |
| --- | --- |
| `mods/common/alexs-mobs-up.pw.toml` | 新版 mod ID 从 alexsmobsup 改为 alexsmobs，当前配方/数据未作命名空间迁移 |
| `mods/common/alexs-caves-up.pw.toml` | 与 Citadel Up 命名空间迁移绑定，当前 Core 强依赖 alexscavesup |
| `mods/common/citadel-up.pw.toml` | 新版 mod ID 从 citadelup 改为 citadel，当前 Core 强依赖 citadelup |
| `mods/common/create-delight-core.pw.toml` | **2026-09-21 升到 2.0.0.6 后重新锁定**：2.0.0.6 补齐了 mbd2 机器物品（`andesite_import_bus`/`andesite_export_bus`/`butchery_room`/`copper_coil`/`create_in`/`mechanic_grinding_wheel`/`centrifuge_rotor`/`forge_steel_fan`）与 `compat/mbd2` 机器集成，上游 09-20 批次里 12 处配方失败随之消失；仍缺 `forged_steel_ingot`（由 `kubejs/startup_scripts/mods/createdelightcore/content_restore.js` 补回）与 `rolled_polymer_sheet`（源包也没有该 id）。升级后 Core API 仍需单独验证。 |
| `mods/common/createaddition.pw.toml` | 最新版要求 NeoForge 21.1.248，仓库基线固定 21.1.242；先保留已验证版 |
| `mods/common/cultural-delights.pw.toml` | 最新版要求 NeoForge 21.1.247，仓库基线固定 21.1.242；先保留已验证版 |
| `mods/common/uranus.pw.toml` | 最新版要求 NeoForge 21.1.248，仓库基线固定 21.1.242；先保留已验证版 |
| `mods/common/iceandfire-ce.pw.toml` | 最新版要求 NeoForge 21.1.248，仓库基线固定 21.1.242；先保留已验证版 |
| `mods/common/supplementaries.pw.toml` | 最新版要求 NeoForge 21.1.247，仓库基线固定 21.1.242；先保留已验证版 |
| `mods/common/multiblocked2.pw.toml` | 保留 21.0.x，避免跨越 Core 集成依赖的 21.1 API 边界。 |
| `mods/common/create-integrated-farming.pw.toml` | 实测无法启动：新版要求 Supplementaries 3.9.9，该版本又要求 NeoForge 21.1.247 |
| `mods/common/kubejs.pw.toml` | 升级后标签回调和混合物品/流体数组触发 Rhino 类型错误，保留已验证脚本引擎组合 |
| `mods/common/rhino.pw.toml` | 新版在现有数组解构回调及混合参数上出现回归，随 KubeJS 保留原验证版本 |
| `mods/common/northstar-redux.pw.toml` | 新版 TelescopeScreen 方法签名变化，与 Core 的客户端 mixin 不兼容。 |
| `mods/common/youkais-homecoming-unofficial-port.pw.toml` | 新版饮品配方 codec 要求 amount，现有 10 条茶饮输出为 count，实际 RecipeManager 解析失败 |
| `mods/common/probejs.pw.toml` | 新版 8.0.3 强依赖 KubeJS build.365 以上，随已验证脚本引擎组合保留旧版 |
| `resourcepacks/create-functional-storage.pw.toml` | 更新源 latest 指向 old_copper 补丁而非完整资源包，不能替换原主体资源包 |
| `mods/common/waystones.pw.toml` | 新版 restrictedWaystones 枚举集合与 Jupiter 配置桥接不兼容。 |
| `mods/common/improved-mobs.pw.toml` | 新版默认装备池引用当前不存在的 Ice and Fire / Dreadsteel 物品。 |
| `mods/common/create-connected.pw.toml` | 新版可选染色催化剂的战利品表引用未注册物品。 |
| `mods/common/create-diesel-generators.pw.toml` | 新版战利品表引用不存在的 andesite_girder_strut。 |
| `mods/common/create-fantasizing-again.pw.toml` | 新版 transporter 进度 JSON 无法解析。 |
| `mods/common/justenoughbreeding.pw.toml` | 新版三条兼容配方引用无效物品或不合法的 ingredient。 |
| `mods/common/tenshilib.pw.toml` | 随 Improved Mobs 保留原版；新版删除其使用的 transferHandler API。 |
| `mods/common/farmers-delight.pw.toml` | 新版战利品 codec 将 lootTable 改为 table，导致 Miners Delight / My Nethers Delight 三个战利品扩展失效。 |
| `mods/common/abnormals-delight.pw.toml` | 新版要求 Farmer’s Delight 1.3.4，随其兼容性锁定保留原版。 |
| `mods/common/dungeons-delight.pw.toml` | 新版两个战利品扩展使用新的 table 字段，随 Farmer’s Delight 保留原版。 |
| `mods/client/jei.pw.toml` | **本 fork 特有**：新版 JEI（19.57.0.444）令 aeronautics bundled 内嵌的 `simulated 1.3.0` 的 `silence_jei.ItemStackListFactoryMixin` 注入失败（`InjectionError … 0/1 succeeded. Scanned 0 target(s)`），进游戏后按 E 开背包即崩；锁回 19.27.0.336 |
| `mods/common/ldlib.pw.toml` | **随 JEI 锁定**：新版 LDlib2 2.2.40 要求 JEI ≥ 19.51.0.417，而本仓库必须锁 JEI 19.27；保留 2.2.27 |
| `mods/common/polymorph.pw.toml` | 随 JEI 锁定：新版要求 JEI ≥ 19.52.0.421，保留 1.1.0 |
| `mods/common/ftb-xmod-compat.pw.toml` | 随 JEI 锁定：新版要求 JEI ≥ 19.53.0.425，保留 21.1.8 |
| `mods/common/sophisticated-core.pw.toml` | 随 JEI 锁定：新版要求 JEI ≥ 19.32.0.359，保留 1.4.36.1833 |
| `mods/common/sophisticated-backpacks.pw.toml` | 随 Sophisticated Core 保留配对版本 3.25.44.1736 |
| `mods/common/sophisticated-backpacks-create-integration.pw.toml` | 随 JEI 锁定：新版要求 JEI ≥ 19.32.0.359，保留 0.1.5.29 |
| `mods/common/carry-on.pw.toml` | **本 fork 特有**：Carry On 2.2.6.13 改动了 `PickupHandler` 内部结构，aeronautics 兼容层 `carryonaerocompat 1.1.1`（Modrinth 项目 `MpnDZ1Lx`）的 `PickupHandlerMixin` redirect 注入失败（`CarryOnAeroCompat$distanceTo … 0/1 succeeded. Scanned 0 target(s)`），右键方块即崩；锁回 2.2.4.4 |

> 同类风险（aeronautics 兼容层 × 被本批升级的宿主模组）：兼容层是围绕当时的宿主版本写的，
> 而本批升级了 145 个模组。已核实：`aerocopycats`（copycats 3.0.4 → 3.0.9）**不含 mixin**，不受影响；
> `tacz_aero_compat`（tacz 1.1.7-hotfix-r5 → 1.1.8-hotfix-r6）含 mixin 但目标为原版类，风险待实机确认。
> 其余兼容层的宿主（waystones / create-stuff-additions / northstar / create-aeronautics 本体 /
> ldlib2 / sable）本批未变。

> 上述「随 JEI 锁定」的 6 个描述符与 JEI 是一组：只要 aeronautics 仍内嵌 `simulated 1.3.0`，
> JEI 就不能升到 19.32+。解除这一组的前提同样是先解决 `simulated` 的 JEI 集成。
>
> 另：`mods/common/ssrd.pw.toml`（Separate Sable Render Distance）**已于同日装回并实测通过**。
> 上游模组更新后 Drippy 的早期窗口曾再次报 `Custom loading overlay class missing`
> （完整报文为 `[DRIPPY LOADING SCREEN] Custom loading overlay class missing`，死在模组加载前，
> 因此不产生 crash 报告，HMCL 报 “Crash reason unknown”）；当时先移除 SSRD 复测通过；
> 随后在一整轮修复（JEI 锁 19.27、CDC 升 2.0.0.6、Carry On 回退 2.2.4.4、6 个 JEI 关联模组回退）
> 之后重装 SSRD，2026-09-21 17:00 实机确认 **Drippy 3.1.5 + SSRD 1.8.6 共存、加载屏正常**
> （日志：`Loading ImmediateWindowProvider drippy_early_window` + `SSRD: Initialized v1.8.6`）。
>
> **结论订正**：SSRD×Drippy 的崩溃是**环境相关**的（与该会话早先「SSRD 是触发条件之一、
> 非充分条件」的判断一致），**不是稳定的二选一**。将来若再复现，按「先撤 SSRD 复测」的顺序排查。

> 本仓库比上游 main 额外包含 Create Aeronautics 体系（本体 + 33 附属 + Sable/SSRD），
> 其中 `create-aeronautics-bundled-1.21.1-1.3.0.jar` 以 jarinjar 内嵌 `simulated 1.3.0`。
> `simulated` 已停止维护（Modrinth 404，功能被 Sable 取代），它与 JEI 的集成 mixin 会随
> JEI 升级失效且为硬失败，因此 JEI 在 fork 侧一并锁定。解除锁定前需先确认新版
> aeronautics 是否仍内嵌 `simulated`、或其 JEI 集成方式是否已更换。

Collectors Reap、Mutil、Silent’s Delight、Tetra、Vintage Delight 使用 URL 描述符，没有自动更新源，本次保留原版本。

`pin` 只约束版本更新，不会保护手动替换的 jar。`install-files` 会按描述符下载并校验文件；开发覆盖需要另行备份。

## 更新后检查

运行 `./devtool.sh generate-integrity-manifest`、`./devtool.sh refresh` 和 `./devtool.sh check`。
完整性清单生成器会区分启动服务、FML 库与实际模组，同时继续扫描嵌套 jar。
发布前还需验证公开 Core 构建与提交中的脚本，而不能用不同开发构建的运行结果代替。

本批提交使用描述符指定的公开 Core 2.0.0.5 完成独立服务端启动和 reload 验证：
4 个启动脚本、180 个服务端脚本无加载错误，KubeJS 配方生成无失败；
与更新前 main 对照，没有新增 ERROR 项或战利品修饰器解码失败。
已有上游日志问题仍存在；此检查不覆盖客户端完整游玩、旧存档迁移或启用光影后的画面。

## 2026-09-21 客户端光影栈调整（Colorwheel 取代 Iris Flywheel Compat）

按 1.20.1 原包的组合重建光影栈（1.20.1 = Oculus + Colorwheel + Colorwheel Patcher + Euphoria Patcher，
光影有 Complementary Unbound r5.8.1 / Solas V3.6 / Glimmer v1.5.2 / I Like Vanilla v1.4.1 / Spooklementary / Steadfast）。

| 动作 | 描述符/文件 | 说明 |
| --- | --- | --- |
| 新增 | `mods/client/colorwheel.pw.toml` | Colorwheel **1.2.9+mc1.21.1**（Modrinth 项目 `BzHgFoGz`、版本 `Uhs2KYar`，sha1 `33f3f4976755d0b315d3853f2e2aad38e11825c2`）。**URL 描述符、无自动更新源**：bkmpw 0.1.1 未实现 `mode = "metadata:modrinth"`（`install-files` 报 `missing source file for Colorwheel`），而 `add-curseforge` 按 slug 解析需要 CurseForge API key（报 `add-curseforge by slug/url needs [curseforge] api-key or CURSEFORGE_API_KEY`）。写入 `mods/*.pw.toml` 后按仓库约定手工挪到 `mods/client/`。 |
| 新增 | `mods/client/euphoria-patcher.pw.toml` | **Euphoria Patches 1.10.5-r5.9.3**（Modrinth 项目 `4H6sumDB`、版本 `QMsRXtSJ`，sha1 `2b3f92878d6867fa0199937da25ba882b9db7902`，URL 描述符）。**版本号里的 `-r5.9.3` 必须与 `shaderpacks/ComplementaryUnbound_r5.9.3.zip` 对齐**：Euphoria Patcher 会把 Complementary 打成 `ComplementaryUnbound_r5.9.3 + EuphoriaPatches_1.10.5` 的文件夹版（1.20.1 当时用的是 `r5.8.1 + EuphoriaPatches_1.9.3`），机械吃光影的 `clrwl_*` 集成文件在打补丁后依然在内。 |
| 移除 | `mods/client/iris-flywheel-compat.pw.toml` + `iris-flywheel-compat-NeoForge-2.4.0.jar` | Colorwheel 自 0.1.0 起与其 **mixin 冲突**，作者声明 "This won't be fixed"（Colorwheel 项目页 Compatibility 节）。jar 备份于 `_dsh_tmp/removed-mods/`。 |
| 启用 | `shaderpacks/ComplementaryUnbound_r5.9.3.zip` | `config/iris.properties` 的 `shaderPack=` 指向它（该文件属本地运行状态，不入库）。zip 的 sha1 `2ee08300e1d6f039e63eae8484dddf57b3aaaf67` 与 Modrinth 官方版本一致，与描述符里指向的 CurseForge 文件是同一份。 |

依据：Colorwheel 项目页的“官方支持”名单包含 Complementary Unbound/Reimagined（自 r5.7）、
Euphoria Patches（自 1.7.0）、Solas（自 v3.2）、Glimmer（v1.5+）、I Like Vanilla（v1.0.3+）、
Spooklementary（v2.0.3+）、Steadfast —— 1.20.1 原包那一整套都可在 1.21.1 直接复用。
装上 Colorwheel 后 Create 6 的机械/飞船才会真正接受光影照明与投影；作者另外提示
Entity Shadows / Block Entity Shadows 在光影里默认常关，需手动打开。

未采纳：Colorwheel `1.3.0-beta3`（新增 `colorwheel:indirect` 后端，Create 密集区约 +30% FPS）——beta 通道，本次不进包，
待 1.3.0 转正后再评估。

**上游对照（合并时必看）**：`iris-flywheel-compat` 是**上游文件** —— `upstream/main` 及上游各分支都有
`mods/client/iris-flywheel-compat.pw.toml`（由上游 PR #136 `400189e` 更新过）。因此本节的删除属于**本 fork 的有意偏离**：

- 上游**未改动**该文件时，合并会保留我们的删除，无冲突；
- 上游**改动/升级**了它时会出现 **modify/delete 冲突** —— 处置为**保留删除**（与 Colorwheel 的 mixin 冲突无解）；
- `mods/client/colorwheel.pw.toml` 是**本 fork 独有**，合并时不会被上游覆盖。

另：同日已**合并上游 `7c577d3`**（`chore(config): 同步 c2me 生成的默认值注释`，只动 `config/c2me.toml` 3 行注释），
合并提交 `f833a26`；上游自 `2709bc7` 之后仅此一条提交。`euphoria-patcher.pw.toml` 与 `colorwheel.pw.toml` 一样是**本 fork 独有**（上游无 Colorwheel、无 Euphoria Patcher）。

## 2026-09-22 Northstar 本地补丁：修「开光影后两个太阳」

**现象**：Iris 1.8.14-beta.1 + `ComplementaryUnbound_r5.9.3`（含 EuphoriaPatches_1.10.5）+ Northstar 0.6.1 时天空同时出现两个太阳——圆盘＝光影自绘，方块＝原版 `sun.png`（可被方块正常遮挡、下界没有、跑远 8000 格依旧）。光影包已声明 `sun=false` / `moon=false`（用户选项文件 `shaderpacks/ComplementaryUnbound_r5.9.3 + EuphoriaPatches_1.10.5.txt` 里 `SUN_MOON_STYLE_DEFINE=2`，条件成立），**Iris 本该关掉原版太阳却失效**。

**根因**：`Northstar-0.6.1+1.21.1.jar :: com/lightning/northstar/mixin/client/LevelRendererMixin` 用 `@ModifyExpressionValue` 包住 `LevelRenderer.renderSky` 里的 `SUN_LOCATION` / `MOON_LOCATION`（`northstar$disableVanillaSunAndMoon` 等），与 Iris 的 `MixinLevelRenderer_SunMoonToggle`（同一 `renderSky`、同一对常量）**抢同一注入点**，使 Iris 的取消失效。与 Sable / Colorwheel / Flywheel / Euphoria Patches / EclipticSeasons / 子结构**均无关**（各自已单独排除）。

**处置（本 fork 有意改动上游 mod jar）**：`scripts/patch-northstar-sun.ps1` —— 从 jar 内 `northstar.mixins.json` 删除 `"client.LevelRendererMixin"` 一项（jar 条目数 4869 不变、文件名不变 → mod 集合不变，避免触发已知的 Drippy 早窗崩溃）。原版 jar 存于 `mods/.northstar-original/`。

- ⚠️ **`devtool install-files` / `check` 会按描述符 hash 把原版 jar 覆盖回来**，之后需重跑脚本（脚本幂等，已打过补丁会直接退出）。
- 已验证：对 `Northstar-0.6.1+1.21.1.jar` 打补丁成功、二次运行识别为已打补丁。
- 该 mixin **无配置开关**，Northstar 也**不能升级**（新版 `TelescopeScreen` 与 Core 客户端 mixin 不兼容）→ 只能靠补丁，故本项需在下次合并/升级 Northstar 时保留。