import { useTranslation } from 'react-i18next';
import { RubberStamp } from '@/components/RubberStamp';
import { formatPoints } from '@/lib/format';
import { RecordRow } from '../RecordRow';
import type { AdminMember } from './useAdminMembers';

export function formatBalance(balance: number, locale: string): string {
  return balance < 0
    ? `−${formatPoints(-balance, locale)}`
    : formatPoints(balance, locale);
}

export function MemberRow({
  member,
  selected,
  onSelect,
}: {
  member: AdminMember;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t, i18n } = useTranslation();
  const label = member.name ?? member.email;
  return (
    <RecordRow selected={selected} onSelect={onSelect}>
      <span className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <span className="min-w-0 flex-1 basis-32">
          <span
            className="line-clamp-2 font-medium wrap-anywhere"
            title={label}
          >
            {label}
          </span>
          {member.name && (
            <span
              className="line-clamp-1 text-[13px] text-muted-foreground wrap-anywhere"
              title={member.email}
            >
              {member.email}
            </span>
          )}
          <span
            className="line-clamp-1 text-[13px] text-muted-foreground wrap-anywhere"
            title={member.merchantName}
          >
            {t('admin.members.row.where', {
              merchant: member.merchantName,
              tier: member.tier.name,
            })}
          </span>
        </span>
        <span className="flex max-w-full shrink-0 flex-col items-end gap-2">
          <span className="font-mono text-base font-medium tabular-nums wrap-anywhere max-sm:text-sm">
            {t('admin.members.row.balance', {
              points: formatBalance(member.balance, i18n.language),
            })}
          </span>
          {member.balance < 0 && (
            <RubberStamp size="sm" rotate={-4} animate={false}>
              {t('admin.members.negative')}
            </RubberStamp>
          )}
        </span>
      </span>
    </RecordRow>
  );
}
