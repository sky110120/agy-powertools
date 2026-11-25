import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, unlinkSync, statSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { appendWslEnv, isWslEnvironment, resolveWslWindowsExecutable, resolveWslWindowsTemp, wslPathToWindows } from './wsl.mjs';

export const DEBUG_FLAG = '--remote-debugging-port=0';
const HAS_DEBUG_RE = /(?:^|\s)--remote-debugging-port(?:=\S+|\s+\d+|\b)/;
const STRIP_DEBUG_RE = /(?:^|\s+)--remote-debugging-port=0(?=\s|$)/g;
const PROMPT_COOLDOWN_MS = 10 * 60 * 1000;
const FRESH_INSTALL_GRACE_MS = 120 * 1000;

export function isRemoteSshEnvironment({ env = process.env, platform = process.platform, wsl } = {}) {
  if (platform === 'win32') return false;
  if (typeof wsl === 'boolean' ? wsl : isWslEnvironment({ platform, env })) return false;
  if (env.DISPLAY || env.WAYLAND_DISPLAY) return false;
  return Boolean(
    env.ANTIGRAVITY_VSCODE_HOST === '1' ||
    env.SSH_CONNECTION ||
    env.SSH_CLIENT ||
    env.SSH_TTY
  );
}

export function injectDebugArg(args = '') {
  const trimmed = String(args || '').trim();
  if (HAS_DEBUG_RE.test(trimmed)) return trimmed;
  return trimmed ? `${trimmed} ${DEBUG_FLAG}` : DEBUG_FLAG;
}

export function removeDebugArg(args = '') {
  return String(args || '').replace(STRIP_DEBUG_RE, ' ').replace(/\s{2,}/g, ' ').trim();
}

export function patchDesktopEntry(content) {
  let changed = false;
  const lines = String(content || '').split(/\r?\n/).map(line => {
    if (!/^Exec\s*=/.test(line) || HAS_DEBUG_RE.test(line)) return line;
    const eq = line.indexOf('=');
    const prefix = line.slice(0, eq + 1);
    const cmd = line.slice(eq + 1).trim();
    if (!/antigravity/i.test(cmd)) return line;
    const match = cmd.match(/^("[^"]+"|\S+)([\s\S]*)$/);
    if (!match) return line;
    changed = true;
    const rest = match[2].trim();
    return `${prefix}${match[1]} ${DEBUG_FLAG}${rest ? ` ${rest}` : ''}`;
  });
  return { content: lines.join('\n'), changed };
}

export function unpatchDesktopEntry(content) {
  let changed = false;
  const lines = String(content || '').split(/\r?\n/).map(line => {
    if (!/^Exec\s*=/.test(line) || !line.includes(DEBUG_FLAG)) return line;
    const next = line.replace(STRIP_DEBUG_RE, ' ').replace(/^(Exec\s*=\s*)/, '$1').replace(/\s{2,}/g, ' ').trimEnd();
    if (next !== line) changed = true;
    return next;
  });
  return { content: lines.join('\n'), changed };
}

function readJson(path, fallback = {}) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
}

function writeJson(path, value) {
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  } catch {}
}

function defaultRunPowerShell(script, env, wslEnvKeys = []) {
  const finalEnv = wslEnvKeys.length ? appendWslEnv(env || process.env, wslEnvKeys) : env;
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    timeout: 8000,
    env: finalEnv
  });
  if (result.error || result.status !== 0) return null;
  return (result.stdout || '').trim();
}

function windowsShortcutCandidates({ home, env, sandbox, runPowerShell }) {
  const appData = sandbox ? join(home, 'AppData', 'Roaming') : (env.APPDATA || join(home, 'AppData', 'Roaming'));
  const dirs = new Set([
    join(home, 'Desktop'),
    join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    join(appData, 'Microsoft', 'Internet Explorer', 'Quick Launch', 'User Pinned', 'TaskBar')
  ]);
  if (!sandbox) {
    const out = runPowerShell('[Console]::OutputEncoding=[Text.Encoding]::UTF8; @([Environment]::GetFolderPath("Desktop"), [Environment]::GetFolderPath("Programs")) | ConvertTo-Json -Compress', env);
    try {
      for (const folder of JSON.parse(out || '[]')) if (typeof folder === 'string' && folder) dirs.add(folder);
    } catch {}
  }
  const files = new Set();
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isFile() && /\.lnk$/i.test(entry.name)) files.add(full);
        else if (entry.isDirectory() && /^antigravity$/i.test(entry.name)) {
          for (const sub of readdirSync(full, { withFileTypes: true })) {
            if (sub.isFile() && /\.lnk$/i.test(sub.name)) files.add(join(full, sub.name));
          }
        }
      }
    } catch {}
  }
  return [...files];
}

export function configureLaunchers({
  home = homedir(),
  dataDir,
  platform = process.platform,
  env = process.env,
  sandbox = resolve(home) !== resolve(homedir()),
  systemApplicationsDir = sandbox ? '' : '/usr/share/applications',
  runPowerShell = defaultRunPowerShell,
  wsl
} = {}) {
  const wslMode = typeof wsl === 'boolean' ? wsl : isWslEnvironment({ platform, env });
  const stateFile = dataDir ? join(dataDir, 'launcher-state.json') : '';
  const state = stateFile ? readJson(stateFile, { shortcuts: [], desktopEntries: [], macApps: [] }) : { shortcuts: [], desktopEntries: [], macApps: [] };
  const updated = [];

  if (platform === 'win32') {
    const candidates = windowsShortcutCandidates({ home, env, sandbox, runPowerShell });
    if (candidates.length) {
      const psEnv = { ...env, AGY_LNK_LIST: JSON.stringify(candidates) };
      const script = [
        '[Console]::OutputEncoding = [Text.Encoding]::UTF8',
        '$paths = $env:AGY_LNK_LIST | ConvertFrom-Json',
        '$ws = New-Object -ComObject WScript.Shell',
        '$changed = @()',
        'foreach ($p in $paths) {',
        '  try {',
        '    if (-not (Test-Path -LiteralPath $p)) { continue }',
        '    $s = $ws.CreateShortcut($p)',
        '    $leaf = Split-Path -Leaf $s.TargetPath',
        '    if ($leaf -match "^antigravity\\.exe$") {',
        '      $args = [string]$s.Arguments',
        '      if ($args -notmatch "(?:^|\\s)--remote-debugging-port(?:=\\S+|\\s+\\d+|\\b)") {',
        '        $s.Arguments = ($args + " --remote-debugging-port=0").Trim()',
        '        $s.Save()',
        '        $changed += $p',
        '      }',
        '    }',
        '  } catch {}',
        '}',
        'ConvertTo-Json -Compress @($changed)'
      ].join('\n');
      const out = runPowerShell(script, psEnv);
      try {
        for (const item of JSON.parse(out || '[]')) {
          if (typeof item === 'string' && item) {
            updated.push(item);
            if (!state.shortcuts.includes(item)) state.shortcuts.push(item);
          }
        }
      } catch {}
    }
  } else if (wslMode && (!sandbox || runPowerShell !== defaultRunPowerShell)) {
    const script = [
      '[Console]::OutputEncoding = [Text.Encoding]::UTF8',
      '$appData = [Environment]::GetFolderPath("ApplicationData")',
      '$dirs = @([Environment]::GetFolderPath("Desktop"), [Environment]::GetFolderPath("Programs"), (Join-Path $appData "Microsoft\\Internet Explorer\\Quick Launch\\User Pinned\\TaskBar")) | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique',
      '$paths = @()',
      'foreach ($d in $dirs) {',
      '  try {',
      '    Get-ChildItem -LiteralPath $d -File -Filter *.lnk -ErrorAction SilentlyContinue | ForEach-Object { $paths += $_.FullName }',
      '    Get-ChildItem -LiteralPath $d -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "^antigravity$" } | ForEach-Object {',
      '      Get-ChildItem -LiteralPath $_.FullName -File -Filter *.lnk -ErrorAction SilentlyContinue | ForEach-Object { $paths += $_.FullName }',
      '    }',
      '  } catch {}',
      '}',
      '$ws = New-Object -ComObject WScript.Shell',
      '$changed = @()',
      'foreach ($p in ($paths | Select-Object -Unique)) {',
      '  try {',
      '    $s = $ws.CreateShortcut($p)',
      '    $leaf = Split-Path -Leaf $s.TargetPath',
      '    if ($leaf -match "^antigravity\\.exe$") {',
      '      $args = [string]$s.Arguments',
      '      if ($args -notmatch "(?:^|\\s)--remote-debugging-port(?:=\\S+|\\s+\\d+|\\b)") {',
      '        $s.Arguments = ($args + " --remote-debugging-port=0").Trim()',
      '        $s.Save()',
      '        $changed += $p',
      '      }',
      '    }',
      '  } catch {}',
      '}',
      'ConvertTo-Json -Compress @($changed)'
    ].join('\n');
    const out = runPowerShell(script, env);
    try {
      for (const item of JSON.parse(out || '[]')) {
        if (typeof item === 'string' && item) {
          updated.push(item);
          if (!state.shortcuts.includes(item)) state.shortcuts.push(item);
        }
      }
    } catch {}
  } else if (platform === 'linux') {
    const appsDir = join(sandbox ? join(home, '.local', 'share') : (env.XDG_DATA_HOME || join(home, '.local', 'share')), 'applications');
    const userDesktop = join(appsDir, 'antigravity.desktop');
    const systemDesktop = systemApplicationsDir ? join(systemApplicationsDir, 'antigravity.desktop') : '';
    if (existsSync(userDesktop)) {
      const patched = patchDesktopEntry(readFileSync(userDesktop, 'utf8'));
      if (patched.changed) {
        writeFileSync(userDesktop, patched.content, 'utf8');
        updated.push(userDesktop);
        if (!state.desktopEntries.some(e => e.path === userDesktop)) state.desktopEntries.push({ path: userDesktop, mode: 'patched' });
      }
    } else if (systemDesktop && existsSync(systemDesktop)) {
      const patched = patchDesktopEntry(readFileSync(systemDesktop, 'utf8'));
      if (patched.changed) {
        mkdirSync(appsDir, { recursive: true });
        writeFileSync(userDesktop, patched.content, 'utf8');
        updated.push(userDesktop);
        state.desktopEntries = [...state.desktopEntries.filter(e => e.path !== userDesktop), { path: userDesktop, mode: 'created' }];
      }
    }
  } else if (platform === 'darwin') {
    // No longer create a duplicate "Antigravity (Powertools).app" wrapper on macOS;
    // instead launch the original Antigravity.app and let the sidecar relaunch once with the debug flag.
    // Clean up any legacy wrapper app left over from older plugin versions.
    const legacyTargets = [...new Set([...(state.macApps || []), join(home, 'Applications', 'Antigravity (Powertools).app')])];
    const removedLegacyMacApps = [];
    for (const appDir of legacyTargets) {
      if (appDir && existsSync(appDir) && resolve(appDir).startsWith(resolve(home))) {
        try {
          rmSync(appDir, { recursive: true, force: true });
          removedLegacyMacApps.push(appDir);
        } catch {}
      }
    }
    state.macApps = [];
    if (stateFile && (removedLegacyMacApps.length || existsSync(stateFile))) writeJson(stateFile, state);
    return { updated, removedLegacyMacApps };
  }

  if (stateFile && (updated.length || existsSync(stateFile))) writeJson(stateFile, state);
  return { updated };
}

export function restoreLaunchers({
  home = homedir(),
  dataDir,
  platform = process.platform,
  env = process.env,
  sandbox = resolve(home) !== resolve(homedir()),
  runPowerShell = defaultRunPowerShell,
  wsl
} = {}) {
  const wslMode = typeof wsl === 'boolean' ? wsl : isWslEnvironment({ platform, env });
  const stateFile = dataDir ? join(dataDir, 'launcher-state.json') : '';
  const state = stateFile ? readJson(stateFile, { shortcuts: [], desktopEntries: [], macApps: [] }) : { shortcuts: [], desktopEntries: [], macApps: [] };
  const restored = [];

  if (platform === 'win32') {
    const candidates = [...new Set([...(state.shortcuts || []), ...windowsShortcutCandidates({ home, env, sandbox, runPowerShell })])];
    if (candidates.length) {
      const psEnv = { ...env, AGY_LNK_LIST: JSON.stringify(candidates) };
      const script = [
        '[Console]::OutputEncoding = [Text.Encoding]::UTF8',
        '$paths = $env:AGY_LNK_LIST | ConvertFrom-Json',
        '$ws = New-Object -ComObject WScript.Shell',
        '$changed = @()',
        'foreach ($p in $paths) {',
        '  try {',
        '    if (-not (Test-Path -LiteralPath $p)) { continue }',
        '    $s = $ws.CreateShortcut($p)',
        '    $leaf = Split-Path -Leaf $s.TargetPath',
        '    if ($leaf -match "^antigravity\\.exe$" -and ([string]$s.Arguments) -match "--remote-debugging-port=0") {',
        '      $s.Arguments = (([string]$s.Arguments) -replace "(?:^|\\s+)--remote-debugging-port=0(?=\\s|$)", " ").Trim()',
        '      $s.Save()',
        '      $changed += $p',
        '    }',
        '  } catch {}',
        '}',
        'ConvertTo-Json -Compress @($changed)'
      ].join('\n');
      const out = runPowerShell(script, psEnv);
      try {
        for (const item of JSON.parse(out || '[]')) if (typeof item === 'string' && item) restored.push(item);
      } catch {}
    }
  } else if (wslMode && (!sandbox || runPowerShell !== defaultRunPowerShell)) {
    const psEnv = { ...env, AGY_LNK_LIST: JSON.stringify(state.shortcuts || []) };
    const script = [
      '[Console]::OutputEncoding = [Text.Encoding]::UTF8',
      '$appData = [Environment]::GetFolderPath("ApplicationData")',
      '$dirs = @([Environment]::GetFolderPath("Desktop"), [Environment]::GetFolderPath("Programs"), (Join-Path $appData "Microsoft\\Internet Explorer\\Quick Launch\\User Pinned\\TaskBar")) | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique',
      '$paths = @()',
      'try { foreach ($x in ($env:AGY_LNK_LIST | ConvertFrom-Json)) { if ($x) { $paths += $x } } } catch {}',
      'foreach ($d in $dirs) {',
      '  try {',
      '    Get-ChildItem -LiteralPath $d -File -Filter *.lnk -ErrorAction SilentlyContinue | ForEach-Object { $paths += $_.FullName }',
      '    Get-ChildItem -LiteralPath $d -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "^antigravity$" } | ForEach-Object {',
      '      Get-ChildItem -LiteralPath $_.FullName -File -Filter *.lnk -ErrorAction SilentlyContinue | ForEach-Object { $paths += $_.FullName }',
      '    }',
      '  } catch {}',
      '}',
      '$ws = New-Object -ComObject WScript.Shell',
      '$changed = @()',
      'foreach ($p in ($paths | Select-Object -Unique)) {',
      '  try {',
      '    if (-not (Test-Path -LiteralPath $p)) { continue }',
      '    $s = $ws.CreateShortcut($p)',
      '    $leaf = Split-Path -Leaf $s.TargetPath',
      '    if ($leaf -match "^antigravity\\.exe$" -and ([string]$s.Arguments) -match "--remote-debugging-port=0") {',
      '      $s.Arguments = (([string]$s.Arguments) -replace "(?:^|\\s+)--remote-debugging-port=0(?=\\s|$)", " ").Trim()',
      '      $s.Save()',
      '      $changed += $p',
      '    }',
      '  } catch {}',
      '}',
      'ConvertTo-Json -Compress @($changed)'
    ].join('\n');
    const out = runPowerShell(script, psEnv, ['AGY_LNK_LIST']);
    try {
      for (const item of JSON.parse(out || '[]')) if (typeof item === 'string' && item) restored.push(item);
    } catch {}
  } else if (platform === 'linux') {
    const fallbackPath = join(sandbox ? join(home, '.local', 'share') : (env.XDG_DATA_HOME || join(home, '.local', 'share')), 'applications', 'antigravity.desktop');
    const entries = state.desktopEntries?.length ? state.desktopEntries : [{ path: fallbackPath, mode: 'patched' }];
    for (const entry of entries) {
      if (!entry?.path || !existsSync(entry.path)) continue;
      if (entry.mode === 'created' && resolve(entry.path).startsWith(resolve(home))) {
        try { unlinkSync(entry.path); restored.push(entry.path); } catch {}
      } else {
        const unpatched = unpatchDesktopEntry(readFileSync(entry.path, 'utf8'));
        if (unpatched.changed) {
          writeFileSync(entry.path, unpatched.content, 'utf8');
          restored.push(entry.path);
        }
      }
    }
  } else if (platform === 'darwin') {
    const targets = state.macApps?.length ? state.macApps : [join(home, 'Applications', 'Antigravity (Powertools).app')];
    for (const appDir of targets) {
      if (appDir && existsSync(appDir) && resolve(appDir).startsWith(resolve(home))) {
        try { rmSync(appDir, { recursive: true, force: true }); restored.push(appDir); } catch {}
      }
    }
  }

  if (stateFile && existsSync(stateFile)) {
    try { unlinkSync(stateFile); } catch {}
  }
  return { restored };
}

export function resolveAntigravityExecutable({ platform = process.platform, env = process.env, home = homedir(), execPath = process.execPath, wsl, resolveWslExe = resolveWslWindowsExecutable } = {}) {
  const wslMode = typeof wsl === 'boolean' ? wsl : isWslEnvironment({ platform, env });
  const agentExe = env.ANTIGRAVITY_AGENTAPI_EXE || '';
  if (wslMode) {
    return resolveWslExe({ env })?.winPath || '';
  }
  if (platform === 'win32') {
    if (agentExe) {
      const candidate = join(dirname(dirname(dirname(agentExe))), 'Antigravity.exe');
      if (existsSync(candidate)) return candidate;
    }
    if (execPath && /^antigravity\.exe$/i.test(basename(execPath)) && existsSync(execPath)) {
      return execPath;
    }
    const candidates = [
      join(env.LOCALAPPDATA || join(home, 'AppData', 'Local'), 'Programs', 'antigravity', 'Antigravity.exe'),
      env.ProgramFiles && join(env.ProgramFiles, 'Antigravity', 'Antigravity.exe'),
      env.ProgramFiles && join(env.ProgramFiles, 'antigravity', 'Antigravity.exe'),
      env['ProgramFiles(x86)'] && join(env['ProgramFiles(x86)'], 'Antigravity', 'Antigravity.exe')
    ].filter(Boolean);
    for (const candidate of candidates) {
      if (existsSync(candidate)) return candidate;
    }
    return '';
  }
  if (platform === 'darwin') {
    for (const seed of [agentExe, execPath].filter(Boolean)) {
      for (let cur = dirname(seed); cur && cur !== dirname(cur); cur = dirname(cur)) {
        if (/Antigravity.*\.app$/i.test(basename(cur)) && existsSync(cur)) return cur;
      }
    }
    for (const candidate of ['/Applications/Antigravity.app', join(home, 'Applications', 'Antigravity.app')]) {
      if (existsSync(candidate)) return candidate;
    }
    return '';
  }
  if (env.APPIMAGE && existsSync(env.APPIMAGE)) return env.APPIMAGE;
  if (agentExe) {
    const candidate = join(dirname(dirname(dirname(agentExe))), 'antigravity');
    if (existsSync(candidate)) return candidate;
  }
  if (execPath && /^antigravity$/i.test(basename(execPath)) && existsSync(execPath)) {
    return execPath;
  }
  for (const candidate of ['/usr/share/antigravity/antigravity', '/opt/Antigravity/antigravity', '/usr/bin/antigravity']) {
    if (existsSync(candidate)) return candidate;
  }
  return '';
}

export function manualLaunchCommand({ platform = process.platform, env = process.env, home = homedir(), execPath = process.execPath, wsl, resolveWslExe = resolveWslWindowsExecutable } = {}) {
  const wslMode = typeof wsl === 'boolean' ? wsl : isWslEnvironment({ platform, env });
  const target = resolveAntigravityExecutable({ platform, env, home, execPath, wsl: wslMode, resolveWslExe });
  if (!target) return '';
  if (platform === 'win32' || wslMode) return `"${target}" ${DEBUG_FLAG}`;
  if (platform === 'darwin') return `open -n -a "${target}" --args ${DEBUG_FLAG}`;
  return `"${target}" ${DEBUG_FLAG}`;
}

function cleanGuiEnv(env) {
  const copy = { ...env };
  for (const key of Object.keys(copy)) {
    if (key === 'ELECTRON_RUN_AS_NODE' || key === 'NODE_OPTIONS' || key.startsWith('ANTIGRAVITY_SIDECAR_') || key === 'ANTIGRAVITY_LS_ADDRESS' || key === 'ANTIGRAVITY_CSRF_TOKEN' || key === 'ANTIGRAVITY_AGENTAPI_EXE') {
      delete copy[key];
    }
  }
  return copy;
}

function resolveLaunchProxy({ dataDir, proxy } = {}) {
  let raw = proxy;
  if (raw === undefined && dataDir) {
    const saved = readJson(join(dataDir, 'settings.json'), null);
    if (saved && typeof saved === 'object') {
      raw = {
        enabled: Boolean(saved.proxyEnabled),
        url: typeof saved.proxyUrl === 'string' ? saved.proxyUrl : '',
        bypass: typeof saved.proxyBypass === 'string' ? saved.proxyBypass : '',
        forceHttp1: Boolean(saved.proxyForceHttp1)
      };
    }
  }
  const empty = { enabled: false, url: '', bypass: 'localhost,127.0.0.1,::1', forceHttp1: false, specKey: '', chromiumServer: '', chromiumBypass: 'localhost;127.0.0.1;[::1]' };
  if (!raw || !raw.enabled || typeof raw.url !== 'string') return empty;
  const trimmed = raw.url.trim();
  if (!trimmed || trimmed.length > 256 || /[\x00-\x1f\x7f\s'"`\\;$|&<>]/.test(trimmed)) return empty;
  let parsed;
  try { parsed = new URL(trimmed); } catch { return empty; }
  if (!['http:', 'https:', 'socks5:', 'socks5h:'].includes(parsed.protocol) || !parsed.hostname) return empty;
  if ((parsed.pathname && parsed.pathname !== '/') || parsed.search || parsed.hash) return empty;
  const auth = parsed.username ? `${parsed.username}${parsed.password ? `:${parsed.password}` : ''}@` : '';
  const host = parsed.hostname.includes(':') && !parsed.hostname.startsWith('[') ? `[${parsed.hostname}]` : parsed.hostname;
  const port = parsed.port ? `:${parsed.port}` : '';
  const url = `${parsed.protocol}//${auth}${host}${port}`;
  const bypassRaw = typeof raw.bypass === 'string' && !/[\x00-\x1f\x7f'"`\\$|&<>]/.test(raw.bypass) ? raw.bypass : '';
  const seen = new Set();
  const bypassList = [];
  for (const item of ['localhost', '127.0.0.1', '::1', ...bypassRaw.split(/[,;\s]+/)]) {
    const clean = item.trim() === '[::1]' ? '::1' : item.trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    bypassList.push(clean);
  }
  const bypass = bypassList.join(',');
  const forceHttp1 = Boolean(raw.forceHttp1);
  const chromeScheme = parsed.protocol === 'socks5h:' ? 'socks5:' : parsed.protocol;
  const chromiumServer = `${chromeScheme}//${host}${port}`;
  const chromiumBypass = bypassList.map(item => (item === '::1' ? '[::1]' : item)).join(';');
  return {
    enabled: true,
    url,
    bypass,
    forceHttp1,
    specKey: `${url}|${bypass}|${forceHttp1 ? 'h1' : 'auto'}`,
    chromiumServer,
    chromiumBypass
  };
}

function psSingleQuote(value) {
  return `'${String(value ?? '').replace(/'/g, "''")}'`;
}

export function scheduleRelaunchWithDebugPort({
  dataDir,
  home = homedir(),
  platform = process.platform,
  env = process.env,
  execPath = process.execPath,
  proxy,
  spawnProcess = spawn,
  wsl,
  resolveWslExe = resolveWslWindowsExecutable,
  resolveWslTemp = resolveWslWindowsTemp,
  toWindowsPath = wslPathToWindows
} = {}) {
  const wslMode = typeof wsl === 'boolean' ? wsl : isWslEnvironment({ platform, env });
  const target = resolveAntigravityExecutable({ platform, env, home, execPath, wsl: wslMode, resolveWslExe });
  if (!target) throw new Error('未找到 Antigravity 启动程序');
  if (dataDir) {
    const stateFile = join(dataDir, 'relaunch-state.json');
    const prev = readJson(stateFile, {});
    writeJson(stateFile, { ...prev, lastRelaunchAt: Date.now(), lastPromptLsAddress: env.ANTIGRAVITY_LS_ADDRESS || '' });
  }

  const launchProxy = resolveLaunchProxy({ dataDir, proxy });
  const childEnv = { ...cleanGuiEnv(env), AGY_RELAUNCH_TARGET: target };
  if (platform === 'win32' || wslMode) {
    let scriptWritePath = '';
    let winScriptPath = '';
    if (wslMode) {
      const winTemp = resolveWslTemp({ env });
      if (winTemp?.wslPath && winTemp?.winPath) {
        mkdirSync(winTemp.wslPath, { recursive: true });
        scriptWritePath = join(winTemp.wslPath, 'agy-powertools-relaunch.ps1');
        winScriptPath = `${winTemp.winPath.replace(/[\\/]+$/, '')}\\agy-powertools-relaunch.ps1`;
      } else {
        const scriptDir = dataDir || tmpdir();
        mkdirSync(scriptDir, { recursive: true });
        scriptWritePath = join(scriptDir, 'relaunch-antigravity.ps1');
        winScriptPath = toWindowsPath(scriptWritePath, { env }) || scriptWritePath;
      }
    } else {
      const scriptDir = dataDir || tmpdir();
      mkdirSync(scriptDir, { recursive: true });
      scriptWritePath = join(scriptDir, 'relaunch-antigravity.ps1');
      winScriptPath = scriptWritePath;
    }
    const targetLiteral = target.replace(/'/g, "''");
    const proxyEnvLines = launchProxy.enabled
      ? [
          `$env:HTTP_PROXY = ${psSingleQuote(launchProxy.url)}`,
          `$env:HTTPS_PROXY = ${psSingleQuote(launchProxy.url)}`,
          `$env:ALL_PROXY = ${psSingleQuote(launchProxy.url)}`,
          `$env:http_proxy = ${psSingleQuote(launchProxy.url)}`,
          `$env:https_proxy = ${psSingleQuote(launchProxy.url)}`,
          `$env:all_proxy = ${psSingleQuote(launchProxy.url)}`,
          `$env:NO_PROXY = ${psSingleQuote(launchProxy.bypass)}`,
          `$env:no_proxy = ${psSingleQuote(launchProxy.bypass)}`,
          `$env:AGY_POWERTOOLS_PROXY_SPEC = ${psSingleQuote(launchProxy.specKey)}`,
          ...(launchProxy.forceHttp1
            ? ["$env:GODEBUG = 'http2client=0'"]
            : ["if ($env:GODEBUG -eq 'http2client=0') { Remove-Item Env:GODEBUG -ErrorAction SilentlyContinue }"])
        ]
      : [
          "Remove-Item Env:HTTP_PROXY,Env:HTTPS_PROXY,Env:ALL_PROXY,Env:http_proxy,Env:https_proxy,Env:all_proxy,Env:NO_PROXY,Env:no_proxy,Env:AGY_POWERTOOLS_PROXY_SPEC -ErrorAction SilentlyContinue",
          "if ($env:GODEBUG -eq 'http2client=0') { Remove-Item Env:GODEBUG -ErrorAction SilentlyContinue }"
        ];
    const startArgs = launchProxy.enabled
      ? `@(${[DEBUG_FLAG, `--proxy-server=${launchProxy.chromiumServer}`, `--proxy-bypass-list=${launchProxy.chromiumBypass}`].map(psSingleQuote).join(', ')})`
      : `'${DEBUG_FLAG}'`;
    const relaunchBody = [
      "$ErrorActionPreference = 'SilentlyContinue'",
      "Start-Sleep -Milliseconds 350",
      `$target = '${targetLiteral}'`,
      "function Get-AgyProcs {",
      "  @(Get-CimInstance Win32_Process -Filter \"Name='Antigravity.exe'\" | Where-Object {",
      "    -not $_.ExecutablePath -or $_.ExecutablePath.Equals($target, [System.StringComparison]::OrdinalIgnoreCase)",
      "  })",
      "}",
      "foreach ($p in @(Get-Process -Name 'Antigravity')) {",
      "  if ($p.MainWindowHandle -ne 0) { [void]$p.CloseMainWindow() }",
      "}",
      "$deadline = (Get-Date).AddSeconds(3)",
      "while ((Get-Date) -lt $deadline) {",
      "  if ((Get-AgyProcs).Count -eq 0) { break }",
      "  Start-Sleep -Milliseconds 250",
      "}",
      "foreach ($p in (Get-AgyProcs)) {",
      "  Stop-Process -Id ([int]$p.ProcessId) -Force",
      "}",
      "$waitExit = (Get-Date).AddSeconds(6)",
      "while ((Get-Date) -lt $waitExit) {",
      "  if ((Get-AgyProcs).Count -eq 0) { break }",
      "  Start-Sleep -Milliseconds 250",
      "}",
      "Start-Sleep -Milliseconds 400",
      ...proxyEnvLines,
      `Start-Process -FilePath $target -ArgumentList ${startArgs}`,
      "Remove-Item -LiteralPath $PSCommandPath -Force"
    ].join('\r\n');
    writeFileSync(scriptWritePath, '\uFEFF' + relaunchBody + '\r\n', 'utf8');

    // Launch via Explorer.exe Desktop COM (ShellWindows FindWindowSW -> ShellExecute) using -EncodedCommand
    // without detached:true on the short-lived trigger (PowerShell 5.1 exits silently under DETACHED_PROCESS + windowsHide).
    // Explorer.exe spawns relaunch-antigravity.ps1 completely outside Antigravity's Win32 Job Object and avoids WMI ASR blocks.
    const launcherScript = [
      "$ErrorActionPreference = 'SilentlyContinue'",
      "$script = $env:AGY_RELAUNCH_SCRIPT",
      '$psArgs = \'-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "\' + $script + \'"\'',
      '$launched = $false',
      'try {',
      "  $shellWin = [Activator]::CreateInstance([Type]::GetTypeFromCLSID([Guid]'9BA05972-F6A8-11CF-A442-00A0C90A8F39'))",
      '  $hwnd = 0',
      '  $disp = $shellWin.FindWindowSW(0, 0, 8, [ref]$hwnd, 1)',
      '  if ($disp -and $disp.Document -and $disp.Document.Application) {',
      "    $disp.Document.Application.ShellExecute('powershell.exe', $psArgs, '', 'open', 0)",
      '    $launched = $true',
      '  }',
      '} catch {}',
      'if (-not $launched) {',
      '  try {',
      '    Add-Type -TypeDefinition @"',
      'using System;',
      'using System.Runtime.InteropServices;',
      'public static class AgyBreakawayLaunch {',
      '  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]',
      '  public struct STARTUPINFO {',
      '    public int cb; public string lpReserved; public string lpDesktop; public string lpTitle;',
      '    public int dwX; public int dwY; public int dwXSize; public int dwYSize;',
      '    public int dwXCountChars; public int dwYCountChars; public int dwFillAttribute; public int dwFlags;',
      '    public short wShowWindow; public short cbReserved2; public IntPtr lpReserved2;',
      '    public IntPtr hStdInput; public IntPtr hStdOutput; public IntPtr hStdError;',
      '  }',
      '  [StructLayout(LayoutKind.Sequential)]',
      '  public struct PROCESS_INFORMATION { public IntPtr hProcess; public IntPtr hThread; public int dwProcessId; public int dwThreadId; }',
      '  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]',
      '  public static extern bool CreateProcessW(string app, string cmd, IntPtr pa, IntPtr ta, bool inherit, uint flags, IntPtr env, string dir, ref STARTUPINFO si, out PROCESS_INFORMATION pi);',
      '  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);',
      '  public static bool Run(string cmd) {',
      '    var si = new STARTUPINFO(); si.cb = Marshal.SizeOf(si); si.dwFlags = 1; si.wShowWindow = 0;',
      '    PROCESS_INFORMATION pi;',
      '    if (!CreateProcessW(null, cmd, IntPtr.Zero, IntPtr.Zero, false, 0x01000000u | 0x08000000u, IntPtr.Zero, null, ref si, out pi)) return false;',
      '    CloseHandle(pi.hThread); CloseHandle(pi.hProcess); return true;',
      '  }',
      '}',
      '"@',
      "    if ([AgyBreakawayLaunch]::Run('powershell.exe ' + $psArgs)) { $launched = $true }",
      '  } catch {}',
      '}',
      'if (-not $launched) {',
      "  Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-NonInteractive','-WindowStyle','Hidden','-ExecutionPolicy','Bypass','-File',$script) -WindowStyle Hidden",
      '}'
    ].join('\r\n');
    const encodedLauncher = Buffer.from(launcherScript, 'utf16le').toString('base64');
    const launchEnv = wslMode
      ? appendWslEnv({ ...childEnv, AGY_RELAUNCH_SCRIPT: winScriptPath }, ['AGY_RELAUNCH_SCRIPT'])
      : { ...childEnv, AGY_RELAUNCH_SCRIPT: winScriptPath };

    const child = spawnProcess('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encodedLauncher], {
      stdio: 'ignore',
      windowsHide: true,
      env: launchEnv
    });
    child.unref?.();
    return { scheduled: true, target, proxyActive: launchProxy.enabled };
  }

  const proxyShellEnv = launchProxy.enabled
    ? {
        AGY_PROXY_URL: launchProxy.url,
        AGY_PROXY_BYPASS: launchProxy.bypass,
        AGY_PROXY_SPEC: launchProxy.specKey,
        AGY_PROXY_CHROME_SERVER: launchProxy.chromiumServer,
        AGY_PROXY_CHROME_BYPASS: launchProxy.chromiumBypass,
        AGY_PROXY_FORCE_HTTP1: launchProxy.forceHttp1 ? '1' : '0'
      }
    : {};

  if (platform === 'darwin') {
    const launchLines = launchProxy.enabled
      ? [
          'p_url="$AGY_PROXY_URL"; p_bypass="$AGY_PROXY_BYPASS"; p_spec="$AGY_PROXY_SPEC"; p_chrome="$AGY_PROXY_CHROME_SERVER"; p_cbypass="$AGY_PROXY_CHROME_BYPASS"; p_h1="$AGY_PROXY_FORCE_HTTP1"',
          'unset AGY_PROXY_URL AGY_PROXY_BYPASS AGY_PROXY_SPEC AGY_PROXY_CHROME_SERVER AGY_PROXY_CHROME_BYPASS AGY_PROXY_FORCE_HTTP1',
          'export HTTP_PROXY="$p_url" HTTPS_PROXY="$p_url" ALL_PROXY="$p_url" http_proxy="$p_url" https_proxy="$p_url" all_proxy="$p_url" NO_PROXY="$p_bypass" no_proxy="$p_bypass" AGY_POWERTOOLS_PROXY_SPEC="$p_spec"',
          'if [ "$p_h1" = "1" ]; then export GODEBUG="http2client=0"; elif [ "$GODEBUG" = "http2client=0" ]; then unset GODEBUG; fi',
          'set -- --env "HTTP_PROXY=$p_url" --env "HTTPS_PROXY=$p_url" --env "ALL_PROXY=$p_url" --env "http_proxy=$p_url" --env "https_proxy=$p_url" --env "all_proxy=$p_url" --env "NO_PROXY=$p_bypass" --env "no_proxy=$p_bypass" --env "AGY_POWERTOOLS_PROXY_SPEC=$p_spec"',
          'if [ "$p_h1" = "1" ]; then set -- "$@" --env "GODEBUG=http2client=0"; fi',
          '/usr/bin/open -n -a "$target" "$@" --args --remote-debugging-port=0 "--proxy-server=$p_chrome" "--proxy-bypass-list=$p_cbypass" >/dev/null 2>&1 || /usr/bin/open -n -a "$target" --args --remote-debugging-port=0 "--proxy-server=$p_chrome" "--proxy-bypass-list=$p_cbypass" >/dev/null 2>&1'
        ]
      : [
          'unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy NO_PROXY no_proxy AGY_POWERTOOLS_PROXY_SPEC AGY_PROXY_URL AGY_PROXY_BYPASS AGY_PROXY_SPEC AGY_PROXY_CHROME_SERVER AGY_PROXY_CHROME_BYPASS AGY_PROXY_FORCE_HTTP1',
          'if [ "$GODEBUG" = "http2client=0" ]; then unset GODEBUG; fi',
          '/usr/bin/open -n -a "$target" --args --remote-debugging-port=0 >/dev/null 2>&1'
        ];
    // Signal the main Electron process directly via SIGTERM (avoids macOS Automation TCC prompts from osascript).
    const script = [
      "trap '' HUP TERM",
      'pids=$(/bin/ps -axo pid=,args= | /usr/bin/awk -v p="$AGY_RELAUNCH_TARGET/Contents/MacOS/" \'{ pid=$1; sub(/^ *[0-9]+ +/, ""); if (index($0, p) == 1) print pid }\')',
      'if [ -n "$pids" ]; then kill -TERM $pids >/dev/null 2>&1 || true; fi',
      'i=0; while [ $i -lt 50 ] && /bin/ps -axo args= | /usr/bin/awk -v p="$AGY_RELAUNCH_TARGET/Contents/MacOS/" \'{ sub(/^ +/, ""); if (index($0, p) == 1) found=1 } END { exit !found }\'; do sleep 0.3; i=$((i+1)); done',
      'sleep 0.6',
      'target="$AGY_RELAUNCH_TARGET"; unset AGY_RELAUNCH_TARGET',
      ...launchLines
    ].join('\n');
    const child = spawnProcess('sh', ['-c', script], { detached: true, stdio: 'ignore', env: { ...childEnv, ...proxyShellEnv } });
    child.unref?.();
    return { scheduled: true, target, proxyActive: launchProxy.enabled };
  }

  const linuxLaunchLines = launchProxy.enabled
    ? [
        'p_url="$AGY_PROXY_URL"; p_bypass="$AGY_PROXY_BYPASS"; p_spec="$AGY_PROXY_SPEC"; p_chrome="$AGY_PROXY_CHROME_SERVER"; p_cbypass="$AGY_PROXY_CHROME_BYPASS"; p_h1="$AGY_PROXY_FORCE_HTTP1"',
        'unset AGY_PROXY_URL AGY_PROXY_BYPASS AGY_PROXY_SPEC AGY_PROXY_CHROME_SERVER AGY_PROXY_CHROME_BYPASS AGY_PROXY_FORCE_HTTP1',
        'export HTTP_PROXY="$p_url" HTTPS_PROXY="$p_url" ALL_PROXY="$p_url" http_proxy="$p_url" https_proxy="$p_url" all_proxy="$p_url" NO_PROXY="$p_bypass" no_proxy="$p_bypass" AGY_POWERTOOLS_PROXY_SPEC="$p_spec"',
        'if [ "$p_h1" = "1" ]; then export GODEBUG="http2client=0"; elif [ "$GODEBUG" = "http2client=0" ]; then unset GODEBUG; fi',
        'nohup "$target" --remote-debugging-port=0 "--proxy-server=$p_chrome" "--proxy-bypass-list=$p_cbypass" >/dev/null 2>&1 &'
      ]
    : [
        'unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy NO_PROXY no_proxy AGY_POWERTOOLS_PROXY_SPEC AGY_PROXY_URL AGY_PROXY_BYPASS AGY_PROXY_SPEC AGY_PROXY_CHROME_SERVER AGY_PROXY_CHROME_BYPASS AGY_PROXY_FORCE_HTTP1',
        'if [ "$GODEBUG" = "http2client=0" ]; then unset GODEBUG; fi',
        'nohup "$target" --remote-debugging-port=0 >/dev/null 2>&1 &'
      ];
  const script = [
    "trap '' HUP TERM",
    'pids=$(ps -eo pid=,args= | awk -v p="$AGY_RELAUNCH_TARGET" \'{ pid=$1; sub(/^ *[0-9]+ +/, ""); if ($0 == p || index($0, p " ") == 1) print pid }\')',
    'if [ -n "$pids" ]; then kill -TERM $pids >/dev/null 2>&1 || true; fi',
    'i=0; while [ $i -lt 60 ] && ps -eo args= | awk -v p="$AGY_RELAUNCH_TARGET" \'{ sub(/^ +/, ""); if ($0 == p || index($0, p " ") == 1) found=1 } END { exit !found }\'; do sleep 0.3; i=$((i+1)); done',
    'sleep 0.8',
    'target="$AGY_RELAUNCH_TARGET"; unset AGY_RELAUNCH_TARGET',
    ...linuxLaunchLines
  ].join('\n');
  const child = spawnProcess('sh', ['-c', script], { detached: true, stdio: 'ignore', env: { ...childEnv, ...proxyShellEnv } });
  child.unref?.();
  return { scheduled: true, target, proxyActive: launchProxy.enabled };
}

export function shouldPromptPostUpdate({
  dataDir,
  installDir,
  env = process.env,
  now = Date.now()
} = {}) {
  if (!env.ANTIGRAVITY_LS_ADDRESS || env.ELECTRON_OZONE_PLATFORM_HINT === 'headless' || env.AGY_POWERTOOLS_NO_PROMPT === '1') {
    return { prompt: false, reason: 'non-interactive' };
  }
  if (installDir) {
    try {
      const mtimeMs = statSync(join(installDir, '.agy-install.json')).mtimeMs;
      if (Number.isFinite(mtimeMs) && now - mtimeMs > -5000 && now - mtimeMs < FRESH_INSTALL_GRACE_MS) {
        return { prompt: false, reason: 'fresh-install' };
      }
    } catch {}
  }
  if (dataDir) {
    const state = readJson(join(dataDir, 'relaunch-state.json'), {});
    if (state.lastPromptLsAddress && state.lastPromptLsAddress === env.ANTIGRAVITY_LS_ADDRESS) {
      return { prompt: false, reason: 'already-prompted-session' };
    }
    if ((state.lastPromptAt && now - state.lastPromptAt < PROMPT_COOLDOWN_MS) ||
        (state.lastRelaunchAt && now - state.lastRelaunchAt < PROMPT_COOLDOWN_MS)) {
      return { prompt: false, reason: 'cooldown' };
    }
  }
  return { prompt: true, reason: 'ready' };
}

export function maybePromptPostUpdateRelaunch({
  dataDir,
  installDir,
  language = 'zh-CN',
  platform = process.platform,
  env = process.env,
  home = homedir(),
  now = Date.now(),
  relaunch = scheduleRelaunchWithDebugPort
} = {}) {
  const decision = shouldPromptPostUpdate({ dataDir, installDir, env, now });
  if (!decision.prompt) return { prompted: false, reason: decision.reason };
  const target = resolveAntigravityExecutable({ platform, env, home });
  if (!target) return { prompted: false, reason: 'executable-not-found' };

  if (dataDir) {
    const stateFile = join(dataDir, 'relaunch-state.json');
    const prev = readJson(stateFile, {});
    writeJson(stateFile, { ...prev, lastPromptAt: now, lastPromptLsAddress: env.ANTIGRAVITY_LS_ADDRESS });
  }

  const en = language === 'en';
  const message = en
    ? 'Antigravity was updated. Restart to re-enable the Powertools plugin?\n\nYour open conversations will be preserved.'
    : '检测到 Antigravity 已升级，请重启以重新启用 Powertools 插件。\n\n是否现在立即重启客户端？（当前会话记录会自动保留）';

  const wslMode = isWslEnvironment({ platform, env });
  if (platform === 'win32' || wslMode) {
    const promptEnv = wslMode
      ? appendWslEnv({ ...env, AGY_PROMPT_TEXT: message }, ['AGY_PROMPT_TEXT'])
      : { ...env, AGY_PROMPT_TEXT: message };
    const child = spawn('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-Command',
      `$ws = New-Object -ComObject WScript.Shell; $ans = $ws.Popup($env:AGY_PROMPT_TEXT, 0, 'Agy Powertools', 65 + 4096); if ($ans -eq 1) { exit 10 } else { exit 0 }`
    ], { windowsHide: true, stdio: 'ignore', env: promptEnv });
    child.on('exit', code => {
      if (code === 10) {
        try { relaunch({ dataDir, home, platform, env }); } catch {}
      }
    });
    child.unref?.();
    return { prompted: true };
  }

  if (platform === 'darwin') {
    const btnLater = en ? 'Later' : '稍后';
    const btnNow = en ? 'Restart Now' : '立即重启';
    const script = `display dialog ${JSON.stringify(message)} with title "Agy Powertools" buttons {${JSON.stringify(btnLater)}, ${JSON.stringify(btnNow)}} default button ${JSON.stringify(btnNow)}`;
    const child = spawn('osascript', ['-e', script], { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    child.stdout?.on('data', chunk => { out += chunk; });
    child.on('exit', code => {
      if (code === 0 && out.includes(btnNow)) {
        try { relaunch({ dataDir, home, platform, env }); } catch {}
      }
    });
    child.unref?.();
    return { prompted: true };
  }

  return { prompted: false, reason: 'unsupported-dialog-platform' };
}

const AUTO_RELAUNCH_COOLDOWN_MS = 120 * 1000;
const AUTO_RELAUNCH_MAX_CONSECUTIVE = 2;

export function recordDebugPortReady({ dataDir } = {}) {
  if (!dataDir) return;
  const stateFile = join(dataDir, 'relaunch-state.json');
  const prev = readJson(stateFile, null);
  if (!prev || !prev.consecutiveAutoRelaunches) return;
  writeJson(stateFile, { ...prev, consecutiveAutoRelaunches: 0 });
}

export function recordProxyReady({ dataDir } = {}) {
  if (!dataDir) return;
  const stateFile = join(dataDir, 'relaunch-state.json');
  const prev = readJson(stateFile, null);
  if (!prev || !prev.consecutiveProxyAutoRelaunches) return;
  writeJson(stateFile, { ...prev, consecutiveProxyAutoRelaunches: 0 });
}

export function shouldAutoRelaunchProxy({
  dataDir,
  platform = process.platform,
  env = process.env,
  enabled = true,
  proxyEnabled = false,
  proxyUrl = '',
  runtimeProxyReason = '',
  now = Date.now()
} = {}) {
  if (!enabled || !proxyEnabled || !String(proxyUrl || '').trim()) return { relaunch: false, reason: 'disabled' };
  if (runtimeProxyReason !== 'not-applied') return { relaunch: false, reason: runtimeProxyReason || 'already-applied' };
  if (isRemoteSshEnvironment({ platform, env })) return { relaunch: false, reason: 'ssh-remote' };
  if (!env.ANTIGRAVITY_LS_ADDRESS || env.ELECTRON_OZONE_PLATFORM_HINT === 'headless' || env.AGY_POWERTOOLS_NO_PROMPT === '1') {
    return { relaunch: false, reason: 'non-interactive' };
  }
  if (dataDir) {
    const state = readJson(join(dataDir, 'relaunch-state.json'), {});
    if (state.lastProxyAutoRelaunchLsAddress && state.lastProxyAutoRelaunchLsAddress === env.ANTIGRAVITY_LS_ADDRESS) {
      return { relaunch: false, reason: 'already-attempted-session' };
    }
    if ((state.lastProxyAutoRelaunchAt && now - state.lastProxyAutoRelaunchAt < AUTO_RELAUNCH_COOLDOWN_MS) ||
        (state.lastRelaunchAt && now - state.lastRelaunchAt < AUTO_RELAUNCH_COOLDOWN_MS)) {
      return { relaunch: false, reason: 'cooldown' };
    }
    if ((state.consecutiveProxyAutoRelaunches || 0) >= AUTO_RELAUNCH_MAX_CONSECUTIVE) {
      return { relaunch: false, reason: 'circuit-open' };
    }
  }
  return { relaunch: true, reason: 'ready' };
}

export async function maybeAutoRelaunchProxy({
  dataDir,
  home = homedir(),
  platform = process.platform,
  env = process.env,
  enabled = true,
  proxyEnabled = false,
  proxyUrl = '',
  runtimeProxyReason = '',
  now = Date.now(),
  checkPort,
  relaunch = scheduleRelaunchWithDebugPort
} = {}) {
  const decision = shouldAutoRelaunchProxy({ dataDir, platform, env, enabled, proxyEnabled, proxyUrl, runtimeProxyReason, now });
  if (!decision.relaunch) return { relaunched: false, reason: decision.reason };
  const target = resolveAntigravityExecutable({ platform, env, home });
  if (!target) return { relaunched: false, reason: 'executable-not-found' };
  if (typeof checkPort === 'function') {
    let portRes = null;
    try { portRes = await checkPort(proxyUrl, 900); } catch { portRes = { ok: false }; }
    if (!portRes?.ok) return { relaunched: false, reason: 'proxy-unreachable', error: portRes?.error || '' };
  }
  if (dataDir) {
    const stateFile = join(dataDir, 'relaunch-state.json');
    const prev = readJson(stateFile, {});
    writeJson(stateFile, {
      ...prev,
      lastProxyAutoRelaunchAt: now,
      lastProxyAutoRelaunchLsAddress: env.ANTIGRAVITY_LS_ADDRESS,
      consecutiveProxyAutoRelaunches: (prev.consecutiveProxyAutoRelaunches || 0) + 1
    });
  }
  try {
    const res = relaunch({ dataDir, home, platform, env });
    return { relaunched: Boolean(res?.scheduled), target, reason: 'scheduled' };
  } catch (error) {
    return { relaunched: false, reason: 'launch-failed', error: error.message };
  }
}

export function shouldAutoRelaunchMac({
  dataDir,
  platform = process.platform,
  env = process.env,
  enabled = true,
  macAutoRelaunch = true,
  now = Date.now()
} = {}) {
  if (platform !== 'darwin') return { relaunch: false, reason: 'not-darwin' };
  if (!enabled || !macAutoRelaunch) return { relaunch: false, reason: 'disabled' };
  if (!env.ANTIGRAVITY_LS_ADDRESS || env.ELECTRON_OZONE_PLATFORM_HINT === 'headless' || env.AGY_POWERTOOLS_NO_PROMPT === '1') {
    return { relaunch: false, reason: 'non-interactive' };
  }
  if (dataDir) {
    const state = readJson(join(dataDir, 'relaunch-state.json'), {});
    if (state.lastAutoRelaunchLsAddress && state.lastAutoRelaunchLsAddress === env.ANTIGRAVITY_LS_ADDRESS) {
      return { relaunch: false, reason: 'already-attempted-session' };
    }
    if ((state.lastAutoRelaunchAt && now - state.lastAutoRelaunchAt < AUTO_RELAUNCH_COOLDOWN_MS) ||
        (state.lastRelaunchAt && now - state.lastRelaunchAt < AUTO_RELAUNCH_COOLDOWN_MS)) {
      return { relaunch: false, reason: 'cooldown' };
    }
    if ((state.consecutiveAutoRelaunches || 0) >= AUTO_RELAUNCH_MAX_CONSECUTIVE) {
      return { relaunch: false, reason: 'circuit-open' };
    }
  }
  return { relaunch: true, reason: 'ready' };
}

export function maybeAutoRelaunchMac({
  dataDir,
  home = homedir(),
  platform = process.platform,
  env = process.env,
  enabled = true,
  macAutoRelaunch = true,
  now = Date.now(),
  relaunch = scheduleRelaunchWithDebugPort
} = {}) {
  const decision = shouldAutoRelaunchMac({ dataDir, platform, env, enabled, macAutoRelaunch, now });
  if (!decision.relaunch) return { relaunched: false, reason: decision.reason };
  const target = resolveAntigravityExecutable({ platform, env, home });
  if (!target) return { relaunched: false, reason: 'executable-not-found' };
  if (dataDir) {
    const stateFile = join(dataDir, 'relaunch-state.json');
    const prev = readJson(stateFile, {});
    writeJson(stateFile, {
      ...prev,
      lastAutoRelaunchAt: now,
      lastAutoRelaunchLsAddress: env.ANTIGRAVITY_LS_ADDRESS,
      consecutiveAutoRelaunches: (prev.consecutiveAutoRelaunches || 0) + 1
    });
  }
  try {
    const res = relaunch({ dataDir, home, platform, env });
    return { relaunched: Boolean(res?.scheduled), target, reason: 'scheduled' };
  } catch (error) {
    return { relaunched: false, reason: 'launch-failed', error: error.message };
  }
}

const WINDOWS_RUNNABLE_EXTENSIONS = new Set([
  '.exe', '.com', '.bat', '.cmd', '.ps1', '.psm1', '.psd1',
  '.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh', '.hta',
  '.msi', '.msp', '.scr', '.pif', '.reg', '.msc', '.cpl', '.lnk', '.url', '.jar'
]);

export function isWindowsRunnableFile(filePath) {
  return WINDOWS_RUNNABLE_EXTENSIONS.has(extname(String(filePath || '')).toLowerCase());
}

function isNonGlobalIpv4(host) {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b, c, d] = m.slice(1).map(Number);
  if ([a, b, c, d].some(n => n < 0 || n > 255)) return false;
  if (a === 10 || a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isNonGlobalIp(address) {
  const addr = String(address || '').trim().toLowerCase().replace(/^\[|\]$/g, '').split('%')[0];
  const ver = isIP(addr);
  if (ver === 4) return isNonGlobalIpv4(addr);
  if (ver === 6) {
    if (addr === '::1') return true;
    const mapped = addr.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
    if (mapped) return isNonGlobalIpv4(mapped[1]);
    return /^f[cd][0-9a-f]{2}:/.test(addr) || /^fe[89ab][0-9a-f]:/.test(addr);
  }
  return false;
}

function isLoopbackOrKernelHost(hostname, platform) {
  const host = String(hostname || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost')) return true;
  if (platform === 'win32' && host === 'wsl$') return true;
  return false;
}

function normalizeFileUri(uri) {
  let s = String(uri || '').trim();
  // RFC 8089 Appendix E.3.2: normalize 4-slash UNC URIs (file:////host/share/...) to file://host/share/...
  s = s.replace(/^file:\/\/\/\/([^/\\]+)/i, 'file://$1');
  s = s.replace(/^file:\/\/\/(?:\\\\|%5c%5c)([^/\\]+)/i, 'file://$1');
  const hashIdx = s.indexOf('#');
  if (hashIdx >= 0) {
    const before = s.slice(0, hashIdx);
    const decodedFragSep = s.slice(hashIdx + 1).replace(/%2f/gi, '/').replace(/%5c/gi, '/');
    const isLineAnchor = /^(?:L\d+(?:(?:C|:)\d+)?(?:-L?\d+(?:(?:C|:)\d+)?)?|\d+(?:-\d+)?)$/i.test(decodedFragSep);
    const isDocHeading = /\.(?:md|markdown|html?|rst|adoc|pdf)$/i.test(before) && /^[^/\\#?.]+$/.test(decodedFragSep);
    if (isLineAnchor || isDocHeading) {
      s = before;
    } else {
      let tail = decodedFragSep.replace(/(?:#|%23)(?:L\d+(?:(?:C|:)\d+)?(?:-L?\d+(?:(?:C|:)\d+)?)?|\d+(?:-\d+)?)$/i, '');
      tail = tail.replace(/(\.(?:md|markdown|html?|rst|adoc|pdf))(?:#|%23)[^/\\#?.]+$/i, '$1');
      s = `${before}%23${tail.replaceAll('#', '%23')}`;
    }
  }
  return s;
}

export function parseFileUriAnchor(uri) {
  const s = String(uri || '').trim();
  const hashIdx = s.indexOf('#');
  if (hashIdx < 0) return { line: null, column: null };
  let tail = s.slice(hashIdx + 1);
  try { tail = decodeURIComponent(tail); } catch { /* Keep raw fragment. */ }
  const match = tail.match(/(?:^|#)(?:L(\d+)(?:(?:C|:)(\d+))?(?:-L?\d+(?:(?:C|:)\d+)?)?|(\d+)(?:-\d+)?)$/i);
  if (!match) return { line: null, column: null };
  const line = Number(match[1] || match[3]);
  const col = match[2] ? Number(match[2]) : null;
  return {
    line: Number.isInteger(line) && line > 0 ? line : null,
    column: Number.isInteger(col) && col > 0 ? col : null
  };
}

function normalizeWslFileUri(uri, platform) {
  if (platform === 'win32') return uri;
  const s = String(uri || '').trim();
  const m = s.match(/^file:\/\/(?:wsl\.localhost|wsl\$)\/[^/\\]+(\/.*)$/i);
  return m ? `file://${m[1]}` : uri;
}

function parseFileUri(uri, platform = process.platform) {
  if (typeof uri !== 'string' || !uri.trim()) throw new Error('文件路径无效');
  let parsed;
  try {
    parsed = new URL(normalizeFileUri(normalizeWslFileUri(uri, platform)));
  } catch {
    throw new Error('文件路径格式无效');
  }
  if (parsed.protocol !== 'file:') throw new Error('仅支持本地文件链接');
  parsed.hash = '';
  parsed.search = '';
  return { parsed, hostname: parsed.hostname || '' };
}

function toPlatformFilePath(parsed, platform) {
  const hasWindowsDriveOrHost = Boolean(parsed.hostname) || /^\/[a-zA-Z](?::|%3[aA])(?:\/|$)/.test(parsed.pathname);
  if (hasWindowsDriveOrHost && (platform === 'win32' || process.platform === 'win32')) {
    return fileURLToPath(parsed, { windows: true });
  }
  return fileURLToPath(parsed, { windows: false });
}

export function resolveLocalFilePath(uri, { platform = process.platform } = {}) {
  const { parsed, hostname } = parseFileUri(uri, platform);
  if (isLoopbackOrKernelHost(hostname, platform)) return toPlatformFilePath(parsed, platform);
  if (platform === 'win32' && isNonGlobalIp(hostname)) return toPlatformFilePath(parsed, platform);
  throw new Error('仅支持本机或局域网文件路径');
}

export async function resolveVerifiedLocalFilePath(
  uri,
  { platform = process.platform, lookup = dnsLookup, timeoutMs = 2000 } = {}
) {
  const { parsed, hostname } = parseFileUri(uri, platform);
  if (isLoopbackOrKernelHost(hostname, platform)) return toPlatformFilePath(parsed, platform);
  if (platform !== 'win32') throw new Error('仅支持本机或局域网文件路径');
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (isIP(host)) {
    if (isNonGlobalIp(host)) return toPlatformFilePath(parsed, platform);
    throw new Error('仅支持本机或局域网文件路径');
  }
  let timer;
  let records;
  try {
    const query = Promise.resolve(lookup(host, { all: true }));
    records = await (timeoutMs > 0
      ? Promise.race([
          query,
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('局域网主机解析超时')), timeoutMs);
          })
        ])
      : query);
  } catch {
    throw new Error('无法解析局域网主机路径');
  } finally {
    clearTimeout(timer);
  }
  const list = Array.isArray(records) ? records : (records ? [records] : []);
  if (!list.length || !list.every(entry => isNonGlobalIp(typeof entry === 'string' ? entry : entry?.address))) {
    throw new Error('仅支持本机或局域网文件路径');
  }
  return toPlatformFilePath(parsed, platform);
}

export async function openLocalFile(
  uri,
  { action = 'open', platform = process.platform, spawnProcess = spawn, exists = existsSync, stat = statSync, lookup = dnsLookup } = {}
) {
  if (action !== 'open' && action !== 'reveal') throw new Error('不支持的文件操作');
  const filePath = await resolveVerifiedLocalFilePath(uri, { platform, lookup });
  if (!exists(filePath)) throw new Error('文件或文件夹不存在');
  let isDir = false;
  try { isDir = Boolean(stat(filePath)?.isDirectory?.()); } catch { /* Best effort. */ }
  if (action === 'open' && platform === 'win32' && !isDir && isWindowsRunnableFile(filePath)) {
    throw new Error('该文件类型在 Windows 下可能直接执行，已拦截；请使用“打开所在文件夹”或“复制路径”');
  }

  let command;
  let args;
  const spawnOptions = { detached: true, stdio: 'ignore' };
  if (platform === 'win32') {
    command = 'explorer.exe';
    const normalized = /^[a-zA-Z]:[\\/]/.test(filePath) ? filePath.replace(/\//g, '\\') : filePath;
    if (action === 'reveal') {
      if (/^[a-zA-Z]:\\?$/.test(normalized)) {
        args = [normalized.endsWith('\\') ? normalized : `${normalized}\\`];
      } else {
        const clean = normalized.replace(/\\+$/, '').replace(/"/g, '');
        args = [`/select,"${clean}"`];
        spawnOptions.windowsVerbatimArguments = true;
      }
    } else {
      args = [normalized];
    }
  } else if (platform === 'darwin') {
    command = 'open';
    args = action === 'reveal' ? ['-R', filePath] : [filePath];
  } else {
    command = 'xdg-open';
    args = [action === 'reveal' ? (isDir ? filePath : dirname(filePath)) : filePath];
  }

  const child = spawnProcess(command, args, spawnOptions);
  child?.unref?.();
  return { ok: true, path: filePath };
}

const WIN_CMD_UNSAFE_RE = /[\r\n"&|<>^%!]/;

function firstExisting(paths, exists) {
  for (const p of paths) {
    if (p && exists(p)) return p;
  }
  return '';
}

function findInPath(cliNames, { platform, env, exists, winExeName = '' }) {
  const pathSep = platform === 'win32' ? ';' : ':';
  const rawPath = String(env?.PATH || env?.Path || '');
  const pathDirs = rawPath.split(pathSep).map(s => s.trim()).filter(Boolean);
  let cmdFallback = '';
  for (const dir of pathDirs) {
    for (const cli of cliNames) {
      if (platform === 'win32') {
        const exePath = join(dir, `${cli}.exe`);
        if (exists(exePath)) return exePath;
        const cmdPath = join(dir, `${cli}.cmd`);
        if (exists(cmdPath)) {
          const parentExe = winExeName
            ? firstExisting([join(dir, '..', winExeName), join(dir, '..', '..', '..', winExeName)], exists)
            : '';
          if (parentExe) return parentExe;
          if (!cmdFallback) cmdFallback = cmdPath;
        }
      } else {
        const p = join(dir, cli);
        if (exists(p)) return p;
      }
    }
  }
  return cmdFallback;
}

function scanWinVisualStudio(env, exists, readdir) {
  const bases = [env.PROGRAMFILES, env['PROGRAMFILES(X86)']].filter(Boolean).map(p => join(p, 'Microsoft Visual Studio'));
  for (const base of bases) {
    if (!exists(base)) continue;
    let years = [];
    try { years = readdir(base).sort().reverse(); } catch { continue; }
    for (const yr of years) {
      const yrDir = join(base, yr);
      let editions = [];
      try { editions = readdir(yrDir); } catch { continue; }
      for (const ed of editions) {
        const devenv = join(yrDir, ed, 'Common7', 'IDE', 'devenv.exe');
        if (exists(devenv)) return devenv;
      }
    }
  }
  return '';
}

function scanWinJetBrains(env, exists, readdir) {
  const specs = [
    ['idea', 'IntelliJ IDEA', 'idea64.exe', /intellij\s*idea/i],
    ['pycharm', 'PyCharm', 'pycharm64.exe', /pycharm/i],
    ['webstorm', 'WebStorm', 'webstorm64.exe', /webstorm/i],
    ['goland', 'GoLand', 'goland64.exe', /goland/i],
    ['rider', 'Rider', 'rider64.exe', /rider/i],
    ['clion', 'CLion', 'clion64.exe', /clion/i],
    ['phpstorm', 'PhpStorm', 'phpstorm64.exe', /phpstorm/i],
    ['datagrip', 'DataGrip', 'datagrip64.exe', /datagrip/i]
  ];
  const roots = [
    env.LOCALAPPDATA && join(env.LOCALAPPDATA, 'Programs'),
    env.PROGRAMFILES && join(env.PROGRAMFILES, 'JetBrains')
  ].filter(Boolean);
  const found = [];
  const seen = new Set();
  for (const root of roots) {
    if (!exists(root)) continue;
    let entries = [];
    try { entries = readdir(root); } catch { continue; }
    for (const entry of entries) {
      for (const [id, label, exe, re] of specs) {
        if (seen.has(id) || !re.test(entry)) continue;
        const bin = join(root, entry, 'bin', exe);
        if (exists(bin)) {
          seen.add(id);
          found.push({ id, label, kind: 'editor', icon: 'jetbrains', style: 'jetbrains', command: bin });
        }
      }
    }
  }
  return found;
}

function scanMacApplications(home, exists, readdir) {
  const dirs = ['/Applications', join(home, 'Applications')];
  const catalog = [
    { id: 'vscode', label: 'VS Code', icon: 'vscode', kind: 'editor', re: /^Visual Studio Code\.app$/i, cli: 'Contents/Resources/app/bin/code', style: 'vscode' },
    { id: 'vscode-insiders', label: 'VS Code Insiders', icon: 'vscode', kind: 'editor', re: /^Visual Studio Code - Insiders\.app$/i, cli: 'Contents/Resources/app/bin/code', style: 'vscode' },
    { id: 'cursor', label: 'Cursor', icon: 'cursor', kind: 'editor', re: /^Cursor\.app$/i, cli: 'Contents/Resources/app/bin/cursor', style: 'vscode' },
    { id: 'windsurf', label: 'Windsurf', icon: 'windsurf', kind: 'editor', re: /^Windsurf\.app$/i, cli: 'Contents/Resources/app/bin/windsurf', style: 'vscode' },
    { id: 'trae', label: 'Trae', icon: 'editor', kind: 'editor', re: /^Trae\.app$/i, cli: 'Contents/Resources/app/bin/marscode', style: 'vscode' },
    { id: 'zed', label: 'Zed', icon: 'zed', kind: 'editor', re: /^Zed\.app$/i, cli: 'Contents/MacOS/cli', style: 'zed' },
    { id: 'antigravity', label: 'Antigravity', icon: 'antigravity', kind: 'editor', re: /^Antigravity\.app$/i, cli: 'Contents/Resources/app/bin/antigravity', style: 'vscode' },
    { id: 'xcode', label: 'Xcode', icon: 'editor', kind: 'editor', re: /^Xcode\.app$/i, cli: '', style: 'mac-app' },
    { id: 'sublime', label: 'Sublime Text', icon: 'sublime', kind: 'editor', re: /^Sublime Text\.app$/i, cli: 'Contents/SharedSupport/bin/subl', style: 'sublime' },
    { id: 'idea', label: 'IntelliJ IDEA', icon: 'jetbrains', kind: 'editor', re: /^IntelliJ IDEA.*\.app$/i, cli: 'Contents/MacOS/idea', style: 'jetbrains' },
    { id: 'pycharm', label: 'PyCharm', icon: 'jetbrains', kind: 'editor', re: /^PyCharm.*\.app$/i, cli: 'Contents/MacOS/pycharm', style: 'jetbrains' },
    { id: 'webstorm', label: 'WebStorm', icon: 'jetbrains', kind: 'editor', re: /^WebStorm.*\.app$/i, cli: 'Contents/MacOS/webstorm', style: 'jetbrains' },
    { id: 'goland', label: 'GoLand', icon: 'jetbrains', kind: 'editor', re: /^GoLand.*\.app$/i, cli: 'Contents/MacOS/goland', style: 'jetbrains' },
    { id: 'rider', label: 'Rider', icon: 'jetbrains', kind: 'editor', re: /^Rider.*\.app$/i, cli: 'Contents/MacOS/rider', style: 'jetbrains' },
    { id: 'clion', label: 'CLion', icon: 'jetbrains', kind: 'editor', re: /^CLion.*\.app$/i, cli: 'Contents/MacOS/clion', style: 'jetbrains' },
    { id: 'android-studio', label: 'Android Studio', icon: 'jetbrains', kind: 'editor', re: /^Android Studio.*\.app$/i, cli: 'Contents/MacOS/studio', style: 'jetbrains' },
    { id: 'iterm', label: 'iTerm', icon: 'terminal', kind: 'terminal', re: /^iTerm\.app$/i, cli: '', style: 'terminal-mac' },
    { id: 'ghostty', label: 'Ghostty', icon: 'terminal', kind: 'terminal', re: /^Ghostty\.app$/i, cli: '', style: 'terminal-mac' },
    { id: 'warp', label: 'Warp', icon: 'terminal', kind: 'terminal', re: /^Warp\.app$/i, cli: '', style: 'terminal-mac' },
    { id: 'wezterm', label: 'WezTerm', icon: 'terminal', kind: 'terminal', re: /^WezTerm\.app$/i, cli: '', style: 'terminal-mac' },
    { id: 'kitty', label: 'Kitty', icon: 'terminal', kind: 'terminal', re: /^kitty\.app$/i, cli: '', style: 'terminal-mac' },
    { id: 'alacritty', label: 'Alacritty', icon: 'terminal', kind: 'terminal', re: /^Alacritty\.app$/i, cli: '', style: 'terminal-mac' }
  ];
  const found = new Map();
  for (const dir of dirs) {
    if (!exists(dir)) continue;
    let items = [];
    try { items = readdir(dir); } catch { continue; }
    for (const item of items) {
      for (const spec of catalog) {
        if (found.has(spec.id) || !spec.re.test(item)) continue;
        const appPath = join(dir, item);
        const cliPath = spec.cli ? join(appPath, spec.cli) : '';
        const hasCli = Boolean(cliPath && exists(cliPath));
        found.set(spec.id, {
          id: spec.id,
          label: spec.label,
          kind: spec.kind,
          icon: spec.icon,
          style: hasCli ? spec.style : (spec.kind === 'terminal' ? 'terminal-mac' : 'mac-app'),
          command: hasCli ? cliPath : appPath
        });
      }
    }
  }
  const ordered = catalog.map(c => found.get(c.id)).filter(Boolean);
  const sysTerminal = '/System/Applications/Utilities/Terminal.app';
  if (exists(sysTerminal)) {
    ordered.push({ id: 'terminal', label: 'Terminal', kind: 'terminal', icon: 'terminal', style: 'terminal-mac', command: sysTerminal });
  }
  return ordered;
}

export function discoverOpenWithApps({
  platform = process.platform,
  env = process.env,
  home = homedir(),
  exists = existsSync,
  readdir = readdirSync
} = {}) {
  const editors = [];
  const terminals = [];
  const seen = new Set();
  const push = (list, item) => {
    if (!item || !item.id || seen.has(item.id)) return;
    seen.add(item.id);
    list.push(item);
  };

  if (platform === 'win32') {
    const e = env || {};
    const winEditors = [
      { id: 'vscode', label: 'VS Code', icon: 'vscode', style: 'vscode', winExeName: 'Code.exe', cliNames: ['code'], paths: [e.LOCALAPPDATA && join(e.LOCALAPPDATA, 'Programs', 'Microsoft VS Code', 'Code.exe'), e.PROGRAMFILES && join(e.PROGRAMFILES, 'Microsoft VS Code', 'Code.exe')] },
      { id: 'vscode-insiders', label: 'VS Code Insiders', icon: 'vscode', style: 'vscode', winExeName: 'Code - Insiders.exe', cliNames: ['code-insiders'], paths: [e.LOCALAPPDATA && join(e.LOCALAPPDATA, 'Programs', 'Microsoft VS Code Insiders', 'Code - Insiders.exe'), e.PROGRAMFILES && join(e.PROGRAMFILES, 'Microsoft VS Code Insiders', 'Code - Insiders.exe')] },
      { id: 'cursor', label: 'Cursor', icon: 'cursor', style: 'vscode', winExeName: 'Cursor.exe', cliNames: ['cursor'], paths: [e.LOCALAPPDATA && join(e.LOCALAPPDATA, 'Programs', 'cursor', 'Cursor.exe'), e.PROGRAMFILES && join(e.PROGRAMFILES, 'cursor', 'Cursor.exe')] },
      { id: 'windsurf', label: 'Windsurf', icon: 'windsurf', style: 'vscode', winExeName: 'Windsurf.exe', cliNames: ['windsurf'], paths: [e.LOCALAPPDATA && join(e.LOCALAPPDATA, 'Programs', 'Windsurf', 'Windsurf.exe'), e.PROGRAMFILES && join(e.PROGRAMFILES, 'Windsurf', 'Windsurf.exe')] },
      { id: 'trae', label: 'Trae', icon: 'editor', style: 'vscode', winExeName: 'Trae.exe', cliNames: ['trae'], paths: [e.LOCALAPPDATA && join(e.LOCALAPPDATA, 'Programs', 'Trae', 'Trae.exe'), e.PROGRAMFILES && join(e.PROGRAMFILES, 'Trae', 'Trae.exe')] },
      { id: 'zed', label: 'Zed', icon: 'zed', style: 'zed', winExeName: 'Zed.exe', cliNames: ['zed'], paths: [e.LOCALAPPDATA && join(e.LOCALAPPDATA, 'Programs', 'Zed', 'Zed.exe'), e.LOCALAPPDATA && join(e.LOCALAPPDATA, 'Programs', 'Zed', 'bin', 'zed.exe')] },
      { id: 'antigravity', label: 'Antigravity', icon: 'antigravity', style: 'vscode', winExeName: 'Antigravity.exe', cliNames: ['antigravity'], paths: [e.LOCALAPPDATA && join(e.LOCALAPPDATA, 'Programs', 'Antigravity', 'Antigravity.exe'), e.LOCALAPPDATA && join(e.LOCALAPPDATA, 'Programs', 'antigravity', 'Antigravity.exe'), e.PROGRAMFILES && join(e.PROGRAMFILES, 'Antigravity', 'Antigravity.exe')] },
      { id: 'sublime', label: 'Sublime Text', icon: 'sublime', style: 'sublime', winExeName: 'sublime_text.exe', cliNames: ['subl'], paths: [e.PROGRAMFILES && join(e.PROGRAMFILES, 'Sublime Text', 'sublime_text.exe'), e.PROGRAMFILES && join(e.PROGRAMFILES, 'Sublime Text 3', 'sublime_text.exe')] },
      { id: 'notepadpp', label: 'Notepad++', icon: 'editor', style: 'notepadpp', winExeName: 'notepad++.exe', cliNames: ['notepad++'], paths: [e.PROGRAMFILES && join(e.PROGRAMFILES, 'Notepad++', 'notepad++.exe'), e['PROGRAMFILES(X86)'] && join(e['PROGRAMFILES(X86)'], 'Notepad++', 'notepad++.exe')] }
    ];
    for (const spec of winEditors) {
      const cmd = firstExisting(spec.paths, exists) || findInPath(spec.cliNames, { platform, env: e, exists, winExeName: spec.winExeName });
      if (cmd) push(editors, { id: spec.id, label: spec.label, kind: 'editor', icon: spec.icon, style: spec.style, command: cmd });
    }
    const vsCmd = scanWinVisualStudio(e, exists, readdir);
    if (vsCmd) push(editors, { id: 'visualstudio', label: 'Visual Studio', kind: 'editor', icon: 'visualstudio', style: 'vs', command: vsCmd });
    for (const jb of scanWinJetBrains(e, exists, readdir)) push(editors, jb);

    const winAppsDir = e.LOCALAPPDATA && join(e.LOCALAPPDATA, 'Microsoft', 'WindowsApps');
    let wtCmd = firstExisting([winAppsDir && join(winAppsDir, 'wt.exe')], exists) || findInPath(['wt'], { platform, env: e, exists });
    if (!wtCmd && winAppsDir) {
      try {
        if (readdir(winAppsDir).some(n => String(n).toLowerCase() === 'wt.exe')) wtCmd = join(winAppsDir, 'wt.exe');
      } catch { /* WindowsApps may not be readable. */ }
    }
    if (wtCmd) push(terminals, { id: 'terminal', label: 'Terminal', kind: 'terminal', icon: 'terminal', style: 'terminal-wt', command: wtCmd });
    const gitBash = firstExisting([
      e.PROGRAMFILES && join(e.PROGRAMFILES, 'Git', 'git-bash.exe'),
      e['PROGRAMFILES(X86)'] && join(e['PROGRAMFILES(X86)'], 'Git', 'git-bash.exe'),
      e.LOCALAPPDATA && join(e.LOCALAPPDATA, 'Programs', 'Git', 'git-bash.exe')
    ], exists);
    if (gitBash) push(terminals, { id: 'git-bash', label: 'Git Bash', kind: 'terminal', icon: 'gitbash', style: 'terminal-gitbash', command: gitBash });
    const wslCmd = firstExisting([join(e.SystemRoot || 'C:\\Windows', 'System32', 'wsl.exe')], exists);
    if (wslCmd) push(terminals, { id: 'wsl', label: 'WSL', kind: 'terminal', icon: 'wsl', style: 'terminal-wsl', command: wslCmd });
  } else if (platform === 'darwin') {
    for (const item of scanMacApplications(home, exists, readdir)) {
      push(item.kind === 'terminal' ? terminals : editors, item);
    }
  } else {
    const linuxEditors = [
      { id: 'vscode', label: 'VS Code', icon: 'vscode', style: 'vscode', cliNames: ['code'], paths: [join(home, '.local', 'bin', 'code'), '/usr/bin/code', '/usr/local/bin/code', '/snap/bin/code'] },
      { id: 'vscode-insiders', label: 'VS Code Insiders', icon: 'vscode', style: 'vscode', cliNames: ['code-insiders'], paths: ['/usr/bin/code-insiders', '/snap/bin/code-insiders'] },
      { id: 'cursor', label: 'Cursor', icon: 'cursor', style: 'vscode', cliNames: ['cursor'], paths: [join(home, '.local', 'bin', 'cursor'), '/usr/local/bin/cursor', '/usr/bin/cursor'] },
      { id: 'windsurf', label: 'Windsurf', icon: 'windsurf', style: 'vscode', cliNames: ['windsurf'], paths: [join(home, '.local', 'bin', 'windsurf'), '/usr/local/bin/windsurf', '/usr/bin/windsurf'] },
      { id: 'trae', label: 'Trae', icon: 'editor', style: 'vscode', cliNames: ['trae'], paths: [join(home, '.local', 'bin', 'trae'), '/usr/local/bin/trae', '/usr/bin/trae'] },
      { id: 'zed', label: 'Zed', icon: 'zed', style: 'zed', cliNames: ['zed', 'zeditor'], paths: [join(home, '.local', 'bin', 'zed'), '/usr/local/bin/zed', '/usr/bin/zed', '/usr/bin/zeditor'] },
      { id: 'antigravity', label: 'Antigravity', icon: 'antigravity', style: 'vscode', cliNames: ['antigravity'], paths: ['/usr/bin/antigravity', '/usr/local/bin/antigravity'] },
      { id: 'sublime', label: 'Sublime Text', icon: 'sublime', style: 'sublime', cliNames: ['subl'], paths: ['/usr/bin/subl', '/usr/local/bin/subl', '/snap/bin/subl'] },
      { id: 'idea', label: 'IntelliJ IDEA', icon: 'jetbrains', style: 'jetbrains', cliNames: ['idea'], paths: [join(home, '.local', 'bin', 'idea'), '/usr/local/bin/idea'] },
      { id: 'pycharm', label: 'PyCharm', icon: 'jetbrains', style: 'jetbrains', cliNames: ['pycharm'], paths: [join(home, '.local', 'bin', 'pycharm'), '/usr/local/bin/pycharm'] },
      { id: 'webstorm', label: 'WebStorm', icon: 'jetbrains', style: 'jetbrains', cliNames: ['webstorm'], paths: [join(home, '.local', 'bin', 'webstorm'), '/usr/local/bin/webstorm'] },
      { id: 'goland', label: 'GoLand', icon: 'jetbrains', style: 'jetbrains', cliNames: ['goland'], paths: [join(home, '.local', 'bin', 'goland'), '/usr/local/bin/goland'] }
    ];
    for (const spec of linuxEditors) {
      const cmd = firstExisting(spec.paths, exists) || findInPath(spec.cliNames, { platform, env, exists });
      if (cmd) push(editors, { id: spec.id, label: spec.label, kind: 'editor', icon: spec.icon, style: spec.style, command: cmd });
    }
    const linuxTerminals = [
      { id: 'ghostty', label: 'Ghostty', cliNames: ['ghostty'] },
      { id: 'wezterm', label: 'WezTerm', cliNames: ['wezterm'] },
      { id: 'kitty', label: 'Kitty', cliNames: ['kitty'] },
      { id: 'alacritty', label: 'Alacritty', cliNames: ['alacritty'] },
      { id: 'gnome-terminal', label: 'Terminal', cliNames: ['gnome-terminal', 'konsole', 'xfce4-terminal', 'x-terminal-emulator'] }
    ];
    for (const spec of linuxTerminals) {
      const cmd = findInPath(spec.cliNames, { platform, env, exists });
      if (cmd) push(terminals, { id: spec.id, label: spec.label, kind: 'terminal', icon: 'terminal', style: 'terminal-linux', command: cmd });
    }
  }

  const systemItems = [
    { id: 'default', label: 'Default app', kind: 'system', icon: 'default', style: 'default', command: '' },
    { id: 'explorer', label: platform === 'darwin' ? 'Finder' : platform === 'win32' ? 'File Explorer' : 'File Manager', kind: 'system', icon: 'explorer', style: 'explorer', command: '' }
  ];

  return [...editors, ...systemItems, ...terminals];
}

export async function openFileWithApp(
  uri,
  appId,
  {
    line = null,
    column = null,
    platform = process.platform,
    env = process.env,
    home = homedir(),
    spawnProcess = spawn,
    exists = existsSync,
    readdir = readdirSync,
    stat = statSync,
    lookup = dnsLookup
  } = {}
) {
  const id = String(appId || '').trim();
  if (!id || id === 'default') {
    const res = await openLocalFile(uri, { action: 'open', platform, spawnProcess, exists, stat, lookup });
    return { ...res, appId: 'default', label: 'Default app' };
  }
  if (id === 'explorer') {
    const res = await openLocalFile(uri, { action: 'reveal', platform, spawnProcess, exists, stat, lookup });
    return { ...res, appId: 'explorer', label: platform === 'darwin' ? 'Finder' : platform === 'win32' ? 'File Explorer' : 'File Manager' };
  }

  const apps = discoverOpenWithApps({ platform, env, home, exists, readdir });
  const app = apps.find(a => a.id === id);
  if (!app || !app.command) throw new Error('未在本机检测到所选应用');

  const anchor = parseFileUriAnchor(uri);
  const targetLine = Number.isInteger(Number(line)) && Number(line) > 0 ? Number(line) : anchor.line;
  const targetCol = Number.isInteger(Number(column)) && Number(column) > 0 ? Number(column) : anchor.column;
  const filePath = await resolveVerifiedLocalFilePath(uri, { platform, lookup });
  if (!exists(filePath)) throw new Error('文件或文件夹不存在');
  let isDir = false;
  try { isDir = Boolean(stat(filePath)?.isDirectory?.()); } catch { /* Best effort. */ }
  const targetDir = isDir ? filePath : dirname(filePath);

  let command = app.command;
  let args = [filePath];
  const spawnOptions = { detached: true, stdio: 'ignore', windowsHide: app.kind !== 'terminal', env };

  if (app.style === 'vscode') {
    args = isDir ? [filePath] : (targetLine ? ['-g', `${filePath}:${targetLine}:${targetCol || 1}`] : [filePath]);
  } else if (app.style === 'zed' || app.style === 'sublime') {
    args = isDir ? [filePath] : [targetLine ? `${filePath}:${targetLine}${targetCol ? `:${targetCol}` : ''}` : filePath];
  } else if (app.style === 'notepadpp') {
    args = isDir ? [filePath] : [...(targetLine ? [`-n${targetLine}`, ...(targetCol ? [`-c${targetCol}`] : [])] : []), filePath];
  } else if (app.style === 'jetbrains') {
    args = isDir ? [filePath] : [...(targetLine ? ['--line', String(targetLine), ...(targetCol ? ['--column', String(targetCol)] : [])] : []), filePath];
  } else if (app.style === 'vs') {
    args = isDir ? [filePath] : ['/Edit', filePath];
  } else if (app.style === 'mac-app') {
    command = 'open';
    args = ['-a', app.command, filePath];
  } else if (app.style === 'terminal-wt') {
    args = ['-d', targetDir];
  } else if (app.style === 'terminal-gitbash') {
    args = [`--cd=${targetDir}`];
  } else if (app.style === 'terminal-wsl') {
    args = ['--cd', targetDir];
  } else if (app.style === 'terminal-mac') {
    command = 'open';
    args = ['-a', app.command, targetDir];
  } else if (app.style === 'terminal-linux') {
    spawnOptions.cwd = targetDir;
    args = [];
  }

  if (platform === 'win32' && /\.cmd$/i.test(command)) {
    if (WIN_CMD_UNSAFE_RE.test(command) || args.some(a => WIN_CMD_UNSAFE_RE.test(a))) {
      throw new Error('当前文件路径包含 Windows 批处理敏感字符，已拦截 .cmd 启动；请使用可执行程序或“打开所在文件夹”');
    }
    args = ['/d', '/s', '/c', command, ...args];
    command = env?.ComSpec || 'cmd.exe';
  }

  const child = spawnProcess(command, args, spawnOptions);
  child?.on?.('error', () => {});
  child?.unref?.();
  return { ok: true, path: filePath, appId: app.id, label: app.label, line: targetLine, column: targetCol };
}

function runProcessAsync(spawnProcess, command, args, options = {}, { input, timeoutMs = 8000 } = {}) {
  return new Promise(resolvePromise => {
    let settled = false;
    let stderr = '';
    const finish = result => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise(result);
    };
    let child;
    try {
      child = spawnProcess(command, args, {
        ...options,
        stdio: [input != null ? 'pipe' : 'ignore', 'ignore', 'pipe']
      });
    } catch (error) {
      return finish({ status: -1, error, stderr: '' });
    }
    const timer = setTimeout(() => {
      try { child?.kill?.(); } catch { /* Best effort. */ }
      finish({ status: -1, error: new Error('操作超时'), stderr });
    }, timeoutMs);
    child?.stderr?.on?.('data', chunk => {
      if (stderr.length < 2048) stderr += String(chunk);
    });
    child?.on?.('error', error => finish({ status: -1, error, stderr }));
    child?.on?.('close', code => finish({ status: code ?? 0, error: null, stderr }));
    if (input != null && child?.stdin) {
      child.stdin.on?.('error', () => {});
      child.stdin.end(input);
    }
  });
}

export async function copyLocalFile(
  uri,
  { platform = process.platform, spawnProcess = spawn, exists = existsSync, env = process.env, timeoutMs = 8000, lookup = dnsLookup } = {}
) {
  const filePath = await resolveVerifiedLocalFilePath(uri, { platform, lookup });
  if (!exists(filePath)) throw new Error('文件或文件夹不存在');

  let result;
  if (platform === 'win32') {
    result = await runProcessAsync(
      spawnProcess,
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-Command', 'Set-Clipboard -LiteralPath $env:AGY_CLIPBOARD_PATH'],
      { windowsHide: true, env: { ...env, AGY_CLIPBOARD_PATH: filePath } },
      { timeoutMs }
    );
  } else if (platform === 'darwin') {
    result = await runProcessAsync(
      spawnProcess,
      'osascript',
      ['-e', 'set the clipboard to (POSIX file (system attribute "AGY_CLIPBOARD_PATH"))'],
      { env: { ...env, AGY_CLIPBOARD_PATH: filePath } },
      { timeoutMs }
    );
  } else {
    const fileUri = `${pathToFileURL(filePath).href}\n`;
    result = await runProcessAsync(
      spawnProcess,
      'wl-copy',
      ['--type', 'text/uri-list'],
      { env },
      { input: fileUri, timeoutMs }
    );
    if (result.error || result.status !== 0) {
      result = await runProcessAsync(
        spawnProcess,
        'xclip',
        ['-selection', 'clipboard', '-t', 'text/uri-list'],
        { env },
        { input: fileUri, timeoutMs }
      );
    }
  }

  if (result?.error || result?.status !== 0) {
    throw new Error(result?.stderr?.trim() || result?.error?.message || '复制文件失败');
  }
  return { ok: true, path: filePath };
}

const ATTACH_MEDIA_MIME = new Map([
  ['.png', { mimeType: 'image/png', kind: 'media' }],
  ['.jpg', { mimeType: 'image/jpeg', kind: 'media' }],
  ['.jpeg', { mimeType: 'image/jpeg', kind: 'media' }],
  ['.gif', { mimeType: 'image/gif', kind: 'media' }],
  ['.webp', { mimeType: 'image/webp', kind: 'media' }],
  ['.bmp', { mimeType: 'image/bmp', kind: 'media' }],
  ['.pdf', { mimeType: 'application/pdf', kind: 'doc' }],
  ['.docx', { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', kind: 'doc' }],
  ['.doc', { mimeType: 'application/msword', kind: 'doc' }],
  ['.xlsx', { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', kind: 'doc' }],
  ['.xls', { mimeType: 'application/vnd.ms-excel', kind: 'doc' }],
  ['.pptx', { mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', kind: 'doc' }],
  ['.ppt', { mimeType: 'application/vnd.ms-powerpoint', kind: 'doc' }],
  ['.odt', { mimeType: 'application/vnd.oasis.opendocument.text', kind: 'doc' }],
  ['.ods', { mimeType: 'application/vnd.oasis.opendocument.spreadsheet', kind: 'doc' }],
  ['.odp', { mimeType: 'application/vnd.oasis.opendocument.presentation', kind: 'doc' }],
  ['.rtf', { mimeType: 'application/rtf', kind: 'doc' }],
  ['.zip', { mimeType: 'application/zip', kind: 'media' }],
  ['.mp4', { mimeType: 'video/mp4', kind: 'media' }],
  ['.webm', { mimeType: 'video/webm', kind: 'media' }],
  ['.wav', { mimeType: 'audio/wav', kind: 'media' }],
  ['.mp3', { mimeType: 'audio/mp3', kind: 'media' }],
  ['.m4a', { mimeType: 'audio/m4a', kind: 'media' }],
  ['.aac', { mimeType: 'audio/aac', kind: 'media' }],
  ['.ogg', { mimeType: 'audio/ogg', kind: 'media' }],
  ['.flac', { mimeType: 'audio/flac', kind: 'media' }],
  ['.opus', { mimeType: 'audio/opus', kind: 'media' }],
  ['.weba', { mimeType: 'audio/webm', kind: 'media' }]
]);

export async function readLocalFileForAttach(
  uri,
  {
    platform = process.platform,
    exists = existsSync,
    stat = statSync,
    readFile = readFileSync,
    lookup = dnsLookup,
    maxMediaBytes = 10 * 1024 * 1024,
    maxDocBytes = 10 * 1024 * 1024
  } = {}
) {
  const filePath = await resolveVerifiedLocalFilePath(uri, { platform, lookup });
  if (!exists(filePath)) throw new Error('文件或文件夹不存在');
  const info = stat(filePath);
  const name = basename(filePath) || filePath;
  const normalizedUri = pathToFileURL(filePath).href;
  if (info?.isDirectory?.()) {
    return { ok: true, mode: 'mention', kind: 'directory', uri: normalizedUri, path: filePath, name, isDirectory: true };
  }
  const spec = ATTACH_MEDIA_MIME.get(extname(filePath).toLowerCase());
  const size = Number(info?.size || 0);
  const limit = spec?.kind === 'doc' ? maxDocBytes : maxMediaBytes;
  if (spec && size >= 0 && size <= limit) {
    const buffer = readFile(filePath);
    return {
      ok: true,
      mode: 'media',
      kind: 'file',
      uri: normalizedUri,
      path: filePath,
      name,
      mimeType: spec.mimeType,
      size: buffer.length,
      base64: buffer.toString('base64'),
      isDirectory: false
    };
  }
  return {
    ok: true,
    mode: 'mention',
    kind: 'file',
    uri: normalizedUri,
    path: filePath,
    name,
    size,
    oversized: Boolean(spec && size > limit),
    isDirectory: false
  };
}
