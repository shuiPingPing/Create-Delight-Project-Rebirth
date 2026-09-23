// 值级扫描：找出**玩家可见键**里仍然是英文的条目（比 list-english-only-mods.mjs 更严格）。
//
// 它修掉旧扫描的两个盲区：
//   1. 旧扫描只比「键集合」——"键在 mod 自带 zh_cn 里存在、但值是英文"这类看不见；
//   2. 旧扫描的可见键前缀漏了 `key.*`（游戏「控制」界面里的按键名）。
// 判定：
//   - 有效中文 = mod 自带 zh_cn ∪ 包内覆盖层 zh_cn（游戏语言文件按 key 合并）；
//   - 英文来源 = mod 自带 en_us ∪ 包内覆盖层 en_us；
//   - 某可见键算"仍是英文"如果：有效中文里没有它，或者它的值里**没有任何 CJK 字符**而英文值里有 ASCII 字母
//     （纯格式串 `%s mB`、URL、纯符号值会被排除）。
// 用法：node scripts/scan-visible-english.mjs [--out <path>]
import fs from 'node:fs'
import path from 'node:path'
import { inflateRawSync } from 'node:zlib'

const REPO = 'D:/git-MC/CDR1211'
const outArg = process.argv.indexOf('--out')
const OUT = outArg > 0 ? process.argv[outArg + 1] : 'D:/git-MC/_dsh_tmp/visible-english.md'

const VISIBLE =
  /^(item|block|entity|effect|biome|itemGroup|item_group|gui|advancement|advancements|container|jei|jade|jadeaddons|config|tooltip|guideme|accessories|curios|menu|screen|slot|key|keybind|keys)[.\w]*$/

/* ---------- zip ---------- */
function collect(buf, want, depth = 0) {
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
    if (name.toLowerCase() === want.toLowerCase()) {
      const nl = buf.readUInt16LE(localOff + 26)
      const el = buf.readUInt16LE(localOff + 28)
      const start = localOff + 30 + nl + el
      const raw = buf.slice(start, start + compSize)
      out.push(method === 8 ? inflateRawSync(raw).toString('utf8') : raw.toString('utf8'))
    } else if (/\.jar$/i.test(name) && depth < 2) {
      const nl = buf.readUInt16LE(localOff + 26)
      const el = buf.readUInt16LE(localOff + 28)
      const start = localOff + 30 + nl + el
      const rawSub = buf.slice(start, start + compSize)
      let sub = null
      try {
        sub = method === 8 ? inflateRawSync(rawSub) : rawSub
      } catch {}
      if (sub && sub.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])) > 0) for (const t of collect(sub, want, depth + 1)) out.push(t)
    }
    off += 46 + nameLen + extraLen + commentLen
  }
  return out
}

/** 宽松解析：剥 BOM（ends_delight 等带 BOM）、容忍 // 注释（createcafe） */
function parseLang(text) {
  const t = text.replace(/^\uFEFF/, '')
  try {
    return JSON.parse(t)
  } catch {
    try {
      return JSON.parse(t.replace(/^\s*\/\/.*$/gm, ''))
    } catch {
      return null
    }
  }
}

const jars = fs.readdirSync(path.join(REPO, 'mods')).filter((f) => f.endsWith('.jar'))
const langCache = new Map()
function modLang(jar, ns) {
  const key = `${jar}\u0000${ns}`
  if (langCache.has(key)) return langCache.get(key)
  const res = {}
  try {
    const buf = fs.readFileSync(path.join(REPO, 'mods', jar))
    for (const lang of ['en_us', 'zh_cn']) {
      const hits = collect(buf, `assets/${ns}/lang/${lang}.json`)
      res[lang] = hits.length ? parseLang(hits[0]) : null
    }
  } catch {
    res.en_us = null
    res.zh_cn = null
  }
  langCache.set(key, res)
  return res
}

const packLang = (ns, lang) => {
  const p = path.join(REPO, 'kubejs/assets', ns, 'lang', `${lang}.json`)
  return fs.existsSync(p) ? parseLang(fs.readFileSync(p, 'utf8')) : null
}

/* ---------- 收集命名空间 ---------- */
const namespaces = new Set()
for (const ns of fs.readdirSync(path.join(REPO, 'kubejs/assets'))) namespaces.add(ns)
const jarNs = new Map() // ns -> jar（含内嵌）
for (const jar of jars) {
  try {
    const buf = fs.readFileSync(path.join(REPO, 'mods', jar))
    // 用目录清单抓命名空间：直接找所有 lang 条目
    const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
    if (eocd < 0) continue
    const listing = []
    // 简化：对每个已知命名空间下面再查（命名空间集合来自包内 assets + en_us 探测）
    listing.push(...jarNs.keys())
    void listing
  } catch {}
}
// 命名空间候选：包内 assets 目录 + 所有 jar 里的 assets/*/lang（用一次遍历）
for (const jar of jars) {
  try {
    const buf = fs.readFileSync(path.join(REPO, 'mods', jar))
    const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
    if (eocd < 0) continue
    let count = buf.readUInt16LE(eocd + 10)
    let cdOff = buf.readUInt32LE(eocd + 16)
    let off = cdOff
    for (let i = 0; i < count; i++) {
      const nameLen = buf.readUInt16LE(off + 28)
      const extraLen = buf.readUInt16LE(off + 30)
      const commentLen = buf.readUInt16LE(off + 32)
      const name = buf.slice(off + 46, off + 46 + nameLen).toString('utf8')
      const m = /^assets\/([^/]+)\/lang\/(en_us|zh_cn)\.json$/i.exec(name)
      if (m) {
        namespaces.add(m[1])
        if (!jarNs.has(m[1])) jarNs.set(m[1], jar)
      }
      off += 46 + nameLen + extraLen + commentLen
    }
  } catch {}
}

const hasCJK = (s) => /[\u3400-\u9FFF\uF900-\uFAFF\u3040-\u30FF]/.test(s)
const hasLetters = (s) => /[A-Za-z]{2,}/.test(s)
const isNoise = (s) =>
  /^[\s%sd0-9.,:/\-+()<>[\]{}'"`|\\nrt§#&@!?*=~^$;]*$/i.test(s.replace(/\{[^}]*\}/g, '')) ||
  /^https?:\/\//.test(s.trim()) ||
  /\.[a-z]{2,4}(\/|$)/i.test(s.trim())

const rows = []
let total = 0
for (const ns of [...namespaces].sort()) {
  const jar = jarNs.get(ns)
  const mod = jar ? modLang(jar, ns) : { en_us: null, zh_cn: null }
  const en = { ...(mod.en_us ?? {}), ...(packLang(ns, 'en_us') ?? {}) }
  const zh = { ...(mod.zh_cn ?? {}), ...(packLang(ns, 'zh_cn') ?? {}) }
  const flagged = []
  for (const k of Object.keys(en)) {
    if (!VISIBLE.test(k)) continue
    const v = en[k]
    if (typeof v !== 'string') continue
    const z = zh[k]
    if (z === undefined) {
      flagged.push({ k, kind: '缺键', en: v })
    } else if (!hasCJK(z) && hasLetters(v) && !isNoise(v) && !isNoise(z)) {
      flagged.push({ k, kind: '值为英文', en: v, zh: z })
    }
  }
  if (!flagged.length) continue
  total += flagged.length
  rows.push({ ns, n: flagged.length, jar: jar ?? '(仅包内)', flagged })
}
rows.sort((a, b) => b.n - a.n)

const md = [
  '# 仍显示英文的可见键（值级口径：有效中文 = mod zh ∪ 包内 overlay）',
  '',
  '判定：可见键（含 `key.*` 按键名）在有效中文里缺失，或值中**完全不含中日文字符**而英文值含字母（排除纯格式串/URL）。',
  '',
  `共 **${rows.length}** 个命名空间 / **${total}** 个可见英文键。`,
  '',
  '| # | 命名空间 | 数量 | jar | 例 |',
  '|---|---|---|---|---|',
  ...rows.map((r, i) => `| ${i + 1} | \`${r.ns}\` | **${r.n}** | ${r.jar} | ${r.flagged.slice(0, 2).map((f) => f.k).join(' / ')} |`),
  '',
  '## 明细',
  '',
  ...rows.flatMap((r) => [`### ${r.ns}（${r.n}）`, '', ...r.flagged.map((f) => `- \`${f.k}\` [${f.kind}] en=\`${f.en}\`${f.zh ? ` zh=\`${f.zh}\`` : ''}`), '']),
]
fs.writeFileSync(OUT, `${md.join('\n')}\n`)
console.log(`共 ${rows.length} 个命名空间 / ${total} 个可见英文键`)
for (const [i, r] of rows.slice(0, 20).entries()) console.log(`  ${String(i + 1).padStart(2)}. ${r.ns.padEnd(34)} ${String(r.n).padStart(3)}  ${r.jar}`)
console.log(`报告：${OUT}`)
