import { Scissors } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  beamShape,
  clamp,
  crescentPath,
  MAX_DEPTH,
  paperFor,
} from './dividerShape';

const SIZE = 18;
// The cut line sits this far from the top of the divider
const LINE = 14;
// Room under the paper for its shadow
const SHADOW_ROOM = 24;
// Shade under the cut edge, 9 samples from the corner to the scissors
const SHADE = Array.from({ length: 9 }, (_, i) => {
  const t = i / 8;
  return 0.4 + 0.6 * (1 - (1 - t) ** 1.7);
});

// The box width and its distance from the screen edge
function useBox() {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 360, left: 16 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setBox({
          width: Math.round(entry.contentRect.width),
          left: Math.round(entry.target.getBoundingClientRect().left),
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, box] as const;
}

const lit = (percent: number) =>
  `color-mix(in srgb, var(--card-foreground) ${percent}%, #140605)`;

// A strip of paper cut in from the panel edge. Decoration only
export function ExpiryDivider({ depth }: { depth: number }) {
  const [ref, { width, left }] = useBox();
  const id = useId().replace(/:/g, '');
  // How far the shadow runs over the ground left of the panel
  const spill = clamp(left - 2, 0, 18);
  const longest = Math.max(4, Math.round(MAX_DEPTH * width));
  const c = useMemo(() => paperFor(longest), [longest]);
  const w = Math.max(4, Math.round(depth * width));
  const { ty, h, tx, cx, k } = useMemo(
    () => beamShape(w, c, longest),
    [w, c, longest],
  );
  const fold = `Q${w / 2} 0 0 ${h}`;
  const leftEdge = `Q${tx / 2} ${h} ${tx} ${ty}`;
  const lowerBack = `Q${cx} 0 ${w} 0`;
  const flap = `M${w} 0${fold}${leftEdge}${lowerBack}Z`;
  const gap = `M0 0H${w}${fold}Z`;
  const crescent = useMemo(() => crescentPath(w), [w]);
  const body = Math.ceil(ty + SHADOW_ROOM * k);
  const blurRegion = {
    filterUnits: 'userSpaceOnUse' as const,
    x: -40,
    y: -24,
    width: w + 80,
    height: body + 48,
  };
  const shadowStops = (near: number, far: number) => (
    <>
      <stop offset="0" stopColor="#000" stopOpacity={near} />
      <stop offset="1" stopColor="#000" stopOpacity={far} />
    </>
  );

  return (
    <div
      ref={ref}
      aria-hidden
      className="relative -mx-4"
      style={{ height: LINE + body }}
    >
      <svg
        className="absolute left-0 overflow-visible"
        style={{ top: LINE }}
        width={w}
        height={body}
        viewBox={`0 0 ${w} ${body}`}
      >
        <defs>
          <clipPath id={`${id}-flap`}>
            <path d={flap} />
          </clipPath>
          {/* the paper */}
          <linearGradient
            id={`${id}-paper`}
            gradientUnits="userSpaceOnUse"
            x1={w}
            y1="0"
            x2={tx}
            y2="0"
          >
            <stop offset="0" stopColor={lit(40)} />
            <stop offset="0.5" stopColor={lit(84)} />
            <stop offset="1" stopColor={lit(100)} />
          </linearGradient>
          {/* the roll toward the lower edge */}
          <linearGradient
            id={`${id}-roll`}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2="0"
            y2={ty}
          >
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.14" />
          </linearGradient>
          {/* the crease along the fold */}
          <linearGradient
            id={`${id}-crease`}
            gradientUnits="userSpaceOnUse"
            x1={w}
            y1="0"
            x2="0"
            y2="0"
          >
            <stop offset="0" stopColor="#000" stopOpacity="0.5" />
            <stop offset="0.5" stopColor="#000" stopOpacity="0.2" />
            <stop offset="1" stopColor="#000" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient
            id={`${id}-contact`}
            gradientUnits="userSpaceOnUse"
            x1={w}
            y1="0"
            x2={tx}
            y2="0"
          >
            {shadowStops(0.8, 0.05)}
          </linearGradient>
          <linearGradient
            id={`${id}-cast`}
            gradientUnits="userSpaceOnUse"
            x1={w}
            y1="0"
            x2={tx}
            y2="0"
          >
            {shadowStops(0.14, 0.62)}
          </linearGradient>
          <linearGradient
            id={`${id}-spill-fade`}
            gradientUnits="userSpaceOnUse"
            x1={-Math.max(1, spill)}
            y1="0"
            x2="0"
            y2="0"
          >
            <stop offset="0" stopColor="#000" />
            <stop offset="1" stopColor="#fff" />
          </linearGradient>
          <mask
            id={`${id}-spill`}
            maskUnits="userSpaceOnUse"
            x={-40}
            y={-24}
            width={w + 120}
            height={body + 48}
          >
            <rect
              x={-40}
              y={-24}
              width={w + 120}
              height={body + 48}
              fill={`url(#${id}-spill-fade)`}
            />
          </mask>
          {/* the shadow at the paper's left end */}
          <linearGradient
            id={`${id}-end-fade`}
            gradientUnits="userSpaceOnUse"
            x1={tx}
            y1="0"
            x2={tx + 56}
            y2="0"
          >
            <stop offset="0" stopColor="#fff" />
            <stop offset="1" stopColor="#000" />
          </linearGradient>
          <mask
            id={`${id}-end`}
            maskUnits="userSpaceOnUse"
            x={-40}
            y={-24}
            width={w + 120}
            height={body + 48}
          >
            <rect
              x={-40}
              y={-24}
              width={w + 120}
              height={body + 48}
              fill={`url(#${id}-end-fade)`}
            />
          </mask>
          {/* the blur region, in pixels */}
          <filter id={`${id}-wide`} {...blurRegion}>
            <feGaussianBlur stdDeviation={5 * k} />
          </filter>
          <filter id={`${id}-tight`} {...blurRegion}>
            <feGaussianBlur stdDeviation={1.6 * k} />
          </filter>
          <filter id={`${id}-fold`} {...blurRegion}>
            <feGaussianBlur stdDeviation={2.5 * k} />
          </filter>
          <linearGradient
            id={`${id}-gap-fade`}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2={w}
            y2="0"
          >
            {SHADE.map((value, i) => (
              <stop
                key={i}
                offset={i / (SHADE.length - 1)}
                stopColor={`hsl(0 0% ${value * 100}%)`}
              />
            ))}
          </linearGradient>
          <mask
            id={`${id}-gap-mask`}
            maskUnits="userSpaceOnUse"
            x="0"
            y="-8"
            width={w}
            height={body + 16}
          >
            <rect
              y="-8"
              width={w}
              height={body + 16}
              fill={`url(#${id}-gap-fade)`}
            />
          </mask>
          <filter id={`${id}-soft`} {...blurRegion}>
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
          {/* shade of the cut edge */}
          <linearGradient
            id={`${id}-gap`}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2="0"
            y2={Math.max(1, h)}
          >
            <stop offset="0" stopColor="#2a0605" stopOpacity="0.72" />
            <stop offset="1" stopColor="#2a0605" stopOpacity="0.3" />
          </linearGradient>
          {/* fades in over 24px from the panel edge */}
          <linearGradient
            id={`${id}-left-fade`}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2="24"
            y2="0"
          >
            <stop offset="0" stopColor="#000" />
            <stop offset="0.5" stopColor="#808080" />
            <stop offset="1" stopColor="#fff" />
          </linearGradient>
          <mask
            id={`${id}-left`}
            maskUnits="userSpaceOnUse"
            x="0"
            y="-8"
            width={w}
            height={body + 16}
          >
            <rect
              y="-8"
              width={w}
              height={body + 16}
              fill={`url(#${id}-left-fade)`}
            />
          </mask>
          <clipPath id={`${id}-paper-top`}>
            <path d={flap} />
          </clipPath>
        </defs>
        <path d={gap} className="fill-background" />
        <g mask={`url(#${id}-left)`}>
          <path
            d={gap}
            fill={`url(#${id}-gap)`}
            mask={`url(#${id}-gap-mask)`}
          />
        </g>
        <g mask={`url(#${id}-spill)`}>
          <path
            d={flap}
            fill={`url(#${id}-cast)`}
            transform={`translate(${3 * k} ${7 * k})`}
            filter={`url(#${id}-wide)`}
          />
          {spill > 2 && (
            <path
              d={flap}
              fill={`url(#${id}-cast)`}
              transform={`translate(${-0.5 * spill} ${6 * k})`}
              filter={`url(#${id}-wide)`}
              mask={`url(#${id}-end)`}
              opacity="0.7"
            />
          )}
          <path
            d={flap}
            fill={`url(#${id}-contact)`}
            transform={`translate(${k} ${2 * k})`}
            filter={`url(#${id}-tight)`}
          />
        </g>
        <path d={flap} fill={`url(#${id}-paper)`} />
        <path d={flap} fill={`url(#${id}-roll)`} />
        <g clipPath={`url(#${id}-flap)`}>
          <path
            d={`M${w} 0${fold}`}
            fill="none"
            stroke={`url(#${id}-crease)`}
            strokeWidth={9 * k}
            filter={`url(#${id}-fold)`}
          />
        </g>
        {/* the shade crescent on the paper's top */}
        <g clipPath={`url(#${id}-paper-top)`}>
          <path
            d={crescent}
            fill="#2a0605"
            fillOpacity="0.72"
            filter={`url(#${id}-soft)`}
            mask={`url(#${id}-gap-mask)`}
          />
        </g>
      </svg>
      <span
        className="absolute right-0 border-t border-dashed border-destructive"
        style={{ top: LINE, left: `${depth * 100}%` }}
      />
      <Scissors
        className="absolute text-destructive"
        style={{
          top: LINE - SIZE / 2,
          left: `calc(${depth * 100}% - ${SIZE}px)`,
          width: SIZE,
          height: SIZE,
        }}
      />
    </div>
  );
}
