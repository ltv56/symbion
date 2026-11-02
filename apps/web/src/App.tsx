import { Navigate, Route, Routes } from 'react-router';
import { LoginPage } from '@/features/login/LoginPage';
import { Dashboard } from '@/features/member/dashboard/Dashboard';
import { MemberLayout } from '@/features/member/MemberLayout';
import { PersonalPage } from '@/features/member/PersonalPage';
import { useToken } from '@/lib/auth';

export function App() {
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
