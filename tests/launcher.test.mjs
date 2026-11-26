import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, utimesSync, symlinkSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { EventEmitter } from 'node:events';
import { pathToFileURL } from 'node:url';
import {
  injectDebugArg,
  removeDebugArg,
  patchDesktopEntry,
  unpatchDesktopEntry,
  configureLaunchers,
  restoreLaunchers,
  resolveAntigravityExecutable,
  manualLaunchCommand,
  shouldPromptPostUpdate,
  shouldAutoRelaunchMac,
  maybeAutoRelaunchMac,
  recordDebugPortReady,
  scheduleRelaunchWithDebugPort,
  isRemoteSshEnvironment,
  resolveLocalFilePath,
  resolveVerifiedLocalFilePath,
  isWindowsRunnableFile,
  openLocalFile,
  copyLocalFile,
  readLocalFileForAttach,
  parseFileUriAnchor,
  discoverOpenWithApps,
  openFileWithApp
} from '../lib/launcher.mjs';
import { startSidecarWebUi, renderAuxPaneHtml } from '../lib/sidecar-ui.mjs';

test('injectDebugArg and removeDebugArg preserve user arguments and avoid duplicates', () => {
  assert.equal(injectDebugArg(''), '--remote-debugging-port=0');
  assert.equal(injectDebugArg('--wsl-distro=Ubuntu'), '--wsl-distro=Ubuntu --remote-debugging-port=0');
  assert.equal(injectDebugArg('--remote-debugging-port=9222'), '--remote-debugging-port=9222');
  assert.equal(removeDebugArg('--remote-debugging-port=0'), '');
  assert.equal(removeDebugArg('--wsl-distro=Ubuntu --remote-debugging-port=0 --flag'), '--wsl-distro=Ubuntu --flag');
  assert.equal(removeDebugArg('--remote-debugging-port=9222'), '--remote-debugging-port=9222');
});

test('Linux desktop launcher override patches and restores cleanly in sandbox', () => {
  const root = mkdtempSync(join(tmpdir(), 'agy-launcher-linux-'));
  try {
    const home = join(root, 'home'), dataDir = join(root, 'data'), sysApps = join(root, 'sys-apps');
    mkdirSync(sysApps, { recursive: true });
    writeFileSync(join(sysApps, 'antigravity.desktop'), '[Desktop Entry]\nName=Antigravity\nExec=/opt/Antigravity/antigravity %U\nType=Application\n');
    const created = configureLaunchers({ home, dataDir, platform: 'linux', sandbox: true, systemApplicationsDir: sysApps });
    const userFile = join(home, '.local', 'share', 'applications', 'antigravity.desktop');
    assert.equal(created.updated.length, 1);
    assert.equal(created.macApp, undefined);
    assert.equal(created.iconConfigured, undefined);
    assert.equal(existsSync(join(home, 'Applications', 'Antigravity (Powertools).app')), false);
    assert.match(readFileSync(userFile, 'utf8'), /Exec=\/opt\/Antigravity\/antigravity --remote-debugging-port=0 %U/);

    const restored = restoreLaunchers({ home, dataDir, platform: 'linux', sandbox: true });
    assert.equal(restored.restored.length, 1);
    assert.equal(existsSync(userFile), false);

    mkdirSync(join(home, '.local', 'share', 'applications'), { recursive: true });
    writeFileSync(userFile, '[Desktop Entry]\nExec="/opt/Antigravity App/antigravity" --ozone-platform=wayland %U\n');
    configureLaunchers({ home, dataDir, platform: 'linux', sandbox: true });
    assert.match(readFileSync(userFile, 'utf8'), /Exec="\/opt\/Antigravity App\/antigravity" --remote-debugging-port=0 --ozone-platform=wayland %U/);
    restoreLaunchers({ home, dataDir, platform: 'linux', sandbox: true });
    assert.equal(readFileSync(userFile, 'utf8'), '[Desktop Entry]\nExec="/opt/Antigravity App/antigravity" --ozone-platform=wayland %U\n');
    assert.equal(patchDesktopEntry('[Desktop Entry]\nExec=/usr/bin/firefox %u\n').changed, false);
    assert.equal(unpatchDesktopEntry('[Desktop Entry]\nExec=/usr/bin/firefox %u\n').changed, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('macOS removes legacy duplicate launcher app, auto-relaunches with circuit breaker, and respects opt-out', () => {
  const root = mkdtempSync(join(tmpdir(), 'agy-launcher-mac-'));
  try {
    const home = join(root, 'home'), dataDir = join(root, 'data');
    const legacyApp = join(home, 'Applications', 'Antigravity (Powertools).app');
    mkdirSync(join(legacyApp, 'Contents', 'MacOS'), { recursive: true });
    writeFileSync(join(legacyApp, 'Contents', 'MacOS', 'launcher'), '#!/bin/sh\n', 'utf8');

    // configureLaunchers on macOS no longer creates a duplicate .app and cleans up legacy ones
    const res = configureLaunchers({ home, dataDir, platform: 'darwin', sandbox: true });
    assert.deepEqual(res.updated, []);
    assert.deepEqual(res.removedLegacyMacApps, [legacyApp]);
    assert.equal(existsSync(legacyApp), false);

    // Second run stays clean without creating any wrapper app
    const res2 = configureLaunchers({ home, dataDir, platform: 'darwin', sandbox: true });
    assert.deepEqual(res2.removedLegacyMacApps, []);
    assert.equal(existsSync(legacyApp), false);

    // Auto-relaunch guards: disabled / non-interactive / same session / cooldown / 2x circuit breaker / reset
    const appBundle = join(root, 'Antigravity.app');
    const lsExe = join(appBundle, 'Contents', 'Resources', 'bin', 'language_server');
    mkdirSync(join(appBundle, 'Contents', 'Resources', 'bin'), { recursive: true });
    writeFileSync(lsExe, '');

    const now = 1_700_000_000_000;
    const baseEnv = { ANTIGRAVITY_AGENTAPI_EXE: lsExe, ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:5001' };
    assert.equal(shouldAutoRelaunchMac({ dataDir, platform: 'darwin', env: baseEnv, enabled: true, macAutoRelaunch: false, now }).reason, 'disabled');
    assert.equal(shouldAutoRelaunchMac({ dataDir, platform: 'win32', env: baseEnv, enabled: true, macAutoRelaunch: true, now }).reason, 'not-darwin');
    assert.equal(shouldAutoRelaunchMac({ dataDir, platform: 'darwin', env: {}, enabled: true, macAutoRelaunch: true, now }).reason, 'non-interactive');

    let launches = 0;
    const fakeRelaunch = () => { launches++; return { scheduled: true }; };
    const first = maybeAutoRelaunchMac({ dataDir, home, platform: 'darwin', env: baseEnv, enabled: true, macAutoRelaunch: true, now, relaunch: fakeRelaunch });
    assert.equal(first.relaunched, true);
    assert.equal(launches, 1);

    // Same session blocked
    const sameSession = maybeAutoRelaunchMac({ dataDir, home, platform: 'darwin', env: baseEnv, enabled: true, macAutoRelaunch: true, now: now + 5000, relaunch: fakeRelaunch });
    assert.equal(sameSession.relaunched, false);
    assert.equal(sameSession.reason, 'already-attempted-session');

    // New session within 120s cooldown blocked
    const cool = maybeAutoRelaunchMac({ dataDir, home, platform: 'darwin', env: { ...baseEnv, ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:5002' }, enabled: true, macAutoRelaunch: true, now: now + 30_000, relaunch: fakeRelaunch });
    assert.equal(cool.relaunched, false);
    assert.equal(cool.reason, 'cooldown');

    // Second consecutive attempt after cooldown succeeds, then 3rd trips circuit breaker
    const second = maybeAutoRelaunchMac({ dataDir, home, platform: 'darwin', env: { ...baseEnv, ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:5002' }, enabled: true, macAutoRelaunch: true, now: now + 130_000, relaunch: fakeRelaunch });
    assert.equal(second.relaunched, true);
    assert.equal(launches, 2);

    const tripped = maybeAutoRelaunchMac({ dataDir, home, platform: 'darwin', env: { ...baseEnv, ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:5003' }, enabled: true, macAutoRelaunch: true, now: now + 260_000, relaunch: fakeRelaunch });
    assert.equal(tripped.relaunched, false);
    assert.equal(tripped.reason, 'circuit-open');

    // Successful debug port connection resets circuit breaker
    recordDebugPortReady({ dataDir });
    const recovered = maybeAutoRelaunchMac({ dataDir, home, platform: 'darwin', env: { ...baseEnv, ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:5004' }, enabled: true, macAutoRelaunch: true, now: now + 390_000, relaunch: fakeRelaunch });
    assert.equal(recovered.relaunched, true);
    assert.equal(launches, 3);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Windows .lnk shortcuts targeting Antigravity.exe are updated and restored without touching unrelated shortcuts', { skip: process.platform !== 'win32' }, () => {
  const root = mkdtempSync(join(tmpdir(), 'agy-launcher-win-'));
  try {
    const home = join(root, 'home'), dataDir = join(root, 'data');
    const desktop = join(home, 'Desktop');
    mkdirSync(desktop, { recursive: true });
    const fakeAgy = join(root, 'Antigravity.exe'), fakeOther = join(root, 'Other.exe');
    writeFileSync(fakeAgy, ''); writeFileSync(fakeOther, '');
    const agyLnk = join(desktop, 'Antigravity.lnk'), otherLnk = join(desktop, 'Other.lnk');
    spawnSync('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-Command',
      `$ws = New-Object -ComObject WScript.Shell; $s1 = $ws.CreateShortcut($env:L1); $s1.TargetPath = $env:T1; $s1.Arguments = '--wsl-distro=Ubuntu'; $s1.Save(); $s2 = $ws.CreateShortcut($env:L2); $s2.TargetPath = $env:T2; $s2.Save()`
    ], { env: { ...process.env, L1: agyLnk, T1: fakeAgy, L2: otherLnk, T2: fakeOther }, windowsHide: true });

    const configured = configureLaunchers({ home, dataDir, platform: 'win32', sandbox: true });
    assert.deepEqual(configured.updated, [agyLnk]);
    const readArgs = lnk => spawnSync('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-Command', `(New-Object -ComObject WScript.Shell).CreateShortcut($env:L).Arguments`
    ], { env: { ...process.env, L: lnk }, encoding: 'utf8', windowsHide: true }).stdout.trim();
    assert.equal(readArgs(agyLnk), '--wsl-distro=Ubuntu --remote-debugging-port=0');
    assert.equal(readArgs(otherLnk), '');

    const second = configureLaunchers({ home, dataDir, platform: 'win32', sandbox: true });
    assert.deepEqual(second.updated, []);

    const restored = restoreLaunchers({ home, dataDir, platform: 'win32', sandbox: true });
    assert.deepEqual(restored.restored, [agyLnk]);
    assert.equal(readArgs(agyLnk), '--wsl-distro=Ubuntu');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('executable discovery, post-update prompt guards, and relaunch scheduling prevent loops', () => {
  const root = mkdtempSync(join(tmpdir(), 'agy-relaunch-'));
  try {
    const appRoot = join(root, 'Programs', 'antigravity');
    const binDir = join(appRoot, 'resources', 'bin');
    mkdirSync(binDir, { recursive: true });
    const exe = join(appRoot, 'Antigravity.exe'), lsExe = join(binDir, 'language_server.exe');
    writeFileSync(exe, ''); writeFileSync(lsExe, '');
    assert.equal(resolveAntigravityExecutable({ platform: 'win32', env: { ANTIGRAVITY_AGENTAPI_EXE: lsExe }, home: root, execPath: '' }), exe);
    assert.equal(resolveAntigravityExecutable({ platform: 'win32', env: {}, home: root, execPath: exe }), exe);
    assert.equal(manualLaunchCommand({ platform: 'win32', env: {}, home: root, execPath: exe }), `"${exe}" --remote-debugging-port=0`);

    const installDir = join(root, 'installed'), dataDir = join(root, 'data');
    mkdirSync(installDir, { recursive: true }); mkdirSync(dataDir, { recursive: true });
    const receipt = join(installDir, '.agy-install.json');
    writeFileSync(receipt, '{}');
    const now = Date.now();
    assert.equal(shouldPromptPostUpdate({ dataDir, installDir, env: {}, now }).reason, 'non-interactive');
    assert.equal(shouldPromptPostUpdate({ dataDir, installDir, env: { ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:5000', ELECTRON_OZONE_PLATFORM_HINT: 'headless' }, now }).reason, 'non-interactive');
    assert.equal(shouldPromptPostUpdate({ dataDir, installDir, env: { ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:5000' }, now }).reason, 'fresh-install');

    const oldDate = new Date(now - 5 * 60 * 1000);
    utimesSync(receipt, oldDate, oldDate);
    assert.equal(shouldPromptPostUpdate({ dataDir, installDir, env: { ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:5000' }, now }).prompt, true);

    const spawned = [];
    const res = scheduleRelaunchWithDebugPort({
      dataDir,
      home: root,
      platform: 'win32',
      env: { ANTIGRAVITY_AGENTAPI_EXE: lsExe, ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:5000', ELECTRON_RUN_AS_NODE: '1' },
      spawnProcess(cmd, args, opts) { spawned.push({ cmd, args, opts }); return { unref() {} }; }
    });
    assert.equal(res.scheduled, true);
    assert.equal(spawned.length, 1);
    assert.equal(spawned[0].opts.env.ELECTRON_RUN_AS_NODE, undefined);
    assert.equal(spawned[0].opts.env.AGY_RELAUNCH_TARGET, exe);
    assert.ok(spawned[0].opts.env.AGY_RELAUNCH_SCRIPT.endsWith('relaunch-antigravity.ps1'));
    assert.ok(existsSync(spawned[0].opts.env.AGY_RELAUNCH_SCRIPT));
    assert.equal(spawned[0].args.includes('-EncodedCommand'), false);
    if (res.launchMethod === 'explorer-lnk') {
      assert.match(spawned[0].cmd, /explorer\.exe$/i);
      assert.ok(spawned[0].args[0].endsWith('relaunch-antigravity.lnk'));
    } else {
      assert.ok(spawned[0].args.includes('-File'));
    }
    const psBody = readFileSync(spawned[0].opts.env.AGY_RELAUNCH_SCRIPT, 'utf8');
    assert.equal(psBody.includes('FindWindowSW'), false);
    assert.equal(psBody.includes('CreateProcessW'), false);
    assert.ok(psBody.includes('Start-Sleep -Milliseconds 350'));
    assert.ok(psBody.includes('--remote-debugging-port=0'));
    assert.ok(psBody.includes('Remove-Item -LiteralPath $PSCommandPath'));
    assert.equal(shouldPromptPostUpdate({ dataDir, installDir, env: { ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:5000' }, now: now + 1000 }).prompt, false);
    assert.equal(shouldPromptPostUpdate({ dataDir, installDir, env: { ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:6000' }, now: now + 1000 }).reason, 'cooldown');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('macOS relaunch script waits for ancestor Antigravity process without pgrep -f and passes debug port', () => {
  const root = mkdtempSync(join(tmpdir(), 'agy-relaunch-mac-'));
  try {
    const appBundle = join(root, 'Antigravity.app');
    const binDir = join(appBundle, 'Contents', 'Resources', 'bin');
    mkdirSync(binDir, { recursive: true });
    const lsExe = join(binDir, 'language_server');
    writeFileSync(lsExe, '');

    const spawned = [];
    const res = scheduleRelaunchWithDebugPort({
      dataDir: join(root, 'data'),
      home: root,
      platform: 'darwin',
      env: { ANTIGRAVITY_AGENTAPI_EXE: lsExe, ELECTRON_RUN_AS_NODE: '1' },
      spawnProcess(cmd, args, opts) { spawned.push({ cmd, args, opts }); return { unref() {} }; }
    });

    assert.equal(res.scheduled, true);
    assert.equal(res.target, appBundle);
    assert.equal(spawned.length, 1);
    assert.equal(spawned[0].cmd, 'sh');
    assert.equal(spawned[0].args[0], '-c');
    assert.equal(spawned[0].opts.detached, true);
    assert.equal(spawned[0].opts.env.ELECTRON_RUN_AS_NODE, undefined);
    assert.equal(spawned[0].opts.env.AGY_RELAUNCH_TARGET, appBundle);

    const script = spawned[0].args[1];
    assert.ok(script.includes("trap '' HUP TERM"));
    assert.ok(script.includes('/bin/ps -axo args='));
    assert.ok(!script.includes('pgrep -f'));
    assert.ok(!script.includes('osascript'));
    assert.ok(script.includes('/usr/bin/open -n -a "$target" --args --remote-debugging-port=0 >/dev/null 2>&1'));
    assert.ok(!script.includes('--remote-debugging-port=0 >/dev/null 2>&1 &'));

    if (process.platform !== 'win32') {
      const check = spawnSync('sh', ['-n', '-c', script], { encoding: 'utf8' });
      assert.equal(check.status, 0, check.stderr);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Linux relaunch script protects against HUP/TERM and matches executable via ps/awk without pgrep -f', () => {
  const root = mkdtempSync(join(tmpdir(), 'agy-relaunch-linux-'));
  try {
    const exe = join(root, 'antigravity');
    writeFileSync(exe, '');
    const spawned = [];
    const res = scheduleRelaunchWithDebugPort({
      dataDir: join(root, 'data'),
      home: root,
      platform: 'linux',
      env: { APPIMAGE: exe, ELECTRON_RUN_AS_NODE: '1' },
      spawnProcess(cmd, args, opts) { spawned.push({ cmd, args, opts }); return { unref() {} }; }
    });
    assert.equal(res.scheduled, true);
    assert.equal(res.target, exe);
    const script = spawned[0].args[1];
    assert.ok(script.includes("trap '' HUP TERM"));
    assert.ok(script.includes('ps -eo args='));
    assert.ok(!script.includes('pgrep -f'));
    assert.ok(script.includes('--remote-debugging-port=0'));
    if (process.platform !== 'win32') {
      const check = spawnSync('sh', ['-n', '-c', script], { encoding: 'utf8' });
      assert.equal(check.status, 0, check.stderr);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Sidecar Aux Pane Web UI serves post-update prompt copy, enforces token auth, and triggers relaunch', async () => {
  const freePort = await new Promise((resolve, reject) => {
    const s = createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
  });
  let relaunched = 0, checked = 0, installedVer = '', savedMacAuto = true;
  const close = await startSidecarWebUi({
    port: freePort,
    token: 'secret-token',
    version: '2.13.0',
    getStatus: async () => ({
      healthy: false,
      compatibilityError: 'Antigravity compatibility: um (missing)',
      clientVersion: '2.34.0',
      connected: true,
      enabled: true,
      macAutoRelaunch: savedMacAuto,
      language: 'zh-CN'
    }),
    onRelaunch: async () => { relaunched++; return { scheduled: true }; },
    onSetSettings: async patch => { savedMacAuto = Boolean(patch.macAutoRelaunch); return { macAutoRelaunch: savedMacAuto }; },
    onCheckUpdate: async () => { checked++; return { status: 'available', version: '2.13.1', canInstall: true, releaseUrl: 'https://github.com/WhiteBr1ck/agy-powertools/releases/tag/v2.13.1' }; },
    onInstallUpdate: async ({ version }) => { installedVer = version; return { status: 'preparing', version }; },
    onUpdateStatus: async () => ({ status: installedVer ? 'installing' : 'idle', version: installedVer })
  });
  try {
    const html = renderAuxPaneHtml({ version: '2.13.0', language: 'zh-CN' });
    assert.ok(html.includes('需要重启 Antigravity 以启用 Powertools 插件'));
    assert.ok(html.includes('复制启动命令'));
    assert.ok(html.includes('检查插件更新'));
    assert.ok(html.includes('复制诊断信息'));
    assert.ok(html.includes('id="mac-auto-relaunch-row"'));
    assert.ok(html.includes('id="mac-auto-relaunch-toggle"'));
    assert.ok(html.includes("data.platform === 'darwin'"));
    assert.ok(!html.includes('Antigravity (Powertools).app'));
    assert.ok(html.includes('[hidden] { display: none !important; }'));
    assert.equal(html.includes('\u00b7'), false);
    const inlineScript = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
    assert.ok(inlineScript);
    new Function(inlineScript);

    assert.equal((await fetch(`http://127.0.0.1:${freePort}/api/settings`, { method: 'POST', body: '{"macAutoRelaunch":false}' })).status, 401);
    const badSettings = await fetch(`http://127.0.0.1:${freePort}/api/settings`, {
      method: 'POST',
      headers: { 'x-sidecar-token': 'secret-token', 'Content-Type': 'application/json' },
      body: '{"other":1}'
    });
    assert.equal(badSettings.status, 400);
    const okSettings = await fetch(`http://127.0.0.1:${freePort}/api/settings`, {
      method: 'POST',
      headers: { 'x-sidecar-token': 'secret-token', 'Content-Type': 'application/json' },
      body: '{"macAutoRelaunch":false}'
    });
    assert.equal(okSettings.status, 200);
    assert.equal(savedMacAuto, false);

    const unauth = await fetch(`http://127.0.0.1:${freePort}/api/status`);
    assert.equal(unauth.status, 401);

    const statusRes = await fetch(`http://127.0.0.1:${freePort}/api/status?token=secret-token`);
    assert.equal(statusRes.status, 200);
    const statusJson = await statusRes.json();
    assert.equal(statusJson.healthy, false);
    assert.equal(statusJson.version, '2.13.0');
    assert.equal(statusJson.compatibilityError, 'Antigravity compatibility: um (missing)');
    assert.equal(statusJson.clientVersion, '2.34.0');

    const badPost = await fetch(`http://127.0.0.1:${freePort}/api/relaunch`, { method: 'POST' });
    assert.equal(badPost.status, 401);
    assert.equal(relaunched, 0);

    const okPost = await fetch(`http://127.0.0.1:${freePort}/api/relaunch`, {
      method: 'POST',
      headers: { 'x-sidecar-token': 'secret-token' }
    });
    assert.equal(okPost.status, 200);
    assert.equal(relaunched, 1);

    assert.equal((await fetch(`http://127.0.0.1:${freePort}/api/update/check`, { method: 'POST' })).status, 401);
    assert.equal((await fetch(`http://127.0.0.1:${freePort}/api/update/install`, { method: 'POST' })).status, 401);
    assert.equal((await fetch(`http://127.0.0.1:${freePort}/api/update/status`)).status, 401);

    const checkRes = await fetch(`http://127.0.0.1:${freePort}/api/update/check`, {
      method: 'POST',
      headers: { 'x-sidecar-token': 'secret-token', 'Content-Type': 'application/json' },
      body: '{}'
    });
    assert.equal(checkRes.status, 200);
    assert.equal((await checkRes.json()).version, '2.13.1');
    assert.equal(checked, 1);

    const installRes = await fetch(`http://127.0.0.1:${freePort}/api/update/install`, {
      method: 'POST',
      headers: { 'x-sidecar-token': 'secret-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: '2.13.1' })
    });
    assert.equal(installRes.status, 200);
    assert.equal(installedVer, '2.13.1');

    const updStatusRes = await fetch(`http://127.0.0.1:${freePort}/api/update/status?token=secret-token`);
    assert.equal(updStatusRes.status, 200);
    assert.equal((await updStatusRes.json()).status, 'installing');
  } finally {
    await close();
  }
});

test('resolveLocalFilePath and resolveVerifiedLocalFilePath verify non-global IPs via DNS without domain suffix hardcoding', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'agy-file-uri-'));
  try {
    const file = join(dir, 'sample #1.md');
    writeFileSync(file, 'hello', 'utf8');
    const fileUri = `${pathToFileURL(file).href}#L10-L20`;
    assert.equal(resolveLocalFilePath(fileUri), file);
    // Unescaped '#' in directory/file names (e.g. project-C#/app.exe) must not be truncated as URL hash
    const hashDir = join(dir, 'project-C#');
    mkdirSync(hashDir);
    const hashFile = join(hashDir, 'app.exe');
    writeFileSync(hashFile, 'bin', 'utf8');
    const rawHashUri = pathToFileURL(hashFile).href.replaceAll('%23', '#');
    assert.equal(resolveLocalFilePath(rawHashUri), hashFile);
    assert.equal(resolveLocalFilePath(`${rawHashUri}#L10-L20`), hashFile);
    // Antigravity URI serializer encodes '/' and second '#' inside the fragment as %2F and %23
    const fragStart = rawHashUri.indexOf('#');
    const encodedFragUri = `${rawHashUri.slice(0, fragStart + 1)}${rawHashUri.slice(fragStart + 1).replaceAll('/', '%2F')}`;
    assert.equal(resolveLocalFilePath(encodedFragUri), hashFile);
    assert.equal(resolveLocalFilePath(`${encodedFragUri}%23L10-L20`), hashFile);
    const readmeInHashDir = join(hashDir, 'README.md');
    writeFileSync(readmeInHashDir, '# hi', 'utf8');
    const rawReadmeUri = pathToFileURL(readmeInHashDir).href.replaceAll('%23', '#');
    assert.equal(resolveLocalFilePath(`${rawReadmeUri}#installation`), readmeInHashDir);
    const readmeFragStart = rawReadmeUri.indexOf('#');
    const encodedReadmeUri = `${rawReadmeUri.slice(0, readmeFragStart + 1)}${rawReadmeUri.slice(readmeFragStart + 1).replaceAll('/', '%2F')}%23installation`;
    assert.equal(resolveLocalFilePath(encodedReadmeUri), readmeInHashDir);
    assert.throws(() => resolveLocalFilePath('https://example.com/a.md'), /仅支持本地文件链接/);
    assert.throws(() => resolveLocalFilePath('file://evil.example/share/a.md'), /仅支持本机或局域网文件路径/);
    assert.throws(() => resolveLocalFilePath('file://8.8.8.8/share/a.md', { platform: 'win32' }), /仅支持本机或局域网文件路径/);
    assert.throws(() => resolveLocalFilePath('file://192.168.1.10/share/a.md', { platform: 'darwin' }), /仅支持本机或局域网文件路径/);
    assert.equal(resolveLocalFilePath('file://192.168.1.10/share/%E4%BA%AE%E5%BA%A6%20%E5%AF%B9%E6%AF%94%E5%BA%A6.png', { platform: 'win32' }), '\\\\192.168.1.10\\share\\亮度 对比度.png');
    assert.equal(resolveLocalFilePath('file:////192.168.1.10/share/shot.png', { platform: 'win32' }), '\\\\192.168.1.10\\share\\shot.png');
    assert.equal(resolveLocalFilePath('file://100.64.1.2/media/clip.mp4', { platform: 'win32' }), '\\\\100.64.1.2\\media\\clip.mp4');
    assert.equal(resolveLocalFilePath('file://wsl.localhost/Ubuntu-24.04/home/dev/a.txt', { platform: 'win32' }), '\\\\wsl.localhost\\Ubuntu-24.04\\home\\dev\\a.txt');
    assert.equal(resolveLocalFilePath('file://wsl$/Ubuntu-24.04/home/dev/a.txt', { platform: 'win32' }), '\\\\wsl$\\Ubuntu-24.04\\home\\dev\\a.txt');
    assert.throws(() => resolveLocalFilePath(''), /文件路径无效/);

    // Async DNS-before-SMB verification allows any hostname resolving strictly to non-global IPs (custom split-DNS, Tailscale MagicDNS, NetBIOS)
    const dnsCalls = [];
    const fakeLookup = async host => {
      dnsCalls.push(host);
      if (host === 'nas') return [{ address: '192.168.1.20', family: 4 }];
      if (host === 'nas.mycompany.com') return [{ address: '10.20.30.40', family: 4 }];
      if (host === 'synology.tail1a2b.ts.net') return [{ address: '100.64.2.9', family: 4 }, { address: 'fd7a:115c:a1e0::1', family: 6 }];
      if (host === 'evil.example') return [{ address: '93.184.216.34', family: 4 }];
      if (host === 'dual.example') return [{ address: '192.168.1.10', family: 4 }, { address: '8.8.8.8', family: 4 }];
      throw new Error('ENOTFOUND');
    };
    assert.equal(await resolveVerifiedLocalFilePath('file://192.168.1.10/share/a.png', { platform: 'win32', lookup: fakeLookup }), '\\\\192.168.1.10\\share\\a.png');
    assert.equal(dnsCalls.length, 0); // Literal IPs skip DNS completely
    assert.equal(await resolveVerifiedLocalFilePath('file://nas/photos/test.png', { platform: 'win32', lookup: fakeLookup }), '\\\\nas\\photos\\test.png');
    assert.equal(await resolveVerifiedLocalFilePath('file://nas.mycompany.com/share/doc.pdf', { platform: 'win32', lookup: fakeLookup }), '\\\\nas.mycompany.com\\share\\doc.pdf');
    assert.equal(await resolveVerifiedLocalFilePath('file://synology.tail1a2b.ts.net/media/a.png', { platform: 'win32', lookup: fakeLookup }), '\\\\synology.tail1a2b.ts.net\\media\\a.png');
    await assert.rejects(() => resolveVerifiedLocalFilePath('file://evil.example/share/a.md', { platform: 'win32', lookup: fakeLookup }), /仅支持本机或局域网文件路径/);
    await assert.rejects(() => resolveVerifiedLocalFilePath('file://dual.example/share/a.md', { platform: 'win32', lookup: fakeLookup }), /仅支持本机或局域网文件路径/);
    await assert.rejects(() => resolveVerifiedLocalFilePath('file://unknown-host/share/a.md', { platform: 'win32', lookup: fakeLookup }), /无法解析局域网主机路径/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('openLocalFile dispatches platform commands and blocks runnable Windows files on open', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'agy-open-file-'));
  try {
    const doc = join(dir, 'notes.md');
    const commaFile = join(dir, 'a,b.txt');
    const script = join(dir, 'run.js');
    writeFileSync(doc, '# hi', 'utf8');
    writeFileSync(commaFile, 'x', 'utf8');
    writeFileSync(script, 'console.log(1)', 'utf8');
    const calls = [];
    const fakeSpawn = (cmd, args, opts) => {
      calls.push({ cmd, args, opts });
      return { unref() {} };
    };

    await openLocalFile(pathToFileURL(doc).href, { action: 'open', platform: 'win32', spawnProcess: fakeSpawn });
    await openLocalFile(pathToFileURL(doc).href, { action: 'reveal', platform: 'win32', spawnProcess: fakeSpawn });
    await openLocalFile(pathToFileURL(commaFile).href, { action: 'reveal', platform: 'win32', spawnProcess: fakeSpawn });
    await openLocalFile(pathToFileURL(doc).href, { action: 'reveal', platform: 'darwin', spawnProcess: fakeSpawn });
    await openLocalFile(pathToFileURL(doc).href, { action: 'reveal', platform: 'linux', spawnProcess: fakeSpawn });
    await openLocalFile(pathToFileURL(script).href, { action: 'reveal', platform: 'win32', spawnProcess: fakeSpawn });

    assert.deepEqual(calls[0], { cmd: 'explorer.exe', args: [doc], opts: { detached: true, stdio: 'ignore' } });
    assert.deepEqual(calls[1], { cmd: 'explorer.exe', args: [`/select,"${doc}"`], opts: { detached: true, stdio: 'ignore', windowsVerbatimArguments: true } });
    assert.deepEqual(calls[2], { cmd: 'explorer.exe', args: [`/select,"${commaFile}"`], opts: { detached: true, stdio: 'ignore', windowsVerbatimArguments: true } });
    assert.deepEqual(calls[3], { cmd: 'open', args: ['-R', doc], opts: { detached: true, stdio: 'ignore' } });
    assert.deepEqual(calls[4], { cmd: 'xdg-open', args: [dir], opts: { detached: true, stdio: 'ignore' } });
    assert.deepEqual(calls[5], { cmd: 'explorer.exe', args: [`/select,"${script}"`], opts: { detached: true, stdio: 'ignore', windowsVerbatimArguments: true } });

    // Windows local drive paths with spaces and Unicode quote only the path after /select,
    await openLocalFile('file:///D:/work/2026%20%E9%A1%B9%E7%9B%AE%E5%BD%92%E6%A1%A3/demo-%E5%8E%9F%E5%9B%BE.gif', {
      action: 'reveal',
      platform: 'win32',
      spawnProcess: fakeSpawn,
      exists: () => true,
      stat: () => ({ isDirectory: () => false })
    });
    assert.deepEqual(calls[6], {
      cmd: 'explorer.exe',
      args: ['/select,"D:\\work\\2026 项目归档\\demo-原图.gif"'],
      opts: { detached: true, stdio: 'ignore', windowsVerbatimArguments: true }
    });

    // Windows LAN UNC paths with spaces quote cleanly for explorer /select
    await openLocalFile('file://192.168.1.10/share/a%20b.png', {
      action: 'reveal',
      platform: 'win32',
      spawnProcess: fakeSpawn,
      exists: () => true,
      stat: () => ({ isDirectory: () => false })
    });
    assert.deepEqual(calls[7], {
      cmd: 'explorer.exe',
      args: ['/select,"\\\\192.168.1.10\\share\\a b.png"'],
      opts: { detached: true, stdio: 'ignore', windowsVerbatimArguments: true }
    });

    // Drive roots open directly without /select
    await openLocalFile('file:///D:/', {
      action: 'reveal',
      platform: 'win32',
      spawnProcess: fakeSpawn,
      exists: () => true,
      stat: () => ({ isDirectory: () => true })
    });
    assert.deepEqual(calls[8], {
      cmd: 'explorer.exe',
      args: ['D:\\'],
      opts: { detached: true, stdio: 'ignore' }
    });

    assert.equal(isWindowsRunnableFile(script), true);
    assert.equal(isWindowsRunnableFile(doc), false);
    await assert.rejects(() => openLocalFile(pathToFileURL(script).href, { action: 'open', platform: 'win32', spawnProcess: fakeSpawn }), /可能直接执行/);
    await assert.rejects(() => openLocalFile(pathToFileURL(doc).href, { action: 'delete', spawnProcess: fakeSpawn }), /不支持的文件操作/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('copyLocalFile runs asynchronously across platforms with safe URI encoding', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'agy-copy-file-'));
  try {
    const file = join(dir, 'shot #1.png');
    writeFileSync(file, 'png', 'utf8');
    const fileUri = pathToFileURL(file).href;
    const calls = [];
    const fakeSpawn = (cmd, args, opts) => {
      const child = new EventEmitter();
      child.stderr = new EventEmitter();
      let written = '';
      child.stdin = { on() {}, end(chunk) { written += String(chunk || ''); } };
      child.kill = () => {};
      const entry = { cmd, args, opts, get stdin() { return written; } };
      calls.push(entry);
      queueMicrotask(() => {
        if (cmd === 'wl-copy') child.emit('error', new Error('ENOENT'));
        else child.emit('close', 0);
      });
      return child;
    };

    await copyLocalFile(fileUri, { platform: 'win32', spawnProcess: fakeSpawn, env: {} });
    await copyLocalFile(fileUri, { platform: 'darwin', spawnProcess: fakeSpawn, env: {} });
    await copyLocalFile(fileUri, { platform: 'linux', spawnProcess: fakeSpawn, env: {} });

    assert.equal(calls[0].cmd, 'powershell.exe');
    assert.equal(calls[0].opts.env.AGY_CLIPBOARD_PATH, file);
    assert.equal(calls[1].cmd, 'osascript');
    assert.equal(calls[1].opts.env.AGY_CLIPBOARD_PATH, file);
    assert.equal(calls[2].cmd, 'wl-copy');
    assert.equal(calls[3].cmd, 'xclip');
    assert.equal(calls[3].stdin, `${pathToFileURL(file).href}\n`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('isRemoteSshEnvironment detects headless SSH remote hosts without false positives on local desktop', () => {
  assert.equal(isRemoteSshEnvironment({ platform: 'linux', env: { SSH_CONNECTION: '1.2.3.4 22', ANTIGRAVITY_VSCODE_HOST: '1' } }), true);
  assert.equal(isRemoteSshEnvironment({ platform: 'linux', env: { ANTIGRAVITY_VSCODE_HOST: '1' } }), true);
  assert.equal(isRemoteSshEnvironment({ platform: 'linux', env: { SSH_CONNECTION: '1.2.3.4 22', DISPLAY: ':0' } }), false);
  assert.equal(isRemoteSshEnvironment({ platform: 'linux', env: { WAYLAND_DISPLAY: 'wayland-0' } }), false);
  assert.equal(isRemoteSshEnvironment({ platform: 'win32', env: { SSH_CONNECTION: '1.2.3.4 22' } }), false);
  const html = renderAuxPaneHtml({ version: '2.12.8', language: 'zh-CN' });
  assert.ok(html.includes('当前处于 SSH 远端模式'));
});

test('scheduleRelaunchWithDebugPort reads saved proxy settings across platforms without creating shortcuts', () => {
  const root = mkdtempSync(join(tmpdir(), 'agy-relaunch-proxy-'));
  try {
    const dataDir = join(root, 'data');
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(join(dataDir, 'settings.json'), JSON.stringify({
      proxyEnabled: true,
      proxyUrl: 'socks5h://127.0.0.1:7897',
      proxyBypass: '192.168.0.0/16',
      proxyForceHttp1: true
    }));

    // Windows: reads settings.json automatically (so account switch & update relaunch preserve proxy)
    const winExe = join(root, 'AppData', 'Local', 'Programs', 'antigravity', 'Antigravity.exe');
    mkdirSync(join(root, 'AppData', 'Local', 'Programs', 'antigravity'), { recursive: true });
    writeFileSync(winExe, '');
    const winSpawned = [];
    const winRes = scheduleRelaunchWithDebugPort({
      dataDir,
      home: root,
      platform: 'win32',
      env: { LOCALAPPDATA: join(root, 'AppData', 'Local') },
      spawnProcess(cmd, args, opts) { winSpawned.push({ cmd, args, opts }); return { unref() {} }; }
    });
    assert.equal(winRes.proxyActive, true);
    const psBody = readFileSync(winSpawned[0].opts.env.AGY_RELAUNCH_SCRIPT, 'utf8');
    assert.ok(psBody.includes("$env:HTTPS_PROXY = 'socks5h://127.0.0.1:7897'"));
    assert.ok(psBody.includes("$env:NO_PROXY = 'localhost,127.0.0.1,::1,192.168.0.0/16'"));
    assert.ok(psBody.includes("$env:GODEBUG = 'http2client=0'"));
    assert.ok(psBody.includes('"--proxy-server=socks5://127.0.0.1:7897"'));
    assert.ok(psBody.includes('"--proxy-bypass-list=localhost;127.0.0.1;[::1];192.168.0.0/16"'));

    // macOS: injects env + --env flags + Chromium proxy args and clears helper vars
    const macApp = join(root, 'Antigravity.app');
    mkdirSync(join(macApp, 'Contents', 'Resources', 'bin'), { recursive: true });
    const macLs = join(macApp, 'Contents', 'Resources', 'bin', 'language_server');
    writeFileSync(macLs, '');
    const macSpawned = [];
    const macRes = scheduleRelaunchWithDebugPort({
      dataDir,
      home: root,
      platform: 'darwin',
      env: { ANTIGRAVITY_AGENTAPI_EXE: macLs },
      spawnProcess(cmd, args, opts) { macSpawned.push({ cmd, args, opts }); return { unref() {} }; }
    });
    assert.equal(macRes.proxyActive, true);
    assert.equal(macSpawned[0].opts.env.AGY_PROXY_URL, 'socks5h://127.0.0.1:7897');
    assert.equal(macSpawned[0].opts.env.AGY_PROXY_CHROME_SERVER, 'socks5://127.0.0.1:7897');
    assert.ok(macSpawned[0].args[1].includes('--env "HTTPS_PROXY=$p_url"'));
    assert.ok(macSpawned[0].args[1].includes('--proxy-server=$p_chrome'));
    assert.ok(macSpawned[0].args[1].includes('unset AGY_PROXY_URL'));

    // Linux: exports env + passes Chromium args
    const linExe = join(root, 'antigravity');
    writeFileSync(linExe, '');
    const linSpawned = [];
    const linRes = scheduleRelaunchWithDebugPort({
      dataDir,
      home: root,
      platform: 'linux',
      env: { APPIMAGE: linExe },
      spawnProcess(cmd, args, opts) { linSpawned.push({ cmd, args, opts }); return { unref() {} }; }
    });
    assert.equal(linRes.proxyActive, true);
    assert.ok(linSpawned[0].args[1].includes('export HTTP_PROXY="$p_url"'));
    assert.ok(linSpawned[0].args[1].includes('--proxy-server=$p_chrome'));

    // Disabled proxy: Windows relaunch explicitly clears stale proxy env vars
    writeFileSync(join(dataDir, 'settings.json'), JSON.stringify({ proxyEnabled: false, proxyUrl: 'http://127.0.0.1:7897' }));
    const offSpawned = [];
    const offRes = scheduleRelaunchWithDebugPort({
      dataDir,
      home: root,
      platform: 'win32',
      env: { LOCALAPPDATA: join(root, 'AppData', 'Local') },
      spawnProcess(cmd, args, opts) { offSpawned.push({ cmd, args, opts }); return { unref() {} }; }
    });
    assert.equal(offRes.proxyActive, false);
    const psOffBody = readFileSync(offSpawned[0].opts.env.AGY_RELAUNCH_SCRIPT, 'utf8');
    assert.ok(psOffBody.includes('Remove-Item Env:HTTP_PROXY'));
    assert.ok(!psOffBody.includes('--proxy-server='));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('readLocalFileForAttach returns base64 media for images/PDFs, mentions for code/folders/oversized, and rejects missing or remote URIs', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'agy-attach-'));
  try {
    const imgPath = join(dir, 'sample.png');
    const imgBytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    writeFileSync(imgPath, imgBytes);
    const pdfPath = join(dir, 'spec.pdf');
    writeFileSync(pdfPath, Buffer.from('%PDF-1.7\n'));
    const codePath = join(dir, 'index.mjs');
    writeFileSync(codePath, 'export const ok = true;\n');
    const subDir = join(dir, 'folder');
    mkdirSync(subDir);

    const imgRes = await readLocalFileForAttach(pathToFileURL(imgPath).href);
    assert.equal(imgRes.mode, 'media');
    assert.equal(imgRes.mimeType, 'image/png');
    assert.equal(imgRes.name, 'sample.png');
    assert.equal(imgRes.base64, imgBytes.toString('base64'));

    const pdfRes = await readLocalFileForAttach(pathToFileURL(pdfPath).href);
    assert.equal(pdfRes.mode, 'media');
    assert.equal(pdfRes.mimeType, 'application/pdf');

    const oversizedRes = await readLocalFileForAttach(pathToFileURL(imgPath).href, { maxMediaBytes: 4 });
    assert.equal(oversizedRes.mode, 'mention');
    assert.equal(oversizedRes.oversized, true);
    assert.equal(oversizedRes.base64, undefined);

    const codeRes = await readLocalFileForAttach(pathToFileURL(codePath).href);
    assert.equal(codeRes.mode, 'mention');
    assert.equal(codeRes.kind, 'file');
    assert.equal(codeRes.isDirectory, false);

    const dirRes = await readLocalFileForAttach(pathToFileURL(subDir).href);
    assert.equal(dirRes.mode, 'mention');
    assert.equal(dirRes.kind, 'directory');
    assert.equal(dirRes.isDirectory, true);

    await assert.rejects(() => readLocalFileForAttach(pathToFileURL(join(dir, 'missing.png')).href), /不存在/);
    await assert.rejects(() => readLocalFileForAttach('https://example.com/a.png'), /仅支持本地文件/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('parseFileUriAnchor, discoverOpenWithApps, and openFileWithApp detect installed local apps, jump to exact lines, open terminals in parent dir, and guard Windows .cmd', async () => {
  assert.deepEqual(parseFileUriAnchor('file:///repo/a.js#L42'), { line: 42, column: null });
  assert.deepEqual(parseFileUriAnchor('file:///repo/a.js#L18C7-L25'), { line: 18, column: 7 });
  assert.deepEqual(parseFileUriAnchor('file:///repo/a.js#L9:3'), { line: 9, column: 3 });
  assert.deepEqual(parseFileUriAnchor('file:///repo/README.md#overview'), { line: null, column: null });

  const wslResolved = resolveLocalFilePath('file://wsl.localhost/Ubuntu/home/dev/app.ts#L12', { platform: 'linux' });
  assert.equal(wslResolved, '/home/dev/app.ts');
  const encodedWinDrive = resolveLocalFilePath('file:///d%3A/repo/lib/launcher.mjs', { platform: 'win32' });
  assert.equal(encodedWinDrive, 'd:\\repo\\lib\\launcher.mjs');

  const dir = mkdtempSync(join(tmpdir(), 'agy-editor-'));
  try {
    const posixBin = '/mock/bin';
    const cursorBin = join(posixBin, 'cursor');
    const zedBin = join(posixBin, 'zed');
    const kittyBin = join(posixBin, 'kitty');
    const posixFile = '/workspace/main.mjs';
    const linuxExists = p => p === posixFile || p === cursorBin || p === zedBin || p === kittyBin;

    const linuxApps = discoverOpenWithApps({ platform: 'linux', env: { PATH: posixBin }, home: '/mock/home', exists: linuxExists, readdir: () => [] });
    assert.deepEqual(linuxApps.map(a => a.id), ['cursor', 'zed', 'default', 'explorer', 'kitty']);

    const calls = [];
    const fakeSpawn = (cmd, args, opts) => {
      calls.push({ cmd, args, opts });
      return { on() {}, unref() {} };
    };

    const uriWithLine = 'file:///workspace/main.mjs#L27C4';
    const resCursor = await openFileWithApp(uriWithLine, 'cursor', {
      platform: 'linux',
      env: { PATH: posixBin },
      home: '/mock/home',
      exists: linuxExists,
      readdir: () => [],
      stat: () => ({ isDirectory: () => false }),
      spawnProcess: fakeSpawn
    });
    assert.equal(resCursor.appId, 'cursor');
    assert.equal(resCursor.line, 27);
    assert.equal(resCursor.column, 4);
    assert.deepEqual(calls[0].args, ['-g', `${posixFile}:27:4`]);

    const resZed = await openFileWithApp(uriWithLine, 'zed', {
      platform: 'linux',
      env: { PATH: posixBin },
      home: '/mock/home',
      exists: linuxExists,
      readdir: () => [],
      stat: () => ({ isDirectory: () => false }),
      spawnProcess: fakeSpawn
    });
    assert.equal(resZed.appId, 'zed');
    assert.deepEqual(calls[1].args, [`${posixFile}:27:4`]);

    await openFileWithApp(uriWithLine, 'kitty', {
      platform: 'linux',
      env: { PATH: posixBin },
      home: '/mock/home',
      exists: linuxExists,
      readdir: () => [],
      stat: () => ({ isDirectory: () => false }),
      spawnProcess: fakeSpawn
    });
    assert.equal(calls[2].opts.cwd, '/workspace');

    await assert.rejects(
      () => openFileWithApp(uriWithLine, 'windsurf', {
        platform: 'linux',
        env: { PATH: posixBin },
        home: '/mock/home',
        exists: linuxExists,
        readdir: () => [],
        stat: () => ({ isDirectory: () => false }),
        spawnProcess: fakeSpawn
      }),
      /未在本机检测到/
    );

    // Windows .cmd fallback blocks shell metacharacters (&, |, %, etc.) to prevent cmd.exe injection
    const binDir = join(dir, 'bin');
    mkdirSync(binDir);
    const winCmd = join(binDir, 'code.cmd');
    writeFileSync(winCmd, '@echo off\r\n');
    const unsafeFile = join(dir, 'a&calc.js');
    writeFileSync(unsafeFile, '');
    await assert.rejects(
      () => openFileWithApp(pathToFileURL(unsafeFile).href, 'vscode', {
        platform: 'win32',
        env: { PATH: binDir },
        home: dir,
        exists: p => p === winCmd || p === unsafeFile,
        readdir: () => [],
        stat: () => ({ isDirectory: () => false }),
        spawnProcess: fakeSpawn
      }),
      /敏感字符/
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});


test('maybeAutoRelaunchProxy automatically relaunches once on cold start when non-TUN proxy is configured and reachable, skips when unreachable, and guards against loops', async () => {
  const { maybeAutoRelaunchProxy, recordProxyReady } = await import('../lib/launcher.mjs');
  const root = mkdtempSync(join(tmpdir(), 'agy-proxy-auto-'));
  try {
    const dataDir = join(root, 'data');
    mkdirSync(dataDir, { recursive: true });
    let relaunchedCount = 0;
    const fakeRelaunch = () => { relaunchedCount++; return { scheduled: true }; };
    const env = { ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:41001', LOCALAPPDATA: root };
    const fakeExe = join(root, 'Programs', 'antigravity', 'Antigravity.exe');
    mkdirSync(join(root, 'Programs', 'antigravity'), { recursive: true });
    writeFileSync(fakeExe, '');

    // 1. Proxy port unreachable -> must NOT relaunch
    const rUnreach = await maybeAutoRelaunchProxy({
      dataDir, home: root, platform: 'win32', env,
      enabled: true, proxyEnabled: true, proxyUrl: 'http://127.0.0.1:7897',
      runtimeProxyReason: 'not-applied', now: 1_000_000,
      checkPort: async () => ({ ok: false, error: 'closed' }),
      relaunch: fakeRelaunch
    });
    assert.equal(rUnreach.relaunched, false);
    assert.equal(rUnreach.reason, 'proxy-unreachable');
    assert.equal(relaunchedCount, 0);

    // 2. Proxy port open -> relaunches once
    const rOk = await maybeAutoRelaunchProxy({
      dataDir, home: root, platform: 'win32', env,
      enabled: true, proxyEnabled: true, proxyUrl: 'http://127.0.0.1:7897',
      runtimeProxyReason: 'not-applied', now: 1_000_000,
      checkPort: async () => ({ ok: true }),
      relaunch: fakeRelaunch
    });
    assert.equal(rOk.relaunched, true);
    assert.equal(relaunchedCount, 1);

    // 3. Same LS session -> blocked by already-attempted-session
    const rSame = await maybeAutoRelaunchProxy({
      dataDir, home: root, platform: 'win32', env,
      enabled: true, proxyEnabled: true, proxyUrl: 'http://127.0.0.1:7897',
      runtimeProxyReason: 'not-applied', now: 1_500_000,
      checkPort: async () => ({ ok: true }),
      relaunch: fakeRelaunch
    });
    assert.equal(rSame.relaunched, false);
    assert.equal(rSame.reason, 'already-attempted-session');

    // 4. New session within cooldown -> blocked by cooldown
    const rCool = await maybeAutoRelaunchProxy({
      dataDir, home: root, platform: 'win32', env: { ...env, ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:41002' },
      enabled: true, proxyEnabled: true, proxyUrl: 'http://127.0.0.1:7897',
      runtimeProxyReason: 'not-applied', now: 1_030_000,
      checkPort: async () => ({ ok: true }),
      relaunch: fakeRelaunch
    });
    assert.equal(rCool.relaunched, false);
    assert.equal(rCool.reason, 'cooldown');

    // 5. Second consecutive failure opens circuit breaker on 3rd attempt; recordProxyReady resets it
    await maybeAutoRelaunchProxy({
      dataDir, home: root, platform: 'win32', env: { ...env, ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:41003' },
      enabled: true, proxyEnabled: true, proxyUrl: 'http://127.0.0.1:7897',
      runtimeProxyReason: 'not-applied', now: 1_300_000,
      checkPort: async () => ({ ok: true }),
      relaunch: fakeRelaunch
    });
    assert.equal(relaunchedCount, 2);
    const rCircuit = await maybeAutoRelaunchProxy({
      dataDir, home: root, platform: 'win32', env: { ...env, ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:41004' },
      enabled: true, proxyEnabled: true, proxyUrl: 'http://127.0.0.1:7897',
      runtimeProxyReason: 'not-applied', now: 1_600_000,
      checkPort: async () => ({ ok: true }),
      relaunch: fakeRelaunch
    });
    assert.equal(rCircuit.relaunched, false);
    assert.equal(rCircuit.reason, 'circuit-open');

    recordProxyReady({ dataDir });
    const rReset = await maybeAutoRelaunchProxy({
      dataDir, home: root, platform: 'win32', env: { ...env, ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:41005' },
      enabled: true, proxyEnabled: true, proxyUrl: 'http://127.0.0.1:7897',
      runtimeProxyReason: 'not-applied', now: 1_900_000,
      checkPort: async () => ({ ok: true }),
      relaunch: fakeRelaunch
    });
    assert.equal(rReset.relaunched, true);
    assert.equal(relaunchedCount, 3);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('relaunch scripts escalate lingering POSIX processes to SIGKILL, resolve Linux symlinks, and preserve user system proxy env when plugin proxy is off', () => {
  const root = mkdtempSync(join(tmpdir(), 'agy-relaunch-harden-'));
  try {
    const dataDir = join(root, 'data');
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(join(dataDir, 'settings.json'), JSON.stringify({ proxyEnabled: false }));

    // 1. Linux: symlink target resolves realpath, targets main Electron PID before helpers, escalates to SIGKILL, and guards proxy unset
    const realExe = join(root, 'opt-antigravity');
    const symExe = join(root, 'bin-antigravity');
    writeFileSync(realExe, '');
    if (process.platform !== 'win32') symlinkSync(realExe, symExe);
    const linSpawned = [];
    const linRes = scheduleRelaunchWithDebugPort({
      dataDir,
      home: root,
      platform: 'linux',
      env: { APPIMAGE: process.platform !== 'win32' ? symExe : realExe },
      spawnProcess(cmd, args, opts) { linSpawned.push({ cmd, args, opts }); return { unref() {} }; }
    });
    assert.equal(linRes.scheduled, true);
    assert.equal(linSpawned[0].opts.env.AGY_RELAUNCH_REAL, realpathSync(realExe));
    const linScript = linSpawned[0].args[1];
    assert.ok(linScript.includes('index($0, " --type=") == 0 && index($0, " --import=") == 0'));
    assert.ok(linScript.includes('kill -KILL $rem_pids'));
    assert.ok(linScript.includes('if [ -n "$AGY_POWERTOOLS_PROXY_SPEC" ]; then unset HTTP_PROXY'));
    assert.ok(linScript.includes('unset AGY_RELAUNCH_TARGET AGY_RELAUNCH_REAL'));
    if (process.platform !== 'win32') {
      assert.equal(spawnSync('sh', ['-n', '-c', linScript], { encoding: 'utf8' }).status, 0);
    }

    // 2. macOS: escalates lingering processes to SIGKILL and guards proxy unset behind AGY_POWERTOOLS_PROXY_SPEC
    const macApp = join(root, 'Antigravity.app');
    mkdirSync(join(macApp, 'Contents', 'Resources', 'bin'), { recursive: true });
    const macLs = join(macApp, 'Contents', 'Resources', 'bin', 'language_server');
    writeFileSync(macLs, '');
    const macSpawned = [];
    scheduleRelaunchWithDebugPort({
      dataDir,
      home: root,
      platform: 'darwin',
      env: { ANTIGRAVITY_AGENTAPI_EXE: macLs },
      spawnProcess(cmd, args, opts) { macSpawned.push({ cmd, args, opts }); return { unref() {} }; }
    });
    const macScript = macSpawned[0].args[1];
    assert.ok(macScript.includes('kill -KILL $pids'));
    assert.ok(macScript.includes('if [ -n "$AGY_POWERTOOLS_PROXY_SPEC" ]; then unset HTTP_PROXY'));
    if (process.platform !== 'win32') {
      assert.equal(spawnSync('sh', ['-n', '-c', macScript], { encoding: 'utf8' }).status, 0);
    }

    // 3. Windows: guards Remove-Item Env:HTTP_PROXY behind $env:AGY_POWERTOOLS_PROXY_SPEC
    const winExe = join(root, 'AppData', 'Local', 'Programs', 'antigravity', 'Antigravity.exe');
    mkdirSync(join(root, 'AppData', 'Local', 'Programs', 'antigravity'), { recursive: true });
    writeFileSync(winExe, '');
    const winSpawned = [];
    scheduleRelaunchWithDebugPort({
      dataDir,
      home: root,
      platform: 'win32',
      env: { LOCALAPPDATA: join(root, 'AppData', 'Local') },
      spawnProcess(cmd, args, opts) { winSpawned.push({ cmd, args, opts }); return { unref() {} }; }
    });
    const psBody = readFileSync(winSpawned[0].opts.env.AGY_RELAUNCH_SCRIPT, 'utf8');
    assert.ok(psBody.includes('if ($env:AGY_POWERTOOLS_PROXY_SPEC) {'));
    assert.ok(psBody.includes('Remove-Item Env:HTTP_PROXY'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Windows relaunch uses zero-AMSI Explorer .lnk (no -EncodedCommand/DCOM/VBS), verifies proxy args, syncs onboarding app_storage.json post-exit, detaches ConPTY via -LaunchOnly two-hop, and parses cleanly in PowerShell 5.1 (Issues #53, #59 & #61)', async () => {
  const root = mkdtempSync(join(tmpdir(), 'agy-win-relaunch-53-'));
  try {
    const dataDir = join(root, 'data');
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(join(dataDir, 'settings.json'), JSON.stringify({
      proxyEnabled: true,
      proxyUrl: 'http://127.0.0.1:7897',
      proxyBypass: '192.168.0.0/16',
      proxyForceHttp1: false
    }));
    const winExe = join(root, 'AppData', 'Local', 'Programs', 'antigravity', 'Antigravity.exe');
    mkdirSync(join(root, 'AppData', 'Local', 'Programs', 'antigravity'), { recursive: true });
    writeFileSync(winExe, '');
    const appStoragePath = join(root, 'AppData', 'Roaming', 'Antigravity', 'app_storage.json');
    mkdirSync(join(root, 'AppData', 'Roaming', 'Antigravity'), { recursive: true });
    writeFileSync(appStoragePath, JSON.stringify({ 'agy.onboarding.lastLoginUsername': 'old@example.com', 'agy.onboarding.lastLoginIsGcpTos': 'false' }));

    const spawned = [];
    const helperCalls = [];
    const res = scheduleRelaunchWithDebugPort({
      dataDir,
      home: root,
      platform: 'win32',
      env: { LOCALAPPDATA: join(root, 'AppData', 'Local') },
      onboardingSync: { email: 'bob@example.com', isGcpTos: true },
      appStoragePath,
      runPowerShellFile(exe, args, opts) {
        helperCalls.push({ exe, args, opts });
        writeFileSync(opts.env.AGY_RELAUNCH_LNK, 'LNK');
        return { status: 0, stdout: '', stderr: '' };
      },
      spawnProcess(cmd, args, opts) { spawned.push({ cmd, args, opts }); return { unref() {} }; }
    });
    assert.equal(res.scheduled, true);
    assert.equal(res.proxyActive, true);
    assert.equal(res.launchMethod, 'explorer-lnk');
    assert.ok(res.scriptPath);
    assert.equal(helperCalls.length, 1);
    assert.ok(helperCalls[0].args.includes('-File'));
    assert.equal(helperCalls[0].args.includes('-EncodedCommand'), false);
    assert.match(spawned[0].cmd, /explorer\.exe$/i);
    assert.ok(spawned[0].args[0].endsWith('relaunch-antigravity.lnk'));

    const psBody = readFileSync(spawned[0].opts.env.AGY_RELAUNCH_SCRIPT, 'utf8');
    // Zero Defender AMSI / Huorong triggers
    assert.equal(psBody.includes('9BA05972-F6A8-11CF-A442-00A0C90A8F39'), false);
    assert.equal(psBody.includes('CreateProcessW'), false);
    assert.equal(psBody.includes('WScript.Shell'), false);
    // Verifies startup ack, env cleanup, proxy arg verification, onboarding sync, two-hop ConPTY detachment (-LaunchOnly + Start-Process), cmd <NUL fallback, and self-cleanup of .lnk/.ack/.ps1
    assert.ok(psBody.includes('param([switch]$LaunchOnly)'));
    assert.ok(psBody.includes("Set-Content -LiteralPath $ackPath -Value ('STARTED ' + $PID)"));
    assert.ok(psBody.includes('Remove-Item Env:ELECTRON_RUN_AS_NODE,Env:NODE_OPTIONS,Env:ANTIGRAVITY_LS_ADDRESS'));
    assert.ok(psBody.includes('System.Diagnostics.ProcessStartInfo'));
    assert.ok(psBody.includes('$psi.UseShellExecute = $false'));
    assert.ok(psBody.includes('$psi.CreateNoWindow = $true'));
    assert.ok(psBody.includes('-LaunchOnly'));
    assert.ok(psBody.includes('Start-Process -FilePath $hopTarget -ArgumentList $hopArgs -WorkingDirectory $hopDir'));
    assert.ok(psBody.includes('<NUL >NUL 2>&1'));
    assert.ok(psBody.includes("CommandLine.Contains('--proxy-server=')"));
    assert.ok(psBody.includes("agy.onboarding.lastLoginUsername"));
    assert.ok(psBody.includes("'bob@example.com'"));
    assert.ok(psBody.includes("agy.onboarding.lastLoginIsGcpTos"));
    assert.ok(psBody.includes("'true'"));
    assert.ok(psBody.includes("Remove-Item -LiteralPath $lnkPath -Force"));
    assert.equal(psBody.includes('conhost.exe'), false);

    // Fallback when .lnk creation fails uses plain powershell.exe -File (never -EncodedCommand)
    const fallbackSpawned = [];
    const fallbackRes = scheduleRelaunchWithDebugPort({
      dataDir,
      home: root,
      platform: 'win32',
      env: { LOCALAPPDATA: join(root, 'AppData', 'Local') },
      runPowerShellFile: () => ({ status: 1, stdout: '', stderr: 'denied' }),
      spawnProcess(cmd, args, opts) { fallbackSpawned.push({ cmd, args, opts }); return { unref() {} }; }
    });
    assert.equal(fallbackRes.launchMethod, 'powershell-file');
    assert.match(fallbackSpawned[0].cmd, /powershell\.exe$/i);
    assert.ok(fallbackSpawned[0].args.includes('-File'));
    assert.equal(fallbackSpawned[0].args.includes('-EncodedCommand'), false);

    // POSIX macOS/Linux relaunch also injects post-exit onboarding sync safely via env vars
    const linExe = join(root, 'antigravity-lin');
    writeFileSync(linExe, '');
    const linSpawned = [];
    scheduleRelaunchWithDebugPort({
      dataDir,
      home: root,
      platform: 'linux',
      env: { APPIMAGE: linExe },
      onboardingSync: { email: 'bob@example.com', isGcpTos: false },
      appStoragePath: join(root, 'lin_storage.json'),
      spawnProcess(cmd, args, opts) { linSpawned.push({ cmd, args, opts }); return { unref() {} }; }
    });
    assert.equal(linSpawned[0].opts.env.AGY_ONBOARDING_EMAIL, 'bob@example.com');
    assert.equal(linSpawned[0].opts.env.AGY_ONBOARDING_GCP_TOS, 'false');
    assert.ok(linSpawned[0].args[1].includes('agy.onboarding.lastLoginUsername'));
    if (process.platform !== 'win32') {
      assert.equal(spawnSync('sh', ['-n', '-c', linSpawned[0].args[1]], { encoding: 'utf8' }).status, 0);
    }

    if (process.platform === 'win32') {
      // Real PowerShell 5.1 AST parse check AND real .lnk creation check on Windows
      const probe = "$e = $null; [void][System.Management.Automation.Language.Parser]::ParseInput($env:AGY_PS_CHECK, [ref]$null, [ref]$e); if ($e -and $e.Count -gt 0) { $e | ForEach-Object { Write-Error $_.Message }; exit 1 }";
      const out = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', probe], {
        encoding: 'utf8',
        env: { ...process.env, AGY_PS_CHECK: psBody.replace(/^\uFEFF/, '') }
      });
      assert.equal(out.status, 0, `PowerShell 5.1 parse error: ${out.stderr}`);

      const realSpawned = [];
      const realRes = scheduleRelaunchWithDebugPort({
        dataDir: join(root, 'real-lnk'),
        home: root,
        platform: 'win32',
        env: { ...process.env, LOCALAPPDATA: join(root, 'AppData', 'Local') },
        spawnProcess(cmd, args, opts) { realSpawned.push({ cmd, args, opts }); return { unref() {} }; }
      });
      assert.equal(realRes.launchMethod, 'explorer-lnk');
      assert.match(realSpawned[0].cmd, /explorer\.exe$/i);
      assert.equal(existsSync(realSpawned[0].args[0]), true);
      // Verify the generated .lnk targets powershell.exe -File directly (never conhost.exe --headless which triggers AV)
      const inspectLnk = spawnSync('powershell.exe', [
        '-NoProfile', '-NonInteractive', '-Command',
        "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut($env:AGY_CHECK_LNK); Write-Output ($s.TargetPath + '|' + $s.Arguments)"
      ], { encoding: 'utf8', env: { ...process.env, AGY_CHECK_LNK: realSpawned[0].args[0] } });
      assert.equal(inspectLnk.status, 0);
      assert.match(inspectLnk.stdout, /powershell\.exe\|-NoProfile /i);
      assert.equal(/conhost\.exe/i.test(inspectLnk.stdout), false);

      // Live Windows ConPTY/stdout detachment check using the generated -LaunchOnly path
      const hopReport = join(root, 'hop-report.json');
      const hopChild = join(root, 'hop-child.cjs');
      writeFileSync(hopChild, [
        "const fs = require('fs');",
        "console.log('SHOULD_NOT_LEAK_TO_PARENT');",
        `fs.writeFileSync(${JSON.stringify(hopReport)}, JSON.stringify({ pid: process.pid, ppid: process.ppid, argv: process.argv.slice(2), proxy: process.env.HTTP_PROXY, hopLeftover: process.env.AGY_HOP_TARGET || null }));`,
        "setTimeout(() => {}, 2500);"
      ].join('\n'));
      const outerProbe = join(root, 'outer-probe.ps1');
      writeFileSync(outerProbe, '\uFEFF' + [
        "$env:HTTP_PROXY = 'http://user:p%40ss@127.0.0.1:7897'",
        `$env:AGY_HOP_TARGET = '${process.execPath.replace(/'/g, "''")}'`,
        `$env:AGY_HOP_ARGS = '"${hopChild.replace(/'/g, "''")}" --remote-debugging-port=0 "--proxy-server=http://user:p%40ss@127.0.0.1:7897" "--proxy-bypass-list=localhost;127.0.0.1;[::1]"'`,
        `$env:AGY_HOP_DIR = '${root.replace(/'/g, "''")}'`,
        "$psi = New-Object System.Diagnostics.ProcessStartInfo",
        "$psi.FileName = 'powershell.exe'",
        `$psi.Arguments = '-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "${realRes.scriptPath.replace(/'/g, "''")}" -LaunchOnly'`,
        `$psi.WorkingDirectory = '${root.replace(/'/g, "''")}'`,
        "$psi.UseShellExecute = $false",
        "$psi.CreateNoWindow = $true",
        "$h = [System.Diagnostics.Process]::Start($psi)",
        "if ($h) { [void]$h.WaitForExit(5000) }",
        "Write-Output ('OUTER=' + $PID + ' HOP=' + $h.Id)"
      ].join('\r\n') + '\r\n', 'utf8');
      const liveHop = await new Promise(resolve => {
        const t0 = Date.now();
        const proc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', outerProbe], {
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true
        });
        let out = '', exitedAt = 0;
        proc.stdout.on('data', chunk => { out += chunk.toString(); });
        proc.on('exit', () => { exitedAt = Date.now() - t0; });
        proc.on('close', code => resolve({ code, exitedAt, closedAt: Date.now() - t0, out: out.trim() }));
      });
      assert.equal(liveHop.code, 0);
      assert.equal(liveHop.out.includes('SHOULD_NOT_LEAK_TO_PARENT'), false);
      assert.ok(liveHop.closedAt - liveHop.exitedAt < 500, `Parent stdout pipe stayed open ${liveHop.closedAt - liveHop.exitedAt}ms after exit`);
      for (let i = 0; i < 30 && !existsSync(hopReport); i++) await new Promise(r => setTimeout(r, 100));
      assert.equal(existsSync(hopReport), true);
      const hopData = JSON.parse(readFileSync(hopReport, 'utf8'));
      const outerPid = Number((liveHop.out.match(/OUTER=(\d+)/) || [])[1]);
      const hopPid = Number((liveHop.out.match(/HOP=(\d+)/) || [])[1]);
      assert.notEqual(hopData.ppid, outerPid);
      assert.equal(hopData.ppid, hopPid);
      assert.equal(hopData.hopLeftover, null);
      assert.equal(hopData.proxy, 'http://user:p%40ss@127.0.0.1:7897');
      assert.deepEqual(hopData.argv, ['--remote-debugging-port=0', '--proxy-server=http://user:p%40ss@127.0.0.1:7897', '--proxy-bypass-list=localhost;127.0.0.1;[::1]']);
      try { process.kill(hopData.pid); } catch {}
      await new Promise(r => setTimeout(r, 150));
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('recordDebugPortReady and recordProxyReady clear relaunch cooldown timestamps on success so reopening within 120s still auto-relaunches (Issue #64)', async () => {
  const { maybeAutoRelaunchMac, maybeAutoRelaunchProxy, recordDebugPortReady, recordProxyReady } = await import('../lib/launcher.mjs');
  const root = mkdtempSync(join(tmpdir(), 'agy-cooldown-reset-64-'));
  try {
    const dataDir = join(root, 'data');
    mkdirSync(dataDir, { recursive: true });
    const macApp = join(root, 'Applications', 'Antigravity.app');
    mkdirSync(macApp, { recursive: true });

    let relaunches = 0;
    const fakeRelaunch = () => { relaunches++; return { scheduled: true }; };

    // 1. macAutoRelaunch triggers once, then succeeds (recordDebugPortReady clears cooldown)
    const r1 = maybeAutoRelaunchMac({
      dataDir, home: root, platform: 'darwin',
      env: { ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:51001' },
      enabled: true, macAutoRelaunch: true, now: 1_000_000, relaunch: fakeRelaunch
    });
    assert.equal(r1.relaunched, true);
    recordDebugPortReady({ dataDir });

    // Reopening 20 seconds later (< 120s cooldown) with a new LS address MUST still auto-relaunch!
    const r2 = maybeAutoRelaunchMac({
      dataDir, home: root, platform: 'darwin',
      env: { ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:51002' },
      enabled: true, macAutoRelaunch: true, now: 1_020_000, relaunch: fakeRelaunch
    });
    assert.equal(r2.relaunched, true);
    assert.equal(relaunches, 2);

    // 2. Proxy auto-relaunch also clears cooldown after recordProxyReady
    const p1 = await maybeAutoRelaunchProxy({
      dataDir, home: root, platform: 'darwin',
      env: { ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:52001' },
      enabled: true, proxyEnabled: true, proxyUrl: 'http://127.0.0.1:7897',
      runtimeProxyReason: 'not-applied', now: 2_000_000,
      checkPort: async () => ({ ok: true }), relaunch: fakeRelaunch
    });
    assert.equal(p1.relaunched, true);
    recordProxyReady({ dataDir });

    const p2 = await maybeAutoRelaunchProxy({
      dataDir, home: root, platform: 'darwin',
      env: { ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:52002' },
      enabled: true, proxyEnabled: true, proxyUrl: 'http://127.0.0.1:7897',
      runtimeProxyReason: 'not-applied', now: 2_025_000,
      checkPort: async () => ({ ok: true }), relaunch: fakeRelaunch
    });
    assert.equal(p2.relaunched, true);
    assert.equal(relaunches, 4);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('cold-start proxy probe and missing-debug-port macOS check coordinate so concurrent triggers schedule at most one relaunch (Issue #64)', async () => {
  const { createColdStartRelaunchCoordinator, maybeAutoRelaunchMac, maybeAutoRelaunchProxy } = await import('../lib/launcher.mjs');
  const root = mkdtempSync(join(tmpdir(), 'agy-race-64-'));
  try {
    const macApp = join(root, 'Applications', 'Antigravity.app');
    mkdirSync(macApp, { recursive: true });

    // Case 1: Coordinator defers macOS check during async proxy checkPort; when proxy is reachable, only 1 relaunch fires.
    const dataDir1 = join(root, 'd1');
    mkdirSync(dataDir1, { recursive: true });
    let resolvePort1;
    let calls1 = 0;
    const coord1 = createColdStartRelaunchCoordinator({
      dataDir: dataDir1,
      home: root,
      platform: 'darwin',
      env: { ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:53001' },
      now: () => 3_000_000,
      checkPort: () => new Promise(res => { resolvePort1 = res; }),
      relaunch: () => { calls1++; return { scheduled: true }; }
    });
    const proxyPromise1 = coord1.attemptProxy({
      enabled: true,
      proxyEnabled: true,
      proxyUrl: 'http://127.0.0.1:7897',
      runtimeProxyReason: 'not-applied'
    });
    assert.equal(coord1.isProxyProbeInFlight(), true);
    const macDuringProbe1 = coord1.attemptMac({ enabled: true, macAutoRelaunch: true });
    assert.equal(macDuringProbe1.relaunched, false);
    assert.equal(macDuringProbe1.reason, 'deferred-for-proxy-probe');
    resolvePort1({ ok: true });
    const proxyRes1 = await proxyPromise1;
    assert.equal(proxyRes1.relaunched, true);
    assert.equal(calls1, 1);
    const macAfter1 = coord1.attemptMac({ enabled: true, macAutoRelaunch: true });
    assert.equal(macAfter1.relaunched, false);
    assert.equal(calls1, 1);

    // Case 2: Proxy is unreachable -> deferred macOS check runs immediately after probe finishes, still exactly 1 relaunch.
    const dataDir2 = join(root, 'd2');
    mkdirSync(dataDir2, { recursive: true });
    let resolvePort2;
    let calls2 = 0;
    const coord2 = createColdStartRelaunchCoordinator({
      dataDir: dataDir2,
      home: root,
      platform: 'darwin',
      env: { ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:53002' },
      now: () => 3_100_000,
      checkPort: () => new Promise(res => { resolvePort2 = res; }),
      relaunch: () => { calls2++; return { scheduled: true }; }
    });
    const proxyPromise2 = coord2.attemptProxy({
      enabled: true,
      proxyEnabled: true,
      proxyUrl: 'http://127.0.0.1:7897',
      runtimeProxyReason: 'not-applied'
    });
    coord2.attemptMac({ enabled: true, macAutoRelaunch: true });
    resolvePort2({ ok: false, error: 'ECONNREFUSED' });
    const proxyRes2 = await proxyPromise2;
    assert.equal(proxyRes2.relaunched, false);
    assert.equal(calls2, 1);

    // Case 3: Direct low-level race without coordinator — maybeAutoRelaunchProxy re-reads relaunch-state.json after await checkPort.
    const dataDir3 = join(root, 'd3');
    mkdirSync(dataDir3, { recursive: true });
    let resolvePort3;
    let calls3 = 0;
    const fakeRelaunch3 = () => { calls3++; return { scheduled: true }; };
    const env3 = { ANTIGRAVITY_LS_ADDRESS: '127.0.0.1:53003' };
    const lowProxyPromise = maybeAutoRelaunchProxy({
      dataDir: dataDir3, home: root, platform: 'darwin', env: env3,
      enabled: true, proxyEnabled: true, proxyUrl: 'http://127.0.0.1:7897',
      runtimeProxyReason: 'not-applied', now: 3_200_000,
      checkPort: () => new Promise(res => { resolvePort3 = res; }),
      relaunch: fakeRelaunch3
    });
    const lowMacRes = maybeAutoRelaunchMac({
      dataDir: dataDir3, home: root, platform: 'darwin', env: env3,
      enabled: true, macAutoRelaunch: true, now: 3_200_000, relaunch: fakeRelaunch3
    });
    assert.equal(lowMacRes.relaunched, true);
    resolvePort3({ ok: true });
    const lowProxyRes = await lowProxyPromise;
    assert.equal(lowProxyRes.relaunched, false);
    assert.equal(lowProxyRes.reason, 'already-attempted-session');
    assert.equal(calls3, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
