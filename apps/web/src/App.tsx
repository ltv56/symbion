import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/AppHeader';
import { LoginPage } from '@/features/login/LoginPage';
import { useToken } from '@/lib/auth';

export function App() {
  const { t } = useTranslation();
  const token = useToken();

  if (!token) return <LoginPage />;

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl px-4 md:px-6">
        <p>{t('app.signedIn')}</p>
      </main>
    </div>
  );
}
