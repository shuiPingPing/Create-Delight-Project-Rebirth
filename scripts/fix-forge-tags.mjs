// 清理全包 `forge:*`（1.20.1 Forge 命名空间）引用：
//   · 配方/数据 JSON 里的 `"tag": "forge:X"` → 1.21 的对应标签（逐个用已装 jar 的标签文件核对过）
//   · server_scripts 里 `event.add('forge:X', …)` 这类"额外往 forge 命名空间塞东西"的写法 → 删掉
//     （1.21 没有任何 mod 读 forge: 标签；同一个调用里已有的 `c:` 版本保留）
//   · `forge:reach_distance` / `forge:attack_range`（tetra long_handle）**保留**：Tetra 1.21.1 自带的
//     同名模块也是这么写的，属 mod 侧遗留，不是我们的问题
//   · youkaishomecoming/tags.js 的 `addCommonAndForge` 是通过模板串拼 forge: 标签的，脚本规则覆盖不到，
//     已手工改成只加 `c:`（函数名保留，调用点不动）
//
// 用法：node scripts/fix-forge-tags.mjs [--apply]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..')
const APPLY = process.argv.includes('--apply')

// forge:X → 1.21 目标（每个目标都确认过：文件存在且有内容）
const REMAP = new Map([
  ['forge:milk', 'c:foods/milk'], // yhc: farmersdelight:milk_bottle + minecraft:milk_bucket
  ['forge:mushrooms', 'c:mushrooms'], // collectorsreap 定义（另在本包 tags.js 里补入原版两种蘑菇）
  ['forge:eggs', 'c:foods/eggs'], // yhc: minecraft:egg
  ['forge:grain/rice', 'c:crops/rice'], // FD: farmersdelight:rice（MyNethersDelight 再加 ghasmati）
  ['forge:pasta/raw_pasta', 'c:foods/pasta'], // FD: farmersdelight:raw_pasta
  ['forge:vegetables/tomato', 'c:crops/tomato'], // FD + bakeries
  ['forge:fruits/orange', 'c:foods/fruits/orange'], // fruitsdelight: orange
  ['forge:offal/raw', 'c:offal/raw'], // butchercraft
  ['forge:spring/below_500', 'vintageimprovements:small_springs'], // 弹簧按"小/普通"对应原来的力度分档
  ['forge:spring/between_500_2_1000', 'vintageimprovements:springs'],
])

// 这些文件里的 forge: 一律删掉（都是往 forge 命名空间重复塞物品的写法）
const STRIP_JS = [
  'kubejs/server_scripts/mods/farmersdelight/tags.js',
  'kubejs/server_scripts/mods/vinery/tags.js',
]
const KEEP = new Set(['kubejs/data/tetra/modules/single/long_handle.json'])

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else if (/\.(json|js)$/.test(e.name)) yield p
  }
}

const report = []
let changed = 0
let replaced = 0
let stripped = 0

for (const abs of walk(path.join(REPO, 'kubejs'))) {
  const rel = path.relative(REPO, abs).replaceAll('\\', '/')
  if (KEEP.has(rel)) continue
  let text = fs.readFileSync(abs, 'utf8')
  const before = text
  const notes = []

  if (STRIP_JS.includes(rel)) {
    // 顺序很重要：
    // 1) 先整行删掉 `event.add('forge:…', …)` / `event.remove('forge:…', …)` 这类调用
    //    （同一批 addTags 里已经有对应的 `c:` 版本，forge 那条是纯冗余）
    text = text.replace(/^\s*event\.(add|remove)\('forge:[^']*'[^\n]*\n/gm, () => (stripped++, ''))
    // 2) 数组里的行内项：`'a', 'forge:x'`（后置）与 `'forge:x', 'b'`（前置）
    text = text.replace(/,\s*'forge:[^']*'/g, () => (stripped++, ''))
    text = text.replace(/'forge:[^']*'\s*,\s*/g, () => (stripped++, ''))
    // 3) 独占一行的数组项
    text = text.replace(/^\s*'forge:[^']*',?\s*\n/gm, () => (stripped++, ''))
  } else {
    for (const [from, to] of REMAP) {
      // 只替换字符串里的标签 id（JSON `"tag": "forge:x"` / JS `'#forge:x'`）
      const re = new RegExp(`(['"]#?)${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(['"])`, 'g')
      text = text.replace(re, (_m, p1, p2) => {
        replaced++
        return `${p1}${to}${p2}`
      })
    }
  }

  // 注意：不要做"合并连续逗号"之类的收尾清理 —— `([, items])` 这种解构里的空位会被误伤。
  // 上面的删除规则本身已保证逗号正确（JS 也允许尾随逗号）。规则顺序也不能调换：先整行删 event.add/remove，
  // 剩下的 `'forge:x',` 才一定是数组元素；否则 `event.add('forge:x', items)` 会被削成 `event.add(items)`。
  if (text !== before) {
    changed++
    const left = [...text.matchAll(/(?<!neo)forge:[a-z0-9_/]+/g)].map((m) => m[0])
    notes.push(...new Set(left))
    report.push({ rel, left: [...new Set(left)] })
    if (APPLY) fs.writeFileSync(abs, text, 'utf8')
  }
}

console.log(`${APPLY ? '已应用' : '干跑'}：改动 ${changed} 个文件，标签改写 ${replaced} 处，删除 forge 条目 ${stripped} 处`)
if (report.length) {
  console.log('\n涉及文件：')
  for (const r of report.sort((a, b) => a.rel.localeCompare(b.rel))) {
    console.log(`  ${r.rel}${r.left.length ? '   仍残留: ' + r.left.join(', ') : ''}`)
  }
}
