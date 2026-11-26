import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { createCredentialVault } from './credential-vault.mjs';
import { antigravityUserDataDir } from './paths.mjs';
import { rankAutoSwitchCandidates, selectAutoSwitchCandidate } from './account-helpers.mjs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AUTO_SWITCH_COOLDOWN_MS = 120 * 1000;
const PENDING_SWITCH_TTL_MS = 5 * 60 * 1000;
const AVATAR_DATA_RE = /^data:image\/(?:jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/;

function clone(value) {
  return structuredClone(value);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function emailMatches(actualEmail, expectedEmail) {
  const actual = normalizeEmail(actualEmail);
  const expected = normalizeEmail(expectedEmail);
  if (!actual || !expected) return true;
  return actual === expected;
}

function sanitizeAvatarUrl(url) {
  const value = String(url || '').trim();
  if (!value || value.length > 49152) return '';
  if (AVATAR_DATA_RE.test(value)) return value;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'https:') return value;
  } catch {}
  return '';
}

function sanitizeGroups(groups) {
  if (!Array.isArray(groups)) return [];
  return groups
    .filter(g => g && typeof g.displayName === 'string')
    .map(g => ({
      displayName: g.displayName,
      buckets: Array.isArray(g.buckets)
        ? g.buckets
          .filter(b => b && b.disabled !== true)
          .map(b => {
            const remainingFraction = typeof b.remainingFraction === 'number' && Number.isFinite(b.remainingFraction)
              ? Math.max(0, Math.min(1, b.remainingFraction))
              : null;
            const rawResetMs = Number.isFinite(b.resetTimeMs) ? b.resetTimeMs : null;
            const resetTimeMs = (remainingFraction != null && remainingFraction >= 1 && b.description === '') ? null : rawResetMs;
            return {
              bucketId: String(b.bucketId || ''),
              window: b.window === 'weekly' || /weekly/i.test(b.bucketId || '') ? 'weekly' : '5h',
              remainingFraction,
              resetTimeMs
            };
          })
        : []
    }));
}

function sanitizePendingSwitch(value) {
  if (!value || typeof value !== 'object') return null;
  if (typeof value.targetId !== 'string' || typeof value.targetEmail !== 'string' || !Number.isFinite(value.atMs)) return null;
  return { targetId: value.targetId, targetEmail: value.targetEmail, atMs: value.atMs };
}

export function createAccountsStore(
  directory = join(homedir(), '.gemini', 'antigravity', 'plugin_data', 'agy-powertools'),
  { now = () => Date.now(), vault = createCredentialVault(), relaunch = null, appStoragePath = join(antigravityUserDataDir(), 'app_storage.json') } = {}
) {
  const path = join(directory, 'accounts.json');

  function readOnboardingState() {
    if (!appStoragePath) return null;
    try {
      if (!existsSync(appStoragePath)) return null;
      const parsed = JSON.parse(readFileSync(appStoragePath, 'utf8'));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      const rawEmail = parsed['agy.onboarding.lastLoginUsername'] ?? parsed['jetski.onboarding.lastLoginUsername'] ?? '';
      const rawTos = parsed['agy.onboarding.lastLoginIsGcpTos'] ?? parsed['jetski.onboarding.lastLoginIsGcpTos'];
      const email = normalizeEmail(rawEmail);
      const isGcpTos = rawTos === 'true' || rawTos === true ? true : (rawTos === 'false' || rawTos === false ? false : null);
      return { email, isGcpTos };
    } catch {
      return null;
    }
  }

  function writeState(state) {
    mkdirSync(directory, { recursive: true });
    writeFileSync(`${path}.tmp`, JSON.stringify(state, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
    renameSync(`${path}.tmp`, path);
  }

  function loadState() {
    try {
      if (existsSync(path)) {
        const parsed = JSON.parse(readFileSync(path, 'utf8'));
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.accounts)) {
          const accounts = parsed.accounts
            .filter(a => a && typeof a.id === 'string' && typeof a.email === 'string')
            .filter(a => a.source !== 'preview' && !a.id.startsWith('preview-'))
            .map(a => ({
              id: a.id,
              email: a.email,
              name: typeof a.name === 'string' ? a.name : '',
              alias: typeof a.alias === 'string' ? a.alias : '',
              avatarUrl: sanitizeAvatarUrl(a.avatarUrl),
              tier: a.tier && typeof a.tier === 'object' ? { id: String(a.tier.id || ''), name: String(a.tier.name || '') } : { id: '', name: '' },
              groups: sanitizeGroups(a.groups),
              disabled: Boolean(a.disabled),
              hasCredential: a.hasCredential !== false,
              credHash: typeof a.credHash === 'string' ? a.credHash : '',
              onboardingAccepted: Boolean(a.onboardingAccepted),
              isGcpTos: typeof a.isGcpTos === 'boolean' ? a.isGcpTos : null,
              syncedAtMs: Number.isFinite(a.syncedAtMs) ? a.syncedAtMs : null,
              lastUsedAtMs: Number.isFinite(a.lastUsedAtMs) ? a.lastUsedAtMs : null
            }));
          const activeId = accounts.some(a => a.id === parsed.activeId) ? parsed.activeId : (accounts[0]?.id || '');
          return {
            version: 2,
            activeId,
            pendingAlias: typeof parsed.pendingAlias === 'string' ? parsed.pendingAlias : '',
            pendingSwitch: sanitizePendingSwitch(parsed.pendingSwitch),
            lastAutoSwitchAtMs: Number.isFinite(parsed.lastAutoSwitchAtMs) ? parsed.lastAutoSwitchAtMs : 0,
            accounts
          };
        }
      }
    } catch {}
    return {
      version: 2,
      activeId: '',
      pendingAlias: '',
      pendingSwitch: null,
      lastAutoSwitchAtMs: 0,
      accounts: []
    };
  }

  function vaultCapability() {
    if (typeof vault?.probe === 'function') return vault.probe();
    return { supported: Boolean(vault?.supported), reason: '' };
  }

  function snapshotResponse(state) {
    const cap = vaultCapability();
    return clone({
      activeId: state.activeId,
      accounts: state.accounts.map(({ credHash, ...rest }) => rest),
      vaultSupported: Boolean(cap.supported),
      ...(cap.reason ? { vaultReason: cap.reason } : {}),
      lastAutoSwitchAtMs: state.lastAutoSwitchAtMs || 0
    });
  }

  function readSavedInfo(accountId) {
    if (!vaultCapability().supported) return { exists: false, hash: '', email: '' };
    if (typeof vault.inspectSaved === 'function') {
      const info = vault.inspectSaved(accountId) || {};
      return {
        exists: Boolean(info.exists),
        hash: typeof info.hash === 'string' ? info.hash : '',
        email: normalizeEmail(info.email)
      };
    }
    return { exists: Boolean(vault.hasSaved?.(accountId)), hash: '', email: '' };
  }

  function readActiveInfo() {
    if (!vaultCapability().supported) return { exists: false, hash: '', email: '' };
    if (typeof vault.inspectActive === 'function') {
      const info = vault.inspectActive() || {};
      return {
        exists: Boolean(info.exists),
        hash: typeof info.hash === 'string' ? info.hash : '',
        email: normalizeEmail(info.email)
      };
    }
    return { exists: false, hash: '', email: '' };
  }

  function runRelaunch(triggerRelaunch, options = undefined) {
    let relaunching = false;
    let manualRestartRequired = false;
    let relaunchError = '';
    if (triggerRelaunch && typeof relaunch === 'function') {
      try {
        const launched = options ? relaunch(options) : relaunch();
        relaunching = launched?.scheduled !== false;
        if (!relaunching) {
          manualRestartRequired = true;
          relaunchError = launched?.error || launched?.reason || '';
        }
      } catch (error) {
        manualRestartRequired = true;
        relaunchError = error?.message || '自动重启失败';
      }
    }
    return { relaunching, manualRestartRequired, relaunchError };
  }

  return {
    list() {
      return snapshotResponse(loadState());
    },

    syncActive({ email, name = '', avatarUrl = '', tier = null, groups = null, availableModels = null } = {}) {
      const cleanEmail = String(email || '').trim();
      const state = loadState();
      if (!EMAIL_RE.test(cleanEmail)) return snapshotResponse(state);
      const ts = now();

      // Anti-clobber lock: if a switch was triggered and Antigravity has not yet restarted
      // into the target account, ignore syncActive events coming from the old account's UI.
      if (state.pendingSwitch) {
        const expired = ts - state.pendingSwitch.atMs >= PENDING_SWITCH_TTL_MS;
        if (cleanEmail.toLowerCase() === state.pendingSwitch.targetEmail.toLowerCase()) {
          state.pendingSwitch = null;
        } else if (!expired) {
          return snapshotResponse(state);
        } else {
          state.pendingSwitch = null;
        }
      }

      // Guard against credential/UI drift (e.g. a stale in-process TokenSource overwrote the active keyring
      // with a previous account while the UI still displays the newer account): never clobber the displayed
      // account's vault slot or quota with another account's credential and usage.
      const cap = vaultCapability();
      if (cap.supported) {
        const activeInfo = readActiveInfo();
        if (activeInfo.exists && activeInfo.email && !emailMatches(activeInfo.email, cleanEmail)) {
          return clone({
            ...snapshotResponse(state),
            credentialMismatch: {
              uiEmail: cleanEmail,
              credentialEmail: activeInfo.email
            }
          });
        }
      }

      const preSnapshot = snapshotResponse(state);
      const cleanGroups = sanitizeGroups(groups);
      const cleanModels = Array.isArray(availableModels)
        ? [...new Set(availableModels.map(m => String(m || '').trim().slice(0, 80)).filter(Boolean))].slice(0, 64)
        : null;
      let target = state.accounts.find(a => a.email.toLowerCase() === cleanEmail.toLowerCase());
      if (!target) {
        const appliedAlias = String(state.pendingAlias || '').trim().slice(0, 40);
        state.pendingAlias = '';
        target = {
          id: `acct-${randomUUID().slice(0, 8)}`,
          email: cleanEmail,
          name: String(name || '').trim() || cleanEmail.split('@')[0],
          alias: appliedAlias,
          avatarUrl: sanitizeAvatarUrl(avatarUrl),
          tier: tier ? { id: String(tier.id || ''), name: String(tier.name || '') } : { id: '', name: '' },
          groups: cleanGroups,
          ...(cleanModels && cleanModels.length ? { availableModels: cleanModels } : {}),
          disabled: false,
          hasCredential: false,
          credHash: '',
          onboardingAccepted: false,
          isGcpTos: null,
          syncedAtMs: cleanGroups.length > 0 ? ts : null,
          lastUsedAtMs: ts
        };
        state.accounts.push(target);
      } else {
        if (typeof name === 'string' && name.trim()) target.name = name.trim();
        const cleanAvatar = sanitizeAvatarUrl(avatarUrl);
        if (cleanAvatar) target.avatarUrl = cleanAvatar;
        if (tier && (tier.id || tier.name)) target.tier = { id: String(tier.id || ''), name: String(tier.name || '') };
        if (cleanModels && cleanModels.length) target.availableModels = cleanModels;
        if (cleanGroups.length > 0) {
          target.groups = cleanGroups;
          target.syncedAtMs = ts;
        }
        target.lastUsedAtMs = ts;
        if (state.pendingAlias && state.activeId !== target.id) {
          target.alias = String(state.pendingAlias).trim().slice(0, 40);
          state.pendingAlias = '';
        }
      }
      const obState = readOnboardingState();
      if (obState && obState.email && obState.email === normalizeEmail(target.email)) {
        target.onboardingAccepted = true;
        if (typeof obState.isGcpTos === 'boolean') target.isGcpTos = obState.isGcpTos;
      } else if (cleanGroups.length > 0) {
        target.onboardingAccepted = true;
      }
      state.activeId = target.id;
      if (cap.supported) {
        const saved = vault.saveActiveTo(target.id, { expectedEmail: target.email });
        if (saved?.mismatch) {
          return clone({
            ...preSnapshot,
            credentialMismatch: {
              uiEmail: cleanEmail,
              credentialEmail: normalizeEmail(saved.actualEmail)
            }
          });
        }
        if (saved?.ok) {
          target.hasCredential = true;
          const savedHash = typeof saved.hash === 'string' ? saved.hash : '';
          if (savedHash) {
            target.credHash = savedHash;
            // Detect duplicate/clobbered vault slots on other accounts so we never silently switch into the same token.
            for (const other of state.accounts) {
              if (other.id === target.id) continue;
              let otherHash = other.credHash;
              if (!otherHash && other.hasCredential) {
                const info = readSavedInfo(other.id);
                if (!info.exists || (info.email && !emailMatches(info.email, other.email))) {
                  other.hasCredential = false;
                  other.credHash = '';
                  continue;
                }
                otherHash = info.hash;
                if (otherHash) other.credHash = otherHash;
              }
              if (otherHash && otherHash === savedHash) {
                other.hasCredential = false;
                other.credHash = '';
              }
            }
          }
        }
      }
      writeState(state);
      return snapshotResponse(state);
    },

    prepareAdd({ pendingAlias = '' } = {}) {
      const state = loadState();
      const active = state.accounts.find(a => a.id === state.activeId);
      const ts = now();
      const hasPendingSwitch = Boolean(state.pendingSwitch && ts - state.pendingSwitch.atMs < PENDING_SWITCH_TTL_MS);
      state.pendingSwitch = null;
      const cap = vaultCapability();
      if (!cap.supported) {
        throw new Error(cap.reason || '当前系统不支持凭据库操作，无法添加多账号');
      }
      const prevActiveInfo = readActiveInfo();
      let prevCredHash = prevActiveInfo.hash || '';
      let backedUpId = '';
      if (active && !hasPendingSwitch) {
        const saved = vault.saveActiveTo(active.id, { expectedEmail: active.email });
        if (saved?.mismatch) {
          // Active keyring belongs to a different account than the UI displays: do not clobber active's vault slot
          // and do not block the user from re-signing in; back up the actual owner if known.
          const ownerAcct = saved.actualEmail
            ? state.accounts.find(a => normalizeEmail(a.email) === normalizeEmail(saved.actualEmail))
            : null;
          if (ownerAcct) {
            const ownerBackup = vault.saveActiveTo(ownerAcct.id, { expectedEmail: ownerAcct.email });
            if (ownerBackup?.ok) {
              ownerAcct.hasCredential = true;
              if (typeof ownerBackup.hash === 'string' && ownerBackup.hash) {
                ownerAcct.credHash = ownerBackup.hash;
                prevCredHash = ownerBackup.hash;
              }
              backedUpId = ownerAcct.id;
            }
          }
        } else if (!saved?.ok || !vault.hasSaved(active.id)) {
          const detail = typeof saved?.error === 'string' && saved.error.trim() ? `（${saved.error.trim()}）` : '';
          throw new Error(`无法保存当前账号凭证${detail}，已取消添加操作以保护当前登录`);
        } else {
          active.hasCredential = true;
          if (typeof saved.hash === 'string' && saved.hash) {
            active.credHash = saved.hash;
            prevCredHash = saved.hash;
          }
          backedUpId = active.id;
        }
      }
      state.pendingAlias = String(pendingAlias || '').trim().slice(0, 40);
      writeState(state);
      return clone({
        ok: true,
        backedUpId,
        prevCredHash,
        ...snapshotResponse(state)
      });
    },

    completeAdd({ email = '', prevEmail = '', prevCredHash = '', triggerRelaunch = true } = {}) {
      const state = loadState();
      const cleanEmail = String(email || '').trim();
      const normEmail = normalizeEmail(cleanEmail);
      const normPrevEmail = normalizeEmail(prevEmail);
      const ts = now();
      const cap = vaultCapability();
      let activeInfo = cap.supported ? readActiveInfo() : { exists: false, hash: '', email: '' };
      const uiUnchanged = Boolean(normPrevEmail && normEmail && normEmail === normPrevEmail);
      const keyringUnchanged = Boolean(prevCredHash && activeInfo.exists && activeInfo.hash && activeInfo.hash === prevCredHash);

      // Cancelled / no-op sign-in: neither UI email nor active keyring changed.
      if (uiUnchanged && keyringUnchanged) {
        if (state.pendingAlias) {
          state.pendingAlias = '';
          writeState(state);
        }
        const existing = state.accounts.find(a => normalizeEmail(a.email) === normEmail) || null;
        return clone({
          ok: true,
          relaunching: false,
          manualRestartRequired: false,
          ...(existing ? { account: existing } : {}),
          ...snapshotResponse(state)
        });
      }

      // Slow-Redux fallback: OAuth wrote a new account credential to the OS keyring before UI capabilities().email caught up.
      const keyringChanged = !prevCredHash || Boolean(activeInfo.hash && activeInfo.hash !== prevCredHash);
      const keyringAheadOfUi = Boolean(
        cap.supported && activeInfo.exists && activeInfo.email && keyringChanged
        && (!normEmail || uiUnchanged)
        && (!normPrevEmail || activeInfo.email !== normPrevEmail)
      );
      const effectiveEmail = keyringAheadOfUi ? activeInfo.email : normEmail;
      let target = effectiveEmail
        ? state.accounts.find(a => normalizeEmail(a.email) === effectiveEmail)
        : state.accounts.find(a => a.id === state.activeId);

      if (!target && effectiveEmail && EMAIL_RE.test(effectiveEmail) && cap.supported && activeInfo.exists && emailMatches(activeInfo.email, effectiveEmail)) {
        const appliedAlias = String(state.pendingAlias || '').trim().slice(0, 40);
        state.pendingAlias = '';
        const displayEmail = keyringAheadOfUi ? activeInfo.email : cleanEmail;
        target = {
          id: `acct-${randomUUID().slice(0, 8)}`,
          email: displayEmail,
          name: displayEmail.split('@')[0],
          alias: appliedAlias,
          avatarUrl: '',
          tier: { id: '', name: '' },
          groups: [],
          disabled: false,
          hasCredential: false,
          credHash: '',
          onboardingAccepted: false,
          isGcpTos: null,
          syncedAtMs: null,
          lastUsedAtMs: ts
        };
        state.accounts.push(target);
      } else if (target && keyringAheadOfUi && state.pendingAlias && state.activeId !== target.id) {
        target.alias = String(state.pendingAlias).trim().slice(0, 40);
        state.pendingAlias = '';
      }

      if (!target) {
        return clone({
          ok: true,
          relaunching: false,
          manualRestartRequired: false,
          ...snapshotResponse(state)
        });
      }

      let targetSaved = cap.supported ? readSavedInfo(target.id) : { exists: false, hash: '', email: '' };

      if (cap.supported && activeInfo.exists && activeInfo.email && !emailMatches(activeInfo.email, target.email)) {
        // Active keyring already drifted back to another account during sign-in: restore target's own backup if valid.
        if (targetSaved.exists && emailMatches(targetSaved.email, target.email)) {
          const restored = vault.restoreToActive(target.id, { expectedEmail: target.email });
          if (!restored?.ok) {
            throw new Error(restored?.error || '恢复新账号凭据失败，请重试');
          }
          activeInfo = { exists: true, hash: restored.hash || targetSaved.hash, email: normalizeEmail(target.email) };
        } else {
          throw new Error(`系统凭据仍指向 ${activeInfo.email}，未检测到 ${target.email} 的有效凭据，请先重启 Antigravity 后再重新登录该账号`);
        }
      } else if (cap.supported && activeInfo.exists && emailMatches(activeInfo.email, target.email)) {
        if (!targetSaved.exists || (activeInfo.hash && targetSaved.hash !== activeInfo.hash)) {
          const saved = vault.saveActiveTo(target.id, { expectedEmail: target.email });
          if (saved?.ok) {
            target.hasCredential = true;
            if (typeof saved.hash === 'string' && saved.hash) {
              target.credHash = saved.hash;
              for (const other of state.accounts) {
                if (other.id !== target.id && other.credHash && other.credHash === saved.hash) {
                  other.hasCredential = false;
                  other.credHash = '';
                }
              }
            }
            targetSaved = { exists: true, hash: target.credHash, email: normalizeEmail(saved.email || activeInfo.email) };
          }
        }
      }

      const currentHash = activeInfo.hash || targetSaved.hash || target.credHash || '';
      const targetEmail = normalizeEmail(target.email);
      const accountChanged = Boolean(normPrevEmail && targetEmail && normPrevEmail !== targetEmail);
      const tokenRotated = Boolean(normPrevEmail && prevCredHash && currentHash && prevCredHash !== currentHash);
      const needsRelaunch = accountChanged || tokenRotated;

      if (!needsRelaunch) {
        writeState(state);
        return clone({
          ok: true,
          relaunching: false,
          manualRestartRequired: false,
          account: target,
          ...snapshotResponse(state)
        });
      }

      // Antigravity's language_server retains prior account TokenSources after an in-place OAuth login;
      // relaunch cleanly with pendingSwitch protection so background token refreshes cannot overwrite the new account.
      target.lastUsedAtMs = ts;
      state.activeId = target.id;
      state.pendingSwitch = { targetId: target.id, targetEmail: target.email, atMs: ts };
      writeState(state);

      const shouldSyncOnboarding = Boolean(target.onboardingAccepted || target.syncedAtMs != null || (Array.isArray(target.groups) && target.groups.length > 0));
      const onboardingSync = shouldSyncOnboarding
        ? { email: target.email, isGcpTos: typeof target.isGcpTos === 'boolean' ? target.isGcpTos : null }
        : null;
      const { relaunching, manualRestartRequired, relaunchError } = runRelaunch(
        triggerRelaunch,
        onboardingSync ? { onboardingSync } : undefined
      );
      return clone({
        ok: true,
        accountChanged: true,
        relaunching,
        manualRestartRequired,
        ...(relaunchError ? { relaunchError } : {}),
        account: target,
        ...snapshotResponse(state)
      });
    },

    switchAccount(accountId, { auto = false, triggerRelaunch = true } = {}) {
      const state = loadState();
      const target = state.accounts.find(a => a.id === accountId);
      if (!target) throw new Error('账号不存在');
      if (target.id === state.activeId && !state.pendingSwitch) {
        return clone({ ok: true, unchanged: true, account: target, ...snapshotResponse(state) });
      }
      const ts = now();
      if (target.disabled) {
        throw new Error('该账号已禁用，请先启用后再切换');
      }
      if (auto) {
        if (ts - (state.lastAutoSwitchAtMs || 0) < AUTO_SWITCH_COOLDOWN_MS) {
          throw new Error('自动切换冷却中');
        }
      }
      const cap = vaultCapability();
      if (!cap.supported) throw new Error(cap.reason || '当前系统不支持凭据切换');
      const current = state.accounts.find(a => a.id === state.activeId);
      const hasLivePendingSwitch = Boolean(state.pendingSwitch && ts - state.pendingSwitch.atMs < PENDING_SWITCH_TTL_MS);
      if (current && current.id !== target.id && !hasLivePendingSwitch) {
        const backup = vault.saveActiveTo(current.id, { expectedEmail: current.email });
        if (backup?.ok) {
          current.hasCredential = true;
          if (typeof backup.hash === 'string' && backup.hash) current.credHash = backup.hash;
        } else if (backup?.mismatch && backup.actualEmail) {
          const ownerAcct = state.accounts.find(a => a.id !== target.id && normalizeEmail(a.email) === normalizeEmail(backup.actualEmail));
          if (ownerAcct) {
            const ownerBackup = vault.saveActiveTo(ownerAcct.id, { expectedEmail: ownerAcct.email });
            if (ownerBackup?.ok) {
              ownerAcct.hasCredential = true;
              if (typeof ownerBackup.hash === 'string' && ownerBackup.hash) ownerAcct.credHash = ownerBackup.hash;
            }
          }
        }
      }
      const targetInfo = readSavedInfo(target.id);
      if (!targetInfo.exists) {
        target.hasCredential = false;
        target.credHash = '';
        writeState(state);
        throw new Error('该账号尚未保存有效凭证，请点击“添加账号”重新登录该账号');
      }
      if (targetInfo.email && !emailMatches(targetInfo.email, target.email)) {
        target.hasCredential = false;
        target.credHash = '';
        writeState(state);
        throw new Error(`该账号的本地凭据属于 ${targetInfo.email}，与当前账号不一致，请点击“添加账号”重新登录该账号`);
      }
      if (current && current.id !== target.id && current.credHash && targetInfo.hash && targetInfo.hash === current.credHash) {
        target.hasCredential = false;
        target.credHash = '';
        writeState(state);
        throw new Error('该账号的本地凭据与当前账号重复，请点击“添加账号”重新登录该账号');
      }
      const restored = vault.restoreToActive(target.id, { expectedEmail: target.email });
      if (!restored?.ok) {
        if (restored?.mismatch) {
          target.hasCredential = false;
          target.credHash = '';
          writeState(state);
          throw new Error(`该账号的本地凭据属于 ${restored.actualEmail || '其他账号'}，与当前账号不一致，请点击“添加账号”重新登录该账号`);
        }
        throw new Error(restored?.error || '写入目标账号凭证失败，请重试');
      }
      target.hasCredential = true;
      if (typeof restored.hash === 'string' && restored.hash) target.credHash = restored.hash;
      target.lastUsedAtMs = ts;
      state.activeId = target.id;
      state.pendingSwitch = { targetId: target.id, targetEmail: target.email, atMs: ts };
      if (auto) state.lastAutoSwitchAtMs = ts;
      writeState(state);

      const shouldSyncOnboarding = Boolean(target.onboardingAccepted || target.syncedAtMs != null || (Array.isArray(target.groups) && target.groups.length > 0));
      const onboardingSync = shouldSyncOnboarding
        ? { email: target.email, isGcpTos: typeof target.isGcpTos === 'boolean' ? target.isGcpTos : null }
        : null;
      const { relaunching, manualRestartRequired, relaunchError } = runRelaunch(
        triggerRelaunch,
        onboardingSync ? { onboardingSync } : undefined
      );
      return clone({
        ok: true,
        relaunching,
        manualRestartRequired,
        ...(relaunchError ? { relaunchError } : {}),
        account: target,
        ...snapshotResponse(state)
      });
    },

    renameAccount(accountId, alias = '') {
      const state = loadState();
      const target = state.accounts.find(a => a.id === accountId);
      if (!target) throw new Error('账号不存在');
      target.alias = String(alias || '').trim().slice(0, 40);
      writeState(state);
      return clone({
        ok: true,
        account: target,
        ...snapshotResponse(state)
      });
    },

    setDisabled(accountId, disabled) {
      const state = loadState();
      const target = state.accounts.find(a => a.id === accountId);
      if (!target) throw new Error('账号不存在');
      target.disabled = Boolean(disabled);
      writeState(state);
      return clone({
        ok: true,
        account: target,
        ...snapshotResponse(state)
      });
    },

    reorderAccounts(orderedIds = []) {
      if (!Array.isArray(orderedIds)) throw new Error('排序参数无效');
      const state = loadState();
      const byId = new Map(state.accounts.map(a => [a.id, a]));
      const next = [];
      const seen = new Set();
      for (const id of orderedIds) {
        if (typeof id === 'string' && byId.has(id) && !seen.has(id)) {
          seen.add(id);
          next.push(byId.get(id));
        }
      }
      for (const acct of state.accounts) {
        if (!seen.has(acct.id)) next.push(acct);
      }
      state.accounts = next;
      writeState(state);
      return clone({
        ok: true,
        ...snapshotResponse(state)
      });
    },

    removeAccount(accountId) {
      const state = loadState();
      const index = state.accounts.findIndex(a => a.id === accountId);
      if (index < 0) throw new Error('账号不存在');
      if (state.accounts[index].id === state.activeId) {
        throw new Error('请先切换到其他账号后再移除');
      }
      try { vault?.removeSaved?.(accountId); } catch {}
      state.accounts.splice(index, 1);
      writeState(state);
      return clone({
        ok: true,
        ...snapshotResponse(state)
      });
    },

    refreshCredentials({ accountId = '' } = {}) {
      const state = loadState();
      const cap = vaultCapability();
      if (!cap.supported) throw new Error(cap.reason || '当前系统不支持凭据库校验');
      const ts = now();
      const hasLivePendingSwitch = Boolean(state.pendingSwitch && ts - state.pendingSwitch.atMs < PENDING_SWITCH_TTL_MS);
      const active = state.accounts.find(a => a.id === state.activeId);

      // Refresh active account's backup first when not mid-switch.
      if (active && !hasLivePendingSwitch && (!accountId || accountId === active.id)) {
        const saved = vault.saveActiveTo(active.id, { expectedEmail: active.email });
        if (saved?.ok) {
          active.hasCredential = true;
          if (typeof saved.hash === 'string' && saved.hash) active.credHash = saved.hash;
        } else {
          const info = readSavedInfo(active.id);
          const ownerOk = info.exists && emailMatches(info.email, active.email);
          active.hasCredential = ownerOk;
          active.credHash = ownerOk ? (info.hash || '') : '';
        }
      }

      const targets = accountId
        ? state.accounts.filter(a => a.id === accountId)
        : state.accounts;
      if (accountId && targets.length === 0) throw new Error('账号不存在');

      const seenHashes = new Map();
      if (active?.credHash && active.hasCredential) seenHashes.set(active.credHash, active.id);

      let valid = 0, invalid = 0;
      for (const acct of targets) {
        if (acct.id === active?.id) {
          if (acct.hasCredential) valid++; else invalid++;
          continue;
        }
        const info = readSavedInfo(acct.id);
        if (!info.exists || (info.email && !emailMatches(info.email, acct.email))) {
          acct.hasCredential = false;
          acct.credHash = '';
          invalid++;
          continue;
        }
        if (info.hash && seenHashes.has(info.hash) && seenHashes.get(info.hash) !== acct.id) {
          acct.hasCredential = false;
          acct.credHash = '';
          invalid++;
          continue;
        }
        acct.hasCredential = true;
        if (info.hash) {
          acct.credHash = info.hash;
          seenHashes.set(info.hash, acct.id);
        }
        valid++;
      }
      writeState(state);
      return clone({
        ok: true,
        checked: targets.length,
        valid,
        invalid,
        ...(accountId ? { account: targets[0] } : {}),
        ...snapshotResponse(state)
      });
    },

    refreshLocalQuotas({ accountId = '' } = {}) {
      const state = loadState();
      const ts = now();
      const targets = accountId
        ? state.accounts.filter(a => a.id === accountId)
        : state.accounts;
      if (accountId && targets.length === 0) throw new Error('账号不存在');
      let updatedBuckets = 0;
      for (const acct of targets) {
        if (acct.id === state.activeId) continue;
        for (const group of acct.groups || []) {
          for (const bucket of group.buckets || []) {
            const snapshotAfterReset = Number.isFinite(acct.syncedAtMs) && Number.isFinite(bucket.resetTimeMs) && acct.syncedAtMs >= bucket.resetTimeMs;
            if (Number.isFinite(bucket.resetTimeMs) && !snapshotAfterReset && ts >= bucket.resetTimeMs && bucket.remainingFraction != null && bucket.remainingFraction < 1) {
              bucket.remainingFraction = 1;
              updatedBuckets++;
            }
          }
        }
      }
      writeState(state);
      return clone({
        ok: true,
        updatedBuckets,
        ...snapshotResponse(state)
      });
    },

    pickAutoSwitch(depletedGroupKey = '', { activeModel = '' } = {}) {
      const state = loadState();
      const ts = now();
      const elapsed = ts - (state.lastAutoSwitchAtMs || 0);
      const cooldownRemainingMs = elapsed < AUTO_SWITCH_COOLDOWN_MS ? AUTO_SWITCH_COOLDOWN_MS - elapsed : 0;
      const ranked = rankAutoSwitchCandidates(state.accounts, state.activeId, depletedGroupKey, ts, 0.05, { activeModel });
      const candidates = ranked.map(item => item.acct);
      const candidate = candidates[0] || null;
      return clone({ candidate, candidates, cooldownRemainingMs });
    }
  };
}
