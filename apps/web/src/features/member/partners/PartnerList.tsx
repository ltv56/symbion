import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormError } from '@/components/FormError';
import { MerchantAvatar } from '@/components/MerchantAvatar';
import { ShowMore } from '@/components/ShowMore';
import { Button } from '@/components/ui/button';
import { usePartners } from './usePartners';
import type { Partner } from './usePartners';

// Merchants shown before "show all"
const SHOWN = 8;

function Names({ partners }: { partners: Partner[] }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? partners : partners.slice(0, SHOWN);

  return (
    <>
      <ul className="gap-x-6 @md:columns-2">
        {shown.map((partner) => (
          <li
            key={partner.id}
            className="mb-2 flex min-w-0 items-center gap-3 break-inside-avoid"
          >
            <MerchantAvatar id={partner.id} name={partner.name} />
            <span
              title={partner.name}
              className="line-clamp-2 min-w-0 wrap-anywhere"
            >
              {partner.name}
            </span>
          </li>
        ))}
      </ul>
      {partners.length > SHOWN && (
        <ShowMore
          expanded={expanded}
          onToggle={() => setExpanded((value) => !value)}
          moreLabel={t('partners.showAll', { n: partners.length })}
          lessLabel={t('partners.showLess')}
        />
      )}
    </>
  );
}

export function PartnerList() {
  const { t } = useTranslation();
  const partners = usePartners();

  return (
    <section className="@container">
      <h2 className="text-base font-semibold">{t('partners.title')}</h2>
      {partners.data !== undefined && partners.data.length > 0 && (
        <p
          data-surface="ground"
          className="mt-1 mb-3 text-sm text-muted-foreground"
        >
          {t('partners.intro', { count: partners.data.length })}
        </p>
      )}
      {partners.isPending && (
        <div role="status" className="mt-3 space-y-2">
          <span className="sr-only">{t('member.loading')}</span>
          <div className="h-10 animate-pulse rounded-lg bg-foreground/10" />
          <div className="h-10 animate-pulse rounded-lg bg-foreground/10" />
        </div>
      )}
      {partners.isError && partners.data === undefined && (
        <div data-surface="ground" className="mt-3 space-y-3">
          <FormError>{t('errors.generic')}</FormError>
          <Button onClick={() => void partners.refetch()}>
            {t('member.retry')}
          </Button>
        </div>
      )}
      {partners.data !== undefined &&
        (partners.data.length === 0 ? (
          <p
            data-surface="ground"
            className="mt-1 text-sm text-muted-foreground"
          >
            {t('partners.empty')}
          </p>
        ) : (
          <Names partners={partners.data} />
        ))}
    </section>
  );
}
