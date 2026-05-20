    import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './en.json';
import gu from './gu.json';
import hi from './hi.json';

i18n
  .use(LanguageDetector)      // Browser language auto-detect
  .use(initReactI18next)       // React integration
  .init({
    resources: {
      en: { translation: en },
      gu: { translation: gu },
      hi: { translation: hi },
    },
    fallbackLng: 'en',           // English as fallback
    interpolation: {
      escapeValue: false,        // React already escapes
    },
    detection: {
      // Language preference order: localStorage first, then browser
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'inventosmart_lang',
    },
  });

export default i18n;

/**
 * Supported languages list — Language Switcher ma use karo
 */
export const LANGUAGES = [
  { code: 'en', label: 'English',  nativeLabel: 'English',  flag: '🇬🇧' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી',  flag: '🇮🇳' },
  { code: 'hi', label: 'Hindi',    nativeLabel: 'हिंदी',     flag: '🇮🇳' },
];