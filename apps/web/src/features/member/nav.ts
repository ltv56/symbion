import { House, UserRound } from 'lucide-react';

// The pages of a signed-in member
export const NAV_ITEMS = [
  { to: '/', label: 'nav.home', icon: House },
  { to: '/me', label: 'nav.personal', icon: UserRound },
] as const;
