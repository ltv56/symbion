// A point on a circle around the seal's centre, as "x y" for an SVG path
export const corner = (radius: number, angle: number) =>
  `${(48 + radius * Math.cos(angle)).toFixed(2)} ${(48 + radius * Math.sin(angle)).toFixed(2)}`;

// A coin edge with 28 scallops
export const ROSETTE = `${Array.from({ length: 224 }, (_, i) => {
  const a = (i / 224) * Math.PI * 2;
  const r = 42.6 + 1.6 * Math.cos(28 * a);
  return `${i === 0 ? 'M' : 'L'}${corner(r, a)}`;
}).join('')}Z`;
