// Euler-Bernoulli strip, large deflection
const BEAM_STEPS = 48;

export function solveBeam(length: number, c: number) {
  const ds = length / BEAM_STEPS;
  const theta = new Array<number>(BEAM_STEPS + 1).fill(0);
  for (let pass = 0; pass < 120; pass++) {
    const moment = new Array<number>(BEAM_STEPS + 1).fill(0);
    for (let i = BEAM_STEPS - 1; i >= 0; i--) {
      const a = (length - i * ds) * Math.cos(theta[i] ?? 0);
      const b = (length - (i + 1) * ds) * Math.cos(theta[i + 1] ?? 0);
      moment[i] = (moment[i + 1] ?? 0) + 0.5 * (a + b) * ds;
    }
    let angle = 0;
    for (let i = 1; i <= BEAM_STEPS; i++) {
      angle += c * 0.5 * ((moment[i - 1] ?? 0) + (moment[i] ?? 0)) * ds;
      theta[i] = 0.5 * (theta[i] ?? 0) + 0.5 * angle;
    }
  }
  let reach = 0;
  let drop = 0;
  for (let i = 0; i < BEAM_STEPS; i++) {
    const a = theta[i] ?? 0;
    const b = theta[i + 1] ?? 0;
    reach += 0.5 * (Math.cos(a) + Math.cos(b)) * ds;
    drop += 0.5 * (Math.sin(a) + Math.sin(b)) * ds;
  }
  return { reach, drop, slope: theta[BEAM_STEPS] ?? 0 };
}
