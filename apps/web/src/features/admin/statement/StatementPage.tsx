import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelQuery } from '@/components/PanelQuery';
import { formatVnd, signed } from '@/lib/format';
import { PageHeader, TwoHalves } from '../layout';
import { useDetailScroll } from '../useDetailScroll';
import { currentMonth } from './month';
import { MonthSwitch } from './MonthSwitch';
import { StatementDetail } from './StatementDetail';
import { sides, StickRow } from './StickRow';
import { useStatement } from './useStatement';

// The month's settlement: what each merchant and the app owe
export function StatementPage() {
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState(currentMonth);
  const [picked, setPicked] = useState<number | null>(null);
  const { detail, reveal } = useDetailScroll();
  const query = useStatement(month);
  const data = query.data;
  const selected =
    data?.merchants.find((row) => row.merchantId === picked) ??
    data?.merchants[0];

  function pick(id: number) {
    setPicked(id);
    reveal();
  }

  return (
    <div className="space-y-6 py-6">
      <PageHeader
        title={t('admin.statement.title')}
        subtitle={
          <>
            {data &&
              t('admin.statement.rate', {
                value: formatVnd(data.pointValueVnd, i18n.language),
              })}
            {month === currentMonth() && ` · ${t('admin.statement.open')}`}
          </>
        }
      >
        <MonthSwitch month={month} onChange={setMonth} />
      </PageHeader>
      <TwoHalves>
        <PanelQuery
          title={t('admin.statement.merchants')}
          query={query}
          isEmpty={(d) => d.merchants.length === 0}
          emptyText={t('admin.statement.empty')}
        >
          {(d) => {
            const scale = Math.max(
              0,
              ...d.merchants.flatMap((row) => {
                const { merchantSide, appSide } = sides(row);
                return [merchantSide, appSide];
              }),
            );
            const total = d.merchants.reduce((sum, row) => sum + row.netVnd, 0);
            return (
              <>
                <p className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-border py-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ArrowLeft aria-hidden className="size-3" />
                    {t('admin.statement.merchantSide')}
                  </span>
                  <span className="flex items-center gap-1">
                    {t('admin.statement.appSide')}
                    <ArrowRight aria-hidden className="size-3" />
                  </span>
                </p>
                <ul className="-mx-4">
                  {d.merchants.map((row) => (
                    <StickRow
                      key={row.merchantId}
                      row={row}
                      scale={scale}
                      selected={row.merchantId === selected?.merchantId}
                      onSelect={() => pick(row.merchantId)}
                    />
                  ))}
                </ul>
                <p className="flex flex-wrap items-baseline justify-between gap-x-4 border-t border-border py-3">
                  <span className="font-semibold">
                    {t('admin.statement.total')}
                  </span>
                  <span className="text-right">
                    <span className="block font-mono text-base font-semibold tabular-nums">
                      {signed(total, (n) => formatVnd(n, i18n.language))}
                    </span>
                    <span className="block text-[13px] text-muted-foreground">
                      {t(
                        total > 0
                          ? 'admin.statement.collects'
                          : total < 0
                            ? 'admin.statement.paysOut'
                            : 'admin.statement.even',
                      )}
                    </span>
                  </span>
                </p>
              </>
            );
          }}
        </PanelQuery>
        {selected && <StatementDetail ref={detail} row={selected} />}
      </TwoHalves>
    </div>
  );
}
