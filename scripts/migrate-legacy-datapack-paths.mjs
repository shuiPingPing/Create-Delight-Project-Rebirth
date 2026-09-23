// 按审计报告的表执行旧数据包路径迁移（1.20.1 复数目录 → 1.21.1 单数目录）。
//
// 计划来源：`D:/git-MC/_dsh_tmp/legacy-datapack-audit.md` 的表格（由 scripts/audit-legacy-datapack-paths.mjs 生成）。
//   §3.1 第 2b 类真实内容覆盖 → 非 nbt 改名（恢复覆盖意图）；nbt 是 1.20.1 旧快照 → 删包内那份
//   §3.2 第 2b 类禁用存根     → 改名（恢复禁用意图）
//   §4.1 第 3 类真实缺口      → 改名（新增内容）
//   §4.2 第 3 类禁用存根      → 改名
//
// 用法：
//   node scripts/migrate-legacy-datapack-paths.mjs --only 2b-real --dry-run
//   node scripts/migrate-legacy-datapack-paths.mjs --only 2b-real
//   node scripts/migrate-legacy-datapack-paths.mjs --only 2b-stub,3-real,3-stub
//
// 删除的文件会先复制到 D:/git-MC/_dsh_tmp/legacy-datapack-bak/ 下（同样的相对路径）。
import fs from 'node:fs'
import path from 'node:path'

const REPO = 'D:/git-MC/CDR1211'
const REPORT = 'D:/git-MC/_dsh_tmp/legacy-datapack-audit.md'
const BACKUP = 'D:/git-MC/_dsh_tmp/legacy-datapack-bak'

const argv = process.argv.slice(2)
const dryRun = argv.includes('--dry-run')
const onlyArg = argv[argv.indexOf('--only') + 1]
const only = !onlyArg || onlyArg.startsWith('--') ? null : new Set(onlyArg.split(','))

const text = fs.readFileSync(REPORT, 'utf8')
const lines = text.split('\n')

/** 解析 `### <标题>` 之后的第一个 markdown 表格，返回每行的单元格数组 */
function parseTable(sectionTitle) {
  const start = lines.findIndex((l) => l.startsWith('### ') && l.includes(sectionTitle))
  if (start < 0) throw new Error(`找不到小节：${sectionTitle}`)
  const rows = []
  let inTable = false
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i]
    if (l.startsWith('### ') || l.startsWith('## ')) break
    if (!l.startsWith('|')) {
      if (inTable && rows.length) break
      continue
    }
    if (/^\|[\s|-]+\|$/.test(l)) continue // 分隔行
    const cells = l.split('|').slice(1, -1).map((c) => c.trim())
    if (cells[0] === '#' || cells[0].includes('旧路径')) {
      inTable = true
      continue
    }
    if (inTable) rows.push(cells)
  }
  return rows
}

const backtickPath = (s) => {
  const m = /`([^`]+)`/.exec(s ?? '')
  return m ? m[1] : null
}

/** 从一行里取「旧路径（包内）」和「目标单数路径」 */
function planRow(cells) {
  const src = backtickPath(cells[1])
  const targetCell = cells.find((c, i) => i > 1 && /`(kubejs\/)?data\//.test(c))
  let target = backtickPath(targetCell)
  if (target && !target.startsWith('kubejs/')) target = `kubejs/${target}`
  return { src, target, intent: cells[4] ?? '' }
}

const batches = {
  '2b-real': { section: '3.1', mode: 'mixed' },
  '2b-stub': { section: '3.2', mode: 'move' },
  '3-real': { section: '4.1', mode: 'move' },
  '3-stub': { section: '4.2', mode: 'move' },
}

const stats = { move: 0, delete: 0, skip: 0 }
const log = []

for (const [name, cfg] of Object.entries(batches)) {
  if (only && !only.has(name)) continue
  const rows = parseTable(cfg.section)
  for (const cells of rows) {
    const { src, target, intent } = planRow(cells)
    if (!src) {
      stats.skip += 1
      log.push(`SKIP  无法解析行: ${cells.join(' | ')}`)
      continue
    }
    const absSrc = path.join(REPO, src)
    if (!fs.existsSync(absSrc)) {
      stats.skip += 1
      log.push(`SKIP  源不存在（可能已处理）: ${src}`)
      continue
    }
    // §3.1 的 .nbt 是 1.20.1 旧快照 → 删包内那份，保留 mod 版本
    const isNbtSnapshot = cfg.mode === 'mixed' && (intent.includes('nbt') || src.endsWith('.nbt'))
    if (isNbtSnapshot) {
      if (dryRun) {
        log.push(`DEL   ${src}（nbt 旧快照，保留 mod 版本）`)
      } else {
        const bak = path.join(BACKUP, src)
        fs.mkdirSync(path.dirname(bak), { recursive: true })
        fs.copyFileSync(absSrc, bak)
        fs.unlinkSync(absSrc)
        log.push(`DEL   ${src}`)
      }
      stats.delete += 1
      continue
    }
    if (!target) {
      stats.skip += 1
      log.push(`SKIP  没有目标路径: ${src}`)
      continue
    }
    if (fs.existsSync(path.join(REPO, target))) {
      stats.skip += 1
      log.push(`SKIP  目标已存在（人工确认）: ${target}`)
      continue
    }
    if (dryRun) {
      log.push(`MOVE  ${src}\n   -> ${target}`)
    } else {
      fs.mkdirSync(path.dirname(path.join(REPO, target)), { recursive: true })
      fs.renameSync(absSrc, path.join(REPO, target))
      log.push(`MOVE  ${src}\n   -> ${target}`)
    }
    stats.move += 1
  }
}

console.log(log.join('\n'))
console.log(
  `\n${dryRun ? '[dry-run] ' : ''}改名 ${stats.move}；删除 ${stats.delete}；跳过 ${stats.skip}` +
    (dryRun ? '' : `；删除备份在 ${BACKUP}`)
)
