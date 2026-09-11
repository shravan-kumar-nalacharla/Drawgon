import { describe, it, expect } from "vitest";
import {
  activation,
  derivative,
  neuron,
  softmax,
  network,
  backprop,
  convolve,
  pool,
  rnn,
  lstm,
  gru,
  assign,
  centroids,
  pca,
  metrics,
  optimize,
  dataset,
} from "../src/visualizer/engine/math";
import {
  polynomial,
  svm,
  tree,
  treePredict,
  knn,
  dbscan,
  perceptronStep,
} from "../src/visualizer/engine/classical";
import { epoch, type TrainState } from "../src/visualizer/engine/training";
import { ganInitial, ganStep } from "../src/visualizer/engine/generative";
import { connections, modelSchema } from "../src/visualizer/engine/model";
import { neuronSchema } from "../src/visualizer/state/experiment";
import { preprocess, scalarLoss } from "../src/visualizer/engine/preprocessing";
import {
  vaeInitial,
  vaeForward,
  vaeGradients,
  convAEInitial,
  convAEForward,
  convAETrain,
} from "../src/visualizer/engine/autoencoder";
describe("visualizer numerical engines", () => {
  it("imputes missing values and transforms constant and varying features", () => {
    expect(preprocess([2, null, 6], "Mean imputation").output).toEqual([
      2, 4, 6,
    ]);
    expect(preprocess([5, 5], "Z-score").output).toEqual([0, 0]);
    expect(preprocess([2, 4, 6], "Min-max").output).toEqual([0, 0.5, 1]);
    expect(scalarLoss("Huber", 1, 0)).toBeCloseTo(0.375);
    expect(scalarLoss("Log-cosh", 0, 0)).toBeCloseTo(0);
  });
  it("validates model configuration and finds declared graph edges", () => {
    const model = modelSchema.parse({
      class_name: "Functional",
      config: {
        layers: [
          { class_name: "InputLayer", config: { name: "x" } },
          {
            class_name: "Dense",
            config: { name: "y" },
            inbound_nodes: [[["x", 0, 0, {}]]],
          },
        ],
      },
    });
    expect(connections(model)).toEqual([{ source: 0, target: 1 }]);
    expect(modelSchema.safeParse({ config: { layers: [] } }).success).toBe(
      false,
    );
    expect(
      neuronSchema.safeParse({
        version: 1,
        topic: "neuron",
        x: [1, 0, 0],
        w: [Infinity, 0, 0],
        b: 0,
        act: "Sigmoid",
        step: 0,
      }).success,
    ).toBe(false);
  });
  it("checks variational gradients with identical sampled noise", () => {
    const m = vaeInitial(),
      x = [1, 0, 1, 0, 0, 0, 0, 0],
      beta = 0.1,
      g = vaeGradients(m, x, beta, 7),
      epsilon = 1e-5;
    for (const key of ["mu", "lv", "decoder"] as const) {
      m[key].forEach((row, i) =>
        row.forEach((_, j) => {
          const plus = structuredClone(m),
            minus = structuredClone(m);
          plus[key][i][j] += epsilon;
          minus[key][i][j] -= epsilon;
          const a = vaeForward(plus, x, 7),
            b = vaeForward(minus, x, 7);
          expect(g[key][i][j]).toBeCloseTo(
            (a.reconstruction + beta * a.kl - b.reconstruction - beta * b.kl) /
              (2 * epsilon),
            6,
          );
        }),
      );
    }
  });
  it("reduces actual convolutional reconstruction loss", () => {
    const m = convAEInitial(),
      x = [
        [0, 0, 1, 0],
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 1, 0],
      ],
      next = convAETrain(m, x, 0.1);
    expect(convAEForward(next, x).loss).toBeLessThan(convAEForward(m, x).loss);
  });
  it("evaluates stable activations and neuron terms", () => {
    expect(activation(0, "Sigmoid")).toBe(0.5);
    expect(activation(-1, "ReLU")).toBe(0);
    expect(activation(1000, "Softplus")).toBe(1000);
    expect(neuron([1, 0.5], [0.7, -0.3], 0.1, "Linear").a).toBeCloseTo(0.65);
    expect(derivative(0, "Tanh")).toBe(1);
  });
  it("normalizes large logits without overflow", () => {
    const p = softmax([1000, 1001, 1002]);
    expect(p.reduce((a, b) => a + b)).toBeCloseTo(1);
    expect(p[2]).toBeGreaterThan(p[0]);
    expect(() => softmax([1], 0)).toThrow();
  });
  it("checks every network weight and bias gradient by central differences", () => {
    const net = network([2, 3, 2, 1], 9),
      x = [0.7, -0.3],
      target = [1],
      g = backprop(net, x, target),
      epsilon = 1e-5;
    net.w.forEach((layer, l) =>
      layer.forEach((row, j) =>
        row.forEach((_, i) => {
          const plus = structuredClone(net),
            minus = structuredClone(net);
          plus.w[l][j][i] += epsilon;
          minus.w[l][j][i] -= epsilon;
          const numeric =
            (backprop(plus, x, target).loss - backprop(minus, x, target).loss) /
            (2 * epsilon);
          expect(g.gw[l][j][i]).toBeCloseTo(numeric, 7);
        }),
      ),
    );
    net.b.forEach((row, l) =>
      row.forEach((_, j) => {
        const plus = structuredClone(net),
          minus = structuredClone(net);
        plus.b[l][j] += epsilon;
        minus.b[l][j] -= epsilon;
        expect(g.gb[l][j]).toBeCloseTo(
          (backprop(plus, x, target).loss - backprop(minus, x, target).loss) /
            (2 * epsilon),
          7,
        );
      }),
    );
  });
  it("convolves known matrices with stride and padding", () => {
    expect(
      convolve(
        [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9],
        ],
        [
          [1, 0],
          [0, -1],
        ],
      ),
    ).toEqual([
      [-4, -4],
      [-4, -4],
    ]);
    expect(
      convolve(
        [
          [1, 2],
          [3, 4],
        ],
        [[1]],
        2,
      ),
    ).toEqual([[1]]);
    expect(convolve([[1]], [[1]], 1, 1)).toEqual([
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
    ]);
    expect(() => convolve([[1]], [[1]], 0)).toThrow();
    expect(() =>
      convolve(
        [[1]],
        [
          [1, 1],
          [1, 1],
        ],
      ),
    ).toThrow();
  });
  it("pools exact max and average", () => {
    expect(
      pool(
        [
          [1, 2],
          [3, 4],
        ],
        2,
        2,
      ),
    ).toEqual([[4]]);
    expect(
      pool(
        [
          [1, 2],
          [3, 4],
        ],
        2,
        2,
        "Average",
      ),
    ).toEqual([[2.5]]);
  });
  it("computes known recurrent states and gates", () => {
    expect(rnn([1], 0.5, 0.2, 0)[0].h).toBeCloseTo(Math.tanh(0.5));
    const l = lstm(
      [0],
      [
        { w: 0, u: 0, b: 0 },
        { w: 0, u: 0, b: 0 },
        { w: 0, u: 0, b: 0 },
        { w: 0, u: 0, b: 0 },
      ],
      0,
      2,
    )[0];
    expect(l.f).toBe(0.5);
    expect(l.c).toBe(1);
    expect(l.h).toBeCloseTo(0.5 * Math.tanh(1));
    expect(gru([0], 0, 0, 0, 1)[0].h).toBe(0.5);
  });
  it("assigns and averages clusters, preserving empty centers", () => {
    const ps = [
        { x: 0, y: 0, label: 0 },
        { x: 2, y: 0, label: 0 },
        { x: 10, y: 0, label: 0 },
      ],
      cs = [
        { x: 0, y: 0, label: 0 },
        { x: 10, y: 0, label: 1 },
      ];
    const assigned = assign(ps, cs);
    expect(assigned.map((p) => p.label)).toEqual([0, 0, 1]);
    expect(centroids(assigned, cs)[0].x).toBe(1);
  });
  it("computes PCA covariance and explained directions", () => {
    const p = pca([
      { x: -1, y: -1, label: 0 },
      { x: 0, y: 0, label: 0 },
      { x: 1, y: 1, label: 0 },
    ]);
    expect(p.values[0]).toBeCloseTo(2);
    expect(p.values[1]).toBeCloseTo(0);
    expect(Math.abs(p.e[0])).toBeCloseTo(Math.SQRT1_2);
  });
  it("fits regression, classifies neighbors and tree leaves", () => {
    const ps = [
      { x: -1, y: -1, label: 0 },
      { x: 0, y: 1, label: 0 },
      { x: 1, y: 3, label: 1 },
    ];
    expect(polynomial(ps, 1, 0).predict(2)).toBeCloseTo(5);
    expect(knn(ps, { x: 1, y: 3, label: 0 }, 1).probability).toBe(1);
    expect(treePredict(tree(ps), ps[2])).toBe(1);
    expect(perceptronStep(ps, [0, 0, 0], 0.1, 0).w).not.toEqual([0, 0, 0]);
  });
  it("finds separating support vectors and density noise", () => {
    const ps = [
      { x: -1, y: 0, label: 0 },
      { x: -2, y: 0, label: 0 },
      { x: 1, y: 0, label: 1 },
      { x: 2, y: 0, label: 1 },
    ];
    const s = svm(ps);
    expect(s.predict(ps[0])).toBeLessThan(0);
    expect(s.predict(ps[3])).toBeGreaterThan(0);
    expect(dbscan(ps, 0.1, 2).every((p) => p.label === -1)).toBe(true);
  });
  it("computes confusion counts and a descending optimizer path", () => {
    expect(metrics([1, 0, 1, 0], [0.9, 0.8, 0.4, 0.1], 0.5)).toMatchObject({
      tp: 1,
      fp: 1,
      fn: 1,
      tn: 1,
      accuracy: 0.5,
    });
    const h = optimize("Batch GD", [2, 1], 0.1, 10);
    expect(h.at(-1)!.loss).toBeLessThan(h[0].loss);
  });
  it("trains real data and respects frozen parameters", () => {
    const samples = dataset("Blobs", 42, 20).map((p) => ({
      x: [p.x, p.y],
      y: [p.label],
    }));
    let s: TrainState = {
      net: network([2, 3, 1]),
      epoch: 0,
      loss: 0,
      validation: 0,
      history: [],
      velocity: [],
      variance: [],
    };
    const opts = {
      lr: 0.05,
      lambda: 0,
      penalty: "None",
      dropout: 0,
      seed: 42,
      freeze: 0,
      batch: 20,
      optimizer: "Adam",
    };
    s = epoch(s, samples, samples, opts);
    const first = s.loss;
    for (let i = 0; i < 30; i++) s = epoch(s, samples, samples, opts);
    expect(s.loss).toBeLessThan(first);
    const next = epoch(s, samples, samples, { ...opts, freeze: 1 });
    expect(next.net.w[0]).toEqual(s.net.w[0]);
    expect(next.net.w[1]).not.toEqual(s.net.w[1]);
  });
  it("updates only the selected GAN player", () => {
    const s = ganInitial(),
      d = ganStep(s, "D", 0.03),
      g = ganStep(s, "G", 0.03);
    expect(d.g).toEqual(s.g);
    expect(d.d).not.toEqual(s.d);
    expect(g.d).toEqual(s.d);
    expect(g.g).not.toEqual(s.g);
    expect(d.history[0].every(Number.isFinite)).toBe(true);
  });
});
