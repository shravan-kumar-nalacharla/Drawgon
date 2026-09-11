import { random, sigmoid, sum } from "./math";
export type Gan = {
  g: number[];
  d: number[];
  step: number;
  history: number[][];
};
export const ganInitial = (): Gan => ({
  g: [0.3, 0, 0, 0.3, -1, -1],
  d: [0.1, -0.1, 0.1, 0.1, 0],
  step: 0,
  history: [],
});
const features = (p: number[]) => [p[0], p[1], p[0] ** 2, p[1] ** 2, 1];
export const generate = (g: number[], z: number[]) => [
  g[0] * z[0] + g[1] * z[1] + g[4],
  g[2] * z[0] + g[3] * z[1] + g[5],
];
export const discriminate = (d: number[], p: number[]) =>
  sigmoid(sum(features(p).map((v, i) => v * d[i])));
export function ganSamples(seed = 42) {
  const rng = random(seed);
  return Array.from({ length: 48 }, () => {
    const z = [rng() * 2 - 1, rng() * 2 - 1];
    return { z, real: [0.7 + z[0] * 0.7, 0.5 + z[1] * 0.5] };
  });
}
export function ganStep(state: Gan, which: "D" | "G", lr: number) {
  const data = ganSamples(),
    g = [...state.g],
    d = [...state.d];
  if (which === "D") {
    const grad = d.map(() => 0);
    for (const { z, real } of data) {
      const fake = generate(g, z),
        pr = discriminate(d, real),
        pf = discriminate(d, fake);
      features(real).forEach(
        (v, i) => (grad[i] += ((pr - 1) * v) / data.length),
      );
      features(fake).forEach((v, i) => (grad[i] += (pf * v) / data.length));
    }
    d.forEach((v, i) => (d[i] = v - lr * grad[i]));
  } else {
    const grad = g.map(() => 0);
    for (const { z } of data) {
      const p = generate(g, z),
        prob = discriminate(d, p),
        dx = ((prob - 1) * (d[0] + 2 * d[2] * p[0])) / data.length,
        dy = ((prob - 1) * (d[1] + 2 * d[3] * p[1])) / data.length;
      [dx * z[0], dx * z[1], dy * z[0], dy * z[1], dx, dy].forEach(
        (v, i) => (grad[i] += v),
      );
    }
    g.forEach((v, i) => (g[i] = v - lr * grad[i]));
  }
  const dLoss =
      -sum(
        data.map(
          ({ z, real }) =>
            Math.log(Math.max(1e-9, discriminate(d, real))) +
            Math.log(Math.max(1e-9, 1 - discriminate(d, generate(g, z)))),
        ),
      ) / data.length,
    gLoss =
      -sum(
        data.map(({ z }) =>
          Math.log(Math.max(1e-9, discriminate(d, generate(g, z)))),
        ),
      ) / data.length;
  if ([...g, ...d].some((v) => !Number.isFinite(v) || Math.abs(v) > 1e4))
    throw new Error("GAN diverged. Reset with smaller learning rates.");
  return {
    g,
    d,
    step: state.step + 1,
    history: [...state.history, [state.step + 1, dLoss, gLoss]].slice(-300),
  };
}
