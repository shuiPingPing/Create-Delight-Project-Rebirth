// 统计"当前实例里真实存在的命名空间"：扫描 mods/*.jar 与 mods/*/*.jar 的 zip 条目名，
// 取 data/<ns>/ 与 assets/<ns>/ 前缀。只读中央目录，不读内容，结果缓存到 _dsh_tmp/ns-index.json。
import fs from 'node:fs'
import path from 'node:path'

// 这几个命名空间即使没有 jar 也当存在：原版 + 通用标签 + KubeJS 自定义命名空间
export const OURS = new Set([
  'minecraft',
  'kubejs',
  'createdelightcore',
  'c',
  'forge',
  'neoforge',
  'fabric',
  'trinkets',
  'curios',
])

export function listJars(repo) {
  const out = []
  const mods = path.join(repo, 'mods')
  if (!fs.existsSync(mods)) return out
  for (const d of fs.readdirSync(mods, { withFileTypes: true })) {
    if (d.isFile() && d.name.endsWith('.jar')) out.push(path.join(mods, d.name))
    else if (d.isDirectory()) {
      const sub = path.join(mods, d.name)
      for (const f of fs.readdirSync(sub)) if (f.endsWith('.jar')) out.push(path.join(sub, f))
    }
  }
  const vjar = path.join(repo, 'versions', '1.21.1', '1.21.1.jar')
  if (fs.existsSync(vjar)) out.push(vjar)
  return out
}

// 极简 zip 中央目录扫描：只取条目名
export function zipEntryNames(file) {
  const buf = fs.readFileSync(file)
  const names = []
  let i = buf.length - 22
  while (i >= 0 && buf.readUInt32LE(i) !== 0x06054b50) i--
  if (i < 0) throw new Error('no EOCD')
  const count = buf.readUInt16LE(i + 10)
  let off = buf.readUInt32LE(i + 16)
  for (let n = 0; n < count && off + 46 <= buf.length; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) break
    const nameLen = buf.readUInt16LE(off + 28)
    const extraLen = buf.readUInt16LE(off + 30)
    const cmtLen = buf.readUInt16LE(off + 32)
    names.push(buf.toString('utf8', off + 46, off + 46 + nameLen))
    off += 46 + nameLen + extraLen + cmtLen
  }
  return names
}

export function buildNamespaceIndex(repo, { log = () => {} } = {}) {
  const ns = new Set()
  const jars = listJars(repo)
  let done = 0
  for (const jar of jars) {
    let names
    try {
      names = zipEntryNames(jar)
    } catch (e) {
      log(`!! ${path.basename(jar)}: ${e.message}`)
      continue
    }
    for (const nm of names) {
      const m = /^(?:data|assets)\/([a-z0-9_.\-]+)\//i.exec(nm)
      if (m) ns.add(m[1].toLowerCase())
    }
    if (++done % 60 === 0) log(`[ns] ${done}/${jars.length}`)
  }
  return { jars: jars.length, namespaces: [...ns].sort() }
}

export function loadNamespaceIndex(repo, tmp, { refresh = false, log = () => {} } = {}) {
  const cache = path.join(tmp, 'ns-index.json')
  if (!refresh && fs.existsSync(cache)) return JSON.parse(fs.readFileSync(cache, 'utf8'))
  const idx = buildNamespaceIndex(repo, { log })
  fs.mkdirSync(tmp, { recursive: true })
  fs.writeFileSync(cache, JSON.stringify(idx))
  return idx
}
