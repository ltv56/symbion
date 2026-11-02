import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router';
import { AppHeader } from '@/components/AppHeader';
import { AdminAccountMenu } from './AdminAccountMenu';
import { AdminRuler } from './AdminRuler';

// Header, the ruler, and the page
export function AdminLayout() {
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);
  const first = useRef(true);

  // A new page takes focus
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    main.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader languageInMenu>
        <AdminAccountMenu />
      </AppHeader>
      <AdminRuler />
      <main
        ref={main}
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl px-4 pb-10 outline-none md:px-6"
      >
        <Outlet />
      </main>
    </div>
  );
}
