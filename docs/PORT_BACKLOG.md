# 移植候选清单（CDR1201 → CDR1211）

> **来源**：CDR1201 `4c85c39c`（相对我们记录的基线 `1b1b8b7e` 之间的 49 个提交，见 `MIGRATION_LOG.md` §2.3）。
> **核对日**：2026-09-28。**核对方法**：Modrinth API（按 `game_versions=["1.21.1"]` + neoforge/forge 过滤）、
> cfwidget（CurseForge 项目文件清单）、源包 `.pw.toml` 里 `[update.curseforge] project-id`，
> 本仓侧用「文件/模组是否存在」逐条核对（命令见文末）。
> **用法**：在最后一列填 `✅ 要` / `❌ 不要` / `🤔 再议`。修复类默认「看情况」，我会先做验证再动。

## A. 模组类（源包这次新增，本仓没有）

| # | 模组 | 1.20.1 版本 | 1.21.1 可用性 | 需要的额外前置 | 说明 / 风险 | 建议 |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | **Iron's Spells 'n Spellbooks** | 3.16.3 | ✅ **3.16.3**（CF 855414；Modrinth `irons-spells-n-spellbooks`） | Iron's Lib、Curios（已有） | 源包这次新增的整套法术体系核心 | 建议移入 |
| A2 | **Iron's Lib** | 2.1.0 | ✅ **2.2.0**（2026-09-25） | — | A1 的前置库 | 随 A1 |
| A3 | **Farmer's Spell 'n Spell Book** | 1.0.5（源包走 GitHub 手动分发） | ✅ **1.0.5.1**（Modrinth `farmers-spell`） | 无强制依赖（与农夫乐事联动） | 法术 × 农夫乐事联动，体量小 | 建议移入 |
| A4 | T.O Magic 'n Extras（traveloptics） | 6.3.0 | ⚠️ 只有 **4.4.0.1-alpha**（2025-03-25，CF 1046916） | Iron's Spells | 比源包落后两个大版本且是 alpha | 再议 / 不建议 |
| A5 | **Apotheosis** | 7.4.8 | ✅ **8.9.0**（2026-09-27，CF 313970） | Placebo✅、Apothic Attributes✅、**Apothic-Spawners 1.4.0（缺）**、**Apothic-Enchanting 1.6.2（缺）**、**Patchouli 1.21.1-93（缺）** | 需同批补 3 个前置；8.x 与源包 7.x 数据不通用 | 建议移入（含前置） |
| A6 | **Create: Apokinetics** | 1.0.6 | ✅ **1.0.6**（CF 1606442；Modrinth `apokinetics`） | Apotheosis（A5）、Create✅ | Create × Apotheosis 联动 | 随 A5 |
| A7 | Fallen Gems & Affixes | 2.1.5 | ⚠️ 只有 **1.0.0-beta**（2025-08-25，CF 1286177），且依赖 Fallen Lib | Fallen Lib | 前置在 1.21.1 不存在 | 不建议 |
| A8 | Fallen Lib | 1.4.6 | ❌ 无 1.21.1（CF 1404737 仅 1.20.1） | — | — | 不建议 |
| A9 | Tetra Apothic Link | 0.1.1 | ❌ 无 1.21.1（CF 1653941 仅 1.20.1 两个文件） | Apotheosis + Tetra | — | 放弃 |
| A10 | TaCZ:Accel | 1.2.0 | ❌ 无 1.21.1（CF 1622154 仅 1.20.1；Modrinth 同名 `tacza` 是另一个项目且 1.21.1 也无） | — | — | 放弃 |
| A11 | Quantified API | 2.2.3 | ✅ Modrinth **2.2.0**（CF 1397967 只有 1.21.8） | — | 是 TaCZ 附属库，本仓没有需要它的模组 | 再议 |

## B. 模组更新类（两边都有，只是版本落后）

| # | 模组 | 本仓 → 可升到 | 说明 | 建议 |
| --- | --- | --- | --- | --- |
| B1 | **Create: Integrated Farming** | 1.2.6 → **1.4.3**（1.21.1 有，2026-09-21） | 源包这次含「水稻等作物收割 bug」修复 | 建议升级 |
| B2 | 其它 | 无需动作 | Crash Assistant（本仓 1.11.12 > 源包 1.11.11）、Creative Dragons+ 1.11.9、附魔工业 2.5.4、工厂控制台 1.2.1、CreateLazyTick 2.6.25、FluidLogistics 1.3.0 均已一致或本仓更新 | — |

## C. 修复 / 配置 / 内容类（默认「看情况」，我先验证再动）

| # | 项目 | 源包改动 | 本仓现状 | 可移植性判断 | 建议 |
| --- | --- | --- | --- | --- | --- |
| C1 | **燃料桶燃烧时长与「剩余物」修正** | `kubejs/startup_scripts/modifier_burntime.js`：16 个物品设 `burnTime` + `craftingRemainingItem`（柴油/乙醇/原油/生物柴油/汽油桶、乙烯/混合燃料/润滑油/低温燃料桶、焦炭块、生物质颗粒、岩浆蛋糕片等） | **本仓完全没有这个脚本**（startup 里没有任何 `ItemEvents.modification`）；本仓只有 4 种自研流体的 `blaze_burner_fuel` 数据 | 高：可照搬，但物品命名空间要改成 `createdelightcore:`，并逐个确认 1.21.1 物品存在 | 建议移入（先验证，见 §E-1） |
| C2 | 低温燃料桶残留空桶 | 上面同一提交把 `cryo_fuel_bucket` 剩余物设为空桶（`BlazeBurnerBlockMixin` 对「有流体 capability 且无剩余物」跳过 shrink） | 本仓有 `createdelightcore:cryo_fuel_bucket` 物品引用，但没有剩余物声明 | 同上 | 随 C1 |
| C3 | 烈焰人燃烧室不能用普通固体燃料 | hotai 字节码覆盖 `createliquidfuel/core/BurnerStomachHandler.badiff` | 本仓 `hotai/` 为空、无 badiff 工具链；有 createliquidfuel 3.0.0(1.21.1) | 中：先验证 1.21.1 是否同样有问题，再决定走 hotai 还是别的办法 | 再议（先验证 §E-4） |
| C4 | 液体燃料同步崩溃 / Bakeries 面包刀崩溃 | CDC 侧修复 + hotai 覆盖 `bakeries/.../BreadKnifeItem.badiff` | 本仓 Core 是 **2.0.0.7（1.21.1 线）**，与源包 2.2.16k（1.20.1 线）不同线 | 低：属 Core/hotai 侧，需问 Core 上游 1.21.1 线是否已有对应修复 | 再议（先验证 §E-3） |
| C5 | 燕麦面包熔炉/烟熏炉配方冲突 | `ratatouille/wheat&oat&rice.js` +2 行 | 本仓有 create_ratatouille（1.21.1-1.4.0），但**没有该脚本** | 中：冲突来自 mod 自带配方，本仓可能同样存在；若存在，按本仓脚本结构补 2 行 | 待验证（§E-2） |
| C6 | 禁用轻语灵与洞穴蜈蚣自然生成 | `config/alexsmobs.toml` 4 行 + 删掉一个 KubeJS 脚本 | 本仓有 `config/alexsmobsup.toml`（移植版配置）与 alexs-mobs-up | 高：配置项在，直接照改 2 处 | 建议移入 |
| C7 | 任务书 3 处 | `Introduction.snbt`（官网二维码 + 图片）、`Alloy_Innovation.snbt`（烈焰人燃烧室喂液体燃料桶的后果）、`Junior_Engineer.snbt`（流体容器相关） | 三个章节本仓都有 | 高：纯文本/图片改动 | 建议移入 |
| C8 | Crash Assistant 基线改用 CF 安装名消除误报 | `config/modpack_defaults/config/crash_assistant/config.toml` + `scripts/generate-crash-assistant-modlist.py` | 本仓配置在 `config/crash_assistant/`，但**没有生成脚本** | 中：思路可借鉴，具体改动依赖他们的脚本 | 参考 |
| C9 | Apotheosis 命名规则 + JEI 排序同步 | `config/apotheosis/names.cfg`、`config/jei/recipe-category-sort-order.ini` | 本仓无 Apotheosis（只有 `config/apotheosis/apothic_attributes.cfg`）；JEI 文件 161 行 vs 源包 239 行（mod 集不同） | 低：仅在采纳 A5 之后按本仓 mod 集重做 JEI 排序 | 暂缓 |
| C10 | MMT 锭材移除 / 禁用方式改写 | `kubejs/data/...` 配方增删 + `kubejs/client_scripts/JEI.js` | 本仓**没有那些目标 JSON**（配方结构不同），也没有 client 的 `JEI.js` | 低：不是直接搬，需要按本仓配方另做 | 放弃 / 另做 |
| C11 | 流体容器迁移（createfluidstuffs → fluidlogistics） | mod 描述符删除 + 创造栏/配方调整 | 本仓两个 mod 都在（Create:Fluid Stuffs + FluidLogistics） | 中：可参考他们的创造栏整理改动 | 参考 |
| C12 | KubeJS 回退 build.24 → build.16（食物属性覆盖） | `mods/kubejs.pw.toml` | 本仓是 **2101.7.2-build.363**（1.21.1 线，版本号体系不同） | 不适用，但同类回归要留意 | 只记录观察 |
| C13 | FancyMenu 主菜单（标题纹理/布局/随机彩蛋/节日灯带） | `config/fancymenu/**` + `title.png` | 与本仓 §4.3 的 UI 待办同题（标题图响应式、背景色、中文 hoverlabel） | 参考为主：分辨率/布局要按本仓重做 | 参考 |
| C14 | CDC 侧修复清单 | 甜浆果采摘崩溃、蟾蜍捕食伤害溢出、部署器 Mixin 冲突、CollectorsReap 果丛残留崩溃、BreadKnife | 本仓 Core 2.0.0.7（1.21.1 线） | 需向 Core 上游确认 1.21.1 线是否已含这些修复 | 待确认 |
| C15 | `cdr-updater`（Go 更新服务器 + jar 客户端）与 PCL2 包瘦身 | `.agents/skills/release/cdr-updater-go/`（93 文件）、`a5abd893` | 本仓是 Core + `release-info.json` 更新链路；PCL 安装脚本本身还是坏的（P-099） | 基建类，不是 mod | 单独评估 |

## D. 已确认不可行（保留证据，避免以后重复讨论）

- **Fallen Lib / Fallen Gems & Affixes**：Fallen Lib 在 CF 只有 1.20.1；Affixes 的 1.21.1 只有 1.0.0-beta，且依赖 Fallen Lib。
- **Tetra Apothic Link**：CF 项目 1653941 只有 2 个 1.20.1 文件。
- **TaCZ:Accel**：CF 项目 1622154 只有 1.20.1；Modrinth 上的 `tacza`（Tweaks）1.21.1 也无。
- **traveloptics**：1.21.1 只有 alpha 4.4.0.1（源包是 6.3.0 正式版），不建议。

## E. 需要先进游戏验证的问题（决定 C1~C5 要不要修）

1. **燃料桶**：把 `createdieselgenerators` 的柴油/乙醇桶、`createdelightcore` 的低温燃料桶喂进烈焰人燃烧室，看燃烧时长是否合理、桶是否留下（对应 C1/C2）。
2. **燕麦面包**：熔炉与烟熏炉配方是否同时存在冲突（C5）。
3. **Bakeries 面包刀**：右键是否崩（C4）。
4. **烈焰人燃烧室固体燃料**：丢煤/木炭能否正常燃烧（C3）。
5. 若采纳 A5：Apotheosis 8.x 与本包 Core 的亲和/词缀数据是否兼容（7.x → 8.x 数据不通用）。

## F. 建议的采纳顺序

1. **零风险先做**：C6（alexsmobs 生成配置）、C7（任务书 3 处）→ 都是纯配置/文本
2. **法术体系**：A1 + A2 + A3（Iron's Spells 核心 + 前置 + 农夫乐事联动）
3. **Apotheosis 线**：A5 + 前置 3 个（Spawners/Enchanting/Patchouli）+ A6（Apokinetics）
4. **模组升级**：B1（Integrated Farming 1.2.6 → 1.4.3）
5. **先验证再定**：C1/C2（燃料桶）→ 若确认有问题就照搬脚本（命名空间改 `createdelightcore:`）
6. 参考项：C8/C11/C13，单独评估项：C15

## 复现命令

```powershell
# Modrinth：某项目在 1.21.1 + neoforge/forge 的可用版本
node -e "fetch('https://api.modrinth.com/v2/project/irons-spells-n-spellbooks/version?game_versions=%5B%221.21.1%22%5D&loaders=%5B%22neoforge%22%5D',{headers:{'User-Agent':'x'}}).then(r=>r.json()).then(v=>console.log(v[0]?.version_number, v[0]?.files?.[0]?.filename))"
# CurseForge（无需 key）：用源包描述符里的 project-id
node -e "fetch('https://api.cfwidget.com/855414',{headers:{'User-Agent':'Mozilla/5.0'}}).then(r=>r.json()).then(j=>console.log(j.title, j.files.filter(f=>f.version==='1.21.1').map(f=>f.name)))"
# 源包描述符里的 CF 项目号
git -C D:\git-MC\CDR1201 show HEAD:mods/apotheosis.pw.toml | Select-String 'project-id|file-id'
```

> 注：`web_search` 工具当前 401（端点鉴权问题），所以本轮全部走 Modrinth API + cfwidget 直查。

## 执行结果（2026-09-28，用户勾选，提交 `f19b339`）

用户在 A/B/C 里勾选了「零风险两项 + Iron's Spells 体系 + Apotheosis 线 + Integrated Farming 升级」，执行情况：

| 项 | 结果 | 说明 |
| --- | --- | --- |
| A1 Iron's Spells 'n Spellbooks | ✅ 已装 `1.21.1-3.16.3` | CF 8680204 / project 855414 |
| A2 Iron's Lib | ✅ 已装 `1.21.1-2.2.0` | 其 `geckolib` 声明是裸版本号 `4.7.5.1`，见下方「两个发现」 |
| A3 Farmer's Spell 'n Spell Book | ✅ 已装 `1.0.5.1-1.21.1` | Modrinth CDN（URL 描述符，无自动更新源） |
| A5 Apotheosis | ✅ 已装 `1.21.1-8.9.0` + 前置 Apothic Spawners `1.4.0`、Apothic Enchanting `1.6.2`、Patchouli `1.21.1-93` | Placebo 9.9.2 / Apothic Attributes 2.10.1 本仓已有；Apotheosis 的 jar 只把 Placebo+Apothic Attributes 声明为 required，Patchouli 是 Modrinth 元数据里的 required（它的指南书需要），一并装了 |
| A6 Create: Apokinetics | ✅ 已装 `1.0.6` | 要求 `create [6.0.10,6.1)` ✓、`apotheosis [8.5.3,)` ✓ |
| B1 Create: Integrated Farming | ✅ 升到 `1.4.3`（CF 8937623，旧 1.2.6 jar 已删） | 1.4.3 里 `supplementaries` 是 **optional**（`[1.21.1-3.9.9,)`），所以当年「要 Supp 3.9.9→NeoForge 247」的 pin 理由不再成立；`pin = true` 保留。⚠️ **副作用见 §Drippy**：1.4.3 在位时 Drippy 早窗必崩 |
| C6 alexsmobs 禁用轻语灵/洞穴蜈蚣 | ✅ **无需改动**：本仓 `config/alexsmobsup.toml` 里 `caveCentipedeSpawnWeight` 与 `murmurSpawnWeight` 已经是 0 | 源包那次改动只是把 KubeJS 拦截换成配置；我们从来没迁过那个拦截脚本 |
| C7 任务书 3 处 | ⚠️ 只落了 1 处 | ③ `630FA0478B7DAAAA`（Junior_Engineer）已把任务从 createfluidstuffs 桶/罐 改成 `fluidlogistics:copper_bucket`，文案同步；② 467AE0EF8AF5ACAF 的文案已更新；① Introduction 的官网二维码**本仓任务书里没有对应内容**（源包那是它自己官网/QQ 群的内容），未强搬 |
| C1/C2 燃料桶脚本 | ⏸ 用户选择「先验证」，未动 | 见 §E-1 |
| A4 traveloptics / C15 cdr-updater | ⏸ 未选 | — |

**依赖核对（装前逐个读 jar 的 `neoforge.mods.toml`）**：geckolib 4.9.3 ✓（要求 ≥4.7.5.1 / ≥4.9.2）、playeranimator 2.0.4+1.21.1 ✓（要求 ≥2.0.1+1.21.1）、curios 9.5.1 ✓（要求 ≥9.0.5+1.21.0）、farmersdelight 1.3.2 ✓（要求 ≥1.3.2）、placebo 9.9.2 ✓、apothic_attributes 2.10.1 ✓、create 6.0.10 ✓。

**两个发现（已记进 `MIGRATION_LOG.md` §3.9）**

1. **裸版本号 `versionRange` 是宽松语义**：`irons_lib` 写的是 `geckolib = "4.7.5.1"`（不是区间）。用本仓现存 24 处同形声明做实证（例如 `dg_js` 要求 `kubejs = "2101.7.2-build.321"` 而实装 build.363、`createtransmission` 要求 `create = "6.0.6"` 而实装 6.0.10，游戏都能正常启动）→ 结论：NeoForge 把裸版本号当「推荐版本」，不会拦 4.9.3。证据脚本 `_dsh_tmp/bare-versionrange-evidence.mjs`。
2. **任务书文案不在章节文件里**：1.21.1 的 FTB Quests 把文本放在 `config/ftbquests/quests/lang/en_us.snbt`（键形如 `quest.<id>.quest_desc` / `.title` / `.quest_subtitle`），章节 `.snbt` 只有结构（tasks / dependencies / 坐标 / 图标 / images）。改文案必须改 lang 文件。

**待验证（重启游戏后）**：新模组能否正常加载（含 Apotheosis 首次生成配置、Patchouli 指南书）、法术系物品是否出现在创造栏/EMI、任务书那条任务的图标与文案是否正确、Integrated Farming 的水稻收割。

### Drippy 早窗副作用（2026-09-28 追加，已定案）

移入后首次启动即崩在 Drippy 早窗（`ClassNotFoundException: …CustomLoadingOverlay`）。A/B 对照：

| 运行 | IF 版本 | 早窗 provider | 结果 |
| --- | --- | --- | --- |
| 14:27 / 14:34 / 14:46 | **1.4.3** | drippy | ❌ 3/3 崩在早窗（`DrippyEarlyWindowProvider.updateModuleReads` 用线程上下文 CL 加载主 jar 的类） |
| 14:38 / 14:57 | 1.2.6 | drippy | ✅ 早窗正常（两次分别在注册表重复与 apokinetics mixin 上失败，都与早窗无关） |
| 14:54 | 1.4.3 | **vanilla** | ❌ 换 vanilla 后早窗过了，但 **CustomSkinLoader 崩**（`NoClassDefFoundError: …IFakeIResourceManager$V1`） |

**定案（提交 `e848913`、`06a82c3`）**：

- `config/fml.toml` 保持 `earlyWindowProvider = "drippy_early_window"`
- **Integrated Farming 钉回 1.2.6**（描述符与 jar 都回退）——1.4.3 的 jar、1.4.2 都在 `_dsh_tmp/bisect-held/`，将来重启排查可用
- **Apokinetics 移除**（P-164：其 mixin 与 Apotheosis 8.9.0 内部 API 不匹配；想要它可把 Apotheosis 降到 8.7.0）
- 所以本次「B1 升级」实际**未生效**（回退了），Iron's Spells 系 + Apotheosis 线保留

**✅ 实机验证（2026-09-28 15:03）**：按上述定案启动成功（到标题界面），且错误分布与移入前那次成功逐项一致（无新增噪音类目）。

**仍需进游戏确认的**：法术系物品/构造在创造栏与 EMI 里的显示、Apotheosis 首次生成配置与词缀玩法、Patchouli 指南书、任务书那两处文案；Integrated Farming 的水稻修复本次未生效（停在 1.2.6）。

## 暂缓项：等上游更新后再试（2026-09-28 记，用户决定）

| 项 | 它能带来什么 | 现在为什么没上 | 复活条件 / 动作 |
| --- | --- | --- | --- |
| **Create: Integrated Farming 1.4.3** | 主要是 **Vacuum Harvester（真空收割机）**——自动收割作物（1.4.3 修的就是它的水稻收割）；另加更多物种与兼容栖架变体 | 「IF 1.4.3 ↔ Drippy 早窗必崩」3/3 复现，故钉在 1.2.6（栖架 + 渔网都在，只缺新机器）。**追加实测（2026-09-28 15:29）：1.4.2 同样崩在早窗**（1.4.2 也有 vacuum_harvester：13 条目、22 blockstates 与 1.4.3 一致）→ 冲突覆盖**整条 1.4.x 线**，不是 1.4.3 后期改动特有 | 等 Drippy 或 IF 任一更新后再试。**「移除 Drippy」这条路已试并排除**（15:35：两个 Drippy jar 都摘掉 + provider 改 vanilla → CSL 照样崩，见下方「Drippy 是 CSL 的依赖」） |
| **Apokinetics 1.0.6** | Create×Apotheosis 联动：12 颗 Apotheosis 宝石（迅捷/平衡/精准/屈服/冲击/延展/点燃/霜工/流动/输送/动量/破裂）+ 动能台/动能塔/动能扳手/动能碎片 + 工厂定位器/扫描仪，并对接 Apotheosis 宝石盒 | 其 `GemCaseTileMixin` 与 Apotheosis **8.9.0** 内部方法签名不匹配（`InvalidInjectionException`）→ 移除。**具体断点已查明**：`GemCaseTile#upgradeGem` 在 8.9.0 里把 `Container` 参数删了（`(DynamicHolder, Purity, Container)` → `(DynamicHolder, Purity)`），而 apokinetics 的注入方法仍按 3 参写 | 等 apokinetics 跟进 Apotheosis 8.9 的新签名；**若现在就想用，把 Apotheosis 钉到 `8.8.0`**（逐个版本反编译确认：8.6.0 / 8.6.1 / 8.7.0 / **8.8.0** 都还带 `Container`，8.9.0 起没了）。jar 在 `_dsh_tmp/{bisect-held,apo-versions}/` |

> **用户决定（2026-09-28）**：这两项都**先等上游更新**，暂不降级任何宿主 mod（不把 Apotheosis 降到 8.8.0、不动 Drippy/IF 组合）。
>
> **⚠️ 重要发现（2026-09-28 15:35）——「Drippy 是 CustomSkinLoader 的隐形依赖」**：把所有 Drippy（两个 jar + provider 改 `vanilla`）摘掉后，
> CSL 依旧在 patch `ResourceManager` 时崩 `NoClassDefFoundError: …IFakeIResourceManager$V1`；加上 14:54 那次（jar 在位、provider=vanilla）→
> **两次都是在 `earlyWindowProvider = "vanilla"` 时崩，与 Drippy 的 jar 在不在无关**。也就是说：
> **早窗必须保持 `drippy_early_window`，否则皮肤 mod（CSL）起不来**——Drippy 在这个包里是「承重墙」，不只是加载屏好看。
> 推论：想上 IF 1.4.x，只能等 Drippy 或 IF 一侧更新（不能靠"摘掉 Drippy 换 vanilla 早窗"绕过）。
>
> 复活任意一项时的动作：把描述符放回 `mods/common/`、jar 放回 `mods/` → `devtool.bat generate-integrity-manifest` → 启动验证（照 `MIGRATION_LOG.md` §5.5：同时看 `logs/latest.log` 与 `logs/stderr_stream.log`，并与上次成功日志做 jar 集合 diff）。
> 不依赖 `_dsh_tmp/` 的重新下载来源：IF `1.4.3` = CF project `1249131` file `8937623`、`1.4.2` = file `8899993`、`1.2.6` = file `8225206`；Apokinetics `1.0.6` = Modrinth `apokinetics`（project `jRFvnLpf`，version `En6Zf987`）或 CF project `1606442` file `8790422`；Apotheosis `8.8.0` = Modrinth `apotheosis` 版本号 `1.21.1-8.8.0`。


