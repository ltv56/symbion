import { cn } from 'cn';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { NAV_ITEMS } from './nav';

const LINK =
  'group flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors outline-offset-2 hover:bg-background hover:inset-ring-1 hover:inset-ring-foreground/25 focus-visible:bg-background focus-visible:inset-ring-1 focus-visible:inset-ring-foreground/25 focus-visible:outline-2 focus-visible:outline-foreground motion-reduce:transition-none';
const CURRENT = 'bg-foreground/10 inset-ring-1 inset-ring-foreground/25';
const LABEL =
  'max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,padding,opacity] duration-150 motion-reduce:transition-none group-hover:max-w-40 group-hover:pr-1 group-hover:pl-2 group-hover:opacity-100 group-focus-visible:max-w-40 group-focus-visible:pr-1 group-focus-visible:pl-2 group-focus-visible:opacity-100 [@media(hover:none)]:max-w-40 [@media(hover:none)]:pr-1 [@media(hover:none)]:pl-2 [@media(hover:none)]:opacity-100';

// At the window's left edge from lg; the menu holds the pages below it
export function SideNav() {
  const { t } = useTranslation();
  return (
    <nav
      data-surface="ground"
      aria-label={t('nav.label')}
      className="fixed top-1/2 left-3 z-30 hidden -translate-y-1/2 flex-col items-start gap-1 lg:flex"
    >
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) => cn(LINK, isActive && CURRENT)}
        >
          <Icon aria-hidden className="size-5 shrink-0" />
          <span className={LABEL}>{t(label)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
