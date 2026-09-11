import { optimize, objective, gradient, type Optimizer } from "../engine/math";
import { Figure, Formula, fmt } from "../components/Primitives";
import { Edge, Reveal } from "./primitives";
import { lerp, part, type Lesson } from "./timeline";

export function descentLesson(
  kind: Optimizer,
  start: number,
  lr: number,
  landscape: string,
  decay: number,
): Lesson {
  const history = optimize(kind, [start], lr, 12, landscape, decay);
  const loss = (x: number) => objective([x], landscape);
  const last = history.length - 1;
  const range = Math.max(
    3,
    Math.min(10, Math.max(...history.map((h) => Math.abs(h.p[0])))),
  );
  const curve = Array.from(
    { length: 121 },
    (_, i) => -range + (2 * range * i) / 120,
  );
  const min = Math.min(0, ...curve.map(loss)),
    max = Math.max(1, ...curve.map(loss));
  const px = (x: number) => 60 + ((x + range) / range) * 300,
    py = (y: number) => 320 - ((y - min) / (max - min)) * 230;
  const titles = [
    "Find a starting error",
    "Measure the slope",
    "Choose the downhill direction",
    "Take one learning step",
    "Measure again",
    "Keep taking steps",
    "Inspect the result",
  ];
  const explanations = [
    "The point is our current parameter. Its height shows the error.",
    "The tangent describes how error changes near this point.",
    "Gradient descent moves against the slope. Other optimizers modify this update using their history.",
    "The parameter moves to the next position calculated by the optimizer.",
    "At the new position, we measure a new gradient before moving again.",
    "Repeated updates can approach a minimum. A large learning rate can overshoot or diverge.",
    "Compare the final error with the start. Change the learning rate in Playground to explore different outcomes.",
  ];
  return {
    legend: ["Loss curve", "Current parameter / slope"],
    intro:
      "Gradient descent improves a parameter by taking steps toward lower error.",
    why: "Models need a practical way to reduce their mistakes.",
    scenes: titles.map((title, i) => ({
      title,
      explanation: explanations[i],
      duration: i === 5 ? 11000 : 3500,
    })),
    math: (
      <>
        <p>
          This lesson uses a one-parameter slice of the same optimizer used in
          Playground.
        </p>
        <Formula
          symbol="x(new) = x − η∇L (Batch GD)"
          result={`Optimizer: ${kind}; learning rate: ${lr}; decay: ${decay}`}
        />
        {history.slice(1).map((h, i) => (
          <Formula
            key={i}
            symbol={`Update ${i + 1}`}
            substitution={`x ${fmt(history[i].p[0])}; gradient ${fmt(h.g[0])}`}
            result={`x → ${fmt(h.p[0])}; loss ${fmt(h.loss)}`}
          />
        ))}
      </>
    ),
    render: (s, p) => {
      const step =
        s < 3
          ? 0
          : s === 3
            ? part(p, 0, 0.85)
            : s === 4
              ? 1
              : s === 5
                ? 1 + (last - 1) * p
                : last;
      const i = Math.min(last - 1, Math.floor(step)),
        fraction = step - i,
        x = lerp(history[i].p[0], history[i + 1].p[0], fraction),
        y = loss(x);
      const g = gradient([x], landscape)[0],
        tangent = (v: number) => y + g * (v - x);
      return (
        <Figure title="Watch the parameter move on the loss curve" height={440}>
          <path
            d={curve
              .map((v, i) => `${i ? "L" : "M"}${px(v)},${py(loss(v))}`)
              .join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <text x="25" y="65" fill="currentColor">
            Loss
          </text>
          <text x="360" y="348" fill="currentColor" textAnchor="middle">
            Parameter x
          </text>
          {Math.abs(x) <= range && (
            <>
              <Reveal progress={s >= 1 ? 1 : 0}>
                <Edge
                  from={[px(x - 0.35), py(tangent(x - 0.35))]}
                  to={[px(x + 0.35), py(tangent(x + 0.35))]}
                  progress={s === 1 ? p : 1}
                  active
                />
              </Reveal>
              {s === 2 && (
                <>
                  <Edge
                    from={[px(x), py(y) - 30]}
                    to={[lerp(px(x), px(history[1].p[0]), p), py(y) - 30]}
                    active
                  />
                  <text
                    x={px(x)}
                    y={py(y) - 45}
                    fill="currentColor"
                    textAnchor="middle"
                  >
                    {history[1].p[0] < x ? "←" : "→"} update direction
                  </text>
                </>
              )}
              <circle
                data-moving-point
                cx={px(x)}
                cy={py(y)}
                r="8"
                fill="var(--vl-active)"
              />
            </>
          )}
          <text x="360" y="383" textAnchor="middle" fill="currentColor">
            x {fmt(x)} · Loss {fmt(y)} · Learning rate {fmt(lr)}
          </text>
          {s >= 1 && (
            <text x="360" y="412" textAnchor="middle" fill="currentColor">
              Gradient {fmt(g)}
              {Math.abs(x) > range
                ? " · Parameter has left the visible range"
                : ""}
            </text>
          )}
        </Figure>
      );
    },
  };
}
