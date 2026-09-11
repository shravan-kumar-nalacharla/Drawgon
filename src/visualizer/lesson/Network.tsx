import { backprop, type Network } from "../engine/math";
import { Figure, Formula, fmt } from "../components/Primitives";
import { Edge, Node, Reveal, Signal, type Point } from "./primitives";
import { part, revealed, lerp, type Lesson } from "./timeline";

export function networkLesson(
  net: Network,
  x: number[],
  target: number,
  lr: number,
  forwardOnly = false,
): Lesson {
  const g = backprop(net, x, [target]);
  const updated = {
    ...net,
    w: net.w.map((layer, l) =>
      layer.map((row, j) => row.map((w, i) => w - lr * g.gw[l][j][i])),
    ),
    b: net.b.map((row, l) => row.map((v, j) => v - lr * g.gb[l][j])),
  };
  const after = backprop(updated, x, [target]);
  const copy = [
    [
      "Inputs enter the network",
      "The input layer holds the measured features. It passes these values to the hidden layer.",
    ],
    [
      "Compute the hidden layer",
      "Values travel along weighted connections. Each hidden neuron adds a bias and applies its activation.",
    ],
    [
      "Produce a prediction",
      "Hidden activations become inputs to the output neuron. Its response is the prediction.",
    ],
    [
      "Compare with the target",
      "The target is the answer we wanted. The difference tells us how far the prediction missed.",
    ],
    [
      "Measure the error",
      "A loss turns that difference into a single number to minimize.",
    ],
    [
      "Send responsibility backward",
      "Error information now travels from the output toward the hidden layer, in the opposite direction to prediction.",
    ],
    [
      "Calculate the output gradient",
      "The output activation’s derivative tells us how a small change would affect the loss.",
    ],
    [
      "Branch into hidden gradients",
      "The chain rule carries each downstream contribution back through the hidden neurons.",
    ],
    [
      "Adjust the weights",
      "Subtract learning rate times gradient. The selected connection updates first, followed by the other weights and biases.",
    ],
    [
      "Predict again",
      "Run the updated network forward. Compare its actual loss with the previous loss.",
    ],
  ];
  const at = (l: number, i: number): Point => [
    90 + l * 260,
    l === 2 ? 220 : 155 + i * 135,
  ];
  return {
    intro: forwardOnly
      ? "A forward pass turns inputs into a prediction, one layer at a time."
      : "Backpropagation works out how each weight affected an error, so the network can improve.",
    why: forwardOnly
      ? "Every neural-network prediction is built from these layer-by-layer calculations."
      : "A network needs a way to adjust many weights using one measured error.",
    scenes: copy
      .slice(0, forwardOnly ? 3 : 10)
      .map(([title, explanation]) => ({ title, explanation, duration: 4500 })),
    math: (
      <>
        <Formula
          symbol="a = activation(Wa(previous) + b)"
          result={`Hidden activations: ${g.a[1].map(fmt).join(", ")}; Prediction: ${fmt(g.a[2][0])}`}
        />
        {g.z.map((row, l) =>
          row.map((z, j) => (
            <Formula
              key={`z${l}${j}`}
              symbol={`Layer ${l + 1}, neuron ${j + 1}: z = Σwᵢaᵢ + b`}
              substitution={`${net.w[l][j].map((w, i) => `${fmt(w)} × ${fmt(g.a[l][i])}`).join(" + ")} + ${fmt(net.b[l][j])}`}
              result={`z = ${fmt(z)}; activation = ${fmt(g.a[l + 1][j])}; bias gradient = ${fmt(g.gb[l][j])}`}
            />
          )),
        )}
        <Formula
          symbol="L = ½(a − target)²"
          substitution={`½(${fmt(g.a[2][0])} − ${fmt(target)})²`}
          result={fmt(g.loss)}
        />
        {net.w.flatMap((layer, l) =>
          layer.flatMap((row, j) =>
            row.map((w, i) => (
              <Formula
                key={`${l}${j}${i}`}
                symbol={`∂L/∂w${l + 1}.${j + 1}.${i + 1} = δ × input activation`}
                substitution={`${fmt(g.d[l][j])} × ${fmt(g.a[l][i])}`}
                result={`Gradient ${fmt(g.gw[l][j][i])}; weight ${fmt(w)} → ${fmt(updated.w[l][j][i])}`}
              />
            )),
          ),
        )}
      </>
    ),
    render: (s, p) => (
      <Figure
        title={
          forwardOnly
            ? "From inputs to prediction"
            : "Predict → measure → propagate backward → update"
        }
        height={450}
      >
        {["Input layer", "Hidden layer", "Output layer"].map((name, l) => (
          <text
            key={name}
            x={90 + l * 260}
            y="70"
            textAnchor="middle"
            fill="currentColor"
            fontWeight="bold"
          >
            {name}
          </text>
        ))}
        {net.w.flatMap((layer, l) =>
          layer.flatMap((row, j) =>
            row.map((w, i) => {
              const a = at(l, i),
                b = at(l + 1, j),
                visible = revealed(s, l + 1, p),
                rev = (s === 5 && l === 1) || s === 7;
              const updatedWeight =
                s === 8
                  ? lerp(
                      w,
                      updated.w[l][j][i],
                      l + j + i === 0 ? part(p, 0, 0.45) : part(p, 0.5, 1),
                    )
                  : s > 8
                    ? updated.w[l][j][i]
                    : w;
              return (
                <Reveal key={`${l}${j}${i}`} progress={visible}>
                  <Edge
                    from={a}
                    to={b}
                    weight={updatedWeight}
                    progress={visible}
                    active={rev || s === l + 1 || s === 8}
                  />
                  {(s === l + 1 || s === 9) && (
                    <Signal
                      from={a}
                      to={b}
                      progress={
                        s === 9
                          ? part(p, l * 0.4, (l + 1) * 0.4)
                          : part(p, 0, 0.75)
                      }
                      value={s === 9 ? after.a[l][i] : g.a[l][i]}
                    />
                  )}
                  {rev && (
                    <Signal
                      from={b}
                      to={a}
                      progress={
                        s === 7 ? part(p, (1 - l) * 0.4, (2 - l) * 0.4) : p
                      }
                      value={g.gw[l][j][i]}
                      backward
                    />
                  )}
                  {s === 8 && (
                    <text
                      x={(a[0] + b[0]) / 2}
                      y={(a[1] + b[1]) / 2 - 18}
                      textAnchor="middle"
                      fill="currentColor"
                    >
                      {fmt(updatedWeight)}
                    </text>
                  )}
                </Reveal>
              );
            }),
          ),
        )}
        {g.a.flatMap((row, l) =>
          row.map((v, i) => (
            <Reveal
              key={`${l}${i}`}
              progress={
                l === 0
                  ? part(p, i * 0.3, (i + 1) * 0.3) + Number(s > 0)
                  : revealed(s, l, part(p, 0.65, 1))
              }
            >
              <Node
                at={at(l, i)}
                value={s === 9 && p > (l + 1) * 0.25 ? after.a[l][i] : v}
                label={
                  l === 0 ? `x${i + 1}` : l === 1 ? `h${i + 1}` : "Prediction"
                }
                active={s === l}
              />
            </Reveal>
          )),
        )}
        {s >= 3 && (
          <text x="360" y="370" textAnchor="middle" fill="currentColor">
            {s === 9 ? "Before update: " : ""}Target {fmt(target)} · Difference{" "}
            {fmt(g.a[2][0] - target)}
            {s >= 4 ? ` · Loss ${fmt(g.loss)}` : ""}
          </text>
        )}
        {s === 6 && (
          <text x="360" y="410" textAnchor="middle" fill="currentColor">
            Output δ = {fmt(g.d[1][0])}
          </text>
        )}
        {s === 7 && (
          <text x="360" y="410" textAnchor="middle" fill="currentColor">
            Hidden δ: {g.d[0].map(fmt).join(" · ")}
          </text>
        )}
        {s === 8 && (
          <text x="360" y="410" textAnchor="middle" fill="currentColor">
            {fmt(net.w[0][0][0])} − {fmt(lr)} × {fmt(g.gw[0][0][0])} ={" "}
            {fmt(updated.w[0][0][0])}
          </text>
        )}
        {s === 9 && (
          <text x="360" y="410" textAnchor="middle" fill="currentColor">
            New loss: {fmt(after.loss)} · Previous: {fmt(g.loss)}
          </text>
        )}
      </Figure>
    ),
  };
}
