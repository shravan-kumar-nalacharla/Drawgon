import { neuron, sum, type Activation } from "../engine/math";
import { Figure, Formula, fmt } from "../components/Primitives";
import { Edge, Node, Signal, Reveal, NumberText } from "./primitives";
import { part, revealed, type Lesson } from "./timeline";

export function neuronLesson(
  x: number[],
  w: number[],
  b: number,
  act: Activation,
): Lesson {
  const n = neuron(x, w, b, act),
    total = sum(n.terms);
  return {
    intro:
      "A neuron weighs the information it receives, combines it, and produces one response.",
    why: "Large neural networks are built from many of these small units.",
    scenes: [
      [
        "Receive the inputs",
        "These numbers are the information entering the neuron.",
      ],
      [
        "Give each input an importance",
        "Each connection has a weight. Thicker lines mean stronger influence; dashed lines represent negative weights.",
      ],
      [
        "Multiply inputs by weights",
        "Each input travels along its connection and is multiplied by that connection’s weight.",
      ],
      [
        "Combine the contributions",
        "The weighted inputs meet inside the neuron and are added together.",
      ],
      ["Add a bias", "Bias shifts the combined value by an adjustable amount."],
      [
        "Pass through an activation",
        "The activation function transforms the combined value into a response.",
      ],
      [
        "Send the output onward",
        "This response can become an input to another neuron.",
      ],
    ].map(([title, explanation]) => ({ title, explanation, duration: 4000 })),
    math: (
      <>
        <Formula
          symbol="z = Σ xᵢwᵢ + b"
          substitution={`${n.terms.map(fmt).join(" + ")} + ${fmt(b)}`}
          result={`z = ${fmt(n.z)}`}
        />
        <Formula
          symbol={`a = ${act}(z)`}
          substitution={`${act}(${fmt(n.z)})`}
          result={`Output = ${fmt(n.a)}`}
        />
        {n.terms.map((v, i) => (
          <Formula
            key={i}
            symbol={`x${i + 1} × w${i + 1}`}
            substitution={`${fmt(x[i])} × ${fmt(w[i])}`}
            result={fmt(v)}
          />
        ))}
      </>
    ),
    render: (s, p) => (
      <Figure title="Build one artificial neuron" height={420}>
        <text x="80" y="65" textAnchor="middle" fill="currentColor">
          Input layer
        </text>
        {x.map((v, i) => {
          const y = 120 + i * 105;
          return (
            <g key={i}>
              <Reveal progress={revealed(s, 1, p)}>
                <Edge
                  from={[115, y]}
                  to={[330, 225]}
                  weight={w[i]}
                  progress={revealed(s, 1, part(p, 0, 0.65))}
                />
                <text x="190" y={y - 22} fill="currentColor">
                  w{i + 1} = {fmt(w[i])}
                </text>
              </Reveal>
              <Reveal progress={s > 0 ? 1 : part(p, i / 3, (i + 1) / 3)}>
                <Node at={[80, y]} value={v} label={`x${i + 1}`} />
              </Reveal>
              {s === 2 && (
                <Signal
                  from={[115, y]}
                  to={[245, (y + 225) / 2]}
                  progress={part(p, 0, 0.75)}
                  value={p < 0.5 ? v : n.terms[i]}
                />
              )}
              {s === 3 && (
                <Signal
                  from={[245, (y + 225) / 2]}
                  to={[360, 225]}
                  progress={part(p, 0, 0.7)}
                  value={n.terms[i]}
                />
              )}
            </g>
          );
        })}
        <Reveal progress={revealed(s, 1, p)}>
          <Node
            at={[360, 225]}
            value={s < 3 ? "Σ" : ""}
            label={s >= 4 ? "Combined value" : "Weighted sum"}
          />
        </Reveal>
        {s >= 3 && (
          <NumberText
            x={360}
            y={230}
            from={s === 3 ? 0 : total}
            to={s >= 4 ? n.z : total}
            progress={s === 3 ? part(p, 0.6, 1) : s === 4 ? p : 1}
          />
        )}
        <Reveal progress={revealed(s, 4, p)}>
          <text x="360" y="105" textAnchor="middle" fill="currentColor">
            Bias {fmt(b)}
          </text>
          <Edge
            from={[360, 120]}
            to={[360, 185]}
            progress={revealed(s, 4, p)}
          />
        </Reveal>
        {s === 4 && (
          <Signal from={[360, 120]} to={[360, 190]} progress={p} value={b} />
        )}
        <Reveal progress={revealed(s, 5, p)}>
          <Edge
            from={[395, 225]}
            to={[465, 225]}
            progress={revealed(s, 5, p)}
          />
          <rect
            x="465"
            y="175"
            width="90"
            height="100"
            rx="8"
            fill="var(--vl-paper)"
            stroke="var(--vl-active)"
          />
          <text x="510" y="205" textAnchor="middle" fill="currentColor">
            {act}
          </text>
          <NumberText
            x={510}
            y={242}
            from={n.z}
            to={n.a}
            progress={s === 5 ? part(p, 0.35, 0.9) : 1}
          />
        </Reveal>
        <Reveal progress={revealed(s, 6, p)}>
          <Edge from={[555, 225]} to={[610, 225]} progress={p} />
          <Node
            at={[650, 225]}
            value={p > 0.75 ? n.a : ""}
            label="Output layer"
          />
        </Reveal>
        {s === 6 && (
          <Signal
            from={[555, 225]}
            to={[650, 225]}
            progress={part(p, 0, 0.75)}
            value={n.a}
          />
        )}
      </Figure>
    ),
  };
}
