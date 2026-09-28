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
