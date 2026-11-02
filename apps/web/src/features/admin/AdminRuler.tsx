import { cn } from 'cn';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { ADMIN_NAV } from './nav';

const SEGMENT =
  'flex min-h-11 items-center gap-2 rounded-md px-4 text-sm font-medium whitespace-nowrap transition-colors outline-offset-2 hover:bg-accent focus-visible:bg-accent focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none';
const CURRENT = 'bg-primary text-primary-foreground hover:bg-primary';
const PERFORATION = 'border-l border-dashed border-border';

// The stick: a red bar cut into numbered sections
export function AdminRuler() {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('admin.nav.label')}
      className="mx-auto hidden w-full max-w-7xl px-4 lg:block md:px-6"
    >
      <ul className="flex items-stretch gap-1 rounded-lg bg-card p-1 text-card-foreground">
        <li className="flex items-center px-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {t('admin.nav.console')}
        </li>
        {ADMIN_NAV.map(({ to, label }, index) => (
          <li key={to} className={cn('flex pl-1', PERFORATION)}>
            <NavLink
              to={to}
              end
              className={({ isActive }) => cn(SEGMENT, isActive && CURRENT)}
            >
              <span className="font-mono text-xs">
                {String(index + 1).padStart(2, '0')}
              </span>
              {t(label)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
