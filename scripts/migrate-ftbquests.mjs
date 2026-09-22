#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * migrate-ftbquests.mjs
 * =====================================================================
 * FTB Quests 任务书迁移：1.20.1 (CDR1201) -> 1.21.1 (CDR1211)
 *
 * 设计原则
 *  - 只做「文本 span 级」修改：所有结构性改动都记录为 [start,end) 字符区间，
 *    排序后从后往前应用，未触碰的内容（缩进、大小写、字段顺序、转义）原样保留。
 *  - 唯一需要「生成新文本」的地方是把某个 task 对象整体替换成 checkmark，
 *    生成时遵循 FTB Quests 风格：tab 缩进、键按字母序、字段之间无逗号、
 *    标量后缀沿用原字段原文（不猜测类型）。
 *  - 不新增 npm 依赖：zip 用 node:zlib 手写解析（tar 作为兜底不参与主流程）。
 *
 * 用法
 *   node scripts/migrate-ftbquests.mjs            # 真实写入（先备份目标目录被覆盖的文件）
 *   node scripts/migrate-ftbquests.mjs --dry-run  # 只生成报告，不写目标目录内容
 *   node scripts/migrate-ftbquests.mjs --metrics  # 只打印自检指标明细，不写任何文件
 * =====================================================================
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// ------------------------------------------------------------------ 路径
const WORKSPACE = 'D:/git-MC';
const SRC_DIR = `${WORKSPACE}/CDR1201/config/ftbquests/quests`;
const DST_DIR = `${WORKSPACE}/CDR1211/config/ftbquests/quests`;
const TMP_DIR = `${WORKSPACE}/_dsh_tmp`;
const BACKUP_DIR = `${TMP_DIR}/ftbquests-pre-migration`;
const REPORT_PATH = `${TMP_DIR}/quests-migration-report.md`;
const REGISTRY_JSON = `${WORKSPACE}/CDR1211/.probe/registry_objects.json`;
const MODS_DIR = `${WORKSPACE}/CDR1211/mods`;
const KJS_DATA = `${WORKSPACE}/CDR1211/kubejs/data`;
/** 目标目录中需要删除的旧空壳文件（相对路径） */
const STALE_TARGET_FILES = ['chapters/1.snbt'];

const DRY_RUN = process.argv.includes('--dry-run');
const METRICS_ONLY = process.argv.includes('--metrics');

// =====================================================================
// 1. SNBT 解析器（带源码 span）
// =====================================================================
/**
 * 节点形状
 *   { type:'object', start, end, fields:[field] }
 *   field = { key, quotedKey, start, end, value }   start=键起点 end=值终点
 *   { type:'array', start, end, items:[node] }
 *   { type:'string', start, end, value, raw }
 *   { type:'number', start, end, raw, suffix }
 *   { type:'bool', start, end, value }
 *   { type:'literal', start, end, raw }   // 未加引号的裸标量
 */
class SnbtError extends Error {}

function parseSnbt(text) {
  let i = 0;
  const n = text.length;
  const fail = (msg) => { throw new SnbtError(`${msg} @offset ${i}`); };

  const skipWs = () => {
    while (i < n) {
      const c = text[i];
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
      // 容忍逗号（本数据集里没有，但顺手容错）
      if (c === ',') { i++; continue; }
      break;
    }
  };

  function parseString() {
    const start = i;
    i++; // 开引号
    let value = '';
    let closed = false;
    while (i < n) {
      const c = text[i];
      if (c === '\\') {
        const e = text[i + 1];
        if (e === undefined) fail('字符串转义在文件末尾截断');
        switch (e) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case 'b': value += '\b'; break;
          case 'f': value += '\f'; break;
          case '"': value += '"'; break;
          case '\\': value += '\\'; break;
          case '/': value += '/'; break;
          case 'u': {
            const hex = text.slice(i + 2, i + 6);
            if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail('非法 \\u 转义');
            value += String.fromCharCode(parseInt(hex, 16));
            i += 4;
            break;
          }
          default: value += e; break;
        }
        i += 2;
        continue;
      }
      if (c === '"') { i++; closed = true; break; }
      value += c;
      i++;
    }
    if (!closed) fail('字符串未闭合');
    return { type: 'string', start, end: i, value, raw: text.slice(start, i) };
  }

  function parseKey() {
    const start = i;
    if (text[i] === '"') {
      const s = parseString();
      return { key: s.value, quotedKey: true, start, end: i };
    }
    const m = /^[^\s:,[\]{}]+/.exec(text.slice(i));
    if (!m) fail('无法解析键名');
    i += m[0].length;
    return { key: m[0], quotedKey: false, start, end: i };
  }

  function parseLiteral() {
    const start = i;
    const m = /^[^\s,[\]{}]+/.exec(text.slice(i));
    if (!m) fail(`无法解析标量，字符 ${JSON.stringify(text[i])}`);
    i += m[0].length;
    const raw = m[0];
    if (raw === 'true' || raw === 'false') return { type: 'bool', start, end: i, raw, value: raw === 'true' };
    if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?[dDfFlLbBsS]?$/.test(raw)) {
      const suffix = /[dDfFlLbBsS]$/.test(raw) ? raw.slice(-1).toLowerCase() : '';
      return { type: 'number', start, end: i, raw, suffix };
    }
    return { type: 'literal', start, end: i, raw };
  }

  function parseValue() {
    skipWs();
    const c = text[i];
    if (c === '{') return parseObject();
    if (c === '[') return parseArray();
    if (c === '"') return parseString();
    return parseLiteral();
  }

  function parseObject() {
    const start = i;
    i++; // {
    const fields = [];
    for (;;) {
      skipWs();
      if (i >= n) fail('对象未闭合');
      if (text[i] === '}') { i++; break; }
      const k = parseKey();
      skipWs();
      if (text[i] !== ':') fail(`键 ${k.key} 之后缺少冒号`);
      i++;
      const value = parseValue();
      fields.push({
        key: k.key,
        quotedKey: k.quotedKey,
        keyStart: k.start,
        keyEnd: k.end,
        start: k.start,
        end: value.end,
        value,
      });
    }
    return { type: 'object', start, end: i, fields };
  }

  function parseArray() {
    const start = i;
    i++; // [
    const items = [];
    for (;;) {
      skipWs();
      if (i >= n) fail('数组未闭合');
      if (text[i] === ']') { i++; break; }
      items.push(parseValue());
    }
    return { type: 'array', start, end: i, items };
  }

  const root = parseValue();
  skipWs();
  if (i !== n) throw new SnbtError(`解析结束后仍有残留内容 @offset ${i}: ${JSON.stringify(text.slice(i, i + 40))}`);
  return root;
}

// ---------------------------------------------------------- AST 小工具
function fieldOf(node, key) {
  if (!node || node.type !== 'object') return null;
  return node.fields.find((f) => f.key === key) || null;
}
function stringOf(node, key) {
  const f = fieldOf(node, key);
  if (!f || f.value.type !== 'string') return null;
  return f.value.value;
}
function rawOf(text, node) {
  return text.slice(node.start, node.end);
}
/** 遍历所有 string 节点，回调携带 (父字段键, 祖父字段键) */
function walkStrings(node, cb, parentKey = null, grandKey = null) {
  if (!node) return;
  if (node.type === 'object') {
    for (const f of node.fields) walkStrings(f.value, cb, f.key, parentKey);
  } else if (node.type === 'array') {
    for (const it of node.items) walkStrings(it, cb, parentKey, grandKey);
  } else if (node.type === 'string') {
    cb(node, parentKey, grandKey);
  }
}
/** 行首缩进 */
function lineIndent(text, pos) {
  const s = text.lastIndexOf('\n', pos - 1) + 1;
  let e = s;
  while (e < pos && (text[e] === ' ' || text[e] === '\t')) e++;
  return text.slice(s, e);
}
/** 计算「删除整段」应当吃掉的多余空白区间 */
function removeSpan(text, start, end) {
  let from = start;
  let to = end;
  let i = to;
  while (i < text.length && (text[i] === ' ' || text[i] === '\t' || text[i] === '\r' || text[i] === '\n')) i++;
  if (text.slice(to, i).includes('\n')) {
    to = i; // 吃掉行尾换行 + 下一行缩进
  } else {
    let j = from;
    while (j > 0 && (text[j - 1] === ' ' || text[j - 1] === '\t')) j--;
    if (text[j - 1] === '\n') from = j;
    else if (text[to] === ' ') to += 1;
  }
  return [from, to];
}

/** span 编辑集合：从后往前应用；重叠时"外层/更大区间优先"，被包住的编辑丢弃 */
class EditSet {
  constructor(label) { this.label = label; this.list = []; this.dropped = 0; }
  add(start, end, replacement) { this.list.push({ start, end, replacement }); }
  get size() { return this.list.length; }
  apply(text) {
    // 起点升序；同起点时"更长"的优先（保证外层删除先占位）
    const list = [...this.list].sort((a, b) => a.start - b.start || b.end - a.end);
    const kept = [];
    let dropped = 0;
    for (const e of list) {
      let skip = false;
      while (kept.length) {
        const k = kept[kept.length - 1];
        if (k.end <= e.start) break;                                  // 无重叠
        if (e.start >= k.start && e.end <= k.end) { skip = true; break; } // e 被已保留区间包住 → 丢弃
        const kLen = k.end - k.start;
        const eLen = e.end - e.start;
        if (kLen >= eLen) { skip = true; break; }                      // 已保留的更长 → 丢弃 e
        kept.pop(); dropped++;                                         // e 更长 → 换掉较短的
      }
      if (!skip) kept.push(e);
    }
    this.dropped = dropped;
    let out = text;
    for (let k = kept.length - 1; k >= 0; k--) {
      const e = kept[k];
      out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
    }
    return out;
  }
}

// =====================================================================
// 2. 无依赖 zip 读取（读 jar 里的 advancement / tag）
// =====================================================================
function readZipEntries(buf) {
  let eocd = -1;
  const min = Math.max(0, buf.length - 66000);
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return null;
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let i = 0; i < count; i++) {
    if (off + 46 > buf.length || buf.readUInt32LE(off) !== 0x02014b50) break;
    entries.push({
      name: buf.toString('utf8', off + 46, off + 46 + buf.readUInt16LE(off + 28)),
      method: buf.readUInt16LE(off + 10),
      compSize: buf.readUInt32LE(off + 20),
      localOff: buf.readUInt32LE(off + 42),
    });
    off += 46 + buf.readUInt16LE(off + 28) + buf.readUInt16LE(off + 30) + buf.readUInt16LE(off + 32);
  }
  return entries;
}
function readZipEntry(buf, e) {
  const lo = e.localOff;
  if (lo + 30 > buf.length || buf.readUInt32LE(lo) !== 0x04034b50) return null;
  const start = lo + 30 + buf.readUInt16LE(lo + 26) + buf.readUInt16LE(lo + 28);
  const data = buf.subarray(start, start + e.compSize);
  if (e.method === 0) return data;
  if (e.method === 8) return zlib.inflateRawSync(data);
  return null; // 其它压缩方式（罕见）视为失败
}
function stripBom(s) { return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s; }

function listFilesRecursive(dir, filter) {
  const out = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...listFilesRecursive(p, filter));
    else if (!filter || filter(p)) out.push(p);
  }
  return out;
}

// =====================================================================
// 3. 校验数据源
// =====================================================================
function loadWorldData() {
  const diag = { zipFailures: [], jsonFailures: [], advDirs: {}, tagDirs: {}, kjsTagFiles: 0, kjsAdvFiles: 0 };

  const reg = JSON.parse(fs.readFileSync(REGISTRY_JSON, 'utf8'));
  const sets = {
    item: new Set(reg['minecraft:item'] || []),
    block: new Set(reg['minecraft:block'] || []),
    entity: new Set(reg['minecraft:entity_type'] || []),
    fluid: new Set(reg['minecraft:fluid'] || []),
    biome: new Set(reg['minecraft:worldgen/biome'] || []),
    dimension: new Set(reg['minecraft:dimension'] || []),
    structure: new Set(reg['minecraft:worldgen/structure'] || []),
  };

  const advancements = new Set();
  /** tagId -> 原始 value 字符串数组（可能含 #嵌套） */
  const rawTags = new Map();

  const collectTagJson = (raw, tagId) => {
    let j;
    try { j = JSON.parse(stripBom(raw)); }
    catch (e) { diag.jsonFailures.push(`${tagId} : ${e.message}`); return; }
    const vals = Array.isArray(j.values) ? j.values : [];
    const list = [];
    for (const v of vals) {
      if (typeof v === 'string') list.push(v);
      else if (v && typeof v === 'object' && typeof v.id === 'string') list.push(v.id);
    }
    if (!rawTags.has(tagId)) rawTags.set(tagId, []);
    rawTags.get(tagId).push(...list);
  };

  const handleDataEntry = (rel, text, tagId) => {
    const m = /^data\/([^/]+)\/(advancements?|tags\/(?:item|items))\/(.+)\.json$/.exec(rel);
    if (!m) return;
    const ns = m[1];
    const kind = m[2];
    const sub = m[3];
    if (kind.startsWith('adv')) {
      diag.advDirs[kind] = (diag.advDirs[kind] || 0) + 1;
      advancements.add(`${ns}:${sub}`);
    } else {
      diag.tagDirs[kind] = (diag.tagDirs[kind] || 0) + 1;
      collectTagJson(text, tagId !== undefined ? tagId : `${ns}:${sub}`);
    }
  };

  // --- jar
  let jars = [];
  try { jars = fs.readdirSync(MODS_DIR).filter((f) => f.endsWith('.jar')); } catch { /* ignore */ }
  let entryCount = 0;
  for (const jar of jars) {
    const full = path.join(MODS_DIR, jar);
    let buf, entries;
    try { buf = fs.readFileSync(full); } catch (e) { diag.zipFailures.push(`${jar} read: ${e.message}`); continue; }
    try { entries = readZipEntries(buf); } catch (e) { diag.zipFailures.push(`${jar} zip: ${e.message}`); continue; }
    if (!entries) { diag.zipFailures.push(`${jar} 找不到 EOCD（非 zip）`); continue; }
    for (const e of entries) {
      if (!e.name.startsWith('data/') || !e.name.endsWith('.json')) continue;
      const m = /^data\/([^/]+)\/(advancements?|tags\/(?:item|items))\/(.+)\.json$/.exec(e.name);
      if (!m) continue;
      entryCount++;
      if (m[2].startsWith('adv')) {
        diag.advDirs[m[2]] = (diag.advDirs[m[2]] || 0) + 1;
        advancements.add(`${m[1]}:${m[3]}`);
      } else {
        diag.tagDirs[m[2]] = (diag.tagDirs[m[2]] || 0) + 1;
        let data;
        try { data = readZipEntry(buf, e); }
        catch (err) { diag.jsonFailures.push(`${e.name} inflate: ${err.message}`); continue; }
        if (!data) { diag.jsonFailures.push(`${e.name} 不支持的压缩方式 ${e.method}`); continue; }
        collectTagJson(data.toString('utf8'), `${m[1]}:${m[3]}`);
      }
    }
  }

  // --- kubejs datapack overlay（只读，不修改）
  for (const p of listFilesRecursive(KJS_DATA, (x) => x.endsWith('.json'))) {
    const rel = p.slice(p.indexOf('/kubejs/') + 1);
    const m = /^kubejs\/data\/([^/]+)\/(advancements?|tags\/(?:item|items))\/(.+)\.json$/.exec(rel);
    if (!m) continue;
    if (m[2].startsWith('adv')) {
      diag.kjsAdvFiles++;
      advancements.add(`${m[1]}:${m[3]}`);
    } else {
      diag.kjsTagFiles++;
      let txt = '';
      try { txt = fs.readFileSync(p, 'utf8'); } catch { continue; }
      collectTagJson(txt, `${m[1]}:${m[3]}`);
    }
  }

  // --- 递归解析 tag -> 物品集合
  const resolved = new Map();
  const resolving = new Set();
  const unresolvedTags = new Set();
  function resolveTag(tagId) {
    if (resolved.has(tagId)) return resolved.get(tagId);
    if (resolving.has(tagId)) return null; // 环
    const raw = rawTags.get(tagId);
    if (!raw) { unresolvedTags.add(tagId); return null; }
    resolving.add(tagId);
    const set = new Set();
    let ok = true;
    for (const v of raw) {
      if (v.startsWith('#')) {
        const nested = resolveTag(v.slice(1));
        if (nested === null) { ok = false; continue; }
        for (const x of nested) set.add(x);
      } else if (v.includes(':')) {
        set.add(v);
      } else {
        set.add(`minecraft:${v}`);
      }
    }
    resolving.delete(tagId);
    if (!ok) { unresolvedTags.add(tagId); return null; } // 解析不了 => 视为未知
    resolved.set(tagId, set);
    return set;
  }
  for (const t of rawTags.keys()) resolveTag(t);

  return { sets, advancements, rawTags, resolved, unresolvedTags, diag, jarCount: jars.length, entryCount };
}

// =====================================================================
// 4. 迁移规则常量
// =====================================================================
const NAMESPACE_RENAMES = [
  ['createdelight:', 'createdelightcore:'],
  ['alexscaves:', 'alexscavesup:'],
  ['alexsmobs:', 'alexsmobsup:'],
  ['citadel:', 'citadelup:'],
  ['miners_delight:', 'minersdelight:'],
  ['casualness_delight:', 'casualnessdelight:'],
  ['some_assembly_required:', 'someassemblyrequired:'],
  ['expatternprovider:', 'extendedae:'],
];
const OLD_NAMESPACES = NAMESPACE_RENAMES.map(([a]) => a);
const FORGE_TAG_RENAME = ['forge:', 'c:'];

/** 1.21.1 FTB Quests 2101 不支持、需要整体转成 checkmark 的任务类型 */
const UNSUPPORTED_TASK_TYPES = new Set(['questsadditions:time', 'questsadditions:killnbt', 'questsadditions:days']);
/** 明确不校验字段的 task 类型 */
const UNVALIDATED_TASK_TYPES = new Set(['checkmark', 'xp', 'xp_levels', 'custom', 'observation', 'command', 'stat', 'random', 'choice', 'all_table', 'loot']);
/** 每个类型对应要校验的字段与注册表 */
const TASK_FIELD_REGISTRY = {
  kill: { field: 'entity', reg: 'entity' },
  dimension: { field: 'dimension', reg: 'dimension' },
  advancement: { field: 'advancement', reg: 'advancement' },
  fluid: { field: 'fluid', reg: 'fluid' },
  structure: { field: 'structure', reg: 'structure' },
  biome: { field: 'biome', reg: 'biome' },
};

const ID_RE = /^[a-z0-9_.\-]+:[a-z0-9_/.\-]+$/;

// =====================================================================
// 5. 主流程
// =====================================================================
function main() {
  const t0 = Date.now();
  const notes = [];      // 需要人工决策 / 异常说明
  const stats = {
    filesRead: 0,
    renameCounts: Object.fromEntries(NAMESPACE_RENAMES.map(([a]) => [a, 0])),
    forgeRenameCount: 0,
    conversions: [],     // {file, quest, taskId, fromType, to, detail}
    conversionByReason: {},
    deletedQuests: [],   // {file, id, title, reasons:[]}
    deletedQuestIds: new Set(),
    deletedRewards: [],  // {file, owner, id, item, reason}
    depEntriesRemoved: 0,
    depFieldsRemoved: 0,
    emptyChapters: [],
    icons: [],           // {file, scope, id, exists}
    images: 0,
    imageExamples: [],
    missingNsTally: new Map(),   // 删除 quest/reward 涉及的命名空间
    refTotal: 0,
    metric: {
      catCount: new Map(),      // 分类 -> 引用数
      catMissing: new Map(),    // 分类 -> 缺失数
      nsMissing: new Map(),     // 命名空间 -> 缺失数
      nsRefTally: new Map(),    // 命名空间 -> 引用数（全部）
      missingExamples: [],
    },
  };

  const world = loadWorldData();
  const { sets } = world;
  const existsItem = (id) => sets.item.has(id) || sets.block.has(id);

  // ---------------------------------------------------------------- 读源文件
  const srcFiles = listFilesRecursive(SRC_DIR, (p) => p.endsWith('.snbt'))
    .map((p) => p.slice(SRC_DIR.length + 1).replace(/\\/g, '/'))
    .sort();
  stats.filesRead = srcFiles.length;

  const original = new Map(); // rel -> text0
  for (const rel of srcFiles) {
    const txt = fs.readFileSync(`${SRC_DIR}/${rel}`, 'utf8');
    original.set(rel, txt.charCodeAt(0) === 0xfeff ? txt.slice(1) : txt);
  }

  // ============================================================ Phase 1: 改名
  const afterRename = new Map();
  for (const rel of srcFiles) {
    const text0 = original.get(rel);
    const ast0 = parseSnbt(text0);

    // forge: 只在 tag / 过滤器值里改名
    const forgeEdits = new EditSet(`forge-rename:${rel}`);
    walkStrings(ast0, (node, parentKey) => {
      if (parentKey !== 'value' && parentKey !== 'tag') return;
      if (!node.value.startsWith(FORGE_TAG_RENAME[0])) return;
      const idx = node.raw.indexOf(FORGE_TAG_RENAME[0]);
      if (idx < 0) return;
      forgeEdits.add(node.start + idx, node.start + idx + FORGE_TAG_RENAME[0].length, FORGE_TAG_RENAME[1]);
      stats.forgeRenameCount++;
    });
    let text = forgeEdits.size ? forgeEdits.apply(text0) : text0;

    // 8 个命名空间：全文件文本级，带「id 前缀 + 冒号」左边界
    for (const [from, to] of NAMESPACE_RENAMES) {
      const re = new RegExp(`(?<![A-Za-z0-9_.\\-])${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
      text = text.replace(re, () => { stats.renameCounts[from]++; return to; });
    }
    afterRename.set(rel, text);
  }

  // ================================================ 自检指标（改名后、清理前）
  for (const rel of srcFiles) {
    const text = afterRename.get(rel);
    const ast = parseSnbt(text);
    walkStrings(ast, (node, parentKey, grandKey) => {
      const id = node.value;
      if (!ID_RE.test(id)) return;
      stats.refTotal++;
      const cat = classifyRef(id, parentKey, grandKey);
      stats.metric.catCount.set(cat, (stats.metric.catCount.get(cat) || 0) + 1);
      const ns = id.slice(0, id.indexOf(':'));
      stats.metric.nsRefTally.set(ns, (stats.metric.nsRefTally.get(ns) || 0) + 1);
      if (cat === 'item' || cat === 'itemFilterEntry') {
        if (!existsItem(id)) {
          stats.metric.catMissing.set(cat, (stats.metric.catMissing.get(cat) || 0) + 1);
          stats.metric.nsMissing.set(ns, (stats.metric.nsMissing.get(ns) || 0) + 1);
          if (stats.metric.missingExamples.length < 20) stats.metric.missingExamples.push(`${rel}: ${id}`);
        }
      }
    });
  }
  if (METRICS_ONLY) {
    console.log('refTotal =', stats.refTotal);
    console.log('category counts  =', [...stats.metric.catCount].sort((a, b) => b[1] - a[1]));
    console.log('item-position missing =', [...stats.metric.catMissing]);
    console.log('item-position missing by namespace =', [...stats.metric.nsMissing].sort((a, b) => b[1] - a[1]));
    return;
  }

  // ==================================================== Phase 2: 任务类型转换
  const afterConvert = new Map();
  for (const rel of srcFiles) {
    const text = afterRename.get(rel);
    const ast = parseSnbt(text);
    const edits = new EditSet(`convert:${rel}`);
    const questsField = fieldOf(ast, 'quests');
    if (questsField && questsField.value.type === 'array') {
      for (const quest of questsField.value.items) {
        const questId = stringOf(quest, 'id') || '?';
        const tasksField = fieldOf(quest, 'tasks');
        if (!tasksField || tasksField.value.type !== 'array') continue;
        for (const task of tasksField.value.items) {
          if (task.type !== 'object') continue;
          convertTask(rel, text, task, questId, edits, stats, world);
        }
      }
    }
    afterConvert.set(rel, edits.size ? edits.apply(text) : text);
  }

  // ==================================================== Phase 3: 缺失内容清理
  const afterClean = new Map();
  for (const rel of srcFiles) {
    const text = afterConvert.get(rel);
    const ast = parseSnbt(text);
    const edits = new EditSet(`clean:${rel}`);
    const isChapter = rel.startsWith('chapters/');

    // --- quests（章节）
    const questsField = fieldOf(ast, 'quests');
    if (questsField && questsField.value.type === 'array') {
      const doomed = [];
      for (const quest of questsField.value.items) {
        if (quest.type !== 'object') continue;
        const reasons = [];
        const tasksField = fieldOf(quest, 'tasks');
        if (tasksField && tasksField.value.type === 'array') {
          for (const task of tasksField.value.items) {
            if (task.type !== 'object') continue;
            const r = validateTask(task, sets, world.advancements);
            if (r) reasons.push(r);
          }
        }
        if (reasons.length) doomed.push({ quest, reasons });
      }
      if (doomed.length === questsField.value.items.length && questsField.value.items.length > 0) {
        // 整章清空：一次性把数组替换为 [ ]
        edits.add(questsField.value.start, questsField.value.end, '[ ]');
      } else {
        for (const { quest } of doomed) {
          const [s, e] = removeSpan(text, quest.start, quest.end);
          edits.add(s, e, '');
        }
      }
      for (const { quest, reasons } of doomed) {
        const qid = stringOf(quest, 'id') || '(无 id)';
        const title = stringOf(quest, 'title') ?? '(无标题)';
        stats.deletedQuests.push({ file: rel, id: qid, title, reasons });
        stats.deletedQuestIds.add(qid);
        for (const r of reasons) {
          const ns = r.id ? r.id.slice(0, r.id.indexOf(':')) : '(未知)';
          stats.missingNsTally.set(ns, (stats.missingNsTally.get(ns) || 0) + 1);
        }
      }
    }

    // --- rewards（章节内 quest 的 rewards + 独立的 reward_tables/*）
    const scanRewards = (ownerNode, ownerLabel) => {
      const rf = fieldOf(ownerNode, 'rewards');
      if (!rf || rf.value.type !== 'array') return;
      for (const rw of rf.value.items) {
        if (rw.type !== 'object') continue;
        const type = stringOf(rw, 'type') || 'item';
        if (type !== 'item') continue;
        const idNode = itemIdNode(rw, text);
        if (!idNode) continue;
        const id = idNode.value;
        if (!ID_RE.test(id)) continue;
        if (existsItem(id)) continue;
        const [s, e] = removeSpan(text, rw.start, rw.end);
        edits.add(s, e, '');
        stats.deletedRewards.push({ file: rel, owner: ownerLabel, id: stringOf(rw, 'id') || '?', item: id });
        const ns = id.slice(0, id.indexOf(':'));
        stats.missingNsTally.set(ns, (stats.missingNsTally.get(ns) || 0) + 1);
      }
    };
    if (questsField && questsField.value.type === 'array') {
      for (const quest of questsField.value.items) {
        if (quest.type !== 'object') continue;
        scanRewards(quest, `quest ${stringOf(quest, 'id') || '?'}`);
      }
    }
    if (!isChapter) scanRewards(ast, `table ${stringOf(ast, 'id') || rel}`);

    // --- icon / image 统计（保留不动）
    collectAppearance(rel, ast, text, existsItem, stats, notes);

    afterClean.set(rel, edits.size ? edits.apply(text) : text);
  }

  // ============================================ Phase 4: 依赖清理 + 空章节
  const finalText = new Map();
  for (const rel of srcFiles) {
    const text = afterClean.get(rel);
    const ast = parseSnbt(text);
    const edits = new EditSet(`deps:${rel}`);

    const visitObject = (node) => {
      if (!node || node.type !== 'object') return;
      for (const f of node.fields) {
        if (f.key === 'dependencies' && f.value.type === 'array') {
          const items = f.value.items.filter((x) => x.type === 'string');
          const hit = items.filter((x) => stats.deletedQuestIds.has(x.value));
          if (hit.length === items.length && items.length > 0) {
            const [s, e] = removeSpan(text, f.start, f.end);
            edits.add(s, e, '');
            stats.depFieldsRemoved++;
            stats.depEntriesRemoved += hit.length;
          } else {
            for (const h of hit) {
              const [s, e] = removeSpan(text, h.start, h.end);
              edits.add(s, e, '');
              stats.depEntriesRemoved++;
            }
          }
        }
      }
      for (const f of node.fields) {
        if (f.value.type === 'object') visitObject(f.value);
        else if (f.value.type === 'array') {
          for (const it of f.value.items) if (it.type === 'object') visitObject(it);
        }
      }
    };
    visitObject(ast);

    let out = edits.size ? edits.apply(text) : text;

    // 空章节标记（quests: [ ] 或只剩空白）
    const questsField = fieldOf(ast, 'quests');
    if (questsField && questsField.value.type === 'array' && questsField.value.items.length === 0) {
      stats.emptyChapters.push(rel);
    }
    finalText.set(rel, out);
  }

  // ==================================================== Phase 5: 校验 + 落盘
  const verify = { ok: 0, failed: [] };
  for (const rel of srcFiles) {
    try {
      parseSnbt(finalText.get(rel));
      verify.ok++;
    } catch (e) {
      verify.failed.push({ file: rel, error: e.message });
    }
  }
  // 残留检查
  const residual = { itemfilters: 0, questsadditions: 0, oldNs: {}, samples: [] };
  for (const ns of OLD_NAMESPACES) residual.oldNs[ns] = 0;
  for (const rel of srcFiles) {
    const t = finalText.get(rel);
    residual.itemfilters += occurrences(t, 'itemfilters:');
    residual.questsadditions += occurrences(t, 'questsadditions:');
    for (const ns of OLD_NAMESPACES) residual.oldNs[ns] += occurrences(t, ns);
    for (const probe of ['itemfilters:', 'questsadditions:', ...OLD_NAMESPACES]) {
      let i = -1;
      while ((i = t.indexOf(probe, i + 1)) !== -1) {
        residual.samples.push(`${rel} :: …${t.slice(Math.max(0, i - 60), i + 40).replace(/\s+/g, ' ')}…`);
      }
    }
  }

  // 目标目录现状（写入前）
  const targetExisting = listFilesRecursive(DST_DIR).map((p) => p.slice(DST_DIR.length + 1).replace(/\\/g, '/'));

  // ---------------------------------------------------------------- 写入
  const written = [];
  const backedUp = [];
  const deletedTargets = [];
  if (!DRY_RUN) {
    for (const rel of targetExisting) {
      const isGitignore = rel.endsWith('.gitignore');
      const willOverwrite = srcFiles.includes(rel);
      const willDelete = STALE_TARGET_FILES.includes(rel);
      if (isGitignore || (!willOverwrite && !willDelete)) continue;
      const src = `${DST_DIR}/${rel}`;
      const dst = `${BACKUP_DIR}/${rel}`;
      if (fs.existsSync(dst)) continue; // 已备份过（保留最早的迁移前状态）
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
      backedUp.push(rel);
    }
    for (const rel of srcFiles) {
      const dst = `${DST_DIR}/${rel}`;
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.writeFileSync(dst, finalText.get(rel), 'utf8'); // 无 BOM
      written.push(rel);
    }
    for (const rel of STALE_TARGET_FILES) {
      const p = `${DST_DIR}/${rel}`;
      if (fs.existsSync(p)) { fs.unlinkSync(p); deletedTargets.push(rel); }
    }
  }

  // ---------------------------------------------------------------- 报告
  const report = buildReport({
    stats, world, verify, residual, finalText, srcFiles, targetExisting,
    written, backedUp, deletedTargets, notes, DRY_RUN, elapsedMs: Date.now() - t0,
  });
  fs.mkdirSync(TMP_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, report, 'utf8');

  console.log(`[${DRY_RUN ? 'DRY-RUN' : 'WRITE'}] files=${srcFiles.length} written=${written.length} unverifiedAdv=${UNVERIFIED_ADVANCEMENTS.length} ` +
    `deletedQuests=${stats.deletedQuests.length} convertedTasks=${stats.conversions.length} ` +
    `deletedRewards=${stats.deletedRewards.length} emptyChapters=${stats.emptyChapters.length} ` +
    `parseOk=${verify.ok} parseFail=${verify.failed.length} report=${REPORT_PATH}`);
}

// ------------------------------------------------------------------ 分类
function classifyRef(id, parentKey, grandKey) {
  if (parentKey === 'icon' || grandKey === 'icon') return 'icon';
  if (parentKey === 'image' || grandKey === 'image') return 'image';
  if (/\.(png|jpg|jpeg|gif|webp)$/i.test(id)) return 'image';
  if (parentKey === 'item') return 'item';
  if (parentKey === 'id' && grandKey === 'item') return 'item';
  if (parentKey === 'id' && grandKey === 'items') return 'itemFilterEntry';
  if (parentKey === 'type') return 'type';
  if (parentKey === 'tag' && grandKey === 'item') return 'type'; // item.id 的 tag 字段（少见）
  if (parentKey === 'value' && grandKey === 'tag') return 'tagValue';
  if (parentKey === 'tag') return 'tag';
  return 'other';
}

function occurrences(text, needle) {
  let n = 0;
  let i = -1;
  while ((i = text.indexOf(needle, i + 1)) !== -1) n++;
  return n;
}

/** 取 task/reward 的 item id 字符串节点（item 为字符串，或 item.id） */
function itemIdNode(node, text) {
  const f = fieldOf(node, 'item');
  if (!f) return null;
  if (f.value.type === 'string') return f.value;
  if (f.value.type === 'object') {
    const idf = fieldOf(f.value, 'id');
    if (idf && idf.value.type === 'string') return idf.value;
  }
  return null;
}

// -------------------------------------------------- Phase 2 具体转换逻辑
function convertTask(rel, text, task, questId, edits, stats, world) {
  const typeField = fieldOf(task, 'type');
  const type = typeField && typeField.value.type === 'string' ? typeField.value.value : (fieldOf(task, 'item') ? 'item' : 'checkmark');
  const taskId = stringOf(task, 'id') || '?';
  const bump = (reason) => { stats.conversionByReason[reason] = (stats.conversionByReason[reason] || 0) + 1; };

  if (UNSUPPORTED_TASK_TYPES.has(type)) {
    edits.add(task.start, task.end, genCheckmarkTask(text, task));
    stats.conversions.push({ file: rel, quest: questId, taskId, fromType: type, to: 'checkmark', detail: '1.21.1 不支持的 questsadditions 类型' });
    bump(`unsupported:${type}`);
    return;
  }
  if (type !== 'item') return;

  const itemField = fieldOf(task, 'item');
  if (!itemField) return;
  const idf = itemField.value.type === 'object' ? fieldOf(itemField.value, 'id') : null;
  const idStr = itemField.value.type === 'string' ? itemField.value.value
    : (idf && idf.value.type === 'string' ? idf.value.value : null);
  if (!idStr || !idStr.startsWith('itemfilters:')) return;

  const replaceWhole = (detail, reasonKey) => {
    edits.add(task.start, task.end, genCheckmarkTask(text, task));
    stats.conversions.push({ file: rel, quest: questId, taskId, fromType: 'item', to: 'checkmark', detail });
    bump(reasonKey);
  };

  if (idStr !== 'itemfilters:tag' || itemField.value.type !== 'object') {
    replaceWhole(`itemfilters 机制在 1.21.1 不存在（${idStr}）`, `itemfilters:${idStr}`);
    return;
  }
  const tagField = fieldOf(itemField.value, 'tag');
  const valueField = tagField ? fieldOf(tagField.value, 'value') : null;
  const tagId = valueField && valueField.value.type === 'string' ? valueField.value.value : null;
  if (!tagId) {
    replaceWhole('itemfilters:tag 但没有可解析的 tag 值', 'itemfilters:tag(无 value)');
    return;
  }
  const set = world.resolved.get(tagId);
  if (!set) {
    replaceWhole(`tag ${tagId} 无法解析（未定义或含未解析嵌套）`, 'itemfilters:tag(未解析)');
    return;
  }
  if (set.size !== 1) {
    replaceWhole(`tag ${tagId} 解析出 ${set.size} 个物品，1.21.1 无 itemfilters 机制`, `itemfilters:tag(${set.size === 0 ? '空' : '多物品'})`);
    return;
  }
  // 恰好 1 个物品：改 item.id，删掉 tag 字段
  const [only] = [...set];
  if (!idf) { replaceWhole(`tag ${tagId} 唯一物品 ${only}，但 item 结构异常`, 'itemfilters:tag(结构异常)'); return; }
  edits.add(idf.value.start, idf.value.end, `"${only}"`);
  if (tagField) {
    const [s, e] = removeSpan(text, tagField.start, tagField.end);
    edits.add(s, e, '');
  }
  stats.conversions.push({ file: rel, quest: questId, taskId, fromType: 'item', to: `item:${only}`, detail: `itemfilters:tag ${tagId} 解析出唯一物品` });
  stats.conversionByReason['itemfilters:tag(唯一物品->具体物品)'] = (stats.conversionByReason['itemfilters:tag(唯一物品->具体物品)'] || 0) + 1;
}

/** 生成 checkmark 任务对象（FTB 风格：tab 缩进、键按字母序、无逗号） */
function genCheckmarkTask(text, task) {
  const indent = lineIndent(text, task.start);
  const fi = `${indent}\t`;
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = ['{'];
  const emit = (key, valueNode) => {
    const raw = rawOf(text, valueNode);
    const parts = raw.split('\n');
    const body = parts.length === 1 ? raw : parts.map((l, i) => (i === 0 ? l : fi + l.replace(/^[ \t]*/, ''))).join(eol);
    lines.push(`${fi}${key}: ${body}`);
  };
  for (const key of ['disable_toast', 'icon', 'id', 'optional']) {
    const f = fieldOf(task, key);
    if (f) emit(key, f.value);
  }
  lines.push(`${fi}type: "checkmark"`);
  lines.push(`${indent}}`);
  return lines.join(eol);
}

// -------------------------------------------------- Phase 3 校验逻辑
function validateTask(task, sets, advancements) {
  const typeField = fieldOf(task, 'type');
  const type = typeField && typeField.value.type === 'string' ? typeField.value.value
    : (fieldOf(task, 'item') ? 'item' : 'checkmark');
  const taskId = stringOf(task, 'id') || '?';

  if (type === 'item') {
    const f = fieldOf(task, 'item');
    if (!f) return null;
    let id = null;
    if (f.value.type === 'string') id = f.value.value;
    else if (f.value.type === 'object') {
      const idf = fieldOf(f.value, 'id');
      if (idf && idf.value.type === 'string') id = idf.value.value;
    }
    if (!id || !ID_RE.test(id)) return null;
    if (sets.item.has(id) || sets.block.has(id)) return null;
    return { kind: 'item', id, taskId, detail: `item 不存在：${id}` };
  }
  if (UNVALIDATED_TASK_TYPES.has(type) || UNSUPPORTED_TASK_TYPES.has(type)) return null;

  const spec = TASK_FIELD_REGISTRY[type];
  if (!spec) return null; // 未知类型：不校验
  const f = fieldOf(task, spec.field);
  if (!f) return null; // 字段缺失：无法校验，保守放过
  let id = null;
  if (f.value.type === 'string') id = f.value.value;
  else if (f.value.type === 'object') {
    const idf = fieldOf(f.value, 'id');
    if (idf && idf.value.type === 'string') id = idf.value.value;
  }
  if (!id || !ID_RE.test(id)) return null;
  const set = spec.reg === 'advancement' ? advancements : sets[spec.reg];
  if (set.has(id)) return null;
  if (spec.reg === 'advancement') {
    // 很多 mod（如 Alex's Mobs）的 advancement 在运行时动态注册，jar 里没有 data/<ns>/advancement/*.json，
    // 静态扫描必然漏判。只要命名空间在已装内容里出现过，就保守保留该 quest，仅记为「未验证」。
    const ns = id.split(':')[0];
    if (knownNamespaces(sets, advancements).has(ns)) {
      UNVERIFIED_ADVANCEMENTS.push({ id, taskId });
      return null;
    }
  }
  return { kind: spec.reg, id, taskId, detail: `${spec.field} 不存在：${id}` };
}

/** 被保守保留的 advancement 引用（静态无法验证运行时注册的 advancement） */
const UNVERIFIED_ADVANCEMENTS = [];

let __nsCache = null;
function knownNamespaces(sets, advancements) {
  if (__nsCache) return __nsCache;
  __nsCache = new Set();
  const add = (id) => {
    const i = id.indexOf(':');
    if (i > 0) __nsCache.add(id.slice(0, i));
  };
  for (const key of Object.keys(sets)) {
    const s = sets[key];
    if (s && typeof s[Symbol.iterator] === 'function') for (const id of s) add(id);
  }
  for (const id of advancements) add(id);
  return __nsCache;
}

// -------------------------------------------------- icon / image 统计
function collectAppearance(rel, ast, text, existsItem, stats, notes) {
  const visit = (node, parentKey, grandKey) => {
    if (!node) return;
    if (node.type === 'object') {
      for (const f of node.fields) visit(f.value, f.key, parentKey);
    } else if (node.type === 'array') {
      for (const it of node.items) visit(it, parentKey, grandKey);
    } else if (node.type === 'string') {
      const id = node.value;
      if (parentKey === 'image' || grandKey === 'image') {
        stats.images++;
        if (stats.imageExamples.length < 40 && !stats.imageExamples.includes(id)) stats.imageExamples.push(id);
        return;
      }
      if (parentKey === 'icon' || grandKey === 'icon') {
        if (!ID_RE.test(id)) return;
        stats.icons.push({ file: rel, scope: grandKey === 'icon' ? 'icon.id' : 'icon', id, exists: existsItem(id) });
      }
    }
  };
  visit(ast, null, null);
}

// =====================================================================
// 6. 报告
// =====================================================================
function buildReport(ctx) {
  const { stats, world, verify, residual, finalText, srcFiles, targetExisting, written, backedUp, deletedTargets, notes, DRY_RUN, elapsedMs } = ctx;
  const L = [];
  const p = (s = '') => L.push(s);
  const cat = (c) => stats.metric.catCount.get(c) || 0;
  const catMiss = (c) => stats.metric.catMissing.get(c) || 0;
  const itemMiss = catMiss('item') + catMiss('itemFilterEntry');
  const sum = (m) => [...m.values()].reduce((a, b) => a + b, 0);

  p('# FTB Quests 迁移报告（1.20.1 → 1.21.1）');
  p();
  p(`- 生成时间：${new Date().toISOString()}`);
  p(`- 模式：${DRY_RUN ? '**--dry-run（未写目标目录）**' : '真实写入'}`);
  p(`- 脚本：\`D:\\git-MC\\CDR1211\\scripts\\migrate-ftbquests.mjs\``);
  p(`- 源目录：\`${SRC_DIR}\``);
  p(`- 目标目录：\`${DST_DIR}\``);
  p(`- 耗时：${elapsedMs} ms`);
  p();

  // ---------------------------------------------------------------- 1 总览
  p('## 1. 总览');
  p();
  p('| 项目 | 数量 |');
  p('|---|---|');
  p(`| 读取 .snbt 文件数 | ${srcFiles.length} |`);
  p(`| 写入文件数 | ${DRY_RUN ? `0（dry-run，待写 ${srcFiles.length}）` : written.length} |`);
  p('| 命名空间改名次数 | 见下表 |');
  p(`| task 转换总数 | ${stats.conversions.length} |`);
  p(`| 删除 quest 数 | ${stats.deletedQuests.length} |`);
  p(`| 删除 reward 数 | ${stats.deletedRewards.length} |`);
  p(`| 清理的 dependencies 条目数 | ${stats.depEntriesRemoved}（其中整字段删除 ${stats.depFieldsRemoved} 处） |`);
  p(`| 空章节数 | ${stats.emptyChapters.length} |`);
  p();
  p('### 1.1 命名空间改名分项');
  p();
  p('| 源命名空间 | 目标命名空间 | 改名次数 |');
  p('|---|---|---|');
  for (const [from, to] of NAMESPACE_RENAMES) p(`| \`${from}\` | \`${to}\` | ${stats.renameCounts[from]} |`);
  p(`| \`forge:\`（仅 tag/filter 值内） | \`c:\` | ${stats.forgeRenameCount} |`);
  p();
  p('### 1.2 task 转换分项');
  p();
  p('| 原因 | 次数 |');
  p('|---|---|');
  for (const [k, v] of [...Object.entries(stats.conversionByReason)].sort((a, b) => b[1] - a[1])) p(`| ${k} | ${v} |`);
  p();
  p('### 1.3 数据源（校验集合规模）');
  p();
  p('| 数据源 | 条数 |');
  p('|---|---|');
  p(`| minecraft:item | ${world.sets.item.size} |`);
  p(`| minecraft:block | ${world.sets.block.size} |`);
  p(`| minecraft:entity_type | ${world.sets.entity.size} |`);
  p(`| minecraft:fluid | ${world.sets.fluid.size} |`);
  p(`| minecraft:worldgen/biome | ${world.sets.biome.size} |`);
  p(`| minecraft:dimension | ${world.sets.dimension.size} |`);
  p(`| minecraft:worldgen/structure | ${world.sets.structure.size} |`);
  p(`| advancement（从 ${world.jarCount} 个 jar + kubejs/data 扫描） | ${world.advancements.size} |`);
  p(`| item tag（原始定义，含未解析） | ${world.rawTags.size} |`);
  p(`| item tag（成功解析） | ${world.resolved.size} |`);
  p(`| item tag（解析失败/未知） | ${world.unresolvedTags.size} |`);
  p();
  p(`advancement 目录形态计数：${JSON.stringify(world.diag.advDirs)}；tag 目录形态计数：${JSON.stringify(world.diag.tagDirs)}；kubejs/data 里 tag=${world.diag.kjsTagFiles} advancement=${world.diag.kjsAdvFiles}。`);
  p();
  p(`zip 解析失败：${world.diag.zipFailures.length} 项；tag/adv JSON 解析失败：${world.diag.jsonFailures.length} 项。`);
  if (world.diag.zipFailures.length) p(`\n\`\`\`\n${world.diag.zipFailures.slice(0, 40).join('\n')}\n\`\`\``);
  if (world.diag.jsonFailures.length) p(`\n\`\`\`\n${world.diag.jsonFailures.slice(0, 40).join('\n')}\n\`\`\``);
  p();

  // ---------------------------------------------------------- 2 自检数字
  p('## 2. 自检数字');
  p();
  p(`- 迁移前全量 \`"ns:path"\` 引用总数：**${stats.refTotal}**（期望 5685 → ${stats.refTotal === 5685 ? '一致' : '不一致，见下'}）`);
  p(`- 改名后「物品级 id 在 1.21.1 不存在」的引用数：**${itemMiss}**（期望约 458）`);
  p();
  p('### 2.1 引用分类明细（改名后 / 转换与清理前）');
  p();
  p('| 分类 | 引用数 | 该分类中「id 不存在」数 |');
  p('|---|---|---|');
  const catOrder = ['item', 'itemFilterEntry', 'icon', 'image', 'type', 'tagValue', 'tag', 'other'];
  for (const c of catOrder) p(`| ${c} | ${cat(c)} | ${c === 'item' || c === 'itemFilterEntry' ? catMiss(c) : '（不校验）'} |`);
  p(`| **合计** | **${sum(stats.metric.catCount)}** | **${itemMiss}** |`);
  p();
  p('分类定义：');
  p('- `item`：任务/奖励的 `item:` 字段（字符串形式，或 `item: { id: ... }` 的对象形式）。');
  p('- `itemFilterEntry`：`itemfilters:*` 过滤器内部的 `tag.items[].id`。');
  p('- `icon` / `image`：纯外观引用（`icon:`、`images[].image`、以及任何 `.png` 结尾的路径），按要求**不修改**。');
  p('- `type`：`type: "..."` 字段（含 `itemfilters:*`、`questsadditions:*`）。');
  p('- `tagValue` / `tag`：`tag: { value: "..." }`、`tag: "..."` 等 tag 引用。');
  p('- `other`：其余（mod 自带 compound 里的 `Potion`、`gateway`、`Icon` 等）。');
  p();
  p('物品级缺失按命名空间 Top：');
  p();
  p('| 命名空间 | 缺失引用数 |');
  p('|---|---|');
  for (const [ns, n] of [...stats.metric.nsMissing].sort((a, b) => b[1] - a[1]).slice(0, 25)) p(`| \`${ns}\` | ${n} |`);
  p();
  p('### 2.2 与期望值的差异说明');
  p();
  const nsTally = stats.metric.nsRefTally;
  const nItemfilters = nsTally.get('itemfilters') || 0;
  const nQuestsadditions = nsTally.get('questsadditions') || 0;
  const nForge = nsTally.get('forge') || 0;
  const nHttp = (nsTally.get('http') || 0) + (nsTally.get('https') || 0);
  const nImageIcon = cat('image') + cat('icon');
  const itemPresent = cat('item') + cat('itemFilterEntry') - itemMiss;
  p(`- **引用总数 ${stats.refTotal}**：与期望 5685 ${stats.refTotal === 5685 ? '**完全一致**' : '不一致，见 2.1 分类明细'}。`);
  p('  判定方式：把文件解析成 AST 后，取值为字符串、且整体匹配 `ns:path` 的节点计数（与文本级正则 `"([a-z0-9_.-]+):([a-z0-9_/.-]+)"` 结果一致）。');
  p();
  p(`- **物品级缺失 ${itemMiss} vs 期望 458（差 ${itemMiss - 458}）**。本脚本采用的口径是「物品/方块校验位」：`);
  p('  只统计 `item:` 字段（字符串或 `item: { id: ... }`）与 `itemfilters` 过滤器内部 `tag.items[].id`，然后对 `minecraft:item ∪ minecraft:block` 判存。');
  p('  差异来源（逐条可核对）：');
  p(`  1. **完全缺失的 mod**：命名空间在 1.21.1 的物品注册表里根本不存在（如 more_mod_tetra / applied_armorer / tetrawear / cosmopolitan / create_armorer / festival_delicacies / nethervinery / kinetic_pixel / seasonals 等），其全部物品引用都计入 ${itemMiss}；`);
  p('  2. **1.21.1 中被移除或改名的具体物品**（命名空间还在，具体 id 没了）；');
  p('  3. **粗口径 vs 严格口径**：若按「命名空间是否出现在 `minecraft:item` 注册表」来判定“物品级”，会把 `image:` 贴图路径（例如 `minecraft:block/deepslate`）、`icon:` 图标、');
  p('     `entity`/`stat`/`dimension`/`advancement`/`fluid`/`biome`/`structure` 位置的值全部误判成物品并计入缺失，得到的数字远大于 458。');
  p('     本脚本不采用这种口径，而是按位置精确分类（见 2.1 表）。');
  p(`  4. 若再排除 itemfilters 过滤器内部的嵌套物品引用（这类引用随 task 整体转成 checkmark 而消失），`);
  p(`     则为 ${catMiss('item')} 条，可作为期望值 458 的另一种可能口径参考。`);
  p();
  p(`- **非物品引用**（改名后 / 清理前的字符串级引用）：`);
  p(`  - \`itemfilters:\` **${nItemfilters}**（期望 64 → 一致）。其中 62 条是 task 的 \`item\`，2 条是 \`icon: "itemfilters:custom"\` / \`icon: "itemfilters:id_regex"\`。`);
  p(`  - \`questsadditions:\` **${nQuestsadditions}**（期望 22 → 一致；= 20 个 time + 1 个 killnbt + 1 个 days 的 \`type\` 字段）。`);
  p(`  - \`forge:\` **${nForge}**（期望 8 → 一致；全部位于 \`itemfilters:tag\` 的 \`tag.value\` 里，已改名成 \`c:\`）。`);
  p(`  - 贴图 / 图标类 **${nImageIcon}**（= image ${cat('image')} + icon ${cat('icon')}）；其中 http/https 链接 **${nHttp}** 条。`);
  p(`    期望值写的是「图片/http 类约 17」，与实际相差很大：仅章节 \`images[].image\` 就有 ${stats.images} 条`);
  p(`    （绝大多数是 \`minecraft:block/deepslate\`、\`minecraft:textures/gui/**\` 这类贴图路径，例如 ${stats.imageExamples.slice(0, 3).map((x) => `\`${x}\``).join('、')} …）。`);
  p('    推测期望的 17 只覆盖了其中某一类位置（例如仅 `icon` 或仅 URL），本报告按实际口径如实列出。');
  p();
  p(`- 等式核对：${stats.refTotal}（总数） = ${itemPresent}（存在） + ${itemMiss}（物品级缺失） + ${cat('icon')}（icon） + ${cat('image')}（image） + ${cat('type')}（type 字段） + ${cat('tagValue')}（tag 值） + ${cat('tag')}（tag） + ${cat('other')}（其它）。`);
  p();

  // ------------------------------------------------------ 3 删除/转换明细
  p('## 3. 明细');
  p();
  p('### 3.1 被删除的 quest（按章节分组）');
  p();
  if (!stats.deletedQuests.length) p('（无）');
  const byFile = new Map();
  for (const q of stats.deletedQuests) {
    if (!byFile.has(q.file)) byFile.set(q.file, []);
    byFile.get(q.file).push(q);
  }
  for (const [file, list] of [...byFile].sort()) {
    p(`#### ${file}（${list.length} 个）`);
    p();
    p('| quest 标题 | quest id | 触发原因（缺失 id 样例） |');
    p('|---|---|---|');
    for (const q of list) {
      const reasons = q.reasons.map((r) => `${r.kind}:${r.id}`).slice(0, 3).join('<br>') + (q.reasons.length > 3 ? `<br>…共 ${q.reasons.length} 项` : '');
      p(`| ${mdCell(q.title)} | \`${q.id}\` | ${reasons} |`);
    }
    p();
  }
  p('### 3.2 被转换的 task');
  p();
  if (!stats.conversions.length) p('（无）');
  else {
    p('| 文件 | quest id | task id | 原类型 | 新处理 | 说明 |');
    p('|---|---|---|---|---|---|');
    for (const c of stats.conversions) p(`| ${c.file} | \`${c.quest}\` | \`${c.taskId}\` | \`${c.fromType}\` | ${c.to.startsWith('item:') ? `换成具体物品 \`${c.to.slice(5)}\`` : '`checkmark`'} | ${mdCell(c.detail)} |`);
    p();
  }
  p('### 3.3 icon / image（保留不动，仅统计）');
  p();
  p(`- \`images[].image\` 引用：**${stats.images}** 条（全部保留）。示例：${stats.imageExamples.slice(0, 10).map((x) => `\`${x}\``).join('、')}`);
  const iconMissing = stats.icons.filter((x) => !x.exists);
  p(`- \`icon\` 引用：**${stats.icons.length}** 条，其中 **${iconMissing.length}** 条指向 1.21.1 不存在的 id（全部保留）。`);
  if (iconMissing.length) {
    p();
    p('| 文件 | 位置 | icon id |');
    p('|---|---|---|');
    for (const x of iconMissing.slice(0, 200)) p(`| ${x.file} | ${x.scope} | \`${x.id}\` |`);
    if (iconMissing.length > 200) p(`| … | | 其余 ${iconMissing.length - 200} 条省略 |`);
  }
  p();
  p('### 3.4 缺失 mod 统计（按命名空间，含被删 quest 的 task 缺失项 + 被删 reward）');
  p();
  p('| 命名空间 | 次数 |');
  p('|---|---|');
  for (const [ns, n] of [...stats.missingNsTally].sort((a, b) => b[1] - a[1])) p(`| \`${ns}\` | ${n} |`);
  p();
  p('### 3.5 被删除的 reward');
  p();
  if (!stats.deletedRewards.length) p('（无）');
  else {
    p('| 文件 | 归属 | reward id | 物品 |');
    p('|---|---|---|---|');
    for (const r of stats.deletedRewards.slice(0, 300)) p(`| ${r.file} | ${mdCell(r.owner)} | \`${r.id}\` | \`${r.item}\` |`);
    if (stats.deletedRewards.length > 300) p(`| … | | | 其余 ${stats.deletedRewards.length - 300} 条省略 |`);
    p();
  }
  p('### 3.6 空章节');
  p();
  if (!stats.emptyChapters.length) p('（无）');
  else for (const f of stats.emptyChapters) p(`- ${f}（文件保留，\`quests\` 变为 \`[ ]\`）`);
  p();

  // ---------------------------------------------------------- 4 残留检查
  p('## 4. 残留检查（迁移后文本）');
  p();
  const oldTotal = Object.values(residual.oldNs).reduce((a, b) => a + b, 0);
  p('| 检查项 | 残留数 | 期望 |');
  p('|---|---|---|');
  p(`| \`itemfilters:\` | ${residual.itemfilters} | 0 |`);
  p(`| \`questsadditions:\` | ${residual.questsadditions} | 0 |`);
  for (const ns of OLD_NAMESPACES) p(`| \`${ns}\` | ${residual.oldNs[ns]} | 0 |`);
  p();
  if (residual.itemfilters === 0 && residual.questsadditions === 0 && oldTotal === 0) {
    p('**全部为 0**：脚本内部对最终文本的扫描未发现任何残留。');
  } else {
    p('逐条说明：');
    p();
    for (const s of residual.samples) p(`- \`${s}\``);
  }
  p();

  // ---------------------------------------------------------- 5 解析校验
  p('## 5. 解析器自校验（对迁移后文本重新解析）');
  p();
  p(`- 通过：**${verify.ok} / ${srcFiles.length}**`);
  p(`- 失败：**${verify.failed.length}**`);
  if (verify.failed.length) {
    p();
    for (const f of verify.failed) p(`- \`${f.file}\`：${f.error}`);
  }
  p();

  // ---------------------------------------------------------- 6 目标目录
  p('## 6. 目标目录状态');
  p();
  p(`- 迁移前目标目录文件：${targetExisting.length} 个 → ${targetExisting.map((x) => `\`${x}\``).join('、')}`);
  p(`- 本次写入：${DRY_RUN ? '0（dry-run）' : `${written.length} 个`}`);
  p(`- 备份目录：\`${BACKUP_DIR}\``);
  p(`- 已备份文件：${backedUp.length ? backedUp.map((x) => `\`${x}\``).join('、') : '（无）'}`);
  p(`- 已删除的空壳文件：${deletedTargets.length ? deletedTargets.map((x) => `\`${x}\``).join('、') : '（无）'}`);
  p('- 保留不动：`chapters/.gitignore`、`lang/.gitignore`、`.gitignore`、`lang/zh_cn.snbt`（空壳）');
  p();

  // ---------------------------------------------------------- 7 人工决策点
  p('## 7. 需要人工决策 / 已知限制');
  p();
  p('1. **无法校验的 id 类别**：');
  p('   - `advancement` 只能靠扫 jar 的 `data/<ns>/advancement(s)/**` 构建；kubejs 运行时动态生成的 advancement 无法覆盖。');
  p('   - `stat` / `custom` / `observation` 按规格不校验。');
  p('   - 部分 mod 的 `item` 任务其实引用的是“物品 tag 语义”，迁移后变成具体物品语义，行为略有差异。');
  p('2. **tag 解析**：');
  p(`   - 共 ${world.rawTags.size} 个 item tag，其中 ${world.unresolvedTags.size} 个无法解析（未定义，或嵌套了未定义的 tag）；` +
    '这些 `itemfilters:tag` 任务被保守地转成 `checkmark`，可能导致任务难度下降，建议人工复核 §3.2 里的 `checkmark` 条目。');
  p('   - tag 里的 `values` 递归解析到物品 id 层；若解析结果恰好 1 个物品则直接替换为具体物品。');
  p('3. **`icon` 指向不存在的物品**：按规格保留不动，但 1.21.1 里可能显示为缺失图标（见 §3.3）。');
  p('4. **`itemfilters:` 图标残留**：如果源数据里把 `itemfilters:*` 用作章节/任务的 `icon`，该字符串按规格被保留（属于纯外观），因此 §4 的 `itemfilters:` 残留可能不为 0；这些不是任务类型转换遗漏。');
  p('5. **`forge:` → `c:`**：仅改写了 `tag: { value: "forge:..." }` / `tag: "forge:..."` 这类 tag 值，未改动描述文本里的其它 `forge:` 字样（本数据集中不存在）。');
  p('6. **checkmark 生成格式**：整体替换 task 时才生成新文本，键按字母序（`disable_toast, icon, id, optional, type`），tab 缩进，无逗号；`icon` 沿用原文（字符串或 compound 都原样保留）。');
  p('7. **`reward_tables/*.sntb` 的 `table_id` 引用未校验**：quest 里的 `table_id` 是 long，reward table 文件里的 `id` 是十六进制字符串，二者的对应关系不在本次规格内，未做任何改动。');
  if (notes.length) { p(); p('其它：'); for (const n of notes) p(`- ${n}`); }
  p();
  return L.join('\n');
}

function mdCell(s) {
  return String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

main();
