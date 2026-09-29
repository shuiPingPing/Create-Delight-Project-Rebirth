// 本机路径集中解析：脚本里不要再硬编码绝对路径（用户要求，2026-09-28）。
//
// - `REPO` / `WORKSPACE`：从本文件位置推导，任何机器、任何检出位置都对；
// - `REF_REPO` / `MC_HOME`：机器相关，用环境变量覆盖（约定见不入库的 `AGENTS.local.md`）；
// - `TMP`：仓库外的临时目录（`<工作区>/_dsh_tmp`），沿用历史约定。
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const WORKSPACE = path.resolve(REPO, '..');
export const TMP = path.join(WORKSPACE, '_dsh_tmp');
export const REF_REPO = process.env.CDPR_REF_REPO ?? path.join(WORKSPACE, 'CDR1201');
export const MC_HOME = process.env.CDPR_MC_HOME ?? path.join(WORKSPACE, '.minecraft');
export const MC_JAR = path.join(MC_HOME, 'versions', '1.21.1', '1.21.1.jar');
