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

## 五、`certain_questing_additions`：mixin 确实失败，但**不影响正常游玩**（2026-09-22 二次核实后更正）

> ⚠️ 本节结论在 **2026-09-22 14:30 已更正**。此前写的"打开任务书即崩"是**误判**——把 ProbeJS 启动期 dump 的 FATAL 当成了开书证据。

事实链（全部有据可查）：

1. `ChapterImageConfigGroupMixin` 用 `@Shadow` 抓 `val$name`，在 `ftb-quests 2101.1.36` 上定位不到 → **mixin 应用失败**，这是真的；
   它注入的目标是 `dev.ftb.mods.ftbquests.client.gui.quests.ChapterImageButton$3`。
2. `ChapterImageButton$3` 不是"打开任务书"就会加载的类。对 `ftb-quests-2101.1.36.jar` 反编译核实：
   `$3` 是 javac 为 `ChapterImage.TextAlign` 的 `switch` 生成的 **switch-map 持有类**，全库**只有** `ChapterImageButton.maybeRenderText()` 引用它；
   而 `maybeRenderText()` 第一句就是 `if (!chapterImage.shouldDrawTextOnImage()) return;`（`ChapterImage.textOnImage` 字段）。
3. 本包 41 个章节文件里 **`text_on_image` / `text:` 出现 0 次** → `maybeRenderText()` 永远早退 → `$3` 在正常游玩中**永不加载** → **不会崩**。
4. FATAL 日志的真正来源是 **ProbeJS 7.7.2**：启动时 `ProbeDumpingThread` 用 `Class.forName` 强扫 FTB Quests 客户端类，
   撞上 `ChapterImageButton$3` 时抛错，被 ProbeJS 自己 catch 并打成
   `[probejs] Error while loading class ... consider add it to excluded classpaths`。
   每次启动都会出现这 1 条 FATAL（纯噪音）。11:08 与 14:26 两次会话的日志形态完全一致，都在 `ProbeDumpingThread` 上。

**结论与处置**（2026-09-22 14:35 起）：该 mod **保留在包里，jar 正常启用**。
- 它的动画类 mixin（`ChapterPanelChapterButtonMixin` / `ChapterImageButtonMixin` / `ChapterImageMixin` …）**都应用成功**，功能有效；
  只有 `ChapterImageConfigGroupMixin` 失效。
- 唯一会踩雷的操作：**给章节图片设置"图上文字"**（`text_on_image: true`）→ 绘制时进入 `TextAlign` switch → 加载 `$3` → mixin 失败 → 崩。
  即：**别给章节图片加文字**。若将来必须加，先把该 mod 停用，或等作者适配新版 FTB Quests。
- 想消掉启动期那条 FATAL 噪音，可把 `dev.ftb.mods.ftbquests.client.gui.quests.ChapterImageButton$3` 加进 ProbeJS 的
  excluded classpaths（可选，不影响功能）。

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
## 九、图标兜底（2026-09-22；⚠️ 本节做法已被实机推翻，见下）

- 书本图标 `createdelightcore:textures/gui/packicon64.png` 在 **`kubejs/assets/createdelightcore/textures/gui/packicon64.png`** ✓ 存在（KubeJS 资源作为内置资源包生效，`ftbquests:custom_icon` 物品也在注册表里 ✓）。
- 保留下来的 quest 里共有 395 处 `icon:` 引用，其中 **8 处指向 1.21.1 已不存在的物品**
  （`farmersrespite` 3、`bakeries`/`youkaishomecoming`/`cosmopolitan`/`oceanic_delight`/`blackknightarmor` 各 1，加上 reward table 里的 1 处）
  → 当时统一替换成字符串形式 `icon: "ftbquests:missing_item"`。

> **⚠️ 2026-09-22 14:40 实机复核：这个做法无效且不稳定，已放弃。**
> 游戏（FTB Quests 2101.1.36）在加载/回写任务数据时：
> 1. 把上面 8 处**字符串形式**的 `ftbquests:missing_item` **直接丢掉**（例如 `Mouse_Chef` 章节级 icon 在回写后的文件里整条消失）；
> 2. 而对**我没动过**的、指向不存在物品的图标（`tetrawear:*` / `more_mod_tetra:*` / `kinetic_pixel:*` / `nethervinery:*`），
>    它自己转成 `icon: { id: "ftbquests:missing_item" components: { "ftbquests:missing_item": "<原 id>" } }` —— **把原 id 存在 components 里**。
>
> 结论：**不要手工替换图标**。保留原始 id，让 FTB Quests 自己转成带原始 id 的缺失占位；手工写死的占位既丢原 id，又会被下一次回写抹掉。
> 因此 §十 第 2 项在"重跑脚本"时应**跳过**。

- **书本图标：1.20.1 的 `tag:` 写法在 1.21 静默失效（2026-09-22 晚修）**
  1.20.1 时代 `data.snbt` 的书本图标是 `icon: { id: "ftbquests:custom_icon" tag: { Icon: "createdelightcore:textures/gui/packicon64.png" } }`，
  而 1.21 的物品栈用 **`components`** 而不是 `tag`：游戏读不懂 `tag`（静默忽略），回写时直接删掉 →
  **书图标一直是兜底的 `textures/misc/unknown_pack.png`**（这张贴图本身在 `kubejs/assets/...` 里没丢，丢的是"指定它"的那段数据）。
  已改成 2101 的正确形式（组件键来自 `ModDataComponents`，由 `CustomIconItem.getCustomComponent` 读取，值可为贴图路径或实体类型）：

  ```
  icon: {
      components: {
          "ftbquests:icon": "createdelightcore:textures/gui/packicon64.png"
      }
      id: "ftbquests:custom_icon"
  }
  ```

- **`data.snbt` 的 `title` 键在 2101 已不存在**（`ServerQuestFile` 里没有该字段），所以游戏回写时删掉 `title: "机械动力：齿轮盛宴"` 是**正常**的，
  书本标题随之失效、无需恢复（要改书名得走 1.21 的其它入口）。
## 十、迁移后置修正（重要：脚本一次跑完 ≠ 最终结果）

`scripts/migrate-ftbquests.mjs` 是**第一遍**（复制 + 改名 + 类型转换 + 缺失清理）。以下三项是其后的人工复核修正，**如果将来重跑脚本，需要按本节再补一遍**：

| # | 修正 | 数量 | 做法 |
|---|---|---|---|
| 1 | `data.snbt` 合并 1.21.1 新增顶层键 | 3 个键 | 从游戏在 1.21.1 下重写过的 shell 版（`_dsh_tmp/ftbquests-pre-migration/data.snbt`）取 `fallback_locale` / `presets` / `verify_on_load` 插入（见 §八） |
| 2 | ~~失效物品图标兜底~~ **已作废（2026-09-22）** | **0 处** | **不要做**：手工写死的 `ftbquests:missing_item` 会被游戏回写抹掉、且丢失原 id；保留原 id 交给 FTB Quests 自己转换即可（见 §九） |
| 3 | **advancement 路径前缀修正** | **28 处** | 见下 |

### 第 3 项细节（本次最容易被忽略的错误）

`alexsmobsup-0.2.8.jar` 里的 advancement 实际 id 是 **`alexsmobsup:alexsmobsup/<名字>`**
（jar 内 106 个 `data/alexsmobsup/advancement/alexsmobsup/*.json` ✓），而 1.20.1 任务书里写的是 `alexsmobs:alexsmobs/<名字>`——
即**命名空间和路径前缀都要改**。只做命名空间改名会得到 `alexsmobsup:alexsmobs/root`（不存在）→ 这些任务将**永远无法完成**。
修正后：`alexsmobsup:alexsmobsup/root` 等 28 处全部能在 jar 的 advancement 集合里解析到 ✓（`Animal_Companions.snbt`）。

**校验 advancement 的正确姿势**（本次实现）：
1. 扫所有 `mods/*.jar` **以及原版 `1.21.1.jar`** 的 `data/<ns>/advancement(s)/**/*.json` 建集合（本次共 15772 条；**漏掉原版 jar 会把 `minecraft:adventure/kill_a_mob` 之类误判为缺失**）；
2. 逐条比对任务书里的 `advancement:`；不在集合里时，尝试候选 `NS:NS/<path 去掉首段>`、`NS:NS/<path>`；
3. 命中则改写；仍不命中则记录为"未验证、保守保留"。

**剩余 5 处未验证**（保留不删）：`northstar:one_small_step`×2 / `northstar:one_giant_leap`×1、`create_enchantment_industry:additional_order` / `first_order` 各 1
——这些 mod 的 advancement 未随 jar 提供（运行时生成或已被移除）；若实机发现任务无法完成，再按具体情况处理。
## 十一、验收对照（2026-09-22）

- **quest 数精确对上**：源包（CDR1201）按 `tasks:` 数组计 **2509** 个 quest，迁移删除 **124** → 迁移后 **2385**（2509 − 124 = 2385 ✓）。
  这同时反证了"删除 124 个 quest"的口径正确。章节分布（前 5）：Mouse_Chef 242、Animal_Companions 183、Tetra_Armor_Curios 172、
  Difficulty_System 109、Tetra_Weapons 100；**空章节 0**。
- **客户端崩溃面已清空**：全库扫描 363 个 jar，确认**除 ftb-quests 本体外没有任何 mod 注入 `dev/ftb/mods/ftbquests`**。
  注意这条**不构成**"`certain_questing_additions` 会让任务书崩"的理由——它确实注入 FTB Quests（23 个 mixin），但其中只有
  `ChapterImageConfigGroupMixin` 失败，且触发条件是章节图片开"图上文字"，正常开书不受影响，详见 §五。
- **实机验收基准**（启动后日志应为）：
  `[FTB Quests/]: Loaded 6 chapter groups, 41 chapters, 2385 quests, 32 reward tables`（迁移前为 `1 / 1 / 0 / 0`），且不得出现
  `Failed to parse` / `Unknown task type` / `Missing quest dependency` 之类报错。
- 验收通过后收尾动作：把 `data.snbt` 的 `verify_on_load` 改回 `false`。
### 复现测试结论（2026-09-22，Round 6）

把"已验收状态"整目录做 SHA256 快照 → 重跑 `migrate-ftbquests.mjs` → 按 §八/§九/§十 重放后置修正 → 与快照逐文件比对：

- 首轮差 **1 个文件**（`chapters/Settings.snbt`）：原因是我重放时把"② 缺失物品图标 → `ftbquests:missing_item`"做在了"① `itemfilters:*` 图标 → `ftbfiltersystem:smart_filter`"**之前**，
  于是那两个 `itemfilters:` 图标被通用规则一起吞成 `missing_item`。
- **顺序修正后：80 个文件 SHA256 全部一致** ✓ —— 证明"脚本 + §八/§九/§十"可完整复现该迁移。

> 因此 §十 第 2 项的正确顺序是：**先**把 `icon:` 里的 `itemfilters:*` 改成 `ftbfiltersystem:smart_filter`（§二），**再**把其余指向不存在物品的图标改成 `ftbquests:missing_item`。
## 十二、实机验收（2026-09-22 14:12，**通过**）

启动 `CDPR` 进入世界后，服务端线程加载任务书：

```
[Server thread/INFO] [FTB Quests/]: Loaded 7 chapter groups, 41 chapters, 2386 quests, 32 reward tables
```

| 指标 | 日志值 | 预期 | 说明 |
|---|---|---|---|
| chapter groups | **7** | 6（文档口径） | = `chapter_groups.snbt` 定义的 6 组 + FTB Quests 自带的默认组 |
| chapters | **41** | 41 | ✓ |
| quests | **2386** | 2385（`tasks:` 计数口径） | 我按 `tasks:` 数组统计少算 1 个"无 `tasks` 数组的 quest"；与删除数自洽：源包 2510 − 删除 124 = 2386 ✓ |
| reward tables | **32** | 32 | ✓ |

**客户端侧同步证据**（说明任务书数据已完整下发到客户端，可打开）：
`[Render thread/INFO] [FTB Quests/]: Read 321108 bytes, 7489 objects` +
`received translation table en_us (with 3819 entries) from server`。

**健康检查（同一会话）**：
- FTB Quests 相关报错 **0**；`/FATAL]` 1 条（= ProbeJS dump `ChapterImageButton$3` 撞上 `ChapterImageConfigGroupMixin`，见 §五；与开书无关）；`/ERROR]` 1572 条为既有噪音（loot 解析 549、ProbeJS 109、Veil 54、Sable tag 48 等）。
- 包自检：`Missing mods: (none)`、`Extra mods: mcpmod`（清单含 `certain_questing_additions`，client=73）。
- KubeJS：startup 7/7、client 2/2、server 205/205，**0 errors**。

**结论**：任务书在 1.21.1 **正常加载**；客户端已收到完整数据，打开界面的前提满足。
（"全库无 mod 注入 `dev/ftb/mods/ftbquests`"这条旧论据已作废——见 §五、§十一。）

**收尾待办**：`data.snbt` 的 `verify_on_load` 由本次验收临时打开的 `true` 改回 `false`（游戏运行中会被其重写，需在退出后改）。

## 十三、2026-09-22 下午二次核实（MCP 实机 + 反编译）

本节记录用 MCP（`mcpmod` 的 HTTP 接口）实机复核 + 反编译核对后的**最终结论**，与前文冲突处以本节为准。

### 13.1 任务书界面：**带 `certain_questing_additions` 打开正常**
- 实机：14:26 玩家按 E 打开任务书 → 左侧 15 个章节、右上书本图标、右侧任务面板全部正常渲染（截图存 `_dsh_tmp/shots/mcp-now-142751.png`），无语料崩溃。
- 反编译定位见 §五：失败 mixin 的目标类 `ChapterImageButton$3` 只在"章节图片画图上文字"时加载。
- 因此 §五 的结论是：**保留该 mod**，唯一禁忌是"给章节图片加文字"。

### 13.2 深灰占位图标 = 1.21.1 缺 4 个 mod，不是迁移误伤
实机打开"介绍"章节看到若干深灰占位图标，逐项查证：

| 项 | 值 |
|---|---|
| 我迁移脚本对图标/贴图的策略 | **一律不修改**（`icon` 955 条、`image` 770 条；报告：`_dsh_tmp/quests-migration-report.md` §3.3） |
| 提交版（HEAD）里 `ftbquests:missing_item` | 8 处（= §九 那次手工替换） |
| 当前工作区里 `ftbquests:missing_item` | **430 处**，全部由**游戏回写**产生（tetra_armor_curios 346 / tetra_weapons 36 / tetra_ranged_defense 34 / masterful_machinery 12 / 1 张奖励表 2） |

430 处对应的原始 id 只有 23 个，集中在 4 个 **1.21.1 包里不存在的命名空间**：

- `more_mod_tetra:*`（15 个 id，约 150 处）
- `tetrawear:*`（4 个 id，约 44 处）
- `kinetic_pixel:*`（2 个 id，6 处）
- `nethervinery:nether_fizz`（1 处）

→ **这是源包内容缺口，不是迁移 bug**：这 4 个 mod 在 1.20.1 有、1.21.1 没有（§四第 4 条同一批）。
若将来补进 1.21.1 版本，图标会自动恢复正常（游戏回写保留了原 id 在 `components` 里）。

### 13.3 任务数据已被游戏回写（工作区 vs HEAD）
- FTB Quests 加载后会把所有章节文件按自己的序列化规则重写：字段按字母序、省略默认值、`filename` 用小写（文件名随之从
  `Mouse_Chef.snbt` 变为 `mouse_chef.snbt`，Windows 下 git 视作同一路径的 M）、无效图标转 `missing_item`、并新生成 `lang/en_us.snbt`。
- 因此 `git status` 里 80 个任务书文件全是 `M` —— **这是运行期状态，不是迁移产物**。
  **2026-09-22 晚决定：提交采纳**（`a17626f chore(quests): 采纳 FTB Quests 2101 的序列化结果` 75 个 snbt + `lang/en_us.snbt`；
  `3143d9d chore(config): 同步各 mod 运行期归一化后的配置` 35 个文件）→ 工作区归零，之后启动的回写即幂等。
- 重跑复现测试（§十一 Round 6）比的是 **HEAD 版本之间**，不受工作区回写影响；本次提交后 HEAD 已含游戏口径，
  若要重跑该测试须以迁移产物那批提交（`91fdd5b`/`b369490`）为基准。

## 十四、任务文本红字 `Invalid formatting! Can't nest multiple substitutes!`（2026-09-22 晚，已修）

**现象**：打开部分任务详情，描述/副标题位置显示红字 `Invalid formatting! Can't nest multiple substitutes!`（例：`quest.2CC8B87D086B3275`「步入石油电力！」）。

**根因（读 `ftb-quests-2101.1.36` 的 `dev.ftb.mods.ftbquests.util.TextUtils#parseRawText` 字节码得出）**：

```java
String s = raw.trim();
if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
    try { return Component.Serializer.fromJson(UNESCAPER.translate(s), lookup); }   // ① JSON 组件分支
    catch (JsonParseException ignored) { }
}
return ClientTextComponentUtils.parse(UNESCAPER.translate(raw));                    // ② {…} 标记分支
```

任务文本里那些"可点击跳转"的组件，1.20.1 时代写作**宽松 JSON 字符串**（`"underlined": "true"` —— 布尔写成了字符串），
1.21 的严格 codec 判定非法 → ①失败 → 落到②标记解析器 → 字符串里有嵌套花括号 → 报错并显示红字。
（`{@pagebreak}` / `{image:…}` 这类**没有嵌套**的标记走②是正常设计，不是问题。）

**修复**：`scripts/fix-quests-text-components.mjs` —— 扫描 `lang/*.snbt` 里以 `{`/`[` 开头结尾的字符串值，
对合法 JSON 递归规范化（样式布尔字符串→布尔，并校验 `color`/`text`/`extra`/`clickEvent`/`hoverEvent`），
写回紧凑 JSON 与正确的 SNBT 转义。**保留可点击跳转语义**，不是简单删文本。

| 指标 | 数 |
|---|---|
| 以 `{` 开头且 `}` 结尾的字符串值 | 178 |
| 非 JSON 的合法标记（`{@pagebreak}` 37 处、`{image:…}` 等） | 37 |
| 合法 JSON 组件 | 141 |
| **需规范化（字符串布尔）** | **24** |
| 规范化后仍失败的 | 0 |

- 备份：`_dsh_tmp/quests-lang-backup/en_us.snbt.bak`。
- 用法：`node scripts/fix-quests-text-components.mjs --dry-run` / 无参写回。
- **生效方式**：文本是服务端下发的翻译表（日志 `received translation table en_us`），改完要**重进世界或重启游戏**才会重新读取。

### 14.1 同批确认：任务类型现状与「对号」图标
| 任务类型 | 数量 | 说明 |
|---|---|---|
| `item` | 2432 | 原生物品任务（有物品图标） |
| `checkmark` | **681** | 其中 **84 个是本迁移把 `itemfilters:*`（62）与 `questsadditions:*`（22）转来的**，其余 597 个源包本来就是 checkmark |
| `xp` / `kill` / `observation` / `custom` / `advancement` … | 其余 | 源包原生类型 |

- 2101 **没有** `itemfilters` 的等价任务类型；`ftb-quests` 与 `ftb-filter-system` 的 jar 里都搜不到任何 `ftbfiltersystem` 任务类型集成（0 命中）→ 那 84 个只能保持 checkmark（显示 ✔、无物品图标）。
- 若要把其中"过滤器其实只锁定了一个具体物品"的恢复成 `item` 任务（拿回物品图标与"持有该物品"语义），属于可选精修，见报告 `_dsh_tmp/quests-migration-report.md` 的 itemfilters 明细。

### 14.2 已做：给这 82 个 quest 补回 quest 级图标（2026-09-22 晚，**已完成**）

**做法**：不动任务类型（仍是 checkmark，语义不变），只给"自己没有 icon"的 quest 补 `icon: { id: … }` 取回视觉图标。
工具：`scripts/restore-quest-icons.mjs`（`--dry-run` / `--debug` / 无参写回，写回时同目录留 `.bak`，本次备份已移到 `_dsh_tmp/quests-chapters-bak/`）。

图标来源（按优先级）：
1. 源包（CDR1201）里该 task 的 `item:` 块 → `itemfilters:tag` 的 tag → 用**各 jar 的 `data/*/tags/item*/**.json`**（原版 + 364 个 mod）递归展开，挑代表物品；
2. tag 在 1.21.1 不存在时 → 按名字猜 `<ns>:<末段>`（含命名空间改名表、单复数变体），并用 `assets/<ns>/models/{item,block}/*.json` **验证物品确实存在**；
3. 仍不行 → 人工指定（下表 12 个，全部经模型表校验）。

| 指标 | 数 |
|---|---|
| 待补 quest（无 icon 的转换任务） | **82** |
| 实际补上 | **75** |
| 其中：按 tag 解析 | 61 |
| 其中：按名字猜（tag 已不存在） | 2 |
| 其中：人工指定 | 12 |
| 未补（保持 ✔） | 0 |

人工指定的 12 个（原 tag → 采用图标，理由见脚本内注释）：

| quest | 原 tag | 采用图标 |
|---|---|---|
| `333BF6EDDA0D6998` 命定之门 | `#more_mod_tetra:over_core` | `gateways:gate_pearl` |
| `38FEB46E9F16E159` 可丢出 | `#alexscaves:ice_cream_scoop` | `alexscavesup:vanilla_ice_cream_scoop` |
| `1DC5E003961CA53D` | `#alexscaves:sweetish_fish` | `alexscavesup:sweetish_fish_blue` |
| `731F8C9DC5ADC57F` | `#alexscaves:ice_cream` | `alexscavesup:vanilla_ice_cream` |
| `65877729DB7620EF` 保险库 | `#create_bs:vaults` | `create_bs:iron_item_vault` |
| `3968AC36E0517F5B` 低强度弹簧 | `#forge:spring/below_500` | `vintageimprovements:andesite_spring` |
| `610ED0789BAF7EFC` 高强度弹簧 | `#forge:spring/between_500_2_1000` | `vintageimprovements:steel_spring` |
| `4CC4E893A6950B0F` 超高强度弹簧 | `#forge:spring/over_1000` | `vintageimprovements:netherite_spring` |
| `395CE84DC5201E94` 电线 | `#forge:wires/electric` | `create_new_age:copper_wire` |
| `73B0EDFE6627F286` 竹子/树皮/木屑/草杆 | `#forge:papers_raw_material` | `minecraft:bamboo` |
| `5F7A132E1CFCEED3` 仙人掌/菠萝苗/腐肉/粗布 | `#createdelight:leather_ingredient` | `minecraft:cactus` |
| `2A65ED174CF69AB7` 冻青蛙这一块 | `#youkaishomecoming:frozen_frog` | `youkaishomecoming:frozen_frog_temperate` |

**过程中踩到的坑（已写进脚本注释）**：源包章节文件里存在「大小写映射会改变长度」的 Unicode 字符，
所以**不能** `text.toUpperCase().indexOf(...)` 定位 id（实测整批 82 条全部定位失败），要用大小写不敏感的正则或分别试大小写。