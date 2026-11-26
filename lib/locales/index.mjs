import fr from './fr.mjs';
import ja from './ja.mjs';
import ko from './ko.mjs';
import de from './de.mjs';
import es from './es.mjs';
import ru from './ru.mjs';

export const LANGUAGE_LABELS = Object.freeze({
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  "en": "English",
  "fr": "Français",
  "ja": "日本語",
  "ko": "한국어",
  "de": "Deutsch",
  "es": "Español",
  "ru": "Русский"
});
export const SUPPORTED_LANGUAGES = Object.freeze(Object.keys(LANGUAGE_LABELS));
const packs = { fr, ja, ko, de, es, ru };

export function matchLocale(raw) {
  const tag = String(raw || '').split(/[.@]/)[0].trim().replaceAll('_', '-').toLowerCase();
  if (/^zh(?:-|$)/.test(tag)) return /^zh-(?:hant|tw|hk|mo)(?:-|$)/.test(tag) ? 'zh-TW' : 'zh-CN';
  const language = tag.split('-')[0];
  return SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
}

export function getLocalePack(language) {
  return Object.hasOwn(packs, language) ? packs[language] : null;
}
