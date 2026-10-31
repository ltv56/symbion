import { LogOut } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { AppHeader, GROUND_HOVER } from '@/components/AppHeader';
import { FormError } from '@/components/FormError';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth';
import { BalanceHeadline } from './balance/BalanceHeadline';
import { useMe } from './useMe';

function LoadingBlock() {
  const { t } = useTranslation();
  return (
    <div role="status" className="py-6 md:py-10">
      <span className="sr-only">{t('member.loading')}</span>
      <div className="h-12 w-3/4 animate-pulse rounded-lg bg-foreground/10" />
    </div>
  );
}

export function MemberPage() {
  const { t, i18n } = useTranslation();
  const me = useMe();

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader>
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
        className="mx-auto w-full max-w-5xl px-4 pb-16 md:px-6"
      >
        {me.isPending && <LoadingBlock />}
        {me.isError && (
          <div className="space-y-4 py-6">
            <FormError>{t('member.loadError')}</FormError>
            <Button size="lg" onClick={() => void me.refetch()}>
              {t('member.retry')}
            </Button>
          </div>
        )}
        {me.data && (
          <section className="py-6 md:py-10">
            {/* remount per language */}
            <div
              key={i18n.language}
              className="motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in"
            >
              <p className="mb-2 text-lg wrap-anywhere">
                <Trans
                  i18nKey="member.greeting"
                  values={{ name: me.data.name }}
                  components={{ b: <strong className="font-semibold" /> }}
                />
              </p>
              <BalanceHeadline balance={me.data.balance} />
            </div>
            <dl className="mt-6 grid max-w-xs grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
              <dt className="font-medium">{t('member.tier')}</dt>
              <dd className="text-right">{me.data.tier.name}</dd>
            </dl>
          </section>
        )}
      </main>
    </div>
  );
}
