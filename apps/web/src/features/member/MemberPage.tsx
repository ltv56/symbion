import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppHeader, GROUND_HOVER } from '@/components/AppHeader';
import { FormError } from '@/components/FormError';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth';
import { useMe } from './useMe';

export function MemberPage() {
  const { t, i18n } = useTranslation();
  const me = useMe();

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader>
        {me.data && (
          <span className="hidden max-w-48 truncate text-sm font-medium sm:inline">
            {me.data.name}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={GROUND_HOVER}
          aria-label={t('header.signOut')}
          onClick={signOut}
        >
          <LogOut />
        </Button>
      </AppHeader>
      <main
        data-surface="ground"
        className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6"
      >
        {me.isPending && <p>{t('member.loading')}</p>}
        {me.isError && (
          <div className="space-y-4">
            <FormError>{t('member.loadError')}</FormError>
            <Button size="lg" onClick={() => void me.refetch()}>
              {t('member.retry')}
            </Button>
          </div>
        )}
        {me.data && (
          <>
            <h1 className="text-2xl font-bold tracking-tight">
              {me.data.name}
            </h1>
            <dl className="mt-4 grid max-w-xs grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
              <dt className="font-medium">{t('member.tier')}</dt>
              <dd className="text-right">{me.data.tier.name}</dd>
              <dt className="font-medium">{t('member.balance')}</dt>
              <dd className="text-right font-mono">
                {new Intl.NumberFormat(i18n.language).format(me.data.balance)}
              </dd>
            </dl>
          </>
        )}
      </main>
    </div>
  );
}
