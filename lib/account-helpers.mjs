export function quotaGroupMeta(group = {}, index = 0) {
  const displayName = String(group.displayName || '').trim();
  const bucketIds = (Array.isArray(group.buckets) ? group.buckets : []).map(b => String(b?.bucketId || '')).join(' ');
  const combined = `${displayName} ${bucketIds}`;
  if (/argon/i.test(combined)) {
    return { key: 'argon', shortName: 'Argon', compactName: 'Argon' };
  }
  if (/claude|gpt|\b3p\b/i.test(combined)) {
    return { key: 'claude', shortName: 'Claude / GPT', compactName: 'Claude/GPT' };
  }
  if (/gemini/i.test(combined)) {
    return { key: 'gemini', shortName: 'Gemini', compactName: 'Gemini' };
  }
  const slug = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const label = displayName || `Group ${index + 1}`;
  return { key: slug || `group-${index}`, shortName: label, compactName: label };
}

export function accountBucketStatus(bucket = {}, now = Date.now(), opts = {}) {
  const isActive = Boolean(opts?.isActive);
  const syncedAtMs = Number.isFinite(opts?.syncedAtMs) ? opts.syncedAtMs : null;
  const rawFraction = typeof bucket.remainingFraction === 'number' && Number.isFinite(bucket.remainingFraction)
    ? Math.max(0, Math.min(1, bucket.remainingFraction))
    : null;
  const rawResetMs = Number.isFinite(bucket.resetTimeMs) ? bucket.resetTimeMs : null;
  const resetTimeMs = (rawFraction != null && rawFraction >= 1 && bucket.description === '') ? null : rawResetMs;
  const window = bucket.window === 'weekly' || /weekly/i.test(bucket.bucketId || '') ? 'weekly' : '5h';
  const snapshotAfterReset = syncedAtMs != null && resetTimeMs != null && syncedAtMs >= resetTimeMs;
  const isReset = Boolean(
    !isActive &&
    !snapshotAfterReset &&
    resetTimeMs != null &&
    now >= resetTimeMs &&
    rawFraction != null &&
    rawFraction < 1
  );
  const effectiveFraction = isReset ? 1 : rawFraction;
  const tone = effectiveFraction == null
    ? 'unknown'
    : effectiveFraction < 0.1
      ? 'critical'
      : effectiveFraction < 0.25
        ? 'warning'
        : 'ok';
  return {
    bucketId: bucket.bucketId || '',
    window,
    rawFraction,
    effectiveFraction,
    resetTimeMs,
    isReset,
    tone
  };
}

export function summarizeAccountQuota(account = {}, now = Date.now(), opts = {}) {
  const isActive = Boolean(opts?.isActive);
  const syncedAtMs = Number.isFinite(opts?.syncedAtMs)
    ? opts.syncedAtMs
    : (Number.isFinite(account?.syncedAtMs) ? account.syncedAtMs : null);
  const bucketOpts = { isActive, syncedAtMs };
  const seenKeys = new Set();
  const groups = (Array.isArray(account.groups) ? account.groups : []).map((g, index) => {
    const meta = quotaGroupMeta(g, index);
    let key = meta.key;
    if (seenKeys.has(key)) key = `${key}-${index}`;
    seenKeys.add(key);
    return {
      displayName: g.displayName || meta.shortName,
      shortName: meta.shortName,
      compactName: meta.compactName,
      key,
      buckets: (Array.isArray(g.buckets) ? g.buckets : [])
        .filter(b => b && b.disabled !== true)
        .map(b => accountBucketStatus(b, now, bucketOpts))
    };
  });
  const allBuckets = groups.flatMap(g => g.buckets);
  let lowestBucket = null;
  for (const b of allBuckets) {
    if (b.effectiveFraction == null) continue;
    if (!lowestBucket || b.effectiveFraction < lowestBucket.effectiveFraction ||
      (b.effectiveFraction === lowestBucket.effectiveFraction && b.window === '5h' && lowestBucket.window !== '5h')) {
      lowestBucket = b;
    }
  }
  const hasResetBucket = allBuckets.some(b => b.isReset);
  const overallTone = allBuckets.some(b => b.tone === 'critical')
    ? 'critical'
    : allBuckets.some(b => b.tone === 'warning')
      ? 'warning'
      : lowestBucket != null
        ? 'ok'
        : 'unknown';
  return { groups, lowestBucket, hasResetBucket, overallTone };
}

export function formatRelativeTime(timestampMs, now = Date.now(), language = 'zh-CN') {
  if (!Number.isFinite(timestampMs)) return '-';
  const en = language === 'en', tw = language === 'zh-TW';
  const diffSec = Math.max(0, Math.floor((now - timestampMs) / 1000));
  if (!en && !language.startsWith('zh-')) {
    const relative = new Intl.RelativeTimeFormat(language, {numeric:'auto'});
    if (diffSec < 60) return relative.format(0,'second');
    const [unit, divisor] = diffSec < 3600 ? ['minute',60] : diffSec < 86400 ? ['hour',3600] : ['day',86400];
    return relative.format(-Math.floor(diffSec/divisor),unit);
  }
  if (diffSec < 60) return en ? 'Just now' : tw ? '剛剛' : '刚刚';
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return en ? `${m}m ago` : tw ? `${m} 分鐘前` : `${m} 分钟前`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return en ? `${h}h ago` : tw ? `${h} 小時前` : `${h} 小时前`;
  }
  const d = Math.floor(diffSec / 86400);
  return en ? `${d}d ago` : `${d} 天前`;
}

export function formatResetCountdown(resetTimeMs, now = Date.now(), language = 'zh-CN') {
  if (!Number.isFinite(resetTimeMs)) return '';
  const en = language === 'en', tw = language === 'zh-TW';
  const diffMs = resetTimeMs - now;
  if (diffMs <= 0) return '';
  const totalMin = Math.max(1, Math.ceil(diffMs / 60000));
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (!en && !language.startsWith('zh-')) {
    const duration = [[days,'day'],[hours,'hour'],[mins,'minute']].filter(([value])=>value).slice(0,2)
      .map(([value,unit])=>new Intl.NumberFormat(language,{style:'unit',unit,unitDisplay:'short'}).format(value)).join(' ');
    const labels = {fr:'Réinitialisation dans',ja:'リセットまで',ko:'초기화까지',de:'Zurücksetzung in',es:'Se restablece en',ru:'Сброс через'};
    return `${labels[language]} ${duration}`;
  }
  if (days > 0) {
    if (en) return hours > 0 ? `Resets in ${days}d ${hours}h` : `Resets in ${days}d`;
    return tw
      ? (hours > 0 ? `${days} 天 ${hours} 小時後重置` : `${days} 天後重置`)
      : (hours > 0 ? `${days} 天 ${hours} 小时后重置` : `${days} 天后重置`);
  }
  if (hours > 0) {
    if (en) return mins > 0 ? `Resets in ${hours}h ${mins}m` : `Resets in ${hours}h`;
    return tw
      ? (mins > 0 ? `${hours} 小時 ${mins} 分鐘後重置` : `${hours} 小時後重置`)
      : (mins > 0 ? `${hours} 小时 ${mins} 分钟后重置` : `${hours} 小时后重置`);
  }
  return en ? `Resets in ${mins}m` : tw ? `${mins} 分鐘後重置` : `${mins} 分钟后重置`;
}

export function formatCompactCountdown(resetTimeMs, now = Date.now()) {
  if (!Number.isFinite(resetTimeMs)) return '';
  const diffMs = resetTimeMs - now;
  if (diffMs <= 0) return '';
  const totalMin = Math.max(1, Math.ceil(diffMs / 60000));
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  return `${mins}m`;
}

export function accountInitials(account = {}) {
  const source = String(account.name || account.email || account.alias || 'A').trim();
  return Array.from(source)[0]?.toUpperCase() || 'A';
}

export function normalizeModelCapability(label = '') {
  let raw = String(label || '').trim();
  if (!raw) return '';
  if (/^orchestrator\b/i.test(raw)) {
    const inner = raw.match(/\(([^)]+)\)/);
    if (inner?.[1]) raw = inner[1].trim();
  }
  return raw
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/\b(minimal|low|medium|high|xhigh|max|thinking|extra\s+high)\b/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/(claude-(?:opus|sonnet|haiku)-\d+)\.(\d+)/g, '$1-$2')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function isFreeTier(account = {}) {
  const txt = `${account?.tier?.id || ''} ${account?.tier?.name || ''}`.toLowerCase();
  return /\bfree\b|g1-free/.test(txt);
}

export function accountSupportsModel(account = {}, activeModel = '', depletedGroupKey = '') {
  const norm = normalizeModelCapability(activeModel);
  const wantGroup = depletedGroupKey || (/claude|gpt/i.test(norm) ? 'claude' : /argon/i.test(norm) ? 'argon' : '');
  const avail = Array.isArray(account?.availableModels)
    ? account.availableModels.map(normalizeModelCapability).filter(Boolean)
    : [];
  if (norm && avail.length > 0) {
    const matched = avail.some(m => m === norm || m.startsWith(`${norm}-`) || norm.startsWith(`${m}-`));
    if (!matched) return false;
  }
  const summary = summarizeAccountQuota(account);
  const groupKeys = new Set(summary.groups.map(g => g.key));
  if (wantGroup === 'claude' || /claude|gpt/i.test(norm)) {
    if (groupKeys.size > 0 && !groupKeys.has('claude')) return false;
    if (isFreeTier(account) && !groupKeys.has('claude')) return false;
  }
  if (wantGroup === 'argon' || /\bargon\b/i.test(norm)) {
    if (groupKeys.size > 0 && !groupKeys.has('argon')) return false;
    if (isFreeTier(account)) return false;
  }
  if (norm && /gemini-4-(?:neon|carbon)|claude-opus/i.test(norm) && isFreeTier(account)) {
    return false;
  }
  return true;
}

export function rankAutoSwitchCandidates(
  accounts = [],
  activeId = '',
  depletedGroupKey = '',
  now = Date.now(),
  minFraction = 0.05,
  { activeModel = '' } = {}
) {
  const eligible = [];
  for (const acct of accounts || []) {
    if (!acct || acct.id === activeId || acct.disabled || acct.hasCredential === false) continue;
    if (!accountSupportsModel(acct, activeModel, depletedGroupKey)) continue;
    const summary = summarizeAccountQuota(acct, now);
    const matching = depletedGroupKey ? summary.groups.find(g => g.key === depletedGroupKey) : null;
    const targetGroup = matching || summary.groups[0] || null;
    const allBuckets = targetGroup ? targetGroup.buckets : summary.groups.flatMap(g => g.buckets);
    const b5 = allBuckets.find(b => b.window === '5h');
    const bw = allBuckets.find(b => b.window === 'weekly');
    if (b5 && b5.effectiveFraction != null && b5.effectiveFraction <= minFraction) continue;
    if (bw && bw.effectiveFraction != null && bw.effectiveFraction <= minFraction) continue;
    const score5h = b5?.effectiveFraction ?? (bw?.effectiveFraction ?? 0.5);
    const scoreWeekly = bw?.effectiveFraction ?? 1;
    // Prefer finishing an account whose 7-day weekly timer is already ticking (with >= 15% left)
    // before prematurely activating a brand-new untouched 100% weekly account.
    const activeWeeklyReady = Boolean(
      bw &&
      bw.resetTimeMs != null &&
      bw.resetTimeMs > now &&
      !bw.isReset &&
      bw.effectiveFraction != null &&
      bw.effectiveFraction < 1 &&
      bw.effectiveFraction >= 0.15 &&
      score5h >= 0.15
    );
    eligible.push({ acct, score5h, scoreWeekly, activeWeeklyReady, lastUsed: acct.lastUsedAtMs || 0 });
  }
  eligible.sort((a, b) => {
    if (a.activeWeeklyReady !== b.activeWeeklyReady) return a.activeWeeklyReady ? -1 : 1;
    if (b.score5h !== a.score5h) return b.score5h - a.score5h;
    if (b.scoreWeekly !== a.scoreWeekly) return b.scoreWeekly - a.scoreWeekly;
    return a.lastUsed - b.lastUsed;
  });
  return eligible;
}

export function selectAutoSwitchCandidate(
  accounts = [],
  activeId = '',
  depletedGroupKey = '',
  now = Date.now(),
  minFraction = 0.05,
  options = {}
) {
  return rankAutoSwitchCandidates(accounts, activeId, depletedGroupKey, now, minFraction, options)[0]?.acct || null;
}
