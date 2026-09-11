import { distance, dot, random, sigmoid, sum, type Point } from "./math";
export function knn(
  points: Point[],
  q: Point,
  k: number,
  metric = "Euclidean",
) {
  const neighbors = points
    .map((p) => ({
      p,
      d:
        metric === "Manhattan"
          ? Math.abs(p.x - q.x) + Math.abs(p.y - q.y)
          : distance(p, q),
    }))
    .sort((a, b) => a.d - b.d)
    .slice(0, k);
  return {
    neighbors,
    probability:
      sum(neighbors.map((n) => n.p.label)) / Math.max(1, neighbors.length),
  };
}
export function naiveBayes(points: Point[], q: Point) {
  const logs = [0, 1].map((c) => {
    const group = points.filter((p) => p.label === c);
    if (!group.length) return -Infinity;
    return (
      Math.log(group.length / points.length) +
      sum(
        (["x", "y"] as const).map((key) => {
          const mean = sum(group.map((p) => p[key])) / group.length,
            variance = Math.max(
              1e-4,
              sum(group.map((p) => (p[key] - mean) ** 2)) / group.length,
            );
          return (
            -0.5 * Math.log(2 * Math.PI * variance) -
            (q[key] - mean) ** 2 / (2 * variance)
          );
        }),
      )
    );
  });
  const m = Math.max(...logs),
    es = logs.map((v) => Math.exp(v - m));
  return es[1] / sum(es);
}
export type Tree = {
  prob: number;
  n: number;
  impurity: number;
  feature?: "x" | "y";
  threshold?: number;
  left?: Tree;
  right?: Tree;
};
export function tree(
  points: Point[],
  depth = 3,
  criterion = "Gini",
  features: ("x" | "y")[] = ["x", "y"],
): Tree {
  const impurity = (ps: Point[]) => {
    if (!ps.length) return 0;
    const p = sum(ps.map((p) => p.label)) / ps.length;
    return criterion === "Entropy"
      ? -(p ? p * Math.log2(p) : 0) - (1 - p ? (1 - p) * Math.log2(1 - p) : 0)
      : 2 * p * (1 - p);
  };
  const node: Tree = {
    prob: sum(points.map((p) => p.label)) / Math.max(1, points.length),
    n: points.length,
    impurity: impurity(points),
  };
  if (depth === 0 || node.impurity === 0 || points.length < 2) return node;
  let best = Infinity;
  for (const feature of features) {
    const values = [...new Set(points.map((p) => p[feature]))].sort(
      (a, b) => a - b,
    );
    for (let i = 1; i < values.length; i++) {
      const threshold = (values[i] + values[i - 1]) / 2,
        left = points.filter((p) => p[feature] <= threshold),
        right = points.filter((p) => p[feature] > threshold),
        cost =
          (left.length * impurity(left) + right.length * impurity(right)) /
          points.length;
      if (cost < best) {
        best = cost;
        node.feature = feature;
        node.threshold = threshold;
      }
    }
  }
  if (node.feature) {
    node.left = tree(
      points.filter((p) => p[node.feature!] <= node.threshold!),
      depth - 1,
      criterion,
      features,
    );
    node.right = tree(
      points.filter((p) => p[node.feature!] > node.threshold!),
      depth - 1,
      criterion,
      features,
    );
  }
  return node;
}
export const treePredict = (t: Tree, q: Point): number =>
  t.feature
    ? treePredict(q[t.feature] <= t.threshold! ? t.left! : t.right!, q)
    : t.prob;
export function forest(points: Point[], count: number, seed: number) {
  const rng = random(seed);
  return Array.from({ length: count }, () =>
    tree(
      points.map(() => points[Math.floor(rng() * points.length)]),
      4,
      "Gini",
      [rng() < 0.5 ? "x" : "y"],
    ),
  );
}
/** Bounded kernel soft-margin SVM dual coordinate ascent, with paired updates preserving Σαᵢyᵢ=0. */
export function svm(points: Point[], C = 1, kernel = "Linear") {
  const y = points.map((p) => (p.label ? 1 : -1)),
    n = points.length,
    a = Array(n).fill(0),
    K = (p: Point, q: Point) =>
      kernel === "RBF"
        ? Math.exp(-(distance(p, q) ** 2))
        : p.x * q.x + p.y * q.y;
  const gram = points.map((p) => points.map((q) => K(p, q)));
  let b = 0;
  for (let pass = 0; pass < 30; pass++) {
    for (let i = 0; i < n; i++) {
      const Ei = sum(a.map((v, k) => v * y[k] * gram[k][i])) + b - y[i];
      if (!(
        (y[i] * Ei < -0.001 && a[i] < C) ||
        (y[i] * Ei > 0.001 && a[i] > 0)
      ))
        continue;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const Ej = sum(a.map((v, k) => v * y[k] * gram[k][j])) + b - y[j],
          ai = a[i],
          aj = a[j],
          L = y[i] !== y[j] ? Math.max(0, aj - ai) : Math.max(0, ai + aj - C),
          H = y[i] !== y[j] ? Math.min(C, C + aj - ai) : Math.min(C, ai + aj);
        const eta = 2 * gram[i][j] - gram[i][i] - gram[j][j];
        if (L === H || eta >= 0) continue;
        a[j] = Math.max(L, Math.min(H, aj - (y[j] * (Ei - Ej)) / eta));
        if (Math.abs(a[j] - aj) < 1e-6) {
          a[j] = aj;
          continue;
        }
        a[i] = ai + y[i] * y[j] * (aj - a[j]);
        const b1 =
            b -
            Ei -
            y[i] * (a[i] - ai) * gram[i][i] -
            y[j] * (a[j] - aj) * gram[i][j],
          b2 =
            b -
            Ej -
            y[i] * (a[i] - ai) * gram[i][j] -
            y[j] * (a[j] - aj) * gram[j][j];
        b =
          a[i] > 0 && a[i] < C ? b1 : a[j] > 0 && a[j] < C ? b2 : (b1 + b2) / 2;
        break;
      }
    }
  }
  return {
    a,
    b,
    predict: (q: Point) => sum(a.map((v, i) => v * y[i] * K(points[i], q))) + b,
  };
}
export function dbscan(points: Point[], eps: number, minPts: number) {
  const labels = points.map(() => -2),
    neighbors = (i: number) =>
      points
        .map((_, j) => j)
        .filter((j) => distance(points[i], points[j]) <= eps);
  let cluster = 0;
  for (let i = 0; i < points.length; i++) {
    if (labels[i] !== -2) continue;
    const ns = neighbors(i);
    if (ns.length < minPts) {
      labels[i] = -1;
      continue;
    }
    labels[i] = cluster;
    const queue = new Set(ns);
    for (const j of queue) {
      if (labels[j] === -1) labels[j] = cluster;
      if (labels[j] !== -2) continue;
      labels[j] = cluster;
      const next = neighbors(j);
      if (next.length >= minPts) next.forEach((k) => queue.add(k));
    }
    cluster++;
  }
  return points.map((p, i) => ({
    ...p,
    label: labels[i],
    core: neighbors(i).length >= minPts,
  }));
}
export function polynomial(points: Point[], degree: number, lambda = 1e-6) {
  const features = (x: number) =>
      Array.from({ length: degree + 1 }, (_, i) => (x / 3) ** i),
    rows = points.map((p) => features(p.x)),
    n = degree + 1,
    A = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) =>
        j === n
          ? sum(rows.map((r, k) => r[i] * points[k].y))
          : sum(rows.map((r) => r[i] * r[j])) + (i === j ? lambda : 0),
      ),
    );
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let j = i + 1; j < n; j++)
      if (Math.abs(A[j][i]) > Math.abs(A[pivot][i])) pivot = j;
    [A[i], A[pivot]] = [A[pivot], A[i]];
    const div = A[i][i] || 1e-12;
    for (let j = i; j <= n; j++) A[i][j] /= div;
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = A[k][i];
      for (let j = i; j <= n; j++) A[k][j] -= factor * A[i][j];
    }
  }
  const w = A.map((r) => r[n]);
  return { w, predict: (x: number) => dot(w, features(x)) };
}
export function perceptronStep(
  points: Point[],
  w: number[],
  lr: number,
  index: number,
) {
  const p = points[index % points.length],
    error = p.label - +(dot(w, [p.x, p.y, 1]) >= 0);
  return { w: w.map((v, i) => v + lr * error * [p.x, p.y, 1][i]), error, p };
}
export function logisticStep(points: Point[], w: number[], lr: number) {
  return w.map(
    (v, i) =>
      v -
      (lr *
        sum(
          points.map(
            (p) =>
              (sigmoid(dot(w, [p.x, p.y, 1])) - p.label) * [p.x, p.y, 1][i],
          ),
        )) /
        points.length,
  );
}
