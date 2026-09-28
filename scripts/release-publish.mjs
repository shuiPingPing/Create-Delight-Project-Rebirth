#!/usr/bin/env node
/**
 * 把 CI 建好的「草稿 Release」发布出去（不依赖 gh CLI，直接走 GitHub REST API）。
 *
 * 用法：
 *   GITHUB_TOKEN=<有 repo 权限的 token> node scripts/release-publish.mjs --tag v0.1.0
 *   GITHUB_REPOSITORY=owner/repo GITHUB_TOKEN=... node scripts/release-publish.mjs --tag v0.1.0 --dry-run
 *
 * 说明：
 *   - **维护者要求：GitHub Release 一律作为「预发布 / 测试版」**，不写「正式版」；
 *     本脚本发布时固定 `prerelease = true`，并且如果发现某个已发布的 Release 被标成了正式版，
 *     会自动改回预发布（`--dry-run` 时只报告不改）。
 *   - tag 必须是已存在的 Release（CI 的「发布版本」workflow 会先建**草稿**）。
 *   - 会检查资产齐不齐（至少 Client / Server / ServerInstaller 三份，另附 ModList 清单）。
 *   - token 也可以用 --token 传；仓库名也可以用 --repo 传。
 */

import process from 'node:process';

function parseArgs(argv) {
  const args = {
    tag: '',
    repo: process.env.GITHUB_REPOSITORY ?? '',
    token: process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? '',
    stableRequested: false,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--tag') args.tag = argv[++i] ?? '';
    else if (key === '--repo') args.repo = argv[++i] ?? '';
    else if (key === '--token') args.token = argv[++i] ?? '';
    else if (key === '--prerelease') continue; // 已经是默认行为，保留参数只为兼容旧命令
    else if (key === '--no-prerelease' || key === '--stable') args.stableRequested = true;
    else if (key === '--dry-run') args.dryRun = true;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (args.stableRequested) {
  console.error('本仓库的 Release 一律是预发布（测试版）：不支持 --no-prerelease / --stable');
  process.exit(2);
}
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
  if (release.prerelease) {
    console.log('该 Release 已经是公开发布状态，且已是预发布（测试版）✓');
    console.log(release.html_url);
    process.exit(0);
  }
  console.log('该 Release 已公开发布但被标成了「正式版」，按维护者要求改回预发布（测试版）');
  if (args.dryRun) {
    console.log('--dry-run：不做任何修改');
    process.exit(0);
  }
  const fixed = await request('PATCH', `${api}/releases/${release.id}`, { prerelease: true });
  console.log(`已改为预发布：${fixed.html_url}（prerelease=${fixed.prerelease}）`);
  process.exit(0);
}

if (args.dryRun) {
  console.log('--dry-run：不做任何修改');
  process.exit(0);
}

// 维护者要求：GitHub Release 一律作为「预发布 / 测试版」，不写「正式版」
const published = await request('PATCH', `${api}/releases/${release.id}`, { draft: false, prerelease: true });
console.log(`已发布（预发布 / 测试版）：${published.html_url}（draft=${published.draft} prerelease=${published.prerelease}）`);
