import { Coins, ReceiptText, Store, Ticket, Users } from 'lucide-react';

// The sections of the console, in ruler order
export const ADMIN_NAV = [
  { to: '/admin', label: 'admin.nav.statement', icon: ReceiptText },
  { to: '/admin/merchants', label: 'admin.nav.merchants', icon: Store },
  { to: '/admin/programme', label: 'admin.nav.programme', icon: Coins },
  { to: '/admin/vouchers', label: 'admin.nav.vouchers', icon: Ticket },
  { to: '/admin/members', label: 'admin.nav.members', icon: Users },
] as const;
