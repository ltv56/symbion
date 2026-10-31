import { EXPIRING_SOON_DAYS } from '../expiry';
import { solveBeam } from './beam';

export const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

// How far the longest cut hangs
const LONGEST_HANG = 70;
// The shallowest cut fits the scissors icon
const MIN_DEPTH = 0.12;
export const MAX_DEPTH = 0.96;

// The nearer the first lot, the deeper the cut
export function cutDepth(nearestDays: number): number {
  return Math.min(
    MAX_DEPTH,
    Math.max(MIN_DEPTH, 1 - nearestDays / EXPIRING_SOON_DAYS),
  );
}

// Depth of the shade under the cut edge at x px from the panel edge
function crescentDepth(x: number): number {
  const rise = clamp(x / 24, 0, 1);
  const hump = 6 + 6 * Math.exp(-(((x - 34) / 40) ** 2));
  return rise * rise * (3 - 2 * rise) * hump;
}

// The shade crescent
export function crescentPath(w: number): string {
  const steps = Math.max(8, Math.ceil(w / 6));
  const lower = Array.from({ length: steps + 1 }, (_, i) => {
    const x = (i / steps) * w;
    return `L${x.toFixed(1)} ${crescentDepth(x).toFixed(2)}`;
  })
    .reverse()
    .join('');
  return `M0 -6H${w}${lower}Z`;
}

// Solves c per panel width
export function paperFor(longest: number): number {
  let low = 0;
  let high = 40 / longest ** 3;
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    if (solveBeam(longest, mid).drop < LONGEST_HANG) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

// Shadow scale, 0.3 to 1
const shadowScale = (w: number, longest: number) => clamp(w / longest, 0.3, 1);

// ty, tx: the tip's drop below the cut and distance from the panel edge; h: fold height; cx: lower-edge control
export function beamShape(w: number, c: number, longest: number) {
  const { reach, drop, slope } = solveBeam(w, c);
  const tx = Math.max(0, w - reach);
  const cx =
    slope > 0.01 ? clamp(tx + drop / Math.tan(slope), tx, w) : (w + tx) / 2;
  return { ty: drop, h: drop * 0.5, tx, cx, k: shadowScale(w, longest) };
}
