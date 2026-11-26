import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DEFAULT_PROXY_BYPASS, isValidProxyBypass, isValidProxyUrl, normalizeProxyBypass, normalizeProxyUrl } from './proxy.mjs';

import { SUPPORTED_LANGUAGES, matchLocale } from './locales/index.mjs';
export { SUPPORTED_LANGUAGES };

export const OVERVIEW_RANGE_OPTIONS = Object.freeze(['weeklyQuota', 'today', '24h', 'yesterday', 'week', 'month', '30d', 'all']);
export const PRICING_MODES = Object.freeze(['standard', 'promo']);
export const USER_BUBBLE_PRESETS = Object.freeze(['accent', 'slate', 'ocean', 'sage', 'sand', 'plum', 'custom']);
export const WORKING_BEAM_PALETTES = Object.freeze(['gemini', 'aurora', 'colorful', 'neon', 'accent', 'quota']);
export const SIDEBAR_BEAM_PALETTES = Object.freeze(['sync', 'gemini', 'aurora', 'colorful', 'neon', 'accent']);
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function detectSystemLanguage({ locale, env = process.env } = {}) {
  const candidates = [
    locale,
    env?.LC_ALL,
    env?.LC_MESSAGES,
    env?.LANG,
    (() => { try { return Intl.DateTimeFormat().resolvedOptions().locale; } catch { return ''; } })()
  ];
  for (const raw of candidates) {
    const clean = String(raw || '').trim().split('.')[0].split('@')[0].replaceAll('_', '-');
    if (!clean || /^(?:c|posix)$/i.test(clean)) continue;
    return matchLocale(clean);
  }
  return 'zh-CN';
}

export const DEFAULT_LANGUAGE = detectSystemLanguage();

export const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  sshCommandPaste: true,
  sidebarFolderDrop: true,
  sidebarFolderDropPin: false,
  customFont: '', customFontWeight: 0,
  compact: true, userBubbleTint: false, userBubblePreset: 'accent', userBubbleColor: '#2F75C3', userBubbleStrength: 20, contextRing: true, speedStats: true, timing: true, toolDetails: true, turnMeta: false,
  responseBranch: true, messageEdit: true, fileContextMenu: true, sessionSearch: true, progress: true, overviewQuota: false, titlebarQuickPanel: false, composerQuotaHalo: false, composerQuotaHaloWindow: 'auto', composerWorkingBeam: false, composerWorkingBeamPalette: 'gemini', sidebarRunningBeam: false, sidebarRunningBeamPalette: 'sync', sidebarHideNativeSpinner: true, sidebarRunningGroup: false, subagentTelemetry: true, keepTurnOutline:true, keepOverviewOpen:true, taskbarBadge:true, macAutoRelaunch:true, autoCheckUpdates:true, autoInstallUpdates:false, multiAccount:false, accountSwitcher:true, accountViewMode:'list', accountQuotaWindow:'5h', autoSwitchAccount:false, proxyEnabled:false, proxyUrl:'', proxyBypass:DEFAULT_PROXY_BYPASS, proxyForceHttp1:false, stageUpdates:true, efficientIO:false, language: DEFAULT_LANGUAGE, overviewRange: 'weeklyQuota', pricingMode: 'standard', contextLimit: 0, sidebarProjectLimit: 0
});
const validSetting = (key,value) => key === 'customFontWeight' ? [0,300,400,500,600,700].includes(value) : key === 'customFont' ? (typeof value === 'string' && value.length <= 128 && !/[;{}\\<>\u0000-\u001f\u007f-\u009f\u2028\u2029]/.test(value)) : key === 'language' ? SUPPORTED_LANGUAGES.includes(value) : key === 'overviewRange' ? OVERVIEW_RANGE_OPTIONS.includes(value) : key === 'pricingMode' ? PRICING_MODES.includes(value) : key === 'userBubblePreset' ? USER_BUBBLE_PRESETS.includes(value) : key === 'userBubbleColor' ? (typeof value === 'string' && HEX_COLOR_RE.test(value.trim())) : key === 'userBubbleStrength' ? (Number.isInteger(value) && value >= 10 && value <= 100) : key === 'accountViewMode' ? ['list','card'].includes(value) : key === 'accountQuotaWindow' ? ['5h','weekly'].includes(value) : key === 'composerQuotaHaloWindow' ? ['auto','weekly','5h'].includes(value) : key === 'composerWorkingBeamPalette' ? WORKING_BEAM_PALETTES.includes(value) : key === 'sidebarRunningBeamPalette' ? SIDEBAR_BEAM_PALETTES.includes(value) : key === 'contextLimit' ? [0,256000,500000,1000000].includes(value) : key === 'sidebarProjectLimit' ? [0,1,2,3,4,5,10,-1].includes(value) : key === 'proxyUrl' ? isValidProxyUrl(value) : key === 'proxyBypass' ? isValidProxyBypass(value) : typeof value === 'boolean';
const coerceSetting = (key, value) => key === 'customFont' ? value.trim() : key === 'proxyUrl' ? (normalizeProxyUrl(value) || '') : key === 'proxyBypass' ? (normalizeProxyBypass(value) || DEFAULT_PROXY_BYPASS) : key === 'userBubbleColor' ? value.trim().toUpperCase() : value;
export function normalizeSettings(value = {}) {
  return Object.fromEntries(Object.entries(DEFAULT_SETTINGS).map(([key, fallback]) => [key, validSetting(key,value[key]) ? coerceSetting(key,value[key]) : fallback]));
}
export function createSettingsStore(directory = join(homedir(), '.gemini', 'antigravity', 'plugin_data', 'agy-powertools')) {
  const path = join(directory, 'settings.json');
  return {
    get() {
      try { return normalizeSettings(existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {}); }
      catch { return { ...DEFAULT_SETTINGS }; }
    },
    set(patch) {
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('设置格式无效');
      for (const [key, value] of Object.entries(patch)) {
        if (!Object.hasOwn(DEFAULT_SETTINGS, key) || !validSetting(key,value)) throw new Error('设置选项无效');
      }
      const value = normalizeSettings({ ...this.get(), ...patch });
      mkdirSync(directory, { recursive: true });
      writeFileSync(`${path}.tmp`, JSON.stringify(value, null, 2) + '\n', 'utf8');
      renameSync(`${path}.tmp`, path);
      return value;
    },
    reset() {
      return this.set({ ...DEFAULT_SETTINGS });
    }
  };
}
