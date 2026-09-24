#!/usr/bin/env node
/**
 * 读取 pack/pack.toml 里的整合包名与版本号，输出 GitHub Actions 可用的 key=value。
 *
 * 用法：
 *   node scripts/release-meta.mjs                       # 打印 name=... version=... minecraft=... neoforge=...
 *   node scripts/release-meta.mjs >> "$GITHUB_OUTPUT"    # 直接写进 step 输出
 *   node scripts/release-meta.mjs --ref v0.2.0-test      # 指定 tag/分支名，按上游规则推导实际发布版本
 *
 * 版本规则（与上游 CDR1201 一致）：
 *   - tag 结尾 -test        -> 直接用 tag 作为版本（预发布）
 *   - 分支名以 test- 开头    -> 版本追加 -test-build-<run_number>（用 GITHUB_RUN_NUMBER，本地可传 --run-number）
 *   - 其它情况（含正式 tag）  -> 用 pack/pack.toml 里的 version
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');

function parseArgs(argv) {
  const args = { ref: process.env.GITHUB_REF_NAME ?? '', runNumber: process.env.GITHUB_RUN_NUMBER ?? '' };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--ref') args.ref = argv[++i] ?? '';
    else if (key === '--run-number') args.runNumber = argv[++i] ?? '';
    else if (key === '--pack') args.pack = argv[++i] ?? '';
  }
  return args;
}

function readPackToml(file) {
  const text = fs.readFileSync(file, 'utf8');
  const pick = (key) => {
    const match = text.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`, 'm'));
    return match ? match[1] : '';
  };
  const pickVersion = (key) => {
    const versionsBlock = text.match(/\[versions\]([\s\S]*?)(?:\n\[|$)/);
    if (!versionsBlock) return '';
    const match = versionsBlock[1].match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`, 'm'));
    return match ? match[1] : '';
  };
  return {
    name: pick('name'),
    version: pick('version'),
    minecraft: pickVersion('minecraft'),
    neoforge: pickVersion('neoforge'),
  };
}

const args = parseArgs(process.argv.slice(2));
const packFile = args.pack ? path.resolve(args.pack) : path.join(repoRoot, 'pack', 'pack.toml');

if (!fs.existsSync(packFile)) {
  console.error(`找不到 ${path.relative(repoRoot, packFile)}`);
  process.exit(1);
}

const meta = readPackToml(packFile);
if (!meta.name || !meta.version) {
  console.error('pack/pack.toml 缺少 name 或 version');
  process.exit(1);
}

let version = meta.version;
if (args.ref && args.ref.endsWith('-test')) {
  version = args.ref;
} else if (args.ref.startsWith('test-')) {
  version = `${meta.version}-test-build-${args.runNumber || '0'}`;
}

if (args.ref && /^v/.test(args.ref) && args.ref !== version) {
  console.error(
    `::warning::tag ${args.ref} 与 pack/pack.toml 的 version（${meta.version}）不一致，发布版本按 tag 记为 ${version}`
  );
}

process.stdout.write(`name=${meta.name}\n`);
process.stdout.write(`version=${version}\n`);
process.stdout.write(`pack_version=${meta.version}\n`);
process.stdout.write(`minecraft=${meta.minecraft}\n`);
process.stdout.write(`neoforge=${meta.neoforge}\n`);
if (version !== meta.version) process.stdout.write(`is_prerelease=true\n`);
else process.stdout.write(`is_prerelease=false\n`);
