// 补完 tipsmod 的 tip 文件 schema 迁移。
//
// 背景：1.20.1 的写法是 `{"tip": {"translate": "..."}}`，1.21 的 tipsmod（21.1.3）要求
// `{"type": "tipsmod:simple", "text": {"translate": "..."}}`（schema 见 mod jar 自带
// `assets/tipsmod/tips/*.json` 与 `TipsAPI.TIP_CODEC`）。包内 51 个 tip 里只有 4 个是新格式，
// 其余仍是被解析失败丢弃的旧格式 —— 日志里有 47 条 `Failed to load tip createdelightcore:<name>`。
//
// 用法：
//   node scripts/fix-tips-schema.mjs --dry-run
//   node scripts/fix-tips-schema.mjs            # 就地改写，原件备份到 D:/git-MC/_dsh_tmp/tips-bak/
import fs from 'node:fs'
import path from 'node:path'

const REPO = 'D:/git-MC/CDR1211'
const TIPS_DIR = path.join(REPO, 'kubejs/assets/createdelightcore/tips')
const BACKUP = 'D:/git-MC/_dsh_tmp/tips-bak'
const dryRun = process.argv.includes('--dry-run')

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? walk(p) : p.endsWith('.json') ? [p] : []
  })
}

const files = walk(TIPS_DIR)
let converted = 0
let already = 0
const keyOwners = new Map()
const warnings = []

for (const file of files) {
  const rel = path.relative(TIPS_DIR, file)
  const text = fs.readFileSync(file, 'utf8')
  let json
  try {
    json = JSON.parse(text)
  } catch (err) {
    warnings.push(`${rel}: JSON 解析失败（${err.message}）`)
    continue
  }

  const body = json.text ?? json.tip
  const translate = body?.translate
  if (translate) {
    const owners = keyOwners.get(translate) ?? []
    owners.push(rel)
    keyOwners.set(translate, owners)
  }

  // 已是 1.21 格式（有 type + text）→ 跳过
  if (json.type === 'tipsmod:simple' && json.text) {
    already += 1
    continue
  }
  if (!json.tip) {
    warnings.push(`${rel}: 既没有 type/text 也没有 tip 字段，跳过`)
    continue
  }

  const fixed = { type: 'tipsmod:simple', text: json.tip }
  if (dryRun) {
    console.log(`[dry-run] ${rel}: 将改写为 ${JSON.stringify(fixed)}`)
  } else {
    const dst = path.join(BACKUP, rel)
    fs.mkdirSync(path.dirname(dst), { recursive: true })
    fs.writeFileSync(dst, text)
    fs.writeFileSync(file, `${JSON.stringify(fixed, null, 2)}\n`)
  }
  converted += 1
}

console.log(`tip 文件总数: ${files.length}；已是新格式: ${already}；本次改写: ${converted}${dryRun ? '（dry-run）' : ''}`)
console.log(`备份目录: ${dryRun ? '(未写)' : BACKUP}`)

// 同一个 translate 键被多个 tip 文件引用 = 旧命名空间遗留的重复条目
for (const [key, owners] of keyOwners) {
  if (owners.length > 1) console.log(`⚠ 重复键 ${key} 被 ${owners.length} 个文件引用: ${owners.join(', ')}`)
}
for (const w of warnings) console.log(`⚠ ${w}`)
