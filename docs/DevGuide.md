# Create Delight Project Rebirth 寮€鍙戞寚鍗?
鏈粨搴撴槸 1.21.1 NeoForge 鐗堟湰鐨勬暣鍚堝寘婧愮爜浠撳簱銆備粨搴撳彧缁存姢鍙鏌ャ€佸彲澶嶇幇鐨勬簮鐮佸拰鍏冩暟鎹紱mod 鏈綋閫氳繃 bkmpw 绠＄悊锛屼笉鐩存帴鎻愪氦 jar銆?
## 椤圭洰鍩虹嚎

- Minecraft: `1.21.1`
- Loader: `NeoForge 21.1.242`
- Java: `21`
- Pack manager: `bkmpw`锛岀敤浜庣鐞嗕粨搴撲腑鐨?mod 鍏冩暟鎹€佷笅杞芥潵婧愬拰鏂囦欢绱㈠紩銆?
## 鍩虹鐜

- Windows / Linux / macOS
- Java 21
- Git
- Node.js LTS / npm锛岀敤浜?KubeJS 鑴氭湰鏍煎紡鍖栧拰 Git hook銆傚畨瑁?Node.js 鏃堕渶鍖呭惈 npm锛屽苟纭 `node`銆乣npm` 宸插姞鍏?PATH銆?- 鎺ㄨ崘缂栬緫鍣細VSCode / IntelliJ IDEA Community Edition / 鍏朵粬鏀寔 TOML銆丣SON銆丣avaScript 鐨勭紪杈戝櫒
- 椤圭洰璺緞涓嶅簲鍚湁绌烘牸涓庝腑鏂囷紝閬垮厤 bkmpw 绛夊伐鍏峰鐞嗘枃浠舵椂鍑洪敊銆?
鏍圭洰褰曞唴缃紑鍙戝伐鍏凤細

```powershell
devtool.bat
```

鍙屽嚮浣跨敤锛?
```text
devtool.bat
```

Linux/macOS 鍙娇鐢細

```bash
./devtool.sh
```

Windows 涓嬩笉瑕佷粠 PowerShell 杩愯 `devtool.sh`锛沗.sh` 鏂囦欢鍏宠仈鍒?Git Bash/MSYS 鏃跺彲鑳芥柊寮€绐楀彛銆俉indows 缁熶竴浣跨敤 `.\devtool.bat`銆?
寮€鍙戝伐鍏疯皟鐢ㄥ叏灞€ npm 鍖?`@bro-know-my/packwiz` 鎻愪緵鐨?`bkmpw` 鍛戒护銆傛棫 `packwiz.exe`銆乣packwiz-installer-bootstrap.jar` 鍜屼粨搴撳唴缃?`bkmpw.exe` 涓嶅啀浣跨敤锛屼篃涓嶅啀鍏滃簳璋冪敤銆?
寮€鍙戣€呮棩甯告搷浣滀紭鍏堜娇鐢ㄤ氦浜掑紡鑿滃崟锛屼笉闇€瑕佽蹇?bkmpw 鍙傛暟鍛戒护銆?浜や簰寮忚彍鍗曟墦寮€鍚庝細鍦ㄥ悗鍙伴€氳繃 npm registry 妫€鏌?`@bro-know-my/packwiz` 鐨勬渶鏂扮増鏈紱濡傛灉鏈湴 `bkmpw` 鏃т簬 npm 鏈€鏂扮増鏈紝鑿滃崟浼氭彁閱掕繍琛?`setup-tools` 鏇存柊銆侫I agent 鎴栬嚜鍔ㄥ寲缁存姢 pack 鍏冩暟鎹墠锛屽簲鍏堣繍琛?`devtool.bat check` 骞剁‘璁よ緭鍑轰腑鐨?`bkmpw` 鐗堟湰銆?
鍙互鐢ㄤ笅闈㈢殑鍛戒护蹇€熸鏌ユ湰鏈哄熀纭€宸ュ叿锛?
```powershell
node -v
npm -v
npm install -g @bro-know-my/packwiz
devtool.bat check
```

## 浠撳簱缁撴瀯鍘熷垯

- `mods/*.jar` 涓嶆彁浜ゃ€?- `mods/*.pw.toml`銆乣mods/common/*.pw.toml`銆乣mods/client/*.pw.toml`銆乣mods/server/*.pw.toml` 鎻愪氦銆?- `pack/` 涓殑鍙戝竷妯℃澘鎻愪氦锛涙牴鐩綍 `.packwizignore` 鐩存帴鎻愪氦锛涙牴鐩綍 `pack.toml`銆乣index.toml`銆乣icon.png`銆乣server-icon.png`銆乣start.bat`銆乣start.sh`銆乣variables.txt`銆乣PCL/` 鐢?`devtool.bat prepare-pack` 鎴?bkmpw 鎿嶄綔鐢熸垚锛屼笉鎻愪氦銆?- `config/`銆乣defaultconfigs/` 鍙斁纭瑕佸叡浜殑閰嶇疆銆?- `kubejs/` 鍙斁宸茬‘璁ら€傞厤 1.21.1 NeoForge 鍜岀洰鏍囨ā缁勯泦鍚堢殑鑴氭湰銆佹暟鎹笌璧勬簮銆?- `hotai/` 鍙斁宸茬‘璁ら渶瑕侀殢鏁村悎鍖呭叡浜殑 Hotai 琛ヤ竵銆傛柊澧炴垨閲嶅缓 `hotai/**/*.badiff` 鍚庯紝鏇存柊 `docs/HOTAI_MIXIN_OVERRIDES.md`锛屽苟杩愯 `devtool.bat refresh` 纭琛ヤ竵鏂囦欢杩涘叆 `index.toml`銆?- 涓嶆彁浜?pack 绠＄悊浜岃繘鍒躲€俙bkmpw` 閫氳繃鍏ㄥ眬 npm 鍖?`@bro-know-my/packwiz` 瀹夎锛涗笉瑕侀噸鏂板姞鍏?`bkmpw.exe`銆乣packwiz.exe`銆乣packwiz-old.exe`銆乣packwiz-installer-bootstrap.jar` 鎴栫浉鍏?VERSION 鏂囦欢銆?- 鏈嶅姟绔繍琛屼骇鐗╀笉鎻愪氦锛屽寘鎷?`libraries/`銆乣world*`銆乣logs/`銆乣run.bat`銆乣run.sh`銆乣server.properties`銆乣eula.txt`銆乣user_jvm_args.txt`銆?
AI 鐩稿叧鍏变韩宸ヤ綔娴佹斁鍦細

```text
.agents/skills/packwiz-modpack/SKILL.md
```

澶勭悊 pack 鍏冩暟鎹墠搴斿厛闃呰璇ユ枃浠躲€?
瀹屾暣缁撴瀯璇存槑瑙侊細

```text
docs/REPOSITORY_STRUCTURE.md
```

## mod 绠＄悊鏂瑰紡

mod 鏈綋鐢?bkmpw 鍏冩暟鎹鐞嗭紝浣嗗紑鍙戣€呬竴鑸笉鐩存帴鎵嬪啓鍛戒护銆傞渶瑕佹坊鍔犮€佹洿鏂般€佷笅杞芥垨鐢熸垚 mod 娓呭崟鏃讹紝杩愯锛?
```powershell
devtool.bat
```

鑿滃崟閲屽凡缁忓皝瑁呬簡浠撳簱妫€鏌ャ€佸埛鏂扮储寮曘€佹坊鍔犻」鐩€佹洿鏂伴」鐩€佸畨瑁?鍚屾鏈湴 mod 鏂囦欢銆佷笅杞界己澶辨枃浠跺拰鐢熸垚 mod 娓呭崟绛夋搷浣溿€?鍙傛暟寮忓懡浠や富瑕佺粰 AI agent銆佽嚜鍔ㄥ寲鑴氭湰鎴栫淮鎶よ€呮帓鏌ラ棶棰樹娇鐢紝鐩稿叧缁嗚妭鏀惧湪 `.agents/skills/packwiz-modpack/SKILL.md` 鍜?`docs/PACKWIZ_WORKFLOW.md`銆?
## 鍒濆鍖?mod 涓嬭浇

棣栨鍑嗗寮€鍙戠幆澧冩椂锛?
1. 杩愯涓€娆?`devtool.bat prepare-pack`锛屾妸 `pack/` 妯℃澘灞曞紑鍒版牴鐩綍骞剁敓鎴?`pack.toml`銆乣index.toml`銆乣PCL/` 绛夋湰鍦板彂甯冩枃浠躲€?2. 浠庡紑鍙戠兢鏂囦欢涓嬭浇闇€瑕佹墜鍔ㄨˉ榻愮殑 mod jar銆?3. 鎶婅繖浜?jar 鏀捐繘浠撳簱鏍圭洰褰曠殑 `mods/` 鏂囦欢澶广€?4. 鍙屽嚮鏍圭洰褰曠殑 `devtool.bat`銆?5. 鍦ㄨ彍鍗曢噷閫夋嫨 `10` 瀹夎/鍚屾 bkmpw 绠＄悊鐨勬湰鍦?mod 鏂囦欢锛涙垨鐩存帴杩愯 `devtool.bat install-files`銆?
涓嬭浇瀹屾垚鍚庯紝`mods/` 閲屼細鍑虹幇鏈湴杩愯鐢ㄧ殑 `*.jar`銆傝繖浜?jar 涓嶆彁浜わ紝鍙繚鐣欏湪鏈満寮€鍙戠幆澧冦€備互鍚庡鏋滆鍒犳煇涓彈绠?jar锛屽啀杩愯鑿滃崟 `10` 鍗冲彲琛ュ洖鏉ャ€?
澧炲垹 mod 鐨勫熀鏈鍒欙細

- 涓嶈鐩存帴閫氳繃鍒犻櫎鎴栧鍒?`mods/*.jar` 鏉ヨ皟鏁存暣鍚堝寘 mod 鍒楄〃銆俲ar 鍙槸鏈湴杩愯鏂囦欢锛岀湡姝ｇ殑 mod 鍒楄〃鐢?`*.pw.toml` 绠＄悊銆?- 鏂板 CurseForge mod 浣跨敤鑿滃崟 `6. 娣诲姞 CurseForge 椤圭洰`锛屾垨鍛戒护 `devtool.bat add-curseforge <project>`銆?- 鏂板鐩撮摼鎴?GitHub Release 鏂囦欢浣跨敤鑿滃崟 `7` 鎴?`8`銆?- 鍒犻櫎 mod 浣跨敤鑿滃崟 `9. 绉婚櫎绠＄悊鏂囦欢`锛屾垨鍛戒护 `devtool.bat remove-mod <name-or-metadata-file>`銆傝彍鍗?`9` 鍙細淇敼娓呭崟锛涘垹闄ゅ悗蹇呴』鍐嶈繍琛岃彍鍗?`10` 鎴?`devtool.bat install-files` 鍚屾鏈湴鏂囦欢澶癸紝鍙楃鏃?jar 鎵嶄細浠庢湰鏈?`mods/` 涓竻鎺夈€?- Modrinth 娣诲姞銆丆urseForge detect銆乻erve 鍜?Modrinth export 宸茬Щ闄ゃ€?- `add-*`銆乣update`銆乣remove-mod` 浼氳嚜鍔ㄧ敓鎴?鍒锋柊鏍圭洰褰?`pack.toml` 鍜?`index.toml`锛涗箣鍚庤繍琛?`devtool.bat install-files`銆傛棤妗岄潰鐜浣跨敤 `devtool.bat install-files-headless`锛涚綉缁滀笉绋虫椂浣跨敤 `devtool.bat install-files-retry`銆?- 鏇存柊銆佹坊鍔犮€佺Щ闄?mod锛屾垨鍙樻洿浼氬奖鍝嶅疄闄?mod id 鐨?jar/metadata 鍚庯紝鍏堝悓姝?runtime jars锛屽啀杩愯 `devtool.bat generate-integrity-manifest`锛屽苟鎶?`kubejs/config/createdelightcore_pack_integrity_expected.json` 绾冲叆鍚屼竴鍙樻洿锛涢殢鍚庤繍琛?`devtool.bat refresh` 鍜?`devtool.bat check`銆?- 鎻愪氦 `mods/*.pw.toml`銆乣mods/common/*.pw.toml`銆乣mods/client/*.pw.toml`銆乣mods/server/*.pw.toml`銆佹牴鐩綍 `.packwizignore`銆乣pack/` 妯℃澘鍜岄渶瑕佸叡浜殑閰嶇疆鍙樺寲锛屼笉鎻愪氦鏍圭洰褰曠敓鎴愮殑 `pack.toml`銆乣index.toml`銆乣PCL/` 鎴?`mods/*.jar`銆?
## 鍏充簬 modinstaller / 鍚屾鍣?
閮ㄥ垎 mod 鍚屾鍣ㄤ細鎸夌収 manifest 娓呯悊鐩綍锛屽垹闄や笉鍦ㄦ竻鍗曚腑鐨勬枃浠躲€傚紑鍙戜粨搴撲腑浼樺厛浣跨敤寮€鍙戝伐鍏疯彍鍗曢噷鐨勨€滃畨瑁?鍚屾鎵樼鏂囦欢鍒版湰鍦扳€濇垨鈥滀笅杞界己澶辨枃浠跺埌鏈湴鈥濄€俠kmpw 鍙竻鐞嗕笂涓€娆?`bkmpw:1` manifest 璁板綍杩囩殑鍙楃鏂囦欢锛涙墜鍔ㄥ鍏ヤ笖鏈褰曠殑 jar 涓嶅簲琚垹闄ゃ€?
濡傛灉纭疄闇€瑕佷娇鐢ㄤ細娓呯悊鏂囦欢鐨勫悓姝ュ櫒锛屽厛纭锛?
- 褰撳墠鐩綍涓嶆槸鍞竴宸ヤ綔鍓湰銆?- 鏈湴鏀瑰姩宸茬粡鎻愪氦鎴栧浠姐€?- 娓呯悊鑼冨洿鍙寘鍚彲鍐嶇敓鎴愮殑杩愯鏂囦欢銆?
## 涓婃父鍚屾

鏈粨搴撴槸 `Jasons-impart/Create-Delight-Project-Rebirth` 鐨?fork銆備笂娓镐細闄嗙画鍔犲叆鏂?mod 鍜屽唴瀹癸紝闇€瑕佸畾鏈熷彇鍥烇細

```powershell
# 鍙栧洖涓婃父 main锛堜笉瑕佺洿鎺?merge 涓婃父鐨?open PR锛岃涓嬶級
git -c http.sslBackend=openssl -c http.proxy=http://127.0.0.1:7897 fetch `
  https://github.com/Jasons-impart/Create-Delight-Project-Rebirth.git main:refs/remotes/upstream/main

git log --oneline origin/main..upstream/main   # 涓婃父鏈夈€佹垜浠繕娌℃湁鐨勬彁浜?git merge upstream/main                        # 鍐茬獊閫氬父闆嗕腑鍦?mods/**/*.pw.toml 鍜岀储寮曟竻鍗?
# 鍚堝苟鍚庡繀椤婚噸璺戝悓姝ヤ笌鏍￠獙
devtool.bat install-files
devtool.bat generate-integrity-manifest
devtool.bat refresh
devtool.bat check
```

涓婃父闀挎湡鎸傜潃澶ч噺浠栦汉鎻愪氦鐨?open PR锛堝惈 `codex/*` 鑷姩鍒嗘敮锛夛紝澶氫负 WIP銆佸彲鍚堝苟鐘舵€佷负 false銆傝瘎浼板崟涓?PR 鏃朵笉瑕佺洿鎺?merge锛屾寜闇€鎶婂叾涓殑 mod 鍏冩暟鎹崟鐙寫鍑烘潵鍔犺繘鏈粨搴撱€?
鎺ㄩ€佹湰浠撳簱锛?
```powershell
git -c http.sslBackend=openssl -c http.proxy=http://127.0.0.1:7897 push origin main
```

> 杩欎袱鏉″懡浠ら噷鐨?`http.sslBackend=openssl` + `http.proxy=http://127.0.0.1:7897` 鏄紑鍙戞満鐩磋繛 github 涓嶇ǔ瀹氭椂鐨勫疄娴嬪彲鐢ㄧ粍鍚堬紱浠ｇ悊鍦板潃灞炰簬鏈満鐜锛屾崲鏈哄櫒闇€鎸夊疄闄呮儏鍐佃皟鏁淬€傞娆℃帹閫佸彲鑳介渶瑕佸湪鐪熷疄缁堢瀹屾垚涓€娆″嚟鎹櫥褰曘€?
娓告垙杩愯浼氶噸鍐?`config/` 涓嬮儴鍒嗙敱 mod 鑷繁缁存姢鐨勯厤缃紙鏂伴敭銆佹柊榛樿鍊笺€佹柊鍒嗙被鎺掑簭绛夛級锛岃繖浜涙敼鍔ㄤ笉鏄汉宸ョ紪杈戯紝纭鏃犳墜宸ヤ慨鏀瑰悗鐢?`git restore config/` 娓呮帀鍐嶆彁浜わ紝閬垮厤鎶婅繍琛屾椂鍣煶娣疯繘鎻愪氦銆?
## KubeJS 寮€鍙戣鑼?
褰撳墠闃舵涓嶈鐩存帴鎵归噺鎼繍鏃т粨搴?KubeJS銆傛棫浠撳簱鏄?Forge 1.20.1锛屾柊浠撳簱鐩爣鏄?NeoForge 1.21.1锛屾ā缁?ID銆佹爣绛俱€侀厤鏂圭被鍨嬨€並ubeJS API 鍜岄厤缃粨鏋勯兘鍙兘鍙樺寲銆?
### KubeJS JS 鏍煎紡鍖?
浠撳簱鏍圭洰褰曟彁渚?`.prettierrc`锛岀敤浜庣粺涓€ KubeJS JavaScript 鐨勫熀纭€鏍煎紡銆俈SCode 鐢ㄦ埛寤鸿瀹夎宸ヤ綔鍖烘帹鑽愭彃浠堕噷鐨?`Prettier - Code formatter`銆?
棣栨鎷夊彇浠撳簱鍚庤繍琛岋細

```powershell
node -v
npm -v
npm install
npm install -g @bro-know-my/packwiz
```

濡傛灉 `node -v` 鎴?`npm -v` 鎵句笉鍒板懡浠わ紝璇峰厛瀹夎 Node.js LTS锛屽苟纭 npm 涓€璧峰畨瑁呬笖宸插姞鍏?PATH銆俙npm install` 浼氬畨瑁呮牸寮忓寲宸ュ叿锛屽苟閫氳繃 Husky 瀹夎 Git hook銆俙npm install -g @bro-know-my/packwiz` 浼氬畨瑁呭叏灞€ `bkmpw` 鍛戒护锛涗篃鍙互杩愯 `devtool.bat setup-tools` 浠ｄ负瀹夎銆備箣鍚庢彁浜ゆ椂锛宍pre-commit` 浼氬厛瀵规湰娆℃殏瀛樼殑 `kubejs/**/*.js` 鑷姩鎵ц Prettier 鏍煎紡鍖栵紝鍐嶈繍琛?`devtool.bat refresh` 鍒锋柊 bkmpw 绱㈠紩銆傛牴鐩綍 `pack.toml`銆乣index.toml` 鏄湰鍦扮敓鎴愭枃浠讹紝涓嶉渶瑕佹殏瀛樻垨鎻愪氦锛涙牴鐩綍 `.packwizignore` 鏄簮鐮佹枃浠讹紝闇€瑕侀殢瑙勫垯鍙樺寲鎻愪氦銆?
涔熷彲浠ユ墜鍔ㄨ繍琛岋細

```powershell
npm run format:js
npm run format:js:check
```

鏈粨搴撲笉鎻愪氦 `.vscode/settings.json`锛岄伩鍏嶆妸涓汉缂栬緫鍣ㄨ缃€佹彃浠剁敓鎴愰厤缃垨鏈満鍋忓ソ甯︾粰鍏朵粬寮€鍙戣€呫€傞渶瑕佷繚瀛樻椂鑷姩鏍煎紡鍖栫殑寮€鍙戣€咃紝鍙互鍦ㄨ嚜宸辩殑 VSCode 鐢ㄦ埛璁剧疆鎴栨湰鍦板伐浣滃尯璁剧疆涓姞鍏ワ細

```json
{
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  }
}
```

涔熷彲浠ュ湪鎵撳紑 `kubejs/**/*.js` 鍚庢墜鍔ㄦ墽琛?`Format Document`銆侾rettier 鍙礋璐ｆ牸寮忓寲锛屼笉浼氭妸鐜颁唬 JavaScript 璇硶杞崲鎴?KubeJS/Rhino 鍙敤璇硶锛涜剼鏈啓娉曚粛闇€鎸夊綋鍓?KubeJS 杩愯鐜淇濇寔鍏煎銆?
### KubeJS 閰嶆柟 schema

褰撴煇涓ā缁勯厤鏂圭被鍨嬫病鏈?KubeJS 鍐呯疆鏀寔鏃讹紝鍙互缁?KubeJS/ProbeJS 娣诲姞 JSON schema锛岀敤浜庣敓鎴?`event.recipes.<mod>.<recipe_type>(...)` 鐨勭被鍨嬭ˉ鍏ㄣ€俿chema 鍙弿杩伴厤鏂?JSON 鐨勫瓧娈电粨鏋勶紝涓嶄細鎶婃暟缁勩€佸瓧绗︿覆绛夎嚜瀹氫箟绠€鍐欒嚜鍔ㄨ浆鎹㈡垚鐩爣 JSON锛涢渶瑕佺畝鍐欒娉曟椂锛屽簲鍦?server script 涓崟鐙啓 helper 鍑芥暟銆?
schema 鏂囦欢鏀惧湪 KubeJS datapack 鐩綍锛?
```text
kubejs/data/<namespace>/kubejs/recipe_schema/<recipe_type>.json
```

渚嬪 `ae2:inscriber` 瀵瑰簲锛?
```text
kubejs/data/ae2/kubejs/recipe_schema/inscriber.json
```

甯哥敤瀛楁锛?
- `name`: 閰嶆柟 JSON 涓殑瀛楁鍚嶃€?- `role`: 瀛楁鐢ㄩ€旓紝甯哥敤 `input`銆乣output`銆乣other`銆?- `type`: KubeJS recipe component 绫诲瀷锛屼緥濡?`item_stack`銆乣ingredient`銆乣fluid_stack`銆乣int`銆乣string`銆乣boolean`銆?- `optional`: 鍙€夊瓧娈电殑榛樿鍊硷紱鍦?`custom_object` 瀛愬瓧娈典腑涔熷彲鐢?`true` 琛ㄧず璇ュ瓙瀛楁鍙渷鐣ャ€?- `constructors`: 瀹氫箟 helper 鐨勫弬鏁伴『搴忥紝渚嬪 `event.recipes.ae2.inscriber(result, ingredients, mode)`銆?
`ae2:inscriber` 绀轰緥锛?
```json
{
  "keys": [
    {
      "name": "result",
      "role": "output",
      "type": "item_stack"
    },
    {
      "name": "ingredients",
      "role": "input",
      "type": {
        "type": "custom_object",
        "keys": [
          {
            "name": "top",
            "component": "ingredient",
            "optional": true
          },
          {
            "name": "middle",
            "component": "ingredient"
          },
          {
            "name": "bottom",
            "component": "ingredient",
            "optional": true
          }
        ]
      }
    },
    {
      "name": "mode",
      "role": "other",
      "type": "string"
    }
  ],
  "constructors": [
    {
      "keys": ["result", "ingredients", "mode"]
    }
  ]
}
```

瀵瑰簲鑴氭湰鐢ㄦ硶锛?
```js
ServerEvents.recipes((event) => {
  event.recipes.ae2
    .inscriber(
      'ae2:calculation_processor',
      {
        top: { item: 'ae2:printed_calculation_processor' },
        middle: { item: 'minecraft:redstone' },
        bottom: { item: 'ae2:printed_silicon' },
      },
      'press'
    )
    .id('kubejs:calculation_processor_test');
});
```

鏂板鎴栦慨鏀?schema 鍚庯紝杩涙父鎴忔墽琛岋細

```text
/reload
/probejs dump
```

绛?`.probe/` 閲嶆柊鐢熸垚鍚庯紝鍦?VSCode 涓墽琛?`TypeScript: Restart TS Server` 鎴栭噸杞界獥鍙ｏ紝琛ュ叏鎵嶄細鏇存柊銆?
閫氱敤瑙勮寖锛?
- 鏂囦欢缁撳熬淇濈暀绌鸿銆?- 缂╄繘浣跨敤 2 鎴?4 涓┖鏍硷紝浣嗗悓涓€鐩綍鍐呬繚鎸佷竴鑷淬€?- 浣跨敤 `let` / `const`锛屼笉瑕佷娇鐢?`var`銆?- KubeJS 杩佺Щ鑴氭湰涓姝娇鐢?`var`锛涙棫鑴氭湰閲岀殑 `var` 蹇呴』鍦ㄨ縼绉绘椂鏀规垚 `const` 鎴?`let`銆?- ResourceLocation 浣跨敤灏忓啓锛岄伩鍏嶇┖鏍煎拰闈炴硶瀛楃銆?- 鑷畾涔夐厤鏂瑰繀椤绘湁鏄庣‘ id銆?- 鏃у懡鍚嶇┖闂?`createdelight` 杩佺Щ鍒版湰浠撳簱鏃舵敼涓?`createdelightcore`锛岄櫎闈炵洰鏍囧璞℃槑纭睘浜庡叾瀹?mod銆?- `createdelightcore` 鐨勭墿鍝併€佹柟鍧椼€佹祦浣撴敞鍐屽拰璇█閿敱 core/瀵瑰簲娉ㄥ唽灞傜淮鎶わ紱杩佺Щ server recipe 鏃朵笉瑕佷负浜嗚閰嶆柟閫氳繃鑰屼复鏃惰ˉ startup 娉ㄥ唽鎴?lang銆?- 浼樺厛鎸夊眰杩佺Щ锛氬伐鍏峰嚱鏁般€佹敞鍐屻€佹爣绛俱€侀厤鏂广€佸鎴风鑴氭湰銆佸彲閫夎仈鍔ㄣ€?- 姣忚縼绉讳竴灞傞兘鍚姩鎴?reload 楠岃瘉锛屼笉瑕佷竴娆℃€у鍏ュぇ閲忔棫鑴氭湰銆?
### KubeJS 1.21 杩佺Щ娉ㄦ剰浜嬮」

- `test_server/kubejs` 褰撳墠鏄祴璇曟湇杩愯鍓湰锛屼笉鏄粨搴撴牴鐩綍 `kubejs/` 鐨勭鍙烽摼鎺ャ€備慨鏀逛粨搴撹剼鏈悗锛屽繀椤诲悓姝ュ搴旀枃浠跺埌 `test_server/kubejs` 鍐嶇敤 RCON `/reload` 楠岃瘉锛屽惁鍒欐祴鍒扮殑鏄棫鍓湰銆?- 涓ユ牸 remove 妯″紡涓嬶紝`event.remove({ id: ... })` 鍙兘鐢ㄤ簬纭褰撳墠 recipe manager 涓瓨鍦ㄧ殑閰嶆柟 id銆傛棫鐗?Forge 璺緞甯稿彂鐢熷彉鍖栵紝渚嬪 `neapolitan:adzuki/adzuki_crate` 鍦ㄦ柊鐗堝彉涓?`neapolitan:adzuki_crate`銆傛嬁涓嶅噯鏃跺厛鏌?jar 鍜?reload 鏃ュ織锛屾垨鐢?`event.findRecipeIds(id)` 鍋?guard銆?- 鏃ц剼鏈殑 `#forge:*` 鏍囩杩佺Щ鍒?`#c:*` 鏃跺繀椤荤‘璁ゆ柊鏍囩瀹為檯瀛樺湪銆備笉瑕佸彧鍋氬瓧绗︿覆鏇挎崲锛涢儴鍒嗘棫鏍囩璇箟鍦ㄦ柊鐗堟媶鎴愪簡 `c:foods/*`銆乣c:tools/*`銆乣c:storage_blocks/*` 绛変笉鍚岃矾寰勩€?- KubeJS Create processing recipe 涓笉瑕佽８浼?`'#tag'`銆傚湪 `create.deploying` 绛夐厤鏂归噷锛岃８ tag 鍙兘琚簭鍒楀寲鎴愬甫 `amount: 1000` 鐨?`neoforge:tag`锛岄殢鍚庤 Create 褰撲綔涓嶆敮鎸佺殑娴佷綋杈撳叆鏍￠獙銆傜墿鍝?tag 浼樺厛鍐?`Ingredient.of('#c:...')`锛涘鏋滆 recipe type 浠嶈鍒わ紝鏀逛负鍏蜂綋鐗╁搧鎴栨暟鎹厤鏂广€?- `create.sequenced_assembly` 涓祵濂?`create.filling` 鏄珮椋庨櫓璺緞銆傚綋鍓?KubeJS Create helper 浼氭妸娴佷綋 ingredient 鍐欐垚 Create 1.21 鍦?sequence 鏍￠獙涓笉鎺ュ彈鐨勬牸寮忥紝鍙兘鎶?`Recipe has more fluid inputs (1) than supported (0)`銆傚凡楠岃瘉 datapack JSON 浣跨敤 `{ "type": "fluid_stack", "fluid": "...", "amount": ... }` 鍙€氳繃锛涜繖绫婚厤鏂逛紭鍏堢敤鏁版嵁 JSON 鎴栧悗缁?core 琛ヤ竵/helper 鎺ョ銆?- `fluid_tag_ingredient(...)` 杩欑被鎵嬪啓娴佷綋 tag 瀵硅薄涓嶆槸 KubeJS Create helper 鐨勭ǔ瀹氳緭鍏ャ€傛祦浣?tag 闇€姹傞渶瑕佷笓闂?schema/helper 鎴?core 琛ヤ竵澶勭悊锛屼笉瑕佸亣瀹?`Ingredient.of()` 鍙互鎷挎祦浣?tag銆?- Minecraft 1.21 涓?`Item.of(...).withChance(...)` 涓嶅啀鐢ㄤ簬 Create 閰嶆柟杈撳嚭銆侰reate 姒傜巼杈撳嚭浣跨敤 `CreateItem.of(item, chance)`锛屽凡鏈夎剼鏈寜杩欎釜鍐欐硶杩佺Щ銆?- Farmers Delight cooking 鐨勮緭鍏ヤ笉瑕佸啓 `'2x item:id'`銆傝 helper 浼氭寜 ingredient 瑙ｆ瀽杈撳叆锛宍2x` 鍙兘琚綋鎴愬懡鍚嶇┖闂淬€傞渶瑕佷袱涓浉鍚岃緭鍏ユ椂鍐欎袱娆″悓涓€ item銆?- Farmers Delight cutting 杈撳嚭浣跨敤褰撳墠瀵硅薄鏍煎紡锛屼緥濡?`{ id: 'item:id', count: 1, chance: 0.3 }`銆備笉瑕佹妸鏃х増 `Item.of(...).withChance(...)` 鐩存帴濉炶繘鏂扮増 cutting銆?- 鏃ц剼鏈腑鐨勫鎴风缃戠粶鍖呫€佸０闊虫挱鏀俱€佸彸閿氦浜掔瓑闈?recipe 閫昏緫瑕佸崟鐙縼绉汇€備粎杩?server recipe 鏃讹紝涓嶈鎶婁緷璧栨棫 client script 鎺ユ敹绔殑 `player.sendData(...)` 閫昏緫椤烘墜鎼叆銆?
寤鸿杩佺Щ椤哄簭锛?
1. `kubejs/startup_scripts` 涓殑鍩虹甯搁噺鍜屾敞鍐屻€?2. `kubejs/server_scripts` 涓殑鏍囩銆?3. 宸茬‘璁ゅ瓨鍦ㄧ殑妯＄粍閰嶆柟銆?4. 璇█鏂囦欢鍜岃祫婧愩€?5. 瀹㈡埛绔?tooltip / render / keybind銆?6. 浠诲姟鍜屽ぇ鍨嬭仈鍔ㄣ€?
## 閰嶇疆杩佺Щ瑙勮寖

- 浼樺厛浣跨敤 1.21.1 NeoForge 瀹炰緥鐢熸垚鐨勬柊閰嶇疆銆?- 涓嶇洿鎺ヨ鐩栨棫 Forge 閰嶇疆銆?- 鍙縼绉诲悓 mod id銆佸悓閰嶇疆椤硅涔夋槑纭殑鍐呭銆?- 鏈嶅姟绔粯璁ら厤缃斁 `defaultconfigs/`銆?- 瀹㈡埛绔垨閫氱敤閰嶇疆鏀?`config/`锛屼絾瑕佺‘璁ゆ槸鍚﹂€傚悎鍥㈤槦鍏变韩銆?- FancyMenu 鐨勭獥鍙ｆ爣棰樸€佺獥鍙ｅ浘鏍囩瓑鍏ㄥ眬鏄剧ず椤瑰湪 `config/fancymenu/options.txt` 涓淮鎶わ紱涓昏彍鍗曞竷灞€鍜屽浘鐗囪祫婧愬垎鍒湪 `config/fancymenu/customization/` 涓?`config/fancymenu/assets/` 涓淮鎶ゃ€?
## 鎹㈣绛栫暐锛?gitattributes锛?
- 缁熶竴绛栫暐锛?*鏂囨湰鏂囦欢涓€寰?LF 鍏ュ簱銆丩F 妫€鍑?*锛岀敱鏍?`.gitattributes` 鐨?`* text=auto eol=lf` 鍐冲畾锛?*涓嶄緷璧栨湰鏈?`core.autocrlf`**銆?- 渚嬪锛歚*.bat` / `*.cmd` / `*.ps1` 淇濇寔 CRLF锛涘浘鐗囥€佸帇缂╁寘銆丯BT銆佸瓧浣撶瓑浜岃繘鍒剁被鍨嬫樉寮忓０鏄?`binary`锛屼笉鍋氫换浣曡浆鎹€?- 鍦?Windows 涓婅繍琛屾父鎴忔椂锛孎TB Quests 涓庡悇 mod 浼氱敤 CRLF 閲嶅啓 `config/*.toml`銆乣config/ftbquests/**/*.snbt` 绛夋枃浠躲€?  **杩欐槸宸ヤ綔鍖虹姸鎬侊紝涓嶆槸鏀瑰姩**锛歡it 姣旇緝鏃舵寜涓婇潰鐨勫睘鎬у綊涓€鍖栵紝鍥犳涓嶄細鍑虹幇鍦?`git status` / `git diff` 閲岋紝涔熶笉浼氭薄鏌撴彁浜ゃ€?- `git add` 鏃跺嚭鐜?`CRLF will be replaced by LF the next time Git touches it` 灞?*棰勬湡鎻愮ず**锛堝伐浣滃尯 CRLF銆佸叆搴?LF锛夛紝鏃犻渶澶勭悊銆?- 鑻?`git status` 绐佺劧鍑虹幇鏁寸墖"鍙敼鎹㈣"鐨?`M`锛屽厛 `git add -u` 鍒锋柊绱㈠紩 stat 缂撳瓨鍐嶅垽鏂紝涓嶈鐩存帴鎻愪氦銆?- 鏂板鏂囨湰绫诲瀷鏃跺湪 `.gitattributes` 琛?`*.ext text eol=lf`锛涗簩杩涘埗绫诲瀷琛?`*.ext binary`銆?
## 鍚姩鑴氭湰

鏈嶅姟绔惎鍔ㄦā鏉匡細

```powershell
.\start.bat
```

Linux/macOS锛?
```bash
./start.sh
```

榛樿 NeoForge installer 鏂囦欢鍚嶏細

```text
neoforge.jar
```

濡傛灉鏍圭洰褰曟病鏈?`neoforge.jar`锛屽惎鍔ㄨ剼鏈細鎸?`variables.txt` 涓殑 `NEOFORGE_INSTALLER_URL` 鑷姩涓嬭浇銆傝繍琛屾湇鍔＄闇€瑕?Java 21銆俙neoforge.jar`銆佺敓鎴愮殑 `run.bat` / `run.sh` 鍜?`libraries/` 閮戒笉鎻愪氦銆?
棣栨鍚姩鏃讹紝鑴氭湰浼氱敤鍙橀噺鏂囦欢閲岀殑 `JVM_ARGS` 鍒涘缓 `user_jvm_args.txt`銆備箣鍚庝笉浼氳鐩栬繖涓枃浠讹紝鏈嶄富鍙互鐩存帴淇敼 `user_jvm_args.txt` 璋冩暣鍐呭瓨锛涘鏋滆鎭㈠浠撳簱榛樿鍊硷紝鍒犻櫎 `user_jvm_args.txt` 鍚庨噸鏂板惎鍔ㄥ嵆鍙€?
`variables.txt` 涓殑鏈嶅姟绔涓哄紑鍏筹細

```text
ACCEPT_EULA=true
AUTO_RESTART=false
RESTART_DELAY_SECONDS=10
```

榛樿涓嶈嚜鍔ㄩ噸鍚€傞渶瑕佸穿鏈嶅悗鑷姩鎷夎捣鏃讹紝鏈嶄富鍙互鎶?`AUTO_RESTART` 鏀规垚 `true`銆?
## 鐗堟湰涓庡彂甯?
姝ｅ紡鍙戝竷鍓嶈嚦灏戞鏌ワ細

1. 淇敼 `pack/pack.toml` 鐗堟湰鍙枫€?2. 鎵ц `devtool.bat setup-tools`锛屾洿鏂板叏灞€ `@bro-know-my/packwiz`锛屽苟纭 `devtool.bat check` 杈撳嚭鐨?`bkmpw` 宸叉槸 npm 鏈€鏂扮増鏈€?3. 鎵ц `devtool.bat prepare-pack` 鎴?`devtool.bat refresh`銆?4. 鎵ц `devtool.bat check`銆?5. 妫€鏌?`git status --short --untracked-files=all`銆?6. 纭娌℃湁 `mods/*.jar`銆佸鍑?zip銆乣.mrpack`銆乣.bkmpw/` 鏈嶅姟绔寘鐩綍鎴栨湇鍔＄杩愯浜х墿杩涘叆鎻愪氦銆?7. 鏇存柊鍙戝竷璇存槑銆?
瀵煎嚭鍛戒护锛?
```powershell
devtool.bat export-client [output.zip] [root-dir]
devtool.bat export-curseforge [output.zip] [client|server|both]
devtool.bat export-server [output.zip]
devtool.bat export-server-installer [output.zip]
```

鑿滃崟 `13` / `export-curseforge ... client` 鐢熸垚瀹㈡埛绔?CurseForge 瀹夎鍖咃紱鑿滃崟 `14` / `export-client` 鐢熸垚瀹㈡埛绔叏閲忓寘锛岃嚜甯?client/common runtime jar锛屼笉闇€瑕佸惎鍔ㄥ櫒鍐嶄笅杞?mod锛涜彍鍗?`15` / `export-server` 鐢熸垚寮€绠卞嵆鐢ㄦ湇鍔＄鍏ㄩ噺 zip锛屼笉鏄?CurseForge manifest 鏍煎紡锛涜彍鍗?`16` / `export-server-installer` 鐢熸垚 bkmpw 涓嬭浇鍨嬫湇鍔＄瀹夎鍖咃紝鍖呭惈 metadata 鍜屽畨瑁呰剼鏈紝涓嶅す甯?runtime jar锛屼篃涓嶅す甯︽湰鏈?bkmpw 浜岃繘鍒讹紝瀹夎鑴氭湰浼氫粠 GitHub latest release 涓嬭浇 bkmpw銆?
v008 璧锋敮鎸佹牴鐩綍 overlay锛?
```text
roots/common/   # 瀹㈡埛绔叏閲忓寘鍜屾湇鍔＄鍖呴兘浼氶摵鍒扮洰鏍囨牴鐩綍
roots/client/   # 鍙繘鍏ュ鎴风鍏ㄩ噺鍖呯殑瀹炰緥鏍圭洰褰?roots/server/   # 鍙繘鍏ユ湇鍔＄鍏ㄩ噺鍖呭拰涓嬭浇鍨嬫湇鍔＄瀹夎鍖呮牴鐩綍
```

杩欎簺鏂囦欢浣滀负婧愮爜鎻愪氦銆傚鍑烘椂鏂囦欢浼氶摵骞冲埌鐩爣鏍圭洰褰曪紝涓嶄繚鐣?`roots/` 鍓嶇紑锛涘鏋?`roots/common` 鍜岀洰鏍?side 鐩綍鏈夊悓鍚嶆枃浠讹紝鐩爣 side 鐩綍浼樺厛銆?
`export-client`銆乣export-server` 鍜?`export-curseforge` 浼氬厛鐢熸垚瀹屾暣鎬ф牎楠屾竻鍗曞苟鍒锋柊绱㈠紩锛岄渶瑕佹湰鍦?runtime jar 宸插悓姝ャ€備笅杞藉瀷 `export-server-installer` 涓嶅己鍒朵緷璧栨湰鍦?jar锛涘鏋滃垰鏀硅繃 mod 鍒楄〃锛屽厛鍦ㄥ凡鍚屾 jar 鐨勭幆澧冭繍琛?`devtool.bat generate-integrity-manifest`锛屾妸鏇存柊鍚庣殑 `kubejs/config/createdelightcore_pack_integrity_expected.json` 涓€璧锋彁浜ゃ€?
Modrinth export 宸茬Щ闄ゃ€傚鍑轰骇鐗╅粯璁や笉鎻愪氦銆?
CI 鍙戝竷锛坄.github/workflows/release.yml`锛夊鍒讳笂娓?CDR1201 鐨勩€孋I 鍑轰骇鐗?+ 浜哄伐鍙戝竷鑽夌銆嶆祦绋嬶細
鎺?`v*` tag 浼氫緷娆¤窇 `prepare-pack` / `check` / `install-files-headless` / 瀹屾暣鎬ф竻鍗曟牎楠?/ 鍥涙潯瀵煎嚭锛?浜у嚭 `Client-*.zip`銆乣Server-*.zip`銆乣ServerInstaller-*.zip`銆乣CurseForge-Client-*.zip`锛?鍒涘缓**鑽夌** Release 骞朵笂浼狅紱纭鍚庣敤 `gh release edit <tag> --draft=false` 鍙戝竷銆?鍛戒护銆佷骇鐗╁懡鍚嶄笌鍙戠増姝ラ瑙?`docs/PACKWIZ_WORKFLOW.md` 鐨勩€孋I 鍙戝竷銆嶄竴鑺傘€?
## 鍗忚涓庣涓夋柟澹版槑

闄ょ涓夋柟澹版槑鍙︽湁瑙勫畾澶栵紝鏈」鐩嚜鏈夋簮鐮併€並ubeJS 鑴氭湰銆乥kmpw/packwiz-style 鍏冩暟鎹€侀厤缃枃浠躲€佹暟鎹枃浠躲€侀厤鏂瑰畾涔夈€佹瀯寤鸿剼鏈拰鍏跺畠鏂囨湰瀹炵幇鏂囦欢鍏佽鍏紑鏌ョ湅銆佸涔犮€佷慨鏀瑰拰闈炲晢涓氬啀鍒嗗彂銆?
鍟嗕笟浣跨敤椤圭洰浠ｇ爜锛屽寘鎷攢鍞€佹巿鏉冦€佷粯璐瑰垎鍙戙€佷粯璐规墭绠°€佸晢涓氭暣鍚堝寘闆嗘垚銆佸晢涓氳鐢熶綔鍝侊紝鎴栧湪浠讳綍鐩堝埄浜у搧鎴栨湇鍔′腑浣跨敤锛屽繀椤诲厛鍙栧緱鐗堟潈鎸佹湁浜轰功闈㈡巿鏉冦€?
鏈」鐩嚜鏈夋潗璐ㄣ€佹ā鍨嬪拰鐩稿叧璧勪骇鏂囦欢鍏ㄩ儴淇濈暀鎵€鏈夋潈鍒╋紙All Rights Reserved锛夛紝闄ら潪瀵瑰簲鏂囦欢鎴栫涓夋柟澹版槑鍙︽湁瑙勫畾銆?
绗笁鏂?mod銆佽祫婧愬寘銆佸厜褰卞寘銆佸伐鍏枫€佸簱锛屼互鍙婂紩鐢ㄦ垨娲剧敓鍐呭锛屽師鏍风户鎵垮叾涓婃父鍗忚锛涙湰浠撳簱涓殑寮曠敤銆佹弿杩般€佹墦鍖呮垨淇敼琛屼负涓嶆敼鍙樺叾鍘熷崗璁€?
鍗忚涓庣涓夋柟澹版槑闆嗕腑鍦細

```text
LICENSE
```

濡傛灉鏇存柊 pack 绠＄悊宸ュ叿鐗堟湰锛屾洿鏂?`@bro-know-my/packwiz` 鐨勫彂甯冪増鏈紝骞跺湪鍙樻洿璇存槑涓褰曟潵婧愶紱涓嶈鎻愪氦鏈湴鐢熸垚鎴栦笅杞界殑宸ュ叿浜岃繘鍒躲€?
## 鎻愪氦瑙勮寖

寤鸿鍙傝€?Conventional Commits锛?
```text
feat: 娣诲姞鏌愬姛鑳?fix: 淇鏌愰棶棰?docs: 鏇存柊鏂囨。
chore: 璋冩暣鏋勫缓鎴栦粨搴撶淮鎶ゆ枃浠?refactor: 閲嶆瀯浣嗕笉鏀瑰彉琛屼负
```

bkmpw 鎿嶄綔瀵艰嚧鐨勬彁浜ゅ簲璇存槑褰卞搷鑼冨洿锛屼緥濡傦細

```text
chore(bkmpw): add create mod metadata
chore(bkmpw): refresh index
```

## Issue 璁ら

浠撳簱鐨?issue 閲囩敤鈥滃厛璁ら锛屽啀澶勭悊鈥濈殑杞婚噺娴佺▼锛岀洰鐨勬槸閬垮厤澶氫汉鍚屾椂閲嶅寮€宸ャ€?
- 鏂?issue 榛樿搴斿甫 `needs-claim` 鏍囩銆?- 寮€鍙戣€呭湪 issue 涓嬭瘎璁?`/claim` 琛ㄧず瑕佽棰嗚浠诲姟銆?- 璁ら鍚庣敱 GitHub Action 鑷姩灏?issue 鍒嗛厤缁欒瘎璁轰汉锛屽苟鎶婃爣绛句粠 `needs-claim` 鍒囨崲涓?`claimed`銆?- 濡傛灉 issue 宸茬粡琚棰嗭紝鍚庣画寮€鍙戣浼樺厛鍦ㄥ凡鍒嗛厤鐨?issue 涓婄户缁紝涓嶈閲嶅鎶㈠崰鍚屼竴浠诲姟銆?
瀵瑰簲鑷姩鍖栧畾涔夊湪锛?
```text
.github/workflows/issue-claim.yml
```

## 甯哥敤妫€鏌?
```powershell
devtool.bat check
devtool.bat refresh
git status --short --untracked-files=all
git check-ignore --quiet mods/example.jar
git check-ignore --quiet mods/example.pw.toml
```

鏈熸湜缁撴灉锛?
- `mods/example.jar` 琚拷鐣ャ€?- `mods/example.pw.toml` 涓嶈蹇界暐銆?
