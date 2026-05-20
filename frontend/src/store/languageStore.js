import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n, { LANGUAGES } from '../i18n/i18n';

/**
 * useLanguageStore — language preference persist karo
 * i18n sathe sync thay che
 */
const useLanguageStore = create(
  persist(
    (set, get) => ({
      language: 'en',

      /** Language change karo — i18n + store dono update */
      setLanguage: (code) => {
        i18n.changeLanguage(code);
        set({ language: code });
      },

      /** Current language object */
      currentLanguage: () => {
        const code = get().language;
        return LANGUAGES.find(l => l.code === code) || LANGUAGES[0];
      },
    }),
    {
      name: 'inventosmart_lang',
      onRehydrateStorage: () => (state) => {
        // App start thi language restore karo
        if (state?.language) {
          i18n.changeLanguage(state.language);
        }
      },
    }
  )
);

export default useLanguageStore;