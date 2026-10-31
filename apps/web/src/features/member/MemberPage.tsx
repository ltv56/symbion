import { Trans, useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/AppHeader';
import { FormError } from '@/components/FormError';
import { Button } from '@/components/ui/button';
import { AccountMenu } from './AccountMenu';
import { BalanceHeadline } from './balance/BalanceHeadline';
import { ExpiryTimeline } from './expiry/ExpiryTimeline';
import { TierProgress } from './tier/TierProgress';
import { useMe } from './useMe';

function LoadingBlock() {
  const { t } = useTranslation();
  return (
    <div role="status" className="space-y-4 py-6 md:py-10">
      <span className="sr-only">{t('member.loading')}</span>
      <div className="h-12 w-3/4 animate-pulse rounded-lg bg-foreground/10" />
      <div className="flex items-center gap-4">
        <div className="size-24 shrink-0 animate-pulse rounded-full bg-foreground/10" />
        <div className="h-3 flex-1 animate-pulse rounded-full bg-foreground/10" />
      </div>
    </div>
  );
}

export function MemberPage() {
  const { t, i18n } = useTranslation();
  const me = useMe();

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader languageInMenu>
        <AccountMenu />
      </AppHeader>
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 md:px-6">
        {/* two columns from xl */}
        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,42rem)] xl:items-start xl:gap-12">
          <div data-surface="ground">
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
                <TierProgress me={me.data} />
              </section>
            )}
          </div>
          {me.data && (
            <div className="max-w-2xl xl:pt-10">
              <ExpiryTimeline />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
