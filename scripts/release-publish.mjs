#!/usr/bin/env node
/**
 * 把 CI 建好的「草稿 Release」发布出去（不依赖 gh CLI，直接走 GitHub REST API）。
 *
 * 用法：
 *   GITHUB_TOKEN=<有 repo 权限的 token> node scripts/release-publish.mjs --tag v0.1.0
 *   GITHUB_REPOSITORY=owner/repo node scripts/release-publish.mjs --tag v0.1.0 --prerelease
 *   node scripts/release-publish.mjs --tag v0.1.0 --dry-run      # 只检查，不改状态
 *
 * 说明：
 *   - tag 必须是已存在的**草稿** Release（CI 的「发布版本」workflow 会建）；
 *     已公开发布的 Release 不会被覆盖，直接报错。
 *   - 会检查资产齐不齐（至少 Client/Server/ServerInstaller 三份；CurseForge 那份可选）。
 *   - token 也可以用 --token 传；仓库名也可以用 --repo 传。
 */

import process from 'node:process';

function parseArgs(argv) {
  const args = {
    tag: '',
    repo: process.env.GITHUB_REPOSITORY ?? '',
    token: process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? '',
    prerelease: null,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--tag') args.tag = argv[++i] ?? '';
    else if (key === '--repo') args.repo = argv[++i] ?? '';
    else if (key === '--token') args.token = argv[++i] ?? '';
    else if (key === '--prerelease') args.prerelease = true;
    else if (key === '--no-prerelease') args.prerelease = false;
    else if (key === '--dry-run') args.dryRun = true;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.tag) {
  console.error('缺少 --tag');
  process.exit(2);
}
if (!args.repo) {
  console.error('缺少仓库名（--repo 或 GITHUB_REPOSITORY）');
  process.exit(2);
}
if (!args.token) {
  console.error('缺少 token（--token 或 GITHUB_TOKEN / GH_TOKEN）');
  process.exit(2);
}

const api = `https://api.github.com/repos/${args.repo}`;
const headers = {
  authorization: `Bearer ${args.token}`,
  accept: 'application/vnd.github+json',
  'user-agent': 'cdpr-release-publish',
  'content-type': 'application/json',
};

async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${url} -> HTTP ${res.status}: ${typeof json === 'string' ? json : JSON.stringify(json)}`);
  }
  return json;
}

const release = await request('GET', `${api}/releases/tags/${encodeURIComponent(args.tag)}`);
const assets = release.assets ?? [];
console.log(`找到 ${args.tag}: draft=${release.draft} prerelease=${release.prerelease} assets=${assets.length}`);
for (const asset of assets) {
  console.log(`  - ${asset.name}  ${(asset.size / 1024 / 1024).toFixed(1)} MB`);
}

const required = ['Client-', 'Server-', 'ServerInstaller-'];
const optional = ['ModList-'];
const missing = required.filter((prefix) => !assets.some((a) => a.name.startsWith(prefix)));
if (missing.length) {
  console.error(`::error::缺少必要资产：${missing.join(', ')}`);
  process.exit(1);
}
for (const prefix of optional) {
  if (!assets.some((a) => a.name.startsWith(prefix))) {
    console.warn(`::warning::没有 ${prefix}* 资产`);
  }
}

if (!release.draft) {
  console.log('该 Release 已经是公开发布状态，无需处理');
  console.log(release.html_url);
  process.exit(0);
}

if (args.dryRun) {
  console.log('--dry-run：不做任何修改');
  process.exit(0);
}

const payload = { draft: false };
if (args.prerelease !== null) payload.prerelease = args.prerelease;
const published = await request('PATCH', `${api}/releases/${release.id}`, payload);
console.log(`已发布：${published.html_url}（prerelease=${published.prerelease}）`);
