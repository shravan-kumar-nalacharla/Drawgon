import { backprop, forward, random, sum, type Network } from "./math";
export type Sample = { x: number[]; y: number[] };
export type TrainOptions = {
  lr: number;
  lambda: number;
  penalty: string;
  dropout: number;
  seed: number;
  freeze: number;
  batch: number;
  optimizer: string;
};
export type TrainState = {
  net: Network;
  epoch: number;
  loss: number;
  validation: number;
  history: number[][];
  velocity: number[];
  variance: number[];
};
export function epoch(
  state: TrainState,
  samples: Sample[],
  validation: Sample[],
  options: TrainOptions,
): TrainState {
  const { lr, lambda, penalty, dropout, freeze, batch, optimizer } = options,
    net = structuredClone(state.net),
    rng = random(options.seed + state.epoch),
    shuffled = [...samples];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const selected = shuffled.slice(0, Math.min(samples.length, batch));
  const masks = net.b.map((b, l) =>
    b.map(() =>
      l === net.b.length - 1
        ? 1
        : dropout && rng() < dropout
          ? 0
          : 1 / (1 - dropout),
    ),
  );
  // A fixed mask for this mini-batch implements inverted dropout as scaled outgoing weights.
  const effective = structuredClone(net);
  effective.w = net.w.map((layer, l) =>
    layer.map((row) => row.map((v, i) => (l ? v * masks[l - 1][i] : v))),
  );
  const gs = selected.map((s) => backprop(effective, s.x, s.y)),
    velocity = [...state.velocity],
    variance = [...state.variance];
  let cursor = 0;
  const update = (v: number, g: number, l: number) => {
    const i = cursor++;
    if (l < freeze) return v;
    velocity[i] = 0.9 * (velocity[i] ?? 0) + 0.1 * g;
    variance[i] = 0.999 * (variance[i] ?? 0) + 0.001 * g * g;
    return (
      v -
      lr *
        (optimizer === "Adam"
          ? velocity[i] /
            (1 - 0.9 ** (state.epoch + 1)) /
            (Math.sqrt(variance[i] / (1 - 0.999 ** (state.epoch + 1))) + 1e-8)
          : g)
    );
  };
  net.w = net.w.map((layer, l) =>
    layer.map((row, j) =>
      row.map((v, i) =>
        update(
          v,
          (sum(gs.map((g) => g.gw[l][j][i])) / gs.length) *
            (l ? masks[l - 1][i] : 1) +
            (penalty === "L1"
              ? lambda * Math.sign(v)
              : penalty === "L2"
                ? lambda * v
                : 0),
          l,
        ),
      ),
    ),
  );
  net.b = net.b.map((row, l) =>
    row.map((v, j) => update(v, sum(gs.map((g) => g.gb[l][j])) / gs.length, l)),
  );
  const loss = (data: Sample[]) =>
      sum(data.map((s) => backprop(net, s.x, s.y).loss)) / data.length,
    trainLoss = loss(samples),
    valLoss = loss(validation);
  if (
    !Number.isFinite(trainLoss) ||
    net.w.flat(2).some((v) => !Number.isFinite(v) || Math.abs(v) > 1e6)
  )
    throw new Error("Training diverged. Lower the learning rate and reset.");
  return {
    net,
    epoch: state.epoch + 1,
    loss: trainLoss,
    validation: valLoss,
    history: [...state.history, [state.epoch + 1, trainLoss, valLoss]].slice(
      -300,
    ),
    velocity,
    variance,
  };
}
export const evaluate = (net: Network, samples: Sample[]) =>
  sum(
    samples.map((s) => +(+(forward(net, s.x).a.at(-1)![0] >= 0.5) === s.y[0])),
  ) / samples.length;
