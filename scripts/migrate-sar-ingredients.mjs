// 把 CDR1201 时代的 SAR "ingredient" 定义迁到 1.21 的形状与路径。
//
// 1.20.1：data/some_assembly_required/some_assembly_required/ingredients/<...>.json
//   { conditions:[{type:"forge:mod_loaded"}], container:{item}, displayItem:{item,nbt:{Color}},
//     item, soundEvent, fullName? }
// 1.21（jar 自带 74 个文件为准）：data/someassemblyrequired/someassemblyrequired/ingredients/<...>.json
//   { "neoforge:conditions":[{"type":"neoforge:mod_loaded"}], display_item:{count,id,components:{
//     "someassemblyrequired:spread_color":"#RRGGBB"}}, full_name?, item, sound }
//   —— 1.21 的 IngredientProperties 字段只有 item/food/display_name/full_name/display_item/sound/
//      height/render_as_item/hidden，没有 container，故丢弃。
//
// 用法：node scripts/migrate-sar-ingredients.mjs [--apply]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..')
const OLD = path.join(REPO, 'kubejs/data/someassemblyrequired/some_assembly_required/ingredients')
const NEW = path.join(REPO, 'kubejs/data/someassemblyrequired/someassemblyrequired/ingredients')
const APPLY = process.argv.includes('--apply')

const hex = (n) => '#' + (Number(n) & 0xffffff).toString(16).padStart(6, '0').toUpperCase()

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else if (e.name.endsWith('.json')) yield p
  }
}

const rows = []
for (const src of walk(OLD)) {
  const rel = path.relative(OLD, src).replaceAll('\\', '/')
  const j = JSON.parse(fs.readFileSync(src, 'utf8'))
  const out = {}

  const conds = (j.conditions ?? []).map((c) => ({ type: String(c.type).replace(/^forge:/, 'neoforge:'), modid: c.modid }))
  if (conds.length) out['neoforge:conditions'] = conds

  const di = j.displayItem ?? {}
  const nbt = di.nbt ?? {}
  const comps = {}
  if (typeof nbt.Color === 'number') comps['someassemblyrequired:spread_color'] = hex(nbt.Color)
  out.display_item = {
    count: 1,
    id: String(di.item ?? 'someassemblyrequired:spread').replace(/^some_assembly_required:/, 'someassemblyrequired:'),
    ...(Object.keys(comps).length ? { components: comps } : {}),
  }
  if (j.displayName) out.display_name = j.displayName
  if (j.fullName) out.full_name = j.fullName
  out.item = String(j.item)
    .replace(/^some_assembly_required:/, 'someassemblyrequired:')
    // fruitsdelight 1.21 把 *_jelly 改名成 *_jello（同 jar 的 sandwich_spouting 配方也是 _jello）
    .replace(/^(fruitsdelight:.*)_jelly$/, '$1_jello')
  out.sound = String(j.soundEvent ?? 'someassemblyrequired:block.sandwich.add_item.moist').replace(/^some_assembly_required:/, 'someassemblyrequired:')

  const dropped = Object.keys(j).filter((k) => !['conditions', 'displayItem', 'displayName', 'fullName', 'item', 'soundEvent'].includes(k))
  rows.push({ rel, dropped, out })
  if (APPLY) {
    const dst = path.join(NEW, rel)
    fs.mkdirSync(path.dirname(dst), { recursive: true })
    fs.writeFileSync(dst, JSON.stringify(out, null, 2) + '\n')
    fs.rmSync(src)
  }
}

// 清掉空的旧目录（含空的子目录）
if (APPLY) {
  const prune = (dir) => {
    if (!fs.existsSync(dir)) return
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory()) prune(path.join(dir, e.name))
    if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir)
  }
  prune(OLD)
}

console.log(`${APPLY ? '已迁移' : '干跑'}：${rows.length} 个 ingredient 文件 → ${path.relative(REPO, NEW).replaceAll('\\', '/')}`)
const droppedKeys = new Map()
for (const r of rows) for (const d of r.dropped) droppedKeys.set(d, (droppedKeys.get(d) ?? 0) + 1)
console.log('丢弃的旧字段：', [...droppedKeys].map(([k, n]) => `${k}×${n}`).join(', ') || '(无)')
console.log('样例：')
console.log(JSON.stringify(rows[0].out, null, 2))
