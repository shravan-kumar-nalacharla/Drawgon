import {
  convolve,
  dot,
  network,
  pool,
  random,
  sigmoid,
  sum,
  type Matrix,
} from "./math";
export type VAE = {
  mu: Matrix;
  lv: Matrix;
  decoder: Matrix;
  mb: number[];
  vb: number[];
  db: number[];
};
export function vaeInitial(seed = 42): VAE {
  const n = network([8, 2, 8], seed);
  return {
    mu: n.w[0],
    lv: n.w[0].map((r) => r.map((v) => v * 0.1)),
    decoder: n.w[1],
    mb: [0, 0],
    vb: [0, 0],
    db: Array(8).fill(0),
  };
}
export function vaeForward(
  model: VAE,
  x: number[],
  seed = 42,
  override?: number[],
) {
  const rng = random(seed),
    mu = model.mu.map((w, i) => dot(w, x) + model.mb[i]),
    raw = model.lv.map((w, i) => dot(w, x) + model.vb[i]),
    lv = raw.map((v) => Math.max(-8, Math.min(8, v))),
    eps = mu.map(
      () =>
        Math.sqrt(-2 * Math.log(Math.max(1e-9, rng()))) *
        Math.cos(2 * Math.PI * rng()),
    ),
    z = override ?? mu.map((v, i) => v + Math.exp(lv[i] / 2) * eps[i]),
    output = model.decoder.map((w, i) => sigmoid(dot(w, z) + model.db[i])),
    reconstruction = sum(output.map((v, i) => (v - x[i]) ** 2)) / 8,
    kl = 0.5 * sum(mu.map((v, i) => v * v + Math.exp(lv[i]) - 1 - lv[i]));
  return { mu, raw, lv, eps, z, output, reconstruction, kl };
}
export function vaeGradients(
  model: VAE,
  x: number[],
  beta: number,
  seed: number,
) {
  const f = vaeForward(model, x, seed),
    d = f.output.map((v, i) => ((2 * (v - x[i])) / 8) * v * (1 - v)),
    dz = f.z.map((_, j) => sum(model.decoder.map((w, i) => w[j] * d[i]))),
    dm = f.mu.map((v, i) => dz[i] + beta * v),
    dv = f.lv.map(
      (v, i) =>
        (dz[i] * 0.5 * Math.exp(v / 2) * f.eps[i] +
          beta * 0.5 * (Math.exp(v) - 1)) *
        (Math.abs(f.raw[i]) < 8 ? 1 : 0),
    );
  return {
    mu: dm.map((v) => x.map((x) => v * x)),
    lv: dv.map((v) => x.map((x) => v * x)),
    decoder: d.map((v) => f.z.map((z) => v * z)),
    mb: dm,
    vb: dv,
    db: d,
  };
}
export function vaeTrain(
  model: VAE,
  data: number[][],
  lr: number,
  beta: number,
  seed: number,
): VAE {
  const gradients = data.map((x, i) => vaeGradients(model, x, beta, seed + i));
  return Object.fromEntries(
    Object.entries(model).map(([name, values]) => {
      const key = name as keyof VAE;
      if (Array.isArray(values[0]))
        return [
          key,
          (values as Matrix).map((r, i) =>
            r.map(
              (v, j) =>
                v -
                (lr * sum(gradients.map((g) => (g[key] as Matrix)[i][j]))) /
                  data.length,
            ),
          ),
        ];
      return [
        key,
        (values as number[]).map(
          (v, i) =>
            v -
            (lr * sum(gradients.map((g) => (g[key] as number[])[i]))) /
              data.length,
        ),
      ];
    }),
  ) as VAE;
}
export type ConvAE = { encoder: Matrix; decoder: Matrix };
export function convAEInitial(): ConvAE {
  const rng = random(42);
  return {
    encoder: Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () => rng() - 0.5),
    ),
    decoder: Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () => rng() - 0.5),
    ),
  };
}
export function convAEForward(model: ConvAE, x: Matrix) {
  const encoded = convolve(x, model.encoder, 1, 1).map((r) => r.map(Math.tanh)),
    latent = pool(encoded, 2, 2, "Average"),
    upsampled = Array.from({ length: x.length }, (_, r) =>
      Array.from(
        { length: x.length },
        (_, c) => latent[Math.floor(r / 2)][Math.floor(c / 2)],
      ),
    ),
    output = convolve(upsampled, model.decoder, 1, 1).map((r) =>
      r.map(sigmoid),
    ),
    loss =
      sum(output.flat().map((v, i) => (v - x.flat()[i]) ** 2)) /
      x.flat().length;
  return { encoded, latent, upsampled, output, loss };
}
/** Finite-difference gradients deliberately expose a tiny 18-parameter convolutional model. */
export function convAETrain(model: ConvAE, x: Matrix, lr: number) {
  const next = structuredClone(model),
    epsilon = 1e-4;
  for (const key of ["encoder", "decoder"] as const)
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) {
        const plus = structuredClone(model),
          minus = structuredClone(model);
        plus[key][r][c] += epsilon;
        minus[key][r][c] -= epsilon;
        const gradient =
          (convAEForward(plus, x).loss - convAEForward(minus, x).loss) /
          (2 * epsilon);
        next[key][r][c] -= lr * gradient;
      }
  return next;
}
