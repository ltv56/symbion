import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/AppHeader';
import { AdminLoginForm } from './AdminLoginForm';

export function AdminLoginPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-16 md:px-6">
        <section className="rounded-lg bg-card p-7 text-card-foreground md:p-9">
          <h1 className="text-2xl font-bold tracking-tight">
            {t('admin.login.title')}
          </h1>
          <AdminLoginForm />
        </section>
      </main>
    </div>
  );
}
