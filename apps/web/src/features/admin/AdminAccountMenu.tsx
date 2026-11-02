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
import { adminSignOut } from '@/lib/adminAuth';
import { useLanguageToggle } from '@/lib/language';
import { ADMIN_NAV } from './nav';
import { OUTLINE } from './styles';

// Sign-out, or a menu with the sections below lg
export function AdminAccountMenu() {
  const { t } = useTranslation();
  const language = useLanguageToggle();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <>
      <Button
        variant="outline"
        className={`${OUTLINE} max-lg:hidden`}
        onClick={adminSignOut}
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
          {ADMIN_NAV.map(({ to, label, icon: Icon }) => (
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
          <DropdownMenuItem onSelect={adminSignOut}>
            <LogOut />
            {t('header.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
