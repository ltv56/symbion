import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { corner } from './sealGeometry';
import { mix } from './tierMetal';
import type { Metal } from './tierMetal';

// Letter width and the room inside the ring
const RING = 62;
const LETTER = 0.72;
const MIN_FONT = 10;
const MAX_LETTERS = Math.floor(RING / (LETTER * MIN_FONT));

const fontSizeFor = (letters: number) =>
  Math.min(24, Math.floor(RING / (LETTER * letters)));

// A long tier name shows its first word, cut to fit
function sealWord(label: string): string {
  const word = (label.split(/\s+/)[0] ?? label).toLocaleUpperCase();
  return word.length > MAX_LETTERS
    ? `${word.slice(0, MAX_LETTERS - 1)}…`
    : word;
}

const WEDGES = 72;
// Light from the top left, two opposite lobes
const LIGHT = (-50 * Math.PI) / 180;

// The glint stops short of white
const glintOf = (metal: Metal) => mix(metal.light, metal.hi, 0.5);

export function SealFrame({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <svg
      viewBox="0 0 96 96"
      className="size-24 shrink-0 overflow-visible"
      role="img"
      aria-label={t('member.tierSeal', { tier: label })}
    >
      <title>{label}</title>
      {children}
    </svg>
  );
}

// Rim and groove gradients and the shadow: `${id}-rim`, `-groove`, `-lift`
export function SealDefs({ id, metal }: { id: string; metal: Metal }) {
  return (
    <>
      <linearGradient id={`${id}-rim`} x1="0.15" y1="0" x2="0.85" y2="1">
        <stop offset="0" stopColor={glintOf(metal)} />
        <stop offset="0.35" stopColor={metal.mid} />
        <stop offset="0.72" stopColor={metal.dark} />
        <stop offset="1" stopColor={metal.light} />
      </linearGradient>
      <linearGradient id={`${id}-groove`} x1="0.15" y1="0" x2="0.85" y2="1">
        <stop offset="0" stopColor={metal.deep} />
        <stop offset="0.5" stopColor={metal.dark} />
        <stop offset="1" stopColor={glintOf(metal)} />
      </linearGradient>
      <filter id={`${id}-lift`} x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow
          dx="0"
          dy="2"
          stdDeviation="2"
          floodColor="#000"
          floodOpacity="0.22"
        />
      </filter>
    </>
  );
}

// A face of wedges between the metal's floor and its glint
export function Sunburst({ id, metal }: { id: string; metal: Metal }) {
  const radius = 35.5;
  const floor = mix(metal.mid, metal.light, 0.5);
  const reach = radius + 1;
  return (
    <>
      <clipPath id={`${id}-face`}>
        <circle cx="48" cy="48" r={radius} />
      </clipPath>
      <g clipPath={`url(#${id}-face)`}>
        {Array.from({ length: WEDGES }, (_, i) => {
          const from = (i / WEDGES) * 2 * Math.PI;
          const to = ((i + 1) / WEDGES) * 2 * Math.PI;
          const lobes = 0.5 + 0.5 * Math.cos(2 * ((from + to) / 2 - LIGHT));
          const fill = mix(floor, glintOf(metal), lobes ** 1.4);
          return (
            <path
              key={i}
              d={`M48 48L${corner(reach, from)}A${reach} ${reach} 0 0 1 ${corner(reach, to)}Z`}
              fill={fill}
              stroke={fill}
              strokeWidth="0.4"
            />
          );
        })}
      </g>
    </>
  );
}

// The bevelled rim and the groove inside it
export function SealRim({ id }: { id: string }) {
  return (
    <>
      <circle cx="48" cy="48" r="44" fill={`url(#${id}-rim)`} />
      <circle cx="48" cy="48" r="37.5" fill={`url(#${id}-groove)`} />
    </>
  );
}

// An engraved word
function Engraved({
  metal,
  y,
  size,
  weight,
  children,
}: {
  metal: Metal;
  y: number;
  size: number;
  weight: number;
  children: ReactNode;
}) {
  const common = {
    textAnchor: 'middle' as const,
    fontSize: size,
    fontWeight: weight,
  };
  return (
    <>
      <text x={48.7} y={y + 0.8} fill={metal.hi} fillOpacity={0.85} {...common}>
        {children}
      </text>
      <text x={48} y={y} fill={metal.ink} {...common}>
        {children}
      </text>
    </>
  );
}

// "Hạng" over the tier word, tilted
export function SealLettering({
  metal,
  label,
}: {
  metal: Metal;
  label: string;
}) {
  const { t } = useTranslation();
  const word = sealWord(label);
  return (
    <g transform="rotate(-9 48 48)">
      <Engraved metal={metal} y={39} size={11} weight={600}>
        {t('member.tierSealTitle')}
      </Engraved>
      <Engraved
        metal={metal}
        y={62}
        size={fontSizeFor(word.length)}
        weight={700}
      >
        {word}
      </Engraved>
    </g>
  );
}
