// 校验包内 lang 覆盖层：kubejs/assets/<ns>/lang/zh_cn.json 对比 mod 自带 en_us.json
//   - 键集合：包内应有 en_us 的全部键（不缺）；多出来的键列出来（可接受，但要知情）
//   - 占位符：每个键里的 %s / %1$s / %d / %% / \n 必须与英文原值一致
//   - 空值：不允许空字符串（除英文原值本来就是空）
// 用法：node scripts/verify-lang-overlays.mjs [ns1 ns2 ...]（不传则校验包内全部覆盖层）
import fs from 'node:fs'
import path from 'node:path'
import { inflateRawSync } from 'node:zlib'

const REPO = 'D:/git-MC/CDR1211'
const ASSETS = path.join(REPO, 'kubejs/assets')

function collect(buf, want, depth = 0) {
  const out = []
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  if (eocd < 0) return out
  let count = buf.readUInt16LE(eocd + 10)
  let cdOff = buf.readUInt32LE(eocd + 16)
  if (count === 0xffff || cdOff === 0xffffffff) {
    const loc = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x06, 0x07]))
    if (loc >= 0) {
      const z64 = Number(buf.readBigUInt64LE(loc + 8))
      count = Number(buf.readBigUInt64LE(z64 + 32))
      cdOff = Number(buf.readBigUInt64LE(z64 + 48))
    }
  }
  let off = cdOff
  for (let i = 0; i < count; i++) {
    if (off + 46 > buf.length || buf.readUInt32LE(off) !== 0x02014b50) break
    const method = buf.readUInt16LE(off + 10)
    const compSize = buf.readUInt32LE(off + 20)
    const nameLen = buf.readUInt16LE(off + 28)
    const extraLen = buf.readUInt16LE(off + 30)
    const commentLen = buf.readUInt16LE(off + 32)
    const localOff = buf.readUInt32LE(off + 42)
    const name = buf.slice(off + 46, off + 46 + nameLen).toString('utf8')
    if (name.toLowerCase() === want.toLowerCase()) {
      const nl = buf.readUInt16LE(localOff + 26)
      const el = buf.readUInt16LE(localOff + 28)
      const start = localOff + 30 + nl + el
      const raw = buf.slice(start, start + compSize)
      out.push(method === 8 ? inflateRawSync(raw).toString('utf8') : raw.toString('utf8'))
    } else if (/\.jar$/i.test(name) && depth < 2) {
      const nl = buf.readUInt16LE(localOff + 26)
      const el = buf.readUInt16LE(localOff + 28)
      const start = localOff + 30 + nl + el
      const rawSub = buf.slice(start, start + compSize)
      let sub
      try {
        sub = method === 8 ? inflateRawSync(rawSub) : rawSub
      } catch {
        sub = null
      }
      if (sub && sub.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])) > 0) for (const t of collect(sub, want, depth + 1)) out.push(t)
    }
    off += 46 + nameLen + extraLen + commentLen
  }
  return out
}

const jars = fs.readdirSync(path.join(REPO, 'mods')).filter((f) => f.endsWith('.jar'))
const cache = new Map()
function modEn(ns) {
  if (cache.has(ns)) return cache.get(ns)
  let res = null
  for (const f of jars) {
    try {
      const hits = collect(fs.readFileSync(path.join(REPO, 'mods', f)), `assets/${ns}/lang/en_us.json`)
      if (hits.length) {
        res = { jar: f, json: JSON.parse(hits[0]) }
        break
      }
    } catch {
      continue
    }
  }
  cache.set(ns, res)
  return res
}

const ph = (s) => (typeof s === 'string' ? (s.match(/%(?:\d+\$)?[sd]|%%|\\n/g) ?? []).sort().join(',') : '')

const argNs = process.argv.slice(2)
const targets = argNs.length ? argNs : fs.readdirSync(ASSETS).filter((ns) => fs.existsSync(path.join(ASSETS, ns, 'lang/zh_cn.json')))

let bad = 0
for (const ns of targets) {
  const file = path.join(ASSETS, ns, 'lang/zh_cn.json')
  if (!fs.existsSync(file)) {
    console.log(`✗ ${ns}: 包内没有 zh_cn.json`)
    bad += 1
    continue
  }
  let zh
  try {
    zh = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    console.log(`✗ ${ns}: JSON 解析失败 ${e.message}`)
    bad += 1
    continue
  }
  const en = modEn(ns)
  if (!en) {
    console.log(`· ${ns}: 没有 mod en_us 可对比（只检查 JSON 合法性），键 ${Object.keys(zh).length}`)
    continue
  }
  const missing = Object.keys(en.json).filter((k) => zh[k] === undefined)
  const extra = Object.keys(zh).filter((k) => en.json[k] === undefined)
  const phBad = Object.keys(zh).filter((k) => en.json[k] !== undefined && ph(en.json[k]) !== ph(zh[k]))
  const empty = Object.keys(zh).filter((k) => zh[k] === '' && en.json[k] !== '')
  const ok = !missing.length && !phBad.length && !empty.length
  console.log(
    `${ok ? '✓' : '✗'} ${ns}: en ${Object.keys(en.json).length} / zh ${Object.keys(zh).length}` +
      `${missing.length ? ` 缺 ${missing.length}(${missing.slice(0, 3).join(', ')}…)` : ''}` +
      `${extra.length ? ` 多 ${extra.length}` : ''}` +
      `${phBad.length ? ` 占位符不一致 ${phBad.length}(${phBad.slice(0, 3).join(', ')})` : ''}` +
      `${empty.length ? ` 空值 ${empty.length}` : ''}`
  )
  if (!ok) bad += 1
}
console.log(bad ? `\n有 ${bad} 个命名空间未通过` : '\n全部通过')
if (bad) process.exitCode = 1
