import { Languages, LogOut, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/lib/auth';
import { useLanguageToggle } from '@/lib/language';
import { NAV_ITEMS } from './nav';

// Neutral, not red
const OUTLINE =
  'border-foreground/50 bg-transparent text-foreground hover:bg-foreground/10 hover:text-foreground dark:border-foreground/50 dark:bg-transparent dark:hover:bg-foreground/10';

// The far end of the header: sign-out, or a menu with the pages below lg
export function AccountMenu() {
  const { t } = useTranslation();
  const language = useLanguageToggle();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <>
      <Button
        variant="outline"
        className={`${OUTLINE} max-lg:hidden`}
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
            className={`${OUTLINE} aria-expanded:bg-foreground/10 aria-expanded:text-foreground lg:hidden`}
            aria-label={t('header.menu')}
          >
            <Menu />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <DropdownMenuItem
              key={to}
              aria-current={pathname === to ? 'page' : undefined}
              className={
                pathname === to ? 'bg-foreground/10 font-semibold' : ''
              }
              onSelect={() => void navigate(to)}
            >
              <Icon />
              {t(label)}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="sm:hidden" onSelect={language.toggle}>
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
