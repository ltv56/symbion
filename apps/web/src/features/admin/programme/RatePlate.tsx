import { Pencil } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { formatVnd } from '@/lib/format';
import { useDialog } from '../useDialog';
import { PointValueDialog } from './PointValueDialog';
import { useSettings } from './useProgramme';

// The one big number of the screen: what a point is worth
export function RatePlate() {
  const { t, i18n } = useTranslation();
  const settings = useSettings();
  const dialog = useDialog();
  const button = useRef<HTMLButtonElement>(null);
  const value = settings.data?.pointValueVnd;

  return (
    <section
      aria-labelledby="rate-heading"
      className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 rounded-lg bg-card px-4 py-5 text-card-foreground md:px-6"
    >
      <div className="min-w-0">
        <h2 id="rate-heading" className="text-base font-semibold">
          {t('admin.programme.rate.title')}
        </h2>
        <p className="mt-1 text-5xl leading-none font-bold tracking-tight tabular-nums md:text-6xl">
          {value === undefined ? (
            <span className="sr-only">{t('member.loading')}</span>
          ) : (
            formatVnd(value, i18n.language)
          )}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('admin.programme.rate.text')}
        </p>
      </div>
      <Button ref={button} disabled={value === undefined} onClick={dialog.show}>
        <Pencil />
        {t('admin.programme.rate.change')}
      </Button>
      {value !== undefined && (
        <PointValueDialog
          key={dialog.session}
          current={value}
          open={dialog.open}
          onClose={dialog.close}
          onCloseFocus={() => button.current?.focus()}
        />
      )}
    </section>
  );
}
