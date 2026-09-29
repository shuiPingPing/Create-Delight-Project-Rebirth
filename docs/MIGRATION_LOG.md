# 移植总账：过程、问题与基线

> CDR1201（1.20.1 Forge 源包）→ CDR1211（1.21.1 NeoForge 移植仓）整条迁移线的**总账**：
> 迁移是怎么做的、踩过哪些坑、1.20.1 侧对应的 git 版本号、以及还没解决的事。
> 逐日流水仍在**仓库外**的根文档（`移植台账.md`、`移植作战图.md`、`开发环境与工具链现状.md`，位于工作区根目录），
> 本文件是**汇总与检索入口**，冲突时以根文档的流水与代码/日志为准。
>
> **本文件与其它入库文档一律不写本机绝对路径**（用户要求，2026-09-28）：文中 `<本仓库>` = 本仓库工作区、
> `<参考仓库>` = 1.20.1 源包工作区（只读）、`<实例目录>` = 客户端实例的 `.minecraft`；
> 具体路径与环境变量写在**不入库**的 `AGENTS.local.md`。
>
> **维护约定（用户要求，2026-09-28 修订）**：**只在用户说「今天到此」「今天先到这」这类结束语时**才更新本文件并提交推送——
> 新问题进 §3（编号顺延 `P-###`）、新工作阶段进 §2、遗留与决定进 §4、更新历史进 §6。
> 其余时间不要中途更新，避免打断工作流（中途留痕写 `_dsh_tmp/`）。`AGENTS.md` 的「移植总账的更新时机」一节写明了同样要求。
> 只写真实发生过的事，宁可少写也不写空话。

## 0. 一页速览（2026-09-29 收工同步）

| 项 | 状态 |
| --- | --- |
| 迁移规模 | CDR1201（1.20.1 Forge，3079 提交）→ CDR1211（1.21.1 NeoForge **21.1.242**，四段式版本 `v2.0.0.0-test6`）；脚本覆盖约 41%，数据包 / 汉化 / 任务书 / 配置主体已迁 |
| 当前包状态 | ✅ **能进游戏、创造模式可正常进世界、主菜单 UI 定稿**（LOGO 居中且自适应；彩蛋文字落在标题右下角，既不被 LOGO 遮住也不压 LOGO）。本轮打 Release `v2.0.0.0-test6`（首次走「推 tag → CI 自动构建并公开预发布」） |
| 在位的大件 | Create Aeronautics 体系（本体 + 33 附属 + Sable）、Iron's Spells 系 3 个、Apotheosis 线 4 个、Core **2.0.0.7**、Drippy 加载屏、光影栈（Colorwheel + Complementary + Euphoria Patcher） |
| 问题台账 | **173 条**（`P-001`~`P-173`）：本轮新增 **P-171~P-173**（主菜单居中 / 遮挡 / 按钮重叠），并把 P-118、P-120、P-065 收口 |
| 本轮（09-29）修掉的故障 | ① 主菜单 LOGO 被裁且不居中（P-171：`auto_sizing` 缺 `sticky_anchor`）② 彩蛋黄字被自定义 LOGO 盖住、位置怎么调都不对（P-172：原版 splash 属原版层，改用自定义 `splash_text` 元素）③ IAS 标题按钮与 Supplementaries 配置按钮重叠（P-173）④ 缺贴图/缺模型告警口径订正并清掉 461 条（`c99c8b2`）⑤ `zh_cn` 那 4 个键实为占位章节文案、`en_us` 缺键（P-120 订正，`9611bb0`）⑥ `check-hashes` 卡死加超时（`cd9062a`） |
| 本轮判定收口 | **P-118 客户端 16 脚本**：应迁 0 / 已由 mod（Java）接管 11 / 放弃 5（难度 HUD 试做一次后撤销——Improved Mobs 自带右上角难度 overlay）；**P-065**：实际 **808 条**告警（原口径 526 只数了一类），已修 461 条，余下 6 类挂账 + 1 条待用户决策 |
| 本轮工程清理 | `scripts/` 下 18 个迁移期脚本不再硬编码本机绝对路径（`d07c504`：新增 `scripts/paths.mjs`，路径由 `import.meta.url` 推导，参考仓库/实例目录走 `CDPR_REF_REPO`/`CDPR_MC_HOME`）；入库文档口径不变（仍不写本机路径） |
| 上一轮（09-28）装了/升了什么 | 7 个新模组（法术系 `irons_spellbooks` 3.16.3 + `irons_lib` 2.2.0 + `farmers_spell` 1.0.5.1；Apotheosis 线 `Apotheosis` 8.9.0 + `ApothicSpawners` 1.4.0 + `ApothicEnchanting` 1.6.2 + `Patchouli` 93）、任务书 2 处、`forged_steel_ingot` 重复注册修复、自制材质包 `no-vanilla-sun` 进包 |
| 上一轮（09-28）修掉的故障 | ① Drippy 早窗缺陷（P-162）② `forged_steel_ingot` 重复注册（P-163）③ Apokinetics × Apotheosis 8.9 签名不匹配（P-164，以移除收场）④ CSL 15.x × 早窗被禁用（P-165，回退 drippy）⑤ **创造模式进世界崩服**（P-167）⑥ **CI cache-seed 每次都失败**（P-168）⑦ 一批上游缺键/缺图（P-169）⑧ KubeJS 重复加入创造标签页（P-170） |
| 上一轮（09-28）的汉化/资源补齐 | Iron's Spellbooks 状态名与图标、Apotheosis 三件套 36 键、Iron's Lib 72 键、`createdelightcore` en_us 的 49 个 tip 键、`no-vanilla-sun` 材质包默认启用 |
| 两条硬约束 | ① **IF 1.4.x ↔ Drippy 早窗必崩**（1.4.2 / 1.4.3 实测）② **早窗不能不是 `drippy_early_window`**（全包只有 Drippy 提供 provider；改成别的值=禁用早窗 → CSL 15.x 崩） |
| 暂缓项（等上游更新） | IF 1.4.3（真空收割机）、Apokinetics 1.0.6 → 详见 `PORT_BACKLOG.md`（含复活步骤与重新下载来源） |
| 流程约定 | 崩溃时**先摘 Drippy 启动一次**看真凶再装回（`AGENTS.md`）；**改过描述符、push 前跑 `devtool.bat check-hashes --changed`**（P-168 的教训）；移植总账**只在用户喊收工时**同步 |
| 文档口径 | 入库文档一律不写本机绝对路径（用 `<本仓库>` / `<参考仓库>` / `<实例目录>` 占位，实际路径见不入库的 `AGENTS.local.md`） |

## 1. 两侧仓库与基线（核对日：2026-09-28）

### 1.1 对照表

| 项 | CDR1201（源包，**只读**） | CDR1211（本仓，迁移产物） |
| --- | --- | --- |
| 本地路径 | `<参考仓库>`（1.20.1 源包，只读） | `<本仓库>`（迁移产物） |
| GitHub remote | `shuiPingPing/Create-Delight-Remake` | `shuiPingPing/Create-Delight-Project-Rebirth` |
| Minecraft / 加载器 | 1.20.1 / Forge **47.4.16** | 1.21.1 / NeoForge **21.1.242**（Java **21**） |
| 包版本 | `v0.5.0.9-test`（`modpack.toml`，未变） | `v2.0.0.0-test5`（`pack/pack.toml`，四段式，与上游一致） |
| HEAD | `4c85c39c`（2026-09-27；**首次核对时是 `1b1b8b7e`/2026-09-12，之间 49 个提交见 §2.3**） | `51acdce`（2026-09-28） |
| git 提交数 | 3079（首提交 2024-08-07；2024 年 1281 / 2025 年 1116 / 2026 年 682） | 456（首提交 2026-05-03；05 月 112 / 06 月 38 / 07 月 118 / 08 月 2 / 09 月 186） |
| tag | 无 tag（`git describe` 失败） | `v0.1.0`（唯一已推 origin 的 tag）、`v2.0.0.0-test1`~`test4`（上游 tag，仅本地）、`pre-upstream-20260920`（= `00a6873`，合并上游前的存档点） |
| 包管理工具链 | 原生 `packwiz` + 自研 PowerShell 脚本 | `bkmpw` **0.1.1**（npm `@bro-know-my/packwiz`，CI 装 `@latest`）+ `devtool.mjs`（`devtool.bat` / `devtool.sh`） |
| mod 元数据布局 | `mods/` 扁平 | `mods/common`、`mods/client`、`mods/server` 分层（+ `resourcepacks/`、`shaderpacks/` 的 `.pw.toml`） |
| 客户端实例 | HMCL 里的 CDR1201 发布版实例 | HMCL 实例 `CDPR`：实例目录 `<实例目录>/versions/CDPR`，与本仓库为**同一目录**（junction） |
| 写权限 | **只读**（2026-09-22 用户明确要求：不改文件、不建分支、不提交、不推送、不建 PR/Issue） | 所有迁移产物落这里，提交信息里写明来源 |

### 1.2 CDR1201 各部门的 git 版本号（1.20.1 侧溯源）

> 复现命令：`git -C <参考仓库> log -1 --format='%h|%ad|%s' --date=short -- <路径>`
> 说明：迁移**不是从某个固定 commit 拉分支**，而是持续读取 CDR1201 `main` 的工作区，
> 所以下表是「核对日各来源目录最后变更的提交」＝当时看到的那一版的下界。
> **核对日 2026-09-28（第二次，HEAD=`4c85c39c`）**；带 ★ 的是相比首次核对（`1b1b8b7e`）有推进的目录。

| 来源路径（CDR1201） | 最后变更提交 | 日期 | 提交说明 |
| --- | --- | --- | --- |
| `mods/` ★ | `4c85c39c` | 2026-09-27 | [mod] 更新 Tetra Insight 至 0.1.8 (#2376) |
| `config/` ★ | `4c85c39c` | 2026-09-27 | 同上（Apotheosis / JEI / Crash Assistant / FancyMenu 配置同批） |
| `kubejs/` ★ | `30781f52` | 2026-09-27 | [feat] 主菜单随机彩蛋与节日灯带 |
| `kubejs/assets/` ★ | `30781f52` | 2026-09-27 | 同上（title.png、官网二维码、多语言文件） |
| `kubejs/server_scripts/` ★ | `8844be3a` | 2026-09-26 | [dev] kubejs/data 配方 JSON 迁移到 KJS 脚本 |
| `kubejs/data/` ★ | `8844be3a` | 2026-09-26 | 同上（341 文件、-6226 行，配方从 JSON 改为脚本） |
| `kubejs/startup_scripts/` ★ | `4ee92d1b` | 2026-09-26 | [fix] 补齐 cryo_fuel_bucket 的 empty bucket 剩余物 |
| `kubejs/client_scripts/` ★ | `a10a2089` | 2026-09-19 | [mod] 迁移流体容器并更新模组 |
| `kubejs/startup_scripts/creative_tab/` ★ | `a10a2089` | 2026-09-19 | 同上 |
| `config/ftbquests/` ★ | `a10a2089` | 2026-09-19 | 同上（另 30781f52/790b5fde 改过任务书章节） |
| `scripts/` ★ | `30781f52` | 2026-09-27 | [feat] 主菜单随机彩蛋与节日灯带 |
| `docs/` ★ | `30781f52` | 2026-09-27 | 同上 |
| `.agents/` ★（新增重点） | `cc1a4622` | 2026-09-27 | 修复 Java/Go 更新器安全漏洞（新增 release skill 的 cdr-updater） |
| `.github/workflows/` ★ | `54592727` | 2026-09-18 | [dev] 在客户端构建日志列出内置模组并审计允许列表 (#2311) |
| `CDC-mod-src/` ★ | `0d7585ea` | 2026-09-27 | [mod] 更新 Create Delight Core 至 2.2.16k (#2377) |
| `hotai/` ★ | `05a541d2` | 2026-09-26 | [fix] 修复烈焰人燃烧室无法使用普通固体燃料 |
| `packwiz-files/` ★ | `0d7585ea` | 2026-09-27 | [mod] 更新 Create Delight Core 至 2.2.16k (#2377) |
| `modpack.toml` | `db813954` | 2026-09-02 | [feat] v0.5.0.9-test 测试版版本更新 (#2219)（版本号本轮未变） |
| `defaultconfigs/` | `7ef30de1` | 2026-09-06 | [mod] 进一步适配流体包裹新内容 (#2244) |
| `resourcepacks/` | `c1a25633` | 2026-09-09 | [fix] 回滚方纹更新（画风不贴合）(#2266) |
| `shaderpacks/` | `8c885c2c` | 2026-06-23 | [fix] 移除多余的 pw.toml 文件 (#1865) |
| `tacz/` | `8f9c7c05` | 2026-08-28 | [fix] tacz 枪包元数据改 CF CDN 直链 (#2201) |
| `schematics/` | `7206efaf` | 2026-06-17 | [fix] 去除炼油蓝图中的创造取出升级卡 (#1800) |

### 1.3 复现某一批迁移时的源文件

```powershell
# 看某路径在源包上的历史
git -C <参考仓库> log --oneline -5 -- kubejs/server_scripts
# 取当时的文件内容（只读读取，不要写入参考仓库）
git -C <参考仓库> show 93f0b4da:kubejs/startup_scripts/creative_tab/<file>.js
```

CDR1201 的 HEAD（`1b1b8b7e`）与各目录的“最后变更提交”不同属正常——目录没动就不会有新提交。

## 2. 迁移过程

### 2.1 阶段划分（按提交节奏）

| 阶段 | 时间 | 做了什么 | 关键提交 | 1.20.1 侧来源 |
| --- | --- | --- | --- | --- |
| 起步 | 2026-05（112 提交） | `Initial commit` → 图标/`.gitignore` → 引入首批 mod（机械动力：冶金学、妖怪们的归家、Create Functional Storage #39）、加 tetra、修正未安装清单；上游下载工具支持并行拉取 | `6420cc3`、`78da727`、`7de7d78`、`9e2485f`、`4fbeedf`、`b257ae8` | `mods/`、`packwiz-files/` |
| 元数据与工具链 | 2026-06（38 提交） | mod 元数据迁到 `mods/common` 分层布局、切到 `bkmpw` 工具链、补协作说明；修 FancyMenu 加载地形文案重影 | `bb8e8b1`、`57aa81a`、`c511d3c`、`2d96e59` | `mods/*.pw.toml` |
| 模组成型 | 2026-07（118 提交） | 加 ByePregen（#80/#83）、补跨平台部署工具链（#81）、pack 切 CurseForge 官方版并同步升 NeoForge（#128）、`devtool` 增加版本基线校验（#130）、HMCL 指南（#134）；持续对齐上游模组版本 | `1794720`、`baab6f4`、`c940be2`、`fcc1025`、`9b55887` | `mods/`、`pack/pack.toml` |
| 停滞 | 2026-08（仅 2 提交） | 只做了 alex 系列换稳定移植版、Quality Food 换 Quality Food J；08-11 后停更 | `ca5e08a`、`3b3441f` | `mods/` |
| **实机驱动期** | 2026-09-14 起（185 提交） | 见 §2.2 | — | — |

### 2.2 实机驱动期（2026-09-14 ~ 2026-09-29）

| 日期 | 做了什么 | 关键提交 | 来源 / 产出 |
| --- | --- | --- | --- |
| 09-14 | **首次真正跑起来**（411 模组、三侧脚本加载、自检通过）；脚本 0 错但有 83 处配方 WARN；方法论改为「一切以实机日志为准」 | — | `logs/latest.log` |
| 09-16 | 定「首个可玩里程碑」＝能进游戏＋一条 Create×农夫乐事基础生产链＋零脚本报错；关 Drippy、加 Default Options、主菜单重写；战役 0–5 划分 | — | `AGENTS.md`、`config/fancymenu/` |
| 09-17 | 断链清零：实机核对后真断链 8 个命名空间 / 约 59 处，全部在 `hasMod()` 下优雅降级 → 处置「保留 + 记账」；assets/data 第一批搬 151 目录 | — | `docs/未安装mod清单.md` |
| 09-18 | 脚本层迁移：4 个低成本脚本、Improved Mobs 难度系统用 `persistentData` 重写（5/5）、**assets/data 迁移并全局改名 `createdelight`→`createdelightcore`**；mbd2 侦察 | `7933ad4`、`1cae462`、`0d70170` | `kubejs/{server,startup,client}_scripts/`、`kubejs/{assets,data}` |
| 09-20 | 航空学体系补装 33 个附属（详细见 `docs/CREATE_AERONAUTICS.md`） | — | `mods/common/*aero*` |
| 09-21 | 逐文件复核订正（2 处误判作废、补出 ponder 24 + northstar 5）；**合并上游 11 提交 / 348 文件 / 44 冲突**；升 CDC 2.0.0.6；修 5 类连环崩溃（JEI/Carry On/Drippy/配方越限/forged_steel） | `2709bc7`、`2d39e73`、`84c1360`、`da502dd`、`fb27797`、`b7a69b8` | `kubejs/server_scripts/`、`mods/client/` |
| 09-22 | 光影栈补齐（Complementary r5.9.3 + Colorwheel + Euphoria Patcher）；Northstar 双日调查；**FTB Quests 75 snbt 迁入**（实机验收 2386 quests）；**Ponder 展示层 24 文件 2006 行迁入** | `f833a26`、`6899385`、`8d18301`、`3311137`、`16f5842` | `config/ftbquests/quests`、`client_scripts/ponder/**` |
| 09-23 | 汉化全包扫（106 ns / 3574 键 → 0，后按值级口径补 141→66、不可见缺口 679、ali 317）；旧数据包路径 473 文件分批迁移（改单数目录）；配方/战利品表 91 文件 + 标签 42 文件；补 7 个材质包；核实 122 个候选 mod 的 1.21.1 可用性 | `5673685`、`43f7560`、`2d9c2fd`、`6921ae0`、`09f8b64`、`00c731a` | `kubejs/data/**`、`kubejs/assets/*/lang/`、`resourcepacks/` |
| 09-24 白天 | 待加 mod A 组（16+3）与 B 组（19+1）加入，连续撤回 5 个（Vanillin/PowerfulJS/JET/createidlx/FVTV）；14:33 **首次稳定进游戏**；创造栏整理层 46/61 迁入 + EMI 按木种分组；客户端体验默认项（FPS/EMI/ModernUI/Ultimine） | `43e9021`、`c4bda0e`、`14fbb06`、`cf47ece`、`2916852`、`81b3378` | `startup_scripts/creative_tab/*.js`、`config/defaultoptions/` |
| 09-24 白天 | **发布体系**：建 GitHub Actions Release + Assets，tag `v0.1.0` 跑通并由用户发布（5 个资产） | `31d0a9a`、`699f315`、`8b17b86` | `.github/workflows/release.yml` |
| 09-24 晚 | 合并上游 16 提交 + **Core 升 2.0.0.7**；修提交里的乱码文档 | `b1defb5` | `mods/common/create-delight-core.pw.toml` |
| 09-24 晚 | 改用上游那套 `release.yml` + 版本号对齐四段式 `v2.0.0.0-test5`；顺带修完整性清单路径误伤 | `df2fc5e`、`782724c` | `.github/workflows/release.yml`、`pack/pack.toml` |
| 09-28 | 航空学接入记录整理成文；README 加「仅供娱乐」说明；建立本总账并把同步规则写进 `AGENTS.md` | `f990e66`、`4ca5922`、`9fadd15` | `docs/CREATE_AERONAUTICS.md`、`README.md`、本文件 |
| 09-28（下午） | 核对 CDR1201 的 49 个新提交 → 出候选清单 → 按用户勾选移入 **Iron's Spells 系 3 个 + Apotheosis 线 4 个**；任务书 2 处；随后连遇 4 个启动故障（详见 §3 P-162~P-165）并全部处置，15:03 实机验证通过 | `f19b339`、`dc21f9c`、`97013d0`→`e848913`、`06a82c3`、`a89c29a`、`d7de143` | `mods/common/{irons-*,apotheosis,apothic-*,patchouli}.pw.toml`、`docs/PORT_BACKLOG.md` |
| 09-28（晚） | ① 用户报「创造模式进世界崩」→ 定位为三个战利品箱 `string_id` 撞车（P-167，已修，用户实机确认可正常进游戏）② 补一批上游缺键/缺图（P-169）：Iron's Spellbooks 状态名+图标、Apotheosis 三件套、Iron's Lib、`createdelightcore` 的 en_us tip 键 ③ KubeJS 重复加入创造标签页（P-170）④ 用户报「CI 老卡在 cache-seed」→ 复现并定位为描述符 sha1 与 CurseForge 现字节不一致（P-168），修 hash 后 CI 转绿；新增 `devtool check-hashes` 预检 ⑤ 自制材质包 `no-vanilla-sun` 进包并默认启用 ⑥ 入库文档去掉本机绝对路径口径 | `67901bb`、`23e106b`、`9b23638`、`a0ada68`、`17715ba`、`116d5bc`、`d39d925`、`5d190d8`、`aeda017`、`4cf996e` | `config/ftbquests/quests/reward_tables/`、`kubejs/assets/*/lang/`、`kubejs/config/createdelight_pack_integrity.json`、`mods/common/irons-spellbooks.pw.toml`、`resourcepacks/no-vanilla-sun.zip`、`scripts/devtool.mjs` |

| 09-29 | ① `scripts/` 本机路径清理（`d07c504`，18 个脚本 + `scripts/paths.mjs`）② P-120 订正：`zh_cn` 4 键是占位章节/任务正文，真问题是 `en_us.snbt` 缺键 → 补进（`9611bb0`）③ `check-hashes` 加超时（`cd9062a`）④ 缺贴图/模型口径订正为 808 条并清掉 461 条（`c99c8b2`）⑤ P-118 判定闭环（难度 HUD 试做后撤销，Improved Mobs 自带 overlay）⑥ **主菜单 UI 迭代到定稿**：LOGO 自适应 + 居中（`82adf6c`、`d9b72b2`）、彩蛋黄字挪位（`53fa684`→`9b2e946`）、改用自定义 `splash_text` 元素并藏掉原版 splash（`9ac375f`）、坐标改用屏幕 GUI 像素后落定 `x=120, y=56`（`1200b28`）⑦ 打 Release `v2.0.0.0-test6` | `d07c504`、`9611bb0`、`cd9062a`、`c99c8b2`、`8f3f7af`→`b3443b8`、`f61bce5`、`82adf6c`、`d9b72b2`、`53fa684`、`9b2e946`、`9ac375f`、`1200b28` | `scripts/paths.mjs`、`config/ftbquests/quests/lang/en_us.snbt`、`kubejs/`、`config/fancymenu/customization/title_screen_layout.txt` |

### 2.3 CDR1201 侧的新变化（2026-09-12 → 2026-09-27，**49 提交 / 556 文件**，尚未同步）

用户要求「看下 1201，对比下有哪些变化」时的核对结果。范围 `1b1b8b7e..4c85c39c`，
文件变更 A129 / M136 / D290 / R1；版本号 `v0.5.0.9-test` **未变**。

| 目录 | 文件数 | ±行 | 主要内容 |
| --- | --- | --- | --- |
| `kubejs/` | 396 | +1449 / −6894 | **配方从 `data/**/*.json` 迁到 KJS 脚本**（`8844be3a`：341 文件 / −6226 行），`kubejs/data` 里的 recipe JSON 只剩 120 个；顺带改各模组 `recipe.js` |
| `.agents/` | 85 | +19472 / −5 | 知识库与技能大增，**新增 release skill 的 `cdr-updater-go/`（93 个文件，Go 更新服务器 + `cdr-updater.jar` 客户端）** |
| `mods/` | 23 | +164 / −48 | +10 新模组、−1、12 个更新（见下表） |
| `config/` | 19 | +2655 / −801 | Apotheosis（names/adventure/apotheosis）、JEI 分类排序、Crash Assistant（+modlist）、FancyMenu（title 纹理/布局/彩蛋/节日灯带）、3 个任务书章节、alexsmobs、imblocker |
| `docs/` | 10 | +410 / −24 | 兼容文档、肥皂合并计划、工作站兼容三项计划等 |
| `.github/` | 3 | +56 / −8 | 客户端构建日志列出内置模组并审计允许列表 (#2311) |
| `scripts/` | 3 | +76 / −7 | Crash Assistant 清单生成、packwiz 分发过滤测试、知识库校验 |

**模组变化（23 个描述符）**

- 新增 10 个：`irons-spellbooks 3.16.3`、`irons-lib 2.1.0`、`traveloptics 6.3.0`（Iron's Spells 附属）、
  `farmers-spell 1.0.5`（手动分发，走 GitHub raw）、`apokinetics 1.0.6`（Create: Apokinetics）、
  `fallen-lib 1.4.6`、`fallen-gems-affixes 2.1.5`、`tetra-apothic-link 0.1.1`、
  `tacza 1.2.0`（TaCZ:Accel 性能优化）、`quantified-api 2.2.3`
- 删除 1 个：`createfluidstuffs`（此前已并入流体容器/流体包裹体系）
- 更新 12 个：**`kubejs` build.24 → build.16（回退，修食物属性覆盖 #2369）**、
  `CreateLazyTick 2.5.21→2.6.25`、`create-dragons-plus 1.11.7→1.11.9`、
  `createfactorycontroller 1.1.1→1.2.1`、`fluidlogistics 1.2.9→1.3.0`、
  `create-integrated-farming 1.4.1c→1.4.3`、`create_enchantment_industry 2.5.2→2.5.4`、
  `tetra-insight 0.1.6→0.1.8`、`crash-assistant → 1.11.11`（并把基线改用 CurseForge 安装名消除误报）、
  `vintageimprovements`、`taczaddon`，以及 `create-delight-core`（1.20.1 线升到 **2.2.16k**）

**与 CDR1211 的交叉核对（本仓现状）**

- 已经同步/更新：`Crash Assistant 1.11.12`（更新）、`create-dragons-plus 1.11.9`、`create-enchantment-industry 2.5.4`、
  `createfactorycontroller 1.2.1`、`CreateLazyTick 2.6.25`、`fluidlogistics 1.3.0`（版本号已一致）
- 本仓**没有**：Iron's Spells 全家桶（`irons_spellbooks`/`irons_lib`/`traveloptics`/`farmers_spell`）、
  `apokinetics`、`fallen_lib`/`fallen_gems_affixes`、`tetra_apothic_link`、`tacza`、`quantified-api`，
  以及 **Apotheosis 本体**（因此那几处 Apotheosis 配置对本仓不适用）
- KubeJS 线不同：本仓是 `2101.7.2-build.363`（1.21.1 线），源包是 2001.6.5 线；源包这次的回退原因（食物属性覆盖）值得留意同类回归

## 3. 问题总台账

编号规则：`P-###` 全局顺延，**新增问题一律往后续号**，不要重排已有编号。
「相关提交」里是本仓（CDR1211）的提交号；1.20.1 侧来源见 §1.2。

### 3.1 启动崩溃 / mixin / 版本组合

| 编号 | 现象 | 根因 | 处置 | 相关提交 / 文件 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P-001 | 按 E 开背包硬崩 | 上游把 JEI 升到 19.57，而航空学内嵌 `simulated 1.3.0` 的 `silence_jei.ItemStackListFactoryMixin` 只适配旧 JEI | JEI 锁 19.27.0.336，并连带锁回 6 个要求更高 JEI 的模组 | `84c1360`、`8e5f1a7`；`mods/client/jei.pw.toml`、ldlib2/polymorph/ftb-xmod-compat/sophisticatedcore/sophisticatedbackpacks/其 create-integration | 已修 |
| P-002 | 启动早期崩（**无 crash 报告**） | Drippy 的 `Custom loading overlay class missing`（`updateModuleReads` 用线程上下文 ClassLoader） | 先移除 SSRD 复测通过；一轮修复后装回 SSRD 1.8.6，实测与 Drippy 3.1.5 共存 | `8e5f1a7`、`b7a69b8` | 订正为「环境相关、非稳定二选一」 |
| P-003 | 右键方块崩 | Carry On 升 2.2.6.13 改了 `PickupHandler` 结构，`carryonaerocompat 1.1.1` 的 redirect 注入失败 | Carry On 锁回 2.2.4.4（兼容层无新版可升） | `da502dd`；`mods/client/carryon.pw.toml` | 已修 |
| P-004 | 启动崩 `MixinInitialisationError` | `futurevillagertradesvisible.mixins.json` 首字节带 UTF-8 BOM | 移除该模组（全包扫 627 个 `mixins.json`，仅它带 BOM） | `38b56b8`；`_dsh_tmp/scan-mixins-bom.mjs` | 已撤 |
| P-005 | 标题界面崩 `Cannot get config value` | PowerfulJS 2.4.0 的 `StoveMixin` `@Shadow` 了已删除字段 → broken mod state | 移除 PowerfulJS（全包无引用） | `e70f455` | 已撤 |
| P-006 | JEI 构建失败 `InjectionError` | Just Enough Threads 与 EMI 对 JEI `PluginCaller.callOnPlugins` 重复 redirect | 移除 | `e8a2820` | 已撤 |
| P-007 | 注册事件抛异常并回滚到 VANILLA | createidlx 1.5 与 Create 6.0.10 重复注册 `create:display_source` | 移除 createidlx | `0309005` | 已撤 |
| P-008 | 启动期报「必装依赖不满足」 | Vanillin 内嵌 Flywheel 1.0.4，把全局解析版本拉低（Create 6.0.10 需 ≥ 1.0.6） | 移除 Vanillin | `de0e449`；`_dsh_tmp/check-nested-lib-conflicts.mjs` | 已修 |
| P-009 | 14:37 JVM 原生崩溃 | 点了游戏内 MCP 悬浮按钮（`glfwSetInputMode` 段错误） | 非包问题：本地禁忌，不点按钮、只走 HTTP API | `hs_err_pid3500.log` | 已定性 |

### 3.2 依赖 / mod 缺失与替代 / 版本决策

| 编号 | 现象 | 根因 | 处置 | 相关提交 / 文件 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P-010 | 22 个脚本目录对应的 mod 在 1.21.1 无版本 | 真缺失（美食类、部分 Create 附属等） | 休眠代码保留 + 记账，不迁 | 台账 §2.1；`mods/*.pw.toml` | 记账 |
| P-011 | mod 换代 / 改名 | `alexscaves→alexscavesup`、`ldlib→ldlib2` 等 | 按新 mod id 迁移脚本与数据 | 台账 §8.18/§8.19 | 已迁 |
| P-012 | 只看 CurseForge 标签会误判「没有 1.21.1」 | CF 项目页未标 1.21.1 | 必须 Modrinth 交叉验证 | 台账 §8.19 | 教训 |
| P-013 | 「本体没有 1.21.1」≠「用不了」 | 判据漏查翻译层 / 替代实现 | 记录 `Roxy` 等路线，待用户选 | 台账 §8.19/§8.28 | 未决 |
| P-014 | CobbleForDays 加不了 | CF 只有 Forge 构建，类引用 `net/minecraftforge/*` | 不加 | 台账 §8.25/§8.26 | 不加 |
| P-015 | Cull Less Leaves 加不了 | Modrinth 的 1.21.1 只有 fabric/quilt | 不加；列出 3 个替代待定 | 台账 §8.26 | 待定 |
| P-016 | Remove Stardust Labs Intro 被误判「加不了」 | 依赖审计脚本用整文件正则，字段串味 | 改逐行解析后补加 | `4d3bbac` | 已修 |
| P-017 | 依赖体检误报缺依赖 | `type` 有 REQUIRED/OPTIONAL 大小写与 discouraged/incompatible 语义差异 | 规范化后：403 jar / 509 modId，缺失 0 | `_dsh_tmp/check-all-deps.mjs` | 通过 |
| P-018 | 旧命名空间残留风险 | 改名生效后会成空 tag / 直接报错 | 确认 `kubejs/data` 内无 `createdelight:` / `alexscaves:` 等旧 ns | 台账 §8.7A | 已确认 |
| P-019 | 上游 145 个模组升级带来连锁不兼容 | 上游升级宿主 mod，兼容层/字段/codec 跟着变 | 27 个描述符加 `pin`（含原因），另加本 fork 特有两组 | `docs/MOD_UPDATE_COMPATIBILITY.md` | 已处理 |

### 3.3 配方 / 数据包 / 标签

| 编号 | 现象 | 根因 | 处置 | 相关提交 / 文件 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P-020 | 12 处 Create 加工配方解析失败 | 上游删掉了「产物 > 4 就跳过」的守卫、启用了 2 产物 emptying、`4x` 写法被 KubeJS 展开成 4 个输入 | 恢复守卫、裁到 1 产物、改 `Item.of` | `fb27797`、`3f5724a`；`createoreexcavation/recipes.js`、`mynethersdelight/recipes.js`、`forged_steel.js` | 已修 |
| P-021 | `forged_steel_ingot` 相关 6 处配方失败 | CDC 2.0.0.6 仍未注册该物品 | KubeJS startup 补回 + `c:ingots/forged_steel` 标签 | `689b3fa`；`content_restore.js` | 已修 |
| P-022 | `rolled_polymer_sheet` 2 条配方失败 | 1.20.1 源包与 Core 都没有这个 id | 加存在性守卫，等上游修 | `fb27797`；`industrial_migration.js#199`/`#205` | 待上游 |
| P-023 | `mechanic_grinding_wheel` 1 条配方失败 | Core 的 24 台机器里没有它 | 加存在性守卫 | `8a487d7`；`mbd2/grinding_wheel.js` | 搁置（等游玩） |
| P-024 | `single_machines.js` 机器配方全失败 | Core 未提供该 schema，机器不在注册中 | 整体停用并留注释 | `8a487d7` | 搁置（等游玩） |
| P-025 | 53 / 123 条 `Failed to parse recipe` | KubeJS 建模失败回退原版（空元素、tag 原料） | 定性为噪音不动；新增分类脚本 | `fcd7230`；`scripts/classify-recipe-failures.mjs` | 已定性 |
| P-026 | 91 个文件的配方/战利品表失效 | 旧 modid 与字段形状（`result.item`→`id` 等） | 按 jar 内同名配方对齐改写 | `43f7560` | 待 `/reload` 复核 |
| P-027 | 473 个文件挂在 1.20.1 旧数据包路径 | 1.21 目录改单数（`recipe/`、`loot_table/`…），旧路径静默失效 | 分批改名 435 / 删除 38 | `5673685`、`e1db3e7`、`b2634ba`、`9661f33`、`14c107c`；`migrate-legacy-datapack-paths.mjs` | 已执行未验证 |
| P-028 | 标签 422 条死引用 | 引用未安装 mod 的命名空间 | 删除 | `2d9c2fd` | 已修 |
| P-029 | `forge:*` 标签引用 | 1.21 改用 `c:` 命名空间 | 删除/改名（REMAP 10 条） | `2d9c2fd`、`dcb6992`；`fix-forge-tags.mjs` | 已修 |
| P-030 | 标签条目级死引用 | 命名空间在但具体 id 没了 | 删 106 条、改名 5 条 | `6921ae0`；`audit-tag-entries.mjs` | 已修 |
| P-031 | `Could not decode GlobalLootModifier` | 1.21 的 condition id 是 `neoforge:loot_table_id` | 改 id + 移目录 + 删 4 个死桩 | `6921ae0` | 已修 |
| P-032 | `custom_name`/`lore` 报 `Not a string` | 1.21 组件 codec 只收字符串 | 改 `set_name` + `set_lore(mode=replace_all)` | `6921ae0` | 已修 |
| P-033 | Some Assembly Required 的 ingredient 整批没被读取 | 38 个文件仍在旧 modid 目录 | 按 jar 形状重写并迁位 | `6921ae0`；`migrate-sar-ingredients.mjs` | 已修 |
| P-034 | 锡矿没生成 / 月球钛矿没被移除 | NeoForge 只读 `data/<ns>/neoforge/biome_modifier/` | `git mv` 到 `neoforge/` 并改 type | `6921ae0` | 已修 |
| P-035 | bountiful cashier 池用了 `forge:` 标签 | 这些标签在 1.20.1 也无定义（历史残留） | 落到语义最近的 `c:` | `dcb6992`；`config/bountiful/bounty_pools/cashier_objs.json` | 已修 |
| P-036 | 标签清理脚本把 `event.add` 削坏 | 规则顺序错，语法合法但语义全错（`node --check` 也过） | 固定删行顺序 | `fix-forge-tags.mjs` | 已修 |
| P-037 | 26 种流体中文名只靠覆盖层 | jar 自身没有 `zh_cn` | 提醒：别误删这些覆盖层 | 台账 §8.9 | 提醒 |

### 3.4 KubeJS / 脚本运行时

| 编号 | 现象 | 根因 | 处置 | 相关提交 / 文件 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P-038 | `KubeJS Internal Error: UnsupportedOperationException` | KubeJS 2101 只有 startup 脚本能写 `global` | 门面改到 client 顶层 `var CDClientJavaClasses` | `3311137`；`00_java_classes.js` + 25 个引用文件 | 已修 |
| P-039 | `DataComponentWrapper.java#444` NPE | 1.20.1 的 `Fluid.of(fluid, amount, nbt)` 第三参在 1.21 是组件表 | 改 `custom_name` + `custom_data`，救回 18 条配方 | `6e7181a`；`create_mob_spawners/recipes.js` | 已修 |
| P-040 | 9 条 `Error parsing recipe …spawning/*` | `DataComponentPredicate` 对 `custom_name` 的 codec 是字符串 | `input.ingredient` 只留 `custom_data` | `6a9e5c9` | 已修 |
| P-041 | 47 条 `Failed to load tip` | tipsmod 1.21 要 `{"type","text"}` 结构 | 改 47 个文件 | `f972146`；`fix-tips-schema.mjs` | 已修 |

### 3.5 任务书 / 汉化 / 资源包

| 编号 | 现象 | 根因 | 处置 | 相关提交 / 文件 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P-042 | FTB Quests 75 个 snbt 未搬 | 迁移断档，1.21.1 侧只有 4 个空壳 | `migrate-ftbquests.mjs` 迁入并实机验收（2386 quests） | `6899385`；`config/ftbquests/quests`；见 `docs/FTBQUESTS_MIGRATION.md` | 完成 |
| P-043 | TACZ 任务物品全是黑紫块 | 游戏 1.21.1 回写丢掉 NBT 与 `match_nbt` | 按所属对象 id 搬回 108 item + 9 icon | `16f5842`；`fix-quests-tacz-items.mjs` | 已修 |
| P-044 | 任务书书本图标丢失 | 1.20.1 的 `tag` 写法在 1.21 无效 | 改用 `components` | 台账 §8.3 收尾 | 已修 |
| P-045 | 任务书文本红字 `Invalid formatting!` | 1.20.1 的 `"underlined": "true"` 在 1.21 严格 codec 非法 | 规范化 24 处 | `scripts/fix-quests-text-components.mjs` | 已修 |
| P-046 | 转换任务图标退回 ✔ | 82 个转 checkmark 后 74 个没有 quest 级 icon | 补 75 个 quest icon | `scripts/restore-quest-icons.mjs` | 已修 |
| P-047 | 深灰占位图标 430 处 | 1.21.1 缺 4 个 mod（tetra 系等） | 非迁移误伤，保守保留原 id | 台账 §8.3 | 已核实 |
| P-048 | 「打开任务书即崩」为误判 | 把 ProbeJS 启动期 dump 的 FATAL 当成开书证据 | 反编译核实后恢复启用 | `6899385`（撤销移除） | 已订正 |
| P-049 | ME 无限元件黑紫块 | ExtendedAE 改成 KubeJS 物品类型，缺 model/texture 任一项 | `cellModel` + `texture`，实际注册 44 个 | `2f9253e`；`eae/inf_cells.js`、`ae2/recipes/infinity_cell.js` | 已复验（2026-09-28 用户确认无问题） |
| P-050 | 图鉴 icon 找不到 | 引用了 1.21 已无的 `extendedae:infinity_cell` 等 | 改为存在物品，正文补说明 | `2f9253e`、`c76bd63` | 已修 |
| P-051 | 汉化「包内缺键」口径严重高估 | 语言文件按 key 合并，mod 自带 `zh_cn` 兜底 | 有效中文 = 覆盖层 ∪ mod zh | 台账 §8.10；`verify-lang-overlays.mjs` | 已订正 |
| P-052 | 汉化「0 英文」是假象 | 只比键集合、漏 `key.*`，没查值级 | 新扫描：46 ns / 141 键 | `scan-visible-english.mjs` | 已修 |
| P-053 | 值级英文残留 | 旧覆盖层照抄英文，压掉 mod 自带中文 | 分两批修 81 键 | `f8fdaec`、`0f31ca2` | 已修 |
| P-054 | 「不可见缺口」775 / 679 条 | 前缀启发式把 `tag.*` / `commands.*` 全当看不到 | 按代码引用证据全补 679 条 | `00c731a`；`audit-invisible-gaps.mjs` | 已修 |
| P-055 | ali 界面键漏翻 317 条 | 前缀白名单把 `ali.property.*` 整族跳过 | 补齐 317 条 | `59b9237` | 已修 |
| P-056 | tipsmod 汉化全是死键 | 键名过时（`tipsmod.tip.*`） | 补 81 条译、删 80 死键 | `bf43315` | 已修 |
| P-057 | sodium 中文写着 Embeddium | 覆盖层写错 + 含 Embeddium 专有键 | 改回 Sodium、删专有键 | `1a5178f` | 已修 |
| P-058 | brewinandchewin 流体名一直英文 | 覆盖层 19 个 `*_type` 死键 | 删死键、补真键 | `1a5178f` | 已修 |
| P-059 | 覆盖层英文压掉 mod 中文 | 纯格式串/英文照抄 | 恢复或交回 mod `zh_cn` | `eeefbe4` | 已修 |
| P-060 | 旧覆盖层占位符 / 残缺 | `lctech` 84 键残缺、`%1$s` 重复等 | 修 26 处占位符 | 台账 §8.10/§8.11 | 已修 |
| P-061 | 材质包 1.20.1 有 8 个、只搬了 1 个 | 上游自己没搬 | 补 7 个并逐个校验 sha256 | `09f8b64` | 已启用 |
| P-062 | 默认启用材质包不生效 | DefaultOptions 的真正入口不是 `options.txt` | 写 `defaultoptions-common.toml` 的 `defaultResourcePacks` | `c2bb8d0` | 已修 |
| P-063 | 16 条 vintagedelight 厨师帽模型加载失败 | jar 内模型仍写 1.20.1 的 `forge:separate_transforms` | 把包内材质包排到列表最后使覆盖生效 | `f6bc89f`；`config/defaultoptions-common.toml` | 已修 |
| P-064 | simplehats 帽子掉落未按 1.20.1 关掉 | 1.21 该 mod 改用 Java `LootRegistry` | 关 `config/simplehats.json5` 两项 | `f644b0b` | 需重启验证 |
| P-065 | 缺贴图 / 缺模型告警（原记「526 条」） | 口径订正：526 条只数了 `Exception loading blockstate definition` 一类；四类合计 **808 条**（`Unable to load model` 57 / `Missing textures in model` 221 / blockstate missing variant 74 / blockstate Unknown value 456），其中**我们覆盖层造成 473 条（58.5%）**、mod 自身缺 251、1.20.1→1.21.1 结构变化 60 | 已清 461 条（crabbersdelight blockstate 456 + extendedae 36 个 wireless 覆盖模型 + `infinity_cobblestone_cell` 图标路径）；余下 6 类挂账（Farmer's Delight `tray` 72、`createthrusters` 38、`dndecor` 48、`struts`、`displaydelight` 130 只影响粒子、`minecraft:` 9 条上游 parent 漏写），另 1 条待用户决策（`enchanted_golden_arbutus_berries` 引用无 1.21.1 版的 cosmopolitan 贴图） | `c99c8b2`；`_dsh_tmp/p065-missing-models.md` | 部分已修 |

### 3.6 客户端渲染与体验

| 编号 | 现象 | 根因 | 处置 | 相关提交 / 文件 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P-066 | Create 机械 / 飞船不吃光影 | 1.21.1 的 `iris-flywheel-compat` 只保留优化 | 加 Colorwheel、移除 compat | `mods/client/colorwheel.pw.toml`、`iris-flywheel-compat.pw.toml` | 已决策待验证 |
| P-067 | 光影下天空两个太阳 | Northstar `LevelRendererMixin` 与 Iris 的 `MixinLevelRenderer_SunMoonToggle` 抢注入点 | 先决定接受双日，后改为**保留本地补丁** | `scripts/patch-northstar-sun.ps1`、`resourcepacks/no-vanilla-sun.zip` | 用户已拍板 |
| P-068 | 补丁会被 `install-files` 覆盖回原版 | 描述符 hash 校验会写回原版 jar | 跑完需重跑补丁脚本 | 台账 §8.2/§8.38 | 已知 |
| P-069 | Northstar 无法升级到 0.6.3 | Core 2.0.0.6 的 `TelescopeScreenMixin` `@Shadow` 了 0.6.3 已删字段 | 等 Core 适配；issue 草稿未提交 | `docs/UPSTREAM_ISSUE_DRAFTS.md` | 搁置 |
| P-070 | EMI 侧栏 176 条同名「卡片展示器」 | LC 木材变体共用名称键 + 缺创造栏整理层 | 迁 46/61 个 `creative_tab` + 按木种分组 | `14fbb06`；`_dsh_tmp/port-creative-tabs.mjs` | 已修（余 15） |
| P-071 | EMI 折叠组摊成彩虹长条 | `emi_folder.js` 给所有组传 `spread: 4` | 改 `spread: 0` | `2916852`；`kubejs/client_scripts/emi_folder.js` | 已修 |
| P-072 | FTB 大地图空白 | Accelerated Rendering 把 FTB Library `BaseScreen#draw` 包进批处理 | `ftb_feature_status = "DISABLED"` | `config/acceleratedrendering-client.toml` | 已修 |
| P-073 | FPS 显示被小地图压住 / 溢出屏幕 | Sodium Extras 的 ADVANCED 长条对齐算错（CENTER 也不是真居中） | 定 `SIMPLE` + 居右，并随包默认 | `cf47ece`、`d663007` | 已修 |
| P-074 | 连锁破坏提示与小地图重叠 | `overlay_pos = "top_left"` | 改 `"left"` + 随包默认 | `81b3378`；`config/ftbultimine-client.snbt` | 已修 |
| P-075 | 改了客户端配置却不生效 | 运行中的游戏按内存值把文件回写 | 退出游戏再改，或同时写 `local/` 目录 | 台账 §8.34 | 已修 |
| P-076 | 物品提示框文字重叠两份 | ModernUI 增强提示与 Obscure Tooltips 同时渲染 | 关 ModernUI `[tooltip] enable` + 随包默认 | `81b3378`；`config/ModernUI/client.toml` | 已修 |

### 3.7 CI / 发布 / 工具链 / 环境 / 文档事故

| 编号 | 现象 | 根因 | 处置 | 相关提交 / 文件 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P-077 | CI 首次运行失败（第 11 步导出） | `export-curseforge` 需要 `CURSEFORGE_API_KEY`，且与其余导出挤在同一步 | 拆成独立条件步骤 | `699f315` | 已修 |
| P-078 | 不发布到第三方平台 | 用户 2026-09-24 要求 | CI 只出三份包（CF 步骤后来整体移除） | 台账 §8.35、`8b17b86` | 已落实 |
| P-079 | Release 不再留草稿等人工发布 | 改用上游 `release.yml`（推 tag 即自动公开） | 固定 `--prerelease` + 标题「测试版」 | `df2fc5e` | 已落实 |
| P-080 | `v0.1.0` 的徽标仍显示 Latest | 发布时未勾选预发布 | 网页 Edit 勾 "Set as a pre-release" | 台账 §8.39 | 已修（2026-09-28 用户自行改掉） |
| P-081 | 版本号三段式 vs 上游四段式 | `devtool set-version` 只接受四段式 | 对齐四段式 `v2.0.0.0-test5` | `df2fc5e`；`pack/pack.toml` | 已决定 |
| P-082 | 完整性清单路径被误改 | `0d70170` 命名空间全局替换误伤文件名 | 改回 5+1+2 处并 `git mv` 重命名 | `df2fc5e` | 已修 |
| P-083 | 两份中文文档被写成乱码 | PowerShell `Get-Content \| -replace \| Set-Content` 破坏编码 | 取上游干净版本覆盖 + 记教训 | `b1defb5`；`docs/DevGuide.md`、`docs/PACKWIZ_WORKFLOW.md` | 已修 |
| P-084 | 三个提交静默失败 | PowerShell 变量名大小写不敏感，`$B` 覆盖了 `$b` | 教训：批量 git 别用单字母变量 | 台账 §8.10 | 教训 |
| P-085 | `git commit` 报 pathspec 不匹配 | 提交信息里的英文双引号被当成路径 | 提交信息引号一律用「」 | 台账 §8.10 | 教训 |
| P-086 | `life_matter.json` 删不掉 | 原判「句柄占用」，实为 DSH 沙箱写/删策略 | 放宽权限后一次成功 | `8f6c9d3` | 已订正 |
| P-087 | bkmpw 不认 `mode = "metadata:modrinth"` | 工具链限制（`install-files` 报 missing source file） | 改成 URL 描述符（代价：无自动更新） | `mods/client/colorwheel.pw.toml` | 工具链限制 |
| P-088 | 直连 CurseForge 下载端点一律 403 | Cloudflare 挡网页下载端点 | 走 `mediafilez` CDN 直链 / `bkmpw download-files` | 台账 §8.25/§8.26 | 已绕 |
| P-089 | 本机 shell 查 Modrinth / GitHub API 得 000 | shell 侧出网被拦 | 走 harness 抓取通道；`gh` CLI 本机未安装 | 台账 §7.4 | 工具链限制 |
| P-090 | `add-url` 的 `+` 被转义 / 空 name 静默失败 | cmd 转义 + bkmpw 行为 | 加完必须检查描述符 `url =` 与文件是否生成 | 台账 §8.26 | 教训 |
| P-091 | `config/c2me.toml` 注释被改写 | C2ME 每次启动按 CPU 核数重写默认值注释 | 属机器相关，撤销不提交 | 台账 §8.3 | 已注意 |
| P-092 | HMCL + JDK 懒人包产物 | 上游做法，体积约 1.2 GB 起 | 用户决定不做 | 台账 §8.36 | 已决定不做 |
| P-093 | 合并上游后配方又坏 | 上游把为绕过 mod 硬限制写的守卫/注释删掉了 | 合并后逐条审「被删掉的守卫/注释」 | 台账 §7.5 | 教训 |
| P-094 | 兼容层 × 宿主升级硬崩 | fork 独有兼容层的 mixin 打到宿主内部结构 | 按「是否含 mixin 且目标为宿主类」逐个核实 | 台账 §7.4；`docs/CREATE_AERONAUTICS.md` | 已核实 |
| P-095 | 合并时 9 类文件冲突 | 双方改动方向不同 | 逐条取上游 / 取我方 / 取并集 | 台账 §7.7 | 已处置 |
| P-096 | CI 跑通 | 修完上述问题后两个 job 全绿（2 分 24 秒） | tag `v0.1.0` 已发布（5 个资产） | `31d0a9a`、`8b17b86` | 已跑通 |
| P-097 | `check` 报缺 `index.toml` | 跳过 `prepare-pack`/`refresh` 直接 check | 先展开再检查 | — | 已注意 |
| P-098 | Windows 上 `devtool.sh` 不可用 | 该脚本面向 POSIX | Windows 用 `devtool.bat` | — | 约定 |
| P-099 | `Install-PCL.ps1` 必然失败 | 它要求 `Create-Delight-Project-Rebirth.json`，而仓库与 origin/main 都没有 | **未修复**；本地靠自写 `CDPR.json` 绕过 | `docs/GettingStarted-PCL.md` | 未修 |
| P-100 | `test_server/` 目录不存在 | 目录从未建立 | DevGuide 里那套 `/reload` 验证跑不通 | `docs/DevGuide.md` | 未修 |
| P-101 | `iris-flywheel-compat` 与 Colorwheel 硬冲突 | 两者都改 Create 渲染路径 | 移除 compat（本 fork 有意偏离上游，合并时保留删除） | `mods/client/` | 已修 |
| P-102 | Euphoria Patcher 版本必须与光影包对齐 | 版本号耦合 | 记配对规则（与 `ComplementaryUnbound_r5.9.3.zip` 成对） | `f833a26` | 已注意 |
| P-103 | Windows 检出把文件变成 CRLF | 跨平台换行不一致 | `.gitattributes` 改 `* text=auto eol=lf` + `core.autocrlf false`，165 个文件物理转 LF | — | 已修（2 个运行期文件残留，不对抗） |
| P-104 | 启动 OOM（Java heap） | HMCL `autoMemory` 开着导致 Xmx 飘（2.4g~6.5g），且重叠启动 | 关自动分配、固定 8G、别重叠启动 | — | 已注意 |
| P-105 | Java 侧下载依赖需要代理 | 直连 `maven.neoforged.net` 不通（installer 吞异常会装出缺库坏环境） | Java 侧走本机 SOCKS5 代理；git 用 `-c http.sslBackend=openssl -c http.proxy=…`（具体端口见 `AGENTS.local.md`，不写进入库文档） | — | 环境要求 |
| P-106 | DSH 沙箱下 `git commit`/`push`/`devtool install-files` 失败 | 信号管道、凭据、PATH 等被沙箱限制 | 需放宽权限或到真实终端执行 | — | 环境限制 |
| P-107 | PowerShell `>` 重定向写出 UTF-16 | bkmpw 报 `stream did not contain valid UTF-8` | 用显式 UTF-8 写文件 | — | 教训 |
| P-108 | `git hash-object` 与内容 sha1 不一致 | 它给的是 blob 哈希 | 校验文件哈希用 `Get-FileHash -Algorithm SHA1` | — | 教训 |
| P-109 | 游戏内 MCP 悬浮按钮 → JVM 段错误；`enter_control_mode` 抢鼠标 | 无 glfw 补丁 | 不点按钮、只走 HTTP API；默认只观察，用户点名才进控制模式 | `hs_err_pid*.log` | 已定性 |
| P-110 | **越过只读边界**：曾在 CDR1201 建分支并推了一个提交 | 未遵守「源包只读」约定 | 全部撤销：切回 `main`（`1b1b8b7e`）、删本地与远端分支、工作区 0 改动、技能文件恢复 `fe3ed77a` 原样 | `09e85f91`（已删除） | 已撤销 |
| P-128 | 任务书 80 个 snbt 一直显示为「已修改」 | 游戏运行期回写序列化 | 已决定采纳提交 | `a17626f`、`3143d9d` | 已处置 |

### 3.8 迁移缺口本体（脚本层对账）

| 编号 | 现象 | 根因 | 处置 | 相关提交 / 文件 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P-111 | mbd2 子系统无法直接迁 | CDC 2.0 删了约 50 台机器与订单 Java API | 用户定方向「用 MBD2 原生 API 重写」，暂缓未开工 | 台账 §2.3；`server_scripts/mbd2/`、`mbd2_recipes/`、`Custom/order/` | 搁置 |
| P-112 | Ponder 展示层 24 个未迁 | 判断为非架构换代（CDC jar 内 ponder 条目 0） | 整批迁入 24 文件 2006 行 | `8d18301`；`client_scripts/ponder/**` | 完成 |
| P-113 | northstar 5 个脚本未迁 | 4 个 server + 1 个 client stub | 更正为「不照搬」，待游玩确认 Core 是否已覆盖 | 台账 §6.2/§8.38 | 搁置 |
| P-114 | Improved Mobs / Curios 被判「未迁」 | 原判有误 | Improved Mobs 早已迁（`1cae462`）；Curios 孤立 helper 放弃 | 台账 §6.1 | 已订正 |
| P-115 | Lets Do / The End 被判「未迁」 | 原判有误 | 已并入 `vinery` / `ends_delight` | 台账 §2.2/§6.4 | 已订正 |
| P-116 | Debug / yungs / FTB Quest 脚本 | 依赖已删工具 / 全注释 / 空函数死代码 | 放弃不迁 | 台账 §2.2 | 放弃 |
| P-117 | `00_java_classes.js` | 已由 CDC 2.0 的 Java 架构替代 | 不迁 | 台账 §2.2 | 已决定 |
| P-118 | client 侧 16 个非 ponder 脚本 | 未逐个判定 | **判定完成：应迁 0 / 已由 mod（Java）接管 11 / 放弃 5**。原判「应迁 1」的 `render/render_difficulty_gui.js` 作废：1.21.1 的难度显示由 **Improved Mobs 自带 overlay** 提供（自制 HUD 版曾提交 `8f3f7af`，用户实测发现重复后 `b3443b8` 撤销）。顺带发现 `bettercombat/network.js` 已是死代码 | `_dsh_tmp/p118-client-scripts.md`；`8f3f7af`→`b3443b8` | 已完成 |
| P-119 | `ponderjs_generated` 汉化目录 | key 需 `createdelight`→`createdelightcore` | 澄清：由 ponderjs 重新生成，不用搬 | 台账 §8.4 | 已澄清 |
| P-120 | FTB 任务书「孤儿键」 | 实为误判：那 4 个键是占位章节 `7D9978A1C3951396` / 任务 `0EEB8FE71772B757` 的正式文案；真问题是 `fallback_locale=en_us` 而 `en_us.snbt` 缺这 4 键 → 非中文语言显示原始键名 | 补进 `en_us.snbt`（3819→3823 键，括号配平） | `9611bb0`；`config/ftbquests/quests/lang/en_us.snbt` | 已订正 |
| P-121 | `en_us` 缺 49 个 tip 键 | 反向缺口（tipsmod 的 51 个 tip 文件引用 49 个去重键，只有 `zh_cn` 有文本） | 已在 P-169 一并补齐（专有名词逐个按各 mod 自身 `en_us` 对齐） | `d39d925`；`kubejs/assets/createdelightcore/` | 已修 |
| P-122 | 364 个 jar 里 160 个无可用 `zh_cn` | 上游未做中文，部分包内也未覆盖 | 低优先级记录 | 台账 §8.9 | 记录 |
| P-123 | 472 个旧路径迁移文件内容未验证 | 是否对上 1.21.1 物品 id 未知 | 待进游戏看日志 | 台账 §8.7A | 未验证 |
| P-124 | B 组 18 个新 mod 未做游戏内验证 | 新 mod 注册物品需重启 | 重启后看日志 | `c4bda0e` | 未验证 |
| P-125 | 客户端渲染链风险 | Sodium / Iris / ImmediatelyFast / AR(alpha) / ModernUI / ZSTDNET 并存 | 重启时重点看 mixin / 类冲突 | 台账 §8.26 | 风险 |
| P-126 | Voxy 未加 | 本体 fabric 独占且无 1.21.1；判据漏查翻译层 | 记录 `Roxy` 路线，待用户选 A/B/C/D | 台账 §8.28 | 待用户定 |
| P-127 | `certain_questing_additions`「开书即崩」为误判 | 唯一禁忌是 `text_on_image: true`；FATAL 实为 ProbeJS dump 噪音 | 恢复启用 | — | 已订正 |

### 3.9 其它已记录问题（统计口径 / API / worldgen / 任务书 / 清单）

| 编号 | 现象 | 根因 | 处置 | 相关提交 / 文件 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P-129 | 统计显示「createdelight 出现在 281 个文件」 | 子串假象：`createdelightcore` 本身含 `createdelight` | 逐处判定，真实漏改只有 1 处 | 台账 §一 | 已订正 |
| P-130 | 前缀法报「12 个命名空间 / 110 处断链」 | 配方 id ≠ mod id、mod id ≠ 文件名、ns ≠ mod id | 实机日志核对：真断链 8 ns / 约 59 处 | `logs/latest.log`（09-16） | 已订正 |
| P-131 | `tags.js` 引用旧命名空间 | 1.20.1 原文件用旧 ns，迁移时漏改 | 改为 `createdelightcore:enchanted_golden_carrot` | `server_scripts/mods/cosmopolitan/tags.js:21` | 已修 |
| P-132 | 3 个 dragon 配方的空 `ingredients` 被判为缺陷 | 实为官方合法格式（jar 内置 5 条同款配方） | 撤销判断，不改 | `createmetallurgy/entity_melting/{fire,ice,lightning}_dragon.json` | 已订正 |
| P-133 | 未安装清单漏记 5 条 | 文件名近似匹配误判（`cmr`/`create_bs`/`create_sa`） | 实为 2 条，补第 351/352 条，另 4 条状态回写 | `docs/未安装mod清单.md`、`00a6873` | 已闭环 |
| P-134 | `require_list_clean.md` 来源悬空 | 它引用的来源报告已删除 | 改为自述独立维护，`.gitignore` 重写 | `docs/require_list_clean.md` | 无需修 |
| P-135 | `vacuum_harvester` 配方item不存在 | 1.2.6 只有方块、无物品注册类 | 删除该配方 | `create_integrated_farming/recipe.js`、`487d7ce` | 已修 |
| P-136 | `.withChance()` 不支持、tag 变成流体 tag | KubeJS 6→7 API 变化 | 改 `CreateItem.of(item, chance)` + 直接物品 | `create_mob_spawners/recipes.js`、`7a16d80` | 已修 |
| P-137 | `cooling_mixing`/`compacting` builder 不存在 | fluidlogistics 1.3.0 无 KubeJS 插件 | 改 `event.custom` 原生 JSON；修 Rhino 简写 | `fluidlogistics/blaze_cooler.js`、`9d7d287` | 已修 |
| P-138 | `frost_cake` 流体不存在 | 死链 | 删死链，保留 mod 原生配方 | `fluidlogistics/recipe.js` | 已修 |
| P-139 | gateways NBT 格式失效 | `Item.of(id, nbtString)` 在 KubeJS 7 变了 | 改组件语法 `Item.of(id, 1, {...})` | `gateways/gate_pearl.js` | 已修 |
| P-140 | CDC 2.0 删了 `life_matter` 与 `genetic_culture` | 上游 Core 移除内容 | startup 补回 + 标签 + 纹理 | `content_restore.js` | 已修 |
| P-141 | gateway 定义需三重迁移 | 枚举改名、ItemStack 键 `item`→`id` | 232 处键改名 + 清理 3 个缺失主题 | gateway 定义文件 | 已修 |
| P-142 | `placed_feature` 的 IntProvider 嵌套 `value` | 1.21.1 改为扁平格式 | 修 4 个 northstar worldgen 文件 | `kubejs/data/**/northstar/` | 已修 |
| P-143 | 卡在「生成世界」（registry unbound） | biome 引用了缺失 mod 的实体/feature | 删 8 条 cataclysm `spawn_cost` + 2 个 feature | `abyssal_chasm.json`、`primordial_caves.json` | 已修 |
| P-144 | `alexscavesup` 自定义 worldgen 类型断链 | 社区移植版删了原版功能（`ac_simplex` 等） | 搬之前先核对 jar 里是否真有该类型 | `alexscavesup` jar | 判据 |
| P-145 | **tetra 加载死循环卡住世界生成** | 1067 个旧 data 引用了不存在的 improvement | 删 1067 条，保留 37 条 | `kubejs/data/tetra/` | 已修 |
| P-146 | 空白加载页 | Drippy 背景指向占位图 `some_image.png` | 移除 Drippy 两个模块（后随 P-002 装回） | `drippyloadingscreen` | 已修 |
| P-147 | 主菜单背景全红 | FancyMenu 的 color 是 `#RRGGBBAA`，不是 `AARRGGBB` | 应改 `#14141EFF` | `config/fancymenu/` | 未做（等用户） |
| P-148 | 主菜单按钮重叠 / panorama 黑紫块 | 正值 y 语义不同；panorama 缺纹理 | `anchor_point=vanilla` 回原版竖排 | `title_screen_layout.txt` | 已修 |
| P-149 | FancyMenu 布局改完不生效 | 布局只在游戏启动时加载 | 必须重启游戏进程 | `config/fancymenu/` | 判据 |
| P-150 | 标题图过大、缺中文 hoverlabel | 固定 500×86（原图 2026×348）；v3 字段名未确认 | 改按屏幕宽比例缩放 | `config/fancymenu/assets/title.png` | 未做（等用户） |
| P-151 | 任务书的 advancement 任务永远无法完成 | 只改了命名空间没改路径前缀（28 处） | 改为 `alexsmobsup:alexsmobsup/*` | `docs/FTBQUESTS_MIGRATION.md` §八/§十 | 已修 |
| P-152 | 重跑任务书迁移脚本结果差 1 个文件 | `itemfilters` 图标必须在 `missing_item` 之前替换 | 把顺序写进文档；SHA256 80 文件一致 | `migrate-ftbquests.mjs` | 已修 |
| P-153 | 完整性清单报 `Extra mods: drippyloadingscreen` | 装回 Drippy 后没重生成清单 | 跑 `devtool generate-integrity-manifest` | 清单 `generatedAt=2026-09-28T07:31:31Z`，`client=86` 已含 `drippyloadingscreen` | 已修（自愈） |
| P-154 | 完整性清单把本地 MCP 桥接报成 Extra mods | `mcpmod` 是本地调试用模组（随包不分发） | 写进 `kubejs/config/createdelight_pack_integrity.json` 的 `allowedExtraModIds`，客户端自检归入「Allowed extra mods」且不再弹警告屏 | `5d190d8` | 已修 |
| P-155 | ProbeJS 只导出精简 dump | 411 个模组触发性能保护 | `/probejs config complete_dump` 后再 dump | `config/probe-settings.json` | 限制 |
| P-159 | 误以为「裸版本号 versionRange（如 `4.7.5.1`）是精确匹配」，据此判定新模组装不了 | NeoForge 把裸版本号当「推荐版本」，是宽松语义（不含限制区间） | 实证：本仓 24 处同形声明都能正常启动（`dg_js` 要 kubejs build.321、实装 build.363；`createtransmission` 要 create 6.0.6、实装 6.0.10） | `_dsh_tmp/bare-versionrange-evidence.mjs`；`mods/common/irons-lib.pw.toml` | 判据 |
| P-160 | 按 1.20.1 的做法改任务书章节文件里的文案，游戏里不会变 | 1.21.1 的 FTB Quests 文本存在 `config/ftbquests/quests/lang/en_us.snbt`（`quest.<id>.quest_desc` / `.title` / `.quest_subtitle`），章节 `.snbt` 没有文本字段 | 文案改 lang 文件；章节文件只改结构（tasks / dependencies / 坐标 / 图标） | `config/ftbquests/quests/lang/en_us.snbt`、`chapters/Junior_Engineer.snbt` | 判据 |
| P-161 | 源包 `create-integrated-farming` 曾被 pin 在 1.2.6（理由：新版要 Supplementaries 3.9.9 → NeoForge 247） | 1.4.3 里 `supplementaries` 已改成 **optional** dep，不再有硬约束 | 升级到 1.4.3（本仓 1.21.1 有该版本），`pin` 保留 | `mods/common/create-integrated-farming.pw.toml`、`f19b339` | 已解决 |
| P-162 | 启动即崩：`ClassNotFoundException: de.keksuccino.drippyloadingscreen.neoforge.CustomLoadingOverlay`（Drippy 早窗） | **Drippy 自身缺陷**：`DrippyEarlyWindowProvider.updateModuleReads(ModuleLayer)` 完全忽略传入的 layer，改用 `Thread.currentThread().getContextClassLoader()` 加载自己主 jar 里的类（反汇编证据见 §5.4）；与 `Integrated Farming 1.4.3` 在位强相关 **3/3**，1.2.6 时 **2/2** 正常 | 先试过把 `earlyWindowProvider` 改回 `vanilla`，但那样 **CustomSkinLoader 会崩**（见 P-164 的姊妹问题，`NoClassDefFoundError: customskinloader/fake/itf/IFakeIResourceManager$V1`）→ **已回退为 `drippy_early_window`，并把 Integrated Farming 钉在 1.2.6** | `97013d0`（改 vanilla）→ `e848913`（回退）；`config/fml.toml`、`mods/common/create-integrated-farming.pw.toml` | 已绕开（两条约束见 §5.4） |
| P-163 | 进到标题界面阶段崩：`screenshot_viewer` 报 `Cannot get config value before config is loaded`，日志前面是成片的 `Cowardly refusing to send event … to a broken mod state` | **真凶不是截图 mod**：`createdelightcore:forged_steel_ingot` 被注册两次 —— Core **2.0.0.7** 自己注册了它（jar 内有 model/texture/lang），而 P-021 时代 Core 2.0.0.6 缺它、我们用 `kubejs/startup_scripts/mods/createdelightcore/content_restore.js` 补回 → `Adding duplicate key … to registry` → 注册表 `Rolling back to VANILLA` → broken mod state | 删除该补回脚本（`life_matter` / `genetic_culture` 的补回保留，核对 Core 2.0.0.7 jar 后确认仍缺这两项） | `dc21f9c` | 已修 |
| P-164 | 同上「broken mod state → screenshot_viewer 报错」的第二次出现（14:58） | **另一个真凶**：`apokinetics` 1.0.6 的 `apokinetics.mixins.json:GemCaseTileMixin` 注入 `dev.shadowsoffire.apotheosis.socket.gem.storage.GemCaseTile` 时 `InvalidInjectionException: Invalid descriptor`（宿主方法少了 `Container` 参数，见 P-166）→ `Failed to wait for future Mod Construction` → broken mod state。版本范围 `apotheosis [8.5.3,)` 满足但内部 API 已变 | **移除 Apokinetics**（描述符与 jar 都移出；Apotheosis 保留 8.9.0）。**逐个版本反编译确认**：8.6.0 / 8.6.1 / 8.7.0 / **8.8.0** 都还带 `Container`，8.9.0 起没了 → 想保留这个桥接应把 Apotheosis 钉 **8.8.0**（不是 8.7.0） | `06a82c3`、`66729b8`（更正） | 已修（移除，暂缓等上游） |
| P-165 | 摘掉 Drippy 后启动仍崩：`NoClassDefFoundError: customskinloader/fake/itf/IFakeIResourceManager$V1`（CSL patch `ResourceManager` 时） | **不是 Drippy 的锅**：`config/fml.toml` 里 `earlyWindowProvider` 只能是 `drippy_early_window`——全包扫过只有 `drippyloadingscreen-earlywindow` 提供 `ImmediateWindowProvider`（Sodium 只提供 bootstrapper），改成任何其它值（包括 `vanilla`）都会 `Failed to find ImmediateWindowProvider …, disabling`（早窗被整个禁用）→ **CSL 15.x 的 fake-interface patch 依赖早窗阶段建立的模块读取，缺了就崩**。（历史对照：CSL 14.28 时代早窗同样被禁用也不崩，fake-interface 是 15.x 才有的。） | 恢复 `drippy_early_window` + 把 Drippy 两个 jar 放回；**结论：Drippy 是本包的承重墙，不能摘**，「摘 Drippy 换 vanilla 早窗」这条绕行路封死 | `a89c29a`、`d7de143`；`config/fml.toml` | 已修（回退） |
| P-166 | Apokinetics 的注入签名判定 | `GemCaseTile#upgradeGem` 在 Apotheosis 8.9.0 由 `(DynamicHolder, Purity, Container)` 改为 `(DynamicHolder, Purity)` | 记录为「宿主内部签名变更导致 mixin 附属失效」的又一实例（同 P-001 / P-003 / P-094） | `66729b8`；`_dsh_tmp/apo-versions/` | 已记录 |
| P-167 | **选创造模式进世界即断线**：客户端 `ModLoadingException: Architectury … BuildCreativeModeTabContentsEvent: IllegalArgumentException: Itemstack 1 ftbquests:lootcrate already exists in the tab's list` | `config/ftbquests/quests/reward_tables/` 里三张表（order_index 21/22/23）都带 `loot_crate` 且 `string_id` 全是 `"_"`；`LootCrate.createStack()` 生成的是「同物品 + 同 `ftbquests:loot_crate` 组件」的相同 ItemStack，`ftb-quests` 经 architectury 插第二个箱子时触发 NeoForge 的重复断言。**触发条件**：只有创造权限变化时才会 `tryRebuildTabContents`（ProbeJS 在世界加入时调用），所以生存进服不炸——这解释了为什么 09-24 之前一直没暴露；`javap` 逐版核对证明 2101.1.24 与 2101.1.36 代码相同，**回退版本治不了**；CF 上 1.21.1 最新就是 2101.1.36 | 给三张表各自的 `string_id` 改成唯一值（`gate_pearl_crate_21/22/23`），内容与颜色不变 | `67901bb`；`config/ftbquests/quests/reward_tables/{3c245c81c249772b,2538494fc6e89c28,28fed68b293aac2f}.snbt` | 已修（用户实机确认可正常进游戏） |
| P-168 | **CI `cache-seed` 作业每次 push 都失败**（exit 2、约 24 秒），表现为「老卡在 cache-seed」 | 描述符 `mods/common/irons-spellbooks.pw.toml` 记录的 sha1 是 CurseForge 早先那次上传的字节，而 CF **重传过同一个 file-id**（8680204）：现 CDN 稳定返回 `017fd814…`。`bkmpw install-files-headless` 校验 hash → 重试 3/3 仍失败 → `error: install completed with errors` → 作业失败会**跳过 `actions/cache` 的 post-save**，缓存不再更新，于是每次 push 重复同一失败。两份 jar 内容其实一致：4466 个条目 CRC32 全同、未压缩大小全同，仅 `META-INF/MANIFEST.MF` 的压缩长度差 1 字节、时间戳晚 2 分钟 | 描述符 hash 更新为 `017fd814…`（file-id/project-id 不变）；本机 jar 同步换成 CDN 现字节；**新增 `devtool.bat check-hashes [--full] [--changed [ref]] [--only <片段>]` 做 push 前预检**（CF 描述符按 `edge` → `mediafilez` 两个 CDN 域名用 HEAD 探测，深验时下载校验 hash） | `4cf996e`；`mods/common/irons-spellbooks.pw.toml`、`scripts/devtool.mjs`、`docs/PACKWIZ_WORKFLOW.md` | 已修（CI run `36405937541` 起成功） |
| P-169 | 中文/英文界面出现原始键名或英文：EMI 的 `effect.irons_spellbooks.volt_strike`、5 个召唤计时状态的图标是品红黑格、Apothic Enchanting Table 等条目全英文、加载界面 tip 显示 `createdelightcore.tip.*` | **全部是上游缺键/缺图，不是本包汉化遗漏**：① irons_spellbooks 1.21.1-3.16.3 自带 en_us/zh_cn 都缺 6 个 `effect.*` 键、`textures/mob_effect/` 只有 31 张图（5 个计时状态没图）② Apotheosis 三件套自带 zh_cn 只是部分翻译（apothic_enchanting 缺 10、apotheosis 缺 24、apothic_attributes 缺 2）③ irons_lib 干脆没有 zh_cn（72 键）④ tipsmod 的 51 个 tip 文件引用 49 个去重键，只有 zh_cn 有文本 | 按本包 `kubejs/assets` 覆盖写法补齐：状态名 6 键 + 复用模组自带法术图标补 5 张 mob_effect 图；Apotheosis 三件套 36 键；Iron's Lib 72 键（另含 `irons_patreon_lib` 2 键）；`createdelightcore` en_us 49 个 tip 键（专有名词逐个按各 mod 自身 en_us 对齐） | `9b23638`、`a0ada68`、`17715ba`、`116d5bc`、`d39d925`；`kubejs/assets/{irons_spellbooks,apotheosis,apothic_enchanting,apothic_attributes,irons_lib,createdelightcore}/` | 已修 |
| P-170 | 每次启动都有两条 KubeJS Startup 报错：`Itemstack 1 create_connected:fan_freezing_catalyst / create:chocolate_bucket already exists in the tab's list` | 1.20.1→1.21.1 迁移遗留：1.21.1 的 create 与 create_connected 已自带这些物品进创造标签页，脚本按 1.20.1 行为再 add 一次 → NeoForge 重复断言（KubeJS 只记日志、不致命，但会盖住后续脚本错误） | 两个 `creative_tab/*.js` 改成只留来源与原因注释，不再重复添加 | `23e106b`；`kubejs/startup_scripts/creative_tab/{create,create_connected}.js` | 已修 |
| P-171 | 主菜单 LOGO 溢出被窗口裁掉；改自适应后又整体「歪到右侧」 | ① LOGO 元素用的是**固定 GUI 单位**尺寸（500×86，而窗口 GUI 宽只有约 420）→ 必然溢出；② FancyMenu 的 `auto_sizing` 只缩放宽高、**不缩放 x/y**，且 `anchor_point = top-centered` 在 `sticky_anchor = false` 时走基类分支 `left = originX + offset`（top-centered 的 `originX` = 屏幕宽/2）→ 元素**左边缘**落在屏幕中线、LOGO 甩到右半屏 | 照 `<参考仓库>` 的 `create.txt` 换成 `auto_sizing = true` + `auto_sizing_base_screen_width/height/gui_scale = 2560/1372/4.0` + `auto_sizing_base_gui_width/height = 640/343`，并补上关键的 `sticky_anchor = true`（`AnchorTopCenter` 才会走 `屏幕宽/2 - 绝对宽/2 + x` 的真居中分支）；LOGO 定 437×75（图 2026×348 按比例） | `82adf6c`、`d9b72b2`、`f61bce5`；`config/fancymenu/customization/title_screen_layout.txt` | 已修（用户实测居中） |
| P-172 | 标题后面那行黄字位置怎么调都不对：先被 LOGO 盖住，后来跑到屏幕右缘被裁 | ① 那行黄字是**原版** splash（`assets/minecraft/texts/splashes.txt` 每次随机抽一句），在本菜单 `render_custom_elements_behind_vanilla = false` 下属于**原版层**，与自定义 LOGO 一重叠就必然被压住（截图里只剩 `you` 露在 DELIGHT 上边缘）；② 原版 splash widget 的枢轴 = 原版默认位 `(屏宽/2 + 123, 69)` 再加元素偏移，且偏移的缩放并非 1:1；③ 换成自定义 `splash_text` 元素后才查清：`auto_sizing` 元素的 x/y 单位是**当前屏幕 GUI 像素**（`AbstractElement.getPositioningScreenWidth()` 直接返回 `Screen.width`），`sticky_anchor + top-centered` 时**枢轴 = (Screen.width/2 + x, y)**（`SplashTextElement#renderSplash` 平移到 `absX + absW/2, absY`，文字从 `(-font.width/2, 0)` 起画再绕枢轴转 `rotation` 度） | 把 `minecraft_splash_widget` 元素设 `is_hidden = true`（原版黄字不再渲染），新增 `element_type = splash_text` 元素：`source_mode = vanilla`（**仍抽原版随机宣传语，内容不变**）、`rotation = -20`、`base_color = #FFFF00`、`shadow`/`bouncing` 开、与 LOGO 同一套 auto_sizing 参数；最终 `x = 120, y = 56` → 枢轴 (327, 56) 正好在 LOGO 右下角，抬上去的那段已在 LOGO 右边之外，既不被遮也不被裁 | `9b2e946`、`9ac375f`、`1200b28`、`53fa684`；`config/fancymenu/customization/title_screen_layout.txt` | 已修（用户确认） |
| P-173 | Realms 那一行右侧两个方块按钮叠在一起 | 两个按钮分属两个 mod：**IAS 的标题按钮**（可配）与 **Supplementaries 的配置按钮**（`net.mehvahdjukaar.supplementaries.client.screens.ConfigButton`，位置写死、不可配），摆在同行同侧必然重叠。另踩坑：IAS 的占位符是**单百分号** `%width%`（照抄 lang tooltip 里的 `%%width%%` 会让 `Expression.parsePosition` 解析失败 → 返回 null → 回退内置默认 `width/2 + 104`，改动看起来「没生效」） | 改 `config/ias.json`（本机运行期配置、**不入库**）：`titleButtonX = "%width% / 2 - 124"`、`titleButtonY = "%height% / 4 + 48 + 48"` → 把 IAS 挪到 Realms 行**左侧**，与右侧的 Supplementaries 按钮分开 | `config/ias.json`（本机） | 已修 |

### 3.10 源包侧新问题（来自 CDR1201 的 49 个新提交，作为同步参考）

| 编号 | 现象 | 根因 | 处置 | 相关提交 / 文件 | 状态 |
| --- | --- | --- | --- | --- | --- |
| P-156 | 源包侧：食物属性被覆盖 | KubeJS build.24 回归 | 回退到 build.16（1.20.1 线） | `77700637`；`mods/kubejs.pw.toml` | 源包已修；本仓 2101 线需留意同类回归 |
| P-157 | 源包侧：更新器（Java/Go）存在安全漏洞 | `cdr-updater` 鉴权/文件保存流程缺陷 | 修复并复测；另把 PCL2 包改为「列 CF mod 而不打包 jar」 | `cc1a4622`、`a5abd893`；`.agents/skills/release/cdr-updater-go/` | 源包已修；本仓更新链路（Core + `release-info.json`）待评估 |
| P-158 | 源包侧：`data/**/*.json` 配方维护成本高 | 配方散落在 JSON 里不易复用 | **配方 JSON → KJS 脚本**（341 文件 / −6226 行） | `8844be3a`；`kubejs/server_scripts/**/recipe*.js` | 源包进行中；影响本仓后续配方同步的来源 |

## 4. 遗留与决定

### 4.1 仍未解决 / 待验证 / 待用户决定

| 条目 | 说明 | 出处 |
| --- | --- | --- |
| mbd2 子系统重写（server 25 + ponder 5） | 方向已定「用 MBD2 原生 API 重写」，尚未开工 | P-111 |
| `mechanic_grinding_wheel`、`single_machines.js` 机器配方 | 用户：等游玩之后再说 | P-023、P-024 |
| Northstar 双日补丁的再应用 | 用户已定保留补丁；`devtool install-files`/`check` 与上游合并后需重跑脚本 | P-068 |
| Northstar 升级 0.6.3 | 被 Core 的 `TelescopeScreenMixin` 挡住，等 Core 适配；issue 草稿未提交 | P-069 |
| Voxy / Roxy 方案 | 待用户选 A（Roxy+voxy）/ B（+Voxy Server Side）/ C（+Voxy WorldGen v2）/ D 先不动 | P-126 |
| Cull Less Leaves 的 NeoForge 替代 | 已核实 3 个候选有 1.21.1 文件，未加 | P-015 |
| 旧数据包路径迁移后的内容 | 472 个文件尚未进游戏验证 | P-123 |
| `rolled_polymer_sheet` 2 条配方 | 源包与 Core 都无该 id，等上游修 | P-022 |
| ~~client 侧 16 个非 ponder 脚本的判定~~ ✅ | 2026-09-29 判定完成：应迁 0 / 已由 mod（Java）接管 11 / 放弃 5；难度 HUD 不迁（Improved Mobs 自带 overlay） | P-118 |
| `Install-PCL.ps1` 与 `test_server/` | PCL 部署脚本必然失败、服务端 reload 验证跑不通，均未修 | P-099、P-100 |
| A/B 组新 mod、simplehats 关掉落 | 需要重启进游戏复验 | P-064、P-124 |
| 缺贴图/模型挂账 + 1 条待决策 | 口径订正为 808 条，已清 461 条；余下 6 类属上游资源残缺或只影响粒子（不必修）。**唯一确认的「迁移漏迁」**：`createdelightcore:enchanted_golden_arbutus_berries` 的模型引用无 1.21.1 版的 `cosmopolitan:item/golden_arbutus_berries` → 三条路（自绘 16×16 贴图 / 报上游改 Core 模型 / 不动）**待用户选** | P-065 |
| 160 个 jar 无中文 | 低优先级，未处理（`zh_cn` 那 4 个「孤儿键」已订正为占位章节文案、`en_us` 的 49 个 tip 键已补） | P-120、P-121、P-122 |
| ~~`scripts/` 下 18 个迁移期一次性脚本仍硬编码本机绝对路径~~ ✅ | 2026-09-29 已完成（`d07c504`）：新增 `scripts/paths.mjs` 统一解析，路径从 `import.meta.url` 推导，参考仓库/实例目录走 `CDPR_REF_REPO` / `CDPR_MC_HOME`；19 个文件 `node --check` 通过、`git grep` 复查无本机路径残留 | P-106 相关，见 §4.2 |
| forge:* 标签中无 `c:` 对应的 | 已 REMAP 10 条，其余逐个决定删或落到自有命名空间 | P-029 |

### 4.2 已拍板的决定

| 决定 | 时间 / 出处 |
| --- | --- |
| mbd2 用 MBD2 原生 API 重写（暂缓启动） | 台账 §2.3 / §四 |
| 光影继续用 Complementary Unbound r5.9.3 + 补回 Colorwheel，移除 `iris-flywheel-compat` | 台账 §八 |
| 加 Euphoria Patcher，与 Complementary 版本成对锁定 | 台账 §8.1 |
| Northstar 双日：先「接受双日」，2026-09-24 改为「**保留本地补丁**」 | P-067 |
| simplehats 帽子掉落按 1.20.1 关掉 | 台账 §8.16 |
| **只发 GitHub Release**，不发 CurseForge / Modrinth；不做 ClientPatch/ServerPatch 增量包 | 台账 §8.35、P-078 |
| 不做 HMCL + JDK 懒人包产物 | 台账 §8.36、P-092 |
| Release **一律「测试版 / 预发布」**，不写正式版 | 台账 §8.39、P-079 |
| 改用上游那套 `release.yml` + 版本号对齐四段式（`v2.0.0.0-test5`） | 台账 §8.41、P-081 |
| 旧数据包路径按批次迁移 | 台账 §8.7A |
| 加入待加 mod 的 A 组（功能/内容）与 B 组（客户端/性能） | 台账 §8.25/§8.26 |
| 默认启用 7 个补搬的材质包 + FPS 显示随包默认 | 台账 §8.16/§8.31 |
| CDR1201 与上游仓库**只读**（越界一次已撤销） | P-110、`AGENTS.md` |
| 每轮收工前更新并提交本文件 | `AGENTS.md`「收工前必做」 |
| **移入 Iron's Spells 体系 + Apotheosis 线**（`f19b339`，其中 Integrated Farming 升级后被回退、Apokinetics 后被移除） | 2026-09-28 用户勾选 |
| **移植总账只在用户喊收工时同步**（不再每轮收工即更新） | 2026-09-28 用户要求，见 `AGENTS.md` |
| **崩溃排查固定流程：先临时摘掉 Drippy 启动一次看真凶，再装回** | 2026-09-28 用户要求，见 `AGENTS.md` |
| **IF 1.4.x 与 Apokinetics 都先等上游更新**，不降级 Drippy / Apotheosis 等宿主 mod | 2026-09-28 用户决定，见 `PORT_BACKLOG.md` |
| **上游 `release.yml` 保持最小分叉**：Cache-seed 的同步步骤**不加 `continue-on-error`**（用户 2026-09-28 决定「第一个不加，保持和上游一致」） | 2026-09-28 用户决定，本文件 §P-168 |
| **新增 `devtool.bat check-hashes` 作为 push 前预检**（`--changed` 查改过的描述符并深验、`--full` 全量深验），写进 `AGENTS.md` / `docs/PACKWIZ_WORKFLOW.md` | 2026-09-28 用户要求，`4cf996e` |
| **入库文档一律不写本机绝对路径**：用 `<本仓库>` / `<参考仓库>` / `<实例目录>` 占位，实际路径只放不入库的 `AGENTS.local.md` | 2026-09-28 用户要求 |
| **自制材质包 `no-vanilla-sun.zip` 进包并默认启用**：`.gitignore` 单独白名单放行该 zip（随仓分发），`config/defaultoptions-common.toml` 的 `defaultResourcePacks` 追加 `file/no-vanilla-sun.zip`（只作用于首次运行，已有实例需手动勾选） | 2026-09-28 用户决定，`aeda017` |
| **主菜单 LOGO 走 `auto_sizing` + `sticky_anchor`，彩蛋文字改用自定义 `splash_text` 元素**（`source_mode = vanilla` 保留原版随机宣传语；原版 splash widget 用 `is_hidden = true` 关掉） | 2026-09-29 用户要求「仿着 1201 那边搞」+ 实机确认，见 P-171/P-172；`f61bce5`→`1200b28` |
| **难度 HUD 不迁**：1.21.1 上角的难度显示由 Improved Mobs 自带 overlay 提供，不自制（也不写 `global`） | 2026-09-29 用户实测指出重复后决定，见 P-118；`8f3f7af`→`b3443b8` |
| **`scripts/` 一次性脚本不再硬编码本机路径**：路径由 `import.meta.url` 推导，参考仓库/实例目录走 `CDPR_REF_REPO` / `CDPR_MC_HOME`（约定写在不入库的 `AGENTS.local.md`） | 2026-09-29，`d07c504` |
| **发布方式：推 tag（tag 名必须等于 `pack/pack.toml` 的版本）→ CI 自动构建三份包 + `release-info.json` 并公开预发布**，不发第三方平台 | 沿用 `df2fc5e`；本轮 `v2.0.0.0-test6` 首次实跑 |

### 4.3 其它挂账（战役 4/5 与待拍板项）

| 条目 | 说明 |
| --- | --- |
| Accelerated Rendering（alpha）是否摘掉 | 它会顶掉 FTB 大地图，现用 `mods_compatibility.ftb_feature_status = DISABLED` 绕过；是否直接移除等用户定 |
| ~~`resourcepacks/no-vanilla-sun.zip` 是否正式进包~~ | ✅ 2026-09-28 已进包并默认启用（`aeda017`）：仓内分发 + `defaultResourcePacks` 追加 |
| 战役 4 未做：iceandfire 的 25 个 biome json | 1.20.1 是 config json，1.21 要转 `biome_modifier`，且引用了未安装的 byg 群系，需转换 + 清理 |
| config 整体 | 165 vs 282 的差异多为「模组绑定型」，**几乎没有现在能做的批量拷贝** |
| B 类真缺失的 13~14 个 mod | 仍需逐个「找替代 / 放弃」；**替代映射 24 条无方案＝当前最大空白**，建议按体系整体决策（枪械线换哪套 / tetra 6.x 内置多少） |
| FTB 任务书剩余 5 处 advancement | 未随 jar 提供（northstar 2+1、create_enchantment_industry 2），保守保留 |
| `data.snbt` 的 `verify_on_load` | 验收后应改回 `false`（游戏退出后） |
| `custom/order/` 订单系统 3 个脚本 | 归入 mbd2 战役，未迁 |
| UI 待办 | ✅ **标题图响应式已做**（P-171，`82adf6c`/`d9b72b2`：`auto_sizing` + `sticky_anchor`，LOGO 437×75）；**仍未做**：主菜单背景色（`#FF14141E`→`#14141EFF`）、中文 hoverlabel |
| `docs/UPSTREAM_ISSUE_DRAFTS.md` | issue 草稿已写、未提交 |
| 本地环境提示 | MCP 悬浮按钮不要点；web 搜索端点 401 时改走 harness 抓取通道 |
| 长期维护 | 上游 `release.yml` 的三处 fork 差异需在每次合并上游时确认仍在 |
| **源包新增的 8 类模组**（Iron's Spells 全家桶、Apokinetics、Fallen Lib/Gems Affixes、Tetra Apothic Link、TaCZ:Accel、Quantified API、Farmer's Spell） | ✅ **已核实（2026-09-28）**：可移入 Iron's Spells 3.16.3 + Iron's Lib 2.2.0、Farmer's Spell 1.0.5.1、Apotheosis 8.9.0（+3 个前置）、Apokinetics 1.0.6；不可行 Fallen 系 / Tetra Apothic Link / TaCZ:Accel；traveloptics 只有 alpha。逐条见 `docs/PORT_BACKLOG.md`，等用户勾选 |
| **配方来源变化** | 源包已把配方从 `data/**/*.json` 迁到 KJS 脚本（`8844be3a`）→ 以后同步配方要看 `kubejs/server_scripts/**/recipe*.js`，不能再只 diff `data/` |
| **`cdr-updater`（Go 更新服务器 + jar 客户端）** | 在源包 `.agents/skills/release/cdr-updater-go/`（93 文件）；本仓目前是 Core + `release-info.json` 的更新链路，需评估是否对齐或借鉴 |
| **PCL2 包瘦身做法**（列 CF mod 而不打包 jar，#2333） | 与本仓 P-099（`Install-PCL.ps1` 必然失败）相关，可作为修复参考 |
| **FancyMenu 主菜单改动**（title 纹理/布局/随机彩蛋/节日灯带） | ✅ 2026-09-29 已按源包做法对齐：LOGO `auto_sizing` + `sticky_anchor`、彩蛋文字改用自定义 `splash_text` 元素（P-171/P-172）。源包那份 16 条中文彩蛋 `<参考仓库>/config/fancymenu/assets/splashes.txt` **仍未迁**——我们目前 `source_mode = vanilla`，要换成中文梗再加文本源即可 |
| **Apotheosis / JEI 排序 / Crash Assistant 配置** | ✅ Apotheosis 已于 2026-09-28 装入（8.9.0 + 3 个官方模块 + Patchouli）；源包的 `config/apotheosis/names.cfg`、JEI 排序、Crash Assistant 基线可作后续对照（本仓 JEI 文件 mod 集不同） |
| **暂缓①：Integrated Farming 1.4.x**（目的＝真空收割机 Vacuum Harvester） | 等上游（Drippy 或 IF）更新。已实测：1.4.2 / 1.4.3 都崩 Drippy 早窗；「摘掉 Drippy 换 vanilla 早窗」也已排除（P-165）。复活步骤与重新下载来源见 `PORT_BACKLOG.md` |
| **暂缓②：Apokinetics 1.0.6**（Create×Apotheosis 联动） | 等作者跟进 Apotheosis ≥8.9 的内部签名；若要现在就用，把 Apotheosis 钉 **8.8.0**（P-164/P-166）。同上见 `PORT_BACKLOG.md` |
| **未验证的新选项：把 CustomSkinLoader 降到 14.x** | 历史日志显示 CSL 14.28 在「早窗被禁用」时也不崩（15.x 才引入 fake-interface）。若将来一定要「无 Drippy 早窗」（例如为了 IF 1.4.x），可试这条路，代价是皮肤 mod 变旧且需实测 |

## 5. 日志噪音基线（判断「是不是新问题」的参照）

### 5.1 日志条目基线（2026-09-24 17:10 采样）

实测样本：`logs/latest.log`（2026-09-24 17:10，2.6 MB / 16174 行）。
这些条目**已经在包里稳定存在**，数量级没明显增长就不用当新问题处理；**出现新的 FATAL 或新类目**才要查。

| 日志条目 | 次数 | 说明 |
| --- | --- | --- |
| `Error converting trade` | 330 | Lightman's Currency 交易数据含目标版本条目，运行时跳过 |
| `Missing textures in model` | 221 | 缺素材，多为 mod 自身打包问题（另有 526 条其它命名空间缺贴图未处理） |
| `Failed to parse recipe` | 123 | KubeJS 建模失败回退原版（空元素 / tag 原料），已定性为噪音 |
| `Tried to load invalid item: 'Item must not be minecraft:air'` | 56 | 空元素进创造栏或配方（多为上游 Core 侧数据） |
| `Unsupported Uniform Type: bool` | 54 | 光影（shader）侧类型告警 |
| `Failed to encode Structure Repaletter Entry: Unknown registry element: END` | 25 | 结构替换器引用未注册元素 |
| `Failed to apply tag physics properties. Unknown block: …` | 72 | Sable 物理属性 tag 引用了未装方块：`copycats:copycat_step` / `copycat_catwalk` / `gyro:removed_block_placeholder` 各 24 |
| `Found an empty itemStack in 'fluidlogistics:fluidlogistics_tab'` | 9 | 同上类，创造栏空元素 |
| `GL_INVALID_VALUE` | 8 | 光影 / 驱动侧 |
| `Encountered unknown or non-serializable data attachment mowziesmobs:*` | 6×3 | Mowzie's Mobs 数据附件在 1.21 反序列化降级 |
| `tacz` 相关行 | 86 | 含兼容层版本配对提醒（`tacz_aero_compat 1.8.0` × TACZ 1.1.8-hotfix-r6） |
| `ERROR` / `WARN` / `FATAL` 行 | 1286 / 2612 / 3 | FATAL 3 条中 2 条是 `Error executing task on Client`、1 条是 ModernUI 的 `OK` 误标；无致命崩溃 |
| ProbeJS `Unable to load file` | 0 | 早期版本有 109 条，当前日志已无 |

### 5.2 关键数字基线（迁移账）

| 维度 | 数字 |
| --- | --- |
| 脚本覆盖 | 1.20.1 侧 493 个 js / 43,264 行 → 1.21.1 侧 202 个（startup 5 / client 2 / server 195），约 41%；server 层是重心（占源包 77% 行数） |
| 命名空间 | 引用数 142 → 113；`kubejs/` 全部文件 6,615（assets 3,898 + data 2,217）；全局改名 `createdelight`→`createdelightcore` 落地（assets 652 / data 117） |
| config / mods | config 308 → 164；mod 元数据 387 → 313；1.20.1 有而 1.21.1 无的 116 个 |
| 实机脚本行基线（2026-09-21 17:00） | `7/7 · 2/2 · 205/205`，`Failed to create` = 0，`Error parsing recipe` = 1 |
| 模组规模 | 实机 411 个模组（314 个受管）；元数据 408 个 / included files 5595~5600（09-24 复测） |
| 任务书 | 75 个 snbt → 2386 个 quest（源包 2509 − 删除 124）；改名 1044 处、删 quest 124、清依赖 152、95 个 `table_id` → 32 张奖励表 |
| Ponder | 24 文件 2006 行；ponderjs 2.4.0 + Create 6.0.10；修 10 个结构 nbt 共 62 处 |
| 航空学 | `mods/common` 361 → 397；装 33（兼容层 7 + 功能 26），跳 5 |
| 汉化 | 106 个命名空间 / 3574 个可见英文键 → 0；值级补漏 141 → 66；不可见缺口 679；ali 补 317 |
| 数据包路径迁移 | 473 个文件（改名 435 / 删除 38） |
| 待加 mod 核实 | 候选 122 个（1.21.1 有 64 / 无 57）；A 组 16+3、B 组 19+1 已加入 |
| 上游批次 | 09-20 批：11 提交 / 348 文件 / 145 个模组更新 / 27 个描述符 pin；09-24 批：16 提交（Core 2.0.0.6 → 2.0.0.7） |
| 发布产物 | Client 1029.6 MB、Server 918.4 MB、Server-Installer 87.1 MB；artifact 2035.1 MB；CI 修复后 2 分 24 秒跑完 |

### 5.3 已知口径冲突（引用数字时注意）

1. **A 组待加 mod 计数**：作战图 §11.10-8 写「16+3」，§11.11 注「实际 15+3」——以「实际加入 15+3（另 2~3 个加不了）」为准。
2. **vintagedelight 厨师帽 16 条模型报错**：§11.10-1 记为「待确认」，§11.14 记为「已结案 = 0」——`f6bc89f`（排包序）之后应为 0，以 09-24 晚复核为准。
3. **Northstar 双日处置三次反转**：09-22 上午「保留本地补丁」→ 09-22 晚「接受双日、不采用补丁」→ **2026-09-24「保留本地补丁」为最终态**。
4. **行数口径**：源包脚本行数出现过 41,066 与 43,264 两种，本仓出现过 18,427 与 18,960 两种——引用规模时以**文件数**为准。
5. **日志噪音是快照**：`Failed to parse recipe` 57 → 123、Sable 物理 tag 23+23 → 72、ProbeJS 109 → 0，都随采样时间变化；引用时写明采样日期（本文件 §5 的采样点是 2026-09-24 17:10 的 `latest.log`）。

### 5.4 Drippy 早窗缺陷（供将来直接引用）

`DrippyEarlyWindowProvider.updateModuleReads(java.lang.ModuleLayer)` 的反汇编（JDK 21 `javap -p -c`，
类取自 `drippyloadingscreen-earlywindow_neoforge_3.1.5_MC_1.21.1.jar`）：

```java
public void updateModuleReads(java.lang.ModuleLayer layer) {          // ← 参数 layer 从未被使用
    ClassLoader cl = Thread.currentThread().getContextClassLoader();  // ← 改用线程上下文 CL
    Class<?> overlay = Class.forName("de.keksuccino.drippyloadingscreen.neoforge.CustomLoadingOverlay", false, cl);
    Class<?> mc      = Class.forName("net.minecraft.client.Minecraft", false, cl);
    Class<?> reload  = Class.forName("net.minecraft.server.packs.resources.ReloadInstance", false, cl);
    this.overlayConstructor = overlay.getConstructor(mc, reload, Consumer.class, boolean.class);
    // 任一失败 → throw new IllegalStateException("[DRIPPY LOADING SCREEN] Custom loading overlay class missing!", e);
}
```

- 早窗阶段主 jar 的类不一定对 TCCL 可见 → `ClassNotFoundException` → 启动即崩（无 crash 报告，只有 `stderr_stream.log` 里有）。
- 复现规律（2026-09-28 实测）：`Integrated Farming 1.4.3` 在位时 **3/3 崩**；换成 1.2.6 时早窗正常 **2/2**。机制上未解释（该 jar 无 `META-INF/services`、无 jar-in-jar、无 `de/keksuccino` 包），**结论按经验记录，不当作因果定论**。
- ⚠️ **不能简单地把早窗换成 `vanilla`**：实测 14:54 那次改成 `vanilla` 后，`CustomSkinLoader` 在 patch `ResourceManager` 时崩
  `NoClassDefFoundError: customskinloader/fake/itf/IFakeIResourceManager$V1`（该类确实在 CSL 每次释放的
  `CustomSkinLoader/Core/CustomSkinLoader-Common.jar` 里，98 条目齐全）→ 又是「模块读取看不见」那一类。
  所以当前**两条实测约束**：① `Integrated Farming 1.4.3` ↔ Drippy 早窗崩；② `vanilla` 早窗 ↔ CSL 崩。
  **采用的组合**：`drippy_early_window` + Integrated Farming 1.2.6（提交 `e848913`）。
- 处置：保持 `config/fml.toml` 的 `earlyWindowProvider = "drippy_early_window"`（注意：NeoForge 会在启动时**重写该文件并抹掉注释**，所以解释只能留在文档里）。
- **它不是可选值**（2026-09-28 补测）：扫全包 `mods/**.jar`，提供 `net.neoforged.neoforgespi.earlywindow.ImmediateWindowProvider` 的**只有** `drippyloadingscreen-earlywindow`（Sodium 只提供 `GraphicsBootstrapper`）。所以这个配置项只有两种结局：`drippy_early_window`（成功）或**任何其它值 → `Failed to find ImmediateWindowProvider …, disabling`（早窗整个被禁用）**；`"vanilla"` 也不是有效值。
- **为什么不能没有早窗**（P-165）：CSL **15.x** 的 `interface-patch`（把 `ResourceManager` 打上 fake 接口）依赖早窗阶段建立的模块读取；早窗一禁用就 `NoClassDefFoundError: …IFakeIResourceManager$V1`（类其实在 CSL 释放的 `CustomSkinLoader/Core/CustomSkinLoader-Common.jar` 里，98 条目齐全）。历史对照：CSL **14.28** + 早窗禁用（09-18 / 09-20）不崩，因为 fake-interface 是 15.x 才引入的。
  → **Drippy 是本包（Drippy 加载屏 + CSL 15.x）的承重墙**：既提供加载屏，又提供 CSL 需要的早窗环境，不能摘。
- ✅ **验证（2026-09-28 15:03）**：以上配置实机启动成功（`Sound engine started`、Iris 为 overworld 建管线）。
  错误分布与 09-24 成功那次逐项一致（`attributeslib` 12/12、`Failed to load config provider from mod` 1/1、
  `statbar` 3/3、`Invalid path` 30/31；FATAL 仅 ModernUI 的 `OK` 那条已知噪音）→ **无新增错误类目**。

### 5.5 排查这类崩溃的固定动作（本轮验证有效）

1. HMCL 导出目录里 `latest.log` 可能**不含**异常，异常只在 `stderr_stream.log` → 两个都要看。
2. 对比「上次成功启动」的 `logs/<日期>-N.log.gz`（日志轮转保留了它）：先比 `Found mod file` 集合，可直接定位「哪些 jar 变了」——本轮靠这个把变量从 419 个 mod 缩到 2 个 jar。
3. 日志顺序读：第一个 ERROR/异常往往是真凶，后面的（如本轮 `screenshot_viewer` 的配置报错）多半是 broken mod state 的次生现象。

## 6. 更新历史

| 日期 | 本轮主题 | 相关提交 |
| --- | --- | --- |
| 2026-09-28 | 建立本文件：汇总 `移植台账.md` / `移植作战图.md` / 仓内 `docs/*` 的问题与过程，补 1.20.1 侧 git 溯源；同时把「收工前更新本文件」写进 `AGENTS.md` | `f990e66`、`4ca5922`（航空学文档）、`df2fc5e`、`782724c`（上游流水线 + 四段式）、`9fadd15`（README），本文件随本轮一起提交 |
| 2026-09-28（第二轮） | 核对 CDR1201 的推进：基线 `1b1b8b7e` → `4c85c39c`（+49 提交 / 556 文件），刷新 §1.1/§1.2 基线、新增 §2.3 差异清单与 §3.10 源包侧问题、§4.3 补 6 项跟进 | 本文件；源包侧对应提交 `8844be3a`、`30781f52`、`cc1a4622`、`9f6d77a4`、`a5abd893` 等 |
| 2026-09-28（第三轮） | 逐个核实「能不能移过来」并出清单：新增 `docs/PORT_BACKLOG.md`（模组类 A1~A11 / 更新类 B1 / 修复类 C1~C15 / 不可行 D / 待验证 E / 采纳顺序 F） | `03a21fc`；核查用 Modrinth API + cfwidget（`web_search` 端点 401，未用） |
| 2026-09-28（第四轮） | 按用户勾选执行移入：8 个新模组（Iron's Spells 系 3 个 + Apotheosis 线 4 个 + Apokinetics）+ Integrated Farming 升 1.4.3；任务书 2 处文案/结构更新；完整性清单重生成（common 424→432）。同时纠正两个认知（裸 versionRange 的宽松语义 P-159、任务书文本在 lang 文件 P-160） | `f19b339` |
| 2026-09-28（第五轮·故障排查） | 用户连续导出 3 次崩溃日志，定位出两个独立故障：① Drippy 早窗缺陷（P-162，反汇编坐实，与 IF 1.4.3 强相关）→ 早窗 provider 改回 vanilla；② `forged_steel_ingot` 重复注册（P-163，Core 2.0.0.7 已自带而我们仍在 KubeJS 补回）→ 删除补回脚本。排查方法沉淀为 §5.4/§5.5 | `dc21f9c`、`97013d0`；证据脚本 `_dsh_tmp/{modset-diff.py,extract-first-error.py,drippy-disasm}` |
| 2026-09-28（第六轮·继续排查） | ① 发现 `vanilla` 早窗会连带崩 CustomSkinLoader → 回退为 `drippy_early_window` 并把 Integrated Farming 钉回 1.2.6（两条实测约束记入 §5.4）；② 定位并移除 Apokinetics（P-164，其 mixin 与 Apotheosis 8.9.0 内部 API 不匹配）；③ 完整性清单重生成（common 431）；④ **15:03 实机启动成功**，错误分布与上次成功逐项一致（无新增噪音类目） | `e848913`、`06a82c3`、`eddef52` |
| 2026-09-28（第七轮·收工同步） | ① 按用户新流程试 IF 1.4.2（含真空收割机）：**同样崩 Drippy 早窗** → 判定整条 1.4.x 线冲突，回退 1.2.6；② 按「崩溃先摘 Drippy」流程实测：摘掉两个 Drippy jar + provider 设 vanilla 后 **CSL 15.x 照样崩** → 顺查清「全包只有 Drippy 提供早窗 provider、`vanilla` 是无效值、CSL 15.x 依赖早窗」（P-165）；③ 查明 Apokinetics 的确切断点（`GemCaseTile#upgradeGem` 在 8.9.0 少了 `Container`，钉 8.8.0 可兼容）；④ 流程与文档同步：`AGENTS.md` 新增《崩溃排查的固定流程》并把总账同步改为「用户喊收工才做」 | `578f733`、`4ad4714`、`7b12c93`、`a89c29a`、`d7de143`、`66729b8` |
| 2026-09-28（第八轮·收工同步） | ① **创造模式进世界崩服**（P-167）定位为三张战利品箱表 `string_id` 全为 `"_"` 导致 FTB Quests 插入重复 ItemStack → 改唯一 id，用户实机确认可正常进游戏；② **CI `cache-seed` 每次失败**（P-168）复现为描述符 sha1 与 CurseForge 重传后的字节不一致 → 修 hash 后 CI 转绿，并新增 `devtool check-hashes` push 前预检（`--changed`/`--full`）；③ 上游缺键/缺图一次补齐（P-169）：Iron's Spellbooks 状态名 6 键 + 5 张图标、Apotheosis 三件套 36 键、Iron's Lib 72 键、`createdelightcore` en_us 的 49 个 tip 键；④ KubeJS 重复加入创造标签页报错清理（P-170，1.20.1 遗留）；⑤ `no-vanilla-sun` 材质包进包并默认启用、`mcpmod` 登记进完整性允许列表（P-154）、P-153 自愈、P-049 复验通过；⑥ 入库文档统一去掉本机绝对路径（改用占位符 + 不入库的 `AGENTS.local.md`） | `67901bb`、`23e106b`、`9b23638`、`a0ada68`、`17715ba`、`116d5bc`、`d39d925`、`5d190d8`、`aeda017`、`4cf996e` |

| 2026-09-29（收工同步） | ① `scripts/` 本机路径清理完成（`scripts/paths.mjs` + `CDPR_REF_REPO`/`CDPR_MC_HOME` 约定）；② P-120 订正（占位章节文案 + `en_us` 缺键）；③ `check-hashes` 加超时；④ P-065 口径订正（808 条）并清 461 条；⑤ **P-118 判定闭环**（应迁 0 / 已由 mod 接管 11 / 放弃 5，难度 HUD 不迁）；⑥ **主菜单 UI 定稿**：LOGO 自适应 + `sticky_anchor` 真居中、彩蛋文字改用自定义 `splash_text` 元素并查清「x/y = 屏幕 GUI 像素、枢轴 = (Screen.width/2 + x, y)」、IAS 标题按钮挪到 Realms 行左侧；新增 **P-171~P-173**；⑦ 打 Release `v2.0.0.0-test6`（首个走「推 tag → CI 自动公开预发布」的版本） | `d07c504`、`9611bb0`、`cd9062a`、`c99c8b2`、`8f3f7af`→`b3443b8`、`f61bce5`、`82adf6c`、`d9b72b2`、`53fa684`、`9b2e946`、`9ac375f`、`1200b28` + 本轮版本提交 |

## 7. 附录：仓内文档索引

| 文件 | 行数 | 作用 |
| --- | --- | --- |
| `MIGRATION_LOG.md` | 本文件 | 迁移总账（过程 / 问题 / 基线 / 遗留） |
| `DevGuide.md` | 371 | 仓库总约定：结构、导出、发版、版本号位置 |
| `PACKWIZ_WORKFLOW.md` | 171 | bkmpw 工作流与 CI 发版说明（含与上游的三处差异） |
| `CREATE_AERONAUTICS.md` | 161 | 航空学体系接入记录（33 附属 / 依赖链 / 6 个启动坑） |
| `MOD_UPDATE_COMPATIBILITY.md` | 97 | 上游升级后的兼容性 pin 清单与原因 |
| `PORT_BACKLOG.md` | 163 | **移植候选清单 + 暂缓项**：模组类/更新类/修复类的 1.21.1 可用性核实、逐条建议、执行结果、两条暂缓项的复活条件与重新下载来源 |
| `FTBQUESTS_MIGRATION.md` | 260 | 任务书迁移的做法与坑 |
| `HOTAI_MIXIN_OVERRIDES.md` | 27 | hotai 的 mixin 覆盖说明 |
| `未安装mod清单.md` | 61 | 1.21.1 侧没有对应版本的 mod 及替代方案 |
| `require_list_clean.md` | 88 | 依赖体检结果（缺失依赖清单） |
| `UPSTREAM_ISSUE_DRAFTS.md` | 70 | 准备给上游提的 issue 草稿（含 Northstar 双日） |
| `REPOSITORY_STRUCTURE.md` | 16 | 仓库目录速查 |
| `GettingStarted-HMCL/PCL/Prism.md` | 378 / 222 / 142 | 三种启动器的新手安装说明 |

