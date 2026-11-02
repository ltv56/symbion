import { ChevronRight } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { FormError } from '@/components/FormError';
import { Button } from '@/components/ui/button';
import { PartnersDialog } from '../partners/PartnersDialog';
import { usePartners } from '../partners/usePartners';
import { FALLBACK_FOCUS_ID } from '../redeem/RedeemDialog';
import { useMe } from '../useMe';
import { AllVouchersDialog } from '../vouchers/AllVouchers';
import type { MerchantFilter } from '../vouchers/AllVouchers';
import { groupVouchers } from '../vouchers/availability';
import type { VoucherGroups } from '../vouchers/availability';
import { GroupSections } from '../vouchers/GroupSections';
import { useVouchers } from '../vouchers/useVouchers';
import type { Voucher } from '../vouchers/useVouchers';
import {
  useReturnFocus,
  useVoucherActions,
} from '../vouchers/useVoucherActions';
import { HeroRow } from './HeroRow';
import { cardsOf, MerchantBrowse } from './MerchantBrowse';

const MIN_SHOWN = 3;
const MAX_SHOWN = 8;
const PAGE_BOTTOM = 40;
// Two columns start here
const XL = 1280;
// Ticket height plus gap before two tickets are drawn
const FALLBACK_PITCH = 120;

// Tickets that fit between the list top and the window bottom
function useFitCount(ref: RefObject<HTMLElement | null>, total: number) {
  const [count, setCount] = useState(MIN_SHOWN);
  useLayoutEffect(() => {
    const measure = () => {
      const list = ref.current;
      if (!list) return;
      if (window.innerWidth < XL) {
        setCount(MIN_SHOWN);
        return;
      }
      const [first, second] = [...list.querySelectorAll('ul > li')].map(
        (item) => item.getBoundingClientRect(),
      );
      const pitch = first && second ? second.top - first.top : FALLBACK_PITCH;
      const gap = first ? Math.max(0, pitch - first.height) : 0;
      const top = list.getBoundingClientRect().top + window.scrollY;
      const room = window.innerHeight - top - PAGE_BOTTOM;
      setCount(
        Math.min(
          MAX_SHOWN,
          Math.max(MIN_SHOWN, Math.floor((room + gap) / pitch)),
        ),
      );
    };
    measure();
    void document.fonts.ready.then(measure);
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [ref, total]);
  return count;
}

function Loading({ title }: { title: string }) {
  const { t } = useTranslation();
  return (
    <>
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      <div role="status" className="space-y-3">
        <span className="sr-only">{t('member.loading')}</span>
        <div className="h-24 animate-pulse rounded-lg bg-foreground/10" />
        <div className="h-24 animate-pulse rounded-lg bg-foreground/10" />
      </div>
    </>
  );
}

function Failed({ title, retry }: { title: string; retry: () => void }) {
  const { t } = useTranslation();
  return (
    <>
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      <div data-surface="ground" className="space-y-3">
        <FormError>{t('errors.generic')}</FormError>
        <Button onClick={retry}>{t('member.retry')}</Button>
      </div>
    </>
  );
}

// Redeemable tickets, the merchants, and the dialogs they share
function Body({
  vouchers,
  balance,
  loadedAt,
}: {
  vouchers: Voucher[];
  balance: number;
  loadedAt: number;
}) {
  const { t } = useTranslation();
  const partners = usePartners();
  const listRef = useRef<HTMLDivElement>(null);
  const [allOpen, setAllOpen] = useState(false);
  const [merchant, setMerchant] = useState<MerchantFilter | null>(null);
  const [partnersOpen, setPartnersOpen] = useState(false);
  const pageFocus = useReturnFocus();
  const actions = useVoucherActions(vouchers, balance);

  const groups = groupVouchers(vouchers, balance);
  const ready = groups.ready.length > 0;
  const fit = useFitCount(listRef, groups.ready.length);
  // Nothing redeemable: the closest voucher instead
  const shown: VoucherGroups = ready
    ? { ready: groups.ready.slice(0, fit), notYet: [], soldOut: [] }
    : { ready: [], notYet: groups.notYet.slice(0, 1), soldOut: [] };
  const openAll = (next: MerchantFilter | null) => {
    pageFocus.remember();
    setMerchant(next);
    setAllOpen(true);
  };

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] xl:items-start xl:gap-10">
      <section className="max-w-2xl pb-6 xl:pb-0">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2
            id={FALLBACK_FOCUS_ID}
            tabIndex={-1}
            className="text-base font-semibold outline-none"
          >
            {t('dashboard.voucherTitle')}
          </h2>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => openAll(null)}
            data-surface="ground"
            className="-my-3 flex min-h-11 shrink-0 items-center gap-0.5 rounded-lg text-sm font-medium underline underline-offset-4 outline-offset-2 focus-visible:outline-2 focus-visible:outline-current"
          >
            {t('dashboard.seeAllVouchers', { count: vouchers.length })}
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>
        {!ready && shown.notYet.length > 0 && (
          <p
            data-surface="ground"
            className="mb-2 text-sm text-muted-foreground"
          >
            {t('dashboard.noReady')}
          </p>
        )}
        <div ref={listRef}>
          <GroupSections
            shown={shown}
            totals={groups}
            balance={balance}
            loadedAt={loadedAt}
            headings={false}
            onOpen={actions.openDetail}
            onRedeem={actions.openRedeem}
          />
        </div>
      </section>
      <div className="max-w-2xl">
        <MerchantBrowse
          cards={cardsOf(vouchers, groups)}
          partnerCount={partners.data?.length ?? 0}
          onPick={openAll}
          onSeeAll={() => setPartnersOpen(true)}
        />
      </div>
      <AllVouchersDialog
        open={allOpen}
        merchant={merchant}
        onClose={() => setAllOpen(false)}
        onCloseFocus={pageFocus.restore}
        onClearMerchant={() => setMerchant(null)}
        groups={groups}
        balance={balance}
        loadedAt={loadedAt}
        onOpen={actions.openDetail}
        onRedeem={actions.openRedeem}
      />
      <PartnersDialog
        open={partnersOpen}
        onClose={() => setPartnersOpen(false)}
      />
      {actions.dialogs}
    </div>
  );
}

// Greeting, points and tier; then redeemable vouchers beside the merchants
export function Dashboard() {
  const { t } = useTranslation();
  const me = useMe();
  const vouchers = useVouchers();

  if (me.isPending) {
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
  if (me.isError) {
    return (
      <div data-surface="ground" className="space-y-4 py-6">
        <FormError>{t('member.loadError')}</FormError>
        <Button size="lg" onClick={() => void me.refetch()}>
          {t('member.retry')}
        </Button>
      </div>
    );
  }
  return (
    <>
      <HeroRow me={me.data} />
      {vouchers.isPending && <Loading title={t('dashboard.voucherTitle')} />}
      {vouchers.isError && vouchers.data === undefined && (
        <Failed
          title={t('dashboard.voucherTitle')}
          retry={() => void vouchers.refetch()}
        />
      )}
      {vouchers.data !== undefined &&
        (vouchers.data.length === 0 ? (
          <>
            <h2 className="mb-3 text-base font-semibold">
              {t('dashboard.voucherTitle')}
            </h2>
            <p data-surface="ground" className="text-sm text-muted-foreground">
              {t('vouchers.empty')}
            </p>
          </>
        ) : (
          <Body
            vouchers={vouchers.data}
            balance={me.data.balance}
            loadedAt={vouchers.dataUpdatedAt}
          />
        ))}
    </>
  );
}
