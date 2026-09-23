// 逐个条目审计 kubejs/data/*/tags/** 里引用的物品/方块/流体/生物是否真的注册了。
//
// 上一轮（fix-tags-121.mjs）只按"命名空间是否存在"判断，粒度太粗：命名空间装着 mod、但那个具体 id
// 早就没了的情况查不出来；而**纯字符串条目（= required）只要有一个不存在，整个标签就会加载失败**
// （日志 `Couldn't load tag X as it is missing following references:`）。本脚本补上这一层。
//
// 存在性证据（两源都判"没有"才算缺，避免误删）：
//   1. `.probe/registry_objects.json`（ProbeJS 从运行实例导出的注册表全量 dump，权威）
//   2. `_dsh_tmp/item-index.json` / `fluid-index.json`（子代理从 365 个 jar 的 assets/data 采集的证据）
//
// 用法：node scripts/audit-tag-entries.mjs [--apply] [--json]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..')
const DATA = path.join(REPO, 'kubejs', 'data')
const TMP = path.resolve(REPO, '..', '_dsh_tmp')

const argv = process.argv.slice(2)
const APPLY = argv.includes('--apply')
const AS_JSON = argv.includes('--json')

// 一对一的"改名字"映射：1.20.1 的名字在 1.21 里换了拼写/换了归属方，能确定的才写进来
const REMAP = new Map([
  ['crabbersdelight:frog_leg_kebob', 'crabbersdelight:frog_leg_kebab'],
  ['crabbersdelight:squid_kebob', 'crabbersdelight:squid_kebab'],
  ['fruitsdelight:jelly_bread', 'fruitsdelight:jam_bread'],
  ['createdelightcore:pizza_slice', 'brewinandchewin:pizza_slice'],
])

const dumpPath = path.join(REPO, '.probe', 'registry_objects.json')
if (!fs.existsSync(dumpPath)) throw new Error(`缺少 ${dumpPath}：需要在游戏里跑一次 ProbeJS dump`)
const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'))
const dumpSet = (ns) => new Set(dump[ns] ?? [])

// tags/ 下的目录（含 worldgen 二级目录）→ 注册表 key
const REGISTRY_OF_DIR = {
  item: 'minecraft:item',
  block: 'minecraft:block',
  fluid: 'minecraft:fluid',
  entity_type: 'minecraft:entity_type',
  game_event: 'minecraft:game_event',
  enchantment: 'minecraft:enchantment',
  painting_variant: 'minecraft:painting_variant',
  banner_pattern: 'minecraft:banner_pattern',
  instrument: 'minecraft:instrument',
  damage_type: 'minecraft:damage_type',
  'worldgen/biome': 'minecraft:worldgen/biome',
  'worldgen/structure': 'minecraft:worldgen/structure',
}
const SETS = new Map()
for (const ns of new Set(Object.values(REGISTRY_OF_DIR))) SETS.set(ns, dumpSet(ns))

function readJsonIfAny(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}
const EVID = {
  'minecraft:item': readJsonIfAny(path.join(TMP, 'item-index.json')),
  'minecraft:fluid': readJsonIfAny(path.join(TMP, 'fluid-index.json')),
}

function* walkTagFiles() {
  for (const ns of fs.readdirSync(DATA)) {
    const tdir = path.join(DATA, ns, 'tags')
    if (!fs.existsSync(tdir) || !fs.statSync(tdir).isDirectory()) continue
    for (const sub of fs.readdirSync(tdir)) {
      const sdir = path.join(tdir, sub)
      if (!fs.statSync(sdir).isDirectory()) continue
      for (const e of fs.readdirSync(sdir, { withFileTypes: true, recursive: true })) {
        if (!e.isFile() || !e.name.endsWith('.json')) continue
        const abs = path.join(e.parentPath ?? e.path, e.name)
        const rel = path.relative(REPO, abs).replaceAll('\\', '/')
        const afterTags = rel.split('/tags/')[1]
        const regDir = afterTags.split('/').slice(0, sub === 'worldgen' ? 2 : 1).join('/')
        yield { abs, rel, regDir }
      }
    }
  }
}

const files = [...walkTagFiles()]
const rows = []
const deleted = []
const renamed = []
let checkable = 0
let entries = 0
let tagRefs = 0

for (const f of files) {
  const reg = REGISTRY_OF_DIR[f.regDir]
  if (!reg) {
    rows.push({ file: f.rel, skipped: `未支持的类型 tags/${f.regDir}` })
    continue
  }
  checkable++
  const known = SETS.get(reg)
  const ev = EVID[reg]
  let json
  try {
    json = JSON.parse(fs.readFileSync(f.abs, 'utf8'))
  } catch (e) {
    rows.push({ file: f.rel, error: e.message })
    continue
  }
  if (!Array.isArray(json.values)) {
    rows.push({ file: f.rel, skipped: '无 values 数组' })
    continue
  }
  const gone = []
  const renaming = []
  const kept = []
  for (const entry of json.values) {
    entries++
    const raw = typeof entry === 'string' ? entry : (entry?.id ?? (entry?.tag ? '#' + entry.tag : null))
    if (raw == null) {
      kept.push(entry)
      continue
    }
    if (raw.startsWith('#')) {
      tagRefs++
      kept.push(entry)
      continue
    }
    let absent = !known.has(raw)
    if (absent && ev) absent = !ev[raw]
    if (absent && REMAP.has(raw)) {
      const to = REMAP.get(raw)
      renaming.push(`${raw} -> ${to}`)
      kept.push(typeof entry === 'string' ? to : { ...entry, id: to })
      continue
    }
    if (absent) {
      gone.push(raw)
      continue
    }
    kept.push(entry)
  }
  if (gone.length || renaming.length) {
    rows.push({ file: f.rel, gone, renaming, left: kept.length })
    for (const g of gone) deleted.push(`${g}  <- ${f.rel}`)
    for (const r of renaming) renamed.push(`${r}  <- ${f.rel}`)
    if (APPLY) {
      json.values = kept
      fs.writeFileSync(f.abs, JSON.stringify(json, null, 2) + '\n')
    }
  }
}

if (AS_JSON) {
  console.log(JSON.stringify({ files: files.length, checkable, entries, tagRefs, rows }, null, 2))
  process.exit(0)
}

const p = (s) => console.log(s)
p(`${path.relative(REPO, dumpPath)}：item ${dumpSet('minecraft:item').size} / block ${dumpSet('minecraft:block').size} / fluid ${dumpSet('minecraft:fluid').size} / biome ${dumpSet('minecraft:worldgen/biome').size}`)
p(`标签文件 ${files.length} 个（可判定 ${checkable}），条目 ${entries} 条（其中标签引用 ${tagRefs} 条不判存在性）`)
p(`${APPLY ? '已应用' : '干跑'}：${rows.length} 个文件命中，改名 ${renamed.length} 条、删除 ${deleted.length} 条不存在的引用`)
p('')
for (const r of rows) {
  if (r.skipped) {
    p(`SKIP ${r.file} — ${r.skipped}`)
    continue
  }
  if (r.error) {
    p(`!!   ${r.file}: ${r.error}`)
    continue
  }
  p(`${r.file}   缺 ${r.gone.length}${r.renaming.length ? ` / 改名 ${r.renaming.length}` : ''}${APPLY ? '' : `（剩 ${r.left} 条）`}`)
  for (const x of r.renaming) p(`      改 ${x}`)
  for (const g of r.gone.slice(0, 10)) p(`      删 ${g}`)
  if (r.gone.length > 10) p(`      … 另 ${r.gone.length - 10} 条`)
}
