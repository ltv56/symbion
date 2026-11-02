import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import vi from './vi.json';

const KEY = 'lang';

function initialLanguage(): 'vi' | 'en' {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'en' || stored === 'vi') return stored;
  } catch {
    // storage can be blocked
  }
  return 'vi';
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, vi: { translation: vi } },
  lng: initialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

document.documentElement.lang = i18n.language;
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  try {
    localStorage.setItem(KEY, lng);
  } catch {
    // storage can be blocked
  }
});

export default i18n;
