// 给 Ponder 场景按结构尺寸设置镜头缩放（scene.scaleSceneView），让大结构能看全。
//
// 背景：Create 的 Ponder 默认按底板/结构水平范围取景，结构越大（尤其高）越容易出画。
// 该 mod 自己的场景用 scaleSceneView(0.85~0.95) 这类值微调；本包的自定义机器结构大得多
// （屠宰室 9×6×9、裂变堆 13×10×13、水电站 16×15×16、AE2 控制器 9×18×9），需要更小的系数。
//
// 规则（按结构 x/y/z 取"有效跨度"再折算）：
//   span = max(x, z, y * 0.8)
//   f    = clamp(7.5 / span, 0.45, 1.0)      // ≥0.999 时不插入，保持默认
//
// 用法：
//   node scripts/tune-ponder-camera.mjs --dry-run
//   node scripts/tune-ponder-camera.mjs
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const SCENES = 'D:/git-MC/CDR1211/kubejs/client_scripts/ponder'
const ASSETS = 'D:/git-MC/CDR1211/kubejs/assets'
const dryRun = process.argv.includes('--dry-run')

/* ---- 读取结构尺寸（顶层 size） ---- */
function structureSize(structureId) {
  const [ns, name] = structureId.split(':')
  const f = path.join(ASSETS, ns, 'ponder', name + '.nbt')
  if (!fs.existsSync(f)) return null
  const raw = fs.readFileSync(f)
  let buf
  try { buf = zlib.gunzipSync(raw) } catch { buf = raw }
  const i = buf.indexOf(Buffer.from('size', 'utf8'))
  if (i < 0) return null
  const p = i + 4
  if (buf[p] !== 3) return null
  const n = buf.readInt32BE(p + 1)
  if (n !== 3) return null
  return [buf.readInt32BE(p + 5), buf.readInt32BE(p + 9), buf.readInt32BE(p + 13)]
}
function factorFor(size) {
  if (!size) return 1
  const span = Math.max(size[0], size[2], size[1] * 0.8)
  const f = 7.5 / span
  return Math.min(1, Math.max(0.45, Number(f.toFixed(3))))
}

function walk(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else if (e.name.endsWith('.js')) out.push(p)
  }
  return out
}

let touched = 0
let inserted = 0
for (const file of walk(SCENES)) {
  const text = fs.readFileSync(file, 'utf8')
  const lines = text.split('\n')
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  // 先找出每个 .scene(...) 的位置 → 结构 id（可能跨行）
  const sceneRe = /\.scene\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]*)['"]\s*,\s*(?:['"]([^'"]+)['"]\s*,\s*)?\(/gs
  const sceneStarts = []
  let m
  while ((m = sceneRe.exec(text)) !== null) {
    const lineNo = text.slice(0, m.index).split('\n').length - 1
    sceneStarts.push({ line: lineNo, id: m[1], structure: m[3] ?? null })
  }
  if (!sceneStarts.length) continue

  const out = []
  let cur = null
  let idx = 0
  for (let i = 0; i < lines.length; i++) {
    while (idx < sceneStarts.length && sceneStarts[idx].line <= i) { cur = sceneStarts[idx]; idx++ }
    out.push(lines[i])
    if (/let scene = new CDClientJavaClasses\.\$CreateSceneBuilder\(builder\)/.test(lines[i])) {
      const f = factorFor(cur?.structure ? structureSize(cur.structure) : null)
      if (f < 0.999 && !/scaleSceneView/.test(lines[i + 1] ?? '')) {
        const indent = (lines[i].match(/^\s*/) ?? [''])[0]
        out.push(`${indent}scene.scaleSceneView(${f});`)
        inserted++
        if (dryRun || inserted <= 8) {
          console.log(`  ${file.replace(SCENES + '/', '')}  ${cur?.id ?? '?'}  结构=${cur?.structure ?? '默认'}  →  scaleSceneView(${f})`)
        }
      }
    }
  }
  if (inserted > 0 && out.join('\n') !== text) {
    touched++
    if (!dryRun) {
      fs.copyFileSync(file, `${file}.bak`)
      fs.writeFileSync(file, out.join(eol), 'utf8')
    }
  }
}
console.log(`\n处理文件 ${touched} 个，插入 scaleSceneView ${inserted} 处`)
if (dryRun) console.log('（dry-run，未写文件）')
else console.log('已写回（同目录留 .bak）')
