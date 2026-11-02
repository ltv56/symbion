import { Trans, useTranslation } from 'react-i18next';
import { BalanceHeadline } from '../balance/BalanceHeadline';
import { TierProgress } from '../tier/TierProgress';
import type { Me } from '../useMe';

// Greeting and points on the left, the tier on the right
export function HeroRow({ me }: { me: Me }) {
  const { i18n } = useTranslation();
  return (
    <section
      data-surface="ground"
      className="grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-4 py-6 lg:grid-cols-2 lg:items-center lg:py-8"
    >
      {/* remount per language */}
      <div key={i18n.language}>
        <p className="mb-2 text-lg wrap-anywhere">
          <Trans
            i18nKey="member.greeting"
            values={{ name: me.name }}
            components={{ b: <strong className="font-semibold" /> }}
          />
        </p>
        <BalanceHeadline balance={me.balance} />
      </div>
      <div className="[&>div]:mt-0 [&>div]:max-w-none">
        <TierProgress me={me} />
      </div>
    </section>
  );
}
