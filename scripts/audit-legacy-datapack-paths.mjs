#!/usr/bin/env node
// 审计 kubejs/data 下仍挂在 Minecraft 1.20.1 旧目录名（recipes / advancements / loot_tables /
// tags/items ... ）下的数据包文件，判断每个文件在 1.21.1 里到底还有没有等价物。
//
// 背景：1.21 把数据包目录名改成单数（recipes→recipe、advancements→advancement、
// loot_tables→loot_table、predicates→predicate、item_modifiers→item_modifier、functions→function、
// structures→structure、tags/items→tags/item、tags/blocks→tags/block、tags/fluids→tags/fluid）。
// 这些旧路径在 1.21 不会被加载。
//
// 对每个旧路径文件 kubejs/data/<ns>/<legacy...>/<rest>（<modern> = 映射后的单数名）分类：
//   1 已有单数副本      —— kubejs/data/<ns>/<modern>/<rest> 已存在（残留重复）
//   2 覆盖失效          —— 仓库无单数副本，但某 mod jar 内存在 data/<ns>/<modern>/<rest>
//       2a 内容一致 = 纯冗余；2b 内容不一致 = 改动丢失
//   3 完全没生效        —— 仓库无单数副本、mod jar 也没有 → 这份内容现在谁都没提供（真实缺口）
//   4 命名空间无对应 mod —— mods/ 里没有任何 jar 含 data/<ns>/ → 可能 mod 已被移除（死数据）
//
// 只读脚本：不写任何游戏内容文件，只写一份 Markdown 报告。
// 用法：node scripts/audit-legacy-datapack-paths.mjs [--report <path>]
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import crypto from 'node:crypto'

/* ------------------------------------------------------------------ *
 * 0. 常量
 * ------------------------------------------------------------------ */
const REPO = 'D:/git-MC/CDR1211'
const DATA_DIR = path.join(REPO, 'kubejs/data')
const MODS_DIR = path.join(REPO, 'mods')
const VANILLA_JAR = 'E:/myWord/hcml/.minecraft/versions/1.21.1/1.21.1.jar'

let OUT = 'D:/git-MC/_dsh_tmp/legacy-datapack-audit.md'
const argv = process.argv.slice(2)
const ri = argv.indexOf('--report')
if (ri >= 0 && argv[ri + 1]) OUT = argv[ri + 1]

// 旧目录名 → 1.21 单数名
const LEGACY_MAP = new Map([
  ['recipes', 'recipe'],
  ['advancements', 'advancement'],
  ['loot_tables', 'loot_table'],
  ['predicates', 'predicate'],
  ['item_modifiers', 'item_modifier'],
  ['functions', 'function'],
  ['structures', 'structure'],
])
// tags/<sub> 的旧复数 → 1.21 单数
const LEGACY_TAG_SUB = new Map([
  ['items', 'item'],
  ['blocks', 'block'],
  ['fluids', 'fluid'],
])
// 1.21 已经是单数的类型目录 / tag 子目录：一旦路径里先遇到它们，说明这份路径已经是新格式，
// 后面再出现的 `recipes` 之类只是 ID 的一部分（例如 data/x/advancement/recipes/foo.json）
const MODERN_DIRS = new Set(['recipe', 'advancement', 'loot_table', 'predicate', 'item_modifier', 'function', 'structure'])
const MODERN_TAG_SUBS = new Set([
  'item', 'block', 'fluid', 'entity_type', 'game_event', 'banner_pattern', 'painting_variant',
  'cat_variant', 'wolf_variant', 'frog_variant', 'enchantment', 'damage_type', 'biome', 'structure',
  'flat_level_generator_preset', 'worldgen',
])

/* ------------------------------------------------------------------ *
 * 1. zip 读取（复用 restore-quest-icons.mjs 第 87–148 行的 zip64 + deflate 实现，
 *    改造成「按任意正则 / 后缀 / 谓词筛选条目」的通用形式）
 * ------------------------------------------------------------------ */
const SIG_EOCD = Buffer.from([0x50, 0x4b, 0x05, 0x06])
const SIG_Z64_EOCD_LOC = Buffer.from([0x50, 0x4b, 0x06, 0x07])
const SIG_CEN = 0x02014b50
const SIG_LOC = 0x04034b50

// 构造条目筛选谓词：RegExp | 函数 | { exts: ['.json'], include: RegExp, exclude: RegExp }
function makeMatcher(filter) {
  if (filter == null) return () => true
  if (filter instanceof RegExp) return (n) => filter.test(n)
  if (typeof filter === 'function') return filter
  const { include, exclude, exts, suffixes } = filter
  const extsAll = [...(exts ?? []), ...(suffixes ?? [])].map((e) => e.toLowerCase())
  return (n) => {
    if (include && !include.test(n)) return false
    if (exclude && exclude.test(n)) return false
    if (extsAll.length && !extsAll.some((e) => n.toLowerCase().endsWith(e))) return false
    return true
  }
}

// 定位 EOCD：从尾部向前找签名，并用「注释长度」自校验，避免命中压缩数据里的伪签名
function findEocd(buf) {
  const min = Math.max(0, buf.length - 65557)
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) !== 0x06054b50) continue
    const commentLen = buf.readUInt16LE(i + 20)
    if (i + 22 + commentLen === buf.length) return i
  }
  return -1
}

// 解析中央目录，返回条目元数据（不含内容；调用方自己决定要不要读内容）
function listZipEntries(jarPath, filter) {
  const match = makeMatcher(filter)
  const out = []
  const buf = fs.readFileSync(jarPath)
  const eocd = findEocd(buf)
  if (eocd < 0) return out
  let count = buf.readUInt16LE(eocd + 10)
  let cdOff = buf.readUInt32LE(eocd + 16)
  // zip64：EOCD 字段被置为 0xFFFF/0xFFFFFFFF 时改用 zip64 EOCD（Create 等大 jar 会走到这里）
  if (count === 0xffff || cdOff === 0xffffffff) {
    const loc = buf.lastIndexOf(SIG_Z64_EOCD_LOC)
    if (loc >= 0) {
      const z64 = Number(buf.readBigUInt64LE(loc + 8))
      if (z64 + 56 <= buf.length && buf.readUInt32LE(z64) === 0x06064b50) {
        count = Number(buf.readBigUInt64LE(z64 + 32))
        cdOff = Number(buf.readBigUInt64LE(z64 + 48))
      }
    }
  }
  let off = cdOff
  for (let i = 0; i < count; i++) {
    if (off + 46 > buf.length || buf.readUInt32LE(off) !== SIG_CEN) break
    const method = buf.readUInt16LE(off + 10)
    let compSize = buf.readUInt32LE(off + 20)
    let uncompSize = buf.readUInt32LE(off + 24)
    const nameLen = buf.readUInt16LE(off + 28)
    const extraLen = buf.readUInt16LE(off + 30)
    const commentLen = buf.readUInt16LE(off + 32)
    let localOff = buf.readUInt32LE(off + 42)
    const name = buf.slice(off + 46, off + 46 + nameLen).toString('utf8')
    // zip64 扩展字段（id 0x0001）按顺序补全被置为 0xFFFFFFFF 的字段
    if (uncompSize === 0xffffffff || compSize === 0xffffffff || localOff === 0xffffffff) {
      let p = off + 46 + nameLen
      const end = p + extraLen
      while (p + 4 <= end) {
        const id = buf.readUInt16LE(p)
        const sz = buf.readUInt16LE(p + 2)
        if (id === 0x0001) {
          let q = p + 4
          if (uncompSize === 0xffffffff) { uncompSize = Number(buf.readBigUInt64LE(q)); q += 8 }
          if (compSize === 0xffffffff) { compSize = Number(buf.readBigUInt64LE(q)); q += 8 }
          if (localOff === 0xffffffff) { localOff = Number(buf.readBigUInt64LE(q)); q += 8 }
          break
        }
        p += 4 + sz
      }
    }
    if (match(name)) out.push({ name, method, compSize, uncompSize, localOff })
    off += 46 + nameLen + extraLen + commentLen
  }
  return out
}

// 从已加载的 jar 缓冲里取某条目内容（Buffer，二进制安全）
function readZipEntry(buf, e) {
  if (buf.readUInt32LE(e.localOff) !== SIG_LOC) throw new Error(`bad local header: ${e.name}`)
  const nameLen = buf.readUInt16LE(e.localOff + 26)
  const extraLen = buf.readUInt16LE(e.localOff + 28)
  const start = e.localOff + 30 + nameLen + extraLen
  const raw = buf.slice(start, start + e.compSize)
  if (e.method === 8) return zlib.inflateRawSync(raw)
  if (e.method === 0) return Buffer.from(raw)
  throw new Error(`unsupported zip method ${e.method}: ${e.name}`)
}

/* ------------------------------------------------------------------ *
 * 2. 扫描 kubejs/data，找出所有挂在旧目录名下的文件
 * ------------------------------------------------------------------ */
// 返回 { index, consumed, modern, legacy, nested }：最外层（最靠前）的旧目录标记及其单数名
// 若先遇到 1.21 单数目录 → 返回 null（这份路径已经是新格式，不需要处理）
function detectLegacy(segs) {
  for (let i = 1; i <= segs.length - 2; i++) {
    const s = segs[i]
    if (MODERN_DIRS.has(s)) return null
    if (s === 'tags' && MODERN_TAG_SUBS.has(segs[i + 1])) return null
    if (LEGACY_MAP.has(s)) return { index: i, consumed: 1, modern: LEGACY_MAP.get(s), legacy: s, nested: i > 1 }
    if (s === 'tags' && LEGACY_TAG_SUB.has(segs[i + 1])) {
      const sub = segs[i + 1]
      return { index: i, consumed: 2, modern: `tags/${LEGACY_TAG_SUB.get(sub)}`, legacy: `tags/${sub}`, nested: i > 1 }
    }
  }
  return null
}

function walkFiles(root) {
  const out = []
  for (const d of fs.readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (!d.isFile()) continue
    const full = path.join(d.parentPath ?? d.path, d.name)
    out.push(full)
  }
  return out
}

const allFiles = walkFiles(DATA_DIR)
const allRel = new Set()
const legacyFiles = []
for (const full of allFiles) {
  const rel = path.relative(DATA_DIR, full).split(path.sep).join('/')
  allRel.add(rel)
  const segs = rel.split('/')
  const hit = detectLegacy(segs)
  if (!hit) continue
  const rest = segs.slice(hit.index + hit.consumed).join('/')
  const modernRel = `${segs[0]}/${hit.modern}/${rest}`
  legacyFiles.push({
    rel,
    ns: segs[0],
    legacy: hit.legacy,
    rest,
    modernRel,
    nested: hit.nested,
    idx: hit.index,
    size: fs.statSync(full).size,
    isBinary: /\.nbt$/i.test(rel),
  })
}
legacyFiles.sort((a, b) => a.rel.localeCompare(b.rel))
console.log(`[scan] kubejs/data 共 ${allFiles.length} 个文件，其中旧路径文件 ${legacyFiles.length} 个`)

/* ------------------------------------------------------------------ *
 * 3. 建立 mod jar 索引（只要条目名，不要内容；内容第二轮按需再读）
 * ------------------------------------------------------------------ */
const jars = []
if (fs.existsSync(MODS_DIR)) {
  for (const f of fs.readdirSync(MODS_DIR).filter((f) => f.toLowerCase().endsWith('.jar')).sort()) {
    jars.push({ name: f, full: path.join(MODS_DIR, f) })
  }
}
if (fs.existsSync(VANILLA_JAR)) jars.push({ name: '(vanilla) 1.21.1.jar', full: VANILLA_JAR })
else console.warn(`[warn] 找不到原版 jar，minecraft 命名空间将无法核对：${VANILLA_JAR}`)

const modernSet = new Set(legacyFiles.map((f) => f.modernRel))
const legacyPathSet = new Set(legacyFiles.map((f) => f.rel))
const needNs = new Set(legacyFiles.map((f) => f.ns))

const nsJars = new Map() // ns -> Set(jarName)
const entryOwners = new Map() // data 相对路径 -> [{jar, name, ...meta}]
const metaByJar = new Map() // jarName -> Map(entryName -> meta)
// ns + basename -> 该命名空间下同名条目（用于第 3 类的「同名但换了路径」近似匹配）
const jarNameIndex = new Map()

let scanned = 0
for (const jar of jars) {
  let entries
  try {
    entries = listZipEntries(jar.full, /^data\//)
  } catch (e) {
    console.warn(`[warn] 读取失败，跳过 ${jar.name}: ${e.message}`)
    continue
  }
  const meta = new Map()
  for (const e of entries) {
    const rel = e.name.slice('data/'.length)
    const parts = rel.split('/')
    const ns = parts[0]
    if (!ns) continue
    if (!nsJars.has(ns)) nsJars.set(ns, new Set())
    nsJars.get(ns).add(jar.name)
    meta.set(e.name, e)
    if (modernSet.has(rel) || legacyPathSet.has(rel)) {
      const arr = entryOwners.get(rel) ?? []
      arr.push({ jar: jar.name, jarFull: jar.full, meta: e })
      entryOwners.set(rel, arr)
    }
    if (needNs.has(ns) && parts.length >= 2) {
      const key = `${ns}\u0000${parts[parts.length - 1]}`
      if (!jarNameIndex.has(key)) jarNameIndex.set(key, new Set())
      jarNameIndex.get(key).add(rel)
    }
  }
  metaByJar.set(jar.name, { full: jar.full, meta })
  scanned++
  if (scanned % 50 === 0) console.log(`[jar] 已索引 ${scanned}/${jars.length}`)
}
console.log(`[jar] 索引完成：${scanned} 个 jar，${nsJars.size} 个命名空间，命中目标条目 ${entryOwners.size} 条`)

/* ------------------------------------------------------------------ *
 * 4. 按需读取 jar 内容（每个 jar 只读一次）
 * ------------------------------------------------------------------ */
const jarContent = new Map() // `${jarName}\u0000${entryName}` -> Buffer
const needByJar = new Map()
for (const [rel, owners] of entryOwners) {
  for (const o of owners) {
    if (!needByJar.has(o.jar)) needByJar.set(o.jar, new Set())
    needByJar.get(o.jar).add(o.meta.name)
  }
}
for (const [jarName, names] of needByJar) {
  const info = metaByJar.get(jarName)
  const buf = fs.readFileSync(info.full)
  for (const n of names) {
    const meta = info.meta.get(n)
    if (!meta) continue
    try {
      jarContent.set(`${jarName}\u0000${n}`, readZipEntry(buf, meta))
    } catch (e) {
      console.warn(`[warn] 解压失败 ${jarName} :: ${n}: ${e.message}`)
    }
  }
}
console.log(`[jar] 已加载 ${jarContent.size} 个目标条目内容`)

/* ------------------------------------------------------------------ *
 * 5. 内容比较工具
 * ------------------------------------------------------------------ */
function sha1(buf) {
  return crypto.createHash('sha1').update(buf).digest('hex')
}
function canon(v) {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`
  }
  return JSON.stringify(v)
}
// .nbt 结构文件是压缩二进制：先试 gzip / zlib / raw-deflate 解压，能解出相同内容就算等价
function decompressMaybe(buf) {
  for (const fn of [() => zlib.gunzipSync(buf), () => zlib.inflateSync(buf), () => zlib.inflateRawSync(buf)]) {
    try {
      return fn()
    } catch {}
  }
  return null
}
const decompressedLen = (buf) => decompressMaybe(buf)?.length ?? null
// 'byte-equal' | 'nbt-equal' | 'json-equal' | 'different'
function compareBuffers(a, b, isBinary) {
  if (a.equals(b)) return 'byte-equal'
  if (isBinary) {
    const da = decompressMaybe(a)
    const db = decompressMaybe(b)
    return da && db && da.equals(db) ? 'nbt-equal' : 'different'
  }
  try {
    const ja = JSON.parse(a.toString('utf8'))
    const jb = JSON.parse(b.toString('utf8'))
    return canon(ja) === canon(jb) ? 'json-equal' : 'different'
  } catch {
    return 'different'
  }
}
const degreeText = (d) =>
  d === 'byte-equal'
    ? '字节级完全一致'
    : d === 'nbt-equal'
      ? 'NBT 解压后一致（仅压缩流不同）'
      : d === 'json-equal'
        ? 'JSON 语义一致（仅空白/键序差异）'
        : '内容不一致'
// 是否算「一致」（第 2 类里一致=纯冗余）
const isSame = (d) => d === 'byte-equal' || d === 'nbt-equal' || d === 'json-equal'

/* ------------------------------------------------------------------ *
 * 6. 分类
 * ------------------------------------------------------------------ */
// 判断包内这份文件的「意图」：是禁用/删除存根，还是真实内容
//   disable-stub  : advancement 里 criteria.disabled.trigger = minecraft:impossible（KubeJS 禁用惯例）
//   empty-json    : `{}`（KubeJS/data 包里表示删除该 recipe/advancement）
//   tag / recipe / loot / adv / nbt-binary / json-other
function kindOf(rel, full) {
  if (/\.nbt$/i.test(rel)) return 'nbt-binary'
  let txt
  try {
    txt = fs.readFileSync(full, 'utf8')
  } catch {
    return 'unreadable'
  }
  return kindOfText(rel, txt)
}
function kindOfText(rel, txt) {
  let json = null
  try {
    json = JSON.parse(txt)
  } catch {}
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    const keys = Object.keys(json)
    const crit = json.criteria
    if (keys.length === 1 && crit && typeof crit === 'object') {
      const cs = Object.values(crit)
      if (cs.length === 1 && cs[0] && cs[0].trigger === 'minecraft:impossible') return 'disable-stub'
    }
    if (keys.length === 0) return 'empty-json'
  }
  const segs = rel.split('/')
  if (segs.includes('tags')) return 'tag'
  if (segs.includes('loot_table') || segs.includes('loot_tables')) return 'loot'
  if (segs.includes('advancement') || segs.includes('advancements')) return 'adv'
  if (segs.includes('structures') || segs.includes('structure')) return 'nbt-binary'
  if (json && typeof json.type === 'string') return `recipe:${json.type}`
  return 'json-other'
}

const rows = []
const stats = {
  total: legacyFiles.length,
  byClass: { 1: 0, 2: 0, '2a': 0, '2b': 0, 3: 0, 4: 0 },
}
for (const f of legacyFiles) {
  const full = path.join(DATA_DIR, f.rel)
  const row = { ...f, cls: null, same: null, jar: null, jarLegacy: false, near: null, reason: '' }
  row.kind = kindOf(f.rel, full)
  row.packIsStub = row.kind === 'disable-stub' || row.kind === 'empty-json'

  if (allRel.has(f.modernRel)) {
    const a = fs.readFileSync(full)
    const b = fs.readFileSync(path.join(DATA_DIR, f.modernRel))
    row.cls = 1
    row.same = compareBuffers(a, b, f.isBinary)
    row.reason = `仓库内已有单数副本 kubejs/data/${f.modernRel}（${degreeText(row.same)}）`
  } else {
    const owners = entryOwners.get(f.modernRel) ?? []
    const nsHasJar = nsJars.has(f.ns)
    if (!nsHasJar) {
      row.cls = 4
      row.reason = `mods/ 里没有任何 jar 含 data/${f.ns}/ → 命名空间无对应 mod`
    } else if (owners.length) {
      const o = owners[0]
      const jb = jarContent.get(`${o.jar}\u0000${o.meta.name}`)
      row.cls = 2
      row.jar = o.jar
      if (owners.length > 1) row.jar += ` 等 ${owners.length} 个 jar`
      row.same = jb ? compareBuffers(fs.readFileSync(full), jb, f.isBinary) : 'different'
      row.jarSize = jb ? jb.length : null
      // 二进制且不一致时，额外记录解压后大小（判断「旧版快照」还是「有意改动」的关键线索）
      if (f.isBinary && row.same === 'different' && jb) {
        row.dPack = decompressedLen(fs.readFileSync(full))
        row.dJar = decompressedLen(jb)
      }
      row.jarLegacy = (entryOwners.get(f.rel) ?? []).length > 0
      row.jarKind = jb && !f.isBinary ? kindOfText(f.modernRel, jb.toString('utf8')) : 'nbt-binary'
      row.reason =
        `mods/${o.jar} 内存在 data/${f.modernRel}（${degreeText(row.same)}）` +
        (row.jarLegacy ? '；注意该 jar 同时还有旧路径条目' : '')
    } else {
      row.cls = 3
      row.reason = `仓库无 kubejs/data/${f.modernRel}，mods/*.jar 也没有 data/${f.modernRel} → 谁都没提供`
      // 同名但换了路径的近似匹配：jar 里同命名空间下是否有同名文件（例如 mod 调整了配方 ID 目录）
      const base = f.rel.split('/').pop()
      const cands = [...(jarNameIndex.get(`${f.ns}\u0000${base}`) ?? [])].filter((x) => x !== f.modernRel)
      if (cands.length) {
        row.near = cands.slice(0, 3)
        row.reason += `；但 ${f.ns} 下有同名文件 ${cands.slice(0, 3).map((c) => `data/${c}`).join('、')}`
      }
    }
  }

  stats.byClass[row.cls]++
  if (row.cls === 2) stats.byClass[isSame(row.same) ? '2a' : '2b']++
  rows.push(row)
}
console.log('[class]', JSON.stringify(stats))

/* ------------------------------------------------------------------ *
 * 7. 统计辅助
 * ------------------------------------------------------------------ */
function countByNs(list) {
  const m = new Map()
  for (const r of list) m.set(r.ns, (m.get(r.ns) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}
function countBy(mapFn, list) {
  const m = new Map()
  for (const r of list) {
    const k = mapFn(r)
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
}
function nsTable(list, top = 20) {
  const c = countByNs(list)
  if (!c.length) return '_（无）_\n'
  const rows2 = c.slice(0, top)
  let s = '| # | 命名空间 | 文件数 |\n|---|---|---|\n'
  rows2.forEach(([ns, n], i) => { s += `| ${i + 1} | \`${ns}\` | ${n} |\n` })
  if (c.length > top) s += `\n（其余 ${c.length - top} 个命名空间合计 ${c.slice(top).reduce((a, b) => a + b[1], 0)} 个文件）\n`
  return s
}
const fmtSize = (n) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`)

const cls1 = rows.filter((r) => r.cls === 1)
const cls2 = rows.filter((r) => r.cls === 2)
const cls2a = cls2.filter((r) => isSame(r.same))
const cls2b = cls2.filter((r) => !isSame(r.same))
const cls3 = rows.filter((r) => r.cls === 3)
const cls4 = rows.filter((r) => r.cls === 4)

// 第 2b 类再分：「意图禁用/删除」的存根（批量可判定）vs「真实内容覆盖」（需要逐个看 diff）
const cls2bStub = cls2b.filter((r) => r.packIsStub)
const cls2bReal = cls2b.filter((r) => !r.packIsStub)
// 第 3 类再分：内容型缺口（真丢了）vs 存根型（删/禁用的目标已不存在 → 存根本身也没意义）
const cls3c = cls3.filter((r) => !r.packIsStub)
const cls3Stub = cls3.filter((r) => r.packIsStub)

// 「最值得先看」排序：优先真实内容（存根是大批同质的，单独成组），再看体积与新类型权重
const TYPE_WEIGHT = { structures: 50, 'tags/items': 30, 'tags/blocks': 30, 'tags/fluids': 30, loot_tables: 20, recipes: 12, advancements: 6 }
const KIND_WEIGHT = { 'nbt-binary': 40, tag: 30, loot: 20, adv: 10, 'empty-json': 8, 'disable-stub': 5 }
function priority(list) {
  const nsCount = new Map(countByNs(list))
  return [...list].sort((a, b) => {
    const w = (r) =>
      (r.packIsStub ? 0 : 100000) +
      (TYPE_WEIGHT[r.legacy] ?? 10) * 1000 +
      (KIND_WEIGHT[r.kind] ?? 20) * 300 +
      Math.min(nsCount.get(r.ns) ?? 0, 90) * 10 +
      Math.min(r.size / 256, 9)
    return w(b) - w(a) || a.rel.localeCompare(b.rel)
  })
}
// Top 榜：每个命名空间最多 perNs 条，避免整张榜被同一个命名空间的同质文件占满
function topDiverse(list, n = 15, perNs = 3) {
  const used = new Map()
  const out = []
  for (const r of priority(list)) {
    const c = used.get(r.ns) ?? 0
    if (c >= perNs) continue
    used.set(r.ns, c + 1)
    out.push(r)
    if (out.length >= n) break
  }
  return out
}

/* ------------------------------------------------------------------ *
 * 8. 生成报告
 * ------------------------------------------------------------------ */
const L = []
const p = (s = '') => L.push(s)

p('# 旧数据包路径审计（1.20.1 目录名 → 1.21.1）')
p()
p(`- 仓库：\`D:/git-MC/CDR1211\``)
p(`- 扫描范围：\`kubejs/data/**\` 共 **${allFiles.length}** 个文件；其中仍挂在 1.20.1 旧目录名下的 **${legacyFiles.length}** 个`)
p(`- 对照物：仓库内单数路径副本 + \`mods/*.jar\`${fs.existsSync(VANILLA_JAR) ? ' + 原版 ' + path.basename(VANILLA_JAR) : ''}（共 ${scanned} 个 jar，${nsJars.size} 个命名空间）`)
p(`- 内容比较：\`.nbt\` 用字节哈希/字节比较，二进制不同时再比 gzip/zlib 解压后的内容；文本按字节比较，`)
p(`  字节不同但 JSON 语义等价（仅空白、键序差异）也算「一致」`)
p(`- 生成方式：\`node scripts/audit-legacy-datapack-paths.mjs\`（只读脚本）`)
p()
p('## 0. 口径说明（与「541 个文件」的差异）')
p()
p('旧目录名映射：`recipes→recipe`、`advancements→advancement`、`loot_tables→loot_table`、`predicates→predicate`、')
p('`item_modifiers→item_modifier`、`functions→function`、`structures→structure`、`tags/items→tags/item`、')
p('`tags/blocks→tags/block`、`tags/fluids→tags/fluid`。')
p()
p('本脚本按「路径里最靠前的旧目录标记」归属文件（`<ns>/<legacy...>/<rest>` → `<ns>/<modern>/<rest>`）：')
p('先遇到 1.21 单数类型目录（`recipe` / `advancement` / `tags/item` …）就判定该路径已经是新格式、不再处理。')
p()
p('如果按「路径里出现某旧目录名」粗扫，`data/crabbersdelight/advancements/recipes/...` 这类文件会同时被算进')
p('`advancements` 和 `recipes`（`<rest>` 里的 `recipes/` 只是 advancement ID 的一部分，不是目录类型），')
p('这就是「541」的来源：**路径级计数 542~543 里，有 69 个是重复计入 `recipes` 的 advancement**，')
p('另外还有 1 个 `data/createadditionallogistics/advancement/recipes/...` 已经是 1.21 新格式却被误判成旧路径。')
p(`**按文件去重后的真实旧路径文件数是 ${legacyFiles.length}**，本报告全部以这个口径统计。`)
p()
p('| 旧目录 | 按最前标记归属（本报告口径） | 路径中出现即计数（复核用） |')
p('|---|---|---|')
{
  const first = countBy((r) => r.legacy, legacyFiles)
  const anyCount = new Map()
  for (const f of legacyFiles) {
    const segs = f.rel.split('/')
    const seen = new Set()
    for (let i = 1; i < segs.length; i++) {
      if (LEGACY_MAP.has(segs[i])) seen.add(segs[i])
      if (segs[i] === 'tags' && LEGACY_TAG_SUB.has(segs[i + 1])) seen.add(`tags/${segs[i + 1]}`)
    }
    for (const s of seen) anyCount.set(s, (anyCount.get(s) ?? 0) + 1)
  }
  const keys = [...new Set([...first.map((x) => x[0]), ...anyCount.keys()])]
  const fMap = new Map(first)
  for (const k of keys.sort((a, b) => (anyCount.get(b) ?? 0) - (anyCount.get(a) ?? 0))) {
    p(`| \`${k}\` | ${fMap.get(k) ?? 0} | ${anyCount.get(k) ?? 0} |`)
  }
  p(`| **合计** | **${legacyFiles.length}** | ${[...anyCount.values()].reduce((a, b) => a + b, 0)}（含重复计数） |`)
}
p()
p('## 1. 分类总览')
p()
p('| 类别 | 文件数 | 含义 | 处理紧迫度 |')
p('|---|---|---|---|')
p(`| 1 已有单数副本 | ${stats.byClass[1]} | 仓库里 \`<modern>\` 路径已存在，旧文件是残留重复 | 低（可直接删/确认后删） |`)
p(`| 2 覆盖失效（内容一致） | ${stats.byClass['2a']} | 想覆盖 mod 但覆盖无效；两边内容一样 → 纯冗余 | 低 |`)
p(`| 2 覆盖失效（**内容不一致**） | ${stats.byClass['2b']} | 想覆盖 mod 但覆盖无效；**包内的改动目前没生效** | **高（真实丢失）** |`)
p(`| &nbsp;&nbsp;└ 其中 · 真实内容覆盖 | ${cls2bReal.length} | 包内是改过的真实数据，且没有第二份保存 | **最高（需逐个看 diff）** |`)
p(`| &nbsp;&nbsp;└ 其中 · 禁用/删除存根 | ${cls2bStub.length} | 包内只想禁用/删除，但禁用没生效（mod 原版在跑） | 高（同质可批量） |`)
p(`| 3 完全没生效 | ${stats.byClass[3]} | 仓库与 mod jar 都没有单数路径 → **这份内容谁都没提供** | **高（真实缺口）** |`)
p(`| &nbsp;&nbsp;└ 其中 · 真实内容 | ${cls3c.length} | tag / 配方 / 战利品表 / 结构 nbt，包里的内容凭空消失 | **最高（真缺口）** |`)
p(`| &nbsp;&nbsp;└ 其中 · 禁用/删除存根 | ${cls3Stub.length} | 想禁用/删除的目标在 1.21.1 mod 里已不存在 | 低（多半是废纸） |`)
p(`| 4 命名空间无对应 mod | ${stats.byClass[4]} | \`mods/\` 里没有任何 jar 含该命名空间 → 可能 mod 已移除 | 中（多半是死数据） |`)
p(`| **合计** | **${legacyFiles.length}** | | |`)
p()
p('## 2. 各类按命名空间 Top 20')
for (const [title, list] of [
  ['2.1 第 1 类（已有单数副本）', cls1],
  ['2.2 第 2a 类（覆盖失效 · 内容一致）', cls2a],
  ['2.3 第 2b 类（覆盖失效 · 内容不一致 = 改动丢失）', cls2b],
  ['2.4 第 3 类（完全没生效）', cls3],
  ['2.5 第 4 类（命名空间无对应 mod）', cls4],
]) {
  p(`### ${title} — ${list.length} 个文件`)
  p()
  p(nsTable(list))
}
p('### 2.6 第 3 类按旧目录类型分布')
p()
{
  const c = countBy((r) => r.legacy, cls3)
  p('| 旧目录类型 | 文件数 | 其中真实内容 | 其中禁用/删除存根 |')
  p('|---|---|---|---|')
  for (const [k, v] of c) {
    p(`| \`${k}\` | ${v} | ${cls3c.filter((r) => r.legacy === k).length} | ${cls3Stub.filter((r) => r.legacy === k).length} |`)
  }
  p()
}
p('### 2.7 第 2b 类按旧目录类型分布')
p()
{
  const c = countBy((r) => r.legacy, cls2b)
  p('| 旧目录类型 | 文件数 | 其中真实内容 | 其中禁用/删除存根 |')
  p('|---|---|---|---|')
  for (const [k, v] of c) {
    p(`| \`${k}\` | ${v} | ${cls2bReal.filter((r) => r.legacy === k).length} | ${cls2bStub.filter((r) => r.legacy === k).length} |`)
  }
  p()
}
p('### 2.8 第 3 类 · 真实内容缺口的命名空间 Top 20')
p()
p(nsTable(cls3c))
p('### 2.9 第 2b 类 · 真实内容覆盖的命名空间 Top 20')
p()
p(nsTable(cls2bReal))
p('## 3. 第 2b 类：覆盖失效且内容不一致（改动丢失）— 完整清单')
p()
p(`共 **${cls2b.length}** 个文件。这些文件本意是覆盖 mod 自带的数据文件，但因为路径是旧目录名，`)
p('**实际生效的是 mod 原版内容，包内的改动全部丢失**。')
p()
p(`按包内这份文件的「意图」再分两类：`)
p()
p(`- 意图**禁用/删除**的存根（advancement 写成 \`minecraft:impossible\`、配方写成 \`{}\`）：**${cls2bStub.length}** 个 —— mod 原版内容现在是生效的，禁用失效；`)
p(`- 意图**改写内容**的真实覆盖：**${cls2bReal.length}** 个 —— 包内的修改完全没进游戏，且这份修改除了包里没有别的地方保存。`)
p()
p('### 3.1 第 2b 类 · 真实内容覆盖（需逐个看 diff）')
p()
if (!cls2bReal.length) p('_（无）_')
else {
  p('| # | 旧路径（包内） | 目标 mod jar | jar 内单数路径 | 包内意图 | 包内 / jar 大小 | 判定 |')
  p('|---|---|---|---|---|---|---|')
  cls2bReal.forEach((r, i) => {
    const sz = `${fmtSize(r.size)} / ${r.jarSize ? fmtSize(r.jarSize) : '—'}${r.dPack ? `（解压后 ${r.dPack} / ${r.dJar}）` : ''}`
    p(`| ${i + 1} | \`kubejs/data/${r.rel}\` | \`${r.jar}\` | \`data/${r.modernRel}\` | ${r.kind} | ${sz} | jar 有单数文件·内容不同 |`)
  })
  p()
  p('「包内 / jar 大小」列用于快速判断该文件是**真覆盖**还是**旧版快照**：')
  p('包内明显更小 → 多半是有意删减（真覆盖，应当恢复）；包内更大且结构相似 → 可能是 1.20.1 时期的旧副本，')
  p('恢复反而会把 mod 的新内容盖回旧内容，这种情况应当删包内文件。')
  const nbtRows = cls2bReal.filter((r) => r.dPack && r.dJar)
  if (nbtRows.length) {
    const near = nbtRows.filter((r) => Math.abs(r.dPack - r.dJar) / Math.max(r.dPack, r.dJar) < 0.02)
    p()
    p(`其中 ${nbtRows.length} 个是 \`.nbt\` 结构文件（已按 gzip 解压后比对，确认不是压缩差异）。`)
    p(`**${near.length} 个解压后大小差 < 2%**（例如 \`${near[0]?.rel ?? ''}\`：${near[0]?.dPack ?? 0} / ${near[0]?.dJar ?? 0} 字节），`)
    p('这类几乎可以确定是「mod 自己更新过结构，包里留的是 1.20.1 旧快照」——**不是包内的有意改动**，')
    p('处理方式是删掉包内那份、用 mod 的版本，而不是 `git mv` 覆盖回去。差异 > 2% 的才是需要人工确认覆盖意图的。')
  }
}
p()
p('### 3.2 第 2b 类 · 禁用/删除存根（同质，可批量处理）')
p()
if (!cls2bStub.length) p('_（无）_')
else {
  p('| # | 旧路径（包内） | 目标 mod jar | jar 内现在生效的内容 | 包内意图 | 判定 |')
  p('|---|---|---|---|---|---|')
  cls2bStub.forEach((r, i) => {
    p(`| ${i + 1} | \`kubejs/data/${r.rel}\` | \`${r.jar}\` | \`data/${r.modernRel}\` | ${r.kind} | jar 有单数文件·包内是存根 |`)
  })
}
p()
p('### 3.3 第 2b 类优先复核 Top 15（优先真实内容覆盖，每命名空间最多 3 条）')
p()
{
  const top = topDiverse(cls2b, 15, 3)
  p('| # | 文件 | 包内 / jar 大小 | 包内意图 | 依据 |')
  p('|---|---|---|---|---|')
  top.forEach((r, i) => p(`| ${i + 1} | \`kubejs/data/${r.rel}\` | ${fmtSize(r.size)} / ${r.jarSize ? fmtSize(r.jarSize) : '—'} | ${r.kind} | ${r.reason} |`))
  p()
}
p('## 4. 第 3 类：完全没生效（谁都没提供）— 完整清单')
p()
p(`共 **${cls3.length}** 个文件。仓库里没有单数副本，mod jar 里也没有对应文件，`)
p('**即这份数据在当前 1.21.1 整合包里根本不存在**（要么内容真丢了，要么目标 mod 里对象已被移除）。')
p()
p(`- 真实内容（tag / 配方 / 战利品表 / 结构 nbt）：**${cls3c.length}** 个 —— 这些是**真缺口**，包里的内容凭空消失；`)
p(`- 禁用/删除存根：**${cls3Stub.length}** 个 —— 它们想禁用/删除的目标在 1.21.1 mod 里已不存在，存根本身也没意义（多半可以直接删）。`)
p()
p('### 4.1 第 3 类 · 真实内容（真缺口）')
p()
if (!cls3c.length) p('_（无）_')
else {
  p('| # | 旧路径（包内） | 映射后的单数路径（当前缺失） | 大小 | 意图 | 同名近似条目 | 判定 |')
  p('|---|---|---|---|---|---|---|')
  cls3c.forEach((r, i) => {
    p(`| ${i + 1} | \`kubejs/data/${r.rel}\` | \`kubejs/data/${r.modernRel}\` | ${fmtSize(r.size)} | ${r.kind} | ${r.near ? r.near.map((c) => `\`data/${c}\``).join('、') : '—'} | 仓库与 mod jar 均无单数文件 |`)
  })
}
p()
p('### 4.2 第 3 类 · 禁用/删除存根')
p()
if (!cls3Stub.length) p('_（无）_')
else {
  p('| # | 旧路径（包内） | 映射后的单数路径（当前缺失） | 意图 | 同名近似条目 | 判定 |')
  p('|---|---|---|---|---|---|')
  cls3Stub.forEach((r, i) => {
    p(`| ${i + 1} | \`kubejs/data/${r.rel}\` | \`kubejs/data/${r.modernRel}\` | ${r.kind} | ${r.near ? r.near.map((c) => `\`data/${c}\``).join('、') : '—'} | 仓库与 mod jar 均无单数文件 |`)
  })
}
p()
p('### 4.3 第 3 类优先复核 Top 15（优先真实内容，每命名空间最多 3 条）')
p()
{
  const top = topDiverse(cls3, 15, 3)
  p('| # | 文件 | 大小 | 意图 | 依据 |')
  p('|---|---|---|---|---|')
  top.forEach((r, i) => p(`| ${i + 1} | \`kubejs/data/${r.rel}\` | ${fmtSize(r.size)} | ${r.kind} | ${r.reason} |`))
  p()
}
p('### 4.4 第 3 类里「同名但换了路径」的规模')
p()
{
  const near = cls3.filter((r) => r.near)
  p(`${near.length} 个文件在对应命名空间下能找到同名文件（只是目录变了），这些基本可以判定为「mod 调整了注册 ID 目录」，`)
  p('按旧路径写的那份现在既没生效也没意义，需要判断是补到新路径还是直接删。见 §4.1 / §4.2 的「同名近似条目」列。')
  p()
}
p('## 5. 第 4 类：命名空间无对应 mod — 完整清单')
p()
p(`共 **${cls4.length}** 个文件，涉及 ${new Set(cls4.map((r) => r.ns)).size} 个命名空间。这些命名空间在 \`mods/*.jar\` 的`)
p('`data/` 下完全不存在，说明对应 mod 已从整合包移除（或命名空间被改名）。这些文件按旧路径放着也不会被加载。')
p()
if (!cls4.length) p('_（无）_')
else {
  p('| # | 旧路径（包内） | 大小 |')
  p('|---|---|---|')
  cls4.forEach((r, i) => p(`| ${i + 1} | \`kubejs/data/${r.rel}\` | ${fmtSize(r.size)} |`))
}
p()
p('### 5.1 第 4 类按命名空间的全部涉及 mod 名（供人工判断是否已移除）')
p()
{
  const c = countByNs(cls4)
  p('| 命名空间 | 文件数 | 旧目录类型分布 |')
  p('|---|---|---|')
  for (const [ns, n] of c) {
    const sub = countBy((r) => r.legacy, cls4.filter((r) => r.ns === ns)).map(([k, v]) => `${k}×${v}`).join('、')
    p(`| \`${ns}\` | ${n} | ${sub} |`)
  }
  p()
}
p('## 6. 第 1 类 / 第 2a 类：冗余部分（只需计数）')
p()
p(`- 第 1 类（已有单数副本）：**${cls1.length}** 个；一致性分布：${countBy((r) => degreeText(r.same), cls1).map(([k, v]) => `${k} ${v} 个`).join('，') || '—'}。`)
p(`- 第 2a 类（覆盖 mod 但内容一致）：**${cls2a.length}** 个；一致性分布：${countBy((r) => degreeText(r.same), cls2a).map(([k, v]) => `${k} ${v} 个`).join('，') || '—'}。`)
p()
if (cls1.some((r) => r.same === 'different')) {
  p('第 1 类里内容不一致的（同路径两份内容不同，需要确认哪份是权威版本）：')
  p()
  p('| # | 旧路径 | 单数副本路径 |')
  p('|---|---|---|')
  cls1.filter((r) => r.same === 'different').slice(0, 30).forEach((r, i) => {
    p(`| ${i + 1} | \`kubejs/data/${r.rel}\` | \`kubejs/data/${r.modernRel}\` |`)
  })
  p()
}
p('样例（第 1 类前 10 条）：')
p()
p('| # | 旧路径 | 单数副本 | 一致性 |')
p('|---|---|---|---|')
cls1.slice(0, 10).forEach((r, i) => p(`| ${i + 1} | \`kubejs/data/${r.rel}\` | \`kubejs/data/${r.modernRel}\` | ${degreeText(r.same)} |`))
p()
p('样例（第 2a 类前 10 条）：')
p()
p('| # | 旧路径 | 目标 jar | 一致性 |')
p('|---|---|---|---|')
cls2a.slice(0, 10).forEach((r, i) => p(`| ${i + 1} | \`kubejs/data/${r.rel}\` | \`${r.jar}\` | ${degreeText(r.same)} |`))
p()

/* ---- 异常与备注 ---- */
p('## 7. 异常与备注')
p()
{
  const nested = rows.filter((r) => r.nested)
  p('### 7.1 旧目录不在 `data/<ns>/` 直接下一层（嵌套异常，路径在 1.20.1 也不成立）')
  p()
  p(`共 **${nested.length}** 个文件。它们的旧目录标记前面还有一层额外目录（例如 \`data/casualnessdelight/casualness_delight/recipes/...\`），`)
  p('也就是「命名空间目录」和「类型目录」之间多塞了一层。这类路径**在 1.20.1 也不合法**（数据包只认 `data/<ns>/<type>/...`），')
  p('所以它们从来没有生效过，属于迁移时的目录套错。本脚本的映射会自动丢掉那层多余目录，但**必须人工确认**丢掉后是否就是目标 ID。')
  p()
  p('| # | 旧路径（包内） | 多出来的一层 | 机械映射结果 |')
  p('|---|---|---|---|')
  nested.forEach((r, i) => {
    const extra = r.rel.split('/').slice(1, r.idx).join('/')
    p(`| ${i + 1} | \`kubejs/data/${r.rel}\` | \`${extra}\` | \`kubejs/data/${r.modernRel}\` |`)
  })
  p()
  const qf = nested.filter((r) => r.ns === 'quality_food')
  if (qf.length) {
    p(`其中最明确的一处笔误是 \`quality_food\` 的 ${qf.length} 个文件：1.20.1 源包里它们属于**顶层命名空间 \`quality_food_fluids\`**，`)
    p('迁移时整个目录被塞进了 `quality_food/` 里。')
    p(`（核对：\`mods/*.jar\` 里${nsJars.has('quality_food_fluids') ? '**存在**' : '**不存在**'} \`data/quality_food_fluids/\`，`)
    p(`\`data/quality_food/\` ${nsJars.has('quality_food') ? '存在' : '不存在'}。）`)
    p()
  }
  const cas = nested.filter((r) => r.ns === 'casualnessdelight')
  if (cas.length) {
    p(`\`casualnessdelight\` 的 ${cas.length} 个文件同理：1.20.1 源包的命名空间是 \`casualness_delight\`，1.21.1 改名成 \`casualnessdelight\`，`)
    p('迁移时把旧的命名空间目录整个挪到了新命名空间**里面**，于是多出一层 `casualness_delight`。')
    p()
  }
  p('### 7.2 `<rest>` 内还带旧目录名的文件')
  p()
  p(`有 ${legacyFiles.filter((r) => /(^|\/)(recipes|advancements|loot_tables|structures|predicates|item_modifiers|functions)(\/|$)/.test(r.rest)).length} 个文件的 \`<rest>\` 里还出现旧目录名（例如 \`advancements/recipes/...\`）。`)
  p('这些属于 advancement 的 ID 路径（`<ns>:recipes/food/xxx`），**不需要再改**，只要把最外层 `advancements` 改成 `advancement` 即可。')
  p()
  p('反之，已经用了 1.21 单数目录、只是 ID 里带旧词的路径（例如 `data/x/advancement/recipes/...`）**不在本报告范围内**，')
  p('脚本已按「先遇到单数类型目录就判定为新格式」排除，不会误报。')
  p()
  p('### 7.3 jar 内同时存在旧路径条目')
  p()
  const jarLegacy = cls2.filter((r) => r.jarLegacy)
  p(`第 2 类里有 ${jarLegacy.length} 个文件，对应 jar 内部同时保留了旧目录条目（mod 自己打包了两套/仍是旧名），复核时注意别把 jar 的旧条目当成有效来源。`)
  p()
  p('## 8. 建议处理顺序（仅建议，未执行任何改动）')
  p()
  p(`0. **总原则**：判断标准很清楚 ——`)
  p('   ① mod jar 里有对应单数文件、且包内内容 ≠ mod 原版内容 → `git mv` 改名（恢复覆盖意图）；')
  p('   ② 包内内容与 mod 原版一致（或仓库里已有单数副本）→ 删；')
  p('   ③ 目标在 1.21.1 已不存在（jar 里连单数文件都没有）→ 改名也无效，删。')
  p()
  p(`1. **先修「改动真的丢了」的两组**：第 2b 类真实内容覆盖 ${cls2bReal.length} 个 + 第 3 类真实内容缺口 ${cls3c.length} 个。`)
  p('   这两组是唯一「包里有内容、游戏里没有」的情况，其余都是冗余或废纸。')
  p(`   - 第 2b 类真实覆盖（${cls2bReal.length} 个）：\`git mv kubejs/data/<ns>/<legacy>/<rest> kubejs/data/<ns>/<modern>/<rest>\` 即可恢复覆盖意图，`)
  p('     **但必须先比对 diff**：其中 ' + (cls2bReal.filter((r) => r.dPack).length) + ' 个是 `create_structures_arise` 的 `.nbt` 结构文件，解压后与 mod 版本差异 <2%，')
  p('     基本可判定是「1.20.1 旧快照」而不是包内的有意改动 —— 这 31 个应当**删包内文件保留 mod 版本**；')
  p('     剩下 ' + (cls2bReal.length - cls2bReal.filter((r) => r.dPack).length) + ' 个（loot_table / recipe / tag / advancement）看 §3.1 的「包内 / jar 大小」列逐个体检后再改名。')
  p(`   - 第 3 类真实缺口（${cls3c.length} 个）：没有 mod 版本可覆盖，改名即新增。按旧类型分批：`)
  p(`     · \`structures/*.nbt\`（${cls3c.filter((r) => r.legacy === 'structures').length} 个）：二进制结构文件，包内是唯一来源，\`git mv\` 到 \`structure/\` 即可恢复；`)
  p(`     · \`tags/items|blocks|fluids\`（${cls3c.filter((r) => r.legacy.startsWith('tags/')).length} 个）：\`git mv\` 到 \`tags/item|block|fluid\`；`)
  p('       改完务必复核 tag 内物品 ID 在 1.21.1 是否还存在（命名空间改名 / 物品改名会让 tag 变空）。')
  p(`     · \`recipes\`（${cls3c.filter((r) => r.legacy === 'recipes').length} 个）、\`loot_tables\`（${cls3c.filter((r) => r.legacy === 'loot_tables').length} 个）、\`advancements\`（${cls3c.filter((r) => r.legacy === 'advancements').length} 个）：`)
  p('       先确认目标对象的注册 ID 在 1.21.1 是否还在（见 §4.1「同名近似条目」列，mod 常改 ID 目录），')
  p('       在 → 改到新 ID 路径；不在 → 直接删。')
  p(`2. **再修禁用失效**：第 2b 类禁用/删除存根 ${cls2bStub.length} 个，全部是「包内想禁用 mod 内容，但禁用没生效」。`)
  p('   这一组同质度极高（advancement 的 `minecraft:impossible` 存根 / 配方的 `{}` 空文件），可以批量 `git mv` 到单数目录，')
  p('   之后逐个用 `/reload` 或进游戏确认目标确实被禁用；**注意**：禁用意图是否需要保留取决于策划，')
  p('   如果确认「不介意 mod 原版 advancement 存在」，这 ' + cls2bStub.length + ' 个可以直接删。')
  p(`3. **第 3 类的禁用/删除存根（${cls3Stub.length} 个）直接删**：它们的禁用目标在 1.21.1 mod 里已经不存在（§4.2 同名近似条目为「—」的），`)
  p('   改名也禁不掉任何东西，属于废纸。')
  p(`3.5 **${rows.filter((r) => r.nested).length} 个嵌套异常文件单独处理**（§7.1）：它们多了一层目录，路径在 1.20.1 也不合法，`)
  p('   映射结果需要人工确认（`casualness_delight` 一层、`quality_food_fluids` 一层、`expatternprovider` 一层），')
  p('   不要跟着批量 `git mv` 一起走。')
  p(`4. **冗余批量删**：第 1 类 ${cls1.length} 个 + 第 2a 类 ${stats.byClass['2a']} 个 —— 内容与单数副本/mod 原版一致，删除不影响游戏；`)
  p(`   其中第 1 类里内容不一致的 ${cls1.filter((r) => r.same === 'different').length} 个（见 §6）先确认权威版本。`)
  p(`5. **第 4 类（命名空间无对应 mod，${cls4.length} 个）**：先按 §5.1 核对「是不是被改名/换了 mod」——是改名就连同新命名空间一起重挂，`)
  p('   确认 mod 已移除才整目录删。这一批本仓库当前为 0 个，若后续 mod 列表变动需重跑本脚本。')
  p('6. **收尾**：全部处理完后重跑 `node scripts/audit-legacy-datapack-paths.mjs`，期望「旧路径文件 0 个」；')
  p('   若仍有残留，检查 §7 的异常项（尤其 §7.1 的 `quality_food_fluids` 命名空间笔误）。')
  p('7. 全程用 `git mv` / 明确列文件的 `git add`，不要 `git add <目录>`（本仓库已踩过 `.bak`、运行期回写被卷进提交的坑）。')
  p('   建议按「第 2b 真实覆盖 → 第 3 类真实缺口 → 存根组 → 冗余组」分 4~5 个提交，每类一个提交便于回滚核对。')
  p()
}

/* ------------------------------------------------------------------ *
 * 9. 写报告
 * ------------------------------------------------------------------ */
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, L.join('\n'), 'utf8')
console.log(`\n报告已写入 ${OUT}（${L.length} 行）`)

/* 控制台摘要，便于直接引用 */
console.log('---- 摘要 ----')
console.log(`旧路径文件总数            : ${legacyFiles.length}`)
console.log(`1 已有单数副本            : ${stats.byClass[1]}`)
console.log(`2 覆盖失效（一致/冗余）   : ${stats.byClass['2a']}`)
console.log(`2 覆盖失效（不一致/丢失） : ${stats.byClass['2b']}  [真实内容 ${cls2bReal.length} / 禁用存根 ${cls2bStub.length}]`)
console.log(`3 完全没生效              : ${stats.byClass[3]}  [真实内容 ${cls3c.length} / 禁用存根 ${cls3Stub.length}]`)
console.log(`4 命名空间无对应 mod      : ${stats.byClass[4]}`)
console.log('\n第 2b 类真实内容覆盖 Top 15:')
topDiverse(cls2b, 15, 3).forEach((r, i) => console.log(`  ${String(i + 1).padStart(2)}. kubejs/data/${r.rel}  <- mods/${r.jar}  [${r.kind}]`))
console.log('\n第 3 类真实内容缺口 Top 15:')
topDiverse(cls3, 15, 3).forEach((r, i) => console.log(`  ${String(i + 1).padStart(2)}. kubejs/data/${r.rel}  (${r.kind})`))
console.log('\n第 2b 类禁用/删除存根 按命名空间:')
countByNs(cls2bStub).forEach(([ns, n]) => console.log(`  ${String(n).padStart(3)}  ${ns}`))
console.log('\n第 3 类禁用/删除存根 按命名空间:')
countByNs(cls3Stub).forEach(([ns, n]) => console.log(`  ${String(n).padStart(3)}  ${ns}`))
