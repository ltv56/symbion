import { LoginPage } from '@/features/login/LoginPage';
import { MemberPage } from '@/features/member/MemberPage';
import { useToken } from '@/lib/auth';

export function App() {
  const token = useToken();
  return token ? <MemberPage /> : <LoginPage />;
}
