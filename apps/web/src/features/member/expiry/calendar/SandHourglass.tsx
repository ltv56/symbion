import { cn } from 'cn';
import { Hourglass } from 'lucide-react';
import { useId } from 'react';
import './sand-hourglass.css';

// Glass: lucide's Hourglass (24 grid)
const WALL_LEFT = 7;
const WALL_RIGHT = 17;
const TOP = 2;
const BOTTOM = 22;
const NECK = 12;
// Where the straight wall turns into the funnel
const SHOULDER = 4.172;
const CENTRE = (WALL_LEFT + WALL_RIGHT) / 2;
const STREAM_FROM = 11.5;
const STREAM_LENGTH = 8;

// One bulb from its end wall in to the neck; `inward` is +1 down, -1 up
function bulb(end: number, inward: 1 | -1): string {
  const shoulder = end + inward * SHOULDER;
  return `M${WALL_LEFT} ${end}H${WALL_RIGHT}V${shoulder}L${CENTRE} ${NECK}L${WALL_LEFT} ${shoulder}Z`;
}

const UPPER_BULB = bulb(TOP, 1);
const LOWER_BULB = bulb(BOTTOM, -1);

// Lit snaps on; only the fade back is animated
export function SandHourglass({
  lit,
  className,
}: {
  lit: boolean;
  className?: string;
}) {
  const clip = useId().replace(/:/g, '');
  return (
    <Hourglass
      aria-hidden
      className={cn(
        lit
          ? 'hg text-destructive'
          : 'text-card-foreground transition-colors duration-150 motion-reduce:transition-none',
        className,
      )}
    >
      <defs>
        <clipPath id={clip}>
          <path d={UPPER_BULB} />
        </clipPath>
      </defs>
      <g
        className={
          lit
            ? 'opacity-100'
            : 'opacity-0 transition-opacity duration-150 motion-reduce:transition-none'
        }
      >
        {/* the sand sinking toward the neck */}
        <g clipPath={`url(#${clip})`}>
          <rect
            className={lit ? 'hg-top' : undefined}
            x={WALL_LEFT}
            y={TOP}
            width={WALL_RIGHT - WALL_LEFT}
            height={NECK - TOP}
            fill="currentColor"
            stroke="none"
          />
        </g>
        <path
          className={lit ? 'hg-bottom' : undefined}
          d={LOWER_BULB}
          fill="currentColor"
          stroke="none"
        />
        <path
          className={lit ? 'hg-stream' : undefined}
          d={`M${CENTRE} ${STREAM_FROM}v${STREAM_LENGTH}`}
          strokeWidth="1.5"
          strokeDasharray="1.5 2"
        />
      </g>
    </Hourglass>
  );
}
