// 2026-09-21 停用（原内容见 git 历史，合并提交 2709bc7）：
//
// 本文件按 `event.recipes.createdelightcore.<machine>()` 的 KubeJS schema 编写，但 Core 2.0.0.6
// 并未向 KubeJS 暴露这类 schema —— 它的机器处理配方是以数据形式提供的
// （assets/createdelightcore/mbd2/recipe/*.snbt，共 8 个），lang 里也只有 5 个 recipe_type：
// alloy_electric_furnace / assembly_line / big_centrifugation / butchery / hydropower_station。
//
// 且本文件用到的机器（contract_executor、sprinkler、electrolyzer、sell_bin、greenhouse_builder、
// life_matter_extractor、mortar、dryer 等）在 Core 2.0.0.6 的注册里都不存在（机器清单共 24 台）。
//
// 原写法会在第二台机器处抛 Rhino `TypeError: Cannot find default value for object`，
// 并中断本文件后续全部配方（即这些配方本来就一条都没生效）。等 Core 补上这些机器与对应
// KubeJS schema 后再恢复本文件。
