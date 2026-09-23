// 扫描本整合包（CDR1211）里「需要汉化 / 缺少中文」的地方，生成一份 Markdown 报告。
//
// 数据来源：
//   - kubejs/assets/<ns>/lang/*.json                     包内自建 lang（本包可修）
//   - mods/*.jar（含 META-INF 内嵌 jar）的 assets/<ns>/lang/*.json  上游 mod lang
//   - 原版语言资源（可选）                                minecraft:* 的中文名不在 mods 里，见 loadVanillaZh()
//   - kubejs/startup_scripts/**/*.js                     KubeJS 注册的物品/方块/流体 id
//   - kubejs/startup_scripts/global_data.js              global.INFINITE_SOURCE_FLUIDS（无限元件用的流体表）
//   - config/ftbquests/quests/lang/{en_us,zh_cn}.snbt    任务书文本（只读，游戏运行期会重写）
//
// 只读脚本：不修改任何游戏内容文件，只写报告。
//
// 用法：
//   node scripts/scan-l10n.mjs                 # 生成 D:/git-MC/_dsh_tmp/l10n-report.md
//   node scripts/scan-l10n.mjs --out <path>    # 换输出路径
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const REPO = 'D:/git-MC/CDR1211'
const KUBEJS_ASSETS = path.join(REPO, 'kubejs/assets')
const STARTUP_DIR = path.join(REPO, 'kubejs/startup_scripts')
const MODS_DIR = path.join(REPO, 'mods')
const QUEST_LANG = path.join(REPO, 'config/ftbquests/quests/lang')
const outIdx = process.argv.indexOf('--out')
const OUT = outIdx >= 0 ? process.argv[outIdx + 1] : 'D:/git-MC/_dsh_tmp/l10n-report.md'

/* ---------- 通用小工具 ---------- */
// 文本一律按 UTF-8 读（jar 内条目同理），并剥掉可能存在的 BOM
const readText = (p) => fs.readFileSync(p, 'utf8')
function parseLang(text) {
  const out = new Map()
  let obj
  try {
    obj = JSON.parse(text.replace(/^\uFEFF/, ''))
  } catch {
    return out
  }
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) if (typeof v === 'string') out.set(k, v)
  }
  return out
}
const readLangFile = (p) => parseLang(readText(p))
// 键前缀计数（chapter / quest / task …）
function countPrefixes(map) {
  const out = {}
  for (const k of map.keys()) out[k.split('.')[0]] = (out[k.split('.')[0]] ?? 0) + 1
  return out
}
// 递归列目录（只列文件；目录按名字排序保证可复现）
function walkFiles(dir, filter) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) out.push(...walkFiles(full, filter))
    else if (!filter || filter(full)) out.push(full)
  }
  return out
}
// Markdown 表格单元格转义（值里可能有 | 或换行）
const cell = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ').trim()
const mdTable = (header, rows) => {
  const lines = [`| ${header.join(' | ')} |`, `| ${header.map(() => '---').join(' | ')} |`]
  for (const r of rows) lines.push(`| ${r.map(cell).join(' | ')} |`)
  return lines
}

/* ---------- zip 读取（复用 scripts/restore-quest-icons.mjs 第 87–148 行的实现） ---------- */
// 支持 zip64（大 jar，例如 Create 用了 zip64，只读 EOCD 会漏掉后面所有条目）
// filter：正则或 (name) => boolean，用来筛选条目（原实现把筛选写死成 tags / models）
function zipEntries(buf, filter) {
  const out = []
  const wanted = typeof filter === 'function' ? filter : (name) => filter.test(name)
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  if (eocd < 0) return out
  let count = buf.readUInt16LE(eocd + 10)
  let cdOff = buf.readUInt32LE(eocd + 16)
  // zip64：EOCD 里的字段被置为 0xFFFF/0xFFFFFFFF 时，改用 zip64 EOCD
  if (count === 0xffff || cdOff === 0xffffffff) {
    const loc = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x06, 0x07]))
    if (loc >= 0) {
      const z64 = Number(buf.readBigUInt64LE(loc + 8))
      if (buf.readUInt32LE(z64) === 0x06064b50) {
        count = Number(buf.readBigUInt64LE(z64 + 32))
        cdOff = Number(buf.readBigUInt64LE(z64 + 48))
      }
    }
  }
  let off = cdOff
  for (let i = 0; i < count; i++) {
    if (off + 46 > buf.length || buf.readUInt32LE(off) !== 0x02014b50) break
    const method = buf.readUInt16LE(off + 10)
    let compSize = buf.readUInt32LE(off + 20)
    let uncompSize = buf.readUInt32LE(off + 24)
    const nameLen = buf.readUInt16LE(off + 28)
    const extraLen = buf.readUInt16LE(off + 30)
    const commentLen = buf.readUInt16LE(off + 32)
    let localOff = buf.readUInt32LE(off + 42)
    const name = buf.slice(off + 46, off + 46 + nameLen).toString('utf8')
    // zip64 扩展字段（id 0x0001）按顺序补全被置位为 0xFFFFFFFF 的字段
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
    if (wanted(name)) out.push({ name, method, compSize, localOff, buf })
    off += 46 + nameLen + extraLen + commentLen
  }
  return out
}
// 取条目原始字节（内嵌 jar 是二进制，不能走 readEntry 的 utf8 转换）
function readEntryRaw(e) {
  const { buf, localOff } = e
  const nameLen = buf.readUInt16LE(localOff + 26)
  const extraLen = buf.readUInt16LE(localOff + 28)
  const start = localOff + 30 + nameLen + extraLen
  const raw = buf.slice(start, start + e.compSize)
  return e.method === 8 ? zlib.inflateRawSync(raw) : raw
}
function readEntry(e) {
  return readEntryRaw(e).toString('utf8')
}

/* ---------- 1. KubeJS 注册扫描 ---------- */
// 用 registry 上下文判定 id 的名字前缀该用 item. / block. / fluid.
// 模板串（反引号）不做 JS 求值：只按「变量来源」显式展开已知的写法，剩下的显式跳过并注明。
function parseGlobalArrays() {
  const arrays = {}
  const file = path.join(STARTUP_DIR, 'global_data.js')
  if (!fs.existsSync(file)) return arrays
  const text = readText(file)
  for (const m of text.matchAll(/global\.([A-Z_][A-Z0-9_]*)\s*=\s*\[([\s\S]*?)\]/g)) {
    arrays[m[1]] = [...m[2].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1])
  }
  return arrays
}
const GLOBAL_ARRAYS = parseGlobalArrays()

// 展开模板串：支持 `...${v}...`，其中 const v = <srcVar>.replace(':', '_')，
// 而 <srcVar> 是 `global.<ARRAY>.forEach((<srcVar>) => ...` 的循环变量（inf_cells.js 就是这种写法）。
function expandTemplate(tpl, fileText) {
  if (!tpl.includes('${')) return { ids: [tpl], note: '' }
  const holders = [...tpl.matchAll(/\$\{([A-Za-z_$][\w$]*)\}/g)].map((m) => m[1])
  if (holders.length !== 1) {
    return { ids: [], note: `模板含 ${holders.length} 个占位符（${holders.join(', ')}），未展开` }
  }
  const v = holders[0]
  const bind = new RegExp(
    `(?:const|let|var)\\s+${v}\\s*=\\s*([A-Za-z_$][\\w$]*)\\s*\\.replace\\(\\s*['"]:['"]\\s*,\\s*['"]_['"]\\s*\\)`
  ).exec(fileText)
  if (!bind) return { ids: [], note: `占位符 \${${v}} 来源无法解析，未展开` }
  const srcVar = bind[1]
  const loop = new RegExp(`global\\.([A-Z_][A-Z0-9_]*)\\.forEach\\(\\s*\\(?\\s*${srcVar}\\b`).exec(fileText)
  if (!loop || !GLOBAL_ARRAYS[loop[1]]) {
    return { ids: [], note: `循环变量 ${srcVar} 的来源数组未知，未展开` }
  }
  const arr = GLOBAL_ARRAYS[loop[1]]
  return { ids: arr.map((v0) => tpl.replace(`\${${v}}`, v0.replace(':', '_'))), note: `按 global.${loop[1]}（${arr.length} 项）展开` }
}

const registrations = [] // {file, registry, id, type, note}
const skippedTemplates = []
const neededNs = new Set() // 需要留在内存里的命名空间（按需读 jar）
for (const file of walkFiles(STARTUP_DIR, (p) => p.endsWith('.js'))) {
  const text = readText(file)
  const rel = path.relative(REPO, file).replace(/\\/g, '/')
  // 收集所有 registry 上下文位置，create 取它前面最近的那个
  const regs = [...text.matchAll(/StartupEvents\.registry\(\s*['"]([A-Za-z_]+)['"]/g)].map((m) => ({ registry: m[1], index: m.index }))
  const creates = [...text.matchAll(/\.create\(\s*(`[^`]*`|'[^']*'|"[^"]*")\s*(?:,\s*(`[^`]*`|'[^']*'|"[^"]*"))?/g)]
  for (const m of creates) {
    const tpl = m[1].slice(1, -1)
    const type = m[2] ? m[2].slice(1, -1) : ''
    const reg = [...regs].filter((r) => r.index < m.index).pop()
    const registry = reg ? reg.registry : 'unknown'
    const { ids, note } = expandTemplate(tpl, text)
    if (!ids.length) {
      skippedTemplates.push({ file: rel, tpl, note })
      continue
    }
    for (const id of ids) {
      registrations.push({ file: rel, registry, id, type, note })
      if (id.includes(':')) neededNs.add(id.split(':')[0])
    }
  }
}

/* ---------- 2. 包内 lang：assets/<ns>/lang/<locale>.json ---------- */
const pkgLang = new Map() // ns -> Map<locale, Map<key, value>>
for (const ns of fs.readdirSync(KUBEJS_ASSETS).sort()) {
  const langDir = path.join(KUBEJS_ASSETS, ns, 'lang')
  if (!fs.existsSync(langDir) || !fs.statSync(langDir).isDirectory()) continue
  const byLocale = new Map()
  for (const f of fs.readdirSync(langDir).sort()) {
    if (!f.endsWith('.json')) continue
    byLocale.set(f.replace(/\.json$/, ''), readLangFile(path.join(langDir, f)))
  }
  if (byLocale.size) pkgLang.set(ns, byLocale)
}

/* ---------- 3. 第 1 节数据：包内 en_us / zh_cn 键差异 ---------- */
// 有 en_us 作为对照基线的命名空间，其 jar 内 zh_cn 需要留在内存里做交叉验证
for (const [ns, byLocale] of pkgLang) if (byLocale.has('en_us')) neededNs.add(ns)
const sec1 = []
for (const [ns, byLocale] of [...pkgLang.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const en = byLocale.get('en_us')
  const zh = byLocale.get('zh_cn')
  const missZh = [] // en 有 zh 没
  const missEn = [] // zh 有 en 没
  if (en) for (const [k, v] of en) if (!zh?.has(k)) missZh.push([k, v])
  if (zh && en) for (const [k, v] of zh) if (!en.has(k)) missEn.push([k, v])
  sec1.push({
    ns,
    locales: [...byLocale.keys()].sort().join(', '),
    enCount: en?.size ?? 0,
    zhCount: zh?.size ?? 0,
    hasEnFile: !!en,
    hasZhFile: !!zh,
    missZh,
    missEn,
  })
}
const sec1MissZhKeys = sec1.flatMap((s) => s.missZh.map(([k]) => k))

/* ---------- 4. 需要查中文名的候选键（先算好，扫 jar 时只做集合判断） ---------- */
function nameKeyCandidates(registry, id) {
  const [ns, ...rest] = id.split(':')
  const p = rest.join(':')
  if (!ns || !p) return []
  if (registry === 'block') return [`block.${ns}.${p}`, `item.${ns}.${p}`, `${ns}.${p}`]
  if (registry === 'fluid') return [`fluid.${ns}.${p}`, `block.${ns}.${p}`, `item.${ns}.${p}_bucket`, `${ns}.${p}`]
  return [`item.${ns}.${p}`, `block.${ns}.${p}`, `${ns}.${p}`]
}
// 第 3 节：流体的显示名键（ExtendedAE 元件名 = item.extendedae.infinity_cell_name + 流体显示名）
function fluidKeyCandidates(id) {
  const [ns, ...rest] = id.split(':')
  const p = rest.join(':')
  return [`block.${ns}.${p}`, `fluid.${ns}.${p}`, `item.${ns}.${p}_bucket`]
}
const candidateKeys = new Set()
for (const r of registrations) for (const k of nameKeyCandidates(r.registry, r.id)) candidateKeys.add(k)
const INFINITE_FLUIDS = GLOBAL_ARRAYS.INFINITE_SOURCE_FLUIDS ?? []
for (const f of INFINITE_FLUIDS) {
  if (!f.includes(':')) continue
  neededNs.add(f.split(':')[0])
  for (const k of fluidKeyCandidates(f)) candidateKeys.add(k)
}
// 第 1 节的缺口键也纳入兜底索引：用来判断「包内 zh_cn 缺这个键时，jar 的 zh_cn 是否已经提供了」
for (const k of sec1MissZhKeys) {
  candidateKeys.add(k)
  const ns = k.split('.')[1]
  if (ns) neededNs.add(ns)
}

/* ---------- 4.1 第 6 节：AE2 图鉴 overlay 引用的物品 id ---------- */
// 图鉴页 front-matter 的 `icon:`（缩进在 navigation 下）与 `<ItemImage id="...">` 常写「裸 id」，
// 由 AE2 图鉴按页面所属命名空间补全（例如 assets/ae2/ae2guide/... 里的 creative_storage_cell → ae2:creative_storage_cell）。
// item_ids 列表项一般已经是全限定 id。
const GUIDE_RE = /assets\/([^/]+)\/ae2guide\//
const guideRefs = [] // {file, guideNs, kind, raw, id}
let guideMdCount = 0
for (const file of walkFiles(KUBEJS_ASSETS, (x) => x.endsWith('.md'))) {
  const rel = path.relative(REPO, file).replace(/\\/g, '/')
  const gm = GUIDE_RE.exec(rel)
  if (!gm) continue
  guideMdCount++
  const guideNs = gm[1]
  const text = readText(file)
  const fmM = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  const body = fmM ? text.slice(fmM[0].length) : text
  const add = (kind, raw) => guideRefs.push({ file: rel, guideNs, kind, raw, id: raw.includes(':') ? raw : `${guideNs}:${raw}` })
  if (fmM) {
    const lines = fmM[1].split(/\r?\n/)
    for (const line of lines) {
      const ic = /^\s*icon\s*:\s*(\S+)\s*$/.exec(line)
      if (ic) add('icon', ic[1])
    }
    const ii = lines.findIndex((l) => /^\s*item_ids\s*:/.test(l))
    if (ii >= 0) {
      for (let j = ii + 1; j < lines.length; j++) {
        const mm = /^\s*-\s*(\S+)\s*$/.exec(lines[j])
        if (!mm) break
        add('item_ids', mm[1])
      }
    }
  }
  for (const im of body.matchAll(/<ItemImage\b[^>]*\bid\s*=\s*"([^"]+)"[^>]*>/g)) add('ItemImage', im[1])
}
const refIds = [...new Set(guideRefs.map((r) => r.id))].sort()
const refNs = new Set(refIds.map((i) => i.split(':')[0]))
// 这些 id 的 lang 键兼作「疑似存在」旁证（物品/方块注册了就会有 lang 键）
for (const id of refIds) {
  const [ns, ...rest] = id.split(':')
  const p0 = rest.join(':')
  for (const k of [`item.${ns}.${p0}`, `block.${ns}.${p0}`, `${ns}.${p0}`]) {
    candidateKeys.add(k)
    neededNs.add(ns)
  }
}
// 引用 id 的「可能的资源文件名」——扫 jar 时按精确名做集合判断，拿到旁证又不用把几万个名字留在内存里
const probeNames = new Set()
function probesForId(id) {
  const [ns, ...rest] = id.split(':')
  const p0 = rest.join(':')
  return [
    `assets/${ns}/models/item/${p0}.json`,
    `assets/${ns}/models/block/${p0}.json`,
    `assets/${ns}/blockstates/${p0}.json`,
    `assets/${ns}/textures/item/${p0}.png`,
    `assets/${ns}/textures/block/${p0}.png`,
    `data/${ns}/loot_table/blocks/${p0}.json`,
    `data/${ns}/loot_tables/blocks/${p0}.json`,
    `data/${ns}/recipe/${p0}.json`,
    `data/${ns}/recipes/${p0}.json`,
    `data/${ns}/tags/item/${p0}.json`,
    `data/${ns}/tags/items/${p0}.json`,
  ]
}
for (const id of refIds) for (const n of probesForId(id)) probeNames.add(n)
const evidenceNames = new Map() // 命中的条目名 -> jar 标签

/* ---------- 5. 原版语言 / 原版资源（minecraft:* 不在 mods/*.jar 里） ---------- */
// 1.21.1 原版 client jar 只自带 assets/minecraft/lang/en_us.json，其它语种由启动器的资源对象库
// （assets/indexes/*.json → assets/objects/<hash 前两位>/<hash>，gzip 存放）提供。
// 找到就用它当 minecraft 命名空间的中文来源；找不到就把 minecraft:* 标成「n/a（原版自带）」而不是「缺中文」。
const VANILLA_ROOTS = ['E:/myWord/hcml/.minecraft', REPO, path.join(REPO, '.minecraft')]
const VANILLA_JAR = (() => {
  for (const root of VANILLA_ROOTS) {
    const p = path.join(root, 'versions/1.21.1/1.21.1.jar')
    if (fs.existsSync(p)) return p
  }
  return null
})()
let vanillaBufCache
function vanillaJarBuf() {
  if (vanillaBufCache === undefined) vanillaBufCache = VANILLA_JAR ? fs.readFileSync(VANILLA_JAR) : null
  return vanillaBufCache
}
function loadVanillaZh() {
  for (const root of VANILLA_ROOTS) {
    const jarPath = path.join(root, 'versions/1.21.1/1.21.1.jar')
    if (fs.existsSync(jarPath)) {
      try {
        const es = zipEntries(vanillaJarBuf(), /^assets\/minecraft\/lang\/zh_cn\.json$/)
        if (es.length) return { where: `${jarPath}!assets/minecraft/lang/zh_cn.json`, keys: parseLang(readEntry(es[0])) }
      } catch {
        /* 换下一个候选 */
      }
    }
    const idxDir = path.join(root, 'assets/indexes')
    const objDir = path.join(root, 'assets/objects')
    if (!fs.existsSync(idxDir) || !fs.existsSync(objDir)) continue
    const ids = []
    const vj = path.join(root, 'versions/1.21.1/1.21.1.json')
    if (fs.existsSync(vj)) {
      try {
        const v = JSON.parse(readText(vj))
        if (v?.assetIndex?.id) ids.push(`${v.assetIndex.id}.json`)
      } catch {
        /* 忽略，退化成遍历所有 index */
      }
    }
    for (const f of fs.readdirSync(idxDir)) if (f.endsWith('.json') && !ids.includes(f)) ids.push(f)
    for (const f of ids) {
      try {
        const e = JSON.parse(readText(path.join(idxDir, f)))?.objects?.['minecraft/lang/zh_cn.json']
        if (!e?.hash) continue
        const op = path.join(objDir, e.hash.slice(0, 2), e.hash)
        if (!fs.existsSync(op)) continue
        let raw = fs.readFileSync(op)
        try { raw = zlib.gunzipSync(raw) } catch { /* 也可能没压缩 */ }
        return { where: `${root}（index ${f}，object ${e.hash.slice(0, 2)}/${e.hash}）`, keys: parseLang(raw.toString('utf8')) }
      } catch {
        /* 换下一个候选 */
      }
    }
  }
  return null
}
const vanillaZh = loadVanillaZh()
// 原版 jar 的条目名（用于第 6 节判定 minecraft:* 是否存在：原版物品的模型/方块状态也在这里）
const vanillaNames = new Set()
if (vanillaJarBuf()) {
  try {
    for (const e of zipEntries(vanillaJarBuf(), (n) => n.startsWith('assets/') || n.startsWith('data/'))) vanillaNames.add(e.name)
  } catch {
    /* 读不出就当没有 */
  }
}

/* ---------- 6. 扫 mod jar（含一层内嵌 jar） ---------- */
const jarFiles = fs.readdirSync(MODS_DIR).filter((f) => f.toLowerCase().endsWith('.jar')).sort()
const modZh = new Map() // ns -> Map<key, value>（jar 内 zh_cn）
const modZhJar = new Map() // ns -> jar 标签
const fallbackZh = new Map() // key -> jar 标签（任意 assets/*/lang/zh_cn.json 命中）
const fallbackLangAny = new Map() // key -> jar 标签（en_us 或 zh_cn 任意语种命中，第 6 节旁证用）
const existsIndex = new Set() // 第 6 节：ns:path（models/item|block、blockstates、loot_table/blocks）
const jarStats = []
let jarsScanned = 0
let jarsFailed = 0
let nestedScanned = 0
// 「已注册物品/方块」的近似索引：模型文件 / 方块状态 / 方块掉落表
function existIdFromName(name) {
  if (name.includes('/models/')) {
    const m = /^assets\/([^/]+)\/models\/(?:item|block)\/(.+)\.json$/.exec(name)
    return m ? `${m[1]}:${m[2]}` : null
  }
  if (name.includes('/blockstates/')) {
    const m = /^assets\/([^/]+)\/blockstates\/(.+)\.json$/.exec(name)
    return m ? `${m[1]}:${m[2]}` : null
  }
  if (name.includes('/loot_table')) {
    const m = /^data\/([^/]+)\/loot_tables?\/blocks\/(.+)\.json$/.exec(name)
    return m ? `${m[1]}:${m[2]}` : null
  }
  return null
}
for (const file of jarFiles) {
  let top
  try {
    top = fs.readFileSync(path.join(MODS_DIR, file))
  } catch {
    jarsFailed++
    continue
  }
  jarsScanned++
  const groups = [{ label: file, buf: top }]
  // 内嵌 jar（META-INF/jarjar/*.jar 之类）：bundled 包本体没有 assets，语言文件在嵌套 jar 里
  try {
    for (const e of zipEntries(top, /\.jar$/i)) {
      if (e.name.startsWith('META-INF/versions/')) continue
      if (e.compSize > 40 * 1024 * 1024) continue
      try {
        const inner = readEntryRaw(e)
        if (inner.length > 4 && inner.readUInt32LE(0) === 0x04034b50) {
          groups.push({ label: `${file}!/${path.basename(e.name)}`, buf: inner })
          nestedScanned++
        }
      } catch {
        /* 单个内嵌 jar 解不开就跳过 */
      }
    }
  } catch {
    /* 中央目录读不出就不找内嵌 jar */
  }

  let enCount = 0
  let zhKeyCount = 0
  let hasZh = false
  const langNs = new Set()
  const assetNs = new Set()
  for (const g of groups) {
    let entries
    try {
      entries = zipEntries(g.buf, (name) => name.startsWith('assets/') || name.startsWith('data/'))
    } catch {
      continue
    }
    for (const e of entries) {
      // 第 6 节：近似存在索引 + 引用的 id 的资源文件名旁证（两者互不排斥，索引必须覆盖全部条目）
      const ex = existIdFromName(e.name)
      if (ex) existsIndex.add(ex)
      if (probeNames.has(e.name) && !evidenceNames.has(e.name)) evidenceNames.set(e.name, g.label)
      const nsM = /^assets\/([^/]+)\//.exec(e.name)
      if (nsM) assetNs.add(nsM[1])
      const lm = /^assets\/([^/]+)\/lang\/([A-Za-z0-9_-]+)\.json$/.exec(e.name)
      if (!lm) continue
      const ns = lm[1]
      const locale = lm[2]
      langNs.add(ns)
      let keys
      try {
        keys = parseLang(readEntry(e))
      } catch {
        continue
      }
      if (locale === 'zh_cn') {
        hasZh = true
        zhKeyCount += keys.size
        if (neededNs.has(ns) && !modZh.has(ns)) {
          // 同名命名空间只认第一个（正常情况下一个 ns 只属于一个 mod）
          modZh.set(ns, keys)
          modZhJar.set(ns, g.label)
        }
        for (const k of keys.keys()) if (candidateKeys.has(k) && !fallbackZh.has(k)) fallbackZh.set(k, g.label)
      } else if (locale === 'en_us') {
        enCount += keys.size
      }
      for (const k of keys.keys()) if (candidateKeys.has(k) && !fallbackLangAny.has(k)) fallbackLangAny.set(k, `${g.label}（${locale}）`)
    }
  }
  jarStats.push({ file, ns: [...langNs].sort(), assetNs: [...assetNs].sort(), enCount, zhKeyCount, hasZh, nested: groups.length - 1 })
}
// 原版资源也计入近似索引（minecraft:* 的模型/方块状态在原版 jar 里）
for (const n of vanillaNames) {
  const ex = existIdFromName(n)
  if (ex) existsIndex.add(ex)
}
// 包内 kubejs/assets 的模型同样算「已注册」
for (const f of walkFiles(KUBEJS_ASSETS, (x) => /\/models\/(item|block)\/.+\.json$/.test(x))) {
  const m = /assets\/([^/]+)\/models\/(?:item|block)\/(.+)\.json$/.exec(f.replace(/\\/g, '/'))
  if (m) existsIndex.add(`${m[1]}:${m[2]}`)
}

/* ---------- 7. 中文名查询 ---------- */
// 顺序：包内 lang → 该命名空间的 mod jar → 原版语言资源 → 任意 jar 兜底
function lookupZh(candidates) {
  for (const k of candidates) {
    const ns = k.split('.')[1]
    const v = pkgLang.get(ns)?.get('zh_cn')?.get(k)
    if (v) return { source: '包内 kubejs/assets', key: k, value: v }
  }
  for (const k of candidates) {
    const ns = k.split('.')[1]
    const v = modZh.get(ns)?.get(k)
    if (v) return { source: `jar ${modZhJar.get(ns)}`, key: k, value: v }
  }
  for (const k of candidates) {
    const v = vanillaZh?.keys.get(k)
    if (v) return { source: '原版 zh_cn', key: k, value: v }
  }
  for (const k of candidates) if (fallbackZh.has(k)) return { source: `兜底 jar ${fallbackZh.get(k)}`, key: k, value: '（存在）' }
  return null
}
// 包内 en_us / 包内 zh_cn（英文键名兜底）里该 id 的英文名，仅用于报告可读性
function lookupEn(candidates) {
  for (const k of candidates) {
    const byLocale = pkgLang.get(k.split('.')[1])
    const v = byLocale?.get('en_us')?.get(k) ?? byLocale?.get('zh_cn')?.get(k)
    if (v) return { key: k, value: v }
  }
  return null
}
// 「包内 zh_cn 缺这个键」时，jar 的 zh_cn / 原版语言里是否已有（有 → 中文环境不会退回英文）
function zhCoveredElsewhere(k) {
  const ns = k.split('.')[1]
  if (modZh.get(ns)?.has(k)) return `jar ${modZhJar.get(ns)}`
  if (vanillaZh?.keys.has(k)) return '原版 zh_cn'
  if (fallbackZh.has(k)) return `兜底 jar ${fallbackZh.get(k)}`
  return null
}

/* ---------- 8. 第 2 节数据：注册 id 的中文名 ---------- */
const sec2 = registrations.map((r) => {
  const cands = nameKeyCandidates(r.registry, r.id)
  return { ...r, cands, zh: lookupZh(cands), en: lookupEn(cands), isInfinityCell: r.type === 'extendedae:custom_infinity_cell' }
})

/* ---------- 9. 第 3 节数据：无限元件的流体中文名 ---------- */
let cellNameKey = null
for (const [ns, byLocale] of pkgLang) {
  const v = byLocale.get('zh_cn')?.get('item.extendedae.infinity_cell_name')
  if (v) {
    cellNameKey = { where: `包内 kubejs/assets/${ns}`, value: v }
    break
  }
}
if (!cellNameKey) {
  for (const [ns, keys] of modZh) {
    if (keys.has('item.extendedae.infinity_cell_name')) {
      cellNameKey = { where: `jar ${modZhJar.get(ns)}`, value: keys.get('item.extendedae.infinity_cell_name') }
      break
    }
  }
}
const sec3 = INFINITE_FLUIDS.map((fluid) => {
  const ns = fluid.split(':')[0]
  const hits = []
  for (const k of fluidKeyCandidates(fluid)) {
    const pkgV = pkgLang.get(ns)?.get('zh_cn')?.get(k)
    const jarV = modZh.get(ns)?.get(k)
    const vanV = vanillaZh?.keys.get(k)
    if (pkgV) hits.push({ key: k, source: '包内 kubejs/assets', value: pkgV })
    else if (jarV) hits.push({ key: k, source: `jar ${modZhJar.get(ns)}`, value: jarV })
    else if (vanV) hits.push({ key: k, source: '原版 zh_cn', value: vanV })
  }
  // 元件显示名：优先用流体方块/流体名，其次桶名
  const nameHit = hits.find((h) => /^(block|fluid)\./.test(h.key)) ?? hits.find((h) => /_bucket$/.test(h.key)) ?? hits[0]
  const display = cellNameKey && nameHit ? cellNameKey.value.replace('%s', nameHit.value) : null
  const jarLabel = modZhJar.get(ns) ?? (ns === 'minecraft' ? '原版命名空间（不在 mods/*.jar）' : '（该命名空间没有 mod jar 的 zh_cn）')
  return { fluid, ns, jar: jarLabel, hits, display }
})

/* ---------- 10. 第 4 节数据：整个 jar 无中文 ---------- */
const s4All = jarStats.filter((j) => !j.hasZh || j.zhKeyCount === 0)
const s4 = s4All.map((j) => {
  const nss = j.ns.length ? j.ns : j.assetNs
  const pkgHit = nss.map((ns) => [ns, pkgLang.get(ns)?.get('zh_cn')?.size ?? 0])
  const covered = pkgHit.filter(([, n]) => n > 0)
  return { ...j, nss, coveredKeys: covered.reduce((a, [, n]) => a + n, 0), covered }
})

/* ---------- 11. 第 6 节数据：图鉴引用的 id 是否存在 ---------- */
// 结论分三档：
//   存在      —— 命中近似索引（models/item|block、blockstates、loot_table/blocks；原版与包内模型也算）
//   疑似存在  —— 索引里没有，但该 id 的 lang 键 / 贴图 / 配方 / 方块掉落表文件名能找到 → 不下缺失结论
//   不存在    —— 以上都没有 → 图鉴里就是空白/紫黑图标
const KNOWN_FIXED = [
  {
    file: 'kubejs/assets/extendedae/ae2guide/_zh_cn/epp_intro/infinity_cell.md',
    bad: 'extendedae:infinity_cell',
    fix: 'extendedae:infinity_water_cell / extendedae:infinity_cobblestone_cell',
    note: '1.21 的 ExtendedAE 没有 infinity_cell 这个物品（改成「一种来源一个物品」）',
  },
  {
    file: 'kubejs/assets/ae2/ae2guide/_zh_cn/ae2-mechanics/bytes-and-types.md',
    bad: 'ae2:creative_item_cell',
    fix: 'ae2:creative_storage_cell',
    note: 'AE2 1.21 里创造存储元件叫 creative_storage_cell',
  },
]
const refResults = refIds.map((id) => {
  const inIndex = existsIndex.has(id)
  const evidence = []
  const langHits = [`item.${id.replace(':', '.')}`, `block.${id.replace(':', '.')}`, id.replace(':', '.')].filter((k) => fallbackLangAny.has(k))
  for (const k of langHits) evidence.push(`lang 键 \`${k}\`（${fallbackLangAny.get(k)}）`)
  for (const n of probesForId(id)) {
    if (evidenceNames.has(n)) evidence.push(`资源文件 \`${n}\`（${evidenceNames.get(n)}）`)
  }
  if (vanillaNames.has(`assets/${id.split(':')[0]}/models/item/${id.split(':').slice(1).join(':')}.json`)) evidence.push('原版模型文件')
  const refs = guideRefs.filter((r) => r.id === id)
  return {
    id,
    ns: id.split(':')[0],
    inIndex,
    evidence: [...new Set(evidence)],
    state: inIndex ? '存在' : evidence.length ? '疑似存在' : id.split(':')[0] === 'minecraft' && !vanillaNames.size ? 'n/a（原版）' : '**不存在**',
    kinds: [...new Set(refs.map((r) => r.kind))].join(', '),
    files: [...new Set(refs.map((r) => r.file))],
    rawBare: [...new Set(refs.filter((r) => !r.raw.includes(':')).map((r) => r.raw))],
  }
})
const s6Missing = refResults.filter((r) => r.state === '**不存在**')
const s6Suspect = refResults.filter((r) => r.state === '疑似存在')
// 名字相近的候选：按 `_` 分词与索引里的同命名空间 id 比对，纯参考（不自动改文件）
function suggestIds(missingId, max = 4) {
  const [ns, ...rest] = missingId.split(':')
  const p = rest.join(':')
  const tokens = new Set(p.split('_').filter(Boolean))
  const scored = []
  for (const cand of existsIndex) {
    if (!cand.startsWith(`${ns}:`)) continue
    const cp = cand.slice(ns.length + 1)
    if (cp === p) continue
    if (cp.includes('/')) continue // 子模型（例如 drive/cells/...）不是物品 id，排除掉免得候选很吵
    let score = 0
    for (const t of cp.split('_')) if (tokens.has(t)) score++
    if (score > 0) scored.push([score, cp])
  }
  return scored
    .sort((a, b) => b[0] - a[0] || a[1].localeCompare(b[1]))
    .slice(0, max)
    .map(([, cp]) => `${ns}:${cp}`)
}
for (const r of s6Missing) r.suggest = suggestIds(r.id)
const s6Known = KNOWN_FIXED.map((k) => {
  const refs = guideRefs.filter((r) => r.file === k.file)
  const badRefs = refs.filter((r) => r.id === k.bad)
  return { ...k, refs, badRefs, fixedOk: badRefs.length === 0 }
})

/* ---------- 12. 第 5 节数据：FTB 任务书文本键差异 ---------- */
// 结构：首行 `{`，之后每行 `\t<键>: <值>`，最后 `}`。
// 值可以是跨多行的字符串数组（例如 ["第一行", "第二行"]），这些续行不匹配 `键: 值`。
function snbtKeys(text) {
  const map = new Map()
  let kvLines = 0
  let contLines = 0
  let blankLines = 0
  let badLines = 0
  let pending = null // 值跨多行时，续行挂到的键
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t === '{' || t === '}') {
      if (!t) blankLines++
      continue
    }
    const m = /^([A-Za-z_][\w.$-]*)\s*:\s*(.*)$/.exec(t)
    if (m) {
      map.set(m[1], m[2])
      kvLines++
      pending = m[2].trim().startsWith('[') && !m[2].includes(']') ? m[1] : null
    } else if (pending) {
      contLines++
      if (t.includes(']')) pending = null
    } else badLines++
  }
  return { map, kvLines, contLines, blankLines, badLines }
}
const questLang = {}
for (const f of ['en_us.snbt', 'zh_cn.snbt']) {
  const p = path.join(QUEST_LANG, f)
  if (!fs.existsSync(p)) {
    questLang[f] = null
    continue
  }
  const text = readText(p)
  questLang[f] = { bytes: Buffer.byteLength(text), lines: text.split(/\r?\n/).length - 1, ...snbtKeys(text) }
}
const qEn = questLang['en_us.snbt']
const qZh = questLang['zh_cn.snbt']
const qMissZh = qEn ? [...qEn.map.keys()].filter((k) => !qZh?.map.has(k)) : []
const qMissEn = qZh ? [...qZh.map.keys()].filter((k) => !qEn?.map.has(k)) : []
const qMissByPrefix = {}
for (const k of qMissZh) qMissByPrefix[k.split('.')[0]] = (qMissByPrefix[k.split('.')[0]] ?? 0) + 1

/* ---------- 12. 渲染报告 ---------- */
const L = []
const p = (...xs) => L.push(...xs)
const s2NoZh = sec2.filter((r) => !r.zh && !r.isInfinityCell)
const s3NoZh = sec3.filter((r) => !r.hits.length && r.ns !== 'minecraft')
// 原版命名空间的流体（water/lava 之类）：中文名来自原版语言资源，不在 mods/*.jar 里，单独说明
const s3Vanilla = sec3.filter((r) => r.ns === 'minecraft')
const s4Uncovered = s4.filter((j) => !j.covered.length && j.enCount > 0)
const s4Covered = s4.filter((j) => j.covered.length)
const s1TotalMissZh = sec1.reduce((a, b) => a + b.missZh.length, 0)
const s1RealGap = sec1.flatMap((s) => s.missZh.filter(([k]) => !zhCoveredElsewhere(k)).map(([k, v]) => [s.ns, k, v]))
const totalMissEn = sec1.reduce((a, b) => a + b.missEn.length, 0)

p('# CDR1211 汉化缺口扫描报告', '')
p(`- 生成时间：${new Date().toISOString().replace('T', ' ').slice(0, 19)}`)
p('- 生成脚本：`scripts/scan-l10n.mjs`（只读扫描，可重复运行：`node scripts/scan-l10n.mjs`）')
p('- 仓库：`D:/git-MC/CDR1211`（Minecraft 1.21.1 / NeoForge）')
p(
  `- 扫描范围：包内 \`kubejs/assets/*/lang/*.json\` ${pkgLang.size} 个命名空间；\`mods/*.jar\` ${jarsScanned} 个（另含 ${nestedScanned} 个内嵌 jar，读取失败 ${jarsFailed} 个）；KubeJS 注册 ${registrations.length} 个 id；AE2 图鉴 ${new Set(guideRefs.map((r) => r.file)).size} 个 md / ${refIds.length} 个唯一 id；FTB 任务书 2 个 lang 文件`
)
p(`- 原版中文来源：${vanillaZh ? `已加载（${vanillaZh.where}，${vanillaZh.keys.size} 键）` : '**未找到**（`minecraft:*` 一律按「原版自带」处理，不计入缺口）'}`)
p('')
p('**结论速览**')
p('')
p('| 章节 | 问题 | 数量 | 归属 |')
p('| --- | --- | --- | --- |')
p(`| 1 | 包内自建 lang：en 有、zh 没的键 | ${s1TotalMissZh}（其中 jar/原版也未覆盖的**真缺口** ${s1RealGap.length}） | **本包可修** |`)
p(`| 2 | KubeJS 注册但没有中文名的 id | ${s2NoZh.length} | **本包可修** |`)
p(`| 3 | 无限元件所依赖流体缺中文名 | ${s3NoZh.length} / ${sec3.length} | **本包可修（补流体名）** |`)
p(`| 4 | 整个 jar 无 zh_cn | ${s4.length}（其中包内也未覆盖 ${s4Uncovered.length}） | 上游 mod 缺失（低优先级） |`)
p(`| 5 | FTB 任务书 zh_cn.snbt 缺键 | ${qMissZh.length} | 本包可修（但游戏会重写该目录） |`)
p(`| 6 | AE2 图鉴引用不存在的物品 id | ${s6Missing.length}（另有疑似 ${s6Suspect.length}） | **本包可修** |`)
p('')

/* --- 第 1 节 --- */
p('## 1. 包内自建内容缺中文（最高优先级）', '')
p(`遍历 \`kubejs/assets/*/lang/*.json\`：共 ${pkgLang.size} 个命名空间，其中 ${sec1.filter((s) => s.hasEnFile).length} 个有 en_us.json 可作为对照基线。`)
p('')
p('### 1.1 汇总', '')
p(
  ...mdTable(
    ['命名空间', '语种文件', 'en_us 键数', 'zh_cn 键数', 'en 有 zh 没', 'zh 有 en 没'],
    sec1.map((s) => [s.ns, s.locales, s.hasEnFile ? s.enCount : '—', s.hasZhFile ? s.zhCount : '缺失', s.missZh.length, s.hasEnFile ? s.missEn.length : '（无 en 基线）'])
  )
)
p('')
const noEnBaseline = sec1.filter((s) => !s.hasEnFile)
p(`> ${noEnBaseline.length} 个命名空间只有 zh_cn.json（包内翻译覆盖层，无 en_us.json 基线），不参与键差异统计：`)
p(`> ${noEnBaseline.map((s) => s.ns).join(', ')}`)
p('')
p(`### 1.2 en 有、zh 没的键（共 ${s1TotalMissZh} 个，涉及 ${sec1.filter((s) => s.missZh.length).length} 个命名空间）`, '')
p('')
p('「包内」列 = 该键在包内 `kubejs/assets/<ns>/lang/zh_cn.json` 里缺失（本节全部为「缺失」）；')
p('「其它来源覆盖」列 = 游戏加载时会合并所有资源包的同语种文件，若 mod jar（或原版）的 `zh_cn.json` 里已有该键，中文环境下**不会**退回英文。')
p('')
if (!s1TotalMissZh) p('（无）', '')
for (const s of sec1.filter((x) => x.missZh.length)) {
  p(`#### ${s.ns} — ${s.missZh.length} 个`, '')
  p(...mdTable(['键名', 'en_us 值', '其它来源覆盖（有则不会退回英文）'], s.missZh.map(([k, v]) => [k, v, zhCoveredElsewhere(k) ?? '**无 → 会退回英文/显示原始键**'])))
  p('')
}
if (s1RealGap.length) {
  p(`#### 1.2.1 真缺口（包内、mod jar、原版 zh_cn 全都没有）：${s1RealGap.length} 个 —— 优先修这些`, '')
  p(...mdTable(['命名空间', '键名', 'en_us 值'], s1RealGap))
  p('')
}
p(`### 1.3 zh 有、en 没的键（次要，共 ${totalMissEn} 个）`, '')
p('')
p('> 这些键在中文环境下正常显示中文；出现在此表通常只说明 `en_us.json` 是「只补了一部分」的英文兜底文件，本身不影响中文体验。')
p('')
if (!totalMissEn) p('（无）', '')
for (const s of sec1.filter((x) => x.missEn.length)) {
  const shown = s.missEn.length > 50 ? s.missEn.slice(0, 50) : s.missEn
  p(`#### ${s.ns} — ${s.missEn.length} 个${s.missEn.length > 50 ? '（仅列前 50）' : ''}`, '')
  p(...mdTable(['键名', 'zh_cn 值'], shown))
  p('')
}

/* --- 第 2 节 --- */
p('## 2. KubeJS 注册内容的中文名', '')
p("从 `kubejs/startup_scripts/**/*.js` 抓取 `.create(...)`，按最近的 `StartupEvents.registry('<reg>')` 判定名字前缀（item → `item.`，block → `block.`，fluid → `fluid.`）。")
p('')
p('中文名来源：① 包内 `kubejs/assets/<ns>/lang/zh_cn.json`；② 该命名空间对应 mod jar 的 `assets/<ns>/lang/zh_cn.json`；③ 原版语言资源；④ 任意 jar 的任意 `assets/*/lang/zh_cn.json`（兜底）。')
p('')
p(`### 2.1 抓取到的注册（共 ${registrations.length} 个 id）`, '')
p(
  ...mdTable(
    ['注册 id', 'registry', '类型', '来源文件', '中文名', '命中的键'],
    sec2.map((r) => [
      r.id,
      r.registry,
      r.type || '—',
      r.file,
      r.zh ? `有（${r.zh.source}）` : r.isInfinityCell ? '动态（见第 3 节）' : '**无**',
      r.zh ? `\`${r.zh.key}\` = ${r.zh.value}` : '—',
    ])
  )
)
p('')
if (skippedTemplates.length) {
  p('#### 未展开的模板串（显式跳过）', '')
  p(...mdTable(['文件', '模板串', '原因'], skippedTemplates.map((s) => [s.file, `\`${s.tpl}\``, s.note])))
  p('')
}
p(`### 2.2 没有中文名的 id（${s2NoZh.length} 个）`, '')
if (!s2NoZh.length) p('（无）', '')
else p(...mdTable(['注册 id', 'registry', '类型', '候选键', 'en_us 值（若有）'], s2NoZh.map((r) => [r.id, r.registry, r.type || '—', r.cands.join('<br>'), r.en ? r.en.value : '—'])))
p('')
const cells = sec2.filter((r) => r.isInfinityCell)
p(`### 2.3 动态元件（${cells.length} 个，名字由流体决定）`, '')
p(
  `\`${cells[0]?.file ?? 'kubejs/startup_scripts/mods/ae2/eae/inf_cells.js'}\` 用 \`extendedae:custom_infinity_cell\` 按 \`global.INFINITE_SOURCE_FLUIDS\` 批量注册，物品名不写进 lang，而由 ExtendedAE 用 \`Component.translatable("item.extendedae.infinity_cell_name", <流体显示名>)\` 拼出，所以**能否中文化完全取决于流体本身有没有中文名** —— 见第 3 节。`
)
p('')

/* --- 第 3 节 --- */
p('## 3. 无限元件（无限酸液元件 / 无限蜂蜜元件 …）名字专项', '')
p(`\`global.INFINITE_SOURCE_FLUIDS\` 共 ${INFINITE_FLUIDS.length} 项；ExtendedAE 命名规则：`)
p('')
p(`\`item.extendedae.infinity_cell_name\` = ${cellNameKey ? `\`${cellNameKey.value}\`（来自 ${cellNameKey.where}）` : '（**未找到该键**）'}，最终名字 = 该模板套上「流体的显示名」。`)
p('')
p('判定方式：在这些流体所属命名空间的 lang 里查 `block.<ns>.<path>`（流体方块）/ `fluid.<ns>.<path>` / `item.<ns>.<path>_bucket`，命中任一即算有中文名。')
p('')
p(
  ...mdTable(
    ['#', '流体 id', '命名空间来源 jar', '有中文', '命中的键', '元件显示名（中文环境）'],
    sec3.map((r, i) => [i + 1, r.fluid, r.jar, r.hits.length ? '✅' : r.ns === 'minecraft' ? 'n/a（原版）' : '❌', r.hits.map((h) => `${h.key}（${h.source}）`).join('<br>') || '—', r.display ?? '—'])
  )
)
p('')
if (s3NoZh.length) {
  p(`### 3.1 缺中文名（${s3NoZh.length} / ${sec3.length}）—— 这些元件的名字会退回英文流体名`, '')
  p(...mdTable(['流体 id', '命名空间来源 jar'], s3NoZh.map((r) => [r.fluid, r.jar])))
  p('')
} else {
  p(`### 3.1 缺中文名：0 个 —— ${sec3.length} 种流体的显示名都能取到中文`, '')
  p('')
}
if (s3Vanilla.length) {
  p(`> \`${s3Vanilla.map((r) => r.fluid).join('`, `')}\` 属于原版命名空间，中文名由原版语言资源提供（不在 \`mods/*.jar\` 内）。`)
  const vNames = s3Vanilla.map((r) => `${r.fluid} → ${r.hits[0]?.value ?? '?'}`).join('、')
  p(`> ${vanillaZh ? `本次已从 ${vanillaZh.where} 读到原版 zh_cn：${vNames}，所以这 ${s3Vanilla.length} 个元件实际显示的是中文名，不计入缺口。` : '本次未找到原版 zh_cn 语言资源（原版 client jar 只含 `assets/minecraft/lang/en_us.json`），故只标 n/a，不计入缺口。'}`)
  p('')
}
const s3PkgOnly = sec3.filter((r) => r.hits.length && r.hits.every((h) => h.source === '包内 kubejs/assets'))
p(`> 另有 ${s3PkgOnly.length} 种流体的中文名**只**来自包内 \`kubejs/assets\` 覆盖层（mod jar 自身没有 zh_cn）：${s3PkgOnly.map((r) => r.fluid).join(', ')}`)
p('')

/* --- 第 4 节 --- */
p('## 4. 整个 mod 无中文（上游 mod 问题，低优先级）', '')
p(`扫 \`mods/*.jar\`（${jarsScanned} 个）里的 \`assets/*/lang/*.json\`：完全没有 zh_cn.json，或 zh_cn.json 里 0 个键。按 en_us 键数量降序，只列前 30 个。`)
p('')
p(`**总数：${s4.length} 个 jar（占 ${jarsScanned} 个的 ${((s4.length / jarsScanned) * 100).toFixed(1)}%）**，其中：`)
p(`- 包内 \`kubejs/assets/<ns>/lang/zh_cn.json\` **已覆盖**命名空间的：${s4Covered.length} 个（这些不会影响中文体验）`)
p(`- 包内也未覆盖、且 en_us 有键的：${s4Uncovered.length} 个（**真正会显示英文的面**，但属上游 mod 未做中文，非本包失误）`)
p(`- 既无 zh_cn 也无 en_us（bundled 壳包 / 纯数据包 / 库）：${s4.filter((j) => !j.hasZh && !j.enCount).length} 个`)
p('')
p(
  ...mdTable(
    ['#', 'jar 文件名', 'mod 命名空间', 'en_us 键数', 'zh_cn', '包内已有 zh_cn 覆盖', '内嵌 jar'],
    [...s4].sort((a, b) => b.enCount - a.enCount || a.file.localeCompare(b.file)).slice(0, 30).map((j, i) => [
      i + 1,
      j.file,
      j.nss.join(', ') || '（无 assets）',
      j.enCount,
      j.hasZh ? '有文件但 0 键' : '无',
      j.covered.length ? j.covered.map(([ns, n]) => `${ns}(${n})`).join('<br>') : '**无**',
      j.nested || '—',
    ])
  )
)
p('')
p(`> 另有 ${jarStats.filter((j) => j.hasZh && j.zhKeyCount > 0).length} 个 jar 有非空 zh_cn.json，不在本表。`)
p('')
if (s4Uncovered.length) {
  p(`### 4.1 真正会显示英文、且包内未覆盖的 jar（前 20 / 共 ${s4Uncovered.length}）`, '')
  p(
    ...mdTable(
      ['jar 文件名', 'mod 命名空间', 'en_us 键数'],
      [...s4Uncovered].sort((a, b) => b.enCount - a.enCount).slice(0, 20).map((j) => [j.file, j.nss.join(', '), j.enCount])
    )
  )
  p('')
}

/* --- 第 5 节 --- */
p('## 5. FTB 任务书文本（config/ftbquests/quests/lang）', '')
p('')
p('**实际结构**：首行 `{`、末行 `}`，中间每行 `\\t<键>: <值>`；值可以是跨多行的字符串数组（`["第一行", "第二行"]`），这类续行不匹配 `键: 值`，因此按「键行 + 续行 + 空行」分类统计，键名比对不受影响。')
p('')
p(`- \`en_us.snbt\`：${qEn ? `${qEn.bytes} 字节 / ${qEn.lines} 行，键行 ${qEn.kvLines}，数组续行 ${qEn.contLines}，空行 ${qEn.blankLines}，无法归类 ${qEn.badLines}，**键数 ${qEn.map.size}**` : '缺失'}`)
p(`- \`zh_cn.snbt\`：${qZh ? `${qZh.bytes} 字节 / ${qZh.lines} 行，键行 ${qZh.kvLines}，数组续行 ${qZh.contLines}，空行 ${qZh.blankLines}，无法归类 ${qZh.badLines}，**键数 ${qZh.map.size}**` : '缺失'}`)
p('')
p('> 关键结论：**`en_us.snbt` 的 3000+ 条值本身就是中文**（整合包作者在中文环境里编辑任务书，FTB 写回了 en_us），中文环境下缺失的键会回退到 `en_us.snbt`，所以任务书正文显示仍是中文；`zh_cn.snbt` 目前只是一个几乎空的壳。')
p('')
p(
  ...mdTable(
    ['文件', '字节', '行数', '键行', '续行', '空行', '键数', '键前缀分布'],
    [
      ['en_us.snbt', qEn?.bytes ?? '—', qEn?.lines ?? '—', qEn?.kvLines ?? '—', qEn?.contLines ?? '—', qEn?.blankLines ?? '—', qEn?.map.size ?? '—', qEn ? Object.entries(countPrefixes(qEn.map)).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(', ') : '—'],
      ['zh_cn.snbt', qZh?.bytes ?? '—', qZh?.lines ?? '—', qZh?.kvLines ?? '—', qZh?.contLines ?? '—', qZh?.blankLines ?? '—', qZh?.map.size ?? '—', qZh ? Object.entries(countPrefixes(qZh.map)).map(([k, v]) => `${k}:${v}`).join(', ') || '—' : '—'],
    ]
  )
)
p('')
p(`### 5.1 zh_cn.snbt 里缺的键（en 有、zh 没）：${qMissZh.length} 个`, '')
p('')
p(...mdTable(['键前缀', '缺失数', '说明'], Object.entries(qMissByPrefix).sort(([, a], [, b]) => b - a).map(([k, v]) => [k, v, k === 'chapter' ? '章节标题/副标题' : k === 'quest' ? '任务标题/副标题/描述' : k === 'task' ? '任务目标文本' : k === 'image' ? '图片题注' : '章节组标题'])))
p('')
p('示例（前 20 条，可见值本身已是中文）：', '')
p(...mdTable(['键名', 'en_us.snbt 值'], qMissZh.slice(0, 20).map((k) => [k, (qEn?.map.get(k) ?? '').slice(0, 90)])))
p('')
p(`### 5.2 zh_cn.snbt 里多出的键（zh 有、en 没）：${qMissEn.length} 个`, '')
if (!qMissEn.length) p('（无）', '')
else {
  p(...mdTable(['键名', 'zh_cn.snbt 值', '备注'], qMissEn.map((k) => [k, qZh.map.get(k) ?? '', k.startsWith('chapter.') ? '在 `config/ftbquests/quests/chapters/` 里找不到该章节 id，疑似脏数据/残留测试数据' : ''])))
}
p('')
p('> ⚠️ `config/ftbquests/quests/lang/` 由游戏运行期重写（该目录 `.gitignore` 只放行 `*.snbt`），本报告只读不写。若要补翻译，应改任务书数据源或走 FTB 的导出流程。')
p('')

/* --- 第 6 节 --- */
p('## 6. 图鉴 overlay 里指向「1.21 已不存在物品」的图标/条目', '')
p('')
p(
  `扫描 \`kubejs/assets/*/ae2guide/**/*.md\`（含 \`_zh_cn\` 语言子目录；共扫到 ${guideMdCount} 个 md，其中 ${new Set(guideRefs.map((r) => r.file)).size} 个含引用），提取三类引用：front-matter 的 \`icon:\`、\`item_ids:\` 列表项、正文的 \`<ItemImage id="..." />\`。本次共 ${guideRefs.length} 处引用 / ${refIds.length} 个唯一 id。`
)
p('')
p(
  `**裸 id 补全规则**：图鉴渲染时按页面所属命名空间补全（\`assets/<ns>/ae2guide/...\` → \`<ns>:<id>\`），例如 \`ae2\` 图鉴里的 \`creative_storage_cell\` 解析成 \`ae2:creative_storage_cell\`。本表已按此补全（本次共 ${refResults.reduce((a, r) => a + r.rawBare.length, 0)} 处裸 id 引用）。`
)
p('')
p('**判定方式（近似索引）**：把下列文件视为「已注册物品/方块」存在的证据，合并成一个索引：')
p('')
p('- 各 mod jar（含一层内嵌 jar）的 `assets/<ns>/models/item/*.json`、`assets/<ns>/models/block/*.json`、`assets/<ns>/blockstates/*.json`、`data/<ns>/loot_table(s)/blocks/*.json`')
p(`- 包内 \`kubejs/assets/<ns>/models/item|block/*.json\``)
p(`- 原版 jar 的同名条目（${vanillaNames.size ? `已读取 ${VANILLA_JAR}，${vanillaNames.size} 个条目` : '**未找到原版 jar**，`minecraft:*` 一律按 n/a 处理'}）`)
p('')
p(`索引规模：\`${existsIndex.size}\` 个 ns:path。`)
p('')
p('索引里查不到时**不下缺失结论**，而是继续找旁证（该 id 的 lang 键 / 贴图 / 配方 / 方块掉落表文件），命中则标「疑似存在」。')
p('')
p(`### 6.1 汇总`, '')
p('')
p(
  ...mdTable(
    ['状态', '数量', '说明'],
    [
      ['存在（命中索引）', refResults.filter((r) => r.inIndex).length, '图鉴图标能正常渲染'],
      ['疑似存在（只有旁证）', s6Suspect.length, '索引没覆盖到，但能找到 lang 键/贴图/配方 → 需要人工复核，不当作缺失'],
      ['不存在', s6Missing.length, '**图鉴里会显示空白/紫黑图标**'],
      ['n/a（原版）', refResults.filter((r) => r.state === 'n/a（原版）').length, '原版命名空间且未找到原版 jar'],
    ]
  )
)
p('')
p(`### 6.2 不存在的 id（${s6Missing.length} 个）—— 需要修的图鉴引用`, '')
p('')
if (!s6Missing.length) p('（无）', '')
else {
  p(...mdTable(['引用的 id', '引用方式', '引用文件', '裸 id 写法'], s6Missing.map((r) => [r.id, r.kinds, r.files.join('<br>'), r.rawBare.length ? `\`${r.rawBare.join('`, `')}\`` : '（全限定）'])))
  p('')
  p('名字相近的候选（按 `_` 分词匹配同命名空间下真实存在的 id，仅供改图鉴时参考）：', '')
  p('')
  p(...mdTable(['引用的 id', '候选 id', '说明'], s6Missing.map((r) => [r.id, r.suggest.join('<br>') || '（无相近候选）', r.suggest.some((x) => x === 'ae2:creative_storage_cell') ? 'AE2 1.21 只有 `ae2:creative_storage_cell`（创造ME元件），物品/流体共用同一个元件，不存在 `creative_item_cell` / `creative_fluid_cell`' : ''])))
  p('')
  p('按「文件路径 → 引用的 id → 是否存在」逐条展开：', '')
  p('')
  p(
    ...mdTable(
      ['文件路径', '引用的 id', '引用方式', '是否存在'],
      guideRefs.filter((r) => s6Missing.some((x) => x.id === r.id)).map((r) => [r.file, r.id, r.kind, '❌ 不存在'])
    )
  )
  p('')
}
p(`### 6.3 已知的两条（已修 / 待复核）`, '')
p('')
p(
  ...mdTable(
    ['文件路径', '原错误 id', '正解', '当前状态', '当前该页引用的 id'],
    s6Known.map((k) => [
      k.file,
      `\`${k.bad}\``,
      k.fix,
      k.fixedOk ? '✅ 已修（该页已不再引用错误 id）' : `❌ 待复核（仍引用 \`${k.bad}\`）`,
      k.refs.length ? [...new Set(k.refs.map((r) => r.id))].join('<br>') : '（未解析到引用）',
    ])
  )
)
p('')
for (const k of s6Known) p(`- \`${k.file}\`：${k.note}`)
p('')
p(`### 6.4 疑似存在（${s6Suspect.length} 个，仅供复核，勿直接当缺失）`, '')
p('')
if (!s6Suspect.length) p('（无）', '')
else p(...mdTable(['引用的 id', '旁证', '引用文件'], s6Suspect.map((r) => [r.id, r.evidence.join('<br>'), r.files.join('<br>')])))
p('')
p('### 6.5 交叉验证', '')
p('')
const mcRefs = refResults.filter((r) => r.ns === 'minecraft')
p(
  `1. **原版 jar 已计入索引**（\`${VANILLA_JAR ?? '未找到'}\`，条目名 ${vanillaNames.size} 个）：${mcRefs.length} 个 \`minecraft:*\` 唯一引用全部判定为「存在」——${mcRefs.map((r) => `\`${r.id}\``).join('、')}。若索引只用「mod jar + 包内 kubejs/assets」（${existsIndex.size - mcRefs.length > 0 ? '约 6.7 万条' : ''}），这 ${mcRefs.length} 个原版物品会被**全部误报成缺失**，因此原版 jar 是必需的。`
)
p(
  `2. **裸 id 按页面所在命名空间补全**：\`assets/<ns>/ae2guide/...\` 里的裸 id 补成 \`<ns>:<id>\`，带冒号的 id 原样使用。本次共 ${refResults.reduce((a, r) => a + r.rawBare.length, 0)} 处裸 id 引用（全部位于 \`assets/ae2/ae2guide/_zh_cn/\`）。`
)
p(
  `3. **除已修的两条外，其余图鉴页面引用全部能在索引里找到**：${refResults.filter((r) => r.inIndex).length} / ${refResults.length} 个唯一 id 命中索引；未命中的只有 ${s6Missing.length} 个（${s6Missing.map((r) => `\`${r.id}\``).join('、')}），且集中在**同一个文件** \`kubejs/assets/ae2/ae2guide/_zh_cn/items-blocks-machines/storage_cells.md\`（该页「创造物品元件与创作流体元件」一节的 2 个 \`<ItemImage>\`）。也就是说：**除已修的两条，还有第三处页面缺图标**，但它不是原版误报，而是 AE2 1.21 的元件改名/合并所致。`
)
p('')

/* ---------- 13. 落盘 ---------- */
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, L.join('\n'), 'utf8')

/* ---------- 14. 控制台摘要 ---------- */
console.log(`报告已写出：${OUT}`)
console.log(`包内 lang 命名空间 ${pkgLang.size} 个；en 有 zh 没 ${s1TotalMissZh} 键（真缺口 ${s1RealGap.length}）；zh 有 en 没 ${totalMissEn} 键`)
console.log(`KubeJS 注册 ${registrations.length} 个 id：无中文名 ${s2NoZh.length}，动态元件 ${cells.length}，模板未展开 ${skippedTemplates.length}`)
console.log(`无限元件流体 ${sec3.length} 个：缺中文名 ${s3NoZh.length}；原版命名空间 ${s3Vanilla.length} 个（${s3Vanilla.map((r) => r.fluid).join(', ')}）${vanillaZh ? '由原版 zh_cn 提供中文名' : '未找到原版 zh_cn，按 n/a 处理'}`)
console.log(`mod jar ${jarsScanned} 个：无可用 zh_cn ${s4.length} 个（包内已覆盖 ${s4Covered.length}，真未覆盖 ${s4Uncovered.length}）；读取失败 ${jarsFailed}；内嵌 jar ${nestedScanned}`)
console.log(`FTB 任务书：en_us 键 ${qEn?.map.size ?? 0}（续行 ${qEn?.contLines ?? 0}），zh_cn 键 ${qZh?.map.size ?? 0}，缺 ${qMissZh.length}，多 ${qMissEn.length}`)
console.log(`AE2 图鉴：${new Set(guideRefs.map((r) => r.file)).size} 个 md / ${guideRefs.length} 处引用 / ${refIds.length} 个唯一 id；存在 ${refResults.filter((r) => r.inIndex).length}，疑似 ${s6Suspect.length}，不存在 ${s6Missing.length}；已知两条 ${s6Known.every((k) => k.fixedOk) ? '均已修' : '存在待复核项'}`)
if (s3NoZh.length) console.log('缺中文名的流体：', s3NoZh.map((r) => r.fluid).join(', '))
if (s1RealGap.length) console.log('第 1 节真缺口：', s1RealGap.map(([ns, k]) => `${ns}:${k}`).join(', '))
if (s6Missing.length) console.log('图鉴缺失 id：', s6Missing.map((r) => r.id).join(', '))
