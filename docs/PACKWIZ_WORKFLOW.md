# bkmpw 工作流

AI agent 修改 pack 元数据前，也应该阅读 `.agents/skills/packwiz-modpack/SKILL.md`。

`bkmpw` 是本仓库的 mod 管理工具，用于维护 packwiz-style `*.pw.toml`、下载来源和发布索引，不是游戏启动器。根目录 `pack.toml`、`index.toml` 由 `devtool.bat prepare-pack` 或 `devtool.bat refresh` 生成，不作为源码提交；根目录 `.packwizignore` 是源码文件，直接提交。

## 开发者同步

1. 安装 Java 21。
2. 安装 Node.js LTS / npm。
3. 克隆仓库。
4. 安装仓库 hook 和全局 bkmpw：

```powershell
npm install
devtool.bat setup-tools
```

5. 首次拉取后先展开本地发布根目录文件：

```powershell
devtool.bat prepare-pack
```

6. 双击或运行根目录开发工具：

```powershell
devtool.bat
```

Linux/macOS 使用 `./devtool.sh`。Windows 下不要从 PowerShell 运行 `devtool.sh`，统一使用 `.\devtool.bat`。仓库不再内置 pack 管理二进制，`bkmpw` 由全局 npm 包 `@bro-know-my/packwiz` 提供。旧 `packwiz.exe`、`packwiz-installer-bootstrap.jar`、`serve`、`export-modrinth` 和 `detect-curseforge` 工作流已经移除。

## 常用命令

```powershell
devtool.bat check
devtool.bat setup-tools
devtool.bat refresh
devtool.bat list
devtool.bat update --all
devtool.bat add-curseforge <project>
devtool.bat add-url <side> <name> <filename> <url> <sha256>
devtool.bat add-github <owner/repo-or-url>
devtool.bat remove-mod <name-or-metadata-file>
devtool.bat install-files
devtool.bat install-files-headless
devtool.bat install-files-retry
devtool.bat download-files
devtool.bat modlist
devtool.bat generate-integrity-manifest
devtool.bat export-client [output.zip] [root-dir]
devtool.bat export-curseforge [output.zip] [client|server|both]
devtool.bat export-server [output.zip]
devtool.bat export-server-installer [output.zip]
```

Removed commands are intentional: do not use `install-packwiz`, `add-modrinth`, `detect-curseforge`, `serve`, or `export-modrinth`.

## 元数据位置

新增 mod 元数据默认写入 `mods/*.pw.toml`。需要分侧时手动移动后再运行 `devtool.bat refresh`：

- `mods/common/*.pw.toml`
- `mods/client/*.pw.toml`
- `mods/server/*.pw.toml`

当前已有 mod 元数据集中在 `mods/common`。运行用 jar 仍放在 `mods/*.jar`，不要移动到 `mods/common`、`mods/client` 或 `mods/server`。

## 增删 Mod 开发流程

添加、删除、更新 mod 都以 metadata 为准。不要把 `mods/*.jar` 当作源文件提交。

添加 CurseForge mod：

```powershell
devtool.bat add-curseforge <slug-or-url-or-project-id>
devtool.bat install-files
devtool.bat check
git status --short --untracked-files=all
```

添加直链或 GitHub Release 文件：

```powershell
devtool.bat add-url both "Mod Name" "mod.jar" "https://example/mod.jar" "<sha256>"
devtool.bat add-github <owner/repo-or-url>
devtool.bat install-files
devtool.bat check
```

删除 mod：

```powershell
devtool.bat remove-mod <name-or-metadata-file>
devtool.bat install-files
devtool.bat check
```

`<name-or-metadata-file>` 可以是列表里的名称，也可以是 `mods/common/example.pw.toml` 这类元数据文件路径。删除后要让本地 `mods/` 文件夹同步清理受管旧 jar，运行 `devtool.bat install-files`。手动塞入且从未记录进 `bkmpw:1` manifest 的 jar 不应被清理。

提交前重点检查：

```powershell
git status --short --untracked-files=all
git diff -- pack mods
```

应该提交的是 `mods/*.pw.toml`、`mods/common/*.pw.toml`、`mods/client/*.pw.toml`、`mods/server/*.pw.toml`、根目录 `.packwizignore`、`pack/` 模板，以及确认要共享的 `config/`、`defaultconfigs/`、`kubejs/` 等源码文件。不要提交根目录生成的 `pack.toml`、`index.toml`、`PCL/`、`mods/*.jar`、导出 zip、`.mrpack`、NeoForge 运行文件、世界、日志或本地配置。

## 本地文件安装和下载

```powershell
devtool.bat install-files
devtool.bat install-files-headless
devtool.bat install-files-retry
devtool.bat download-files
```

`install-files` 调用 `bkmpw install-files-headless`。`download-files` 只补缺失文件，不删除本地无关文件。

清理只针对上一次 `bkmpw:1` `packwiz.json` manifest 记录过的 `mods/`、`resourcepacks/`、`shaderpacks/` 文件；手动塞入且未记录的 jar 不应被删除。

## 描述符 hash 预检（push 前）

```powershell
devtool.bat check-hashes                          # 全部托管文件：地址可达 + 本地 hash/体积对照
devtool.bat check-hashes --changed                 # 只查相对 origin/main 改动过的描述符，并对其深验（下载校验）
devtool.bat check-hashes --changed HEAD~1          # 只查最近一次提交动过的描述符
devtool.bat check-hashes --full --only <路径片段>  # 对匹配到的文件全量深验（下载后校验 hash）
```

**为什么需要**：描述符里记录的 hash 与 CDN 实际内容不一致时，`bkmpw install-files-headless` 会重试 3 次后
`error: install completed with errors`（退出码 2）。CI 的 `cache-seed` 作业依赖这个命令，它一失败就会跳过
`actions/cache` 的 post-save，缓存不再更新，于是之后每次 push 都重复同一失败——表现为「CI 老卡在 cache-seed」。
CurseForge 允许作者重传同一个 file-id，重传后同一版本的文件字节可能变化（历史上出现过：4466 个条目 CRC 全一致、
仅 `META-INF/MANIFEST.MF` 的压缩长度与时间戳不同，但整体 sha1 变了），所以锁 sha1 的描述符需要定期校验。

**判定规则**：地址不可达 / 非 2xx / 深验 hash 与描述符不一致 → 失败（退出码 1）；
本地文件与描述符不一致或远端体积与本地不同 → 先记提醒，随后自动对该文件深验，因此「hash 写错」不会漏过。

**建议用法**：改过 `mods/**/*.pw.toml`、`resourcepacks/*.pw.toml`、`shaderpacks/*.pw.toml` 后、push 前跑一次
`--changed`；打 tag 或发版前跑一次 `--full`（约 2.5 GB 流量，必要时配 `--only` 缩小范围）。

## Mod 清单

```powershell
devtool.bat modlist
```

默认输出：

```text
docs/generated/modlist.md
docs/generated/modlist.csv
```

## 发布导出

当前保留客户端 CurseForge 安装包导出，并支持 bkmpw 新增的客户端全量包、开箱即用服务端包和 bkmpw 下载型服务端安装包：

发布前先更新全局工具：

```powershell
devtool.bat setup-tools
devtool.bat check
```

确认 `check` 输出中的 `bkmpw` 已是 npm 最新版本后再导出。

```powershell
devtool.bat export-client [output.zip] [root-dir]
devtool.bat export-curseforge [output.zip] [client|server|both]
devtool.bat export-server [output.zip]
devtool.bat export-server-installer [output.zip]
```

Modrinth export 已移除。

导出类型差异：

- 菜单 `13` / `export-curseforge ... client` 生成客户端 CurseForge 安装包，主要给 CurseForge 类启动器导入。
- 菜单 `14` / `export-client` 生成客户端全量包，自带 client/common runtime jar，不需要启动器再下载 mod；zip 内套一层实例目录，默认目录名来自 `pack.toml` 的 `name`，也可以用 `root-dir` 指定；`roots/common` 和 `roots/client` 会铺到实例目录根部。
- 菜单 `15` / `export-server` 生成开箱即用服务端全量 zip，不是 CurseForge manifest 格式；server/common runtime jar 会写入 `mods/`，`mods/client`、`resourcepacks`、`shaderpacks` 不会进入服务端包；`roots/common` 和 `roots/server` 会铺到 zip 根目录。
- 菜单 `16` / `export-server-installer` 生成 bkmpw 下载型服务端安装包，包含 server/common 元数据、服务端适用配置/脚本、`roots/common`、`roots/server`、`install-server.bat` 和 `install-server.sh`，不夹带 runtime jar，也不夹带本机 `bkmpw` 二进制。用户解压后运行安装脚本，脚本会从 GitHub latest release 下载对应平台的 `bkmpw`，再执行 `bkmpw install-local . . server` 下载服务端 jar。

根目录 overlay 约定：

```text
roots/common/   # 客户端全量包和服务端包都会铺到目标根目录
roots/client/   # 只进入客户端全量包的实例根目录
roots/server/   # 只进入服务端全量包和下载型服务端安装包根目录
```

如果 `roots/common` 和目标 side 目录里有同名文件，目标 side 目录优先。`roots/` 是源码目录，可以提交；导出产物里的文件会被铺平，不会保留 `roots/` 前缀。

`export-client`、`export-server` 和 `export-curseforge` 会通过 devtool 先生成完整性校验清单、刷新索引再导出，因此需要本地 runtime jar 已同步。`export-server-installer` 不强制依赖本地 jar；如果刚更新过 mod 列表，应先在有 runtime jar 的环境执行 `devtool.bat generate-integrity-manifest` 并提交更新后的 `kubejs/config/createdelight_pack_integrity_expected.json`。

## 服务端启动

Windows：

```powershell
.\start.bat
```

Linux/macOS：

```bash
./start.sh
```

如果缺少 `neoforge.jar`，启动脚本会按 `variables.txt` 中的 `NEOFORGE_INSTALLER_URL` 自动下载。缺少 NeoForge 生成的 args 文件时，脚本会自动安装 NeoForge，然后使用配置的 `JAVA` 通过 `win_args.txt` 或 `unix_args.txt` 启动。

## 当前目标

- Minecraft: `1.21.1`
- NeoForge: `21.1.242`
- Java: `21`

## 本仓库的 CI 发版

`.github/workflows/release.yml` **直接采用上游那套**（2026-09-24 起，目的就是少分叉、方便以后合并），
只在四处保留 fork 差异（第 ④ 处在校验脚本里，不在 workflow 文件里）；上游 `docs/DevGuide.md` 的「CI 自动发版」一节描述的就是这套流程。

- 触发：
  - 推 `v*` tag → 构建 + 建 Release（**固定测试版 / 预发布**，建完即公开，没有人工确认步骤）
  - 推 `test-*` 分支 → 只构建（挂在 workflow artifact，不发 Release，用于验证流水线）
  - 推 `main` → 只跑 cache-seed（预先缓存已下载的模组 jar，不发版）
  - 手动 `workflow_dispatch` → 只构建
- 版本号：`pack/pack.toml` 必须形如 `vA.B.C.D` 或 `vA.B.C.D-testN`（**四段式**，与上游一致）。
  发版前用 `devtool.bat set-version <版本>` 同步 `pack/pack.toml` / `config/bcc-common.toml` /
  `config/fancymenu/options.txt`，提交后再打**同名** tag——CI 会校验 tag 与 pack 版本一致，不一致直接失败。
- 步骤：`metadata` → `set-version <构建版本>` → `prepare-pack` → `install-files-headless 3 10`
  （配 `actions/cache` 缓存 `mods/*.jar`）→ `check` → `generate-integrity-manifest` +
  `validate-integrity-manifest.py`（必须与提交里的 `kubejs/config/createdelight_pack_integrity_expected.json`
  一致，不一致直接失败，需本地重生成后提交）→ 生成 `artifacts/release-info.json` 与
  `config/createdelight_release_info.json` → 三条导出 → `validate-release-artifacts.py` 校验包内容 → 上传产物
- 产物：`[Client-Full]<name>-<ver>.zip`、`[Server]-…`、`[Server-Installer]-…`、`release-info.json`
  （**注意**：上传到 Release 后 GitHub 会把文件名里的 `[]` 换成 `.`，页面上显示为 `Client-Full.<name>-<ver>.zip`；
  这只是展示名，zip 内部结构与 workflow 里的判据不受影响）
- 与上游的四处差异：① **不发 CurseForge**（去掉 `export-curseforge` 与 `--curseforge` 校验开关）；
  ② 不跑 `bkmpw update create-delight-core`（该命令走 CurseForge 查询、需要 key；Core 版本随描述符提交）；
  ③ **Release 永远按「测试版 / 预发布」发布**（标题 `<tag> 测试版`、固定 `--prerelease`，即使版本号不带 `-testN`）；
  ④ **`validate-release-artifacts.py` 按 bkmpw 实际行为修正**（在脚本里，不在 workflow 里）：
  bkmpw 0.1.1 的 `export-client` / `export-server` 是**已展开**的全量包、**不含 `.pw.toml` 描述符**
  （描述符只出现在 `export-server-installer`），所以 `full` 分支只校验「没有多余 / 没有越侧描述符」；
  另放行随仓分发的自制材质包 `resourcepacks/no-vanilla-sun.zip`，路径统一用 `as_posix()`。
  合并上游时注意这四处别被覆盖回去（详见 `MIGRATION_LOG.md` P-174）。
