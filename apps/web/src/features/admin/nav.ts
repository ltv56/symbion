import { ReceiptText, Store } from 'lucide-react';

// The sections of the console, in ruler order
export const ADMIN_NAV = [
  { to: '/admin', label: 'admin.nav.statement', icon: ReceiptText },
  { to: '/admin/merchants', label: 'admin.nav.merchants', icon: Store },
] as const;
