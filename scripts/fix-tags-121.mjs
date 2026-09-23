// 修 kubejs/data/*/tags/** 里在 1.21.1 已经不成立的条目：
//   1) `#forge:*` 引用改写到 1.21 的 `c:*` 通用标签（表见 REMAP；没对应项的整条删掉）；
//   2) 引用未安装 mod 的条目删掉（这些条目只会让标签空转，且日志里查不出问题）。
// 只动 kubejs/data 下我们自己的标签文件；备份到 _dsh_tmp/tags-bak/。
//
// 用法：node scripts/fix-tags-121.mjs [--apply] [--refresh]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { OURS, loadNamespaceIndex } from './lib/mod-namespaces.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..')
const DATA = path.join(REPO, 'kubejs', 'data')
const TMP = path.resolve(REPO, '..', '_dsh_tmp')
const BAK = path.join(TMP, 'tags-bak')

const argv = process.argv.slice(2)
const APPLY = argv.includes('--apply')
const REFRESH = argv.includes('--refresh')

// 1.20.1 `forge:` → 1.21 `c:` 的定向改写；值为 null 表示没有对应标签，整条删除
const REMAP = new Map([
  ['forge:fruits/grape', 'c:fruits/grape'],
  ['forge:fruits/strawberry', 'c:foods/strawberry'],
  ['forge:sausage', 'c:sausage'],
  ['forge:jams', null],
])

const nsIndex = loadNamespaceIndex(REPO, TMP, { refresh: REFRESH, log: (m) => console.error(m) })
const NS = new Set(nsIndex.namespaces)
const nsExists = (ns) => NS.has(ns.toLowerCase()) || OURS.has(ns.toLowerCase())

function* walkTags() {
  for (const ns of fs.readdirSync(DATA)) {
    const tdir = path.join(DATA, ns, 'tags')
    if (!fs.existsSync(tdir) || !fs.statSync(tdir).isDirectory()) continue
    for (const sub of fs.readdirSync(tdir)) {
      const sdir = path.join(tdir, sub)
      if (!fs.statSync(sdir).isDirectory()) continue
      for (const rel of fs.readdirSync(sdir, { withFileTypes: true, recursive: true })) {
        if (!rel.isFile() || !rel.name.endsWith('.json')) continue
        const abs = path.join(rel.parentPath ?? rel.path, rel.name)
        yield { abs, rel: path.relative(REPO, abs).replaceAll('\\', '/') }
      }
    }
  }
}

const idOf = (entry) => (typeof entry === 'string' ? entry : typeof entry?.id === 'string' ? entry.id : typeof entry?.tag === 'string' ? '#' + entry.tag : null)
// 保持条目原有形状（`"id": "#c:x"` 或 `"tag": "c:x"`），只换标签名
const withId = (entry, id) => {
  if (typeof entry === 'string') return id
  const out = {}
  for (const [k, v] of Object.entries(entry)) {
    if (k === 'id' || k === 'tag') out[k] = k === 'id' ? id : id.replace(/^#/, '')
    else out[k] = v
  }
  return out
}

const report = []
let changedFiles = 0
let removed = 0
let remapped = 0
const byNs = new Map()

for (const f of walkTags()) {
  const raw = fs.readFileSync(f.abs, 'utf8')
  let json
  try {
    json = JSON.parse(raw)
  } catch (e) {
    report.push({ file: f.rel, error: `JSON 非法: ${e.message}` })
    continue
  }
  if (!Array.isArray(json.values)) continue
  const kept = []
  const notes = []
  for (const entry of json.values) {
    const id = idOf(entry)
    if (id == null) {
      kept.push(entry)
      notes.push(`保留（看不懂的条目）: ${JSON.stringify(entry)}`)
      continue
    }
    const bare = id.startsWith('#') ? id.slice(1) : id
    if (REMAP.has(bare)) {
      const to = REMAP.get(bare)
      if (to === null) {
        removed++
        notes.push(`删 ${id}（1.21 无对应 c: 标签）`)
        continue
      }
      remapped++
      notes.push(`改 ${id} → #${to}`)
      kept.push(withId(entry, '#' + to))
      continue
    }
    const ns = bare.slice(0, bare.indexOf(':'))
    if (!nsExists(ns)) {
      removed++
      byNs.set(ns, (byNs.get(ns) ?? 0) + 1)
      notes.push(`删 ${id}（未安装 ${ns}）`)
      continue
    }
    kept.push(entry)
  }
  if (!notes.length) continue
  json.values = kept
  changedFiles++
  report.push({ file: f.rel, notes, left: kept.length })
  if (APPLY) {
    const dst = path.join(BAK, f.rel.slice('kubejs/'.length))
    fs.mkdirSync(path.dirname(dst), { recursive: true })
    if (!fs.existsSync(dst)) fs.copyFileSync(f.abs, dst)
    fs.writeFileSync(f.abs, JSON.stringify(json, null, 2) + '\n')
  }
}

console.log(`${APPLY ? '已应用' : '干跑'}：涉及 ${changedFiles} 个文件，删除 ${removed} 条，改写 ${remapped} 条`)
if (byNs.size) {
  console.log('删除条目按未安装命名空间：')
  for (const [ns, n] of [...byNs].sort((a, b) => b[1] - a[1])) console.log(`  ${ns.padEnd(24)} ${n}`)
}
console.log('')
for (const r of report) {
  if (r.error) {
    console.log(`!! ${r.file}: ${r.error}`)
    continue
  }
  console.log(`${r.file}  (剩 ${r.left} 条)`)
  for (const n of r.notes.slice(0, 6)) console.log(`    ${n}`)
  if (r.notes.length > 6) console.log(`    … 另 ${r.notes.length - 6} 条`)
}
if (APPLY) console.log(`\n备份：${BAK}`)
