import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router';
import { AppHeader } from '@/components/AppHeader';
import { AccountMenu } from './AccountMenu';
import { SideNav } from './SideNav';

// Header, the page links, and the page
export function MemberLayout() {
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
        <AccountMenu />
      </AppHeader>
      <SideNav />
      <main
        ref={main}
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl px-4 pb-10 outline-none md:px-6 lg:pl-17"
      >
        <Outlet />
      </main>
    </div>
  );
}
