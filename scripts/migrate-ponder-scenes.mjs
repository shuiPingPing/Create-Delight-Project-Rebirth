// 把 CDR1201（1.20.1）的 Ponder 展示层整体迁到 CDR1211（1.21.1）。
//
// 迁移内容（24 个文件）：
//   client_scripts/ponder/scene/{ae2×14, mbd2×5, create.js}
//   client_scripts/ponder/tag/{ae2/ponder_tag.js, multiblock.js, remove.js}
//   client_scripts/utils/ponder.js            （PonderUtil，纯 scene.world/effects 薄封装）
//   client_scripts/00_java_classes.js         （CDClientJavaClasses 门面 → 只保留本批用得到的成员）
//
// 已核对过的前提：
//   - ponderjs 2.4.0（1.21.1）API 与用法一致：Ponder.registry/Ponder.tags、event.create(Ingredient)、
//     .scene(id, title, storyboard) / .scene(id, title, 结构id, storyboard)；上游 1.21.1 分支示例脚本确认。
//   - Create 6.0.10 仍有 com.simibubi.create.foundation.ponder.CreateSceneBuilder。
//   - 结构 nbt 已在 CDR1211：kubejs/assets/createdelightcore/ponder/*.nbt（30 个）。
//   - 机器已在 CDR1211：createdelightcore:butchery_room / andesite_import_bus / andesite_export_bus / create_in …
//
// 用法：
//   node scripts/migrate-ponder-scenes.mjs --dry-run [--verbose]
//   node scripts/migrate-ponder-scenes.mjs --write
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const SRC_ROOT = 'D:/git-MC/CDR1201/kubejs/client_scripts'
const DST_ROOT = 'D:/git-MC/CDR1211/kubejs/client_scripts'
const NS_ASSETS = 'D:/git-MC/CDR1211/kubejs/assets'
const MODS = 'D:/git-MC/CDR1211/mods'

const write = process.argv.includes('--write')
const verbose = process.argv.includes('--verbose')

// 命名空间改名（与 FTB 任务书迁移同一张表）
const RENAMES = [
  [/\bcreatedelight:/g, 'createdelightcore:'],
  [/\balexscaves:/g, 'alexscavesup:'],
  [/\balexsmobs:/g, 'alexsmobsup:'],
  [/\bcitadel:/g, 'citadelup:'],
  [/\bminers_delight:/g, 'minersdelight:'],
  [/\bcasualness_delight:/g, 'casualnessdelight:'],
  [/\bsome_assembly_required:/g, 'someassemblyrequired:'],
  [/\bexpatternprovider:/g, 'extendedae:'],
  [/\bcreatenewage:/g, 'create_new_age:'],
  // KubeJS 2101 里 client 脚本**不能**写 global（拿到的 binding 是 Collections.unmodifiableMap，
  // 只有 startup 脚本拿到可写 HashMap，见 BuiltinKubeJSPlugin.registerBindings）→ 改用顶层变量跨文件共享
  [/global\.CDClientJavaClasses/g, 'CDClientJavaClasses'],
]

/* ---------- 1. 收集源文件 ---------- */
function walk(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else if (e.name.endsWith('.js')) out.push(p)
  }
  return out
}
const sceneFiles = walk(path.join(SRC_ROOT, 'ponder'))
const extraFiles = [path.join(SRC_ROOT, 'utils', 'ponder.js')]
const files = [...sceneFiles, ...extraFiles]
console.log(`待迁移：${sceneFiles.length} 个场景/标签脚本 + ${extraFiles.length} 个工具文件`)

/* ---------- 2. 读 + 改名 ---------- */
const transformed = new Map() // destRel -> { text, renames, srcRel }
const renameStats = {}
for (const f of files) {
  const rel = path.relative(SRC_ROOT, f).split(path.sep).join('/')
  let text = fs.readFileSync(f, 'utf8')
  for (const [re, to] of RENAMES) {
    const n = (text.match(re) ?? []).length
    if (n) {
      renameStats[`${re.source} → ${to}`] = (renameStats[`${re.source} → ${to}`] ?? 0) + n
      text = text.replace(re, to)
    }
  }
  const destRel = rel === 'utils/ponder.js' ? 'utils/ponder.js' : rel
  transformed.set(destRel, { text, srcRel: rel, src: f })
}

/* ---------- 3. 门面：只保留本批用到的成员，并逐个校验类是否存在 ---------- */
const facadeSrc = fs.readFileSync(path.join(SRC_ROOT, '00_java_classes.js'), 'utf8')
const facadeEntries = [...facadeSrc.matchAll(/\$(\w+):\s*Java\.loadClass\("([^"]+)"\)/g)].map((m) => ({ alias: '$' + m[1], fqcn: m[2] }))
const used = new Set()
for (const { text } of transformed.values()) {
  for (const m of text.matchAll(/CDClientJavaClasses\.\$(\w+)/g)) used.add('$' + m[1])
}

function classMapOfJars() {
  const map = new Map()
  const jars = fs.readdirSync(MODS).filter((f) => f.endsWith('.jar')).map((f) => path.join(MODS, f))
  for (const jar of jars) {
    const buf = fs.readFileSync(jar)
    const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
    if (eocd < 0) continue
    let count = buf.readUInt16LE(eocd + 10)
    let cdOff = buf.readUInt32LE(eocd + 16)
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
      const nameLen = buf.readUInt16LE(off + 28)
      const extraLen = buf.readUInt16LE(off + 30)
      const commentLen = buf.readUInt16LE(off + 32)
      const name = buf.slice(off + 46, off + 46 + nameLen).toString('utf8')
      if (name.endsWith('.class')) {
        const cn = name.slice(0, -6)
        if (!map.has(cn)) map.set(cn, path.basename(jar))
      }
      off += 46 + nameLen + extraLen + commentLen
    }
  }
  return map
}
const classes = classMapOfJars()
console.log(`\n门面成员使用情况（本批共用到 ${used.size} 个）:`)
const facadeKept = []
const facadeDropped = []
for (const e of facadeEntries) {
  if (!used.has(e.alias)) continue
  const jar = classes.get(e.fqcn.split('.').join('/'))
  // 原版类在混淆的 client jar 里查不到，属正常，按“原版/未在 mod jar 中找到”放行
  const isVanilla = /^(net\.minecraft|com\.mojang)\./.test(e.fqcn)
  const ok = Boolean(jar) || isVanilla
  console.log(`  ${ok ? '✅' : '❌'} ${e.alias.padEnd(22)} ${e.fqcn}${jar ? '   ← ' + jar : isVanilla ? '   (原版，client jar 混淆故查不到)' : ''}`)
  if (ok) facadeKept.push(e)
  else facadeDropped.push(e)
}
if (facadeDropped.length) {
  console.log('\n⚠️ 以下成员指向的类在 1.21.1 找不到，门面里会被注释掉（若场景真的用到需要手工替换）：')
  for (const d of facadeDropped) console.log(`   ${d.alias}  ${d.fqcn}`)
}

const facadeLines = [
  '// priority: 1200',
  '// 由 CDR1201 的 00_java_classes.js 裁剪而来：只保留 ponder 场景/工具实际用到的成员（2026-09-22 迁移）。',
  '// 其余客户端脚本（tooltip/JEI/渲染等）迁入时，再把需要的成员补回来。',
  '// 注意：KubeJS 2101 里只有 startup 脚本能写 global（client/server 拿到的是 Collections.unmodifiableMap），',
  '// 所以这里用顶层 var，跨文件共享（与 utils/ponder.js 的 PonderUtil 同机制）。',
  'var CDClientJavaClasses = {',
  ...facadeKept.map((e) => `    ${e.alias}: Java.loadClass("${e.fqcn}"),`),
  ...facadeDropped.map((e) => `    // ${e.alias}: Java.loadClass("${e.fqcn}"),   // ← 1.21.1 已不存在，暂缺`),
  '}',
  '',
].join('\n')
transformed.set('00_java_classes.js', { text: facadeLines, srcRel: '00_java_classes.js', src: path.join(SRC_ROOT, '00_java_classes.js') })

/* ---------- 4. 校验场景引用的 id ---------- */
const itemsBlocks = new Set()
const probe = 'D:/git-MC/CDR1211/.probe/registry_objects.json'
if (fs.existsSync(probe)) {
  const j = JSON.parse(fs.readFileSync(probe, 'utf8'))
  for (const key of ['minecraft:item', 'minecraft:block', 'minecraft:fluid', 'minecraft:entity_type'])
    for (const v of j[key] ?? []) itemsBlocks.add(v)
}
console.log(`\n注册表快照：item/block/fluid/entity = ${itemsBlocks.size} 个 id`)

const structureIds = new Set(
  fs.existsSync(path.join(NS_ASSETS, 'createdelightcore', 'ponder'))
    ? fs.readdirSync(path.join(NS_ASSETS, 'createdelightcore', 'ponder')).map((f) => 'createdelightcore:' + f.replace(/\.nbt$/, ''))
    : []
)
const missing = new Map()
for (const [destRel, { text }] of transformed) {
  if (!destRel.startsWith('ponder/')) continue
  for (const m of text.matchAll(/"([a-z0-9_]+:[a-z0-9_/.]+)"/g)) {
    const id = m[1]
    if (structureIds.has(id)) continue
    if (itemsBlocks.has(id)) continue
    // tag 引用、粒子名、其它非注册表 id 单独统计
    if (!missing.has(id)) missing.set(id, [])
    missing.get(id).push(destRel)
  }
}
console.log(`\n场景里引用但不在注册表快照里的 id：${missing.size} 个`)
for (const [id, where] of [...missing].slice(0, 40)) console.log(`  ${id.padEnd(46)} ${[...new Set(where)].slice(0, 2).join(', ')}`)

console.log('\n=== 改名统计 ===')
for (const [k, v] of Object.entries(renameStats)) console.log(`  ${k.padEnd(48)} ${v}`)

console.log('\n=== 将写入的文件 ===')
for (const [destRel, { text }] of [...transformed].sort()) console.log(`  ${destRel.padEnd(42)} ${text.split('\n').length} 行`)

if (!write) {
  console.log('\n（dry-run，未写文件）')
  if (verbose) {
    console.log('\n--- 00_java_classes.js 预览 ---')
    console.log(facadeLines)
  }
  process.exit(0)
}

/* ---------- 5. 写盘 ---------- */
let n = 0
for (const [destRel, { text }] of transformed) {
  const out = path.join(DST_ROOT, destRel)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, text, 'utf8')
  n++
}
console.log(`\n已写入 ${n} 个文件到 ${DST_ROOT}`)
