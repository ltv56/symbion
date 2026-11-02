import { useTranslation } from 'react-i18next';
import { kindKeys } from '@/features/member/history/HistoryRow';
import { formatSigned } from '@/features/member/history/formatSigned';
import { formatDate, formatPoints } from '@/lib/format';
import { FoldedSection } from './FoldedSection';
import type { AdminMemberDetail } from './useAdminMembers';

// Spendable points, codes and the recent ledger of one member
export function MemberSections({ member }: { member: AdminMemberDetail }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  return (
    <>
      <FoldedSection
        title={t('admin.members.lots.title')}
        items={member.lots}
        emptyText={t('admin.members.lots.empty')}
        row={(lot) => (
          <span className="flex items-baseline justify-between gap-x-4">
            <span className="min-w-0">
              <span className="block wrap-anywhere">{lot.merchantName}</span>
              <span className="block text-xs text-muted-foreground">
                {lot.expiresAt
                  ? t('admin.members.lots.until', {
                      date: formatDate(lot.expiresAt, locale),
                    })
                  : t('admin.members.lots.noExpiry')}
              </span>
            </span>
            <span className="max-w-[45%] shrink-0 text-right font-mono tabular-nums wrap-anywhere">
              {formatPoints(lot.remaining, locale)}
            </span>
          </span>
        )}
      />
      <FoldedSection
        title={t('admin.members.codes.title')}
        items={member.redemptions}
        emptyText={t('admin.members.codes.empty')}
        row={(code) => (
          <span className="flex items-baseline justify-between gap-x-4">
            <span className="min-w-0">
              <span
                className="line-clamp-2 wrap-anywhere"
                title={code.voucherTitle}
              >
                {code.voucherTitle}
              </span>
              <span className="block font-mono text-xs break-all text-muted-foreground">
                {code.code}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block">
                {t(`admin.members.codes.${code.status}`)}
              </span>
              <span className="block text-xs text-muted-foreground">
                {formatDate(code.usedAt ?? code.createdAt, locale)}
              </span>
            </span>
          </span>
        )}
      />
      <FoldedSection
        title={t('admin.members.history.title')}
        items={member.history}
        emptyText={t('admin.members.history.empty')}
        row={(entry) => (
          <span className="flex items-baseline justify-between gap-x-4">
            <span className="min-w-0">
              <span className="block wrap-anywhere">{t(kindKeys(entry))}</span>
              <span className="block text-xs text-muted-foreground wrap-anywhere">
                {entry.merchantName} · {formatDate(entry.createdAt, locale)}
              </span>
            </span>
            <span className="max-w-[45%] shrink-0 text-right font-mono tabular-nums wrap-anywhere">
              {formatSigned(entry.points, locale)}
            </span>
          </span>
        )}
      />
    </>
  );
}
