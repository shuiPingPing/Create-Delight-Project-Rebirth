// 审计 kubejs/data/*/tags/** 下的标签文件在 1.21.1 环境下是否仍然"有话可说"：
//   1) 标签自身的命名空间是否还装着对应 mod（命名空间不存在 → 这个标签没人会读）；
//   2) 标签值里引用的命名空间 / 标签是否还存在（引用了没装的 mod → 该条目恒为空）；
//   3) 残留的 1.20.1 时代 `forge:` 命名空间（1.21 已改为 `c:`）以及 `#forge:*` 引用；
//   4) tags/ 下的旧复数子目录（items/blocks/fluids → item/block/fluid，1.21 会整目录忽略）。
//
// 命名空间索引由 mods/*.jar + mods/*/*.jar 的条目名现场统计（只读条目名，不读内容），
// 缓存到 _dsh_tmp/ns-index.json；`--refresh` 强制重建。
//
// 用法：node scripts/audit-tags.mjs [--refresh] [--json]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { OURS, loadNamespaceIndex } from './lib/mod-namespaces.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..')
const DATA = path.join(REPO, 'kubejs', 'data')
const TMP = path.resolve(REPO, '..', '_dsh_tmp')
const NS_CACHE = path.join(TMP, 'ns-index.json')

const argv = process.argv.slice(2)
const REFRESH = argv.includes('--refresh')
const AS_JSON = argv.includes('--json')

// 1.21 合法的 tags/ 子目录；其余（含旧复数）会被整目录忽略
const VALID_TAG_SUB = new Set(['item', 'block', 'fluid', 'entity_type', 'game_event', 'worldgen', 'banner_pattern', 'painting_variant', 'enchantment', 'instrument', 'point_of_interest_type', 'structure', 'damage_type'])
const LEGACY_TAG_SUB = new Map([['items', 'item'], ['blocks', 'block'], ['fluids', 'fluid'], ['entity_types', 'entity_type'], ['game_events', 'game_event']])

let nsIndex = loadNamespaceIndex(REPO, TMP, { refresh: REFRESH, log: AS_JSON ? () => {} : (m) => console.error(m) })
const NS = new Set(nsIndex.namespaces)
const nsExists = (ns) => NS.has(ns.toLowerCase()) || OURS.has(ns.toLowerCase())

// 收集 kubejs/data 下所有标签文件
function* walkTags() {
  if (!fs.existsSync(DATA)) return
  for (const ns of fs.readdirSync(DATA)) {
    const tdir = path.join(DATA, ns, 'tags')
    if (!fs.existsSync(tdir) || !fs.statSync(tdir).isDirectory()) continue
    for (const sub of fs.readdirSync(tdir)) {
      const sdir = path.join(tdir, sub)
      if (!fs.statSync(sdir).isDirectory()) continue
      for (const rel of fs.readdirSync(sdir, { withFileTypes: true, recursive: true })) {
        if (!rel.isFile() || !rel.name.endsWith('.json')) continue
        const abs = path.join(rel.parentPath ?? rel.path, rel.name)
        yield { ns, sub, abs, rel: path.relative(REPO, abs).replaceAll('\\', '/') }
      }
    }
  }
}

const rows = []
const deadRefs = new Map() // "ns:name" -> {kind, ns, files:Set}
const legacySubFiles = []
const forgeSelf = []
let files = 0
let entries = 0

function noteRef(key, kind, file) {
  let r = deadRefs.get(key)
  if (!r) deadRefs.set(key, (r = { kind, files: new Set() }))
  if (r.files.size < 8) r.files.add(file)
}

function collectValues(node, out) {
  if (Array.isArray(node)) return node.forEach((x) => collectValues(x, out))
  if (node && typeof node === 'object') {
    if (typeof node.id === 'string') out.push(node.id)
    else if (typeof node.tag === 'string') out.push('#' + node.tag)
    else if (typeof node.values !== 'undefined') collectValues(node.values, out)
    return
  }
  if (typeof node === 'string') out.push(node)
}

for (const f of walkTags()) {
  files++
  const modern = LEGACY_TAG_SUB.get(f.sub)
  const tagType = modern ?? f.sub
  const ownId = `${f.ns}:${f.rel.split('/tags/')[1].replace(/\.json$/, '')}`
  const row = { file: f.rel, ownId, tagType, valid: VALID_TAG_SUB.has(f.sub), legacySub: modern ?? null, missingNs: false, badRefs: [] }
  if (modern) legacySubFiles.push(row)
  if (!nsExists(f.ns)) row.missingNs = true
  if (f.ns === 'forge') forgeSelf.push(row)
  let j = null
  try {
    j = JSON.parse(fs.readFileSync(f.abs, 'utf8'))
  } catch (e) {
    row.badRefs.push(`INVALID_JSON:${e.message}`)
    rows.push(row)
    continue
  }
  const vals = []
  collectValues(j.values ?? j, vals)
  for (const raw of vals) {
    entries++
    const isRef = raw.startsWith('#')
    const id = isRef ? raw.slice(1) : raw
    if (!/^[a-z0-9_.\-]+:[a-z0-9_./\-]+$/i.test(id)) {
      row.badRefs.push(`MALFORMED:${raw}`)
      noteRef(`MALFORMED:${raw}`, 'malformed', f.rel)
      continue
    }
    const ns = id.slice(0, id.indexOf(':')).toLowerCase()
    if (ns === 'forge') {
      row.badRefs.push(`FORGE_NS:${raw}`)
      noteRef(`FORGE_NS:${id}`, 'forge', f.rel)
      continue
    }
    if (!nsExists(ns)) {
      row.badRefs.push(`MISSING_NS:${raw}`)
      noteRef(`MISSING_NS:${id}`, 'ns', f.rel)
    }
  }
  rows.push(row)
}

const group = (kind) => [...deadRefs.entries()].filter(([, v]) => v.kind === kind)
const byNsCount = (kind) => {
  const m = new Map()
  for (const [key] of group(kind)) {
    const ns = key.slice(key.indexOf(':') + 1)
    const k = ns.slice(0, ns.indexOf(':'))
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

if (AS_JSON) {
  console.log(JSON.stringify({ files, entries, rows, deadRefs: [...deadRefs].map(([k, v]) => [k, { kind: v.kind, files: [...v.files] }]) }, null, 2))
  process.exit(0)
}

const p = (s) => console.log(s)
p(`mods jar 命名空间索引：${nsIndex.jars} 个 jar / ${NS.size} 个命名空间（缓存 ${path.relative(REPO, NS_CACHE)}）`)
p(`kubejs/data 标签文件：${files} 个，条目：${entries} 条`)
p('')
p('== A. 标签自身命名空间没有对应 mod（该标签无人读取）==')
const a = rows.filter((r) => r.missingNs)
p(`  ${a.length} 个文件`)
for (const r of a.slice(0, 40)) p(`    ${r.file}`)
if (a.length > 40) p(`    … 另 ${a.length - 40} 个`)
p('')
p('== B. tags/ 下旧复数子目录（1.21 整目录忽略）==')
p(`  ${legacySubFiles.length} 个文件`)
for (const r of legacySubFiles) p(`    ${r.file}  → tags/${r.legacySub}/`)
p('')
p('== C. 标签值里 `forge:` 命名空间引用（1.21 已迁到 `c:`）==')
const c = group('forge')
p(`  ${c.length} 个不同的引用，涉及 ${new Set(c.flatMap(([, v]) => [...v.files])).size}+ 个文件`)
for (const [k, v] of c) p(`    ${k}  ← ${[...v.files].join(', ')}`)
p('')
p('== D. 标签值里引用未安装 mod 的条目（该条目恒为空）==')
const d = group('ns')
p(`  ${d.length} 个不同的引用`)
for (const [ns, n] of byNsCount('ns').slice(0, 30)) p(`    ${ns.padEnd(28)} ${n}`)
if (byNsCount('ns').length > 30) p(`    … 另 ${byNsCount('ns').length - 30} 个命名空间`)
p('')
p('== E. 格式非法条目 ==')
const e = group('malformed')
p(`  ${e.length} 条`)
for (const [k, v] of e.slice(0, 20)) p(`    ${k}  ← ${[...v.files].join(', ')}`)
p('')
p('== F. 受影响文件 Top 30（按坏条目数）==')
for (const r of [...rows].filter((x) => x.badRefs.length).sort((x, y) => y.badRefs.length - x.badRefs.length).slice(0, 30)) {
  p(`  ${String(r.badRefs.length).padStart(3)}  ${r.file}`)
}
