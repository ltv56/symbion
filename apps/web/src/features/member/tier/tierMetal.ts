// hi: the glint; light, mid, dark: the metal from lit to shaded; deep: the groove; ink: the engraving
export type Metal = {
  hi: string;
  light: string;
  mid: string;
  dark: string;
  deep: string;
  ink: string;
};

const METALS: Record<string, Metal> = {
  bronze: {
    hi: '#ffd9b3',
    light: '#e6a770',
    mid: '#b8692f',
    dark: '#7a3f17',
    deep: '#4a230b',
    ink: '#3b1a07',
  },
  silver: {
    hi: '#ffffff',
    light: '#e6ebf1',
    mid: '#aab4c0',
    dark: '#6d7886',
    deep: '#3f4854',
    ink: '#222a33',
  },
  gold: {
    hi: '#fff3b8',
    light: '#f7d56b',
    mid: '#d9a41c',
    dark: '#8f5f00',
    deep: '#5a3a00',
    ink: '#3d2700',
  },
};

// Any other tier gets plain steel
const STEEL: Metal = {
  hi: '#ffffff',
  light: '#eef2f6',
  mid: '#c3ccd7',
  dark: '#8794a4',
  deep: '#566273',
  ink: '#2c3541',
};

export const metalFor = (name: string): Metal =>
  METALS[name.toLowerCase()] ?? STEEL;

const channels = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// Blend two #rrggbb colours
export const mix = (a: string, b: string, t: number) => {
  const to = channels(b);
  const out = channels(a).map((v, i) => Math.round(v + ((to[i] ?? 0) - v) * t));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};
