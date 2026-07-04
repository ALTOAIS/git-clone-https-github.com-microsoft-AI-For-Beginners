import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import kk from './locales/kk.json';
import ru from './locales/ru.json';

export const SUPPORTED_LANGUAGES = ['ru', 'kk', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = 'crh_language';

function detectLanguage(): SupportedLanguage {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)) {
    return stored as SupportedLanguage;
  }
  return 'ru';
}

i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    kk: { translation: kk },
    en: { translation: en },
  },
  lng: detectLanguage(),
  fallbackLng: 'ru',
  interpolation: { escapeValue: false },
});

export function setLanguage(language: SupportedLanguage) {
  localStorage.setItem(STORAGE_KEY, language);
  i18n.changeLanguage(language);
}

export default i18n;
