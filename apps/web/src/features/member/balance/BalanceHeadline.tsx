import NumberFlow from '@number-flow/react';
import { Trans, useTranslation } from 'react-i18next';
import { formatPoints } from '@/lib/format';

// A longer number steps down a size
function sizeFor(characters: number): string {
  if (characters <= 10) return 'text-5xl md:text-6xl';
  if (characters <= 13) return 'text-4xl md:text-5xl';
  if (characters <= 16) return 'text-3xl md:text-4xl';
  return 'text-2xl md:text-3xl';
}

// The Display line
export function BalanceHeadline({ balance }: { balance: number }) {
  const { t, i18n } = useTranslation();
  const shown = formatPoints(balance, i18n.language);

  // the label carries the whole sentence
  return (
    <h1
      aria-label={t('member.headline').replace('<n/>', shown)}
      className="text-2xl leading-tight font-medium text-balance md:text-3xl"
    >
      <Trans
        i18nKey="member.headline"
        components={{
          n: (
            <NumberFlow
              value={balance}
              locales={i18n.language}
              className={`${sizeFor(shown.length)} leading-none font-bold tracking-[-0.02em]`}
            />
          ),
        }}
      />
    </h1>
  );
}
