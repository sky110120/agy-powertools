import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkForUpdates, compareVersions, createUpdateCheckStore, githubRepository, isSameMajorVersion } from '../lib/updates.mjs';

test('release comparison uses version numbers and stable/prerelease ordering',()=>{
  assert.equal(compareVersions('v2.11.0','2.9.9'),1);assert.equal(compareVersions('2.11.0','2.11.0'),0);
  assert.equal(compareVersions('2.10.0','2.11.0'),-1);assert.equal(compareVersions('2.11.0','2.11.0-rc.1'),1);
  assert.equal(compareVersions('2.11.0-rc.10','2.11.0-rc.2'),1);assert.equal(compareVersions('garbage','2.11.0'),null);
});

test('unconfigured or invalid repositories make no network request',async()=>{
  const fetcher=()=>{throw Error('Unexpected request');};
  assert.equal((await checkForUpdates({currentVersion:'2.11.0',project:{githubUrl:''},fetcher})).status,'unconfigured');
  for(const githubUrl of ['https://example.com/owner/repo','http://github.com/owner/repo','https://token@github.com/owner/repo']){
    assert.equal((await checkForUpdates({currentVersion:'2.11.0',project:{githubUrl},fetcher})).status,'invalid-config');
  }
  assert.deepEqual(githubRepository('https://github.com/owner/repo.git'),{owner:'owner',repo:'repo'});
});

test('update check queries only published releases and reports unavailable versions and failures honestly',async()=>{
  const options={currentVersion:'2.11.0',project:{githubUrl:'https://github.com/owner/repo'}};
  const fetcher=async(url,config)=>{assert.equal(url,'https://api.github.com/repos/owner/repo/releases/latest');assert.ok(config.signal);return new Response(JSON.stringify({tag_name:'v2.12.0',body:'Release notes',html_url:'https://untrusted.example/download'}));};
  const result=await checkForUpdates({...options,fetcher});assert.equal(result.status,'available');assert.equal(result.version,'2.12.0');assert.equal(result.notes,'Release notes');assert.equal(result.releaseUrl,'https://github.com/owner/repo/releases/tag/v2.12.0');
  for(const [code,status] of [[404,'no-release'],[429,'rate-limited'],[403,'rate-limited']])assert.equal((await checkForUpdates({...options,fetcher:async()=>new Response('',{status:code})})).status,status);
  assert.equal((await checkForUpdates({...options,fetcher:async()=>new Response(JSON.stringify({tag_name:'v2.11.0'}))})).status,'current');
  assert.equal((await checkForUpdates({...options,fetcher:async()=>new Response(JSON.stringify({tag_name:'v2.12.0',prerelease:true}))})).status,'unsupported-release');
  await assert.rejects(()=>checkForUpdates({...options,fetcher:async()=>{throw Error('offline');}}),/offline/);
  await assert.rejects(()=>checkForUpdates({...options,fetcher:async()=>new Response('{bad json')}));
});

test('createUpdateCheckStore throttles checks by TTL, triggers immediately on Antigravity client version upgrade, and persists dismissed versions (Issue #45)', async () => {
  assert.equal(isSameMajorVersion('2.16.2', '2.17.0'), true);
  assert.equal(isSameMajorVersion('2.16.2', '3.0.0'), false);

  const dir = mkdtempSync(join(tmpdir(), 'agy-update-store-'));
  try {
    let clock = 1_795_000_000_000;
    let fetches = 0;
    let remoteVersion = '2.17.0';
    const store = createUpdateCheckStore(dir, {
      now: () => clock,
      ttlMs: 12 * 3600_000,
      check: async ({ currentVersion }) => {
        fetches++;
        return {
          status: compareVersions(remoteVersion, currentVersion) > 0 ? 'available' : 'current',
          currentVersion,
          version: remoteVersion,
          releaseUrl: `https://github.com/WhiteBr1ck/agy-powertools/releases/tag/v${remoteVersion}`,
          notes: '## 中文说明\n- 新增自动检查更新',
          canInstall: true
        };
      }
    });

    // 1. Cold check hits network once and persists latest
    const first = await store.autoCheck({ currentVersion: '2.16.2', clientVersion: '2.35.1', autoEnabled: true });
    assert.equal(fetches, 1);
    assert.equal(first.status, 'available');
    assert.equal(first.version, '2.17.0');
    assert.equal(first.cached, false);

    // 2. Within 12h TTL and same client version -> serves cached state without network call
    clock += 3 * 3600_000;
    const second = await store.autoCheck({ currentVersion: '2.16.2', clientVersion: '2.35.1', autoEnabled: true });
    assert.equal(fetches, 1);
    assert.equal(second.cached, true);
    assert.equal(second.version, '2.17.0');

    // 3. Antigravity client upgrades (2.35.1 -> 2.36.0) -> bypasses 12h TTL immediately
    clock += 60_000;
    remoteVersion = '2.17.1';
    const upgraded = await store.autoCheck({ currentVersion: '2.16.2', clientVersion: '2.36.0', autoEnabled: true });
    assert.equal(fetches, 2);
    assert.equal(upgraded.clientUpgraded, true);
    assert.equal(upgraded.version, '2.17.1');

    // 4. Dismiss persists across reloads and clears automatically once plugin catches up
    const dismissed = store.dismiss('2.17.1', '2.16.2');
    assert.equal(dismissed.dismissedVersion, '2.17.1');
    const reloaded = createUpdateCheckStore(dir, { now: () => clock });
    assert.equal(reloaded.snapshot('2.16.2').dismissedVersion, '2.17.1');
    const caughtUp = reloaded.snapshot('2.17.1');
    assert.equal(caughtUp.status, 'current');
    assert.equal(caughtUp.dismissedVersion, '');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
