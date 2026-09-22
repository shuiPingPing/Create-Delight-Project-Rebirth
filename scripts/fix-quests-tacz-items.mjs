// 修复 TACZ（枪械）任务物品/图标在 1.20.1 → 1.21.1 迁移中被清空的数据。
//
// 现象：任务书里 TACZ 相关任务（含章节图标）显示为黑紫"缺失贴图"块。
// 根因：源包这些物品带 NBT：
//     item: { Count: 1  id: "tacz:attachment"  tag: { AttachmentId: "create_armorer:sight_standard" } }
//     match_nbt: true
//   游戏在 1.21.1 回写时把 tag 变成**空** custom_data（或整块删掉）、并丢掉 match_nbt：
//     item: { components: { "minecraft:custom_data": { } }, count: 1, id: "tacz:attachment" }
//     item: { count: 1  id: "tacz:ammo" }
//   TACZ 1.21 靠 `minecraft:custom_data` 里的 AttachmentId / GunId / AmmoId 选模型与匹配
//   （jar 内 com.tacz.guns.api.item.nbt.*ItemDataAccessor）→ 数据空了就没有模型 → 缺失贴图。
//
// 映射方式：按「所属对象 id」对应。不能用出现顺序——游戏回写时按字母序重排了 key，顺序对不上。
//   - `item:` 块 → 取它**前面**最近的 `id: "HEX"`（task / reward 自身的 id）
//   - `icon:` 块 → 取它**后面**最近的 `id: "HEX"`（quest / chapter 自身的 id）
//   这两类 id 在两侧文件里一致（迁移没改 id）。
//
// 用法：
//   node scripts/fix-quests-tacz-items.mjs --dry-run [--verbose]
//   node scripts/fix-quests-tacz-items.mjs
import fs from 'node:fs'
import path from 'node:path'

const SRC = 'D:/git-MC/CDR1201/config/ftbquests/quests/chapters'
const CUR = 'D:/git-MC/CDR1211/config/ftbquests/quests/chapters'
const dryRun = process.argv.includes('--dry-run')
const verbose = process.argv.includes('--verbose')

const readById = (dir, file) => {
  const p = path.join(dir, file)
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8')
  const cand = fs.readdirSync(dir).find((f) => f.toLowerCase() === file.toLowerCase())
  return cand ? fs.readFileSync(path.join(dir, cand), 'utf8') : null
}

/** 从 startLine 起按花括号配平取出块 */
function blockAt(lines, startLine) {
  let depth = 0
  for (let i = startLine; i < lines.length; i++) {
    depth += (lines[i].match(/\{/g) ?? []).length - (lines[i].match(/\}/g) ?? []).length
    if (depth <= 0) return { endLine: i, text: lines.slice(startLine, i + 1).join('\n') }
  }
  return { endLine: startLine, text: lines[startLine] }
}

const HEX_ID = /^\s*id:\s*"([0-9A-Fa-f]{8,})"\s*$/

/** 扫描一个文件，收集 tacz 的 item/icon 块 */
function scan(dir, file) {
  const text = readById(dir, file)
  if (!text || !text.includes('tacz:')) return { blocks: [], lines: null }
  const lines = text.split(/\r?\n/)
  const blocks = []
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)(item|icon):\s*\{/)
    if (!m) continue
    const kind = m[2]
    const { endLine, text: body } = blockAt(lines, i)
    if (!body.includes('tacz:')) continue
    const itemId = (body.match(/\bid:\s*"(tacz:[a-z_]+)"/) ?? [])[1]
      ?? (body.match(/^\s*id:\s*"(tacz:[a-z_]+)"\s*$/m) ?? [])[1]
    if (!itemId) continue
    // tag 块内容（源包形式）
    let inner = null
    const tagRel = body.split('\n').findIndex((l) => /^\s*tag:\s*\{/.test(l))
    if (tagRel >= 0) {
      const sub = blockAt(body.split('\n'), tagRel)
      inner = sub.text.split('\n').slice(1, -1).filter((l) => l.trim() !== '')
    }
    // 已恢复的数据（现库形式，非空 custom_data）
    let existing = null
    const cdRel = body.split('\n').findIndex((l) => /"minecraft:custom_data":\s*\{/.test(l))
    if (cdRel >= 0 && !/"minecraft:custom_data":\s*\{\s*\}/.test(body)) {
      const sub = blockAt(body.split('\n'), cdRel)
      existing = sub.text.split('\n').slice(1, -1).filter((l) => l.trim() !== '')
    }
    // match_nbt / match_components
    const tail = lines.slice(endLine, Math.min(endLine + 4, lines.length)).join('\n')
    const matchNbt = /^\s*match_nbt:\s*true/m.test(tail) || /^\s*match_components:\s*true/m.test(tail)
    // 所属对象 id
    let owner = null
    if (kind === 'item') {
      for (let k = i - 1; k >= 0; k--) { const h = lines[k].match(HEX_ID); if (h) { owner = h[1].toUpperCase(); break } }
    } else {
      for (let k = endLine + 1; k < lines.length; k++) { const h = lines[k].match(HEX_ID); if (h) { owner = h[1].toUpperCase(); break } }
    }
    blocks.push({ start: i, end: endLine, kind, itemId, inner, existing, matchNbt, owner })
  }
  return { blocks, lines }
}

/* ---------- 1. 源索引 ---------- */
const sourceIndex = new Map()
let srcTotal = 0
for (const file of fs.readdirSync(SRC).filter((f) => f.endsWith('.snbt'))) {
  const { blocks } = scan(SRC, file)
  for (const b of blocks) {
    if (!b.inner || !b.owner) continue
    sourceIndex.set(`${b.owner}|${b.kind}|${b.itemId}`, { inner: b.inner, matchNbt: b.matchNbt, file })
    srcTotal++
  }
}
console.log(`源包索引：${sourceIndex.size} 个带 NBT 的 TACZ ${''}块（出现 ${srcTotal} 次）`)

/* ---------- 2. 现库修复 ---------- */
let fixedItems = 0, fixedIcons = 0, skipped = 0
const samples = []
let touched = 0
for (const file of fs.readdirSync(CUR).filter((f) => f.endsWith('.snbt'))) {
  const { blocks, lines } = scan(CUR, file)
  if (!blocks.length) continue
  const eol = readById(CUR, file).includes('\r\n') ? '\r\n' : '\n'
  let changed = false
  // 从后往前替换，避免行号漂移
  for (const b of [...blocks].sort((x, y) => y.start - x.start)) {
    if (b.existing) continue                      // 已有数据，跳过
    const info = sourceIndex.get(`${b.owner}|${b.kind}|${b.itemId}`)
    if (!info) { skipped++; continue }
    const indent = (lines[b.start].match(/^(\s*)/) ?? [])[1] ?? ''
    const innerIndent = indent + '\t'.repeat(3)
    const count = ((lines.slice(b.start, b.end + 1).join('\n').match(/\bcount:\s*(\d+)/) ?? [])[1]) ?? '1'
    const out = [
      `${indent}${b.kind}: {`,
      `${indent}\tcomponents: {`,
      `${indent}\t\t"minecraft:custom_data": {`,
      ...info.inner.map((l) => innerIndent + l.trim()),
      `${indent}\t\t}`,
      `${indent}\t}`,
      `${indent}\tcount: ${count}`,
      `${indent}\tid: "${b.itemId}"`,
      `${indent}}`,
    ]
    if (b.kind === 'item' && info.matchNbt) out.push(`${indent}match_components: true`)
    lines.splice(b.start, b.end - b.start + 1, ...out)
    changed = true
    if (b.kind === 'item') fixedItems++; else fixedIcons++
    if (samples.length < 14 || verbose) {
      samples.push(`  ✅ ${file}:${b.start + 1} [${b.kind}] ${b.itemId} ← ${info.file} (${info.inner.length} 行 NBT${info.matchNbt ? ' + match_components' : ''})`)
    }
  }
  if (changed) {
    touched++
    if (!dryRun) {
      const real = fs.readdirSync(CUR).find((f) => f.toLowerCase() === file.toLowerCase())
      const full = path.join(CUR, real)
      fs.copyFileSync(full, `${full}.bak`)
      fs.writeFileSync(full, lines.join(eol), 'utf8')
    }
  }
}

console.log(`\n涉及文件：${touched} 个`)
console.log(`恢复 item 块：${fixedItems} 个；恢复 icon 块：${fixedIcons} 个；源里找不到对应数据而跳过：${skipped} 个`)
for (const s of samples) console.log(s)
if (dryRun) console.log('\n（dry-run，未写文件）')
else console.log('\n已写回（同目录留 .bak 备份）')
