/** Small, deterministic educational models. No network access or renderer dependencies. */
export type Matrix = number[][];
export const sum = (x: number[]) => x.reduce((a, b) => a + b, 0);
export const dot = (a: number[], b: number[]) => sum(a.map((v, i) => v * b[i]));
export const sigmoid = (x: number) =>
  x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x));
export function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const activations = [
  "Sigmoid",
  "Tanh",
  "ReLU",
  "Leaky ReLU",
  "Linear",
  "Binary step",
  "ELU",
  "Softplus",
  "GELU",
] as const;
export type Activation = (typeof activations)[number];
export function activation(x: number, kind: Activation): number {
  switch (kind) {
    case "Sigmoid":
      return sigmoid(x);
    case "Tanh":
      return Math.tanh(x);
    case "ReLU":
      return Math.max(0, x);
    case "Leaky ReLU":
      return x >= 0 ? x : 0.01 * x;
    case "Linear":
      return x;
    case "Binary step":
      return +(x >= 0);
    case "ELU":
      return x >= 0 ? x : Math.expm1(x);
    case "Softplus":
      return Math.max(x, 0) + Math.log1p(Math.exp(-Math.abs(x)));
    case "GELU":
      return (
        0.5 *
        x *
        (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)))
      );
  }
}
export function derivative(x: number, kind: Activation): number {
  switch (kind) {
    case "Sigmoid": {
      const a = sigmoid(x);
      return a * (1 - a);
    }
    case "Tanh":
      return 1 - Math.tanh(x) ** 2;
    case "ReLU":
      return +(x > 0);
    case "Leaky ReLU":
      return x >= 0 ? 1 : 0.01;
    case "Linear":
      return 1;
    case "Binary step":
      return 0;
    case "ELU":
      return x >= 0 ? 1 : Math.exp(x);
    case "Softplus":
      return sigmoid(x);
    case "GELU": {
      const a = Math.sqrt(2 / Math.PI),
        t = Math.tanh(a * (x + 0.044715 * x ** 3));
      return (
        0.5 * (1 + t) + 0.5 * x * (1 - t * t) * a * (1 + 3 * 0.044715 * x * x)
      );
    }
  }
}
export function softmax(x: number[], temperature = 1) {
  if (
    !x.length ||
    temperature <= 0 ||
    !Number.isFinite(temperature) ||
    x.some((v) => !Number.isFinite(v))
  )
    throw new Error("Use finite logits and a positive temperature.");
  const max = Math.max(...x),
    e = x.map((v) => Math.exp((v - max) / temperature)),
    s = sum(e);
  return e.map((v) => v / s);
}
export const neuron = (
  x: number[],
  w: number[],
  b: number,
  act: Activation,
) => {
  const terms = x.map((v, i) => v * w[i]),
    z = sum(terms) + b;
  return { terms, z, a: activation(z, act) };
};
export type Network = { w: number[][][]; b: number[][]; act: Activation };
export function network(
  sizes: number[],
  seed = 42,
  act: Activation = "Tanh",
  init = "Xavier",
): Network {
  const rng = random(seed);
  return {
    act,
    w: sizes
      .slice(1)
      .map((n, l) =>
        Array.from({ length: n }, () =>
          Array.from({ length: sizes[l] }, () =>
            init === "Zeros"
              ? 0
              : (rng() * 2 - 1) *
                (init === "Large"
                  ? 3
                  : init === "Small"
                    ? 0.05
                    : Math.sqrt(6 / (init === "He" ? sizes[l] : sizes[l] + n))),
          ),
        ),
      ),
    b: sizes.slice(1).map((n) => Array(n).fill(0)),
  };
}
export function forward(net: Network, x: number[]) {
  const a = [x],
    z: number[][] = [];
  net.w.forEach((layer, l) => {
    z.push(layer.map((w, j) => dot(w, a[l]) + net.b[l][j]));
    a.push(
      z[l].map((v) =>
        activation(v, l === net.w.length - 1 ? "Sigmoid" : net.act),
      ),
    );
  });
  return { a, z };
}
/** Half squared error per sample, summed across outputs. */
export function backprop(net: Network, x: number[], target: number[]) {
  const { a, z } = forward(net, x),
    last = net.w.length - 1,
    d: number[][] = net.b.map((b) => b.map(() => 0));
  for (let l = last; l >= 0; l--)
    d[l] = z[l].map(
      (v, j) =>
        (l === last
          ? a[l + 1][j] - target[j]
          : sum(net.w[l + 1].map((row, k) => row[j] * d[l + 1][k]))) *
        derivative(v, l === last ? "Sigmoid" : net.act),
    );
  return {
    a,
    z,
    loss: sum(a[last + 1].map((v, i) => (v - target[i]) ** 2)) / 2,
    d,
    gw: net.w.map((layer, l) =>
      layer.map((w, j) => w.map((_, i) => d[l][j] * a[l][i])),
    ),
    gb: d,
  };
}
export function train(
  net: Network,
  samples: { x: number[]; y: number[] }[],
  lr: number,
  l2 = 0,
  freeze = 0,
) {
  const grads = samples.map((s) => backprop(net, s.x, s.y));
  return {
    ...net,
    w: net.w.map((layer, l) =>
      layer.map((row, j) =>
        row.map((v, i) =>
          l < freeze
            ? v
            : v -
              lr *
                (sum(grads.map((g) => g.gw[l][j][i])) / grads.length + l2 * v),
        ),
      ),
    ),
    b: net.b.map((row, l) =>
      row.map((v, j) =>
        l < freeze
          ? v
          : v - (lr * sum(grads.map((g) => g.gb[l][j]))) / grads.length,
      ),
    ),
  };
}
export function convolve(input: Matrix, kernel: Matrix, stride = 1, pad = 0) {
  const n = input.length,
    k = kernel.length;
  if (
    !n ||
    !k ||
    input.some((r) => r.length !== n) ||
    kernel.some((r) => r.length !== k) ||
    !Number.isInteger(stride) ||
    stride < 1 ||
    !Number.isInteger(pad) ||
    pad < 0 ||
    [...input.flat(), ...kernel.flat()].some((v) => !Number.isFinite(v))
  )
    throw new Error(
      "Use square finite matrices, positive integer stride and nonnegative padding.",
    );
  const size = Math.floor((n + 2 * pad - k) / stride) + 1;
  if (size < 1 || size > 64)
    throw new Error(
      "Kernel is larger than the padded input, or output exceeds 64 cells per side.",
    );
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) =>
      sum(
        kernel.flatMap((row, i) =>
          row.map(
            (v, j) =>
              v * (input[r * stride + i - pad]?.[c * stride + j - pad] ?? 0),
          ),
        ),
      ),
    ),
  );
}
export function pool(input: Matrix, size = 2, stride = 2, mode = "Max") {
  const n = Math.floor((input.length - size) / stride) + 1;
  if (n < 1 || size < 1 || stride < 1)
    throw new Error("Pooling window does not fit.");
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => {
      const values = Array.from({ length: size }, (_, i) =>
        Array.from(
          { length: size },
          (_, j) => input[r * stride + i][c * stride + j],
        ),
      ).flat();
      return mode === "Max"
        ? Math.max(...values)
        : mode === "Min"
          ? Math.min(...values)
          : sum(values) / values.length;
    }),
  );
}
export type Point = { x: number; y: number; label: number };
export function dataset(
  kind = "Blobs",
  seed = 42,
  n = 60,
  noise = 0.15,
): Point[] {
  const rng = random(seed);
  return Array.from({ length: n }, (_, i) => {
    const label = i % 2,
      a = rng() * Math.PI * 2,
      r = 0.45 + label * 0.85;
    let x: number, y: number;
    if (kind === "Circles") {
      x = r * Math.cos(a);
      y = r * Math.sin(a);
    } else if (kind === "XOR") {
      x = rng() * 4 - 2;
      y = rng() * 4 - 2;
      return { x, y, label: +(x * y > 0) };
    } else if (kind === "Spirals") {
      const t = rng() * Math.PI * 2;
      x = (t / 4) * Math.cos(t + label * Math.PI);
      y = (t / 4) * Math.sin(t + label * Math.PI);
    } else if (kind === "Moons") {
      x = Math.cos(a / 2) + label - 1;
      y = Math.sin(a / 2) * (label ? -1 : 1) + label * 0.5;
    } else {
      x = (label ? 1 : -1) + (rng() - 0.5);
      y = (label ? 0.65 : -0.65) + (rng() - 0.5);
    }
    return {
      x: x + (rng() - 0.5) * noise * 3,
      y: y + (rng() - 0.5) * noise * 3,
      label,
    };
  });
}
export const distance = (
  a: { x: number; y: number },
  b: { x: number; y: number },
) => Math.hypot(a.x - b.x, a.y - b.y);
export function assign(points: Point[], centers: Point[]) {
  return points.map((p) => {
    const ds = centers.map((c) => distance(p, c));
    return { ...p, label: ds.indexOf(Math.min(...ds)) };
  });
}
export function centroids(points: Point[], old: Point[]) {
  return old.map((c, i) => {
    const ps = points.filter((p) => p.label === i);
    return ps.length
      ? {
          x: sum(ps.map((p) => p.x)) / ps.length,
          y: sum(ps.map((p) => p.y)) / ps.length,
          label: i,
        }
      : c;
  });
}
export function pca(points: Point[]) {
  const mean = {
    x: sum(points.map((p) => p.x)) / points.length,
    y: sum(points.map((p) => p.y)) / points.length,
  };
  const centered = points.map((p) => ({
      ...p,
      x: p.x - mean.x,
      y: p.y - mean.y,
    })),
    den = Math.max(1, points.length - 1),
    a = sum(centered.map((p) => p.x * p.x)) / den,
    b = sum(centered.map((p) => p.x * p.y)) / den,
    d = sum(centered.map((p) => p.y * p.y)) / den;
  const theta = 0.5 * Math.atan2(2 * b, a - d),
    e = [Math.cos(theta), Math.sin(theta)],
    root = Math.hypot(a - d, 2 * b),
    values = [(a + d + root) / 2, (a + d - root) / 2];
  return {
    mean,
    cov: [
      [a, b],
      [b, d],
    ],
    e,
    values,
    projected: centered.map((p) => {
      const t = p.x * e[0] + p.y * e[1];
      return { ...p, x: mean.x + t * e[0], y: mean.y + t * e[1] };
    }),
  };
}
export function rnn(xs: number[], wx: number, wh: number, b: number, h0 = 0) {
  let h = h0;
  return xs.map((x, t) => {
    const previous = h,
      z = wx * x + wh * h + b;
    h = Math.tanh(z);
    return { t, x, previous, z, h, gradient: 1 - h * h };
  });
}
export type GateWeights = { w: number; u: number; b: number };
export const defaultGates: GateWeights[] = [
  { w: 0.5, u: 0.3, b: 1 },
  { w: 0.8, u: 0.2, b: 0 },
  { w: 1, u: 0.4, b: 0 },
  { w: 0.6, u: 0.2, b: 0 },
];
export function lstm(
  xs: number[],
  weights = defaultGates,
  h0 = 0,
  c0 = 0,
  manual?: number[],
) {
  let h = h0,
    c = c0;
  return xs.map((x, t) => {
    const previousH = h,
      previousC = c,
      z = weights.map((g) => g.w * x + g.u * h + g.b),
      f = manual?.[0] ?? sigmoid(z[0]),
      i = manual?.[1] ?? sigmoid(z[1]),
      g = Math.tanh(z[2]),
      o = manual?.[2] ?? sigmoid(z[3]);
    c = f * c + i * g;
    h = o * Math.tanh(c);
    return { t, x, previousH, previousC, z, f, i, g, o, c, h };
  });
}
export function gru(xs: number[], w = 0.8, u = 0.5, b = 0, h0 = 0) {
  let h = h0;
  return xs.map((x, t) => {
    const previous = h,
      z = sigmoid(w * x + u * h + b),
      r = sigmoid(w * x - u * h + b),
      candidate = Math.tanh(w * x + u * r * h + b);
    h = (1 - z) * candidate + z * h;
    return { t, x, previous, z, r, candidate, h };
  });
}
export const optimizers = [
  "Batch GD",
  "SGD",
  "Momentum",
  "Nesterov",
  "AdaGrad",
  "RMSProp",
  "Adam",
] as const;
export type Optimizer = (typeof optimizers)[number];
export function optimize(
  kind: Optimizer,
  start: number[],
  lr: number,
  steps: number,
  landscape = "Bowl",
  decay = 0,
) {
  let p = [...start];
  const m = p.map(() => 0),
    v = [...m];
  const history = [
      { p: [...p], loss: objective(p, landscape), g: p.map(() => 0) },
    ],
    rng = random(42);
  for (let t = 1; t <= steps; t++) {
    const eta = lr / (1 + decay * (t - 1));
    const look =
      kind === "Nesterov" ? p.map((x, i) => x - eta * 0.9 * m[i]) : p;
    let g = gradient(look, landscape);
    if (kind === "SGD") {
      const sample = (rng() - 0.5) * 1.2;
      g = g.map((x) => x + sample);
    }
    p = p.map((x, i) => {
      m[i] = 0.9 * m[i] + (kind === "Adam" ? 0.1 : 1) * g[i];
      v[i] =
        (kind === "AdaGrad" ? v[i] : (kind === "Adam" ? 0.999 : 0.9) * v[i]) +
        (kind === "AdaGrad" ? 1 : kind === "Adam" ? 0.001 : 0.1) * g[i] ** 2;
      const d =
        kind === "Adam"
          ? m[i] / (1 - 0.9 ** t) / (Math.sqrt(v[i] / (1 - 0.999 ** t)) + 1e-8)
          : ["AdaGrad", "RMSProp"].includes(kind)
            ? g[i] / (Math.sqrt(v[i]) + 1e-8)
            : ["Momentum", "Nesterov"].includes(kind)
              ? m[i]
              : g[i];
      return x - eta * d;
    });
    if (p.some((x) => !Number.isFinite(x) || Math.abs(x) > 1e6)) break;
    history.push({ p: [...p], loss: objective(p, landscape), g });
  }
  return history;
}
export const objective = (p: number[], kind = "Bowl") =>
  kind === "Ripples"
    ? sum(p.map((x) => 0.2 * x * x + Math.sin(3 * x)))
    : sum(p.map((x, i) => (i ? 3 : 1) * x * x));
export const gradient = (p: number[], kind = "Bowl") =>
  p.map((x, i) =>
    kind === "Ripples" ? 0.4 * x + 3 * Math.cos(3 * x) : 2 * (i ? 3 : 1) * x,
  );
export function metrics(truth: number[], scores: number[], threshold: number) {
  let tp = 0,
    fp = 0,
    tn = 0,
    fn = 0;
  truth.forEach((y, i) => {
    if (scores[i] >= threshold) {
      if (y) tp++;
      else fp++;
    } else if (y) fn++;
    else tn++;
  });
  const div = (a: number, b: number) => (b ? a / b : 0);
  return {
    tp,
    fp,
    tn,
    fn,
    accuracy: div(tp + tn, truth.length),
    precision: div(tp, tp + fp),
    recall: div(tp, tp + fn),
    specificity: div(tn, tn + fp),
    f1: div(2 * tp, 2 * tp + fp + fn),
  };
}
