// 按结构尺寸给 ponder 场景配好镜头参数（一次性对齐 Create 的写法）。
//
// Create 的实际用法（读 create-1.21.1 jar 的 ponder scenes 字节码得到）：
//   scene.configureBasePlate(x, y, size);   // 底板尺寸 = 结构占地（5/6/7/12…）
//   scene.scaleSceneView(f);                // 缩放：6 宽用 0.9，12 宽用 0.65
//   scene.setSceneOffsetY(-1);              // 个子高的结构要往下压
//   scene.showBasePlate();
// 由此拟合：scale = clamp(0.9 - 0.0417*(span-6), 0.5, 0.95)，span = max(x, z, y*0.8)；y>6 时 offset 约 -(y-6)/4。
//
// 本脚本对 kubejs/client_scripts/ponder/scene/**/*.js 里每个 `let scene = …` 之后的"开场区"做统一处理：
//   - 删掉原有的 configureBasePlate / scaleSceneView / setSceneOffsetY / showBasePlate（它们要么缺失、要么重复调用互相覆盖）；
//   - 按结构 nbt 的真实尺寸插入一组正确参数（带 [ponder-camera] 标记，可重复执行）。
//
// 用法：
//   node scripts/fit-ponder-camera.mjs --dry-run
//   node scripts/fit-ponder-camera.mjs
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const REPO = 'D:/git-MC/CDR1211'
const SCENE_DIR = path.join(REPO, 'kubejs/client_scripts/ponder/scene')
const NBT_DIR = path.join(REPO, 'kubejs/assets/createdelightcore/ponder')
const dryRun = process.argv.includes('--dry-run')
const MARK = '[ponder-camera]'

/* ---------- 读结构 nbt 的 size ---------- */
function readNbtSize(file) {
  const buf = zlib.gunzipSync(fs.readFileSync(file))
  let p = 3
  const readName = () => {
    const len = buf.readUInt16BE(p)
    p += 2
    const name = buf.toString('utf8', p, p + len)
    p += len
    return name
  }
  const skip = (tag) => {
    switch (tag) {
      case 1: p += 1; break
      case 2: p += 2; break
      case 3: p += 4; break
      case 4: p += 8; break
      case 5: p += 4; break
      case 6: p += 8; break
      case 7: { const n = buf.readInt32BE(p); p += 4 + n; break }
      case 8: { const n = buf.readUInt16BE(p); p += 2 + n; break }
      case 11: { const n = buf.readInt32BE(p); p += 4 + n * 4; break }
      case 12: { const n = buf.readInt32BE(p); p += 4 + n * 8; break }
      default: throw new Error(`未知 tag ${tag}`)
    }
  }
  while (p < buf.length) {
    const tag = buf[p]
    p += 1
    if (tag === 0) break
    const name = readName()
    if (tag === 9 && name === 'size') {
      p += 1 // item type
      const count = buf.readInt32BE(p)
      p += 4
      const vals = []
      for (let i = 0; i < count; i++) {
        vals.push(buf.readInt32BE(p))
        p += 4
      }
      return vals
    }
    skip(tag)
  }
  return null
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []
  })
}

const report = []
let changedFiles = 0
for (const file of walk(SCENE_DIR)) {
  const src = fs.readFileSync(file, 'utf8')
  const lines = src.split('\n')
  const out = []
  let touched = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    out.push(line)
    if (!/^\s*let scene\s*=\s*new\s/.test(line)) continue

    // 往回找结构 id：取 .scene(...) 参数里"能在 ponder/ 目录找到同名 nbt"的那个字符串
    let structId = null
    let nbtPath = null
    for (let j = i - 1; j >= Math.max(0, i - 30); j--) {
      for (const m of lines[j].matchAll(/['"]([a-z0-9_]+:([a-z0-9_/]+))['"]/gi)) {
        const cand = path.join(NBT_DIR, `${m[2]}.nbt`)
        if (fs.existsSync(cand)) {
          structId = m[1]
          nbtPath = cand
          break
        }
      }
      if (structId) break
    }
    // 吃掉紧跟其后的"开场区"（相机调用 / idle / 空行 / 注释 / 上一轮的标记块）
    let k = i + 1
    const keep = []
    const cameraLines = []
    while (k < lines.length) {
      const l = lines[k]
      if (/^\s*$/.test(l) || /^\s*\/\//.test(l)) {
        k += 1
        continue
      }
      if (/scene\.(configureBasePlate|scaleSceneView|setSceneOffsetY|showBasePlate)\(/.test(l)) {
        cameraLines.push(l)
        k += 1
        continue
      }
      if (/^\s*scene\.idle(Seconds)?\(/.test(l)) {
        keep.push(l)
        k += 1
        continue
      }
      break
    }
    // 跳过时原样放回（别把人家自己的 configureBasePlate/showBasePlate 删了）
    const restore = () => {
      out.push(...cameraLines, ...keep)
      i = k - 1
    }

    if (!structId) {
      report.push(`  ${path.relative(SCENE_DIR, file)}: 第 ${i + 1} 行场景没有结构 nbt（纯代码搭建），保持原样`)
      restore()
      continue
    }
    const nbt = nbtPath
    if (!nbt || !fs.existsSync(nbt)) {
      report.push(`  ${path.relative(SCENE_DIR, file)}: 结构 ${structId} 没有对应 nbt，保持原样`)
      restore()
      continue
    }
    const [x, y, z] = readNbtSize(nbt)
    const size = Math.max(x, z)
    const span = Math.max(x, z, y * 0.8)
    const scale = Number(clamp(0.9 - 0.0417 * (span - 6), 0.5, 0.95).toFixed(3))
    const offset = -Math.max(0, Math.round((y - 6) / 4))

    const indent = (line.match(/^\s*/) ?? [''])[0]
    const block = [
      `${indent}// ${MARK} 按结构尺寸适配（${x}x${y}x${z}，参考 Create 的 configureBasePlate/scaleSceneView/setSceneOffsetY 用法）`,
      `${indent}scene.configureBasePlate(0, 0, ${size});`,
      `${indent}scene.scaleSceneView(${scale});`,
      ...(offset !== 0 ? [`${indent}scene.setSceneOffsetY(${offset});`] : []),
      `${indent}scene.showBasePlate();`,
    ]
    out.push(...block, ...keep)
    report.push(`  ${path.relative(SCENE_DIR, file)}: ${structId} ${x}x${y}x${z} → 底板 ${size} / scale ${scale}${offset ? ` / offsetY ${offset}` : ''}`)
    touched = true
    i = k - 1
  }

  if (touched) {
    changedFiles += 1
    if (!dryRun) fs.writeFileSync(file, out.join('\n'))
  }
}

console.log(report.join('\n'))
console.log(`\n${dryRun ? '[dry-run] ' : ''}涉及文件 ${changedFiles} 个`)
