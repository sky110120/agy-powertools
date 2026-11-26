import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createProxyFetcher } from './proxy.mjs';

export function projectInfo(){
  let config={};try{config=JSON.parse(readFileSync(new URL('../project.json',import.meta.url),'utf8'))||{};}catch{}
  return {name:typeof config.name==='string'&&config.name.trim()?config.name.trim().slice(0,80):'Agy Powertools',
    githubUrl:typeof config.githubUrl==='string'?config.githubUrl:'',subscriptionUrl:typeof config.subscriptionUrl==='string'?config.subscriptionUrl:''};
}

export function githubRepository(url){
  try{const value=new URL(url),match=value.pathname.match(/^\/([\w.-]+)\/([\w.-]+?)\/?$/),repo=match?.[2].replace(/\.git$/,'');if(value.protocol==='https:'&&value.hostname==='github.com'&&!value.port&&!value.username&&!value.password&&!value.search&&!value.hash&&match&&repo)return {owner:match[1],repo};}catch{}
  return null;
}

export function compareVersions(a,b){
  const parse=value=>String(value).trim().match(/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/);
  const x=parse(a),y=parse(b);if(!x||!y)return null;
  for(let i=1;i<=3;i++){const left=BigInt(x[i]),right=BigInt(y[i]);if(left!==right)return left>right?1:-1;}
  if(!x[4]&&!y[4])return 0;if(!x[4])return 1;if(!y[4])return -1;
  const left=x[4].split('.'),right=y[4].split('.');
  for(let i=0;i<Math.max(left.length,right.length);i++){
    if(left[i]===undefined)return -1;if(right[i]===undefined)return 1;if(left[i]===right[i])continue;
    const ln=/^\d+$/.test(left[i]),rn=/^\d+$/.test(right[i]);
    if(ln&&rn)return BigInt(left[i])>BigInt(right[i])?1:-1;
    if(ln!==rn)return ln?-1:1;return left[i]>right[i]?1:-1;
  }
  return 0;
}

export async function checkForUpdates({currentVersion,project=projectInfo(),home,fetcher}={}){
  const repo=githubRepository(project.githubUrl);
  if(!project.githubUrl)return {status:'unconfigured',currentVersion};
  if(!repo)return {status:'invalid-config',currentVersion};
  const doFetch=fetcher||createProxyFetcher({home});
  const response=await doFetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}/releases/latest`,{
    headers:{Accept:'application/vnd.github+json','User-Agent':'agy-powertools/'+currentVersion},signal:AbortSignal.timeout(15000),timeoutMs:15000,redirect:'error'
  });
  if(response.status===404)return {status:'no-release',currentVersion};
  if(response.status===403||response.status===429)return {status:'rate-limited',currentVersion};
  if(!response.ok)throw new Error('更新服务暂时不可用');
  const content=await response.text();if(content.length>1024*1024)throw new Error('更新信息过大');
  const release=JSON.parse(content),comparison=compareVersions(release.tag_name,currentVersion);
  if(release.draft||release.prerelease||comparison===null)return {status:'unsupported-release',currentVersion};
  const version=release.tag_name.replace(/^v/,'');
  const packageName=`agy-powertools-v${version}.bundle.gz`,assets=Array.isArray(release.assets)?release.assets:[];
  const asset=assets.find(item=>item.name===packageName&&item.state==='uploaded'),checksum=assets.find(item=>item.name===packageName+'.sha256'&&item.state==='uploaded');
  const base=`https://github.com/${repo.owner}/${repo.repo}/releases/download/${encodeURIComponent(release.tag_name)}/`;
  const digest=asset?.digest?.match?.(/^sha256:([a-f0-9]{64})$/i)?.[1]?.toLowerCase();
  return {status:comparison>0?'available':'current',currentVersion,version,
    releaseUrl:`https://github.com/${repo.owner}/${repo.repo}/releases/tag/${encodeURIComponent(release.tag_name)}`,
    notes:typeof release.body==='string'?release.body.slice(0,12000):'',canInstall:!!asset&&!!(digest||checksum),
    asset:asset?{name:packageName,url:base+encodeURIComponent(packageName),sha256:digest,checksumUrl:checksum?base+encodeURIComponent(checksum.name):undefined}:undefined};
}

export function isSameMajorVersion(current, next) {
  const parseMajor = v => String(v || '').trim().match(/^v?(0|[1-9]\d*)\.\d+\.\d+/)?.[1] ?? null;
  const a = parseMajor(current), b = parseMajor(next);
  return a !== null && b !== null && a === b;
}

const DEFAULT_UPDATE_CHECK_TTL_MS = 12 * 60 * 60 * 1000;

export function createUpdateCheckStore(
  directory,
  { now = () => Date.now(), check = checkForUpdates, ttlMs = DEFAULT_UPDATE_CHECK_TTL_MS } = {}
) {
  const filePath = join(directory, 'update-check.json');
  function load() {
    try {
      if (!existsSync(filePath)) return { checkedAtMs: 0, lastClientVersion: '', dismissedVersion: '', latest: null };
      const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
      return {
        checkedAtMs: Number.isFinite(parsed?.checkedAtMs) ? parsed.checkedAtMs : 0,
        lastClientVersion: typeof parsed?.lastClientVersion === 'string' ? parsed.lastClientVersion : '',
        dismissedVersion: typeof parsed?.dismissedVersion === 'string' ? parsed.dismissedVersion : '',
        latest: parsed?.latest && typeof parsed.latest === 'object' ? parsed.latest : null
      };
    } catch {
      return { checkedAtMs: 0, lastClientVersion: '', dismissedVersion: '', latest: null };
    }
  }
  function save(state) {
    try {
      mkdirSync(directory, { recursive: true });
      writeFileSync(`${filePath}.tmp`, JSON.stringify(state, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
      renameSync(`${filePath}.tmp`, filePath);
    } catch {}
  }
  function formatReply(state, currentVersion, { cached = true, clientUpgraded = false } = {}) {
    let latest = state.latest;
    if (latest?.version && currentVersion && compareVersions(currentVersion, latest.version) >= 0) {
      latest = { ...latest, status: 'current' };
    }
    const status = latest?.status === 'available' ? 'available' : (latest?.status === 'current' ? 'current' : 'idle');
    const dismissedVersion = state.dismissedVersion && currentVersion && compareVersions(currentVersion, state.dismissedVersion) >= 0
      ? ''
      : state.dismissedVersion;
    return {
      status,
      currentVersion,
      version: latest?.version || '',
      releaseUrl: latest?.releaseUrl || '',
      notes: latest?.notes || '',
      canInstall: Boolean(latest?.canInstall && status === 'available'),
      dismissedVersion,
      checkedAtMs: state.checkedAtMs || 0,
      lastClientVersion: state.lastClientVersion || '',
      clientUpgraded,
      cached
    };
  }
  function compactLatest(result) {
    if (!result || !['available', 'current'].includes(result.status)) return null;
    return {
      status: result.status,
      version: typeof result.version === 'string' ? result.version : '',
      releaseUrl: typeof result.releaseUrl === 'string' ? result.releaseUrl : '',
      notes: typeof result.notes === 'string' ? result.notes.slice(0, 12000) : '',
      canInstall: Boolean(result.canInstall)
    };
  }
  return {
    snapshot(currentVersion) {
      return formatReply(load(), currentVersion, { cached: true, clientUpgraded: false });
    },
    recordResult(result, { currentVersion, clientVersion = '' } = {}) {
      const state = load();
      const nextLatest = compactLatest(result);
      if (nextLatest) {
        state.checkedAtMs = now();
        state.latest = nextLatest;
      }
      if (clientVersion) state.lastClientVersion = String(clientVersion).trim().slice(0, 40);
      if (state.dismissedVersion && currentVersion && compareVersions(currentVersion, state.dismissedVersion) >= 0) {
        state.dismissedVersion = '';
      }
      save(state);
      return formatReply(state, currentVersion, { cached: false, clientUpgraded: false });
    },
    dismiss(version, currentVersion = '') {
      const state = load();
      const clean = String(version || '').trim().replace(/^v/i, '');
      state.dismissedVersion = /^\d+\.\d+\.\d+/.test(clean) ? clean : '';
      save(state);
      return formatReply(state, currentVersion, { cached: true, clientUpgraded: false });
    },
    async autoCheck({ currentVersion, clientVersion = '', force = false, autoEnabled = true } = {}) {
      const state = load();
      const cleanClient = String(clientVersion || '').trim().slice(0, 40);
      const clientUpgraded = Boolean(cleanClient && state.lastClientVersion && cleanClient !== state.lastClientVersion);
      if (state.latest?.version && currentVersion && compareVersions(currentVersion, state.latest.version) >= 0) {
        state.latest = { ...state.latest, status: 'current' };
      }
      if (state.dismissedVersion && currentVersion && compareVersions(currentVersion, state.dismissedVersion) >= 0) {
        state.dismissedVersion = '';
      }
      const ts = now();
      const elapsed = state.checkedAtMs ? (ts - state.checkedAtMs) : Infinity;
      const shouldFetch = Boolean(force || (autoEnabled && (!state.checkedAtMs || elapsed >= ttlMs || clientUpgraded)));
      if (!shouldFetch) {
        if (cleanClient && state.lastClientVersion !== cleanClient) {
          state.lastClientVersion = cleanClient;
          save(state);
        }
        return formatReply(state, currentVersion, { cached: true, clientUpgraded });
      }
      try {
        const result = await check({ currentVersion });
        const nextLatest = compactLatest(result);
        if (nextLatest) {
          state.checkedAtMs = ts;
          state.latest = nextLatest;
          if (cleanClient) state.lastClientVersion = cleanClient;
          save(state);
          return formatReply(state, currentVersion, { cached: false, clientUpgraded });
        }
        // Rate-limited or transient status: back off slightly without wiping a previously known available update.
        if (result?.status === 'rate-limited') {
          state.checkedAtMs = ts - Math.max(0, ttlMs - 3600_000);
          if (cleanClient) state.lastClientVersion = cleanClient;
          save(state);
        }
        return { ...formatReply(state, currentVersion, { cached: false, clientUpgraded }), checkStatus: result?.status || 'error' };
      } catch {
        if (cleanClient && state.lastClientVersion !== cleanClient) {
          state.lastClientVersion = cleanClient;
          save(state);
        }
        return { ...formatReply(state, currentVersion, { cached: true, clientUpgraded }), checkStatus: 'error' };
      }
    }
  };
}
