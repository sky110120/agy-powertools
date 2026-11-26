import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { spawnSync } from 'node:child_process';
import {
  ACTIVE_TARGET,
  ACTIVE_USERNAME,
  buildMacKeychainReadScript,
  buildMacKeychainWriteScript,
  createCredentialVault,
  extractCredentialEmail,
  vaultTargetFor
} from '../lib/credential-vault.mjs';

test('vaultTargetFor validates account IDs and rejects invalid or injection-like names', () => {
  assert.equal(vaultTargetFor('acct-123_ab'), 'agy-powertools:account:acct-123_ab');
  for (const bad of ['', '   ', '../etc', 'a b', 'acct:1', 'a"b', 'x'.repeat(65)]) {
    assert.throws(() => vaultTargetFor(bad), /账号标识/);
  }
});

test('Windows credential vault passes target names via environment variables and avoids leaking secrets', () => {
  const calls = [];
  const vault = createCredentialVault({
    platform: 'win32',
    runSpawn(cmd, args, opts) {
      calls.push({ cmd, args, env: opts.env });
      const op = opts.env.AGY_CRED_OP;
      if (op === 'has' || op === 'inspect') return { status: 0, stdout: '{"ok":true,"exists":true,"bytes":512,"hash":"AABBCCDDEEFF"}\n', stderr: '' };
      if (op === 'copy') return { status: 0, stdout: '{"ok":true,"bytes":512,"hash":"AABBCCDDEEFF"}\n', stderr: '' };
      return { status: 0, stdout: '{"ok":true}\n', stderr: '' };
    }
  });
  assert.equal(vault.supported, true);
  assert.equal(vault.hasSaved('acct-1'), true);
  assert.deepEqual(vault.inspectSaved('acct-1'), { exists: true, hash: 'AABBCCDDEEFF' });
  assert.equal(calls[0].cmd, 'powershell.exe');
  assert.equal(calls[0].env.AGY_CRED_SRC, 'agy-powertools:account:acct-1');

  const saved = vault.saveActiveTo('acct-1');
  assert.deepEqual(saved, { ok: true, bytes: 512, hash: 'AABBCCDDEEFF' });
  assert.equal(calls[2].env.AGY_CRED_SRC, ACTIVE_TARGET);
  assert.equal(calls[2].env.AGY_CRED_DST, 'agy-powertools:account:acct-1');

  const restored = vault.restoreToActive('acct-1');
  assert.deepEqual(restored, { ok: true, bytes: 512, hash: 'AABBCCDDEEFF' });
  assert.equal(calls[3].env.AGY_CRED_SRC, 'agy-powertools:account:acct-1');
  assert.equal(calls[3].env.AGY_CRED_DST, ACTIVE_TARGET);
  assert.equal(calls[3].env.AGY_CRED_USER, ACTIVE_USERNAME);

  assert.deepEqual(vault.removeSaved('acct-1'), { ok: true });
  assert.equal(calls[4].env.AGY_CRED_OP, 'remove');
});

test('macOS and Linux credential vaults use stdin pipes for secrets and never pass tokens in CLI args', () => {
  const macCalls = [];
  const macVault = createCredentialVault({
    platform: 'darwin',
    runSpawn(cmd, args, opts) {
      macCalls.push({ cmd, args, input: opts?.input });
      if (args.includes('-w')) return { status: 0, stdout: Buffer.from('secret-refresh-token\n') };
      return { status: 0, stdout: '' };
    }
  });
  assert.equal(macVault.hasSaved('acct-mac'), true);
  const macCopy = macVault.saveActiveTo('acct-mac');
  assert.equal(macCopy.ok, true);
  assert.equal(macCalls[1].cmd, '/usr/bin/security');
  assert.equal(macCalls[2].args[0], '-i');
  assert.equal(macCalls[2].args.includes('secret-refresh-token'), false);
  assert.ok(String(macCalls[2].input).includes('agy-powertools-account'));

  const linuxCalls = [];
  const linuxVault = createCredentialVault({
    platform: 'linux',
    wsl: false,
    runSpawn(cmd, args, opts) {
      linuxCalls.push({ cmd, args, inputText: opts?.input ? Buffer.from(opts.input).toString('utf8') : '' });
      if (args[0] === 'lookup') return { status: 0, stdout: Buffer.from('linux-token') };
      return { status: 0, stdout: '' };
    }
  });
  assert.equal(linuxVault.hasSaved('acct-lin'), true);
  assert.equal(linuxVault.restoreToActive('acct-lin').ok, true);
  assert.equal(linuxCalls[2].args.includes('linux-token'), false);
  assert.equal(linuxCalls[2].inputText, 'linux-token');
});

test('credential vault extracts id_token_email and blocks mismatched writes across Linux, macOS, and Windows', () => {
  const alphaPayload = JSON.stringify({
    token: { access_token: 'tok-a', refresh_token: 'rt-a' },
    auth_method: 'consumer',
    id_token_email: 'Alpha@Example.com'
  });
  const wslEnvelope = JSON.stringify({
    v: 1,
    token: Buffer.from(alphaPayload, 'utf8').toString('base64'),
    scope: null
  });
  assert.equal(extractCredentialEmail(alphaPayload), 'alpha@example.com');
  assert.equal(extractCredentialEmail(Buffer.from(wslEnvelope, 'utf8')), 'alpha@example.com');
  assert.equal(extractCredentialEmail('opaque-non-json-token'), '');

  // Linux: inspect returns email, and mismatched saveActiveTo refuses without calling secret-tool store
  const linuxOps = [];
  const linuxVault = createCredentialVault({
    platform: 'linux',
    wsl: false,
    runSpawn(cmd, args) {
      linuxOps.push(args[0]);
      if (args[0] === 'lookup') return { status: 0, stdout: Buffer.from(alphaPayload, 'utf8') };
      return { status: 0, stdout: '' };
    }
  });
  const inspected = linuxVault.inspectActive();
  assert.equal(inspected.exists, true);
  assert.equal(inspected.email, 'alpha@example.com');
  const blocked = linuxVault.saveActiveTo('acct-beta', { expectedEmail: 'beta@example.com' });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.mismatch, true);
  assert.equal(blocked.actualEmail, 'alpha@example.com');
  assert.equal(blocked.expectedEmail, 'beta@example.com');
  assert.equal(linuxOps.includes('store'), false);
  const allowed = linuxVault.saveActiveTo('acct-alpha', { expectedEmail: 'alpha@example.com' });
  assert.equal(allowed.ok, true);
  assert.equal(allowed.email, 'alpha@example.com');
  assert.equal(linuxOps.includes('store'), true);

  // macOS: mismatched restoreToActive refuses without calling security -i
  const macOps = [];
  const macVault = createCredentialVault({
    platform: 'darwin',
    runSpawn(_cmd, args) {
      macOps.push(args[0]);
      if (args.includes('-w')) return { status: 0, stdout: Buffer.from(alphaPayload + '\n', 'utf8') };
      return { status: 0, stdout: '' };
    }
  });
  assert.equal(macVault.inspectSaved('acct-alpha').email, 'alpha@example.com');
  const macBlocked = macVault.restoreToActive('acct-beta', { expectedEmail: 'beta@example.com' });
  assert.equal(macBlocked.ok, false);
  assert.equal(macBlocked.mismatch, true);
  assert.equal(macOps.includes('-i'), false);

  // Windows: forwards AGY_CRED_EXPECTED_EMAIL (and clears inherited value when omitted) and surfaces mismatch JSON cleanly
  const winEnvs = [];
  const winVault = createCredentialVault({
    platform: 'win32',
    env: { AGY_CRED_EXPECTED_EMAIL: 'stale@example.com' },
    runSpawn(_cmd, _args, opts) {
      winEnvs.push(opts.env);
      if (opts.env.AGY_CRED_OP === 'inspect') {
        return { status: 0, stdout: '{"ok":true,"exists":true,"bytes":128,"hash":"AABBCCDDEEFF","email":"alpha@example.com"}\n', stderr: '' };
      }
      return {
        status: 1,
        stdout: '{"ok":false,"mismatch":true,"actualEmail":"alpha@example.com","expectedEmail":"beta@example.com","error":"credential email mismatch"}\n',
        stderr: ''
      };
    }
  });
  assert.deepEqual(winVault.inspectSaved('acct-alpha'), { exists: true, hash: 'AABBCCDDEEFF', email: 'alpha@example.com' });
  assert.equal(winEnvs[0].AGY_CRED_EXPECTED_EMAIL, '');
  const winBlocked = winVault.saveActiveTo('acct-beta', { expectedEmail: 'Beta@Example.com' });
  assert.equal(winBlocked.ok, false);
  assert.equal(winBlocked.mismatch, true);
  assert.equal(winBlocked.actualEmail, 'alpha@example.com');
  assert.equal(winBlocked.expectedEmail, 'beta@example.com');
  assert.equal(winEnvs[1].AGY_CRED_EXPECTED_EMAIL, 'beta@example.com');
});

test('Windows PowerShell WIN32_SCRIPT compiles Add-Type and extracts id_token_email across direct JSON, decoy keys, and WSL envelopes', { skip: process.platform !== 'win32' }, () => {
  let capturedScript = '';
  const probeVault = createCredentialVault({
    platform: 'linux',
    wsl: true,
    runSpawn(cmd, args, opts) {
      capturedScript = args[args.indexOf('-Command') + 1];
      return spawnSync(cmd, args, { ...opts, timeout: 20000 });
    }
  });
  const probed = probeVault.probe({ force: true });
  assert.equal(probed.supported, true, `WIN32_SCRIPT probe failed: ${probed.reason}`);
  assert.ok(capturedScript.includes('class AgyWinCred'));

  const endMatch = capturedScript.match(/^"@/m);
  assert.ok(endMatch && typeof endMatch.index === 'number');
  const addTypeBlock = capturedScript.slice(0, endMatch.index + endMatch[0].length);
  const directPayload = JSON.stringify({
    token: { access_token: 'tok-a', refresh_token: 'rt-a' },
    id_token_email: 'Alpha@Example.com'
  });
  const decoyPayload = JSON.stringify({
    note: 'id_token_email',
    other: 'decoy@example.com',
    id_token_email: 'Real@Example.com'
  });
  const wslEnvelope = JSON.stringify({
    v: 1,
    token: Buffer.from(JSON.stringify({ id_token_email: 'Beta@Example.com' }), 'utf8').toString('base64'),
    scope: null
  });
  const verifyScript = [
    addTypeBlock,
    '$cases = @($env:AGY_TEST_C1, $env:AGY_TEST_C2, $env:AGY_TEST_C3, $env:AGY_TEST_C4)',
    '$out = foreach ($c in $cases) { [AgyWinCred]::ExtractEmail([System.Text.Encoding]::UTF8.GetBytes($c)) }',
    'Write-Output ($out -join "|")'
  ].join('\n');
  const res = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-Command', verifyScript],
    {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 20000,
      env: {
        ...process.env,
        AGY_TEST_C1: directPayload,
        AGY_TEST_C2: decoyPayload,
        AGY_TEST_C3: wslEnvelope,
        AGY_TEST_C4: 'opaque-non-json-token'
      }
    }
  );
  assert.equal(res.status, 0, res.stderr || res.error?.message || 'powershell failed');
  const line = String(res.stdout || '').trim().split(/\r?\n/).filter(Boolean).at(-1) || '';
  assert.equal(line, 'alpha@example.com|real@example.com|beta@example.com|');
});

test('macOS credential vault keeps secrets out of argv across small, medium (2.6KB), and >4KB OAuth payloads and round-trips cleanly (Issue #75)', () => {
  const smallSecret = JSON.stringify({
    id_token_email: 'small@example.com',
    token: { access_token: 'S'.repeat(64) }
  });
  const mediumSecret = JSON.stringify({
    id_token_email: 'mid@example.com',
    token: { access_token: 'M'.repeat(1400), refresh_token: 'N'.repeat(1100) }
  });
  const bigSecret = JSON.stringify({
    id_token_email: 'big@example.com',
    token: { access_token: 'A'.repeat(2400), refresh_token: 'R'.repeat(2200) }
  });
  assert.ok(Buffer.byteLength(mediumSecret, 'utf8') > 2200 && Buffer.byteLength(mediumSecret, 'utf8') < 3600);
  assert.ok(Buffer.byteLength(bigSecret, 'utf8') > 4096, 'test payload must exceed 4 KB raw');

  const store = new Map();
  const calls = [];
  const vault = createCredentialVault({
    platform: 'darwin',
    runSpawn(cmd, args, opts) {
      calls.push({ cmd, args, input: opts?.input, env: opts?.env });
      if (cmd === '/usr/bin/security' && args[0] === 'find-generic-password') {
        const svc = args[args.indexOf('-s') + 1];
        const acct = args[args.indexOf('-a') + 1];
        const val = store.get(`${svc}\0${acct}`);
        if (val == null) return { status: 44, stdout: '', stderr: 'not found' };
        return { status: 0, stdout: Buffer.from(val + '\n', 'utf8') };
      }
      if (cmd === '/usr/bin/security' && args[0] === '-i') {
        const line = String(opts?.input || '');
        const hexM = line.match(/^add-generic-password -U -s ("[^"]+") -a ("[^"]+") -X ([0-9a-f]+)\n$/i);
        if (hexM) {
          store.set(`${JSON.parse(hexM[1])}\0${JSON.parse(hexM[2])}`, Buffer.from(hexM[3], 'hex').toString('utf8'));
          return { status: 0, stdout: '' };
        }
        const rawM = line.match(/^add-generic-password -U -s ("[^"]+") -a ("[^"]+") -w '([^']*)'\n$/);
        assert.ok(rawM, 'security -i input must be well-formed -X or -w command');
        store.set(`${JSON.parse(rawM[1])}\0${JSON.parse(rawM[2])}`, rawM[3]);
        return { status: 0, stdout: '' };
      }
      if (cmd === '/usr/bin/osascript' && args[0] === '-l' && args[1] === 'JavaScript') {
        const script = String(opts?.input || '');
        const svcM = script.match(/const service = \$\(([^\n]+)\);/);
        const acctM = script.match(/const account = \$\(([^\n]+)\);/);
        assert.ok(svcM && acctM, 'osascript stdin must carry service and account');
        const key = `${JSON.parse(svcM[1])}\0${JSON.parse(acctM[1])}`;
        if (script.includes('SecItemCopyMatching')) {
          const val = store.get(key);
          if (val == null) return { status: 1, stdout: '', stderr: 'copy-matching OSStatus -25300' };
          return { status: 0, stdout: Buffer.from(Buffer.from(val, 'utf8').toString('base64') + '\n', 'utf8') };
        }
        const b64M = script.match(/initWithBase64EncodedStringOptions\(\$\(([^\n]+)\), 0\)/);
        assert.ok(b64M, 'osascript write stdin must carry base64 payload');
        store.set(key, Buffer.from(JSON.parse(b64M[1]), 'base64').toString('utf8'));
        return { status: 0, stdout: '' };
      }
      return { status: 1, stdout: '', stderr: `unexpected command: ${cmd}` };
    }
  });

  // 1. Small payload uses `/usr/bin/security -i` (-X hex) via stdin, never passing secret in argv
  store.set('gemini\0antigravity', smallSecret);
  assert.equal(vault.saveActiveTo('acct-small', { expectedEmail: 'small@example.com' }).ok, true);
  const smallWrite = calls.at(-1);
  assert.equal(smallWrite.cmd, '/usr/bin/security');
  assert.deepEqual(smallWrite.args, ['-i']);
  assert.ok(String(smallWrite.input).includes(' -X '));

  // 2. Medium (~2.6 KB) printable OAuth JSON uses `/usr/bin/security -i` (-w raw) via stdin (keeps native security ACL, zero argv leak)
  store.set('gemini\0antigravity', mediumSecret);
  assert.equal(vault.saveActiveTo('acct-mid', { expectedEmail: 'mid@example.com' }).ok, true);
  const midWrite = calls.at(-1);
  assert.equal(midWrite.cmd, '/usr/bin/security');
  assert.deepEqual(midWrite.args, ['-i']);
  assert.ok(String(midWrite.input).includes(" -w '"));
  assert.equal(store.get('agy-powertools-account\0acct-mid'), mediumSecret);

  // 3. Oversized (> 4 KB) payload uses `/usr/bin/osascript -l JavaScript` via stdin, never leaking secret/hex/base64 into argv
  store.set('gemini\0antigravity', bigSecret);
  const saved = vault.saveActiveTo('acct-big', { expectedEmail: 'big@example.com' });
  assert.equal(saved.ok, true);
  assert.equal(saved.bytes, Buffer.byteLength(bigSecret, 'utf8'));
  const bigWrite = calls.at(-1);
  assert.equal(bigWrite.cmd, '/usr/bin/osascript');
  assert.deepEqual(bigWrite.args, ['-l', 'JavaScript']);
  const joinedArgs = bigWrite.args.join(' ');
  assert.equal(joinedArgs.includes('big@example.com'), false);
  assert.equal(joinedArgs.includes('AAAA'), false);
  assert.equal(joinedArgs.includes(Buffer.from(bigSecret, 'utf8').toString('hex')), false);
  assert.equal(joinedArgs.includes(Buffer.from(bigSecret, 'utf8').toString('base64')), false);

  // 4. Round-trip restore back to active slot recovers the exact > 4 KB OAuth payload via non-interactive JXA read
  store.set('gemini\0antigravity', smallSecret);
  const restored = vault.restoreToActive('acct-big', { expectedEmail: 'big@example.com' });
  assert.equal(restored.ok, true);
  assert.equal(store.get('gemini\0antigravity'), bigSecret);
});

test('large Keychain writes fail closed when the reader, ACL, partition or protected add fails', () => {
  const script = buildMacKeychainWriteScript({ service: 'test', account: 'test', dataBase64: 'YQ==' });
  const makeRef = value => ({ [Symbol.toStringTag]: 'Ref', value });
  for (const failure of ['reader', 'acl', 'partition', 'add']) {
    const writes = [];
    const bound = [];
    const dictionary = {
      setObjectForKey(v, k) {
        assert.notEqual(Object.prototype.toString.call(v), '[object Ref]', 'dict value must be cast from Ref to ObjC object');
        assert.notEqual(Object.prototype.toString.call(k), '[object Ref]', 'dict key must be cast from Ref to ObjC object');
      },
      get mutableCopy() { return this; }
    };
    const bridge = Object.assign(value => value, {
      kSecClass: makeRef('class'),
      kSecClassGenericPassword: makeRef('genp'),
      kSecAttrService: makeRef('svce'),
      kSecAttrAccount: makeRef('acct'),
      kSecValueData: makeRef('v_Data'),
      kSecAttrAccess: makeRef('accs'),
      kSecACLAuthorizationPartitionID: makeRef('ACLAuthorizationPartitionID'),
      NSData: { alloc: { initWithBase64EncodedStringOptions: () => ({ isNil: () => false }) } },
      NSMutableDictionary: { alloc: { init: dictionary } },
      NSMutableArray: {
        alloc: {
          init: {
            addObject(obj) {
              assert.notEqual(Object.prototype.toString.call(obj), '[object Ref]', 'array element must be cast from Ref to ObjC object');
            }
          }
        }
      },
      SecItemUpdate: (q, a) => {
        assert.equal(q, dictionary);
        assert.equal(a, dictionary);
        return -25300;
      },
      SecTrustedApplicationCreateFromPath(path, ref) {
        assert.equal(typeof path, 'string');
        ref[0] = makeRef(path);
        return path === '/usr/bin/security' && failure === 'reader' ? -1 : 0;
      },
      SecAccessCreate(service, list, ref) {
        assert.equal(service, 'test');
        assert.ok(list);
        ref[0] = makeRef('access');
        return failure === 'acl' ? -1 : 0;
      },
      SecAccessCopyMatchingACLList() { return null; },
      SecACLCreateWithSimpleContents(access, apps, xml, prompt, ref) {
        assert.equal(access, 'access');
        assert.equal(apps, null);
        assert.match(String(xml), /apple-tool:/);
        assert.equal(prompt, 0);
        ref[0] = makeRef('acl');
        return failure === 'partition' ? -1 : 0;
      },
      SecACLUpdateAuthorizations(acl) {
        assert.equal(acl, 'acl');
        return 0;
      },
      SecItemAdd(q) {
        assert.equal(q, dictionary);
        writes.push('add');
        return -1;
      },
      exit(code) { throw Error(`exit ${code}`); }
    });
    const ObjC = {
      import() {},
      bindFunction: (name, sig) => bound.push([name, sig]),
      castRefToObject: r => r.value,
      unwrap: o => String(o)
    };
    assert.throws(() => runInNewContext(script, { $: bridge, Ref: () => [], ObjC, console: { log() {} } }), /exit 1/);
    assert.deepEqual(writes, failure === 'add' ? ['add'] : []);
    assert.ok(bound.some(([name]) => name === 'SecItemAdd'));
    assert.ok(bound.some(([name]) => name === 'SecAccessCreate'));
    assert.ok(bound.some(([name]) => name === 'SecACLCreateWithSimpleContents'));
  }
});

if (process.platform === 'darwin') {
  test('live macOS Keychain round-trip verifies 2.6KB security -i -w and >4KB JXA Security.framework create/read/update/read', async t => {
    const service = `agy-powertools-ci-test-${process.pid}-${Date.now()}`;
    const midAccount = 'medium-payload';
    const largeAccount = 'large-payload';
    const midPayload = JSON.stringify({
      id_token_email: 'ci-mid@example.com',
      token: { access_token: 'M'.repeat(1400), refresh_token: 'N'.repeat(1100) }
    });
    const largePayload = JSON.stringify({
      id_token_email: 'ci-large@example.com',
      token: { access_token: 'A'.repeat(2400), refresh_token: 'R'.repeat(2200) }
    });
    assert.ok(Buffer.byteLength(midPayload, 'utf8') > 2200 && Buffer.byteLength(midPayload, 'utf8') < 3600);
    assert.ok(Buffer.byteLength(largePayload, 'utf8') > 4096);
    try {
      // 1. Medium (~2.6 KB) printable OAuth JSON via `/usr/bin/security -i -w '...'` -> read via `/usr/bin/security -w`
      const midCmd = `add-generic-password -U -s ${JSON.stringify(service)} -a ${JSON.stringify(midAccount)} -w '${midPayload}'\n`;
      const midWrite = spawnSync('/usr/bin/security', ['-i'], {
        input: midCmd,
        stdio: ['pipe', 'ignore', 'pipe'],
        timeout: 10000
      });
      if (midWrite.status !== 0 && /-25308|-25293|interaction not allowed/i.test(String(midWrite.stderr || ''))) {
        t.skip('macOS runner login keychain is locked in headless environment');
        return;
      }
      assert.equal(midWrite.status, 0, String(midWrite.stderr || 'security -i -w failed'));
      const midRead = spawnSync('/usr/bin/security', ['find-generic-password', '-s', service, '-a', midAccount, '-w'], {
        encoding: 'utf8',
        timeout: 10000
      });
      assert.equal(midRead.status, 0, String(midRead.stderr || 'security medium read failed'));
      assert.equal(String(midRead.stdout || '').replace(/[\r\n]+$/, ''), midPayload);

      // 2. Oversized (> 4 KB) payload via JXA Security.framework create -> read -> update -> read (non-interactive)
      for (const currentPayload of [largePayload, largePayload.replace('ci-large@example.com', 'updated@example.com')]) {
        const writeScript = buildMacKeychainWriteScript({
          service,
          account: largeAccount,
          dataBase64: Buffer.from(currentPayload, 'utf8').toString('base64')
        });
        const writeRes = spawnSync('/usr/bin/osascript', ['-l', 'JavaScript'], {
          input: writeScript,
          stdio: ['pipe', 'ignore', 'pipe'],
          timeout: 10000
        });
        if (writeRes.status !== 0 && /-25308|-25293/.test(String(writeRes.stderr || ''))) {
          t.skip('macOS runner login keychain is locked in headless environment');
          return;
        }
        assert.equal(writeRes.status, 0, String(writeRes.stderr || 'osascript write failed'));
        const readScript = buildMacKeychainReadScript({ service, account: largeAccount });
        const readRes = spawnSync('/usr/bin/osascript', ['-l', 'JavaScript'], {
          input: readScript,
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 10000
        });
        assert.equal(readRes.status, 0, String(readRes.stderr || 'osascript read failed'));
        const decoded = Buffer.from(Buffer.from(readRes.stdout || '').toString('utf8').trim(), 'base64').toString('utf8');
        assert.equal(decoded, currentPayload);
      }
    } finally {
      spawnSync('/usr/bin/security', ['delete-generic-password', '-s', service, '-a', midAccount], { stdio: 'ignore', timeout: 5000 });
      spawnSync('/usr/bin/security', ['delete-generic-password', '-s', service, '-a', largeAccount], { stdio: 'ignore', timeout: 5000 });
    }
  });
}
