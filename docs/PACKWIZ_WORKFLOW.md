# bkmpw 宸ヤ綔娴?
AI agent 淇敼 pack 鍏冩暟鎹墠锛屼篃搴旇闃呰 `.agents/skills/packwiz-modpack/SKILL.md`銆?
`bkmpw` 鏄湰浠撳簱鐨?mod 绠＄悊宸ュ叿锛岀敤浜庣淮鎶?packwiz-style `*.pw.toml`銆佷笅杞芥潵婧愬拰鍙戝竷绱㈠紩锛屼笉鏄父鎴忓惎鍔ㄥ櫒銆傛牴鐩綍 `pack.toml`銆乣index.toml` 鐢?`devtool.bat prepare-pack` 鎴?`devtool.bat refresh` 鐢熸垚锛屼笉浣滀负婧愮爜鎻愪氦锛涙牴鐩綍 `.packwizignore` 鏄簮鐮佹枃浠讹紝鐩存帴鎻愪氦銆?
## 寮€鍙戣€呭悓姝?
1. 瀹夎 Java 21銆?2. 瀹夎 Node.js LTS / npm銆?3. 鍏嬮殕浠撳簱銆?4. 瀹夎浠撳簱 hook 鍜屽叏灞€ bkmpw锛?
```powershell
npm install
devtool.bat setup-tools
```

5. 棣栨鎷夊彇鍚庡厛灞曞紑鏈湴鍙戝竷鏍圭洰褰曟枃浠讹細

```powershell
devtool.bat prepare-pack
```

6. 鍙屽嚮鎴栬繍琛屾牴鐩綍寮€鍙戝伐鍏凤細

```powershell
devtool.bat
```

Linux/macOS 浣跨敤 `./devtool.sh`銆俉indows 涓嬩笉瑕佷粠 PowerShell 杩愯 `devtool.sh`锛岀粺涓€浣跨敤 `.\devtool.bat`銆備粨搴撲笉鍐嶅唴缃?pack 绠＄悊浜岃繘鍒讹紝`bkmpw` 鐢卞叏灞€ npm 鍖?`@bro-know-my/packwiz` 鎻愪緵銆傛棫 `packwiz.exe`銆乣packwiz-installer-bootstrap.jar`銆乣serve`銆乣export-modrinth` 鍜?`detect-curseforge` 宸ヤ綔娴佸凡缁忕Щ闄ゃ€?
## 甯哥敤鍛戒护

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

## 鍏冩暟鎹綅缃?
鏂板 mod 鍏冩暟鎹粯璁ゅ啓鍏?`mods/*.pw.toml`銆傞渶瑕佸垎渚ф椂鎵嬪姩绉诲姩鍚庡啀杩愯 `devtool.bat refresh`锛?
- `mods/common/*.pw.toml`
- `mods/client/*.pw.toml`
- `mods/server/*.pw.toml`

褰撳墠宸叉湁 mod 鍏冩暟鎹泦涓湪 `mods/common`銆傝繍琛岀敤 jar 浠嶆斁鍦?`mods/*.jar`锛屼笉瑕佺Щ鍔ㄥ埌 `mods/common`銆乣mods/client` 鎴?`mods/server`銆?
## 澧炲垹 Mod 寮€鍙戞祦绋?
娣诲姞銆佸垹闄ゃ€佹洿鏂?mod 閮戒互 metadata 涓哄噯銆備笉瑕佹妸 `mods/*.jar` 褰撲綔婧愭枃浠舵彁浜ゃ€?
娣诲姞 CurseForge mod锛?
```powershell
devtool.bat add-curseforge <slug-or-url-or-project-id>
devtool.bat install-files
devtool.bat check
git status --short --untracked-files=all
```

娣诲姞鐩撮摼鎴?GitHub Release 鏂囦欢锛?
```powershell
devtool.bat add-url both "Mod Name" "mod.jar" "https://example/mod.jar" "<sha256>"
devtool.bat add-github <owner/repo-or-url>
devtool.bat install-files
devtool.bat check
```

鍒犻櫎 mod锛?
```powershell
devtool.bat remove-mod <name-or-metadata-file>
devtool.bat install-files
devtool.bat check
```

`<name-or-metadata-file>` 鍙互鏄垪琛ㄩ噷鐨勫悕绉帮紝涔熷彲浠ユ槸 `mods/common/example.pw.toml` 杩欑被鍏冩暟鎹枃浠惰矾寰勩€傚垹闄ゅ悗瑕佽鏈湴 `mods/` 鏂囦欢澶瑰悓姝ユ竻鐞嗗彈绠℃棫 jar锛岃繍琛?`devtool.bat install-files`銆傛墜鍔ㄥ鍏ヤ笖浠庢湭璁板綍杩?`bkmpw:1` manifest 鐨?jar 涓嶅簲琚竻鐞嗐€?
鎻愪氦鍓嶉噸鐐规鏌ワ細

```powershell
git status --short --untracked-files=all
git diff -- pack mods
```

搴旇鎻愪氦鐨勬槸 `mods/*.pw.toml`銆乣mods/common/*.pw.toml`銆乣mods/client/*.pw.toml`銆乣mods/server/*.pw.toml`銆佹牴鐩綍 `.packwizignore`銆乣pack/` 妯℃澘锛屼互鍙婄‘璁よ鍏变韩鐨?`config/`銆乣defaultconfigs/`銆乣kubejs/` 绛夋簮鐮佹枃浠躲€備笉瑕佹彁浜ゆ牴鐩綍鐢熸垚鐨?`pack.toml`銆乣index.toml`銆乣PCL/`銆乣mods/*.jar`銆佸鍑?zip銆乣.mrpack`銆丯eoForge 杩愯鏂囦欢銆佷笘鐣屻€佹棩蹇楁垨鏈湴閰嶇疆銆?
## 鏈湴鏂囦欢瀹夎鍜屼笅杞?
```powershell
devtool.bat install-files
devtool.bat install-files-headless
devtool.bat install-files-retry
devtool.bat download-files
```

`install-files` 璋冪敤 `bkmpw install-files-headless`銆俙download-files` 鍙ˉ缂哄け鏂囦欢锛屼笉鍒犻櫎鏈湴鏃犲叧鏂囦欢銆?
娓呯悊鍙拡瀵逛笂涓€娆?`bkmpw:1` `packwiz.json` manifest 璁板綍杩囩殑 `mods/`銆乣resourcepacks/`銆乣shaderpacks/` 鏂囦欢锛涙墜鍔ㄥ鍏ヤ笖鏈褰曠殑 jar 涓嶅簲琚垹闄ゃ€?
## Mod 娓呭崟

```powershell
devtool.bat modlist
```

榛樿杈撳嚭锛?
```text
docs/generated/modlist.md
docs/generated/modlist.csv
```

## 鍙戝竷瀵煎嚭

褰撳墠淇濈暀瀹㈡埛绔?CurseForge 瀹夎鍖呭鍑猴紝骞舵敮鎸?bkmpw 鏂板鐨勫鎴风鍏ㄩ噺鍖呫€佸紑绠卞嵆鐢ㄦ湇鍔＄鍖呭拰 bkmpw 涓嬭浇鍨嬫湇鍔＄瀹夎鍖咃細

鍙戝竷鍓嶅厛鏇存柊鍏ㄥ眬宸ュ叿锛?
```powershell
devtool.bat setup-tools
devtool.bat check
```

纭 `check` 杈撳嚭涓殑 `bkmpw` 宸叉槸 npm 鏈€鏂扮増鏈悗鍐嶅鍑恒€?
```powershell
devtool.bat export-client [output.zip] [root-dir]
devtool.bat export-curseforge [output.zip] [client|server|both]
devtool.bat export-server [output.zip]
devtool.bat export-server-installer [output.zip]
```

Modrinth export 宸茬Щ闄ゃ€?
瀵煎嚭绫诲瀷宸紓锛?
- 鑿滃崟 `13` / `export-curseforge ... client` 鐢熸垚瀹㈡埛绔?CurseForge 瀹夎鍖咃紝涓昏缁?CurseForge 绫诲惎鍔ㄥ櫒瀵煎叆銆?- 鑿滃崟 `14` / `export-client` 鐢熸垚瀹㈡埛绔叏閲忓寘锛岃嚜甯?client/common runtime jar锛屼笉闇€瑕佸惎鍔ㄥ櫒鍐嶄笅杞?mod锛泎ip 鍐呭涓€灞傚疄渚嬬洰褰曪紝榛樿鐩綍鍚嶆潵鑷?`pack.toml` 鐨?`name`锛屼篃鍙互鐢?`root-dir` 鎸囧畾锛沗roots/common` 鍜?`roots/client` 浼氶摵鍒板疄渚嬬洰褰曟牴閮ㄣ€?- 鑿滃崟 `15` / `export-server` 鐢熸垚寮€绠卞嵆鐢ㄦ湇鍔＄鍏ㄩ噺 zip锛屼笉鏄?CurseForge manifest 鏍煎紡锛泂erver/common runtime jar 浼氬啓鍏?`mods/`锛宍mods/client`銆乣resourcepacks`銆乣shaderpacks` 涓嶄細杩涘叆鏈嶅姟绔寘锛沗roots/common` 鍜?`roots/server` 浼氶摵鍒?zip 鏍圭洰褰曘€?- 鑿滃崟 `16` / `export-server-installer` 鐢熸垚 bkmpw 涓嬭浇鍨嬫湇鍔＄瀹夎鍖咃紝鍖呭惈 server/common 鍏冩暟鎹€佹湇鍔＄閫傜敤閰嶇疆/鑴氭湰銆乣roots/common`銆乣roots/server`銆乣install-server.bat` 鍜?`install-server.sh`锛屼笉澶瑰甫 runtime jar锛屼篃涓嶅す甯︽湰鏈?`bkmpw` 浜岃繘鍒躲€傜敤鎴疯В鍘嬪悗杩愯瀹夎鑴氭湰锛岃剼鏈細浠?GitHub latest release 涓嬭浇瀵瑰簲骞冲彴鐨?`bkmpw`锛屽啀鎵ц `bkmpw install-local . . server` 涓嬭浇鏈嶅姟绔?jar銆?
鏍圭洰褰?overlay 绾﹀畾锛?
```text
roots/common/   # 瀹㈡埛绔叏閲忓寘鍜屾湇鍔＄鍖呴兘浼氶摵鍒扮洰鏍囨牴鐩綍
roots/client/   # 鍙繘鍏ュ鎴风鍏ㄩ噺鍖呯殑瀹炰緥鏍圭洰褰?roots/server/   # 鍙繘鍏ユ湇鍔＄鍏ㄩ噺鍖呭拰涓嬭浇鍨嬫湇鍔＄瀹夎鍖呮牴鐩綍
```

濡傛灉 `roots/common` 鍜岀洰鏍?side 鐩綍閲屾湁鍚屽悕鏂囦欢锛岀洰鏍?side 鐩綍浼樺厛銆俙roots/` 鏄簮鐮佺洰褰曪紝鍙互鎻愪氦锛涘鍑轰骇鐗╅噷鐨勬枃浠朵細琚摵骞筹紝涓嶄細淇濈暀 `roots/` 鍓嶇紑銆?
`export-client`銆乣export-server` 鍜?`export-curseforge` 浼氶€氳繃 devtool 鍏堢敓鎴愬畬鏁存€ф牎楠屾竻鍗曘€佸埛鏂扮储寮曞啀瀵煎嚭锛屽洜姝ら渶瑕佹湰鍦?runtime jar 宸插悓姝ャ€俙export-server-installer` 涓嶅己鍒朵緷璧栨湰鍦?jar锛涘鏋滃垰鏇存柊杩?mod 鍒楄〃锛屽簲鍏堝湪鏈?runtime jar 鐨勭幆澧冩墽琛?`devtool.bat generate-integrity-manifest` 骞舵彁浜ゆ洿鏂板悗鐨?`kubejs/config/createdelightcore_pack_integrity_expected.json`銆?
## CI 鍙戝竷锛圙itHub Actions锛?
`.github/workflows/release.yml` 澶嶅埢涓婃父 CDR1201 鐨勪袱娈靛紡鍙戝竷锛?*CI 鏋勫缓浜х墿 鈫?浜哄伐纭鍙戝竷**銆?
瑙﹀彂鏂瑰紡锛?
- 鎺?`v*` tag锛堝 `v0.1.0`銆乣v0.2.0-test`锛夛細鏋勫缓鍥涗唤浜х墿锛屽苟鍒涘缓**鑽夌** GitHub Release 鎸備笂璧勪骇銆?- 鎵嬪姩 `workflow_dispatch`锛氬彧鏋勫缓 workflow 浜х墿锛涘嬀閫?`create_release` 鎵嶄細寤鸿崏绋?Release銆?
浜х墿鍛藉悕閲岀殑 `<name>` / `<ver>` 鏉ヨ嚜 `pack/pack.toml`锛泃ag 瑙﹀彂鏃剁増鏈彿鍙?tag锛坄*-test` 鎴?`test-*` 鍒嗘敮鎸変笂娓歌鍒欒涓洪鍙戝竷锛夈€?
| 浜х墿 | 瀵煎嚭鍛戒护 | 璇存槑 |
| --- | --- | --- |
| `Client-<name>-<ver>.zip` | `export-client` | 瀹㈡埛绔叏閲忓寘锛岃嚜甯?client/common runtime jar |
| `Server-<name>-<ver>.zip` | `export-server` | 寮€绠卞嵆鐢ㄦ湇鍔＄鍏ㄩ噺鍖咃紙涓嶅惈 client-only 鍐呭锛?|
| `ServerInstaller-<name>-<ver>.zip` | `export-server-installer` | 涓嬭浇鍨嬫湇鍔＄瀹夎鍖咃紝涓嶅惈 runtime jar |
| `ModList-<name>-<ver>.md` / `.csv` | `modlist` | 模组清单，随 Release 一起给玩家核对版本 |


`build` job 鐨勬楠ら『搴忥細`prepare-pack` 鈫?`check` 鈫?`install-files-headless`锛堜笅杞借繍琛屾湡 jar锛夆啋
`generate-integrity-manifest` 骞朵笌鎻愪氦閲岀殑 `kubejs/config/createdelightcore_pack_integrity_expected.json` 姣斿
锛堜笉涓€鑷寸洿鎺ュけ璐ワ紝闇€鏈湴璺?`devtool.bat generate-integrity-manifest` 鍚庢彁浜わ級鈫?`modlist` 鈫?鍥涙潯瀵煎嚭 鈫?涓婁紶浜х墿銆?
鏇存柊璇存槑鐢?`scripts/release-notes.mjs` 鐢熸垚锛氬彇銆屼笂涓€涓?tag 鈫?鏈 tag銆嶇殑鎻愪氦锛屾寜 conventional-commit 鍓嶇紑鍒嗙粍锛?鐗堟湰鍙?鏁村悎鍖呭悕鐢?`scripts/release-meta.mjs` 浠?`pack/pack.toml` 璇诲彇锛坱ag 瑙﹀彂鏃朵互 tag 涓哄噯锛夈€?
鍙戠増娴佺▼锛?
```powershell
# 1. 鏀?pack/pack.toml 鐨?version 骞舵彁浜ゅ埌 main
git add pack/pack.toml; git commit -m "chore(release): 鐗堟湰鍙?v0.2.0"; git push
# 2. 鎵?tag 瑙﹀彂 CI
git tag v0.2.0; git push origin v0.2.0
# 3. 绛?workflow銆屽彂甯冪増鏈€嶈窇瀹岋紙绾?30-60 鍒嗛挓锛屼富瑕佽姳鍦ㄤ笅杞芥ā缁勬湰浣擄級
gh run list --workflow "鍙戝竷鐗堟湰"
# 4. 妫€鏌ヨ崏绋?Release锛岀‘璁ゆ棤璇悗浜哄伐鍙戝竷锛堥鍙戝竷鍔?--prerelease锛?gh release edit v0.2.0 --draft=false
```

## 鏈嶅姟绔惎鍔?
Windows锛?
```powershell
.\start.bat
```

Linux/macOS锛?
```bash
./start.sh
```

濡傛灉缂哄皯 `neoforge.jar`锛屽惎鍔ㄨ剼鏈細鎸?`variables.txt` 涓殑 `NEOFORGE_INSTALLER_URL` 鑷姩涓嬭浇銆傜己灏?NeoForge 鐢熸垚鐨?args 鏂囦欢鏃讹紝鑴氭湰浼氳嚜鍔ㄥ畨瑁?NeoForge锛岀劧鍚庝娇鐢ㄩ厤缃殑 `JAVA` 閫氳繃 `win_args.txt` 鎴?`unix_args.txt` 鍚姩銆?
## 褰撳墠鐩爣

- Minecraft: `1.21.1`
- NeoForge: `21.1.242`
- Java: `21`

