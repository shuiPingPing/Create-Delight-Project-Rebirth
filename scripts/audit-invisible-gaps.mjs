// 重审 verify-lang-overlays.mjs 里那批"不可见缺口"（非可见前缀的缺键）。
//
// 背景：§8.12 用**前缀启发式**把 tag.*/commands.*/subtitles.* 之类判成"游戏里看不到"，
// 但 ali 那次证明前缀判断会整族漏掉真正会显示的键（漏了 317 条）。所以这次换**证据口径**：
//
//   1) 先把真正缺的键全部列出来（有效中文 = mod 自带 zh_cn ∪ 包内 overlay，与 verify 同口径）；
//   2) 对每个键找"代码里是否真的引用了这个键"的证据：
//      · 扫全部 mod jar 的 .class 常量池字符串（精确命中 / 前缀命中，如 "commands.ftbchunks."）；
//      · 扫包内 kubejs/**、config/**、defaultconfigs/** 的文本（有些键由数据/配置引用）；
//   3) 输出报告：命中代码的键 = 该翻（可见性有据），没命中的 = 需要人工再判（可能是动态拼接或死键）。
//
// 用法：node scripts/audit-invisible-gaps.mjs           （全量）
//       node scripts/audit-invisible-gaps.mjs ftbchunks （只跑某几个命名空间）
import fs from 'node:fs'
import path from 'node:path'
import { inflateRawSync } from 'node:zlib'

const REPO = 'D:/git-MC/CDR1211'
const ASSETS = path.join(REPO, 'kubejs/assets')
const OUT = 'D:/git-MC/_dsh_tmp'

const VISIBLE =
  /^(item|block|entity|effect|biome|itemGroup|item_group|gui|advancement|advancements|container|jei|jade|jadeaddons|config|tooltip|guideme|accessories|curios|menu|screen|slot)[.\w]*$/

/** 极简 zip 中央目录解析（与 verify-lang-overlays.mjs 同款，支持 jar 内嵌 jar） */
function zipEntries(buf, want, depth = 0) {
  const out = []
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  if (eocd < 0) return out
  let count = buf.readUInt16LE(eocd + 10)
  let cdOff = buf.readUInt32LE(eocd + 16)
  if (count === 0xffff || cdOff === 0xffffffff) {
    const loc = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x06, 0x07]))
    if (loc >= 0) {
      const z64 = Number(buf.readBigUInt64LE(loc + 8))
      count = Number(buf.readBigUInt64LE(z64 + 32))
      cdOff = Number(buf.readBigUInt64LE(z64 + 48))
    }
  }
  let off = cdOff
  for (let i = 0; i < count; i++) {
    if (off + 46 > buf.length || buf.readUInt32LE(off) !== 0x02014b50) break
    const method = buf.readUInt16LE(off + 10)
    const compSize = buf.readUInt32LE(off + 20)
    const nameLen = buf.readUInt16LE(off + 28)
    const extraLen = buf.readUInt16LE(off + 30)
    const commentLen = buf.readUInt16LE(off + 32)
    const localOff = buf.readUInt32LE(off + 42)
    const name = buf.slice(off + 46, off + 46 + nameLen).toString('utf8')
    const nl = buf.readUInt16LE(localOff + 26)
    const el = buf.readUInt16LE(localOff + 28)
    const start = localOff + 30 + nl + el
    const raw = buf.slice(start, start + compSize)
    const inflate = () => {
      try {
        return method === 8 ? inflateRawSync(raw) : raw
      } catch {
        return null
      }
    }
    if (want.test(name)) {
      const data = inflate()
      if (data) out.push({ name, data })
    } else if (/\.jar$/i.test(name) && depth < 2) {
      const sub = inflate()
      if (sub && sub.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])) > 0) {
        for (const t of zipEntries(sub, want, depth + 1)) out.push(t)
      }
    }
    off += 46 + nameLen + extraLen + commentLen
  }
  return out
}

const parseLang = (text) => {
  try {
    return JSON.parse(text)
  } catch {
    try {
      return JSON.parse(text.replace(/^\s*\/\/.*$/gm, ''))
    } catch {
      return null
    }
  }
}

// ---------- 0) 每个 jar 只读一次，把 assets/<ns>/lang/*.json 全收起来 ----------
const modJars = fs.readdirSync(path.join(REPO, 'mods')).filter((f) => f.endsWith('.jar'))
const langCache = new Map() // ns -> {jar, en, zh}
const LANG_RE = /^assets\/([^/]+)\/lang\/(en_us|zh_cn)\.json$/i
for (let i = 0; i < modJars.length; i++) {
  const f = modJars[i]
  let buf
  try {
    buf = fs.readFileSync(path.join(REPO, 'mods', f))
  } catch {
    continue
  }
  for (const e of zipEntries(buf, LANG_RE)) {
    const m = e.name.match(LANG_RE)
    if (!m) continue
    const ns = m[1]
    const kind = m[2].toLowerCase() === 'en_us' ? 'en' : 'zh'
    const cur = langCache.get(ns) ?? { jar: f, en: null, zh: null }
    if (cur[kind] === null) {
      cur[kind] = parseLang(e.data.toString('utf8'))
      if (cur.jar === null) cur.jar = f
      langCache.set(ns, cur)
    }
  }
  if ((i + 1) % 100 === 0) console.log(`  已读 ${i + 1}/${modJars.length} jar 的 lang…`)
}
function modLang(ns) {
  return langCache.get(ns) ?? { jar: null, en: null, zh: null }
}

const argNs = process.argv.slice(2)
const targets = (argNs.length ? argNs : fs.readdirSync(ASSETS)).filter(
  (ns) => fs.existsSync(path.join(ASSETS, ns, 'lang/zh_cn.json'))
)

/** key -> {ns, en, bucket} */
const gaps = new Map()
const perNs = []
for (const ns of targets) {
  const en = modLang(ns)
  if (!en?.en) continue
  let zh
  try {
    zh = JSON.parse(fs.readFileSync(path.join(ASSETS, ns, 'lang/zh_cn.json'), 'utf8'))
  } catch {
    continue
  }
  const effZh = { ...(en.zh ?? {}), ...zh }
  const rest = Object.keys(en.en).filter((k) => effZh[k] === undefined && !VISIBLE.test(k))
  if (!rest.length) continue
  const buckets = {}
  for (const k of rest) {
    const seg = k.split('.')[0]
    const cls = ['tag', 'commands', 'subtitles', 'jukebox_song', 'death'].includes(seg) ? seg : 'mod前缀'
    buckets[cls] = (buckets[cls] ?? 0) + 1
    gaps.set(k, { ns, en: en.en[k], bucket: cls, jar: en.jar })
  }
  perNs.push({ ns, jar: en.jar, total: rest.length, buckets })
}

// ---------- 2) 证据：jar 字节码 / 包内文本 ----------
const keys = [...gaps.keys()]
const keySet = new Set(keys)
// 前缀集合（按 '.' 边界切），用于识别 "commands.ftbchunks." 这种拼接写法
const prefixSet = new Set()
for (const k of keys) {
  const parts = k.split('.')
  for (let i = 1; i < parts.length; i++) prefixSet.add(parts.slice(0, i).join('.') + '.')
}
const evidence = new Map() // key -> { full:Set, prefix:Set, wildcard:Set, suffix:Set }

function hit(key, kind, source) {
  let e = evidence.get(key)
  if (!e) evidence.set(key, (e = { full: new Set(), prefix: new Set(), wildcard: new Set(), suffix: new Set() }))
  e[kind].add(source)
}

// 单段通配变体：a.b.c → *,b.c / a,*,c / a.b,*（用于识别 "sodium.options.%s.name" 这类动态拼接）
const variantsOf = (k) => {
  const p = k.split('.')
  const out = []
  for (let i = 0; i < p.length; i++) out.push(p.map((s, j) => (j === i ? '*' : s)).join('.'))
  return out
}
// 末段（≥5 字符）作为"动态拼接"的弱证据
const suffixOf = (k) => {
  const last = k.split('.').pop()
  return last && last.length >= 5 ? last : null
}

// 2a) jar 里的 .class：抽 ASCII 串后再比对（比逐个 includes 快）
const jarList = modJars.map((f) => path.join(REPO, 'mods', f))
const libDir = path.join(REPO, 'libraries/net/neoforged/neoforge/21.1.242')
if (fs.existsSync(libDir)) for (const f of fs.readdirSync(libDir)) if (f.endsWith('.jar')) jarList.push(path.join(libDir, f))

let jarDone = 0
for (const jarPath of jarList) {
  const jarName = path.basename(jarPath)
  let buf
  try {
    buf = fs.readFileSync(jarPath)
  } catch {
    continue
  }
  const classes = zipEntries(buf, /\.class$/i)
  const strings = new Set()
  for (const c of classes) {
    const t = c.data.toString('latin1')
    for (const m of t.match(/[\x20-\x7e]{5,200}/g) ?? []) strings.add(m)
  }
  // 归一化集合：把格式化占位符换成 '*'，这样 "sodium.options.%s.name" ≡ "sodium.options.*.name"
  const normSet = new Set()
  for (const s of strings) {
    normSet.add(s)
    if (/[%{}]/.test(s)) {
      normSet.add(s.replace(/%(?:\d+\$)?[sdSf]|\{[^}]*\}/g, '*'))
      normSet.add(s.replace(/%(?:\d+\$)?[sdSf]|\{[^}]*\}/g, '*').replace(/\*/g, '*'))
    }
  }
  for (const s of strings) {
    if (keySet.has(s)) hit(s, 'full', jarName)
    else if (prefixSet.has(s)) for (const k of keys) if (k.startsWith(s)) hit(k, 'prefix', jarName)
  }
  for (const k of keys) {
    const e = evidence.get(k)
    if (e?.full.size) continue
    for (const v of variantsOf(k)) {
      if (normSet.has(v) || normSet.has(v.replace(/\*/g, '%s'))) {
        hit(k, 'wildcard', jarName)
        break
      }
    }
    const suf = suffixOf(k)
    if (suf && strings.has(suf)) hit(k, 'suffix', jarName)
  }
  jarDone++
  if (jarDone % 50 === 0) console.log(`  已扫 ${jarDone}/${jarList.length} jar…`)
}

// 2b) 包内文本（kubejs / config / defaultconfigs）
function walkFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walkFiles(p, acc)
    else if (/\.(js|json|json5|toml|snbt|txt|md)$/i.test(e.name)) acc.push(p)
  }
  return acc
}
const packFiles = [
  ...walkFiles(path.join(REPO, 'kubejs')),
  ...walkFiles(path.join(REPO, 'config')),
  ...walkFiles(path.join(REPO, 'defaultconfigs')),
]
let packHits = 0
for (const f of packFiles) {
  let t
  try {
    t = fs.readFileSync(f, 'utf8')
  } catch {
    continue
  }
  if (!t.includes('.')) continue
  const rel = path.relative(REPO, f).replaceAll('\\', '/')
  for (const m of t.match(/[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+){2,}/g) ?? []) {
    if (keySet.has(m)) {
      hit(m, 'full', `包内:${rel}`)
      packHits++
    } else if (prefixSet.has(m)) {
      for (const k of keys) if (k.startsWith(m)) hit(k, 'prefix', `包内:${rel}`)
    }
  }
}

// ---------- 3) 报告 ----------
// 证据分级：
//   A 精确命中（常量池里有整条键）        → 一定被代码引用，该翻
//   B 前缀命中（jar 里有 "xxx." 前缀）    → 拼接写法，该翻
//   C 通配命中（"a.%s.c" ≡ "a.*.c"）      → 动态拼接，该翻
//   D 只有末段命中（弱证据，需人工看）    → 可能动态、也可能是死键
//   E 完全无命中                          → 多半是死键/资源包用键
const classify = (rec) => (rec.full.length ? 'A' : rec.prefix.length ? 'B' : rec.wildcard.length ? 'C' : rec.suffix.length ? 'D' : 'E')
const referenced = []
const unreferenced = []
for (const [k, info] of gaps) {
  const e = evidence.get(k)
  const rec = {
    ...info,
    key: k,
    full: [...(e?.full ?? [])],
    prefix: [...(e?.prefix ?? [])],
    wildcard: [...(e?.wildcard ?? [])],
    suffix: [...(e?.suffix ?? [])],
  }
  rec.grade = classify(rec)
  if (rec.grade === 'A' || rec.grade === 'B' || rec.grade === 'C') referenced.push(rec)
  else unreferenced.push(rec)
}

const byBucket = (arr) => {
  const m = {}
  for (const r of arr) m[r.bucket] = (m[r.bucket] ?? 0) + 1
  return m
}
const byGrade = (arr) => {
  const m = {}
  for (const r of arr) m[r.grade] = (m[r.grade] ?? 0) + 1
  return m
}

const lines = []
lines.push('# 「不可见缺口」重审：代码引用证据')
lines.push('')
lines.push(`- 口径：有效中文 = mod 自带 zh_cn ∪ 包内 overlay（同 verify-lang-overlays.mjs）；`)
lines.push(`  只统计**非可见前缀**的缺键，共 **${keys.length}** 个（覆盖 ${perNs.length} 个命名空间）。`)
lines.push(`- 证据：① 全部 mod jar + NeoForge jar 的 .class 常量池字符串；② 包内 kubejs/config/defaultconfigs 文本。`)
lines.push(`- 分级：**A** 精确命中 / **B** 前缀命中（`+'`"xxx."`'+` 拼接）/ **C** 通配命中（`+'`a.%s.c`'+` 动态键）/ **D** 仅末段命中（弱证据）/ **E** 无命中。`)
lines.push(`- **该翻（A+B+C）：${referenced.length}**（${JSON.stringify(byGrade(referenced))}）；`)
lines.push(`  需人工再判（D+E）：**${unreferenced.length}**（${JSON.stringify(byGrade(unreferenced))}）`)
lines.push(`- 按类分：该翻 ${JSON.stringify(byBucket(referenced))}`)
lines.push(`  待判 ${JSON.stringify(byBucket(unreferenced))}`)
lines.push('')
lines.push('## 每命名空间缺口数')
lines.push('')
lines.push('| 命名空间 | 缺口 | 其中 tag | commands | subtitles | jukebox_song | death | mod前缀 | jar |')
lines.push('|---|---|---|---|---|---|---|---|---|')
for (const r of perNs.sort((a, b) => b.total - a.total)) {
  const b = r.buckets
  lines.push(
    `| \`${r.ns}\` | ${r.total} | ${b.tag ?? 0} | ${b.commands ?? 0} | ${b.subtitles ?? 0} | ${b.jukebox_song ?? 0} | ${b.death ?? 0} | ${b['mod前缀'] ?? 0} | ${r.jar} |`
  )
}
lines.push('')
lines.push('## 该翻：有代码引用（A/B/C）')
lines.push('')
lines.push('| 级 | 命名空间 | 键 | 类 | 英文 | 证据 jar/文件 |')
lines.push('|---|---|---|---|---|---|')
for (const r of referenced.sort((a, b) => a.grade.localeCompare(b.grade) || a.ns.localeCompare(b.ns) || a.key.localeCompare(b.key))) {
  const ev = [
    ...r.full,
    ...r.prefix.map((p) => p + '(前缀)'),
    ...r.wildcard.map((p) => p + '(通配)'),
  ]
    .slice(0, 4)
    .join('<br>')
  lines.push(
    `| ${r.grade} | \`${r.ns}\` | \`${r.key}\` | ${r.bucket} | ${String(r.en).replaceAll('|', '\\|')} | ${ev} |`
  )
}
lines.push('')
lines.push('## 待判：只有弱证据或无命中（D/E）')
lines.push('')
lines.push('| 级 | 命名空间 | 键 | 类 | 英文 | 末段命中 |')
lines.push('|---|---|---|---|---|---|')
for (const r of unreferenced.sort((a, b) => a.ns.localeCompare(b.ns) || a.key.localeCompare(b.key))) {
  lines.push(
    `| ${r.grade} | \`${r.ns}\` | \`${r.key}\` | ${r.bucket} | ${String(r.en).replaceAll('|', '\\|')} | ${r.suffix.slice(0, 2).join(',')} |`
  )
}
lines.push('')

fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(path.join(OUT, 'invisible-gaps.md'), lines.join('\n'), 'utf8')
fs.writeFileSync(
  path.join(OUT, 'invisible-gaps.json'),
  JSON.stringify({ generatedFor: targets.length, gaps: referenced.concat(unreferenced) }, null, 1),
  'utf8'
)

console.log(`缺口键 ${keys.length}；该翻 ${referenced.length} ${JSON.stringify(byGrade(referenced))}；待判 ${unreferenced.length} ${JSON.stringify(byGrade(unreferenced))}`)
console.log(`报告：${path.join(OUT, 'invisible-gaps.md')}`)
console.log(`包内文本命中：${packHits}`)
