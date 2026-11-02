import { Navigate, Route, Routes } from 'react-router';
import { AdminApp } from '@/features/admin/AdminApp';
import { LoginPage } from '@/features/login/LoginPage';
import { Dashboard } from '@/features/member/dashboard/Dashboard';
import { MemberLayout } from '@/features/member/MemberLayout';
import { PersonalPage } from '@/features/member/personal/PersonalPage';
import { useToken } from '@/lib/auth';

function MemberApp() {
  const token = useToken();
  if (!token) return <LoginPage />;
  return (
    <Routes>
      <Route element={<MemberLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="me" element={<PersonalPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="admin/*" element={<AdminApp />} />
      <Route path="*" element={<MemberApp />} />
    </Routes>
  );
}
