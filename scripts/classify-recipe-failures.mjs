// 分类日志里的配方失败：KubeJS 回退到原版加载器（= 配方仍生效，只是 KubeJS 建模失败）vs 真正的解析失败
import fs from 'node:fs'
const log = process.argv[2] ?? 'D:/git-MC/CDR1211/logs/latest.log'
const text = fs.readFileSync(log, 'utf8')
const warn = []
const hard = []
for (const line of text.split('\n')) {
  const m = /Failed to parse recipe '([^'\[]+)\[([^\]]+)\]'!(.*)$/.exec(line)
  if (!m) continue
  const rec = { id: m[1], type: m[2], msg: m[3].trim() }
  if (/Falling back to vanilla/.test(line)) warn.push(rec)
  else hard.push(rec)
}
const byNs = (arr) => {
  const o = {}
  for (const r of arr) o[r.id.split(':')[0]] = (o[r.id.split(':')[0]] ?? 0) + 1
  return Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' ')
}
console.log(`KubeJS 回退（配方仍生效）: ${warn.length}`)
console.log(`  按命名空间: ${byNs(warn)}`)
console.log(`真正的解析失败: ${hard.length}`)
if (hard.length) {
  console.log(`  按命名空间: ${byNs(hard)}`)
  for (const r of hard.slice(0, 20)) console.log(`   ✗ ${r.id} [${r.type}] ${r.msg.slice(0, 120)}`)
}