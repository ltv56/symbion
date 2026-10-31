// A point on a circle around the seal's centre, as "x y" for an SVG path
export const corner = (radius: number, angle: number) =>
  `${(48 + radius * Math.cos(angle)).toFixed(2)} ${(48 + radius * Math.sin(angle)).toFixed(2)}`;
