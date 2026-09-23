// 把迁入的 1.20.1 数据包配方改写成 1.21.1 的 JSON 形状。
//
// 背景：MC 1.20.5 起 ItemStack 的 JSON 从 `{"item": "x", "count": n}` 改成 `{"id": "x", "count": n}`，
// 配方结果、成就图标等用 ItemStack 的地方都受影响；Farmer's Delight 的 cutting 结果也从
// `[{"count":n,"item":"x"}]` 改成 `[{"item":{"count":n,"id":"x"},"chance":f}]`（见 mod jar 自带配方）。
// 这些文件随「旧路径迁移」批量恢复生效后，会在日志里报
// `Failed to parse recipe '<id>' ... Failed to read required component 'result: item_stack'`。
//
// 用法：
//   node scripts/fix-datapack-121-recipe-format.mjs --dry-run
//   node scripts/fix-datapack-121-recipe-format.mjs          # 就地改写，原件备份到 _dsh_tmp/datapack-recipe-format-bak/
import fs from 'node:fs'
import path from 'node:path'

const REPO = 'D:/git-MC/CDR1211'
const DATA = path.join(REPO, 'kubejs/data')
const BACKUP = 'D:/git-MC/_dsh_tmp/datapack-recipe-format-bak'
const dryRun = process.argv.includes('--dry-run')

/** 结果字段用 ItemStack 形状的配方类型（1.21 要 id） */
const STACK_RESULT_TYPES = new Set([
  'minecraft:crafting_shaped',
  'minecraft:crafting_shapeless',
  'minecraft:smelting',
  'minecraft:blasting',
  'minecraft:smoking',
  'minecraft:campfire_cooking',
  'minecraft:stonecutting',
  'minecraft:smithing_transform',
  'farmersdelight:cooking',
  'minecraft:crafting_special_*',
])

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? walk(p) : p.endsWith('.json') ? [p] : []
  })
}

/** `{"item":"x",...}` → `{"id":"x",...}`（就地改键名，保持其它字段） */
function stackItemToId(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false
  if (!('item' in obj) || 'id' in obj) return false
  if (typeof obj.item !== 'string') return false
  obj.id = obj.item
  delete obj.item
  return true
}

const stats = { files: 0, changed: 0, stackFix: 0, cuttingFix: 0, condFix: 0, failed: 0 }
const log = []

for (const file of walk(DATA)) {
  if (!/[\\/](recipe|advancement)[\\/]/.test(file)) continue
  stats.files += 1
  const rel = path.relative(REPO, file)
  let json
  const text = fs.readFileSync(file, 'utf8')
  try {
    json = JSON.parse(text)
  } catch (err) {
    stats.failed += 1
    log.push(`FAIL  ${rel}: JSON 解析失败（${err.message}）`)
    continue
  }

  let touched = false
  const type = json.type

  // R1：结果用 ItemStack 形状 → item 改 id
  if (STACK_RESULT_TYPES.has(type) || /^minecraft:crafting_special_/.test(type ?? '')) {
    if (stackItemToId(json.result)) {
      stats.stackFix += 1
      touched = true
    }
  }

  // R2：farmersdelight:cutting 的 result 数组
  if (type === 'farmersdelight:cutting' && Array.isArray(json.result)) {
    let local = 0
    json.result = json.result.map((entry) => {
      if (typeof entry === 'string') {
        local += 1
        return { item: { id: entry } }
      }
      if (entry && typeof entry === 'object' && 'item' in entry) {
        // 已经在正确形状里（item 是对象）就跳过
        if (typeof entry.item !== 'string') return entry
        const stack = { id: entry.item }
        if ('count' in entry) stack.count = entry.count
        const out = { item: stack }
        if ('chance' in entry) out.chance = entry.chance
        for (const [k, v] of Object.entries(entry)) {
          if (!['item', 'count', 'chance'].includes(k)) out[k] = v
        }
        local += 1
        return out
      }
      return entry
    })
    if (local) {
      stats.cuttingFix += local
      touched = true
    }
  }

  // R3：forge: 条件类型 → neoforge:
  if (Array.isArray(json.conditions)) {
    for (const c of json.conditions) {
      if (c && typeof c.type === 'string' && c.type.startsWith('forge:')) {
        c.type = `neoforge:${c.type.slice('forge:'.length)}`
        stats.condFix += 1
        touched = true
      }
    }
  }

  // R4：成就图标是 ItemStack（1.21 也要 id 而不是 item）
  if (json.display && typeof json.display === 'object' && stackItemToId(json.display.icon)) {
    stats.iconFix += 1
    touched = true
  }

  if (touched) {
    stats.changed += 1
    if (!dryRun) {
      const bak = path.join(BACKUP, rel)
      fs.mkdirSync(path.dirname(bak), { recursive: true })
      fs.writeFileSync(bak, text)
      fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`)
    }
    log.push(`${dryRun ? 'FIX ' : 'FIX '} ${rel}`)
  }
}

console.log(log.slice(0, 40).join('\n'))
if (log.length > 40) console.log(`…（其余 ${log.length - 40} 条见上表同类）`)
console.log(
  `\n${dryRun ? '[dry-run] ' : ''}扫描配方文件 ${stats.files}；改动 ${stats.changed}` +
    `（result.item→id ${stats.stackFix}、cutting 结果 ${stats.cuttingFix}、条件 ${stats.condFix}）；跳过/失败 ${stats.failed}` +
    (dryRun ? '' : `；原件备份在 ${BACKUP}`)
)
