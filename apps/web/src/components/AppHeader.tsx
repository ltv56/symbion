import { Moon, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { toggleDark, useDark } from '@/lib/theme';
import { BrandMark } from './BrandMark';

// The header sits on the ground, not on a panel: the default ghost hover tint is a panel colour
export const GROUND_HOVER = 'hover:bg-foreground/10 hover:text-foreground';

export function AppHeader({ children }: { children?: ReactNode }) {
  const { t, i18n } = useTranslation();
  const dark = useDark();
  const other = i18n.language === 'vi' ? 'en' : 'vi';

  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 md:px-6">
      <div className="flex items-center gap-2">
        <BrandMark className="size-7" />
        <span className="text-lg font-bold tracking-tight">Symbion</span>
      </div>
      <div className="flex items-center gap-1">
        {children}
        <Button
          variant="ghost"
          className={`${GROUND_HOVER} max-md:min-w-11 font-mono`}
          aria-label={t('header.language')}
          onClick={() => void i18n.changeLanguage(other)}
        >
          <span lang={other}>{other.toUpperCase()}</span>
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
      </div>
    </header>
  );
}
