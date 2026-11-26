import { readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { devToolsPortFile } from './paths.mjs';
import { getAppDataDir } from './session-parser.mjs';
import { createNativeDeclarationCache } from './native-cache.mjs';
import { checkForUpdates, createUpdateCheckStore, projectInfo } from './updates.mjs';
import { startUpdate, updateStatus } from './update-manager.mjs';
export { declaredNativeNames } from './native-cache.mjs';
import { createSettingsStore, DEFAULT_SETTINGS } from './settings.mjs';
import { usageDashboard } from './analytics.mjs';
import { createPricingStore, estimateCost } from './pricing.mjs';
import { createQuotaTracker } from './quota.mjs';
import { createAccountsStore } from './accounts.mjs';
import { installationPaths } from './lifecycle.mjs';
import { checkProxyPortOpen, inspectProxyRuntime, probeProxyConnectivity } from './proxy.mjs';
import { estimateRequestsCost, summarizeSubagentSession } from './subagents.mjs';
import { copyLocalFile, discoverOpenWithApps, isRemoteSshEnvironment, openFileWithApp, openLocalFile, readLocalFileForAttach, resolveVerifiedLocalFilePath, scheduleRelaunchWithDebugPort } from './launcher.mjs';
import { createRemoteTelemetryBridge, parseSshWindowTitle, resolveRemotePosixPath } from './ssh-remote.mjs';
import { createWslCdpBridge, isWslEnvironment } from './wsl.mjs';
import { searchTranscripts } from './transcript-search.mjs';

export function pricedSession(parsed, rates, settings) {
  const requests = parsed.requests || [];
  const cost = list => estimateRequestsCost(list, rates, { pricingMode: settings.pricingMode || 'standard' });
  // Requests may arrive out of order. Turn ranges are chronological and disjoint.
  const indexed = requests.filter(r => Number.isInteger(r.stepIndex)).sort((a,b) => a.stepIndex - b.stepIndex);
  let next = 0;
  const turns = (parsed.turns || []).map(turn => {
    while (next < indexed.length && indexed[next].stepIndex < turn.stepIndexStart) next++;
    const start = next;
    while (next < indexed.length && indexed[next].stepIndex <= turn.stepIndexEnd) next++;
    return { ...turn, costUsd: next > start ? cost(indexed.slice(start, next)) : null };
  });
  return { ...parsed, turns, costUsd: cost(requests), settings };
}

const scriptPath = join(dirname(fileURLToPath(import.meta.url)), 'native-ui.js');
const HUB_TITLE_RE = /(?:(?:^| - |\(\d+\) )Antigravity(?:\s*(?:\([^)]+\)|\[[^\]]+\]))?|(?:\s|^)(?:\((?:SSH|WSL):\s*[^)]+\)|\[(?:SSH|WSL):\s*[^\]]+\]))$/;
const HUB_PATH_RE = /^\/(?:c\/[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}|powertools|customizations|automations)(?:\/|$)/;
const SWARM_TARGET_RE = /^plugin:\/\/swarm--swarm_board-/i;
const isLoopbackHttpsPage = target => {
  try {
    const url = new URL(target.url);
    return target.type === 'page' && url.protocol === 'https:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  } catch { return false; }
};
export const isHubTarget = target => {
  if (!isLoopbackHttpsPage(target)) return false;
  try {
    return HUB_TITLE_RE.test(target.title || '') || HUB_PATH_RE.test(new URL(target.url).pathname);
  } catch { return false; }
};
export const isSwarmTarget = target => target?.type === 'iframe' && SWARM_TARGET_RE.test(target?.url || '');

export function connectCdp(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const pending = new Map();
    let sequence = 0;
    const listeners = new Set();
    const timeout = setTimeout(() => { socket.close(); reject(new Error('调试接口连接超时')); }, 4000);
    const close = () => {
      for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error('调试接口已断开')); }
      pending.clear();
    };
    socket.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('调试接口不可用')); });
    socket.addEventListener('close', close);
    socket.addEventListener('message', event => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      const p = pending.get(message.id);
      if (p) {
        clearTimeout(p.timer); pending.delete(message.id);
        if (message.error) p.reject(new Error(message.error.message)); else p.resolve(message.result);
      } else for (const listener of listeners) listener(message);
    });
    socket.addEventListener('open', () => {
      clearTimeout(timeout);
      resolve({
        socket,
        onEvent: listener => listeners.add(listener),
        send(method, params = {}) {
          if (socket.readyState !== WebSocket.OPEN) return Promise.reject(new Error('调试接口已断开'));
          return new Promise((resolve, reject) => {
            const id = ++sequence;
            const timeoutMs = ['Page.captureScreenshot', 'Runtime.evaluate'].includes(method) ? 15000 : 5000;
            const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} 超时`)); }, timeoutMs);
            pending.set(id, { resolve, reject, timer });
            socket.send(JSON.stringify({ id, method, params }));
          });
        }
      });
    });
  });
}

export function findIdentifier(result, keys = ['conversationId', 'conversation_id', 'cascadeId', 'cascade_id']) {
  if (!result || typeof result !== 'object') return null;
  for (const key of keys) if (typeof result[key] === 'string' && result[key]) return result[key];
  for (const value of Object.values(result)) {
    if (value && typeof value === 'object') { const id = findIdentifier(value, keys); if (id) return id; }
  }
  return null;
}

const nativeDeclarations=createNativeDeclarationCache();
const pluginVersion=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version;
const CUSTOM_I18N_MAX_BYTES = 512 * 1024;
const CUSTOM_I18N_MAX_ENTRIES = 2000;

import { getLocalePack, LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from './locales/index.mjs';

export function loadCustomI18n(dataDir = join(homedir(), '.gemini', 'antigravity', 'plugin_data', 'agy-powertools'), language = 'zh-CN') {
  const filePath = join(dataDir, 'custom-i18n.json');
  try {
    const st = statSync(filePath);
    if (!st.isFile() || st.size <= 0 || st.size > CUSTOM_I18N_MAX_BYTES) return [];
    const raw = JSON.parse(readFileSync(filePath, 'utf8'));
    const builtIn = language === 'zh-CN' || language === 'zh-TW';
    const parsed = raw?.[language] || (builtIn ? raw : {});
    const pairs = [];
    const pushPair = (k, v) => {
      if (pairs.length >= CUSTOM_I18N_MAX_ENTRIES) return;
      if (typeof k !== 'string' || typeof v !== 'string') return;
      const cleanK = k.trim(), cleanV = v.trim();
      if (!cleanK || !cleanV || cleanK.length > 400 || cleanV.length > 400) return;
      pairs.push([cleanK, cleanV]);
    };
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (Array.isArray(item)) pushPair(item[0], item[1]);
      }
    } else if (parsed && typeof parsed === 'object') {
      for (const [k, v] of Object.entries(parsed)) pushPair(k, v);
    }
    return pairs;
  } catch {
    return [];
  }
}

function statStamp(filePath) {
  try {
    const st = statSync(filePath);
    return `${Math.trunc(st.mtimeMs)}:${st.size}`;
  } catch {
    return '0:0';
  }
}

export function conversationStateFilesStamp(conversationId, appDataDir = getAppDataDir()) {
  if (!conversationId || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(conversationId)) return '';
  const brainDir = join(appDataDir, 'brain', conversationId);
  const logsDir = join(brainDir, '.system_generated', 'logs');
  const dbBase = join(appDataDir, 'conversations', `${conversationId}.db`);
  return [
    statStamp(join(logsDir, 'transcript.jsonl')),
    statStamp(dbBase),
    statStamp(`${dbBase}-wal`),
    statStamp(join(logsDir, 'telemetry.jsonl')),
    statStamp(join(logsDir, 'powertools-telemetry.jsonl')),
    statStamp(join(brainDir, 'task.md'))
  ].join('|');
}

export function nativeSource(origin,declaredNames=[],{dataDir=join(homedir(),'.gemini','antigravity','plugin_data','agy-powertools'), settingsObj=createSettingsStore(dataDir).get()}={}) {
  const dashboard=readFileSync(join(dirname(scriptPath),'dashboard.mjs'),'utf8').replaceAll('export function','function');
  const cache=readFileSync(join(dirname(scriptPath),'cache.mjs'),'utf8').replaceAll('export function','function');
  const accountHelpers=readFileSync(join(dirname(scriptPath),'account-helpers.mjs'),'utf8').replaceAll('export function','function');
  const zhTw=readFileSync(join(dirname(scriptPath),'zh-tw.mjs'),'utf8').replaceAll('export function','function');
  const bindings=readFileSync(join(dirname(scriptPath),'native-bindings.js'),'utf8');
  const aliases=['B','HC','IC','JC','KC','GC','Uy','XP','UP','TP','VP','dq','k0','Sy','kT','lT','mT','nT','um','HU','I','tc','Wb','IJ','LN','VD','Wz','YF','MUa','Gy','Shd','createProjectMsg'];
  const sshPaste=readFileSync(join(dirname(scriptPath),'native-ssh-paste.mjs'),'utf8').replaceAll('export function','function');
  const sidebarDrop=readFileSync(join(dirname(scriptPath),'native-sidebar-drop.mjs'),'utf8').replaceAll('export function','function');
  const composerDrop=readFileSync(join(dirname(scriptPath),'native-composer-drop.mjs'),'utf8').replaceAll('export function','function');
  const scripts=[sshPaste,sidebarDrop,composerDrop,...['native-client.js','native-i18n.js','calendar-vendor.js','native-fonts.js','native-panels.js','native-sidebar-monitor.js','native-ui.js'].map(name=>readFileSync(join(dirname(scriptPath),name),'utf8'))].join('\n');
  const customI18n=loadCustomI18n(dataDir,settingsObj.language);
  return `if(location.origin===${JSON.stringify(origin)} && window===window.top && (globalThis.__agyPowertools?.version!==${JSON.stringify(pluginVersion)}||globalThis.__agyPowertools?.status?.healthy===false) && !globalThis.__agyNativeBootPending){\nglobalThis.__agyDefaultSettings=${JSON.stringify(DEFAULT_SETTINGS)};\nglobalThis.__agyInitialSettings=${JSON.stringify(settingsObj)};\nglobalThis.__agyLanguages=${JSON.stringify(LANGUAGE_LABELS)};\nglobalThis.__agyLocalePack=${JSON.stringify(getLocalePack(settingsObj.language))};\nglobalThis.__agyCustomI18n=${JSON.stringify(customI18n)};\nglobalThis.__agyProject=${JSON.stringify(projectInfo())};\n(()=>{${dashboard}\n${cache}\n${accountHelpers}\n${zhTw}\nglobalThis.__agyToZhTw=toZhTw;\nglobalThis.__agyDashboard={modelIdentity,timestampToMs,resolveWeeklyQuotaWindow,dateRange,summarizeRequests,subscriptionIdentity,cacheObservation,distributionModels,annotateCacheAnomalies};\nglobalThis.__agyAccounts={quotaGroupMeta,accountBucketStatus,summarizeAccountQuota,formatRelativeTime,formatResetCountdown,formatCompactCountdown,accountInitials,selectAutoSwitchCandidate};})();\n${bindings}\nglobalThis.__agyNativeBootPending=true;\n(function boot(){if(!document.head||!document.body||!globalThis.ReactDOM?.createRoot||!globalThis.createFileRoute){setTimeout(boot,100);return;}try{globalThis.__agyPowertools?.dispose();const resolved=globalThis.__agyResolveNativeBindings(${JSON.stringify(declaredNames)});globalThis.__agyNativeBindings=resolved.bindings;globalThis.__agyNativeBindingNames=resolved.names;delete globalThis.__agyCompatibilityError;(function({${aliases.join(',')}}){\n${scripts}\n})(resolved.bindings);}catch(error){globalThis.__agyCompatibilityError=error.message;console.error(error);}finally{delete globalThis.__agyNativeBootPending;}})();\n}`;
}

export function swarmI18nSource(settingsObj = createSettingsStore().get(), { dataDir = join(homedir(), '.gemini', 'antigravity', 'plugin_data', 'agy-powertools') } = {}) {
  const zhTw = readFileSync(join(dirname(scriptPath), 'zh-tw.mjs'), 'utf8').replaceAll('export function', 'function');
  const i18n = readFileSync(join(dirname(scriptPath), 'native-i18n.js'), 'utf8');
  const initial = {
    enabled: settingsObj?.enabled !== false,
    language: SUPPORTED_LANGUAGES.includes(settingsObj?.language) ? settingsObj.language : DEFAULT_SETTINGS.language
  };
  const customI18n = loadCustomI18n(dataDir,initial.language);
  return `if(/^plugin:\\/\\/swarm--swarm_board-/i.test(location.href)){\nglobalThis.__agyInitialSettings=${JSON.stringify(initial)};\nglobalThis.__agyLanguages=${JSON.stringify(LANGUAGE_LABELS)};\nglobalThis.__agyLocalePack=${JSON.stringify(getLocalePack(initial.language))};\nglobalThis.__agyCustomI18n=${JSON.stringify(customI18n)};\n(()=>{${zhTw}\nglobalThis.__agyToZhTw=toZhTw;})();\n${i18n}\nglobalThis.__agyLocalization?.apply(globalThis.__agyInitialSettings.enabled?globalThis.__agyInitialSettings.language:'en',false);\n}`;
}

const isTransientTimeoutError = error => {
  const name = error?.name || '';
  const code = error?.code || error?.cause?.code || '';
  return name === 'TimeoutError' || name === 'AbortError' || code === 'ABORT_ERR' || code === 'UND_ERR_HEADERS_TIMEOUT' || code === 'UND_ERR_BODY_TIMEOUT';
};

export function startNativeIntegration({ parseSessionData, portFile, dataDir = join(homedir(),'.gemini','antigravity','plugin_data','agy-powertools'), onStatus = console.log, onMissingDebugPort, onDebugPortReady, connect=connectCdp,discover=nativeDeclarations, remoteTelemetry, wsl = isWslEnvironment(), createCdpBridge = createWslCdpBridge }) {
  const settings = createSettingsStore(dataDir);
  const pricing = createPricingStore(dataDir);
  const quota = createQuotaTracker(dataDir);
  const updateChecks = createUpdateCheckStore(dataDir);
  const remote = remoteTelemetry ?? createRemoteTelemetryBridge({ onStatus: message => status(message) });
  let wslBridge = null, usingWslBridge = false;
  let openWithCache = null, openWithCachedAt = 0;
  const listOpenWithApps = () => {
    const nowMs = Date.now();
    if (!openWithCache || nowMs - openWithCachedAt > 60000) {
      openWithCache = discoverOpenWithApps().map(({ id, label, kind, icon }) => ({ id, label, kind, icon }));
      openWithCachedAt = nowMs;
    }
    return openWithCache;
  };
  let relaunchPendingUntil = 0;
  const triggerRelaunch = (opts = {}) => {
    if (Date.now() < relaunchPendingUntil) throw new Error('正在重启 Antigravity，请稍候');
    const res = scheduleRelaunchWithDebugPort({ dataDir, home: installationPaths().home, ...opts });
    relaunchPendingUntil = Date.now() + 10000;
    return res;
  };
  const accounts = createAccountsStore(dataDir, {
    relaunch: opts => triggerRelaunch(opts)
  });
  const activePortFile = devToolsPortFile({portFile});
  const clients = new Map();
  const swarmClients = new Map();
  const localStateCache = new Map();
  let stateRevSeq = 0;
  let stopped = false, polling = false, lastStatus = '', debugPortReached = false, lastPageTargets = [];
  const status = message => { if (message !== lastStatus) { lastStatus = message; onStatus(`[native-ui] ${message}`); } };
  const knownAccountCount = () => { try { return accounts.list().accounts.length; } catch { return 0; } };
  const syncSwarmLanguage = () => {
    const cur = settings.get();
    const lang = cur.enabled ? cur.language : 'en';
    for (const swarmClient of swarmClients.values()) {
      void swarmClient.send('Runtime.evaluate', {
        expression: `globalThis.__agyLocalePack=${JSON.stringify(getLocalePack(lang))};globalThis.__agyCustomI18n=${JSON.stringify(loadCustomI18n(dataDir,lang))};globalThis.__agyLocalization?.apply(${JSON.stringify(lang)},false)`
      }).catch(() => {});
    }
  };
  const attachSwarm = async target => {
    const client = await connect(target.webSocketDebuggerUrl);
    client.endpoint = target.webSocketDebuggerUrl;
    client.url = target.url;
    swarmClients.set(target.id, client);
    client.socket.addEventListener('close', () => { if (swarmClients.get(target.id) === client) swarmClients.delete(target.id); });
    const source = swarmI18nSource(settings.get(), {dataDir});
    try {
      await client.send('Page.enable');
      const installed = await client.send('Page.addScriptToEvaluateOnNewDocument', { source });
      client.scriptId = installed?.identifier || '';
    } catch { /* Some iframe targets do not support Page.addScriptToEvaluateOnNewDocument. */ }
    const result = await client.send('Runtime.evaluate', { expression: source });
    if (result?.exceptionDetails) throw new Error(result.exceptionDetails.text);
  };
  const attach = async target => {
    const client = await connect(target.webSocketDebuggerUrl);
    const origin = new URL(target.url).origin;
    const mainFrame = (await client.send('Page.getFrameTree')).frameTree.frame.id;
    const contexts = new Set();
    const resolveHost = async () => {
      if (client.sshHost) return client.sshHost;
      if (client.sshKind !== 'ssh') return '';
      try {
        const res = await client.send('Runtime.evaluate', {
          expression: `(async()=>{let sshHost='';const ssh=globalThis.sshRemote;if(ssh?.kind==='ssh'&&typeof ssh.getState==='function'){try{const st=await ssh.getState();if(typeof st?.currentHost==='string')sshHost=st.currentHost.trim();}catch{}}return{sshHost,title:typeof document!=='undefined'?document.title||'':''};})()`,
          awaitPromise: true,
          returnByValue: true
        });
        const v = res.result?.value;
        const found = (v && typeof v === 'object' && v.sshHost ? String(v.sshHost).trim() : '')
          || (v && typeof v === 'object' ? parseSshWindowTitle(v.title) : '');
        if (found) client.sshHost = found;
      } catch { /* Keep unresolved if renderer is navigating. */ }
      return client.sshHost || '';
    };
    clients.set(target.id, client);
    client.socket.addEventListener('close', () => { if(clients.get(target.id)===client)clients.delete(target.id); });
    client.onEvent(async event => {
      if (event.method === 'Runtime.executionContextCreated') {
        const context = event.params.context;
        if (context.origin === origin && context.auxData?.isDefault && context.auxData.frameId === mainFrame) contexts.add(context.id);
        return;
      }
      if (event.method === 'Runtime.executionContextDestroyed') { contexts.delete(event.params.executionContextId); return; }
      if (event.method === 'Runtime.executionContextsCleared') { contexts.clear(); return; }
      if (event.method !== 'Runtime.bindingCalled' || event.params.name !== '__agyPowertoolsHost') return;
      if (!contexts.has(event.params.executionContextId)) return;
      let request;
      try { if (event.params.payload.length > 65536) return; request = JSON.parse(event.params.payload); } catch { return; }
      if (!Number.isInteger(request.id)) return;
      let reply;
      try {
        if(!settings.get().enabled&&!['i18n.pack','settings.get','settings.set','settings.reset','update.check','update.autoCheck','update.dismiss','update.install','update.status'].includes(request.method))throw new Error('Powertools 已关闭');
        if (request.method === 'state') {
          const sshHost = await resolveHost();
          const currentSettings = settings.get();
          const pricingMode = currentSettings.pricingMode || 'standard';
          if (sshHost) {
            const parsed = await remote.state(sshHost, { conversationId: request.conversationId, execution: request.execution });
            reply = pricedSession(parsed, pricing.get().rates, currentSettings);
          } else {
            const cid = typeof request.conversationId === 'string' ? request.conversationId : '';
            const filesStamp = conversationStateFilesStamp(cid);
            const hasRealFiles = Boolean(filesStamp && filesStamp !== '0:0|0:0|0:0|0:0|0:0|0:0');
            const ex = request.execution && typeof request.execution === 'object' ? request.execution : null;
            const execStamp = ex ? JSON.stringify(ex) : '';
            const pricingState = pricing.get();
            const pricingStamp = `${pricingState.checkedAt || ''}:${JSON.stringify(pricingState.rates || [])}`;
            const fingerprint = hasRealFiles
              ? `${filesStamp}#${execStamp}#${pricingMode}#${pricingStamp}#${JSON.stringify(currentSettings)}`
              : '';
            const cached = hasRealFiles ? localStateCache.get(cid) : null;
            if (cached && cached.fingerprint === fingerprint) {
              if (request.knownRev === cached.rev) {
                reply = { unchanged: true, conversationId: cid, stateRev: cached.rev };
              } else {
                reply = { ...cached.payload, stateRev: cached.rev };
              }
            } else {
              const parsed = parseSessionData(cid, { includeSessions: false, strict: true, execution: request.execution });
              const payload = pricedSession(parsed, pricingState.rates, currentSettings);
              // Local host and renderer share the same wall clock. Anchor the phase once per snapshot.
              if (payload.progress?.status === 'running' && Number.isFinite(payload.progress.phaseElapsedMs)) {
                payload.progress = { ...payload.progress, phaseStartedAtMs: Date.now() - payload.progress.phaseElapsedMs };
              }
              const rev = ++stateRevSeq;
              if (hasRealFiles) {
                localStateCache.delete(cid);
                localStateCache.set(cid, { fingerprint, rev, payload });
                if (localStateCache.size > 16) localStateCache.delete(localStateCache.keys().next().value);
              }
              reply = { ...payload, stateRev: rev };
            }
          }
        }
        else if (request.method === 'subagents.stats') {
          const ids = Array.isArray(request.conversationIds)
            ? [...new Set(request.conversationIds.filter(id => typeof id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(id)))].slice(0, 64)
            : [];
          const rates = pricing.get().rates;
          const pricingMode = settings.get().pricingMode || 'standard';
          const items = {};
          const sshHost = await resolveHost();
          const remoteSessions = sshHost && ids.length ? (await remote.subagents(sshHost, { conversationIds: ids }))?.sessions || {} : null;
          for (const id of ids) {
            try {
              const parsed = remoteSessions ? remoteSessions[id] : parseSessionData(id, { includeSessions: false, strict: true });
              const summary = summarizeSubagentSession(parsed, rates, { pricingMode });
              if (summary && (summary.telemetry?.stepCount > 0 || summary.telemetry?.requestCount > 0 || summary.contextWindow?.usedTokens > 0)) {
                items[id] = summary;
              }
            } catch { /* Skip unreadable or uninitialized subagent. */ }
          }
          reply = { items };
        }
        else if (request.method === 'i18n.pack') reply = {pack:getLocalePack(request.language),custom:loadCustomI18n(dataDir,request.language)};
        else if (request.method === 'settings.get') reply = settings.get();
        else if (request.method === 'settings.set') {
          reply = settings.set(request.settings);
          syncSwarmLanguage();
        }
        else if (request.method === 'settings.reset') {
          reply = settings.reset();
          syncSwarmLanguage();
        }
        else if (request.method === 'dashboard') {
          const sshHost = await resolveHost();
          const activeEmail = typeof request.accountKey === 'string' ? request.accountKey.trim().toLowerCase() : '';
          if (!sshHost && activeEmail) quota.recordAccount(activeEmail, Date.now(), { knownAccountCount: knownAccountCount() });
          const data = sshHost
            ? await remote.dashboard(sshHost, { force: request.force === true })
            : usageDashboard(process.env.ANTIGRAVITY_APP_DATA_DIR || join(homedir(),'.gemini','antigravity'), { force:request.force===true });
          const prices=pricing.get();
          const pricingMode = settings.get().pricingMode || 'standard';
          const annotate = item => (!sshHost ? { ...item, accountEmail: quota.emailAt(item.timestampMs) } : item);
          reply={
            ...data,
            isRemoteSsh: Boolean(sshHost),
            pricing:{...prices,mode:pricingMode},
            quotaSamples:quota.samples(activeEmail),
            accountEmails:sshHost ? [] : quota.accounts(),
            activeAccountEmail:activeEmail,
            requests:data.requests.map(r=>({...annotate(r),costUsd:estimateCost(r,prices.rates,{pricingMode})})),
            errors:(data.errors||[]).map(annotate)
          };
        }
        else if (request.method === 'sessions.search') {
          if (!settings.get().sessionSearch) throw new Error('会话全文搜索功能已关闭');
          const sshHost = await resolveHost();
          const searchParams = {
            query: typeof request.query === 'string' ? request.query : '',
            scope: request.scope,
            conversationIds: Array.isArray(request.conversationIds) ? request.conversationIds : undefined,
            excludeIds: Array.isArray(request.excludeIds) ? request.excludeIds : undefined,
            maxResults: request.maxResults
          };
          reply = sshHost
            ? await remote.search(sshHost, searchParams)
            : searchTranscripts(searchParams.query, searchParams);
        }
        else if (request.method === 'update.check') {
          reply = await checkForUpdates({currentVersion:pluginVersion});
          updateChecks.recordResult(reply, { currentVersion: pluginVersion, clientVersion: typeof request.clientVersion === 'string' ? request.clientVersion : '' });
        }
        else if (request.method === 'update.autoCheck') {
          reply = await updateChecks.autoCheck({
            currentVersion: pluginVersion,
            clientVersion: typeof request.clientVersion === 'string' ? request.clientVersion : '',
            force: request.force === true,
            autoEnabled: settings.get().autoCheckUpdates !== false
          });
        }
        else if (request.method === 'update.dismiss') {
          reply = updateChecks.dismiss(typeof request.version === 'string' ? request.version : '', pluginVersion);
        }
        else if (request.method === 'update.install') reply = await startUpdate({currentVersion:pluginVersion,expectedVersion:request.version});
        else if (request.method === 'update.status') reply = updateStatus(undefined, pluginVersion);
        else if (request.method === 'pricing.refresh') reply = await pricing.refresh();
        else if (request.method === 'quota.observe') reply = quota.observe(request.groups,usageDashboard(process.env.ANTIGRAVITY_APP_DATA_DIR || join(homedir(),'.gemini','antigravity'), { force: request.force !== false }).requests,pricing.get().rates,Date.now(),request.accountKey,{ knownAccountCount: knownAccountCount(), pricingMode: settings.get().pricingMode || 'standard' });
        else if (typeof request.method === 'string' && request.method.startsWith('accounts.')) {
          if (!settings.get().multiAccount) throw new Error('多账号切换未启用');
          const sshHost = await resolveHost();
          if (sshHost) {
            if (request.method === 'accounts.list' || request.method === 'accounts.syncActive') {
              reply = { isRemoteSsh: true, activeId: '', accounts: [], vaultSupported: false };
            } else if (request.method === 'accounts.autoSwitchCandidate') {
              reply = { candidate: null, candidates: [], cooldownRemainingMs: 0, isRemoteSsh: true };
            } else {
              throw new Error('SSH 远端窗口不支持本地多账号切换');
            }
          }
          else if (request.method === 'accounts.list') reply = accounts.list();
          else if (request.method === 'accounts.syncActive') {
            reply = accounts.syncActive(request.snapshot);
            if (request.snapshot?.email && !reply?.credentialMismatch) quota.recordAccount(request.snapshot.email, Date.now(), { knownAccountCount: reply?.accounts?.length || knownAccountCount() });
          }
          else if (request.method === 'accounts.prepareAdd') reply = accounts.prepareAdd({ pendingAlias: request.pendingAlias });
          else if (request.method === 'accounts.completeAdd') {
            reply = accounts.completeAdd({
              email: request.email,
              prevEmail: request.prevEmail,
              prevCredHash: request.prevCredHash,
              triggerRelaunch: request.relaunch !== false
            });
            if (reply?.account?.email && !reply?.credentialMismatch && (reply.accountChanged || reply.relaunching || reply.manualRestartRequired)) quota.recordAccount(reply.account.email, Date.now(), { knownAccountCount: reply?.accounts?.length || knownAccountCount() });
          }
          else if (request.method === 'accounts.switch') {
            reply = accounts.switchAccount(request.accountId, { auto: request.auto === true, triggerRelaunch: request.relaunch !== false });
            if (reply?.account?.email) quota.recordAccount(reply.account.email, Date.now(), { knownAccountCount: reply?.accounts?.length || knownAccountCount() });
          }
          else if (request.method === 'accounts.rename') reply = accounts.renameAccount(request.accountId, request.alias);
          else if (request.method === 'accounts.setDisabled') reply = accounts.setDisabled(request.accountId, request.disabled);
          else if (request.method === 'accounts.reorder') reply = accounts.reorderAccounts(request.orderedIds);
          else if (request.method === 'accounts.refreshCredentials') reply = accounts.refreshCredentials({ accountId: request.accountId || '' });
          else if (request.method === 'accounts.refreshLocalQuotas') reply = accounts.refreshLocalQuotas({ accountId: request.accountId || '' });
          else if (request.method === 'accounts.remove') reply = accounts.removeAccount(request.accountId);
          else if (request.method === 'accounts.autoSwitchCandidate') reply = accounts.pickAutoSwitch(request.depletedGroupKey, { activeModel: typeof request.activeModel === 'string' ? request.activeModel : '' });
          else throw new Error('不支持的操作');
        }
        else if (request.method === 'proxy.status') {
          reply = {
            ...inspectProxyRuntime(settings.get(), process.env),
            canRelaunch: !isRemoteSshEnvironment(),
            relaunching: Date.now() < relaunchPendingUntil
          };
        }
        else if (request.method === 'proxy.test') {
          const targetUrl = typeof request.proxyUrl === 'string' ? request.proxyUrl : settings.get().proxyUrl;
          const probed = await probeProxyConnectivity(targetUrl);
          reply = { ok: probed.ok, reachable: probed.reachable, tunnelOk: probed.tunnelOk, latencyMs: probed.latencyMs, statusCode: probed.statusCode, url: probed.url, message: probed.error || '' };
        }
        else if (request.method === 'proxy.relaunch') {
          if (isRemoteSshEnvironment()) throw new Error('SSH 远端模式不支持重启本地客户端');
          const current = settings.get();
          if (current.proxyEnabled && current.proxyUrl && request.force !== true) {
            const portCheck = await checkProxyPortOpen(current.proxyUrl, 900);
            if (!portCheck.ok) {
              reply = { ok: false, portUnreachable: true, message: portCheck.error, host: portCheck.host, port: portCheck.port };
            } else {
              const launched = triggerRelaunch();
              reply = { ok: true, relaunching: Boolean(launched.scheduled), proxyActive: Boolean(launched.proxyActive) };
            }
          } else {
            const launched = triggerRelaunch();
            reply = { ok: true, relaunching: Boolean(launched.scheduled), proxyActive: Boolean(launched.proxyActive) };
          }
        }
        else if (request.method === 'file.open') {
          if (!settings.get().fileContextMenu) throw new Error('文件右键菜单已关闭');
          if (await resolveHost()) throw new Error('SSH 远端文件暂不支持在本地直接打开，请使用“复制路径”');
          reply = await openLocalFile(request.uri, { action: 'open' });
        }
        else if (request.method === 'file.openWithList') {
          if (!settings.get().fileContextMenu) throw new Error('文件右键菜单已关闭');
          if (await resolveHost()) {
            reply = { ok: true, sshUnsupported: true, apps: [] };
          } else {
            reply = { ok: true, apps: listOpenWithApps() };
          }
        }
        else if (request.method === 'file.openWith') {
          if (!settings.get().fileContextMenu) throw new Error('文件右键菜单已关闭');
          if (await resolveHost()) throw new Error('SSH 远端文件暂不支持在本地直接打开，请使用“复制路径”');
          reply = await openFileWithApp(request.uri, request.appId, {
            line: request.line ?? null,
            column: request.column ?? null
          });
        }
        else if (request.method === 'file.reveal') {
          if (!settings.get().fileContextMenu) throw new Error('文件右键菜单已关闭');
          if (await resolveHost()) throw new Error('SSH 远端文件暂不支持在本地直接打开，请使用“复制路径”');
          reply = await openLocalFile(request.uri, { action: 'reveal' });
        }
        else if (request.method === 'file.copy') {
          if (!settings.get().fileContextMenu) throw new Error('文件右键菜单已关闭');
          if (await resolveHost()) throw new Error('SSH 远端文件暂不支持在本地直接打开，请使用“复制路径”');
          reply = await copyLocalFile(request.uri);
        }
        else if (request.method === 'file.path') {
          if (!settings.get().fileContextMenu) throw new Error('文件右键菜单已关闭');
          const sshHost = await resolveHost();
          reply = { ok: true, path: sshHost ? resolveRemotePosixPath(request.uri) : await resolveVerifiedLocalFilePath(request.uri) };
        }
        else if (request.method === 'file.attach') {
          if (!settings.get().fileContextMenu) throw new Error('文件右键菜单已关闭');
          const sshHost = await resolveHost();
          if (sshHost) {
            const remotePath = resolveRemotePosixPath(request.uri);
            const cleanUri = String(request.uri || '').trim();
            const name = remotePath.split('/').filter(Boolean).pop() || remotePath;
            reply = { ok: true, mode: 'mention', kind: request.isDirectory ? 'directory' : 'file', uri: cleanUri, path: remotePath, name, isDirectory: Boolean(request.isDirectory) };
          } else {
            reply = await readLocalFileForAttach(request.uri);
          }
        }
        else throw new Error('不支持的操作');
      } catch (error) { reply = { error: error.message }; }
      try {
        await client.send('Runtime.evaluate', {
          expression: `globalThis.__agyPowertoolsReceive?.(${JSON.stringify(request.id)},${JSON.stringify(reply)})`,
          contextId: event.params.executionContextId
        });
      } catch { /* Navigation invalidates the old context. */ }
    });
    await client.send('Runtime.enable');
    await client.send('Runtime.addBinding', { name: '__agyPowertoolsHost' });
    const agent = await client.send('Runtime.evaluate', {
      expression: `(async()=>{const ua=navigator.userAgent||'';const ssh=globalThis.sshRemote;let sshHost='';if(ssh?.kind==='ssh'&&typeof ssh.getState==='function'){try{const st=await ssh.getState();if(typeof st?.currentHost==='string')sshHost=st.currentHost.trim();}catch{}}const isHub=Boolean(/Antigravity\\//.test(ua)||globalThis.electronNative||globalThis.sshRemote||globalThis.createFileRoute);return{ua,isHub,sshKind:ssh?.kind||'',sshHost,title:typeof document!=='undefined'?document.title||'':''};})()`,
      awaitPromise: true,
      returnByValue: true
    });
    const probe = agent.result?.value;
    if (probe && typeof probe === 'object' && probe.isHub === false) {
      client.socket.close();
      clients.delete(target.id);
      return;
    }
    const ua = typeof probe === 'string' ? probe : (probe && typeof probe === 'object' ? String(probe.ua || '') : '');
    const version = ua.match(/Antigravity\/([0-9.]+)/)?.[1] || 'unknown';
    client.sshKind = probe && typeof probe === 'object' ? String(probe.sshKind || '') : '';
    client.sshHost = (probe && typeof probe === 'object' && probe.sshHost ? String(probe.sshHost).trim() : '')
      || parseSshWindowTitle(target.title)
      || (probe && typeof probe === 'object' ? parseSshWindowTitle(probe.title) : '');
    const fallbackFetch = async (_origin, reqHeaders = {}) => {
      const fetchInit = reqHeaders && Object.keys(reqHeaders).length ? `,${JSON.stringify({ headers: reqHeaders })}` : '';
      const fetched = await client.send('Runtime.evaluate', {
        expression: `fetch('/main.js'${fetchInit}).then(async r=>({status:r.status,source:r.ok?await r.text():'',headers:{etag:r.headers.get('etag')||undefined,'last-modified':r.headers.get('last-modified')||undefined}}))`,
        awaitPromise: true, returnByValue: true
      });
      if (fetched.exceptionDetails || !fetched.result?.value) throw new Error('页面上下文读取原生界面组件失败');
      return fetched.result.value;
    };
    const isRemoteTarget = Boolean(client.sshHost || client.sshKind === 'ssh');
    client.declaredNames = await discover(origin, {
      version,
      fallbackFetch,
      ...(isRemoteTarget ? { cacheScope: 'ssh', preferFallback: true } : usingWslBridge ? { preferFallback: true } : {})
    });
    const source = nativeSource(origin,client.declaredNames,{dataDir});
    client.origin = origin;
    client.endpoint=target.webSocketDebuggerUrl;
    await client.send('Page.enable');
    const installed = await client.send('Page.addScriptToEvaluateOnNewDocument', { source });
    client.scriptId = installed.identifier;
    const result = await client.send('Runtime.evaluate', { expression: source });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    status('已接入原生输入框');
  };
  const poll = async () => {
    if (stopped || polling) return;
    polling = true;
    try {
      const port = Number(readFileSync(activePortFile, 'utf8').split('\n')[0]);
      if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('调试端口不可用');
      let targets;
      let directErr = null;
      if (!usingWslBridge) {
        try {
          const res = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(wsl ? 1500 : 5000) });
          if (res.ok === false) throw new Error(`调试接口返回异常 (${res.status})`);
          targets = await res.json();
        } catch (err) {
          directErr = err;
          if (!wsl) throw err;
        }
      }
      if (!targets && wsl) {
        try {
          if (!wslBridge) wslBridge = createCdpBridge();
          const ep = await wslBridge.endpointFor(port);
          const res = await fetch(`http://${ep.host}:${ep.port}/json/list`, { signal: AbortSignal.timeout(5000) });
          if (res.ok === false) throw new Error(`调试接口返回异常 (${res.status})`);
          const rawTargets = await res.json();
          if (!Array.isArray(rawTargets)) throw new Error('调试接口返回格式异常');
          targets = wslBridge.rewriteTargets(rawTargets, port);
          usingWslBridge = true;
        } catch (bridgeErr) {
          usingWslBridge = false;
          throw directErr || bridgeErr;
        }
      }
      if (!Array.isArray(targets)) throw new Error('调试接口返回格式异常');
      debugPortReached = true;
      try { onDebugPortReady?.(); } catch {}
      const hubs = targets.filter(t => isHubTarget(t) || (isLoopbackHttpsPage(t) && clients.get(t.id)?.origin === new URL(t.url).origin));
      lastPageTargets = targets.filter(isLoopbackHttpsPage).map(t => ({ title: String(t.title || ''), matched: hubs.includes(t) }));
      for (const target of hubs) {
        let client = clients.get(target.id);
        try {
          if(client&&(client.origin!==new URL(target.url).origin||client.endpoint!==target.webSocketDebuggerUrl)){
            client.socket.close();clients.delete(target.id);client=null;
          }
          if (!client) await attach(target);
          else {
            // A live CDP connection does not guarantee that its renderer survived.
            const result = await client.send('Runtime.evaluate', {
              expression: `location.origin===${JSON.stringify(client.origin)} && (!globalThis.__agyPowertools||globalThis.__agyPowertools.status?.healthy===false) && !globalThis.__agyNativeBootPending && !globalThis.__agyPowertoolsPending && document.readyState!=='loading'`,
              returnByValue: true
            });
            if (result.result?.value === true) {
              const restored = await client.send('Runtime.evaluate', { expression: nativeSource(client.origin,client.declaredNames,{dataDir}) });
              if (restored.exceptionDetails) throw new Error(restored.exceptionDetails.text);
              status('已恢复原生输入框控件');
            }
          }
        } catch (error) { clients.get(target.id)?.socket.close(); clients.delete(target.id); status(error.message); }
      }
      const ids = new Set(hubs.map(t => t.id));
      for (const [id, client] of clients) if (!ids.has(id)) { client.socket.close(); clients.delete(id); }
      const swarms = targets.filter(isSwarmTarget);
      for (const target of swarms) {
        let swarmClient = swarmClients.get(target.id);
        try {
          if (swarmClient && (swarmClient.url !== target.url || swarmClient.endpoint !== target.webSocketDebuggerUrl)) {
            swarmClient.socket.close(); swarmClients.delete(target.id); swarmClient = null;
          }
          if (!swarmClient) await attachSwarm(target);
          else {
            const cur = settings.get();
            const wantLang = cur.enabled ? cur.language : 'en';
            const check = await swarmClient.send('Runtime.evaluate', {
              expression: `({ready:Boolean(globalThis.__agyLocalization),lang:globalThis.__agyLocalization?.language||''})`,
              returnByValue: true
            });
            const v = check?.result?.value;
            if (!v?.ready) {
              await swarmClient.send('Runtime.evaluate', { expression: swarmI18nSource(cur, { dataDir }) });
            } else if (v.lang !== wantLang) {
              await swarmClient.send('Runtime.evaluate', { expression: `globalThis.__agyLocalePack=${JSON.stringify(getLocalePack(wantLang))};globalThis.__agyCustomI18n=${JSON.stringify(loadCustomI18n(dataDir,wantLang))};globalThis.__agyLocalization?.apply(${JSON.stringify(wantLang)},false)` });
            }
          }
        } catch { swarmClients.get(target.id)?.socket.close(); swarmClients.delete(target.id); }
      }
      const swarmIds = new Set(swarms.map(t => t.id));
      for (const [id, swarmClient] of swarmClients) if (!swarmIds.has(id)) { swarmClient.socket.close(); swarmClients.delete(id); }
      if (!hubs.length) status('等待 Antigravity 窗口');
    } catch (error) {
      status('等待 Antigravity 本地调试接口');
      if (!debugPortReached && !clients.size && !isTransientTimeoutError(error)) {
        try { onMissingDebugPort?.(); } catch {}
      }
    }
    finally { polling = false; }
  };
  const timer = setInterval(poll, 4000);
  const initialPoll=poll();
  const stop = async ({purge=false}={}) => {
    stopped = true; clearInterval(timer);
    for (const client of clients.values()) {
      try {
        await client.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: client.scriptId });
        if(purge)await client.send('Runtime.evaluate',{expression:`(async()=>{if(location.pathname==='/powertools')await globalThis.__agyNativeAdapter?.router()?.navigate({to:'/customizations'});localStorage.removeItem('agy-powertools-language');})()`,awaitPromise:true});
        await client.send('Runtime.evaluate', { expression: 'globalThis.__agyPowertools?.dispose()' });
      } catch {}
      client.socket.close();
    }
    clients.clear();
    for (const swarmClient of swarmClients.values()) {
      try {
        if (swarmClient.scriptId) await swarmClient.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: swarmClient.scriptId });
        await swarmClient.send('Runtime.evaluate', { expression: 'globalThis.__agyLocalization?.dispose()' });
      } catch {}
      swarmClient.socket.close();
    }
    swarmClients.clear();
    await wslBridge?.close?.();
    wslBridge = null;
    await remote?.close?.();
  };
  stop.fork = async (conversationId, stepIndex = -1) => {
    for (const client of clients.values()) {
      const result = await client.send('Runtime.evaluate', {
        expression: `globalThis.__agyNativeAdapter.fork(${JSON.stringify(conversationId)},${JSON.stringify(stepIndex)})`,
        awaitPromise: true, returnByValue: true
      });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    }
    throw new Error('请先打开 Antigravity 会话窗口');
  };
  stop.ready=initialPoll;
  stop.check=poll;
  stop.health=async()=>{
    await initialPoll;
    let compatibilityError='',clientVersion='',anyHealthy=false;
    const windows=[];
    for(const client of clients.values()){
      try{
        const result=await client.send('Runtime.evaluate',{
          expression:`({version:globalThis.__agyPowertools?.version,healthy:globalThis.__agyPowertools?.status?.healthy,mounted:globalThis.__agyPowertools?.status?.mounted,conversationId:globalThis.__agyPowertools?.status?.conversationId||'',compatibilityError:globalThis.__agyCompatibilityError||'',clientVersion:navigator.userAgent.match(/Antigravity\\/([0-9.]+)/)?.[1]||''})`,
          returnByValue:true
        });
        const v=result.result?.value;
        if(v?.clientVersion&&!clientVersion)clientVersion=String(v.clientVersion);
        const winHealthy=Boolean(v?.version===pluginVersion&&v?.healthy);
        if(winHealthy)anyHealthy=true;
        else if(v?.compatibilityError&&!compatibilityError)compatibilityError=String(v.compatibilityError);
        windows.push({
          sshHost:client.sshHost||null,
          healthy:winHealthy,
          mounted:Number(v?.mounted)||0,
          conversationId:String(v?.conversationId||'')
        });
      }catch{}
    }
    return{healthy:anyHealthy,compatibilityError:anyHealthy?'':compatibilityError,clientVersion,connected:clients.size>0,windows,pageTargets:lastPageTargets};
  };
  return stop;
}
