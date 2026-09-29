#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { generateIntegrityManifest } from './pack-integrity.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const packTemplateDir = path.join(repoRoot, 'pack');
const integrityManifestPath = path.join(
  repoRoot,
  'kubejs',
  'config',
  'createdelight_pack_integrity_expected.json'
);
const globalPackageName = '@bro-know-my/packwiz';

function loadLocalCurseForgeKey() {
  if (process.env.CURSEFORGE_API_KEY?.trim()) return;
  const localConfig = path.join(repoRoot, '.pw', 'config.local.toml');
  if (!fs.existsSync(localConfig)) return;

  let section = '';
  for (const line of fs.readFileSync(localConfig, 'utf8').split(/\r?\n/)) {
    const header = line.match(/^\s*\[([^\]]+)\]\s*(?:#.*)?$/);
    if (header) {
      section = header[1];
      continue;
    }
    if (section !== 'curseforge') continue;
    const entry = line.match(/^\s*api-key\s*=\s*("(?:[^"\\]|\\.)*")\s*(?:#.*)?$/);
    if (!entry) continue;
    const key = JSON.parse(entry[1]);
    if (key.trim()) process.env.CURSEFORGE_API_KEY = key.trim();
  }
}

loadLocalCurseForgeKey();

const commands = new Set([
  'help',
  'menu',
  'tui',
  'setup-tools',
  'prepare-pack',
  'check',
  'refresh',
  'list',
  'update',
  'add-curseforge',
  'add-url',
  'add-github',
  'remove-mod',
  'install-files',
  'install-files-headless',
  'install-files-retry',
  'download-files',
  'modlist',
  'generate-integrity-manifest',
  'check-hashes',
  'set-version',
  'export-client',
  'export-curseforge',
  'export-server',
  'export-server-installer',
]);

function color(code, message) {
  return process.stdout.isTTY ? `\u001b[${code}m${message}\u001b[0m` : message;
}

function writeInfo(message) {
  console.log(color(36, `[信息] ${message}`));
}

function writeSuccess(message) {
  console.log(color(32, `[完成] ${message}`));
}

function writeWarn(message) {
  console.log(color(33, `[警告] ${message}`));
}

function writeFail(message) {
  console.error(color(31, `[错误] ${message}`));
}

function showHelp() {
  console.log(`Create Delight Project Rebirth 开发工具

用法：
  devtool.bat help
  devtool.bat menu
  devtool.bat tui
  devtool.bat setup-tools
  devtool.bat prepare-pack
  devtool.bat check
  devtool.bat refresh
  devtool.bat list
  devtool.bat update [mod-name | --all]
  devtool.bat add-curseforge <project|url|project-id> [file-id] [bkmpw args...]
  devtool.bat add-url <side> <name> <filename> <url> <sha256>
  devtool.bat add-github <owner/repo|url> [bkmpw args...]
  devtool.bat remove-mod <name|metadata-file>
  devtool.bat install-files [attempts] [delay-seconds]
  devtool.bat install-files-headless [attempts] [delay-seconds]
  devtool.bat install-files-retry [attempts] [delay-seconds]
  devtool.bat download-files [jobs] [--force]
  devtool.bat modlist [output-dir]
  devtool.bat generate-integrity-manifest
  devtool.bat check-hashes [--full] [--changed [git-ref]] [--only <路径片段>]   # 预检描述符的下载地址与 hash
  devtool.bat set-version <vA.B.C.D[-testN]>                        # 同步 pack.toml / bcc / fancymenu 版本号
  devtool.bat export-curseforge [output.zip] [client|server|both]   # 客户端 CurseForge 安装包
  devtool.bat export-client [output.zip] [root-dir]                 # 客户端全量包，自带 mod 文件
  devtool.bat export-server [output.zip]                            # 开箱即用服务端全量包
  devtool.bat export-server-installer [output.zip]                  # bkmpw 下载型服务端安装包

Linux/macOS 可使用 ./devtool.sh 执行同样命令。

说明：
  - 直接运行本脚本会进入交互式菜单。
  - tui 打开当前整合包的全屏界面；需要支持 tui 的新版 bkmpw。
  - CDPR 专属完整性清单和发布前检查仍使用本菜单的导出命令。
  - 本工具调用全局 npm 包 ${globalPackageName} 提供的 bkmpw 命令。
  - 缺少 bkmpw 时运行 devtool.bat setup-tools，或手动运行 npm install -g ${globalPackageName}。
  - 所有新增 mod 元数据默认写入 mods/*.pw.toml；可手动移动到 mods/common、mods/client、mods/server。
  - install-files/download-files 由 bkmpw 执行，只处理清单记录的托管文件，不清理手动塞入且未入清单的 jar。
  - 菜单 13 是客户端 CurseForge 安装包；14 是客户端全量包；15 是开箱即用服务端包；16 是 bkmpw 下载型服务端安装包。
  - prepare-pack 按 .pw/config.toml 展开本地模板并刷新索引。
  - check-hashes 用于 push 前预检「描述符记录的 hash 与 CDN 实际内容是否一致」：不一致会让 bkmpw 校验失败，
    CI 的 cache-seed 作业随之失败且不再更新缓存（详见 docs/MIGRATION_LOG.md）。默认只做快速检查
    （地址可达 + 本地 hash/体积对照）；带 --changed 时只查相对 git-ref 改动过的描述符并默认深验（下载校验），
    --full 对全部托管文件深验（约 2.5 GB，建议配 --only 或发布前使用）。
  - 四种导出由 bkmpw 在临时目录准备模板、校验并打包；CDPR 完整性清单仍由脚本生成。`);
}

function commandName(name) {
  if (process.platform === 'win32' && (name === 'npm' || name === 'bkmpw')) return `${name}.cmd`;
  return name;
}

function quoteWindowsArg(arg) {
  if (arg.length === 0) return '""';
  if (!/[ \t&()^%!"<>|]/.test(arg)) return arg;
  return `"${arg.replace(/([%"^])/g, '^$1')}"`;
}

function getSpawnInvocation(executable, args) {
  const spawnArgs =
    process.platform === 'win32' && (executable === 'npm' || executable === 'bkmpw')
      ? ['/d', '/s', '/c', [commandName(executable), ...args].map(quoteWindowsArg).join(' ')]
      : args;
  const spawnExecutable =
    process.platform === 'win32' && (executable === 'npm' || executable === 'bkmpw')
      ? process.env.ComSpec || 'cmd.exe'
      : commandName(executable);

  return { spawnExecutable, spawnArgs };
}

function run(executable, args, { stdio = 'inherit', check = true, timeout } = {}) {
  const { spawnExecutable, spawnArgs } = getSpawnInvocation(executable, args);

  const result = spawnSync(spawnExecutable, spawnArgs, {
    cwd: repoRoot,
    stdio,
    encoding: 'utf8',
    timeout,
  });

  if (result.error) {
    if (check) throw result.error;
    return result;
  }
  if (check && result.status !== 0) {
    throw new Error(`${executable} 执行失败，退出码 ${result.status}。`);
  }
  return result;
}

function runAsync(executable, args, { timeout } = {}) {
  const { spawnExecutable, spawnArgs } = getSpawnInvocation(executable, args);

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;

    const child = spawn(spawnExecutable, spawnArgs, {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    const timer =
      timeout === undefined
        ? null
        : setTimeout(() => {
            timedOut = true;
            child.kill();
          }, timeout);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve({ error, status: null, stdout, stderr });
    });
    child.on('close', (status) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve({
        error: timedOut ? new Error(`${executable} 执行超时。`) : null,
        status,
        stdout,
        stderr,
      });
    });
  });
}

function getCommandVersion(executable) {
  const result = run(executable, ['--version'], { stdio: 'pipe', check: false });
  if (result.error || result.status !== 0) return null;
  return `${result.stdout ?? result.stderr ?? ''}`.trim();
}

function getNpmVersion() {
  return getCommandVersion('npm');
}

function getBkmpwVersion() {
  return getCommandVersion('bkmpw');
}

let cachedLatestBkmpwPackageVersion;
let pendingLatestBkmpwPackageVersion;
let menuBkmpwUpdateNoticeShown = false;

function parseSemver(version) {
  const match = `${version ?? ''}`.match(/(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    raw: match[0],
  };
}

function compareSemver(a, b) {
  for (const key of ['major', 'minor', 'patch']) {
    if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1;
  }
  return 0;
}

async function getLatestBkmpwPackageVersion() {
  if (cachedLatestBkmpwPackageVersion !== undefined) return cachedLatestBkmpwPackageVersion;
  if (pendingLatestBkmpwPackageVersion) return pendingLatestBkmpwPackageVersion;

  pendingLatestBkmpwPackageVersion = runAsync(
    'npm',
    ['view', globalPackageName, 'version', '--silent'],
    { timeout: 8000 }
  ).then((result) => {
    if (result.error || result.status !== 0) {
      cachedLatestBkmpwPackageVersion = null;
    } else {
      cachedLatestBkmpwPackageVersion = `${result.stdout ?? result.stderr ?? ''}`.trim() || null;
    }
    pendingLatestBkmpwPackageVersion = null;
    return cachedLatestBkmpwPackageVersion;
  });

  return pendingLatestBkmpwPackageVersion;
}

function getBkmpwUpdateStatus(localVersion, latestVersion) {
  if (latestVersion === undefined) return { state: 'checking' };
  if (!latestVersion) return { state: 'unknown' };

  const localSemver = parseSemver(localVersion);
  const latestSemver = parseSemver(latestVersion);
  if (!localSemver || !latestSemver) return { state: 'unknown', latestVersion };

  if (compareSemver(localSemver, latestSemver) < 0) {
    return {
      state: 'outdated',
      localVersion: localSemver.raw,
      latestVersion: latestSemver.raw,
    };
  }

  return { state: 'current', localVersion: localSemver.raw, latestVersion: latestSemver.raw };
}

function getCachedBkmpwUpdateStatus(localVersion) {
  return getBkmpwUpdateStatus(localVersion, cachedLatestBkmpwPackageVersion);
}

async function warnIfBkmpwOutdated(localVersion) {
  const latestVersion = await getLatestBkmpwPackageVersion();
  const status = getBkmpwUpdateStatus(localVersion, latestVersion);
  if (status.state !== 'outdated') return;

  writeWarn(
    `bkmpw 当前版本 ${status.localVersion}，npm 最新版本 ${status.latestVersion}。建议运行 devtool.bat setup-tools 更新。`
  );
}

function assertNpmAvailable() {
  const version = getNpmVersion();
  if (!version) {
    throw new Error('未找到 npm。请先安装 Node.js LTS，并确认 node/npm 已加入 PATH。');
  }
  return version;
}

function assertBkmpwAvailable() {
  const version = getBkmpwVersion();
  if (!version) {
    throw new Error(
      `未找到 bkmpw。请先运行 devtool.bat setup-tools，或手动运行：npm install -g ${globalPackageName}`
    );
  }
  return version;
}

function invokeBkmpwRaw(commandArgs) {
  assertBkmpwAvailable();
  writeInfo(`bkmpw ${commandArgs.join(' ')}`);
  run('bkmpw', commandArgs);
}

function invokeBkmpwPackCommand(subCommand, commandArgs = []) {
  invokeBkmpwRaw([subCommand, repoRoot, ...commandArgs]);
}

function startTui() {
  assertBkmpwAvailable();
  const result = run('bkmpw', ['--help'], { stdio: 'pipe' });
  if (!/(?:^|\s)tui(?:\s|$)/m.test(`${result.stdout ?? ''}\n${result.stderr ?? ''}`)) {
    throw new Error('当前 bkmpw 不支持 TUI，请运行 devtool.bat setup-tools 更新。');
  }
  run('bkmpw', ['tui', repoRoot]);
}

function toSlash(value) {
  return value.split(path.sep).join('/');
}

function walkFiles(relativeRoot) {
  const absoluteRoot = path.join(repoRoot, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];

  const files = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`拒绝扫描符号链接：${toSlash(path.relative(repoRoot, fullPath))}`);
      }
      if (entry.isDirectory()) visit(fullPath);
      else if (entry.isFile()) files.push(toSlash(path.relative(repoRoot, fullPath)));
    }
  };

  visit(absoluteRoot);
  files.sort();
  return files;
}

function stripTomlComment(raw) {
  let inString = false;
  let escaped = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (char === '#' && !inString) return raw.slice(0, index);
  }
  return raw;
}

function parseTomlValue(raw) {
  if (raw.startsWith('"') && raw.endsWith('"')) {
    return raw.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  if (/^-?\d+$/.test(raw)) return Number(raw);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return raw;
}

function parseSimpleToml(text) {
  const rootTable = {};
  let current = rootTable;

  for (const raw of text.split(/\r?\n/)) {
    const line = stripTomlComment(raw).trim();
    if (!line) continue;

    const section = line.match(/^\[([^\]]+)\]$/);
    if (section) {
      current = rootTable;
      for (const part of section[1].split('.')) {
        current[part] ??= {};
        current = current[part];
      }
      continue;
    }

    const match = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/);
    if (match) current[match[1]] = parseTomlValue(match[2].trim());
  }

  return rootTable;
}

function validateVersionField(relative, text, label, pattern, expected, errors) {
  const match = text.match(pattern);
  if (!match) {
    errors.push(`${relative}: missing managed ${label} reference (expected ${expected})`);
    return;
  }

  const actual = match[1].trim();
  if (actual !== expected) {
    errors.push(`${relative}: ${label} drifted (expected ${expected}, found ${actual})`);
  }
}

function validateManagedVersionReferences(errors) {
  const packDescriptorPath = path.join(packTemplateDir, 'pack.toml');
  let packDescriptor;
  try {
    packDescriptor = parseSimpleToml(fs.readFileSync(packDescriptorPath, 'utf8'));
  } catch (error) {
    errors.push(`failed to read pack/pack.toml version baseline: ${error.message}`);
    return;
  }

  const minecraftVersion = `${packDescriptor.versions?.minecraft ?? ''}`.trim();
  const neoforgeVersion = `${packDescriptor.versions?.neoforge ?? ''}`.trim();
  if (!minecraftVersion) errors.push('pack/pack.toml: missing versions.minecraft');
  if (!neoforgeVersion) errors.push('pack/pack.toml: missing versions.neoforge');
  if (!minecraftVersion || !neoforgeVersion) return;

  const referenceFiles = [{ relative: 'pack/variables.txt' }, { relative: 'pack/PCL/Setup.ini' }];

  const contentByPath = new Map();
  for (const reference of referenceFiles) {
    let text;
    try {
      text = fs.readFileSync(path.join(repoRoot, ...reference.relative.split('/')), 'utf8');
      contentByPath.set(reference.relative, text);
    } catch (error) {
      errors.push(
        `failed to read managed version reference ${reference.relative}: ${error.message}`
      );
      continue;
    }
  }

  const variables = contentByPath.get('pack/variables.txt');
  if (variables) {
    validateVersionField(
      'pack/variables.txt',
      variables,
      'MC_VERSION',
      /^MC_VERSION=(.+)$/m,
      minecraftVersion,
      errors
    );
    validateVersionField(
      'pack/variables.txt',
      variables,
      'NEOFORGE_VERSION',
      /^NEOFORGE_VERSION=(.+)$/m,
      neoforgeVersion,
      errors
    );
    validateVersionField(
      'pack/variables.txt',
      variables,
      'NEOFORGE_INSTALLER_URL',
      /^NEOFORGE_INSTALLER_URL=(.+)$/m,
      `https://maven.neoforged.net/releases/net/neoforged/neoforge/${neoforgeVersion}/neoforge-${neoforgeVersion}-installer.jar`,
      errors
    );
  }

  const pclSetup = contentByPath.get('pack/PCL/Setup.ini');
  if (pclSetup) {
    validateVersionField(
      'pack/PCL/Setup.ini',
      pclSetup,
      'VersionVanillaName',
      /^VersionVanillaName:(.+)$/m,
      minecraftVersion,
      errors
    );
    validateVersionField(
      'pack/PCL/Setup.ini',
      pclSetup,
      'VersionNeoForge',
      /^VersionNeoForge:(.+)$/m,
      neoforgeVersion,
      errors
    );
  }
}

function indexIncludedCount() {
  const indexPath = path.join(repoRoot, 'index.toml');
  if (!fs.existsSync(indexPath)) return null;
  return [...fs.readFileSync(indexPath, 'utf8').matchAll(/^\[\[files\]\]/gm)].length;
}

function metadataTarget(metadataPath, filename) {
  const normalized = metadataPath.replace(/\\/g, '/');
  if (normalized.startsWith('resourcepacks/')) return `resourcepacks/${filename}`;
  if (normalized.startsWith('shaderpacks/')) return `shaderpacks/${filename}`;
  return `mods/${filename}`;
}

function expectedSide(metadataPath, metadata) {
  const normalized = metadataPath.replace(/\\/g, '/');
  if (normalized.startsWith('mods/server/')) return 'server';
  if (normalized.startsWith('mods/client/')) return 'client';
  if (normalized.startsWith('mods/common/') || /^mods\/[^/]+\.pw(\.toml)?$/.test(normalized)) {
    return 'both';
  }
  return metadata.side ?? (normalized.startsWith('mods/') ? 'both' : 'client');
}

function validateHash(format, hash) {
  const normalizedFormat = `${format ?? ''}`.trim().toLowerCase();
  const normalizedHash = `${hash ?? ''}`.trim();
  const expectedLength = { sha1: 40, sha256: 64, sha512: 128 }[normalizedFormat];
  if (!expectedLength) return `unsupported hash format: ${format}`;
  if (normalizedHash.length !== expectedLength || !/^[0-9a-fA-F]+$/.test(normalizedHash)) {
    return `expected ${expectedLength} hex chars for ${normalizedFormat}`;
  }
  return null;
}

function runGitCheckIgnore(relativePath) {
  const result = run('git', ['check-ignore', '--quiet', '--', relativePath], {
    stdio: 'pipe',
    check: false,
  });
  if (result.error) {
    return { ok: false, warning: `failed to run git check-ignore: ${result.error.message}` };
  }
  if (result.status === 0) return { ok: true };
  if (result.status === 1) return { ok: false };
  return { ok: false, warning: `git check-ignore ${relativePath} exited with ${result.status}` };
}

function testPackStructure() {
  const warnings = [];
  const errors = [];

  writeSuccess(`pack root: ${repoRoot}`);

  for (const relative of ['pack.toml', 'index.toml', '.packwizignore', '.gitignore']) {
    if (fs.existsSync(path.join(repoRoot, relative))) writeSuccess(`found ${relative}`);
    else {
      writeFail(`missing ${relative}`);
      errors.push(`missing ${relative}`);
    }
  }

  let metadataFiles = [];
  try {
    metadataFiles = ['mods', 'resourcepacks', 'shaderpacks']
      .flatMap((root) => walkFiles(root))
      .filter((file) => file.endsWith('.pw') || file.endsWith('.pw.toml'));
  } catch (error) {
    errors.push(error.message);
  }

  writeSuccess(`metadata files: ${metadataFiles.length}`);
  const included = indexIncludedCount();
  if (included === null) warnings.push('index.toml not readable for included file count');
  else writeSuccess(`included files: ${included}`);

  const targets = new Map();
  for (const metadataPath of metadataFiles) {
    let metadata;
    try {
      metadata = parseSimpleToml(fs.readFileSync(path.join(repoRoot, metadataPath), 'utf8'));
    } catch (error) {
      errors.push(`failed to read metadata ${metadataPath}: ${error.message}`);
      continue;
    }

    if (!`${metadata.name ?? ''}`.trim()) warnings.push(`metadata has no name: ${metadataPath}`);
    if (!`${metadata.filename ?? ''}`.trim()) {
      errors.push(`metadata has no filename: ${metadataPath}`);
      continue;
    }

    const download = metadata.download ?? {};
    if (!download['hash-format'] || !download.hash) {
      warnings.push(`metadata has no download hash: ${metadataPath}`);
    } else {
      const hashError = validateHash(download['hash-format'], download.hash);
      if (hashError)
        errors.push(`metadata has invalid download hash: ${metadataPath}: ${hashError}`);
    }

    const hasDownloadUrl = `${download.url ?? ''}`.trim() !== '';
    if (download.mode === 'metadata:curseforge') {
      const curseforge = metadata.update?.curseforge ?? {};
      if (curseforge['project-id'] === undefined || curseforge['file-id'] === undefined) {
        errors.push(
          `CurseForge metadata is missing update.curseforge project-id/file-id: ${metadataPath}`
        );
      }
    } else if (!hasDownloadUrl) {
      warnings.push(`metadata has no usable download source: ${metadataPath}`);
    }

    const declaredSide = expectedSide(metadataPath, metadata);
    if (!['both', 'client', 'server'].includes(declaredSide)) {
      errors.push(`metadata has unsupported side: ${metadataPath}`);
    }

    const target = metadataTarget(metadataPath, metadata.filename);
    const sources = targets.get(target) ?? [];
    sources.push(metadataPath);
    targets.set(target, sources);
  }

  for (const [target, sources] of targets) {
    if (sources.length > 1) errors.push(`duplicate target file ${target}: ${sources.join(', ')}`);
  }

  if (fs.existsSync(path.join(repoRoot, '.git'))) {
    const jarIgnore = runGitCheckIgnore('mods/example.jar');
    if (jarIgnore.warning) warnings.push(jarIgnore.warning);
    else if (jarIgnore.ok) writeSuccess('mods/*.jar is ignored');
    else errors.push('mods/*.jar does not appear to be ignored');

    const metadataIgnore = runGitCheckIgnore('mods/example.pw.toml');
    if (metadataIgnore.warning) warnings.push(metadataIgnore.warning);
    else if (!metadataIgnore.ok) writeSuccess('metadata files are trackable');
    else errors.push('metadata files appear to be ignored');
  } else {
    warnings.push('git ignore checks skipped: .git not found');
  }

  validateManagedVersionReferences(errors);

  for (const warning of warnings) writeWarn(warning);
  for (const error of errors) writeFail(error);
  if (errors.length > 0) throw new Error(`本地仓库检查失败：${errors.length} 个错误。`);
}

async function setupTools() {
  const npmVersion = assertNpmAvailable();
  writeSuccess(`npm: ${npmVersion}`);
  writeInfo(`npm install -g ${globalPackageName}`);
  run('npm', ['install', '-g', globalPackageName]);
  const bkmpwVersion = assertBkmpwAvailable();
  writeSuccess(`bkmpw: ${bkmpwVersion}`);
  await warnIfBkmpwOutdated(bkmpwVersion);
}

function updateCoreBeforeSync() {
  writeInfo('同步前自动更新 create-delight-core');
  try {
    invokeBkmpwPackCommand('update', ['create-delight-core']);
  } catch (error) {
    writeWarn(`create-delight-core 自动更新失败，继续执行后续操作：${error.message}`);
  }
}

let releaseWorkflowChecked = false;

function assertReleaseWorkflowAvailable() {
  if (releaseWorkflowChecked) return;
  assertBkmpwAvailable();
  const result = run('bkmpw', ['--help'], { stdio: 'pipe' });
  const helpOutput = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (!/(?:^|\s)prepare-pack(?:\s|$)/m.test(helpOutput)) {
    throw new Error('当前 bkmpw 不支持发布模板流程，请安装包含 prepare-pack 的新版 bkmpw 后重试。');
  }
  releaseWorkflowChecked = true;
}

function preparePackRoot() {
  assertReleaseWorkflowAvailable();
  invokeBkmpwPackCommand('prepare-pack');
}

function exportPack(command, args = []) {
  assertReleaseWorkflowAvailable();
  const errors = [];
  validateManagedVersionReferences(errors);
  if (errors.length > 0) throw new Error(errors.join('\n'));
  if (command !== 'export-server-installer') generateManifest();
  invokeBkmpwPackCommand(command, args);
}

function testRepository() {
  writeSuccess(`node: ${process.version}`);

  const npmVersion = getNpmVersion();
  if (npmVersion) writeSuccess(`npm: ${npmVersion}`);
  else writeFail('未找到 npm。请先安装 Node.js LTS，并确认 npm 已加入 PATH。');

  const bkmpwVersion = getBkmpwVersion();
  if (bkmpwVersion) writeSuccess(`bkmpw: ${bkmpwVersion}`);
  else
    writeFail(
      `未找到 bkmpw。请运行 devtool.bat setup-tools 或 npm install -g ${globalPackageName}`
    );

  const required = [
    'pack/pack.toml',
    'pack/icon.png',
    'pack/server-icon.png',
    'pack/start.bat',
    'pack/start.sh',
    'pack/variables.txt',
    'pack.toml',
    'index.toml',
    '.packwizignore',
    '.gitignore',
    'package.json',
    'package-lock.json',
    '.husky/pre-commit',
  ];

  for (const relative of required) {
    const fullPath = path.join(repoRoot, ...relative.split('/'));
    if (fs.existsSync(fullPath)) writeSuccess(`已找到 ${relative}`);
    else writeFail(`缺少 ${relative}`);
  }

  testPackStructure();
}

function generateManifest() {
  generateIntegrityManifest({
    repoRoot,
    targetPath: integrityManifestPath,
    writeInfo,
    writeSuccess,
    writeWarn,
    writeFail,
  });
}

const packVersionPattern = /^v\d+\.\d+\.\d+\.\d+(?:-test\d+|-test-build-\d+)?$/;
const versionTargets = [
  {
    relative: 'pack/pack.toml',
    pattern: /^(version = ")[^"]*(")/m,
    replace: (version) => `$1${version}$2`,
  },
  {
    relative: 'config/bcc-common.toml',
    pattern: /^(\s*modpackVersion = ")[^"]*(")/m,
    replace: (version) => `$1${version}$2`,
  },
  {
    relative: 'config/fancymenu/options.txt',
    pattern: /^(S:custom_window_title = ')([^']*)(';)/m,
    replace: (version) => (_match, head, title, tail) =>
      `${head}${title.replace(/-v\d+\.\d+\.\d+\.\d+(?:-test\d+|-test-build-\d+)?$/, '')}-${version}${tail}`,
  },
];

function setVersion(args) {
  const [version] = args;
  if (!version) throw new Error('用法：set-version <vA.B.C.D[-testN]>');
  if (!packVersionPattern.test(version)) {
    throw new Error(`版本号 ${version} 不符合 vA.B.C.D 或 vA.B.C.D-testN 格式（CI 构建可用 -test-build-N）`);
  }
  const updates = versionTargets.map((target) => {
    const filePath = path.join(repoRoot, target.relative);
    const text = fs.readFileSync(filePath, 'utf8');
    if (!target.pattern.test(text)) {
      throw new Error(`${target.relative} 中找不到版本字段`);
    }
    const replacement = target.replace(version);
    const next = text.replace(target.pattern, replacement);
    return { relative: target.relative, filePath, text, next };
  });
  for (const { relative, filePath, text, next } of updates) {
    if (next === text) {
      writeInfo(`${relative} 已是 ${version}`);
      continue;
    }
    fs.writeFileSync(filePath, next);
    writeSuccess(`${relative} -> ${version}`);
  }
}

function splitArgs(raw) {
  return raw.trim().split(/\s+/).filter(Boolean);
}

async function readLine(rl, prompt) {
  return (await rl.question(prompt)).trim();
}

async function readBkmpwExtraArgs(rl, prompt = '额外 bkmpw 参数，留空表示无') {
  const raw = await readLine(rl, `${prompt}: `);
  return raw ? splitArgs(raw) : [];
}

async function pauseMenu(rl) {
  console.log('');
  await rl.question('按 Enter 继续');
}

function showMenuHeader() {
  console.clear();
  console.log(color(36, 'Create Delight Project Rebirth 开发工具'));
  console.log(color(90, `仓库路径：${repoRoot}`));

  const version = getBkmpwVersion();
  if (version) {
    console.log(color(32, `bkmpw：${version}`));
    writeBkmpwMenuUpdateLine(getCachedBkmpwUpdateStatus(version));
    startMenuBkmpwUpdateCheck(version);
  } else console.log(color(33, 'bkmpw：未安装'));

  console.log('');
}

function writeBkmpwMenuUpdateLine(status) {
  if (status.state === 'outdated') {
    console.log(
      color(
        33,
        `bkmpw 可更新：当前 ${status.localVersion}，最新 ${status.latestVersion}。请选择 S 安装/更新。`
      )
    );
  } else if (status.state === 'current') {
    console.log(color(32, `bkmpw 已是最新版本：${status.localVersion}`));
  } else if (status.state === 'checking') {
    console.log(color(36, 'bkmpw 最新版本：检查中，不影响菜单使用。'));
  } else {
    console.log(color(33, 'bkmpw 最新版本检查失败。网络不可用时可忽略此提示。'));
  }
}

function startMenuBkmpwUpdateCheck(localVersion) {
  if (!process.stdout.isTTY || cachedLatestBkmpwPackageVersion !== undefined) return;

  getLatestBkmpwPackageVersion().then((latestVersion) => {
    if (menuBkmpwUpdateNoticeShown) return;
    menuBkmpwUpdateNoticeShown = true;

    const status = getBkmpwUpdateStatus(localVersion, latestVersion);
    console.log('');
    writeBkmpwMenuUpdateLine(status);
    console.log('');
  });
}

async function startDevMenu() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    while (true) {
      showMenuHeader();
      console.log('  S. 安装/更新全局 bkmpw 工具');
      console.log('  P. 生成/刷新根目录发布文件');
      console.log('  T. 打开 bkmpw 全屏 TUI（退出后返回终端）');
      console.log('  1. 检查仓库结构');
      console.log('  2. 刷新索引');
      console.log('  3. 查看文件列表');
      console.log('  4. 更新全部外部文件');
      console.log('  5. 更新单个外部文件');
      console.log('  6. 添加 CurseForge 项目');
      console.log('  7. 添加直链 URL');
      console.log('  8. 添加 GitHub Release 项目');
      console.log(color(33, '  9. 移除管理文件'));
      console.log(color(33, ' 10. 安装/同步托管文件到本地'));
      console.log(color(33, ' 11. 下载缺失文件到本地（不清理无关文件）'));
      console.log(' 12. 生成 modlist 清单');
      console.log(' 13. 导出客户端 CurseForge 安装包 .zip');
      console.log(' 14. 导出客户端全量包 .zip（自带 mod 文件）');
      console.log(' 15. 导出开箱即用服务端全量包 .zip');
      console.log(' 16. 导出 bkmpw 下载型服务端安装包 .zip');
      console.log(' 17. 生成完整性校验清单');
      console.log(' 18. 执行自定义 bkmpw 命令');
      console.log('  0. 退出');
      console.log('');

      const choice = await readLine(rl, '请选择: ');
      if (choice.toLowerCase() === 't') {
        rl.close();
        startTui();
        return;
      }
      try {
        switch (choice.toLowerCase()) {
          case 's':
            await setupTools();
            await pauseMenu(rl);
            break;
          case 'p':
            preparePackRoot();
            await pauseMenu(rl);
            break;
          case '1':
            testRepository();
            await pauseMenu(rl);
            break;
          case '2':
            invokeBkmpwPackCommand('refresh');
            await pauseMenu(rl);
            break;
          case '3':
            invokeBkmpwPackCommand('list');
            await pauseMenu(rl);
            break;
          case '4':
            invokeBkmpwPackCommand('update', ['--all']);
            await pauseMenu(rl);
            break;
          case '5': {
            const name = await readLine(rl, '外部文件名称: ');
            if (!name) writeWarn('未输入名称。');
            else invokeBkmpwPackCommand('update', [name]);
            await pauseMenu(rl);
            break;
          }
          case '6': {
            const project = await readLine(rl, 'CurseForge slug、URL 或项目 ID: ');
            if (!project) writeWarn('未输入项目。');
            else
              invokeBkmpwPackCommand('add-curseforge', [
                'both',
                project,
                ...(await readBkmpwExtraArgs(rl)),
              ]);
            await pauseMenu(rl);
            break;
          }
          case '7': {
            let side = await readLine(rl, 'side：client/server/both，留空使用 both: ');
            if (!side) side = 'both';
            const name = await readLine(rl, '名称: ');
            const filename = await readLine(rl, '文件名: ');
            const url = await readLine(rl, '直链下载 URL: ');
            const hash = await readLine(rl, 'sha256: ');
            if (!name || !filename || !url || !hash)
              writeWarn('名称、文件名、URL、sha256 都不能为空。');
            else invokeBkmpwPackCommand('add-url', [side, name, filename, url, hash]);
            await pauseMenu(rl);
            break;
          }
          case '8': {
            const project = await readLine(rl, 'GitHub 仓库 owner/repo 或 URL: ');
            if (!project) writeWarn('未输入项目。');
            else
              invokeBkmpwPackCommand('add-github', [
                'both',
                project,
                ...(await readBkmpwExtraArgs(rl)),
              ]);
            await pauseMenu(rl);
            break;
          }
          case '9': {
            const name = await readLine(
              rl,
              '要移除的名称或 metadata 文件，例如 create 或 mods/common/create.pw.toml: '
            );
            if (!name) writeWarn('未输入名称。');
            else {
              invokeBkmpwPackCommand('remove', [name]);
              writeWarn('已更新清单。请继续运行菜单 10，同步本地托管文件。');
            }
            await pauseMenu(rl);
            break;
          }
          case '10': {
            const attempts = await readLine(rl, '最大尝试次数，留空使用默认值: ');
            const delay = await readLine(rl, '失败后等待秒数，留空使用默认值: ');
            const args = [attempts, delay].filter(Boolean);
            updateCoreBeforeSync();
            invokeBkmpwPackCommand('install-files-headless', args);
            await pauseMenu(rl);
            break;
          }
          case '11': {
            const jobs = await readLine(rl, '下载线程数，留空使用默认值: ');
            const force = await readLine(rl, '是否覆盖已存在文件？y/N: ');
            const args = [];
            if (jobs) args.push(jobs);
            if (/^(y|yes)$/i.test(force)) args.push('--force');
            updateCoreBeforeSync();
            invokeBkmpwPackCommand('download-files', args);
            await pauseMenu(rl);
            break;
          }
          case '12': {
            const outputDir = await readLine(rl, '输出目录，留空使用 docs/generated: ');
            invokeBkmpwPackCommand('modlist', outputDir ? [outputDir] : []);
            await pauseMenu(rl);
            break;
          }
          case '13': {
            const output = await readLine(rl, '输出文件，留空使用默认值: ');
            const args = output ? [output, 'client'] : ['client'];
            exportPack('export-curseforge', args);
            await pauseMenu(rl);
            break;
          }
          case '14': {
            const output = await readLine(rl, '输出文件，留空使用默认值: ');
            const rootDir = await readLine(rl, 'zip 内实例目录名，留空使用 pack.toml name: ');
            const args = rootDir ? [output || 'client-full.zip', rootDir] : output ? [output] : [];
            exportPack('export-client', args);
            await pauseMenu(rl);
            break;
          }
          case '15': {
            const output = await readLine(rl, '输出文件，留空使用默认值: ');
            exportPack('export-server', output ? [output] : []);
            await pauseMenu(rl);
            break;
          }
          case '16': {
            const output = await readLine(rl, '输出文件，留空使用默认值: ');
            exportPack('export-server-installer', output ? [output] : []);
            await pauseMenu(rl);
            break;
          }
          case '17':
            generateManifest();
            await pauseMenu(rl);
            break;
          case '18': {
            const custom = await readBkmpwExtraArgs(rl, 'bkmpw 原生命令参数');
            if (custom.length === 0) writeWarn('未输入命令。');
            else invokeBkmpwRaw(custom);
            await pauseMenu(rl);
            break;
          }
          case '0':
            return;
          default:
            writeWarn(`未知选项：${choice}`);
            await pauseMenu(rl);
        }
      } catch (error) {
        writeFail(error.message);
        await pauseMenu(rl);
      }
    }
  } finally {
    rl.close();
  }
}

// ---------------------------------------------------------------------------
// check-hashes：push 前预检托管文件的下载地址与 hash
//
// 背景：描述符里的 hash 与 CDN 实际内容不一致时，bkmpw 会重试后报
// `error: install completed with errors` 并退出 2 —— CI 的 cache-seed 作业因此失败，
// 而失败会跳过 actions/cache 的 post-save，于是每次 push 重复同一失败（P-168）。
// 本命令把「地址可达 / 体积合理 / hash 对得上」在本地先过一遍。
// ---------------------------------------------------------------------------
const METADATA_ROOTS = [
  'mods',
  'mods/common',
  'mods/client',
  'mods/server',
  'resourcepacks',
  'shaderpacks',
];
const CURSEFORGE_CDN_PREFIXES = [
  'https://edge.forgecdn.net/files',
  'https://mediafilez.forgecdn.net/files',
];
const CHECK_HASHES_USER_AGENT = 'cdpr-devtool-check-hashes';

function parseDownloadMetadata(text) {
  const metadata = {
    filename: null,
    hashFormat: null,
    hash: null,
    url: null,
    mode: null,
    fileId: null,
    projectId: null,
  };
  let section = '';
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const header = line.match(/^\[([^\]]+)\]$/);
    if (header) {
      section = header[1];
      continue;
    }
    const entry = line.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.*)$/);
    if (!entry) continue;
    const key = entry[1];
    const quoted = entry[2].trim().match(/^"((?:[^"\\]|\\.)*)"/);
    const value = quoted ? quoted[1].replace(/\\(.)/g, '$1') : entry[2].trim();
    if (section === '' && key === 'filename') metadata.filename = value;
    else if (section === 'download') {
      if (key === 'hash-format') metadata.hashFormat = value;
      else if (key === 'hash') metadata.hash = value;
      else if (key === 'url') metadata.url = value;
      else if (key === 'mode') metadata.mode = value;
    } else if (section === 'update.curseforge') {
      if (key === 'file-id') metadata.fileId = value;
      else if (key === 'project-id') metadata.projectId = value;
    }
  }
  return metadata;
}

// 描述符只记 file-id + 文件名，下载地址要自己拼。CF 有两个 CDN 域名：
// - edge.forgecdn.net 对「作者关闭第三方分发」的文件也返回 200；
// - mediafilez.forgecdn.net 对这些文件返回 403（但历史上是默认域名）。
// 另外这两个域名对带 Range 的请求会返回 404，所以这里一律用 HEAD 探测体积。
function resolveDownloadUrls(metadata) {
  if (metadata.url) return { urls: [metadata.url], source: 'url' };
  if (metadata.fileId && metadata.filename) {
    const id = String(metadata.fileId);
    const suffix = `${id.slice(0, 4)}/${id.slice(4)}/${encodeURIComponent(metadata.filename)}`;
    return { urls: CURSEFORGE_CDN_PREFIXES.map((prefix) => `${prefix}/${suffix}`), source: 'curseforge' };
  }
  return { urls: [], source: metadata.mode ?? '(未知)' };
}

function listManagedMetadataFiles() {
  const files = new Set();
  for (const root of METADATA_ROOTS) {
    if (!fs.existsSync(path.join(repoRoot, root))) continue;
    for (const relative of walkFiles(root)) {
      if (relative.endsWith('.pw.toml')) files.add(relative);
    }
  }
  return [...files].sort();
}

function listChangedMetadataFiles(ref) {
  const pathspec = METADATA_ROOTS.filter((root) => fs.existsSync(path.join(repoRoot, root)));
  const diff = run('git', ['diff', '--name-only', '--diff-filter=ACMR', `${ref}...HEAD`, '--', ...pathspec], {
    stdio: 'pipe',
    check: false,
  });
  if (diff.status !== 0) {
    const reason = diff.error ? `无法执行 git：${diff.error.message}` : `git diff 退出码 ${diff.status}`;
    throw new Error(`无法与 ${ref} 比较（${reason}）。先 git fetch 或换一个已存在的引用。`);
  }
  const untracked = run('git', ['ls-files', '--others', '--exclude-standard', '--', ...pathspec], {
    stdio: 'pipe',
    check: false,
  });
  const lines = `${diff.stdout ?? ''}\n${untracked.stdout ?? ''}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return [...new Set(lines.filter((file) => file.endsWith('.pw.toml')))].sort();
}

const CHECK_HASHES_HEAD_TIMEOUT_MS = 20000;
const CHECK_HASHES_DOWNLOAD_TIMEOUT_MS = 180000;

async function probeRemote(urls) {
  const attempts = [];
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: { 'user-agent': CHECK_HASHES_USER_AGENT },
        redirect: 'follow',
        signal: AbortSignal.timeout(CHECK_HASHES_HEAD_TIMEOUT_MS),
      });
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? Number(contentLength) : null;
      attempts.push(`${url} -> HTTP ${response.status}`);
      if (response.ok) {
        return { ok: true, url, total, attempts };
      }
    } catch (error) {
      attempts.push(`${url} -> ${error.name === 'TimeoutError' ? `超时 ${CHECK_HASHES_HEAD_TIMEOUT_MS} ms` : error.message}`);
    }
  }
  return { ok: false, url: null, total: null, attempts };
}

async function downloadAndHash(url, hashFormat) {
  const response = await fetch(url, {
    headers: { 'user-agent': CHECK_HASHES_USER_AGENT },
    redirect: 'follow',
    signal: AbortSignal.timeout(CHECK_HASHES_DOWNLOAD_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    size: buffer.length,
    digest: createHash(hashFormat).update(buffer).digest('hex'),
  };
}

function fileHash(filePath, hashFormat) {
  return createHash(hashFormat).update(fs.readFileSync(filePath)).digest('hex');
}

function formatMegabytes(bytes) {
  if (bytes === null || bytes === undefined) return '(未知)';
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function parseCheckHashesArgs(args) {
  const options = { full: false, changed: null, only: null };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--full') options.full = true;
    else if (arg === '--changed') {
      const next = args[index + 1];
      if (next && !next.startsWith('--')) {
        options.changed = next;
        index += 1;
      } else {
        options.changed = 'origin/main';
      }
    } else if (arg.startsWith('--changed=')) {
      options.changed = arg.slice('--changed='.length);
    } else if (arg === '--only') {
      options.only = args[index + 1] ?? null;
      index += 1;
      if (!options.only) throw new Error('--only 需要一个路径片段。');
    } else if (arg.startsWith('--only=')) {
      options.only = arg.slice('--only='.length);
    } else {
      throw new Error(`未知参数：${arg}（可用：--full / --changed [git-ref] / --only <路径片段>）`);
    }
  }
  return options;
}

async function checkHashes(args) {
  const options = parseCheckHashesArgs(args);
  let targets = listManagedMetadataFiles();
  const changed = options.changed ? new Set(listChangedMetadataFiles(options.changed)) : null;
  if (changed) targets = targets.filter((file) => changed.has(file));
  if (options.only) targets = targets.filter((file) => file.includes(options.only));

  if (targets.length === 0) {
    writeInfo(
      changed
        ? `与 ${options.changed} 相比没有改动的描述符，无需预检。`
        : '没有找到可预检的描述符。'
    );
    return;
  }

  // 刚改过描述符时默认深验（数量少、代价可控）：这类场景正是「记录下来的 hash 已经不对」的高发点。
  const deepByDefault = Boolean(changed) && !options.full;
  writeInfo(
    `预检 ${targets.length} 个托管文件` +
      `${options.full ? '（--full 全量深验）' : deepByDefault ? `（--changed ${options.changed}，改动项深验）` : '（快速检查）'}`
  );

  const failures = [];
  const warnings = [];
  let deepChecked = 0;
  let index = 0;

  for (const relativePath of targets) {
    index += 1;
    const prefix = `[${index}/${targets.length}] ${relativePath}`;
    const metadata = parseDownloadMetadata(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
    const { urls, source } = resolveDownloadUrls(metadata);

    if (!metadata.filename || !metadata.hash || !metadata.hashFormat) {
      warnings.push(`${prefix} 缺少 filename/hash，跳过（source=${source}）`);
      writeWarn(`${prefix} 缺少 filename/hash，跳过`);
      continue;
    }
    if (urls.length === 0) {
      warnings.push(`${prefix} 推导不出下载地址（mode=${source}），跳过`);
      writeWarn(`${prefix} 推导不出下载地址（mode=${source}），跳过`);
      continue;
    }

    // 托管文件落点：mods/**/*.pw.toml 的 jar 都在 mods/ 下；resourcepacks / shaderpacks 的包就在自己目录。
    const localDir = relativePath.startsWith('mods/') ? 'mods' : path.dirname(relativePath);
    const localPath = path.join(repoRoot, localDir, metadata.filename);
    const localExists = fs.existsSync(localPath);
    let localSize = null;
    let localDigest = null;
    if (localExists) {
      localSize = fs.statSync(localPath).size;
      try {
        localDigest = fileHash(localPath, metadata.hashFormat);
      } catch (error) {
        warnings.push(`${prefix} 本地文件读取失败：${error.message}`);
      }
    }

    const remote = await probeRemote(urls);
    if (!remote.ok) {
      failures.push(`${prefix} 下载地址不可达（${remote.attempts.join('；')}）`);
      writeFail(`${prefix} 下载地址不可达（${remote.attempts.join('；')}）`);
      continue;
    }
    const remoteUrl = remote.url;

    // 本地文件与描述符对不上时也深验：可能是本地还没 install-files（正常），
    // 也可能是描述符里的 hash 本身就写错了（要让预检拦住的那种）。
    const localMismatch = Boolean(localDigest) && localDigest !== metadata.hash;
    const needDeep =
      options.full ||
      deepByDefault ||
      localMismatch ||
      !localExists ||
      (remote.total !== null && localSize !== null && remote.total !== localSize);
    if (needDeep) {
      deepChecked += 1;
      let downloaded;
      try {
        downloaded = await downloadAndHash(remoteUrl, metadata.hashFormat);
      } catch (error) {
        failures.push(`${prefix} 下载失败：${error.message}`);
        writeFail(`${prefix} 下载失败：${error.message}`);
        continue;
      }
      if (localMismatch) {
        writeWarn(`${prefix} 本地文件与描述符不一致（本地 ${localDigest.slice(0, 12)}…），已改用深验判定`);
      }
      if (downloaded.digest !== metadata.hash) {
        failures.push(
          `${prefix} hash 不一致：描述符 ${metadata.hash} ≠ 远端 ${downloaded.digest}（${formatMegabytes(downloaded.size)}）`
        );
        writeFail(
          `${prefix} hash 不一致：描述符 ${metadata.hash.slice(0, 12)}… ≠ 远端 ${downloaded.digest.slice(0, 12)}…`
        );
        continue;
      }
      writeSuccess(`${prefix} 深验通过 ${metadata.hashFormat}=${downloaded.digest.slice(0, 12)}… ${formatMegabytes(downloaded.size)}`);
      continue;
    }

    const problems = [];
    if (remote.total !== null && localSize !== null && remote.total !== localSize) {
      problems.push(`远端体积 ${formatMegabytes(remote.total)} ≠ 本地 ${formatMegabytes(localSize)}`);
    }
    if (problems.length > 0) {
      warnings.push(`${prefix} ${problems.join('；')}`);
      writeWarn(`${prefix} ${problems.join('；')}`);
    } else {
      writeInfo(`${prefix} OK（远端 ${formatMegabytes(remote.total)}，本地 hash 一致）`);
    }
  }

  console.log('');
  for (const warning of warnings) writeWarn(warning);
  for (const failure of failures) writeFail(failure);
  if (failures.length > 0) {
    writeFail(`预检失败：${failures.length} 个文件有问题（深验 ${deepChecked}/${targets.length}）。`);
    process.exit(1);
  }
  writeSuccess(
    `预检通过：${targets.length} 个文件（深验 ${deepChecked}）${warnings.length > 0 ? `，${warnings.length} 条提醒` : ''}。`
  );
}

async function dispatch(command, rest) {
  switch (command) {
    case 'help':
      showHelp();
      break;
    case 'menu':
      await startDevMenu();
      break;
    case 'tui':
      startTui();
      break;
    case 'setup-tools':
      await setupTools();
      break;
    case 'prepare-pack':
      preparePackRoot();
      break;
    case 'check':
      testRepository();
      break;
    case 'refresh':
      invokeBkmpwPackCommand('refresh', rest);
      break;
    case 'list':
      invokeBkmpwPackCommand('list', rest);
      break;
    case 'update':
      invokeBkmpwPackCommand('update', rest);
      break;
    case 'add-curseforge':
      invokeBkmpwPackCommand('add-curseforge', ['both', ...rest]);
      invokeBkmpwPackCommand('refresh');
      break;
    case 'add-url':
      invokeBkmpwPackCommand('add-url', rest);
      invokeBkmpwPackCommand('refresh');
      break;
    case 'add-github':
      invokeBkmpwPackCommand('add-github', ['both', ...rest]);
      invokeBkmpwPackCommand('refresh');
      break;
    case 'remove-mod':
      invokeBkmpwPackCommand('remove', rest);
      invokeBkmpwPackCommand('refresh');
      writeWarn('已更新清单。请继续运行 devtool.bat install-files，同步本地托管文件。');
      break;
    case 'install-files':
    case 'install-files-headless':
      updateCoreBeforeSync();
      invokeBkmpwPackCommand('install-files-headless', rest);
      break;
    case 'install-files-retry':
      updateCoreBeforeSync();
      invokeBkmpwPackCommand('install-files-retry', rest);
      break;
    case 'download-files':
      updateCoreBeforeSync();
      invokeBkmpwPackCommand('download-files', rest);
      break;
    case 'modlist':
      invokeBkmpwPackCommand('modlist', rest);
      break;
    case 'generate-integrity-manifest':
      generateManifest();
      break;
    case 'check-hashes':
      await checkHashes(rest);
      break;
    case 'set-version':
      setVersion(rest);
      break;
    case 'export-client':
      exportPack('export-client', rest);
      break;
    case 'export-curseforge':
      exportPack('export-curseforge', rest);
      break;
    case 'export-server':
      exportPack('export-server', rest);
      break;
    case 'export-server-installer':
      exportPack('export-server-installer', rest);
      break;
    default:
      throw new Error(`未知命令：${command}`);
  }
}

process.chdir(repoRoot);

const [maybeCommand, ...rest] = process.argv.slice(2);
const command = maybeCommand ?? 'menu';
if (!commands.has(command)) {
  writeFail(`未知命令：${command}`);
  showHelp();
  process.exit(2);
}

try {
  await dispatch(command, rest);
} catch (error) {
  writeFail(error.message);
  if (
    command === 'menu' ||
    process.argv.length <= 2 ||
    process.env.CDPR_DEVTOOL_LAUNCHED_BY_BAT === '1'
  ) {
    console.error('');
    console.error(`Devtool exited with code: 1`);
  }
  process.exit(1);
}
