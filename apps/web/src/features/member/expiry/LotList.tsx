import { LotRow } from './LotRow';
import type { useActiveLot } from './useActiveLot';
import type { Lot } from './useLots';

// The rows of one group, linked to the calendar
export function LotList({
  lots,
  loadedAt,
  link,
  className,
}: {
  lots: Lot[];
  loadedAt: number;
  link: ReturnType<typeof useActiveLot>;
  className?: string;
}) {
  return (
    <ul className={className}>
      {lots.map((lot, i) => {
        const props = link.row(lot.id, lots[i - 1]?.id);
        return (
          <li key={lot.id} {...props.item}>
            <div {...props.press}>
              <LotRow lot={lot} loadedAt={loadedAt} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
