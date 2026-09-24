#!/usr/bin/env node
/**
 * 生成 GitHub Release 的更新说明（Markdown，输出到 stdout）。
 *
 * 用法：
 *   node scripts/release-notes.mjs --to v0.2.0 [--from v0.1.0] [--version v0.2.0] [--repo owner/name]
 *
 * 说明：
 *   - --to 默认 HEAD；--from 默认「to 之前最近的 tag」（git describe --tags --abbrev=0 <to>^）。
 *   - 没有上一个 tag 时（首个版本）只列全部提交，不生成 compare 链接。
 *   - 提交按 conventional-commit 前缀分组，未识别的前缀归入「其他」。
 *   - 与上游 CDR1201 的发布说明保持同样的分组风格（中文小标题 + `[类型] 描述`）。
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');

function parseArgs(argv) {
  const args = { to: 'HEAD', from: '', version: '', repo: process.env.GITHUB_REPOSITORY ?? '' };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--to') args.to = argv[++i] ?? 'HEAD';
    else if (key === '--from') args.from = argv[++i] ?? '';
    else if (key === '--version') args.version = argv[++i] ?? '';
    else if (key === '--repo') args.repo = argv[++i] ?? '';
  }
  return args;
}

function git(gitArgs) {
  return execFileSync('git', gitArgs, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

function tryGit(gitArgs) {
  try {
    return git(gitArgs);
  } catch {
    return '';
  }
}

const args = parseArgs(process.argv.slice(2));

let from = args.from;
if (!from) {
  const previous = tryGit(['describe', '--tags', '--abbrev=0', `${args.to}^`]);
  from = previous || tryGit(['describe', '--tags', '--abbrev=0', args.to]);
  if (from === args.to) from = '';
}

const range = from ? `${from}..${args.to}` : args.to;
const raw = git(['log', range, '--no-merges', '--pretty=format:%s%x1f%h']);
const commits = raw
  ? raw
      .split('\n')
      .map((line) => line.split('\u001f'))
      .filter((parts) => parts.length === 2)
      .map(([subject, hash]) => ({ subject: subject.trim(), hash }))
  : [];

const GROUPS = [
  { key: 'feat', title: '新内容' },
  { key: 'fix', title: '修复' },
  { key: 'conf', title: '配置' },
  { key: 'quest', title: '任务书' },
  { key: 'mod', title: '模组' },
  { key: 'docs', title: '文档' },
  { key: 'perf', title: '性能' },
  { key: 'refactor', title: '重构' },
  { key: 'chore', title: '杂项' },
  { key: 'test', title: '测试' },
  { key: 'build', title: '构建' },
  { key: 'ci', title: 'CI' },
  { key: 'style', title: '格式' },
];
const VERSION_BUMP = /^\[?(feat|chore)?\]?\s*v?\d+\.\d+\.\d+(\.\d+)?(-test)?\s*(正式版|测试版)?\s*版本更新/;

const buckets = new Map(GROUPS.map((group) => [group.key, []]));
const others = [];
for (const commit of commits) {
  if (VERSION_BUMP.test(commit.subject)) continue;
  const match = commit.subject.match(/^([a-z]+)(\([^)]*\))?!?:\s*(.+)$/);
  const type = match ? match[1] : '';
  const scope = match && match[2] ? match[2] : '';
  const text = match ? match[3] : commit.subject;
  const entry = `${scope ? `**${scope.slice(1, -1)}** ` : ''}${text} (\`${commit.hash}\`)`;
  if (buckets.has(type)) buckets.get(type).push(entry);
  else others.push(`${commit.subject} (\`${commit.hash}\`)`);
}

const lines = [];
lines.push('## 更新内容');
lines.push('');
if (!commits.length) {
  lines.push('- 本次没有可列出的提交。');
  lines.push('');
}
for (const group of GROUPS) {
  const items = buckets.get(group.key);
  if (!items.length) continue;
  lines.push(`### ${group.title}`);
  lines.push('');
  for (const item of items) lines.push(`- ${item}`);
  lines.push('');
}
if (others.length) {
  lines.push('### 其他');
  lines.push('');
  for (const item of others) lines.push(`- ${item}`);
  lines.push('');
}

lines.push('## 下载说明');
lines.push('');
lines.push('- `Client-*.zip`：客户端全量包，自带客户端/通用模组本体，解压到实例根目录即可。');
lines.push('- `Server-*.zip`：开箱即用服务端全量包，模组已随包。');
lines.push('- `ServerInstaller-*.zip`：下载型服务端安装包，解压后运行 `install-server.bat` / `install-server.sh` 按需下载。');
lines.push('- `ModList-*.md` / `.csv`：本版本模组清单，方便核对。');
lines.push('');

if (args.repo && from) {
  lines.push(`**完整对比**: https://github.com/${args.repo}/compare/${from}...${args.to}`);
  lines.push('');
} else if (args.repo) {
  lines.push(`**版本**: https://github.com/${args.repo}/releases/tag/${args.to}`);
  lines.push('');
}

process.stdout.write(lines.join('\n'));
