// 给 ME 无限元件生成「左下角代表物图标」的物品模型。
//
// 做法：一个自带的 base 模型（16×16 的元件贴图 + 左下角 6×6 的 icon 元素，icon 引用贴图变量），
// 每个元件一个极小的子模型，只覆盖 `icon` 贴图。
// 另给 ExtendedAE 自带的水/圆石元件写同路径覆盖模型（它们不走 KubeJS 注册，但也在元件家族里）。
//
// 图标挑选链（先手动特例，再自动）：
//   molten_<metal> → <metal>_ingot → <metal>_sheet → <metal>_block → molten_<metal>_bucket
//   <fluid>        → <fluid>_bucket → <fluid>_bottle → <fluid>（同名贴图）
// 跨命名空间查找时优先 minecraft / create / createdelightcore / createmetallurgy / northstar …
//
// 用法：
//   node scripts/gen-infinity-cell-models.mjs --dry-run
//   node scripts/gen-infinity-cell-models.mjs
import fs from 'node:fs'
import path from 'node:path'

const REPO = 'D:/git-MC/CDR1211'
const MC_JAR = 'E:/myWord/hcml/.minecraft/versions/1.21.1/1.21.1.jar'
const ASSETS = path.join(REPO, 'kubejs/assets/createdelightcore')
const dryRun = process.argv.includes('--dry-run')

/* ---------- zip ---------- */
function zipNames(jarPath) {
  const out = []
  const buf = fs.readFileSync(jarPath)
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  if (eocd < 0) return out
  let count = buf.readUInt16LE(eocd + 10)
  let cdOff = buf.readUInt32LE(eocd + 16)
  if (count === 0xffff || cdOff === 0xffffffff) {
    const loc = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x06, 0x07]))
    const z64 = Number(buf.readBigUInt64LE(loc + 8))
    count = Number(buf.readBigUInt64LE(z64 + 32))
    cdOff = Number(buf.readBigUInt64LE(z64 + 48))
  }
  let off = cdOff
  for (let i = 0; i < count; i++) {
    const nameLen = buf.readUInt16LE(off + 28)
    const extraLen = buf.readUInt16LE(off + 30)
    const commentLen = buf.readUInt16LE(off + 32)
    out.push(buf.slice(off + 46, off + 46 + nameLen).toString('utf8'))
    off += 46 + nameLen + extraLen + commentLen
  }
  return out
}

/* ---------- 贴图索引 ---------- */
const textures = new Set()
const byName = new Map()
for (const jar of [MC_JAR, ...fs.readdirSync(path.join(REPO, 'mods')).filter((f) => f.endsWith('.jar')).map((f) => path.join(REPO, 'mods', f))]) {
  if (!fs.existsSync(jar)) continue
  for (const n of zipNames(jar)) {
    const m = /^assets\/([^/]+)\/textures\/(item|block)\/(.+)\.png$/.exec(n)
    if (!m) continue
    const id = `${m[1]}:${m[2]}/${m[3]}`
    if (textures.has(id)) continue
    textures.add(id)
    const list = byName.get(m[3]) ?? []
    list.push(id)
    byName.set(m[3], list)
  }
}

const PREFERRED = ['minecraft', 'create', 'createdelightcore', 'createmetallurgy', 'northstar', 'alexscavesup', 'iceandfire', 'vintageimprovements', 'megacells', 'ratatouille', 'ae2']
const rank = (id) => {
  const i = PREFERRED.indexOf(id.split(':')[0])
  return i < 0 ? 99 : i
}
/** 按贴图名找（优先 item，再 block；命名空间按 PREFERRED 排序） */
function pick(textureName) {
  const list = [...(byName.get(textureName) ?? [])].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
  return list.find((x) => x.includes(':item/')) ?? list[0] ?? null
}

/* ---------- 流体表 ---------- */
const globals = fs.readFileSync(path.join(REPO, 'kubejs/startup_scripts/global_data.js'), 'utf8')
const fluids = [...globals.slice(globals.indexOf('INFINITE_SOURCE_FLUIDS')).matchAll(/'([a-z0-9_]+:[a-z0-9_/]+)'/g)].map((m) => m[1])

/** 手动特例：自动规则挑不出合适贴图的 */
const MANUAL = {
  'createdelightcore:molten_glass': 'minecraft:block/glass',
  'createdelightcore:molten_quartz_glass': 'ae2:block/glass/quartz_glass_item',
  'createdelightcore:molten_quartz_vibrant_glass': 'ae2:block/quartz_vibrant_glass',
  'createdelightcore:egg_yolk': 'ratatouille:item/egg_yolk_bucket',
  'createdelightcore:vinegar': 'vintagedelight:item/vinegar_bottle',
}

function chooseIcon(fluid) {
  if (MANUAL[fluid] && textures.has(MANUAL[fluid])) return { icon: MANUAL[fluid], how: 'manual' }
  const [ns, p] = fluid.split(':')
  if (p.startsWith('molten_')) {
    const metal = p.slice('molten_'.length)
    for (const suffix of ['ingot', 'sheet', 'block']) {
      const hit = pick(`${metal}_${suffix}`) ?? (textures.has(`${ns}:item/${metal}_${suffix}`) ? `${ns}:item/${metal}_${suffix}` : null)
      if (hit) return { icon: hit, how: suffix }
    }
  }
  const stem = p.replace(/_still$/, '')
  for (const suffix of ['bucket', 'bottle', '']) {
    const name = suffix ? `${stem}_${suffix}` : stem
    const hit = pick(name) ?? (textures.has(`${ns}:item/${name}`) ? `${ns}:item/${name}` : null)
    if (hit) return { icon: hit, how: suffix || 'exact' }
  }
  return { icon: null, how: '未找到' }
}

/* ---------- 模型模板 ---------- */
const CELL_TEXTURE = 'extendedae:item/infinity_cell'
const BASE_ID = 'createdelightcore:item/infinity_cell_base'
const baseModel = {
  credit: '底层元件贴图 + 左下角代表物图标（icon 由子模型覆盖）',
  ambientocclusion: false,
  gui_light: 'front',
  textures: { particle: CELL_TEXTURE, cell: CELL_TEXTURE, icon: 'minecraft:item/water_bucket' },
  display: {
    // 注意：物品模型不要写 gui 变换 —— 那个 [30,225,0]/0.625 是「方块」在背包里的倾斜变换
    // （定义在 vanilla 的 block/block.json）。物品（item/generated）本身没有 gui 条目，
    // 不写就是平铺；写了会变成倾斜+缩小的「变形」样子。
    ground: { rotation: [0, 0, 0], translation: [0, 2, 0], scale: [0.5, 0.5, 0.5] },
    head: { rotation: [0, 180, 0], translation: [0, 13, 7], scale: [1, 1, 1] },
    thirdperson_righthand: { rotation: [0, 0, 0], translation: [0, 3, 1], scale: [0.55, 0.55, 0.55] },
    firstperson_righthand: { rotation: [0, -90, 25], translation: [1.13, 3.2, 1.13], scale: [0.68, 0.68, 0.68] },
    fixed: { rotation: [0, 180, 0], scale: [1, 1, 1] },
  },
  // 元件本体：满幅贴图（z 7.5~8.5，z-fighting 由图标元素避让）
  // 左下角图标：6×6，位于 x∈[1,7] y∈[1,7]（y 向上，所以小 y 是下方）
  elements: [
    {
      name: 'cell',
      from: [0, 0, 7.5],
      to: [16, 16, 8.5],
      faces: {
        north: { uv: [0, 0, 16, 16], texture: '#cell' },
        south: { uv: [0, 0, 16, 16], texture: '#cell' },
      },
    },
    {
      name: 'icon',
      from: [1, 1, 7.4],
      to: [7, 7, 8.6],
      faces: {
        north: { uv: [0, 0, 16, 16], texture: '#icon' },
        south: { uv: [0, 0, 16, 16], texture: '#icon' },
      },
    },
  ],
}

const results = []
for (const fluid of fluids) {
  const { icon, how } = chooseIcon(fluid)
  results.push({ fluid, cell: `createdelightcore:${fluid.replace(':', '_')}_cell`, icon, how })
}

/* water / 圆石（ExtendedAE 自带，包内给同路径覆盖模型） */
const extras = [
  { fluid: 'minecraft:water', model: 'extendedae:item/infinity_water_cell', icon: 'minecraft:item/water_bucket', how: 'manual' },
  { fluid: 'minecraft:cobblestone', model: 'extendedae:item/infinity_cobblestone_cell', icon: 'minecraft:item/cobblestone', how: 'manual' },
]

const unresolved = results.filter((r) => !r.icon)
const lines = ['# ME 无限元件图标映射', '', '| 元件 | 图标贴图 | 依据 |', '|---|---|---|']
for (const r of [...results, ...extras.map((e) => ({ cell: e.model.replace('item/', ''), icon: e.icon, how: e.how + '(ExtendedAE)' }))]) {
  lines.push(`| \`${r.cell}\` | \`${r.icon ?? '—'}\` | ${r.how} |`)
}
fs.writeFileSync('D:/git-MC/_dsh_tmp/infinity-cell-icons.md', `${lines.join('\n')}\n`)

console.log(`流体 ${fluids.length}；未解析 ${unresolved.length}`)
for (const u of unresolved) console.log(`  ✗ ${u.fluid}`)

if (!dryRun) {
  // base
  const basePath = path.join(ASSETS, 'models/item/infinity_cell_base.json')
  fs.mkdirSync(path.dirname(basePath), { recursive: true })
  fs.writeFileSync(basePath, `${JSON.stringify(baseModel, null, 2)}\n`)

  let written = 0
  for (const r of results) {
    if (!r.icon) continue
    const short = r.cell.split(':')[1]
    const file = path.join(ASSETS, 'models/item', `${short}.json`)
    fs.writeFileSync(file, `${JSON.stringify({ parent: BASE_ID, textures: { icon: r.icon } }, null, 2)}\n`)
    written += 1
  }
  // ExtendedAE 自带两个元件的覆盖模型
  for (const e of extras) {
    const file = path.join(REPO, 'kubejs/assets/extendedae/models/item', `${e.model.split('/').pop()}.json`)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, `${JSON.stringify({ parent: BASE_ID, textures: { icon: e.icon } }, null, 2)}\n`)
    written += 1
  }
  console.log(`已写 ${written} 个子模型 + 1 个 base（${path.relative(REPO, basePath)}）`)
} else {
  console.log('[dry-run] 未写文件')
}
