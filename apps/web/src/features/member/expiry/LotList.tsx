import { markKey } from './marks';
import { LotRow } from './LotRow';
import type { useActiveMark } from './useActiveMark';
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
  link: ReturnType<typeof useActiveMark>;
  className?: string;
}) {
  return (
    <ul className={className}>
      {lots.map((lot, i) => {
        const previous = lots[i - 1];
        const props = link.row(
          markKey('points', lot.id),
          previous ? markKey('points', previous.id) : undefined,
        );
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
