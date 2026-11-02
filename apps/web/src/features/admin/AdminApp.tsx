import { Navigate, Route, Routes } from 'react-router';
import { useAdminToken } from '@/lib/adminAuth';
import { AdminLayout } from './AdminLayout';
import { AdminLoginPage } from './login/AdminLoginPage';
import { MerchantsPage } from './merchants/MerchantsPage';
import { StatementPage } from './statement/StatementPage';

// Signed out, every /admin address shows the sign-in
export function AdminApp() {
  const token = useAdminToken();
  if (!token) return <AdminLoginPage />;
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<StatementPage />} />
        <Route path="merchants" element={<MerchantsPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
