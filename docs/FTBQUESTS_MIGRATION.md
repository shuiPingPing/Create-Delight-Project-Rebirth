# FTB Quests 任务书迁移记录（1.20.1 → 1.21.1）

> 2026-09-22 执行。源：`CDR1201/config/ftbquests/quests`（1.20.1，75 个 snbt）；目标：本仓库 `config/ftbquests/quests`
> （迁移前只有 4 个 snbt 空壳）。
> 脚本：`scripts/migrate-ftbquests.mjs`（可重复执行：`--metrics` 只出自检指标、`--dry-run` 只出报告、无参数＝真实写入并备份）。
> 完整明细报告：`_dsh_tmp/quests-migration-report.md`（55 KB，含被删 quest 逐条列表）。

## 结果

| 项 | 数量 |
|---|---|
| 写入文件 | 75（41 章节 + 32 奖励表 + `data.snbt` + `chapter_groups.snbt`） |
| 解析校验 | `parseOk=75 parseFail=0`（迁移后逐文件重新解析通过） |
| 命名空间改名 | 1044 处（见下表） |
| task 转换 | 84（`itemfilters:*` 62 + `questsadditions:*` 22） |
| 删除 quest | 124（缺失物品 114 / 缺失实体 7 / 缺失维度 3） |
| 删除 reward | 52（物品不存在 → 只删该条奖励，保留 quest） |
| 清理 dependencies | 152 条（其中整字段删除 41 处） |
| 空章节 | 0 |
| 保守保留（静态无法验证的 advancement） | 34 例 |

## 一、命名空间改名（按 1.21.1 真实注册表逐类核对：旧 ns 全部不存在、新 ns 全部存在）

| 源 | 目标 | 处数 |
|---|---|---|
| `createdelight:` | `createdelightcore:` | 245 |
| `alexscaves:` | `alexscavesup:` | 440 |
| `alexsmobs:` | `alexsmobsup:` | 332 |
| `citadel:` | `citadelup:` | 2 |
| `miners_delight:` | `minersdelight:` | 4 |
| `casualness_delight:` | `casualnessdelight:` | 11 |
| `some_assembly_required:` | `someassemblyrequired:` | 4 |
| `expatternprovider:` | `extendedae:` | 6 |
| `forge:`（仅 tag/过滤器值） | `c:` | 8 |

## 二、类型级不兼容的处理

1.21.1 的 `ftb-quests 2101.1.36` 支持的任务类型为：`item / checkmark / xp / xp_levels / kill / custom / observation /
advancement / dimension / stat / biome / structure / loot / fluid`（+ FTB 附加的 `stage` 等）；奖励类型含 `all_table` ✓。

| 1.20.1 用法 | 1.21.1 处理 |
|---|---|
| `type: "questsadditions:time"`（20）/ `:killnbt`（1）/ `:days`（1） | 该 mod 在 1.21.1 没有移植（`certain_questing_additions` 只是任务书 APNG 动画增强）→ 整体转成 `checkmark` 任务（保留 id / title / icon） |
| 任务物品写成 `item: { id: "itemfilters:tag", tag: { value: "ns:tag" } }` 之类的**伪物品**（62 处） | 1.21.1 无 `itemfilters`（连 FTB Quests 本体也没有兼容代码）→ tag 恰能解析出 1 个物品时替换成该物品（2 例），否则转 `checkmark`（60 例） |
| `icon: "itemfilters:custom"` / `"itemfilters:id_regex"`（2 处） | 手工改成 `ftbfiltersystem:smart_filter`（真实图标物品） |

## 三、缺失内容的删除口径

- **任务（tasks）**引用了 1.21.1 注册表里不存在的 id → 该 quest 无法完成 → **整条删除**：
  - 物品/方块：对 `minecraft:item ∪ minecraft:block` 判存（18092 + 12681 条真实注册表，取自 `.probe/registry_objects.json`）；
  - 实体 / 流体 / 生物群系 / 维度 / 结构：对相应注册表判存；
  - **advancement**：只扫 jar 里的 `data/<ns>/advancement(s)/**`（14396 条）→ 但很多 mod（Alex's Mobs 等）的 advancement 是**运行时注册**的，静态必然漏判
    → 因此 **不因 advancement 删 quest**（34 例记为"未验证、保守保留"）。
- **奖励（rewards）**引用不存在的物品 → 只删该条 reward（52 条），quest 保留。
- **icon / image**（`icon:`、`images[].image`，共 1725 条）→ 纯外观，**一律不动**。
- 删除 quest 后清理所有文件里指向它的 `dependencies` 条目（152 条）。

## 四、已知不确定 / 待决策

1. **34 例 advancement 任务**（Animal_Companions 等）：静态无法确认运行时 id 是否为改名后的命名空间（Alex's Mobs 的 advancement 在代码里生成）。
   若游戏里发现这些任务永远无法完成，需要把它们改回 `alexsmobs:`（即 advancement 命名空间可能未随 mod id 改名）。
2. **`northstar:europa` / `northstar:jupiter_orbit`** 相关的 3 条维度任务被删：Northstar **0.6.1** 没有这些维度（0.6.4/0.6.5 才有）→ 将来升级 Northstar 后可考虑从备份重跑迁移恢复。
3. **`createdelightcore` 35 处物品缺失**（Core 2.0 相较 1.20.1 移除/改名的物品，例如 `mechanical_craft_encoder`）→ 相应 quest 已删。
4. **缺失 mod 的 quest 已全部删除**（`more_mod_tetra` / `tetrawear` / `applied_armorer` / `create_armorer` / `cosmopolitan` / `farmersrespite` /
   `festival_delicacies` / `nethervinery` / `kinetic_pixel` / `seasonals` / `cavedelight` / `oceanic_delight` / `dreadsteel` / `blackknightarmor` /
   `solcarrot` / `solapplepie` / `ulterlands` / `ncc` / `centralvintage` 等）。若这些 mod 里有的存在 1.21.1 版本并补进整合包，
   可从 `_dsh_tmp/ftbquests-pre-migration/` 备份重新跑迁移脚本恢复对应任务。

## 五、验证前必须先处理：`certain_questing_additions`

`certain_questing_additions 1.2.0.4` 的 `ChapterImageConfigGroupMixin` 用 `@Shadow` 抓 `val$name`（编译器生成的 lambda 捕获字段名），
在 `ftb-quests 2101.1.36` 上定位不到 → 该 mixin **硬失败**；一旦打开任务书界面（加载目标类）就会崩。
因此验证/游玩前请先停用它：`mods/certain_questing_additions-neoforge-1.2.0.4+mc1.21.1.jar` → 改名加 `.disabled`
（代价：任务书失去 APNG 动画增强；包自检会报 `Missing mods: certain_questing_additions`，属预期）。
恢复＝去掉 `.disabled` 后缀（届时请先确认上游是否已适配新版 FTB Quests）。

## 六、复跑方式

```powershell
node scripts/migrate-ftbquests.mjs --metrics    # 只打印自检指标，不写文件
node scripts/migrate-ftbquests.mjs --dry-run    # 只生成报告
node scripts/migrate-ftbquests.mjs              # 真实写入（会先把目标目录被覆盖文件备份到 _dsh_tmp/ftbquests-pre-migration/）
```

自检基准（与本记录一致）：引用总数 **5685**；改名后物品位缺失 **259**（其中 `itemfilters` 62 会被类型转换消化，纯物品缺失 256）；
非物品引用 `itemfilters:` 64 / `questsadditions:` 22 / `forge:` 8（改名后 0）。

## 七、离线自洽性校验（2026-09-22，全部通过）

| 校验项 | 结果 |
|---|---|
| 章节 / 章节组 | 41 章、`chapter_groups.snbt` 定义 6 组 |
| 悬空 `group` 引用 | **0**（38 个章节引用了组） |
| `dependencies` 悬空 | **0** / 共 2531 条 |
| `table_id`（数字）→ 奖励表文件 | **95 处 / 22 个不同表，全部解析成功**（映射键是表文件内部的 `id:` 字段十六进制，例如 `coffee.snbt` 的 `id: "743B0B748B7CE8EC"` = `8375300527209900268`） |
| 奖励表内部物品缺失 | **0** |
| 任务奖励物品缺失 | **0** |
| 文件解析 | `parseOk 75 / parseFail 0` |

> 注：`table_id` 是**数字**（如 `367842927525151968L`），不是文件名的十六进制字面量；用文件名推断会误报悬空（本次踩过）。
> 实机确认（对比日志）：迁移前 `Loaded 1 chapter groups, 1 chapters, 0 quests, 0 reward tables` → 迁移后应为 `6 / 41 / N / 32`。
## 八、1.21.1 原生 `data.snbt` 字段合并（2026-09-22）

对比"游戏在 1.21.1 下重写过的 shell `data.snbt`"（备份在 `_dsh_tmp/ftbquests-pre-migration/`）发现，2101 版新增了三个顶层键，
而迁移版（来自 1.20.1）没有 → 已从 shell 版合并进来：

| 键 | 值 | 说明 |
|---|---|---|
| `fallback_locale` | `"en_us"` | 找不到翻译时的回退语言 |
| `presets` | `{ goal: {hexagon,2.0d} info: {gear,1.0d} normal: {square,1.0d} }` | 任务形状预设 |
| `verify_on_load` | **`true`（本次临时打开）** | 加载时校验任务数据；用于本次迁移验收，**确认无误后建议改回 `false`** |

1.20.1 遗留的 `icon` / `title`（书本图标与标题）保留在文件里——2101 会忽略不认识的键，无害；
`version` 两边都是 `13`，无需迁移。章节文件的字段无漂移（`order_index` / `quest_links` 等 1.21.1 字段本来就有）。
## 九、图标兜底（2026-09-22）

- 书本图标 `createdelightcore:textures/gui/packicon64.png` 在 **`kubejs/assets/createdelightcore/textures/gui/packicon64.png`** ✓ 存在（KubeJS 资源作为内置资源包生效，`ftbquests:custom_icon` 物品也在注册表里 ✓）。
- 保留下来的 quest 里共有 395 处 `icon:` 引用，其中 **8 处指向 1.21.1 已不存在的物品**
  （`farmersrespite` 3、`bakeries`/`youkaishomecoming`/`cosmopolitan`/`oceanic_delight`/`blackknightarmor` 各 1，加上 reward table 里的 1 处）
  → 已统一替换为 FTB Quests 自带的占位物品 **`ftbquests:missing_item`**（显示为明确的"缺失"图标，而不是破图）。
> **2026-09-22 更新**：不只是本地停用——已**从整合包移除其描述符**（`mods/client/certain-questing-additions.pw.toml` 删除，完整性清单重生成：client 73→72），
> 否则新装玩家仍会加载到它、一开任务书即崩，与"任务书可打开游玩"的目标直接冲突。移除理由与恢复方式见 `docs/MOD_UPDATE_COMPATIBILITY.md` 同名小节。