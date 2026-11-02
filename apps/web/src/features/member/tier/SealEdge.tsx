import './seal-glint.css';
import { ROSETTE } from './sealGeometry';
import { SealRim } from './SealParts';
import type { Metal, Rim } from './tierMetal';

// Reflections run across the whole seal
const SHINE: [number, keyof Metal][] = [
  [0, 'dark'],
  [0.18, 'light'],
  [0.34, 'hi'],
  [0.5, 'light'],
  [0.66, 'mid'],
  [0.82, 'dark'],
  [1, 'light'],
];

// The scalloped edge leaves the face a little more room
export const faceRadius = (rim: Rim) => (rim === 'scalloped' ? 36.5 : 35.5);

// Gradients and the clip the scalloped edge and its sweep need
export function SealEdgeDefs({
  id,
  metal,
  rim,
}: {
  id: string;
  metal: Metal;
  rim: Rim;
}) {
  if (rim !== 'scalloped') return null;
  return (
    <>
      <linearGradient
        id={`${id}-shine`}
        gradientUnits="userSpaceOnUse"
        x1="8"
        y1="8"
        x2="88"
        y2="88"
      >
        {SHINE.map(([offset, tone]) => (
          <stop key={offset} offset={offset} stopColor={metal[tone]} />
        ))}
      </linearGradient>
      <linearGradient id={`${id}-sweep`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity="0" />
        <stop offset="0.5" stopColor="#fff" stopOpacity="0.6" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <clipPath id={`${id}-glint`}>
        <circle cx="48" cy="48" r="36.5" />
      </clipPath>
    </>
  );
}

// The edge of the coin: plain, milled or scalloped
export function SealEdge({
  id,
  metal,
  rim,
}: {
  id: string;
  metal: Metal;
  rim: Rim;
}) {
  if (rim === 'scalloped') {
    return (
      <>
        <path d={ROSETTE} fill={`url(#${id}-shine)`} />
        <circle
          cx="48"
          cy="48"
          r="38"
          fill="none"
          stroke={metal.deep}
          strokeOpacity="0.45"
        />
      </>
    );
  }
  return (
    <>
      <SealRim id={id} />
      {rim === 'milled' && (
        <circle
          cx="48"
          cy="48"
          r="42"
          fill="none"
          stroke={metal.deep}
          strokeOpacity="0.55"
          strokeWidth="3"
          strokeDasharray="1.1 1.7"
        />
      )}
    </>
  );
}

// One sweep of light over the face
export function SealGlint({ id }: { id: string }) {
  return (
    <g clipPath={`url(#${id}-glint)`}>
      <rect
        className="seal-glint"
        x="0"
        y="-4"
        width="22"
        height="104"
        fill={`url(#${id}-sweep)`}
      />
    </g>
  );
}
