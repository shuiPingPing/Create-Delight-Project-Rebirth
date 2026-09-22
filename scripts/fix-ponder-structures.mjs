// 修正 Ponder 结构 nbt 里残留的旧命名空间方块 id。
//
// 背景：CDR1201 的结构文件被原样复制到 kubejs/assets/createdelightcore/ponder/，但**只改了路径没改内容**——
// 调色板里仍是 `createdelight:butchery_room` 等旧 id，在 1.21.1 不存在 → Ponder 场景里这些方块变成空气/占位，
// 于是「机器本体看不见」「上面像被挡住」。
//
// 做法：NBT 字符串是「2 字节大端长度 + UTF-8 字节」，所以逐条查找旧 id、校验长度前缀、替换并按新长度重建。
// 只改字符串内容，不动结构；输出 gzip 压缩（与原文件一致）。
//
// 用法：
//   node scripts/fix-ponder-structures.mjs --dry-run
//   node scripts/fix-ponder-structures.mjs
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const ASSETS = 'D:/git-MC/CDR1211/kubejs/assets'
const dryRun = process.argv.includes('--dry-run')

const RENAMES = [
  ['createdelight:', 'createdelightcore:'],
  ['alexscaves:', 'alexscavesup:'],
  ['alexsmobs:', 'alexsmobsup:'],
  ['citadel:', 'citadelup:'],
  ['miners_delight:', 'minersdelight:'],
  ['casualness_delight:', 'casualnessdelight:'],
  ['some_assembly_required:', 'someassemblyrequired:'],
  ['expatternprovider:', 'extendedae:'],
  ['createnewage:', 'create_new_age:'],
]

function walk(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else if (e.name.endsWith('.nbt')) out.push(p)
  }
  return out
}

const files = walk(ASSETS).filter((f) => f.includes('ponder'))
console.log(`ponder 结构文件: ${files.length} 个\n`)

let touchedFiles = 0
let totalRepl = 0
for (const file of files) {
  const raw = fs.readFileSync(file)
  let buf
  let gzipped = true
  try { buf = zlib.gunzipSync(raw) } catch { buf = raw; gzipped = false }

  let repl = 0
  for (const [from, to] of RENAMES) {
    const ob = Buffer.from(from, 'utf8')
    let searchFrom = 0
    for (;;) {
      const idx = buf.indexOf(ob, searchFrom)
      if (idx < 2) break
      // NBT 字符串：前两字节是**整串**大端长度；ob 只是它的命名空间前缀。
      // 取出整串做校验（长度自洽 + 确实以旧命名空间开头），再按新长度重建。
      const len = buf.readUInt16BE(idx - 2)
      if (len < ob.length || idx + len > buf.length) { searchFrom = idx + 1; continue }
      const value = buf.subarray(idx, idx + len).toString('utf8')
      if (!value.startsWith(from) || Buffer.byteLength(value, 'utf8') !== len) { searchFrom = idx + 1; continue }
      const newValue = Buffer.from(to + value.slice(from.length), 'utf8')
      const lenPrefix = Buffer.alloc(2)
      lenPrefix.writeUInt16BE(newValue.length, 0)
      buf = Buffer.concat([buf.subarray(0, idx - 2), lenPrefix, newValue, buf.subarray(idx + len)])
      repl++
      searchFrom = idx + newValue.length
    }
  }
  if (repl > 0) {
    touchedFiles++
    totalRepl += repl
    const rel = file.replace(ASSETS + '/', '')
    console.log(`  ${rel}  →  ${repl} 处`)
    if (!dryRun) {
      fs.copyFileSync(file, `${file}.bak`)
      fs.writeFileSync(file, gzipped ? zlib.gzipSync(buf) : buf)
    }
  }
}
console.log(`\n涉及文件 ${touchedFiles} 个，共替换 ${totalRepl} 处`)
if (dryRun) console.log('（dry-run，未写文件）')
else console.log('已写回（同目录留 .bak）')
