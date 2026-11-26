import { createRequire } from 'node:module';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fields, first, nested, string, milliseconds } from './protobuf.mjs';

let DatabaseSync;
try {
  ({ DatabaseSync } = process.getBuiltinModule?.('node:sqlite')
    || (typeof import.meta?.url === 'string' && import.meta.url.startsWith('file:')
      ? createRequire(import.meta.url)('node:sqlite')
      : (typeof require === 'function' ? require('node:sqlite') : {})));
} catch { /* Older Node uses transcript fallback. */ }
const cache = new Map();

// Field numbers verified against Antigravity 2.31.0's bundled descriptors.
export function decodeGeneration(bytes) {
  const generation = fields(bytes);
  const chat = nested(generation, 1); // CortexStepGeneratorMetadata.chat_model
  const plannerConfig = nested(generation, 3); // CascadePlannerConfig
  const planExecute = nested(plannerConfig, 60); // PlanExecuteConfig
  const usage = nested(chat, 4); // ChatModelMetadata.usage
  const start = nested(chat, 9);
  const context = nested(start, 10); // ChatStartMetadata.context_window_metadata
  const breakdown = nested(context, 3);
  const modelEnum = first(chat, 3, 0) || null;
  const executionModelEnum = first(planExecute, 1, 0) || null;
  return {
    executionId: string(generation, 4), error: string(generation, 5),
    stepIndices: (generation.get(2) || []).flatMap(value => {
      if (typeof value === 'number') return [value];
      const indices = []; let index = 0, shift = 0;
      for (const byte of value) { index |= (byte & 127) << shift; if (byte & 128) shift += 7; else { indices.push(index); index = 0; shift = 0; } }
      return indices;
    }),
    modelName: string(chat, 21) || string(chat, 19),
    modelEnum,
    executionModelEnum,
    role: executionModelEnum ? (modelEnum === executionModelEnum ? 'execution' : 'planner') : '',
    providerInputTokens: usage.has(2) || usage.has(5) ? first(usage, 2, 0) + first(usage, 5, 0) : null,
    inputTokens: first(usage, 2, 0), cacheReadTokens: first(usage, 5, 0),
    outputTokens: first(usage, 3, 0),
    thinkingTokens: first(usage, 9, 0), responseTokens: first(usage, 10, 0),
    requestId: (() => { for (const bytes of chat.get(20) || []) { const entry = fields(bytes); if (string(entry, 1) === 'request_id') return string(entry, 2); } return ''; })(),
    retries: first(chat, 14, 0),
    retryErrors: (chat.get(17) || []).map(bytes=>string(fields(bytes),3)).filter(Boolean),
    ttftMs: milliseconds(first(chat, 11)), streamingMs: milliseconds(first(chat, 12)),
    context: first(context, 4, 0) > 0 ? {
      usedTokens: first(context, 1, 0), maxTokens: first(context, 4),
      categories: (breakdown.get(1) || []).map((bytes, index) => {
        const group = fields(bytes);
        const children = (group.get(5) || []).map(bytes => {
          const child = fields(bytes);
          return { label: string(child, 1), tokens: first(child, 3, 0) };
        });
        return { key: `group-${index}`, label: string(group, 1), tokens: first(group, 4, 0), children, tone: 'active' };
      })
    } : null
  };
}

function estimateTextTokens(text = '') {
  if (!text) return 0;
  let cjk = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF) || (code >= 0x3000 && code <= 0x303F) || (code >= 0xFF00 && code <= 0xFFEF)) cjk++;
  }
  const other = text.length - cjk;
  return Math.ceil(cjk * 1.15 + other / 3.8);
}

export function decodeCheckpointTokens(stepPayload) {
  if (!stepPayload || !stepPayload.length) return 0;
  try {
    const payload = fields(stepPayload);
    const cp = nested(payload, 30);
    if (!cp || !cp.size) return 0;
    const summary = string(cp, 5);
    let tokens = estimateTextTokens(summary);
    for (const reqBuf of cp.get(30) || []) {
      if (typeof reqBuf === 'number') continue;
      const reqText = string(fields(reqBuf), 1);
      tokens += estimateTextTokens(reqText);
    }
    const artifactCount = (cp.get(14) || []).length;
    tokens += Math.min(artifactCount, 200) * 35;
    return tokens > 0 ? Math.max(500, tokens) : 0;
  } catch { return 0; }
}

export function readDatabase(appDataDir, conversationId, { force = false } = {}) {
  const path = join(appDataDir, 'conversations', `${conversationId}.db`);
  if (!DatabaseSync || !existsSync(path)) return null;
  // WAL may change without touching the main database.
  const stamp = [path, `${path}-wal`].map(p => { try { const s = statSync(p); return `${s.mtimeMs}:${s.size}`; } catch { return ''; } }).join('|');
  const cached = cache.get(path);
  if (!force && cached?.stamp === stamp) return cached.value;
  let db;
  try {
    db = new DatabaseSync(path, { readOnly: true });
    db.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=1000;');
    const generations = [];
    for (const row of db.prepare('SELECT idx, data FROM gen_metadata ORDER BY idx').all()) {
      try { generations.push({ index: row.idx, ...decodeGeneration(row.data) }); } catch { /* Incomplete record. */ }
    }
    const times = new Map();
    const checkpointSteps = [];
    const cols = db.prepare('PRAGMA table_info(steps)').all().map(col => col.name);
    const hasStepType = cols.includes('step_type');
    const hasStatus = cols.includes('status');
    const hasPayload = cols.includes('step_payload');
    const stepQuery = hasStepType
      ? `SELECT idx, step_type${hasStatus ? ', status' : ''}, metadata FROM steps ORDER BY idx`
      : 'SELECT idx, metadata FROM steps ORDER BY idx';
    let latestCompletedCpIdx = -1;
    for (const row of db.prepare(stepQuery).all()) {
      if (hasStepType && row.step_type === 23) {
        checkpointSteps.push(row.idx);
        if (!hasStatus || row.status === 3) latestCompletedCpIdx = row.idx;
      }
      try {
        const f = fields(row.metadata);
        times.set(row.idx, {
          createdMs: milliseconds(first(f, 1)), viewableMs: milliseconds(first(f, 6)),
          finishedMs: milliseconds(first(f, 7)), completedMs: milliseconds(first(f, 8)),
          startedMs: milliseconds(first(f, 32))
        });
      } catch { /* Incomplete record. */ }
    }
    let latestCheckpoint = null;
    if (latestCompletedCpIdx >= 0) {
      let summaryTokens = 0;
      if (hasPayload) {
        try {
          const cpRow = db.prepare('SELECT step_payload FROM steps WHERE idx = ?').get(latestCompletedCpIdx);
          summaryTokens = decodeCheckpointTokens(cpRow?.step_payload);
        } catch {}
      }
      latestCheckpoint = { stepIndex: latestCompletedCpIdx, summaryTokens };
    }
    const value = { generations, times, checkpointSteps, latestCheckpoint };
    cache.set(path, { stamp, value });
    if (cache.size > 12) cache.delete(cache.keys().next().value);
    return value;
  } catch { return null; }
  finally { db?.close(); }
}
