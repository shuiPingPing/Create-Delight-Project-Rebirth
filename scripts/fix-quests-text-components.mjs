// 修复任务书文本里「1.20.1 宽松 JSON 组件」在 1.21 严格 codec 下解析失败的问题。
//
// 背景（对应 FTB Quests 2101 的 dev.ftb.mods.ftbquests.util.TextUtils#parseRawText）：
//   trim 后若以 { 开头且以 } 结尾 → 先按 JSON 组件解析；解析抛 JsonParseException 时，
//   回落到 ClientTextComponentUtils.parse（{…} 标记解析器）→ 只要字符串里有嵌套花括号，
//   就抛 "Invalid formatting! Can't nest multiple substitutes!"，界面显示红字。
//   1.20.1 时代作者写的 "underlined": "true"（字符串）在 1.21 的 codec 里不是合法布尔 → 解析失败。
//
// 本脚本把这类 JSON 组件里的「字符串布尔」等宽松写法规范化为 1.21 能接受的严格形式，
// 从而重新走通 JSON 分支（保留可点击跳转等语义）。
//
// 用法：
//   node scripts/fix-quests-text-components.mjs --dry-run     # 只报告
//   node scripts/fix-quests-text-components.mjs               # 就地写回（自动备份 .bak）
import fs from 'node:fs'
import path from 'node:path'

const STYLE_BOOL_KEYS = ['bold', 'italic', 'underlined', 'strikethrough', 'obfuscated']
const KNOWN_ACTIONS = new Set([
  'open_url', 'open_file', 'run_command', 'suggest_command', 'show_text',
  'show_item', 'show_entity', 'copy_to_clipboard', 'change_page',
])

function unescapeSnbt(s) {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '\\' && i + 1 < s.length) {
      const n = s[++i]
      if (n === 'n') out += '\n'
      else if (n === 't') out += '\t'
      else out += n
    } else out += c
  }
  return out
}
const escapeSnbt = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

/** 递归检查/规范化一个组件 JSON 对象；返回 { changed, problems, json } */
function normalizeComponent(node, trail = '$') {
  const problems = []
  let changed = false
  if (Array.isArray(node)) {
    node.forEach((v, i) => {
      const r = normalizeComponent(v, `${trail}[${i}]`)
      problems.push(...r.problems); changed = changed || r.changed
    })
    return { changed, problems, json: node }
  }
  if (node === null || typeof node !== 'object') return { changed, problems, json: node }

  for (const key of STYLE_BOOL_KEYS) {
    if (key in node) {
      if (typeof node[key] === 'string' && /^(true|false)$/i.test(node[key])) {
        node[key] = node[key].toLowerCase() === 'true'
        changed = true
        problems.push(`${trail}.${key}: 字符串布尔 "${node[key]}" → 布尔`)
      } else if (typeof node[key] !== 'boolean') {
        problems.push(`${trail}.${key}: 类型不是布尔（${typeof node[key]}）`)
      }
    }
  }
  if ('color' in node && typeof node.color !== 'string') problems.push(`${trail}.color: 不是字符串`)
  if ('text' in node && typeof node.text !== 'string') problems.push(`${trail}.text: 不是字符串`)
  if ('translate' in node && typeof node.translate !== 'string') problems.push(`${trail}.translate: 不是字符串`)
  if ('extra' in node) {
    if (!Array.isArray(node.extra)) problems.push(`${trail}.extra: 不是数组`)
    else {
      const r = normalizeComponent(node.extra, `${trail}.extra`)
      problems.push(...r.problems); changed = changed || r.changed
    }
  }
  for (const evt of ['clickEvent', 'hoverEvent']) {
    if (evt in node) {
      const e = node[evt]
      if (e === null || typeof e !== 'object') problems.push(`${trail}.${evt}: 不是对象`)
      else {
        if (typeof e.action !== 'string' || !KNOWN_ACTIONS.has(e.action)) {
          problems.push(`${trail}.${evt}.action: 未知动作 ${JSON.stringify(e.action)}`)
        }
        const val = e.value ?? e.contents
        if (typeof val !== 'string') problems.push(`${trail}.${evt}.value: 缺失或不是字符串`)
      }
    }
  }
  return { changed, problems, json: node }
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const file = args.find((a) => !a.startsWith('--'))
  ?? 'D:/git-MC/CDR1211/config/ftbquests/quests/lang/en_us.snbt'

const raw = fs.readFileSync(file, 'utf8')
const eol = raw.includes('\r\n') ? '\r\n' : '\n'
const lines = raw.split(/\r?\n/)

let candidates = 0, jsonOk = 0, notJson = 0, fixed = 0
const fixedLog = [], remaining = []

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  const m = line.match(/^(\s*)(?:([^"\s][^:]*):\s*)?"(.*)"(\s*)$/)
  if (!m) continue
  const value = unescapeSnbt(m[3])
  const s = value.trim()
  if (!(s.startsWith('{') && s.endsWith('}'))) continue
  candidates++

  let parsed
  try { parsed = JSON.parse(s) } catch { notJson++; continue }   // {…} 标记（@pagebreak / image:…）走这里，属正常回落
  jsonOk++

  const { changed, problems } = normalizeComponent(parsed)
  const hasNestedBrace = /\{[^{}]*\{/.test(s)
  if (problems.length === 0 && !changed) continue

  if (changed) {
    const newValue = JSON.stringify(parsed)
    lines[i] = `${m[1]}${m[2] ? m[2] + ': ' : ''}"${escapeSnbt(newValue)}"${m[4]}`
    fixed++
    if (fixedLog.length < 10) fixedLog.push({ line: i + 1, key: (m[2] ?? '(数组元素)').trim(), problems })
  } else {
    remaining.push({ line: i + 1, key: (m[2] ?? '(数组元素)').trim(), problems, nested: hasNestedBrace })
  }
}

console.log(`文件: ${file}`)
console.log(`以 { 开头且以 } 结尾的字符串值: ${candidates}`)
console.log(`  非 JSON（{@pagebreak} / {image:…} 等合法标记，靠回落分支）: ${notJson}`)
console.log(`  合法 JSON: ${jsonOk}`)
console.log(`  已规范化（字符串布尔等）: ${fixed}`)
console.log(`  仍有问题（需人工看）: ${remaining.length}`)

if (fixedLog.length) {
  console.log('\n--- 规范化样例 ---')
  for (const f of fixedLog) console.log(`  行${f.line}  ${f.key}\n    ${f.problems.join('\n    ')}`)
}
if (remaining.length) {
  console.log('\n--- 仍需人工处理 ---')
  for (const r of remaining.slice(0, 15)) {
    console.log(`  行${r.line}  ${r.key}  嵌套花括号=${r.nested}\n    ${r.problems.join('\n    ')}`)
  }
}

if (!dryRun && fixed > 0) {
  fs.copyFileSync(file, `${file}.bak`)
  fs.writeFileSync(file, lines.join(eol), 'utf8')
  console.log(`\n已写回（备份 ${path.basename(file)}.bak）`)
} else if (dryRun) {
  console.log('\n（dry-run，未写文件）')
}
