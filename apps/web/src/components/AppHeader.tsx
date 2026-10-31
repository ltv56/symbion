import { Moon, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useLanguageToggle } from '@/lib/language';
import { toggleDark, useDark } from '@/lib/theme';
import { BrandLockup } from './BrandLockup';

// The header sits on the ground
const GROUND_HOVER = 'hover:bg-foreground/10 hover:text-foreground';

export function AppHeader({
  children,
  languageInMenu = false,
}: {
  children?: ReactNode;
  // on a small screen the language switch is in the menu held by `children`
  languageInMenu?: boolean;
}) {
  const { t } = useTranslation();
  const dark = useDark();
  const language = useLanguageToggle();

  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-6">
      <BrandLockup />
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          className={`${GROUND_HOVER} max-md:min-w-11 font-mono ${languageInMenu ? 'max-sm:hidden' : ''}`}
          aria-label={t('header.language')}
          onClick={language.toggle}
        >
          <span lang={language.other}>{language.other.toUpperCase()}</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={GROUND_HOVER}
          aria-label={t(dark ? 'header.themeToLight' : 'header.themeToDark')}
          onClick={toggleDark}
        >
          {dark ? <Sun /> : <Moon />}
        </Button>
        {children}
      </div>
    </header>
  );
}
