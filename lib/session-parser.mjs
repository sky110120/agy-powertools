import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { contextSnapshot, modelContexts, shortModelName } from './context.mjs';
import { readDatabase } from './database.mjs';
import { requestEvents } from './analytics.mjs';
import { readProgress, resolveTurnExecution } from './progress.mjs';

export const getAppDataDir = () => process.env.ANTIGRAVITY_APP_DATA_DIR || join(homedir(), '.gemini', 'antigravity');
const validId = id => typeof id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(id);
const transcriptPath = (id, dir = getAppDataDir()) => join(dir, 'brain', id, '.system_generated', 'logs', 'transcript.jsonl');
const readLines = path => {
  try { return readFileSync(path, 'utf8').split('\n').filter(Boolean).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } }); }
  catch { return []; }
};
const cleanPrompt = content => {
  const raw = typeof content === 'string' ? content : '';
  return raw.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/)?.[1]?.trim() || raw.trim() || '会话';
};
const iso = ms => Number.isFinite(ms) ? new Date(ms).toISOString() : null;
const number = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0;
const elapsed = (start, end) => Number.isFinite(start) && Number.isFinite(end) && end >= start ? end - start : null;
const titleCache = new Map();

export function listRecentConversations({ appDataDir } = {}) {
  const dir = appDataDir || getAppDataDir();
  const brain = join(dir, 'brain');
  if (!existsSync(brain)) return [];
  return readdirSync(brain, { withFileTypes: true }).filter(d => d.isDirectory() && validId(d.name)).flatMap(d => {
    try { return [{ conversationId: d.name, updatedAtMs: statSync(transcriptPath(d.name, dir)).mtimeMs }]; }
    catch { return []; }
  }).sort((a, b) => b.updatedAtMs - a.updatedAtMs).slice(0, 12).map(s => {
    const cacheKey = `${dir}\0${s.conversationId}`;
    let cached = titleCache.get(cacheKey);
    if (cached?.mtime !== s.updatedAtMs) {
      const first = readLines(transcriptPath(s.conversationId, dir)).find(step => step.type === 'USER_INPUT');
      cached = { mtime: s.updatedAtMs, title: cleanPrompt(first?.content).split('\n')[0].slice(0, 60) };
      titleCache.set(cacheKey, cached);
      if (titleCache.size > 24) titleCache.delete(titleCache.keys().next().value);
    }
    return { ...s, title: cached.title, updatedAtIso: iso(s.updatedAtMs) };
  });
}

export function resolveConversationId(requestedId, { appDataDir } = {}) {
  const dir = appDataDir || getAppDataDir();
  if (requestedId) return validId(requestedId) && existsSync(transcriptPath(requestedId, dir)) ? requestedId : '';
  const envId = process.env.ANTIGRAVITY_CONVERSATION_ID;
  if (validId(envId) && existsSync(transcriptPath(envId, dir))) return envId;
  return listRecentConversations({ appDataDir: dir })[0]?.conversationId || '';
}

function classify(call) {
  const name = call?.name || 'tool';
  const args = Object.fromEntries(Object.entries(call?.args || {}).map(([key, value]) => {
    if (typeof value === 'string' && value.startsWith('"')) { try { value = JSON.parse(value); } catch {} }
    return [key, value];
  }));
  const path = args.Path || args.AbsolutePath || args.DirectoryPath || args.TargetFile || '';
  const file = basename(String(path).replace(/\\/g, '/'));
  let groupKey = 'other', groupLabel = '工具调用', itemLabel = name;
  if (/run_command|command_status/.test(name)) { groupKey = 'commands'; groupLabel = '命令'; itemLabel = args.toolSummary || args.CommandLine || name; }
  else if (/read_file|view_file|list_dir/.test(name)) { groupKey = 'reads'; groupLabel = '文件读取'; itemLabel = file || name; }
  else if (/write_file|edit_file|replace_file/.test(name)) { groupKey = 'edits'; groupLabel = '文件修改'; itemLabel = file || name; }
  else if (/search|find_by_name/.test(name)) { groupKey = 'searches'; groupLabel = '搜索'; itemLabel = args.query || args.Query || args.Pattern || name; }
  return { groupKey, groupLabel, itemLabel: String(itemLabel), detailTitle: args.CommandLine || path || JSON.stringify(args), toolName: name };
}

export function parseSessionData(requestedId, { includeSessions = true, strict = false, execution = null, appDataDir } = {}) {
  const dir = appDataDir || getAppDataDir();
  const conversationId = strict && !requestedId ? '' : resolveConversationId(requestedId, { appDataDir: dir });
  const sessions = includeSessions ? listRecentConversations({ appDataDir: dir }) : [];
  const steps = conversationId ? readLines(transcriptPath(conversationId, dir)) : [];
  const database = conversationId ? readDatabase(dir, conversationId) : null;
  const hookEvents = conversationId ? ['telemetry.jsonl', 'powertools-telemetry.jsonl'].flatMap(name => readLines(join(dir, 'brain', conversationId, '.system_generated', 'logs', name))) : [];
  const turns = [];
  let turn, modelName = '';
  let latestInput = 0, latestCache = 0, latestOutput = 0;
  let totalInput = 0, totalCache = 0, totalOutput = 0, orphanToolCount = 0;
  let modelTimeMs = 0, timedOutputTokens = 0, generationTimeMs = 0;
  const ttfts = [], toolIntervals = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const timing = database?.times.get(step.step_index);
    const createdMs = timing?.createdMs ?? (step.created_at ? Date.parse(step.created_at) : null);
    const completedMs = timing?.completedMs ?? timing?.finishedMs ?? null;
    if (step.type === 'USER_INPUT') {
      if (/^Error: The stream was interrupted/i.test(step.content || '')) continue;
      const selected = (step.content || '').match(/changed setting `Model Selection` from .*? to ([^\n]+?)\./);
      if (selected) modelName = selected[1].trim();
      const prompt = cleanPrompt(step.content);
      turn = {
        turnNumber: turns.length + 1, stepIndexStart: step.step_index, stepIndexEnd: step.step_index,
        prompt, promptTitle: prompt.split('\n')[0].slice(0, 90),
        startedAtMs: createdMs, startedAtIso: iso(createdMs), completedAtMs: null, completedAtIso: null,
        durationMs: null, workedDurationMs: null, inputTokens: 0, cacheReadTokens: 0,
        outputTokens: 0, contextTokens: 0, stepCount: 0, toolCalls: [], toolGroups: [],
        assistantPreview: '', status: 'running'
      };
      turns.push(turn);
      continue;
    }
    if (turn) {
      turn.stepCount++;
      turn.stepIndexEnd = step.step_index;
      if (['PLANNER_RESPONSE', 'GENERIC', 'ERROR_MESSAGE'].includes(step.type) && Number.isFinite(completedMs) && completedMs > (turn.completedAtMs || 0)) turn.completedAtMs = completedMs;
    }
    if (step.type === 'PLANNER_RESPONSE') {
      if (turn) {
        turn.status = 'running';
        if (step.model) turn._stepModel = step.model;
      }
      const input = number(step.input_tokens), cached = number(step.cache_read_tokens), output = number(step.output_tokens);
      totalInput += input; totalCache += cached; totalOutput += output;
      if (turn) {
        turn.inputTokens += input; turn.cacheReadTokens += cached; turn.outputTokens += output;
      }
      if (input + cached + output) {
        latestInput = input; latestCache = cached; latestOutput = output;
        if (turn) turn.contextTokens = input + cached;
      }
      if (turn && step.content) turn.assistantPreview = step.content.slice(0, 240);
      const duration = elapsed(createdMs, timing?.finishedMs ?? timing?.completedMs);
      const ttft = elapsed(createdMs, timing?.viewableMs);
      if (duration !== null && output > 0) {
        modelTimeMs += duration;
        const streamMs = elapsed(timing?.viewableMs, timing?.finishedMs);
        if (streamMs > 0) { timedOutputTokens += output; generationTimeMs += streamMs; }
        if (ttft !== null) ttfts.push(ttft);
      }
      const calls = Array.isArray(step.tool_calls) ? step.tool_calls : [];
      for (let c = 0; c < calls.length; c++) {
        const result = steps[i + 1 + c];
        const content = result?.type === 'GENERIC' ? result.content || '' : '';
        const resultTiming = database?.times.get(result?.step_index);
        const matchTime = label => { const m = content.match(new RegExp(`${label}:\\s*([^\\r\\n]+)`)); return m ? Date.parse(m[1]) : null; };
        const start = resultTiming?.startedMs ?? matchTime('Created At');
        const end = resultTiming?.completedMs ?? matchTime('Completed At');
        const durationMs = elapsed(start, end);
        if (durationMs !== null) toolIntervals.push([start, end]);
        if (turn) {
          if (Number.isFinite(end) && end > (turn.completedAtMs || 0)) turn.completedAtMs = end;
          turn.toolCalls.push({
            id: `step-${step.step_index}-tool-${c}`, stepIndex: step.step_index, ...classify(calls[c]),
            startedAtIso: iso(start), completedAtIso: iso(end), durationMs,
            outputPreview: content.replace(/^(Created At|Completed At):[^\r\n]*[\r\n]+/gm, '').slice(0, 1600)
          });
        } else {
          orphanToolCount++;
        }
      }
      if (turn && !calls.length && step.content) turn.status = 'complete';
    }
    if (turn && step.type === 'ERROR_MESSAGE') turn.status = 'error';
  }
  if (turns.length) turns[turns.length - 1] = resolveTurnExecution(turns.at(-1), execution, conversationId, steps);
  for (let i = 0; i < turns.length; i++) {
    const t = turns[i];
    if (i < turns.length - 1 && t.status === 'running') t.status = 'stopped';
    t.completedAtIso = iso(t.completedAtMs);
    t.durationMs = elapsed(t.startedAtMs, t.completedAtMs);
    t.workedDurationMs = t.durationMs;
    const groups = new Map();
    for (const call of t.toolCalls) {
      if (!groups.has(call.groupKey)) groups.set(call.groupKey, { groupKey: call.groupKey, groupLabel: call.groupLabel, items: [] });
      groups.get(call.groupKey).items.push(call);
    }
    t.toolGroups = [...groups.values()];
  }
  // Index ordered turn ranges once per generation, including gaps in the transcript.
  const generationsByTurn = new Map();
  function ownerOf(index) {
    if (!Number.isInteger(index)) return -1;
    let lo = 0, hi = turns.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (turns[mid].stepIndexEnd < index) lo = mid + 1;
      else hi = mid;
    }
    return turns[lo]?.stepIndexStart <= index ? lo : -1;
  }
  for (const generation of database?.generations || []) {
    let owner = -1;
    for (const index of generation.stepIndices || []) {
      const candidate = ownerOf(index);
      if (candidate >= 0 && (owner < 0 || candidate < owner)) owner = candidate;
    }
    if (owner < 0) continue;
    const turn = turns[owner];
    if (!generationsByTurn.has(turn)) generationsByTurn.set(turn, []);
    generationsByTurn.get(turn).push(generation);
  }
  for (const t of turns) {
    const turnGens = generationsByTurn.get(t) || [];
    const rawModels = turnGens.map(g => g.modelName).filter(Boolean);
    const models = [];
    const shortModels = [];
    const seenShorts = new Set();
    for (const m of rawModels) {
      if (!models.includes(m)) models.push(m);
      const sm = shortModelName(m);
      if (sm && !seenShorts.has(sm)) {
        seenShorts.add(sm);
        shortModels.push(sm);
      }
    }
    const fallbackModel = t._stepModel || modelName || '';
    t.modelName = rawModels.at(-1) || fallbackModel;
    t.models = models.length ? models : (t.modelName ? [t.modelName] : []);
    t.shortModel = shortModels.length ? shortModels.join(' → ') : (t.modelName ? shortModelName(t.modelName) : '');

    let genInput = 0, genCache = 0, genOutput = 0, genThinking = 0;
    for (const g of turnGens) {
      genInput += number(g.inputTokens);
      genCache += number(g.cacheReadTokens);
      genOutput += number(g.outputTokens);
      genThinking += number(g.thinkingTokens);
    }
    if (!turnGens.length || (genInput + genCache + genOutput === 0 && (t.inputTokens + t.cacheReadTokens + t.outputTokens > 0))) {
      genInput = t.inputTokens;
      genCache = t.cacheReadTokens;
      genOutput = t.outputTokens;
      genThinking = 0;
    }
    t.newInputTokens = genInput;
    t.cacheReadTokens = genCache;
    t.totalInputTokens = genInput + genCache;
    t.outputTokens = genOutput;
    t.thinkingTokens = genThinking;
    t.cacheHitPercent = t.totalInputTokens > 0 ? Number((genCache / t.totalInputTokens * 100).toFixed(1)) : null;
    t.requestCount = turnGens.length;

    let sumOut = 0, sumDur = 0;
    for (const g of turnGens) {
      if (!(g.outputTokens > 0)) continue;
      const isStreamed = Boolean(g.streamingMs != null && g.streamingMs >= 500 && g.outputTokens >= 20);
      const dur = isStreamed ? g.streamingMs : (g.ttftMs != null && g.streamingMs != null ? g.ttftMs + g.streamingMs : null);
      if (dur != null && dur > 0) {
        sumOut += g.outputTokens;
        sumDur += dur;
      }
    }
    t.tps = sumDur > 0 ? Number((sumOut * 1000 / sumDur).toFixed(1)) : null;
    delete t._stepModel;
  }
  let toolTimeMs = 0, interval = null;
  for (const next of toolIntervals.sort((a, b) => a[0] - b[0])) {
    if (!interval || next[0] > interval[1]) { if (interval) toolTimeMs += interval[1] - interval[0]; interval = [...next]; }
    else interval[1] = Math.max(interval[1], next[1]);
  }
  if (interval) toolTimeMs += interval[1] - interval[0];
  const latestGen = database?.generations.filter(g => g.context || g.providerInputTokens > 0).at(-1);
  if (latestGen?.modelName) modelName = latestGen.modelName;
  // Provider completion timings are persisted with each generation.
  const timed = database?.generations.filter(g => g.outputTokens > 0 && g.streamingMs > 0 && g.ttftMs !== null) || [];
  if (timed.length) {
    modelTimeMs = timed.reduce((n, g) => n + g.ttftMs + g.streamingMs, 0);
    generationTimeMs = timed.reduce((n, g) => n + g.streamingMs, 0);
    timedOutputTokens = timed.reduce((n, g) => n + g.outputTokens, 0);
    ttfts.splice(0, ttfts.length, ...timed.map(g => g.ttftMs));
  }
  const context = contextSnapshot(latestGen, latestInput + latestCache, database?.latestCheckpoint || null);
  const multiModel = modelContexts(database?.generations || [], database?.checkpointSteps || [], context);
  const requests = requestEvents(database, conversationId);
  if (totalInput + totalCache + totalOutput === 0 && requests.length > 0) {
    for (const r of requests) {
      totalInput += number(r.inputTokens);
      totalCache += number(r.cacheReadTokens);
      totalOutput += number(r.outputTokens);
    }
  }
  const totalInputAndCache = totalInput + totalCache;
  const errors = steps.filter(s => s.type === 'ERROR_MESSAGE').map(s => ({ id: `step-${s.step_index}`, timestampMs: database?.times.get(s.step_index)?.createdMs ?? Date.parse(s.created_at), message: s.content || '', stepIndex: s.step_index }));
  const speeds = requests.map(r => r.tps).filter(Number.isFinite);
  const completeRequests = requests.filter(r => r.tps != null && r.outputTokens > 0);
  const requestDuration = completeRequests.reduce((sum, r) => sum + (r.tpsDurationMs > 0 ? r.tpsDurationMs : r.durationMs), 0);
  return {
    conversationId, sessions, modelName: modelName || '未知模型', hookEventsCount: hookEvents.length,
    contextWindow: {
      ...context,
      ...multiModel,
      inputTokens: latestGen?.inputTokens ?? latestInput,
      cacheReadTokens: latestGen?.cacheReadTokens ?? latestCache,
      outputTokens: latestGen?.outputTokens ?? latestOutput
    },
    telemetry: {
      turnCount: turns.length, stepCount: steps.length,
      modelTimeMs: modelTimeMs || null, toolTimeMs: toolIntervals.length ? toolTimeMs : null,
      avgTtftMs: ttfts.length ? Math.round(ttfts.reduce((a, b) => a + b, 0) / ttfts.length) : null,
      tps: requestDuration > 0 ? Number((completeRequests.reduce((sum, r) => sum + r.outputTokens, 0) * 1000 / requestDuration).toFixed(1)) : null,
      peakTps: speeds.length ? Math.max(...speeds) : null,
      latestTps: speeds.at(-1) ?? null, requestCount: requests.length, errorCount: errors.length + requests.filter(r => r.error).length,
      thinkingTokens: requests.reduce((n, r) => n + r.thinkingTokens, 0),
      toolCount: turns.reduce((n, t) => n + t.toolCalls.length, 0) + orphanToolCount,
      timedOutputTokens, generationTimeMs: generationTimeMs || null,
      totalTokens: totalInputAndCache + totalOutput, inputTokens: totalInput,
      cacheReadTokens: totalCache, outputTokens: totalOutput,
      cacheHitPercent: totalInputAndCache > 0 ? Number((totalCache / totalInputAndCache * 100).toFixed(1)) : null
    }, turns, requests, errors, progress: readProgress(dir, conversationId, turns, steps, Date.now(), database, execution)
  };
}

export function exportTranscript(conversationId, targetTurnNumber, { appDataDir } = {}) {
  const dir = appDataDir || getAppDataDir();
  if (!validId(conversationId) || !existsSync(transcriptPath(conversationId, dir))) throw new Error('找不到源会话');
  const data = parseSessionData(conversationId, { includeSessions: false, appDataDir: dir });
  const turnNumber = targetTurnNumber ?? data.turns.length;
  if (!Number.isInteger(turnNumber) || turnNumber < 1 || turnNumber > data.turns.length) throw new Error('轮次不存在');
  const next = data.turns[turnNumber];
  const steps = readLines(transcriptPath(conversationId, dir)).filter(s => !next || s.step_index < next.stepIndexStart);
  const lines = ['# 会话上下文', `源会话: ${conversationId}`, `截至轮次: ${turnNumber}`, ''];
  for (const step of steps) {
    if (step.type === 'USER_INPUT') lines.push('## 用户', cleanPrompt(step.content), '');
    else if (step.type === 'PLANNER_RESPONSE') {
      if (step.content) lines.push('## 助手', step.content, '');
      if (step.tool_calls?.length) lines.push('## 工具调用', JSON.stringify(step.tool_calls, null, 2), '');
    } else if (step.type === 'GENERIC' || step.type === 'ERROR_MESSAGE') lines.push(`## ${step.type === 'GENERIC' ? '工具结果' : '错误'}`, step.content || '', '');
  }
  const markdownTranscript = lines.join('\n');
  const scratchDir = join(dir, 'brain', conversationId, 'scratch');
  mkdirSync(scratchDir, { recursive: true });
  const stem = `branch-turn-${turnNumber}-${randomUUID()}`;
  const snapshotPath = join(scratchDir, `${stem}.md`), rawSnapshotPath = join(scratchDir, `${stem}.jsonl`);
  writeFileSync(snapshotPath, markdownTranscript, 'utf8');
  writeFileSync(rawSnapshotPath, steps.map(s => JSON.stringify(s)).join('\n') + '\n', 'utf8');
  return {
    snapshotPath, rawSnapshotPath, markdownTranscript,
    turnNumber
  };
}
