import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  validateSshDestination,
  parseSshWindowTitle,
  resolveSshWindowConfig,
  resolveRemotePosixPath,
  buildRemoteWorkerCode,
  createRemoteTelemetryBridge
} from '../lib/ssh-remote.mjs';
import { parseSessionData } from '../lib/session-parser.mjs';
import { startNativeIntegration, isHubTarget } from '../lib/native-host.mjs';

const varint = value => {
  const bytes = [];
  let n = BigInt(value);
  do {
    let b = Number(n & 127n);
    n >>= 7n;
    if (n) b |= 128;
    bytes.push(b);
  } while (n);
  return Buffer.from(bytes);
};
const integer = (n, value) => Buffer.concat([varint(n * 8), varint(value)]);
const bytesField = (n, value) => {
  const buf = Buffer.from(value);
  return Buffer.concat([varint(n * 8 + 2), varint(buf.length), buf]);
};
const concat = (...parts) => Buffer.concat(parts);
const duration = seconds => concat(integer(1, seconds));
const timestamp = seconds => concat(integer(1, seconds));

function seedConversationFixture(appDataDir, id, promptText) {
  const logsDir = join(appDataDir, 'brain', id, '.system_generated', 'logs');
  mkdirSync(logsDir, { recursive: true });
  mkdirSync(join(appDataDir, 'conversations'), { recursive: true });

  const steps = [
    { step_index: 0, type: 'USER_INPUT', created_at: '2026-11-22T01:00:00Z', content: `<USER_REQUEST>${promptText}</USER_REQUEST>` },
    { step_index: 1, type: 'PLANNER_RESPONSE', created_at: '2026-11-22T01:00:01Z', input_tokens: 400, cache_read_tokens: 1600, output_tokens: 120, content: 'Done inspecting.' }
  ];
  writeFileSync(join(logsDir, 'transcript.jsonl'), steps.map(s => JSON.stringify(s)).join('\n') + '\n', 'utf8');
  writeFileSync(join(appDataDir, 'brain', id, 'task.md'), '- [x] Inspect remote telemetry\n- [ ] Verify panel\n', 'utf8');

  const db = new DatabaseSync(join(appDataDir, 'conversations', `${id}.db`));
  try {
    db.exec('CREATE TABLE gen_metadata(idx INTEGER PRIMARY KEY, data BLOB); CREATE TABLE steps(idx INTEGER PRIMARY KEY, step_type INTEGER, metadata BLOB);');
    const context = concat(integer(1, 2000), integer(4, 200000), bytesField(3, bytesField(1, concat(bytesField(1, 'Chat Messages'), integer(4, 2000)))));
    const generation = bytesField(1, concat(
      bytesField(4, concat(integer(2, 400), integer(3, 120), integer(5, 1600))),
      bytesField(9, bytesField(10, context)),
      bytesField(11, duration(1)),
      bytesField(12, duration(3)),
      bytesField(19, 'gemini-4-hydrogen')
    ));
    const genWithSteps = concat(generation, integer(2, 1), bytesField(4, id));
    db.prepare('INSERT INTO gen_metadata(idx, data) VALUES (?, ?)').run(0, genWithSteps);
    const t0 = concat(bytesField(1, timestamp(1795309200)), bytesField(8, timestamp(1795309200)));
    const t1 = concat(bytesField(1, timestamp(1795309201)), bytesField(6, timestamp(1795309202)), bytesField(7, timestamp(1795309205)), bytesField(8, timestamp(1795309205)));
    db.prepare('INSERT INTO steps(idx, step_type, metadata) VALUES (?, ?, ?)').run(0, 1, t0);
    db.prepare('INSERT INTO steps(idx, step_type, metadata) VALUES (?, ?, ?)').run(1, 2, t1);
  } finally {
    db.close();
  }
}

test('validateSshDestination and parseSshWindowTitle accept safe hosts and reject unsafe inputs', () => {
  assert.equal(validateSshDestination('  homelab  '), 'homelab');
  assert.equal(validateSshDestination('alice@203.0.113.10'), 'alice@203.0.113.10');
  assert.equal(validateSshDestination('alice@[::1]:2222'), 'alice@[::1]:2222');
  assert.equal(validateSshDestination('ssh://bob@devbox:2222'), 'ssh://bob@devbox:2222');

  for (const bad of ['', '   ', '-oProxyCommand=calc', 'host name', 'host\nwhoami', 'host;id', 'host`id`', null, undefined]) {
    assert.throws(() => validateSshDestination(bad), /SSH/);
  }

  assert.equal(parseSshWindowTitle('grave-arsenal - Antigravity (SSH: homelab)'), 'homelab');
  assert.equal(parseSshWindowTitle('(2) Title - Antigravity (SSH: homelab)'), 'homelab');
  assert.equal(parseSshWindowTitle('proj - Antigravity [SSH: alice@devbox:2222]'), 'alice@devbox:2222');
  assert.equal(parseSshWindowTitle('Local - Antigravity'), '');
  assert.equal(parseSshWindowTitle('Evil - Antigravity (SSH: -oProxyCommand=calc)'), '');

  assert.equal(isHubTarget({ type: 'page', title: 'Grave Arsenal Development... (SSH: homelab)', url: 'https://127.0.0.1:37743/c/abc' }), true);
  assert.equal(isHubTarget({ type: 'page', title: '(1) Grave Arsenal Develop... (SSH: homelab)', url: 'https://127.0.0.1:37743/c/abc' }), true);
  assert.equal(isHubTarget({ type: 'page', title: 'Long Conversation Title... (WSL: Ubuntu)', url: 'https://127.0.0.1:37743/c/abc' }), true);
  assert.equal(isHubTarget({ type: 'page', title: '先阅读项目根目录的 `README.md`', url: 'https://127.0.0.1:37743/c/3f88b06e-1234-5678-9abc-def012345678' }), true);
  assert.equal(isHubTarget({ type: 'page', title: '(1) 重构远程会话统计模块', url: 'https://127.0.0.1:37743/c/7a4c798f-1234-5678-9abc-def012345678' }), true);
  assert.equal(isHubTarget({ type: 'page', title: 'Antigravity Docs', url: 'https://127.0.0.1:1234/' }), false);
  assert.equal(isHubTarget({ type: 'page', title: 'Local Dev App', url: 'https://127.0.0.1:3000/' }), false);
});

test('resolveSshWindowConfig and resolveRemotePosixPath resolve metadata and POSIX file URIs safely', () => {
  const dir = mkdtempSync(join(tmpdir(), 'agy-ssh-cfg-'));
  try {
    const customCfgA = join(dir, 'ssh_a.conf');
    const customCfgB = join(dir, 'ssh_b.conf');
    writeFileSync(customCfgA, 'Host homelab\n');
    writeFileSync(customCfgB, 'Host backup\n');
    writeFileSync(join(dir, 'ssh_windows.json'), JSON.stringify({
      version: 1,
      windows: [
        { host: 'homelab', configFile: customCfgA },
        { host: 'missing-cfg', configFile: join(dir, 'does-not-exist.conf') }
      ]
    }));
    writeFileSync(join(dir, 'app_storage.json'), JSON.stringify({
      'ssh.recentConnections': JSON.stringify([
        { host: 'backup', configFile: customCfgB },
        { host: 'evil', configFile: '-oBad' }
      ])
    }));

    assert.deepEqual(resolveSshWindowConfig('homelab', { userDataDir: dir }), { host: 'homelab', configFile: customCfgA });
    assert.deepEqual(resolveSshWindowConfig('backup', { userDataDir: dir }), { host: 'backup', configFile: customCfgB });
    assert.deepEqual(resolveSshWindowConfig('missing-cfg', { userDataDir: dir }), { host: 'missing-cfg', configFile: '' });
    assert.deepEqual(resolveSshWindowConfig('evil', { userDataDir: dir }), { host: 'evil', configFile: '' });

    assert.equal(resolveRemotePosixPath('file:///data/projects/a%20b.gd#L10'), '/data/projects/a b.gd');
    assert.equal(resolveRemotePosixPath('file:///data/project-C#/src/app.cs#L10-L20'), '/data/project-C#/src/app.cs');
    assert.equal(resolveRemotePosixPath('file:///data/project-C#%2Fsrc%2Fapp.cs%23L10-L20'), '/data/project-C#/src/app.cs');
    assert.equal(resolveRemotePosixPath('file:///data/project-C#/README.md#overview'), '/data/project-C#/README.md');
    assert.equal(resolveRemotePosixPath('file://localhost/home/user/test.txt?foo=bar'), '/home/user/test.txt');
    assert.throws(() => resolveRemotePosixPath('file://remote-host/etc/passwd'));
    assert.throws(() => resolveRemotePosixPath('https://example.com/a'));
    assert.throws(() => resolveRemotePosixPath('file:///a%00b'));
    assert.throws(() => resolveRemotePosixPath(''));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('createRemoteTelemetryBridge runs in-memory worker over child stdio, tolerates MOTD noise, multiplexes requests, and backs off on failure', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'agy-ssh-worker-'));
  const userDataDir = join(dir, 'userdata');
  const appDataDir = join(dir, 'remote-appdata');
  mkdirSync(userDataDir, { recursive: true });
  seedConversationFixture(appDataDir, 'conv-main', 'Analyze homelab performance');
  seedConversationFixture(appDataDir, 'sub-1', 'Subagent inspect');

  const cfgPath = join(userDataDir, 'custom.ssh');
  writeFileSync(cfgPath, 'Host homelab\n');
  writeFileSync(join(userDataDir, 'ssh_windows.json'), JSON.stringify({
    version: 1,
    windows: [{ host: 'homelab', configFile: cfgPath }]
  }));

  const spawnCalls = [];
  const childRefs = [];
  const harnessScript = `
    process.stdout.write("Welcome to Ubuntu 24.04 MOTD\\n");
    let buf = "";
    process.stdin.setEncoding("utf8");
    const onBoot = chunk => {
      buf += chunk;
      const idx = buf.indexOf("\\n");
      if (idx < 0) return;
      process.stdin.removeListener("data", onBoot);
      process.stdin.pause();
      const line = buf.slice(0, idx);
      const m = line.match(/exec "\\$NODE" --no-warnings -e '([^']+)'/);
      if (!m) { console.error("bad bootstrap:", line); process.exit(2); }
      new Function("require", m[1])(require);
    };
    process.stdin.on("data", onBoot);
    process.stdin.resume();
  `;

  const bridge = createRemoteTelemetryBridge({
    userDataDir,
    connectTimeoutMs: 5000,
    requestTimeoutMs: 5000,
    backoffMs: 60000,
    spawnProcess: (command, args, opts) => {
      spawnCalls.push({ command, args });
      const child = spawn(process.execPath, ['--no-warnings', '-e', harnessScript], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...opts.env, ANTIGRAVITY_APP_DATA_DIR: appDataDir }
      });
      childRefs.push(child);
      return child;
    }
  });

  try {
    const [remoteState, remoteSubagents, remoteDash, remoteSearch] = await Promise.all([
      bridge.state('homelab', { conversationId: 'conv-main' }),
      bridge.subagents('homelab', { conversationIds: ['sub-1', 'missing-sub'] }),
      bridge.dashboard('homelab', { force: true }),
      bridge.search('homelab', { query: 'homelab', excludeIds: ['sub-1'] })
    ]);

    assert.equal(spawnCalls.length, 1);
    const args = spawnCalls[0].args;
    assert.ok(args.includes('-T'));
    assert.ok(args.includes('BatchMode=yes'));
    assert.ok(args.includes('-F'));
    assert.ok(args.includes(cfgPath));
    assert.deepEqual(args.slice(-3), ['homelab', 'sh', '-s']);

    const expected = parseSessionData('conv-main', { includeSessions: false, strict: true, appDataDir });
    assert.deepEqual(remoteState.contextWindow, expected.contextWindow);
    assert.deepEqual(remoteState.telemetry, expected.telemetry);
    assert.deepEqual(remoteState.turns, expected.turns);
    assert.deepEqual(remoteState.requests, expected.requests);
    assert.deepEqual(remoteState.progress, expected.progress);

    assert.equal(remoteSubagents.sessions['sub-1'].conversationId, 'sub-1');
    assert.equal(remoteSubagents.sessions['missing-sub'].conversationId, '');
    assert.equal(remoteDash.totalRequests, 2);
    assert.equal(remoteSearch.results.length, 1);
    assert.equal(remoteSearch.results[0].conversationId, 'conv-main');
  } finally {
    await bridge.close();
  }

  // Verify remote worker also merges ~/.gemini/antigravity-cli when ANTIGRAVITY_APP_DATA_DIR points to ~/.gemini/antigravity
  const remoteGeminiAppDir = join(dir, '.gemini', 'antigravity');
  const remoteGeminiCliDir = join(dir, '.gemini', 'antigravity-cli');
  seedConversationFixture(remoteGeminiAppDir, 'remote-app-conv', 'Remote desktop prompt');
  seedConversationFixture(remoteGeminiCliDir, 'remote-cli-conv', 'Remote CLI prompt');
  const cliBridge = createRemoteTelemetryBridge({
    userDataDir,
    connectTimeoutMs: 5000,
    requestTimeoutMs: 5000,
    spawnProcess: (_command, _args, opts) => {
      const child = spawn(process.execPath, ['--no-warnings', '-e', harnessScript], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...opts.env, ANTIGRAVITY_APP_DATA_DIR: remoteGeminiAppDir }
      });
      childRefs.push(child);
      return child;
    }
  });
  try {
    const [mergedDash, appOnlySearch] = await Promise.all([
      cliBridge.dashboard('homelab', { force: true }),
      cliBridge.search('homelab', { query: 'prompt' })
    ]);
    assert.equal(mergedDash.totalRequests, 2);
    assert.deepEqual(new Set(mergedDash.requests.map(r => r.conversationId)), new Set(['remote-app-conv', 'remote-cli-conv']));
    assert.equal(appOnlySearch.results.length, 1);
    assert.equal(appOnlySearch.results[0].conversationId, 'remote-app-conv');
  } finally {
    await cliBridge.close();
  }

  for (const child of childRefs) {
    assert.ok(child.exitCode !== null || child.signalCode !== null, 'worker child should exit cleanly on close()');
  }

  let failSpawns = 0;
  const failingBridge = createRemoteTelemetryBridge({
    userDataDir,
    backoffMs: 60000,
    spawnProcess: () => {
      failSpawns++;
      return spawn(process.execPath, ['-e', 'process.stderr.write("Permission denied\\n"); process.exit(255);'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
    }
  });
  try {
    await assert.rejects(() => failingBridge.state('homelab', { conversationId: 'conv-main' }), /Permission denied|exit 255/);
    assert.equal(failSpawns, 1);
    await assert.rejects(() => failingBridge.state('homelab', { conversationId: 'conv-main' }), /Permission denied|exit 255/);
    assert.equal(failSpawns, 1, 'non-forced call within backoff must not spawn another ssh');
    await assert.rejects(() => failingBridge.dashboard('homelab', { force: true }), /Permission denied|exit 255/);
    assert.equal(failSpawns, 2, 'forced call should bypass backoff');
  } finally {
    await failingBridge.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('startNativeIntegration routes SSH windows to remoteTelemetry, isolates discovery cache, and reports per-window health', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'agy-native-ssh-'));
  const portFile = join(dir, 'port');
  writeFileSync(portFile, '12345\n');

  const originalFetch = globalThis.fetch;
  const targets = [
    { id: 'local-1', type: 'page', title: 'Local - Antigravity', url: 'https://127.0.0.1:5001/c/c-local', webSocketDebuggerUrl: 'ws://127.0.0.1:12345/devtools/page/local' },
    { id: 'ssh-1', type: 'page', title: 'Proj - Antigravity (SSH: homelab)', url: 'https://127.0.0.1:5002/c/c-remote', webSocketDebuggerUrl: 'ws://127.0.0.1:12345/devtools/page/ssh' }
  ];
  globalThis.fetch = async () => ({ json: async () => targets });

  const localCalls = [];
  const remoteCalls = [];
  const discoverCalls = [];
  const clientsByEndpoint = new Map();

  let stop;
  try {
    stop = startNativeIntegration({
      portFile,
      onStatus: () => {},
      parseSessionData: (id, opts) => {
        localCalls.push({ id, opts });
        return {
          conversationId: id,
          modelName: 'local-model',
          contextWindow: { usedTokens: 100, maxTokens: 1000, models: [] },
          telemetry: { stepCount: 1, requestCount: 1, totalTokens: 100, inputTokens: 100, cacheReadTokens: 0, outputTokens: 10 },
          turns: [],
          requests: [],
          errors: [],
          progress: { status: 'complete', tasks: [] }
        };
      },
      remoteTelemetry: {
        async state(host, params) {
          remoteCalls.push({ method: 'state', host, params });
          return {
            conversationId: params.conversationId,
            modelName: 'remote-model',
            contextWindow: { usedTokens: 2000, maxTokens: 100000, models: [] },
            telemetry: { stepCount: 3, requestCount: 2, totalTokens: 2000, inputTokens: 500, cacheReadTokens: 1500, outputTokens: 200 },
            turns: [],
            requests: [],
            errors: [],
            progress: { status: 'running', tasks: [] }
          };
        },
        async subagents(host, params) {
          remoteCalls.push({ method: 'subagents', host, params });
          return {
            sessions: {
              'sub-r1': {
                conversationId: 'sub-r1',
                modelName: 'gemini-4-hydrogen',
                contextWindow: { usedTokens: 500, maxTokens: 100000, models: [] },
                telemetry: { stepCount: 2, requestCount: 1, totalTokens: 500, inputTokens: 100, cacheReadTokens: 400, outputTokens: 50 },
                requests: []
              }
            }
          };
        },
        async dashboard(host, params) {
          remoteCalls.push({ method: 'dashboard', host, params });
          return { requests: [{ id: 'r1', model: 'gemini-4-hydrogen', inputTokens: 100, cacheReadTokens: 0, outputTokens: 20, timestampMs: 1 }], totalRequests: 1, errors: [], totalErrors: 0, days: [], updatedAtMs: 1 };
        },
        async close() {
          remoteCalls.push({ method: 'close' });
        }
      },
      discover: async (origin, opts) => {
        discoverCalls.push({ origin, cacheScope: opts.cacheScope, preferFallback: opts.preferFallback });
        return ['sampleNativeName'];
      },
      connect: async endpoint => {
        const isSsh = endpoint.endsWith('/ssh');
        const listeners = new Set();
        const replies = [];
        const client = {
          endpoint,
          listeners,
          replies,
          onEvent(fn) { listeners.add(fn); },
          emit(event) { return Promise.all([...listeners].map(fn => fn(event))); },
          socket: { addEventListener() {}, close() {} },
          async send(method, params = {}) {
            if (method === 'Page.getFrameTree') return { frameTree: { frame: { id: 'main-frame' } } };
            if (method === 'Page.addScriptToEvaluateOnNewDocument') return { identifier: 'script-1' };
            if (method === 'Runtime.evaluate') {
              const expr = String(params.expression || '');
              if (expr.includes('compatibilityError')) {
                return {
                  result: {
                    value: {
                      version: JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version,
                      healthy: true,
                      mounted: isSsh ? 2 : 1,
                      conversationId: isSsh ? 'c-remote' : 'c-local',
                      compatibilityError: '',
                      clientVersion: '2.34.0'
                    }
                  }
                };
              }
              if (expr.includes('navigator.userAgent')) {
                return {
                  result: {
                    value: {
                      ua: 'Mozilla/5.0 Antigravity/2.34.0',
                      sshKind: isSsh ? 'ssh' : '',
                      sshHost: isSsh ? 'homelab' : '',
                      title: isSsh ? 'Proj - Antigravity (SSH: homelab)' : 'Local - Antigravity'
                    }
                  }
                };
              }
              if (expr.includes('globalThis.__agyPowertoolsReceive')) {
                const match = expr.match(/globalThis\.__agyPowertoolsReceive\?\.\((\d+),([\s\S]+)\)$/);
                if (match) replies.push({ id: Number(match[1]), payload: JSON.parse(match[2]) });
                return { result: { value: true } };
              }
              return { result: { value: false } };
            }
            return {};
          }
        };
        clientsByEndpoint.set(endpoint, client);
        return client;
      }
    });

    await stop.ready;
    assert.equal(discoverCalls.length, 2);
    const localDiscover = discoverCalls.find(d => d.origin === 'https://127.0.0.1:5001');
    const sshDiscover = discoverCalls.find(d => d.origin === 'https://127.0.0.1:5002');
    assert.equal(localDiscover.preferFallback, undefined);
    assert.equal(sshDiscover.cacheScope, 'ssh');
    assert.equal(sshDiscover.preferFallback, true);

    const localClient = clientsByEndpoint.get('ws://127.0.0.1:12345/devtools/page/local');
    const sshClient = clientsByEndpoint.get('ws://127.0.0.1:12345/devtools/page/ssh');
    for (const [c, orig] of [[localClient, 'https://127.0.0.1:5001'], [sshClient, 'https://127.0.0.1:5002']]) {
      await c.emit({ method: 'Runtime.executionContextCreated', params: { context: { id: 10, origin: orig, auxData: { isDefault: true, frameId: 'main-frame' } } } });
    }

    const sendRpc = (client, id, body) => client.emit({
      method: 'Runtime.bindingCalled',
      params: { name: '__agyPowertoolsHost', executionContextId: 10, payload: JSON.stringify({ id, ...body }) }
    });

    await sendRpc(localClient, 1, { method: 'state', conversationId: 'c-local' });
    await sendRpc(sshClient, 2, { method: 'state', conversationId: 'c-remote' });
    await sendRpc(sshClient, 3, { method: 'subagents.stats', conversationIds: ['sub-r1'] });
    await sendRpc(sshClient, 4, { method: 'dashboard', force: true });
    await sendRpc(sshClient, 5, { method: 'file.path', uri: 'file:///data/projects/foo%20bar.gd' });
    await sendRpc(sshClient, 6, { method: 'file.open', uri: 'file:///data/projects/foo.gd' });

    assert.equal(localCalls.length, 1);
    assert.equal(localCalls[0].id, 'c-local');
    assert.equal(localClient.replies.find(r => r.id === 1).payload.modelName, 'local-model');

    assert.equal(sshClient.replies.find(r => r.id === 2).payload.modelName, 'remote-model');
    assert.equal(sshClient.replies.find(r => r.id === 3).payload.items['sub-r1'].shortModel, 'Hydrogen');
    assert.equal(sshClient.replies.find(r => r.id === 4).payload.totalRequests, 1);
    assert.equal(sshClient.replies.find(r => r.id === 5).payload.path, '/data/projects/foo bar.gd');
    assert.match(sshClient.replies.find(r => r.id === 6).payload.error, /SSH/);

    assert.deepEqual(remoteCalls.map(c => c.method), ['state', 'subagents', 'dashboard']);

    const health = await stop.health();
    assert.equal(health.healthy, true);
    assert.equal(health.connected, true);
    assert.deepEqual(health.windows, [
      { sshHost: null, healthy: true, mounted: 1, conversationId: 'c-local' },
      { sshHost: 'homelab', healthy: true, mounted: 2, conversationId: 'c-remote' }
    ]);

    targets[1].title = 'Bare Title On Settings';
    targets[1].url = 'https://127.0.0.1:5002/settings';
    await stop.check();
    const persistedHealth = await stop.health();
    assert.equal(persistedHealth.connected, true);
    assert.deepEqual(persistedHealth.windows, health.windows);
  } finally {
    await stop?.();
    globalThis.fetch = originalFetch;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('local state cache invalidates on task.md edits, execution.live/subagent title changes, and single-rate pricing edits, and settings.reset restores backend defaults', async () => {
  const { DEFAULT_SETTINGS } = await import('../lib/settings.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'agy-cache-inv-'));
  const appDataDir = join(dir, 'app');
  const dataDir = join(dir, 'data');
  mkdirSync(dataDir, { recursive: true });
  const cid = 'conv-cache-62';
  seedConversationFixture(appDataDir, cid, 'Verify cache invalidation');

  const portFile = join(dir, 'DevToolsActivePort');
  writeFileSync(portFile, '12346\n/devtools/browser/test\n');
  const originalFetch = globalThis.fetch;
  const originalAppData = process.env.ANTIGRAVITY_APP_DATA_DIR;
  process.env.ANTIGRAVITY_APP_DATA_DIR = appDataDir;

  const target = { id: 'local-cache', type: 'page', title: 'Local - Antigravity', url: 'https://127.0.0.1:5011/c/conv-cache-62', webSocketDebuggerUrl: 'ws://127.0.0.1:12346/devtools/page/local-cache' };
  globalThis.fetch = async () => ({ ok: true, json: async () => [target] });

  let parseCalls = 0;
  let capturedClient = null;
  let stop;
  try {
    stop = startNativeIntegration({
      portFile,
      dataDir,
      wsl: false,
      onStatus() {},
      parseSessionData: (id, opts) => {
        parseCalls++;
        return parseSessionData(id, { ...opts, appDataDir });
      },
      discover: async () => ['sampleNativeName'],
      connect: async () => {
        const listeners = new Set();
        const replies = [];
        const client = {
          listeners,
          replies,
          onEvent(fn) { listeners.add(fn); },
          emit(event) { return Promise.all([...listeners].map(fn => fn(event))); },
          socket: { addEventListener() {}, close() {} },
          async send(method, params = {}) {
            if (method === 'Page.getFrameTree') return { frameTree: { frame: { id: 'main-frame' } } };
            if (method === 'Page.addScriptToEvaluateOnNewDocument') return { identifier: 'script-1' };
            if (method === 'Runtime.evaluate') {
              const expr = String(params.expression || '');
              if (expr.includes('navigator.userAgent')) return { result: { value: { ua: 'Antigravity/2.35.2', sshKind: '', sshHost: '', title: target.title } } };
              if (expr.includes('globalThis.__agyPowertoolsReceive')) {
                const match = expr.match(/globalThis\.__agyPowertoolsReceive\?\.\((\d+),([\s\S]+)\)$/);
                if (match) replies.push({ id: Number(match[1]), payload: JSON.parse(match[2]) });
                return { result: { value: true } };
              }
              return { result: { value: false } };
            }
            return {};
          }
        };
        capturedClient = client;
        return client;
      }
    });

    await stop.ready;
    await capturedClient.emit({ method: 'Runtime.executionContextCreated', params: { context: { id: 10, origin: 'https://127.0.0.1:5011', auxData: { isDefault: true, frameId: 'main-frame' } } } });
    const rpc = async (id, body) => {
      await capturedClient.emit({
        method: 'Runtime.bindingCalled',
        params: { name: '__agyPowertoolsHost', executionContextId: 10, payload: JSON.stringify({ id, ...body }) }
      });
      return capturedClient.replies.find(r => r.id === id)?.payload;
    };

    // 1. Initial idle poll caches payload; second poll with matching knownRev returns unchanged without re-parsing
    const r1 = await rpc(1, { method: 'state', conversationId: cid });
    assert.equal(parseCalls, 1);
    assert.equal(r1.unchanged, undefined);
    assert.equal(r1.progress.completed, 1);
    const rev1 = r1.stateRev;

    const r2 = await rpc(2, { method: 'state', conversationId: cid, knownRev: rev1 });
    assert.equal(parseCalls, 1);
    assert.equal(r2.unchanged, true);
    assert.equal(r2.stateRev, rev1);

    // 2. Updating ONLY brain/<id>/task.md MUST invalidate cache even when transcript/db/telemetry are untouched
    writeFileSync(join(appDataDir, 'brain', cid, 'task.md'), '- [x] Inspect remote telemetry\n- [x] Verify panel completely\n', 'utf8');
    const r3 = await rpc(3, { method: 'state', conversationId: cid, knownRev: rev1 });
    assert.equal(parseCalls, 2);
    assert.equal(r3.unchanged, undefined);
    assert.equal(r3.progress.completed, 2);
    assert.notEqual(r3.stateRev, rev1);

    // 3. Updating ONLY pricing.json single model price (same rates length, same checkedAt) MUST invalidate cache and recompute costUsd
    const baseCost = r3.costUsd;
    writeFileSync(join(dataDir, 'pricing.json'), JSON.stringify({
      checkedAt: '2026-11-26T00:00:00.000Z',
      source: 'test',
      status: 'live',
      rates: [{ model: 'gemini-4-hydrogen', input: 100, output: 200, cache: 50 }]
    }), 'utf8');
    const r4 = await rpc(4, { method: 'state', conversationId: cid, knownRev: r3.stateRev });
    assert.equal(parseCalls, 3);
    assert.equal(r4.unchanged, undefined);
    assert.ok(r4.costUsd > baseCost, `expected higher cost after rate increase (${r4.costUsd} vs ${baseCost})`);

    writeFileSync(join(dataDir, 'pricing.json'), JSON.stringify({
      checkedAt: '2026-11-26T00:00:00.000Z',
      source: 'test',
      status: 'live',
      rates: [{ model: 'gemini-4-hydrogen', input: 500, output: 1000, cache: 250 }]
    }), 'utf8');
    const r5 = await rpc(5, { method: 'state', conversationId: cid, knownRev: r4.stateRev });
    assert.equal(parseCalls, 4);
    assert.equal(r5.unchanged, undefined);
    assert.ok(r5.costUsd > r4.costUsd, 'editing single model price with same checkedAt and rates.length must invalidate cache');

    // 4. Keeping all files fixed, toggling ONLY execution.live.waiting MUST invalidate cache and update progress.phase
    const baseExec = {
      conversationId: cid,
      status: 2,
      turnStartStepIndex: 0,
      userTurnStartStepIndex: 0,
      isSystemTurn: false,
      notFullyIdle: false,
      activeSubagents: [],
      live: { waiting: false, lastCase: 'plannerResponse', lastStatus: 2, hasThinking: true, hasResponse: false, toolCallCount: 0, toolName: '' }
    };
    const r6 = await rpc(6, { method: 'state', conversationId: cid, execution: baseExec, knownRev: r5.stateRev });
    assert.equal(parseCalls, 5);
    assert.equal(r6.progress.phase, 'thinking');

    const waitingExec = { ...baseExec, live: { ...baseExec.live, waiting: true, toolName: 'run_command' } };
    const r7 = await rpc(7, { method: 'state', conversationId: cid, execution: waitingExec, knownRev: r6.stateRev });
    assert.equal(parseCalls, 6);
    assert.equal(r7.unchanged, undefined);
    assert.equal(r7.progress.phase, 'waiting');
    assert.equal(r7.progress.phaseDetail, 'run_command');

    assert.ok(Number.isFinite(r7.progress.phaseStartedAtMs));
    const steady = await rpc(70, { method: 'state', conversationId: cid, execution: waitingExec, knownRev: r7.stateRev });
    assert.deepEqual(steady, { unchanged: true, conversationId: cid, stateRev: r7.stateRev });
    assert.ok(Buffer.byteLength(JSON.stringify(steady)) < 128);
    assert.equal(parseCalls, 6);
    const freshWindow = await rpc(71, { method: 'state', conversationId: cid, execution: waitingExec });
    assert.deepEqual(freshWindow, r7);

    // 5. Keeping activeSubagents.length identical (1) while changing subagent title MUST invalidate cache
    const subA = { ...baseExec, status: 1, notFullyIdle: true, activeSubagents: [{ id: 's1', title: 'Researcher A' }], live: null };
    const r8 = await rpc(8, { method: 'state', conversationId: cid, execution: subA, knownRev: r7.stateRev });
    assert.equal(r8.progress.phase, 'subagent');
    assert.equal(r8.progress.phaseDetail, 'Researcher A');
    const subB = { ...subA, activeSubagents: [{ id: 's1', title: 'Debugger B' }] };
    const r9 = await rpc(9, { method: 'state', conversationId: cid, execution: subB, knownRev: r8.stateRev });
    assert.equal(r9.unchanged, undefined);
    assert.equal(r9.progress.phaseDetail, 'Debugger B');

    // 6. settings.reset restores backend DEFAULT_SETTINGS (including OS-detected language)
    const flippedLang = DEFAULT_SETTINGS.language === 'en' ? 'zh-CN' : 'en';
    const setRes = await rpc(10, { method: 'settings.set', settings: { language: flippedLang, compact: false } });
    assert.equal(setRes.language, flippedLang);
    assert.equal(setRes.compact, false);
    const resetRes = await rpc(11, { method: 'settings.reset' });
    assert.deepEqual(resetRes, DEFAULT_SETTINGS);
  } finally {
    await stop?.();
    globalThis.fetch = originalFetch;
    if (originalAppData === undefined) delete process.env.ANTIGRAVITY_APP_DATA_DIR;
    else process.env.ANTIGRAVITY_APP_DATA_DIR = originalAppData;
    rmSync(dir, { recursive: true, force: true });
  }
});
