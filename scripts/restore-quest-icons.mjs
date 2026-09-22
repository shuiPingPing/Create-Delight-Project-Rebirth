// 给「因 1.21.1 缺少 itemfilters / questsadditions 而被转成 checkmark」的任务所属 quest
// 补一个 quest 级 icon，取回原来的视觉图标（语义不变，仍是 checkmark）。
//
// 数据来源：
//   - 转换清单：_dsh_tmp/quests-migration-report.md 的明细表（to == checkmark）
//   - 原始过滤器：CDR1201 源包章节文件里的 tasks[].item（itemfilters:tag / itemfilters:or / 具体物品）
//   - 标签解析：各 jar 的 data/*/tags/item*/**.json（含原版 jar），递归展开 #tag
//
// 用法：
//   node scripts/restore-quest-icons.mjs --dry-run [--debug]
//   node scripts/restore-quest-icons.mjs            # 就地写回（同目录留 .bak）
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const REPO = 'D:/git-MC/CDR1211'
const SRC = 'D:/git-MC/CDR1201/config/ftbquests/quests/chapters'
const REPORT = 'D:/git-MC/_dsh_tmp/quests-migration-report.md'
const CUR = path.join(REPO, 'config/ftbquests/quests/chapters')
const MC_JAR = 'E:/myWord/hcml/.minecraft/versions/1.21.1/1.21.1.jar'

const dryRun = process.argv.includes('--dry-run')
const dbg = process.argv.includes('--debug')

/* ---------- 通用小工具 ---------- */
// 大小写不敏感地找 `id: "XXX"`。
// 注意：不能对整段文本 toUpperCase() 再 indexOf —— 源文件里存在大小写映射会改变长度的 Unicode 字符（实测踩到），
// 一旦长度变化，后续索引与子串匹配全部失效。改为：先找大写、再找小写、最后正则兜底。
function findId(text, id) {
  let i = text.indexOf(`id: "${id}"`)
  if (i < 0) i = text.indexOf(`id: "${id.toLowerCase()}"`)
  if (i < 0) {
    const m = new RegExp(`id:\\s*"${id}"`, 'i').exec(text)
    i = m ? m.index : -1
  }
  return i
}
// 字符串感知的「包含 idx 的最内层 { ... }」（跳过 "..." 里的花括号）
function innerBlock(text, idx) {
  let s = -1
  let inStr = false
  for (let i = 0; i < idx; i++) {
    const c = text[i]
    if (c === '"' && text[i - 1] !== '\\') inStr = !inStr
    else if (!inStr && c === '{') s = i
  }
  if (s < 0) return null
  let depth = 0
  inStr = false
  for (let i = s; i < text.length; i++) {
    const c = text[i]
    if (c === '"' && text[i - 1] !== '\\') inStr = !inStr
    else if (!inStr) {
      if (c === '{') depth++
      else if (c === '}') {
        depth--
        if (depth === 0) return { start: s, end: i, text: text.slice(s, i + 1) }
      }
    }
  }
  return null
}
function readWithCase(dir, file) {
  const p = path.join(dir, file)
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8')
  const cand = fs.readdirSync(dir).find((f) => f.toLowerCase() === file.toLowerCase())
  return cand ? fs.readFileSync(path.join(dir, cand), 'utf8') : null
}
function realName(dir, file) {
  return fs.readdirSync(dir).find((f) => f.toLowerCase() === file.toLowerCase()) ?? file
}

/* ---------- 1. 读转换清单 ---------- */
const rows = []
for (const line of fs.readFileSync(REPORT, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\|\s*(chapters\/[^|]+?)\s*\|\s*`([0-9A-Fa-f]+)`\s*\|\s*`([0-9A-Fa-f]+)`\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*([^|]*)\|/)
  if (m && m[5].trim() === 'checkmark') {
    rows.push({ file: path.basename(m[1].trim()), quest: m[2].toUpperCase(), task: m[3].toUpperCase(), from: m[4].trim() })
  }
}
const seen = new Set()
const targets = rows.filter((r) => !seen.has(r.quest + r.task) && seen.add(r.quest + r.task))
console.log(`转换清单: ${targets.length} 条 task（from: ${[...new Set(targets.map((t) => t.from))].join(', ')}）`)

/* ---------- 2. 读标签表（原版 + 全部 mod jar） ---------- */
// 支持 zip64（大 jar，例如 Create 用了 zip64，早期版本漏扫导致 #create:cogwheel 之类查不到）
function zipEntries(jarPath, allEntries = false) {
  const out = []
  const buf = fs.readFileSync(jarPath)
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
    const wanted = allEntries
      ? /^assets\/[^/]+\/models\/(item|block)\/.+\.json$/
      : /^data\/[^/]+\/tags\/items?\/.+\.json$/
    if (wanted.test(name)) out.push({ name, method, compSize, localOff, buf })
    off += 46 + nameLen + extraLen + commentLen
  }
  return out
}
function readEntry(e) {
  const { buf, localOff } = e
  const nameLen = buf.readUInt16LE(localOff + 26)
  const extraLen = buf.readUInt16LE(localOff + 28)
  const start = localOff + 30 + nameLen + extraLen
  const raw = buf.slice(start, start + e.compSize)
  return e.method === 8 ? zlib.inflateRawSync(raw).toString('utf8') : raw.toString('utf8')
}

const tagMap = new Map()
const jars = [MC_JAR, ...fs.readdirSync(path.join(REPO, 'mods')).filter((f) => f.endsWith('.jar')).map((f) => path.join(REPO, 'mods', f))]
for (const jar of jars) {
  if (!fs.existsSync(jar)) continue
  let entries = []
  try { entries = zipEntries(jar) } catch { continue }
  for (const e of entries) {
    const m = e.name.match(/^data\/([^/]+)\/tags\/items?\/(.+)\.json$/)
    if (!m) continue
    const tag = `${m[1]}:${m[2]}`
    let json
    try { json = JSON.parse(readEntry(e)) } catch { continue }
    const set = tagMap.get(tag) ?? new Set()
    for (const v of json.values ?? []) if (typeof v === 'string') set.add(v)
    tagMap.set(tag, set)
  }
}
console.log(`标签表: ${tagMap.size} 个 tag（原版 + ${jars.length - 1} 个 mod jar）`)

// 物品/方块存在性：以 jar 内的模型文件为准（assets/<ns>/models/item|x.json、models/block/x.json）
const modelSet = new Set()
for (const jar of jars) {
  if (!fs.existsSync(jar)) continue
  let entries = []
  try { entries = zipEntries(jar, true) } catch { continue }
  for (const e of entries) {
    const m = e.name.match(/^assets\/([^/]+)\/models\/(item|block)\/(.+)\.json$/)
    if (m) modelSet.add(`${m[1]}:${m[3]}`)
  }
}
console.log(`模型表: ${modelSet.size} 个 item/block 模型`)
const itemExists = (id) => modelSet.has(id)
// tag 在 1.21.1 已不存在时，退一步按 tag 末段猜物品 id，并用模型文件验证确实存在
function guessItemFromTag(tag) {
  const [ns, ...rest] = tag.split(':')
  const path = rest.join(':')
  const last = path.split('/').pop()
  const nss = [NS_RENAME[ns], ns].filter(Boolean)
  const cands = []
  for (const n of nss) cands.push(`${n}:${path}`, `${n}:${last}`, `${n}:${last}s`, `${n}:${last.replace(/s$/, '')}`)
  for (const c of cands) if (itemExists(c)) return c
  return null
}

const resolveCache = new Map()
// 1.20.1 → 1.21.1 的命名空间改名（与迁移脚本同一张表），用于标签查不到时重试
const NS_RENAME = {
  createdelight: 'createdelightcore',
  alexscaves: 'alexscavesup',
  alexsmobs: 'alexsmobsup',
  citadel: 'citadelup',
  miners_delight: 'minersdelight',
  casualness_delight: 'casualnessdelight',
  some_assembly_required: 'someassemblyrequired',
  expatternprovider: 'extendedae',
  forge: 'c',
}
function lookupTag(tag) {
  if (tagMap.has(tag)) return tag
  const [ns, ...rest] = tag.split(':')
  const path = rest.join(':')
  // 1) 命名空间改名
  const renamed = NS_RENAME[ns]
  if (renamed && tagMap.has(`${renamed}:${path}`)) return `${renamed}:${path}`
  // 2) 单复数与末段变化（cogwheel→cogwheels、vaults→vault 之类）
  const last = path.split('/').pop()
  const variants = [path, `${path}s`, path.replace(/s$/, ''), `${last}s`, last.replace(/s$/, '')]
  for (const nsv of [renamed, ns].filter(Boolean)) {
    for (const v of variants) {
      if (v && tagMap.has(`${nsv}:${v}`)) return `${nsv}:${v}`
    }
  }
  // 3) forge → c：原路径、末段、以及末段复数
  if (ns === 'forge' || renamed === 'c') {
    for (const cand of [`c:${path}`, `c:${last}`, `c:${last}s`]) if (tagMap.has(cand)) return cand
  }
  return null
}
function resolveTag(tag, depth = 0) {
  if (resolveCache.has(tag)) return resolveCache.get(tag)
  if (depth > 6) return []
  const real = lookupTag(tag)
  const set = real ? tagMap.get(real) : null
  if (!set) { resolveCache.set(tag, []); return [] }
  const items = []
  for (const v of set) {
    if (v.startsWith('#')) items.push(...resolveTag(v.slice(1), depth + 1))
    else items.push(v)
  }
  const uniq = [...new Set(items)]
  resolveCache.set(tag, uniq)
  return uniq
}
function pickRepresentative(items, tag) {
  if (!items.length) return null
  const base = tag ? tag.split('/').pop().split(':').pop() : ''
  const score = (id) => {
    const p = id.split(':').pop()
    let s = 0
    if (base && p === base) s += 100
    if (base && p.endsWith('_' + base)) s += 60
    if (/fluix|default|normal|plain|basic/.test(p)) s += 40
    return s
  }
  return [...items].sort((a, b) => (score(b) - score(a)) || a.localeCompare(b))[0]
}

/* ---------- 3. 从源包取原始过滤器，定出代表物品 ---------- */
// 少数标签在 1.21.1 已不存在且按名字猜不到（旧 forge: 分级标签、已移除 mod 等）→ 人工指定，
// 取值都经过 itemExists() 校验，理由写在注释里。
const MANUAL_ICONS = {
  '333BF6EDDA0D6998': 'gateways:gate_pearl',                      // 命定之门（原 #more_mod_tetra:over_core，该 mod 不在 1.21.1）
  '38FEB46E9F16E159': 'alexscavesup:vanilla_ice_cream_scoop',     // #alexscaves:ice_cream_scoop
  '1DC5E003961CA53D': 'alexscavesup:sweetish_fish_blue',          // #alexscaves:sweetish_fish（只有分色物品）
  '731F8C9DC5ADC57F': 'alexscavesup:vanilla_ice_cream',           // #alexscaves:ice_cream
  '65877729DB7620EF': 'create_bs:iron_item_vault',                // #create_bs:vaults（现在只有 *_item_vault）
  '3968AC36E0517F5B': 'vintageimprovements:andesite_spring',      // 低强度弹簧（原 #forge:spring/below_500）
  '610ED0789BAF7EFC': 'vintageimprovements:steel_spring',         // 高强度弹簧（原 #forge:spring/between_500_2_1000）
  '4CC4E893A6950B0F': 'vintageimprovements:netherite_spring',     // 超高强度弹簧（原 #forge:spring/over_1000）
  '395CE84DC5201E94': 'create_new_age:copper_wire',               // 电线（原 #forge:wires/electric）
  '73B0EDFE6627F286': 'minecraft:bamboo',                         // 竹子/树皮/木屑/草杆（原 #forge:papers_raw_material）
  '5F7A132E1CFCEED3': 'minecraft:cactus',                         // 仙人掌/菠萝苗/腐肉/粗布（原 #createdelight:leather_ingredient）
  '2A65ED174CF69AB7': 'youkaishomecoming:frozen_frog_temperate',  // 冻青蛙（原 #youkaishomecoming:frozen_frog，现分冷暖三档）
}

const planned = []
const unresolved = []
const miss = { src: 0, questId: 0, questBlock: 0, taskId: 0, taskBlock: 0 }
for (const t of targets) {
  const src = readWithCase(SRC, t.file)
  if (!src) { miss.src++; if (dbg) console.log(`  [src缺失] ${t.file}`); continue }
  const qi = findId(src, t.quest)
  if (qi < 0) { miss.questId++; if (dbg) console.log(`  [找不到questId] ${t.file} ${t.quest}`); continue }
  const q = innerBlock(src, qi)
  if (!q) { miss.questBlock++; if (dbg) console.log(`  [块定位失败] ${t.file} ${t.quest}`); continue }
  const ti = findId(q.text, t.task)
  if (ti < 0) { miss.taskId++; if (dbg) console.log(`  [找不到taskId] ${t.file} ${t.quest} ${t.task}`); continue }
  const task = innerBlock(q.text, ti)
  if (!task) { miss.taskBlock++; if (dbg) console.log(`  [task块失败] ${t.file} ${t.quest}`); continue }

  let iconId = null
  let why = ''
  if (t.from === 'questsadditions:time') { iconId = 'minecraft:clock'; why = 'questsadditions:time → 时钟' }
  else if (t.from === 'questsadditions:days') { iconId = 'minecraft:daylight_detector'; why = 'questsadditions:days → 日照传感器' }
  else if (t.from === 'questsadditions:killnbt') { iconId = 'minecraft:iron_sword'; why = 'questsadditions:killnbt → 铁剑' }
  else {
    const ii = task.text.indexOf('item: {')
    const ib = ii >= 0 ? innerBlock(task.text, ii + 6) : null
    const body = ib ? ib.text : task.text
    const tagM = body.match(/tag:\s*\{\s*value:\s*"([^"]+)"/)
    const singleM = body.match(/\bid:\s*"(?!itemfilters:)([a-z0-9_.-]+:[a-z0-9_/.-]+)"/i)
    if (tagM) {
      const tag = tagM[1]
      const items = resolveTag(tag)
      iconId = pickRepresentative(items, tag)
      if (iconId) why = `#${tag}（${items.length} 个物品）→ ${iconId}`
      else {
        const guess = guessItemFromTag(tag)
        if (guess) { iconId = guess; why = `#${tag}（1.21.1 无此 tag）→ 按名字猜 ${guess}` }
        else if (MANUAL_ICONS[t.quest] && itemExists(MANUAL_ICONS[t.quest])) {
          iconId = MANUAL_ICONS[t.quest]
          why = `#${tag}（1.21.1 无此 tag）→ 人工指定 ${iconId}`
        } else why = `#${tag}（1.21.1 无此 tag，也猜不到物品）`
      }
    } else if (singleM) {
      iconId = singleM[1]
      why = `具体物品 ${iconId}`
    } else {
      const orIds = [...body.matchAll(/\bid:\s*"([a-z0-9_.-]+:[a-z0-9_/.-]+)"/gi)].map((m) => m[1]).filter((v) => !v.startsWith('itemfilters:'))
      iconId = orIds[0] ?? null
      why = `itemfilters:or → ${iconId ?? '未解析'}`
    }
  }
  if (!iconId) { unresolved.push({ ...t, why }); continue }
  planned.push({ ...t, iconId, why })
}

/* ---------- 4. 对照当前文件，规划插入点 ---------- */
const edits = []
let hasIcon = 0
for (const p of planned) {
  const cur = readWithCase(CUR, p.file)
  if (!cur) continue
  const qi = findId(cur, p.quest)
  if (qi < 0) continue
  const q = innerBlock(cur, qi)
  if (!q) continue
  if (/(^|\n)\s*icon\s*:/.test(q.text)) { hasIcon++; continue }
  const lines = cur.split(/\r?\n/)
  let lineIdx = -1
  let indent = '\t\t\t'
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\t+)id:\s*"([0-9A-Fa-f]+)"\s*$/)
    if (m && m[2].toUpperCase() === p.quest) { lineIdx = i; indent = m[1]; break }
  }
  if (lineIdx < 0) continue
  edits.push({ file: realName(CUR, p.file), lineIdx, indent, iconId: p.iconId, quest: p.quest, why: p.why })
}

console.log(`\n计划补 icon: ${edits.length} 个 quest（已有 icon 跳过 ${hasIcon}，标签未解析 ${unresolved.length}）`)
const byFile = {}
for (const e of edits) byFile[e.file] = (byFile[e.file] ?? 0) + 1
console.log('按章节：', JSON.stringify(byFile))
console.log('样例：')
for (const e of edits.slice(0, 18)) console.log(`  ${e.file.padEnd(34)} ${e.quest}  icon=${String(e.iconId).padEnd(38)} ← ${e.why}`)
if (unresolved.length) {
  console.log('\n未解析（保持 ✔）：')
  for (const u of unresolved.slice(0, 15)) console.log(`  ${u.file} ${u.quest}  ${u.why}`)
}
if (dbg) console.log('\n定位失败计数：', JSON.stringify(miss))

if (dryRun) { console.log('\n（dry-run，未写文件）'); process.exit(0) }

/* ---------- 5. 写回 ---------- */
const grouped = new Map()
for (const e of edits) {
  if (!grouped.has(e.file)) grouped.set(e.file, [])
  grouped.get(e.file).push(e)
}
for (const [file, list] of grouped) {
  const full = path.join(CUR, file)
  const text = fs.readFileSync(full, 'utf8')
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const lines = text.split(/\r?\n/)
  for (const e of [...list].sort((a, b) => b.lineIdx - a.lineIdx)) {
    lines.splice(e.lineIdx, 0, `${e.indent}icon: {`, `${e.indent}\tid: "${e.iconId}"`, `${e.indent}}`)
  }
  fs.copyFileSync(full, `${full}.bak`)
  fs.writeFileSync(full, lines.join(eol), 'utf8')
  console.log(`写入 ${file}：+${list.length} 个 icon`)
}
