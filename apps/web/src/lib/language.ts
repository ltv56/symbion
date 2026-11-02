import { useTranslation } from 'react-i18next';

// The language a press switches to
const NAMES = { vi: 'Tiếng Việt', en: 'English' } as const;

export function useLanguageToggle() {
  const { i18n } = useTranslation();
  const other = i18n.language === 'vi' ? 'en' : 'vi';
  return {
    other,
    name: NAMES[other],
    toggle: () => void i18n.changeLanguage(other),
  };
}
