import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { FormError } from '@/components/FormError';
import { RubberStamp } from '@/components/RubberStamp';
import { Button } from '@/components/ui/button';
import { TierSeal } from '@/features/member/tier/TierSeal';
import { formatDate, formatVnd } from '@/lib/format';
import { Fact } from '../Fact';
import { formatBalance } from './MemberRow';
import { useAdminMember, type AdminMember } from './useAdminMembers';

// One member on the ground: tier, balance and what the next tier needs
export function MemberDetail({
  member,
  ref,
}: {
  member: AdminMember;
  ref?: Ref<HTMLElement>;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const detail = useAdminMember(member.id);
  const label = member.name ?? member.email;
  const next = detail.data?.nextTier;

  return (
    <section
      ref={ref}
      data-surface="ground"
      aria-labelledby="member-heading"
      className="scroll-mt-4 lg:sticky lg:top-4"
    >
      <div className="flex items-start gap-4">
        <TierSeal name={member.tier.name} />
        <div className="min-w-0 flex-1">
          <h2
            id="member-heading"
            className="text-xl font-semibold wrap-anywhere"
          >
            {label}
          </h2>
          {member.name && (
            <p className="text-sm text-muted-foreground wrap-anywhere">
              {member.email}
            </p>
          )}
        </div>
        {member.balance < 0 && (
          <RubberStamp size="sm" rotate={-6} aria-hidden="true">
            {t('admin.members.negative')}
          </RubberStamp>
        )}
      </div>
      <dl className="mt-4 divide-y border-y text-sm">
        <Fact label={t('admin.members.detail.merchant')}>
          {member.merchantName}
        </Fact>
        <Fact label={t('admin.members.detail.tier')}>{member.tier.name}</Fact>
        <Fact label={t('admin.members.detail.balance')} mono>
          {t('admin.members.row.balance', {
            points: formatBalance(member.balance, locale),
          })}
        </Fact>
        {detail.data && (
          <Fact label={t('admin.members.detail.spend')} mono>
            {formatVnd(detail.data.spend12m, locale)}
          </Fact>
        )}
        {detail.data && (
          <Fact label={t('admin.members.detail.nextTier')}>
            {next
              ? t('admin.members.detail.toNext', {
                  amount: formatVnd(
                    Math.max(0, next.minSpend - detail.data.spend12m),
                    locale,
                  ),
                  tier: next.name,
                })
              : t('admin.members.detail.topTier')}
          </Fact>
        )}
        <Fact label={t('admin.members.detail.joined')}>
          {formatDate(member.createdAt, locale)}
        </Fact>
      </dl>
      {detail.isPending && (
        <div role="status" className="mt-4 space-y-3">
          <span className="sr-only">{t('member.loading')}</span>
          <div className="h-10 animate-pulse rounded-lg bg-secondary" />
        </div>
      )}
      {detail.isError && (
        <div className="mt-4 space-y-3">
          <FormError>{t('errors.generic')}</FormError>
          <Button variant="outline" onClick={() => void detail.refetch()}>
            {t('member.retry')}
          </Button>
        </div>
      )}
    </section>
  );
}
