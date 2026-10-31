import { Languages, LogOut, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/lib/auth';
import { useLanguageToggle } from '@/lib/language';

// Neutral, not red
const OUTLINE =
  'border-foreground/50 bg-transparent text-foreground hover:bg-foreground/10 hover:text-foreground dark:border-foreground/50 dark:bg-transparent dark:hover:bg-foreground/10';

// The far end of the header: sign-out, or a menu on small screens
export function AccountMenu() {
  const { t } = useTranslation();
  const language = useLanguageToggle();
  return (
    <>
      <Button
        variant="outline"
        className={`${OUTLINE} max-sm:hidden`}
        onClick={signOut}
      >
        <LogOut />
        {t('header.signOut')}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={`${OUTLINE} aria-expanded:bg-foreground/10 aria-expanded:text-foreground sm:hidden`}
            aria-label={t('header.menu')}
          >
            <Menu />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem onSelect={language.toggle}>
            <Languages />
            <span lang={language.other}>{language.name}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={signOut}>
            <LogOut />
            {t('header.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
