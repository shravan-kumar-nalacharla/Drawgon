import { rnn, gru } from "../engine/math";
import { Figure, Formula, fmt } from "../components/Primitives";
import { Edge, Node, Reveal, Signal } from "./primitives";
import { part, type Lesson } from "./timeline";

export function recurrentLesson(
  states: ReturnType<typeof rnn> | ReturnType<typeof gru>,
  gated: boolean,
  gradients?: number[],
): Lesson {
  const phases = [
    "Read an input",
    "Bring the previous state",
    gated ? "Control the memory update" : "Combine input and memory",
    "Pass the new state onward",
  ];
  const scenes = states.flatMap((_, t) =>
    phases.map((title, i) => ({
      title: `Time ${t + 1}: ${title}`,
      explanation: [
        "The sequence supplies one observation at a time.",
        "The recurrent connection brings a summary of earlier observations.",
        gated
          ? "The reset gate controls the candidate; the update gate mixes old memory with that candidate."
          : "The neuron combines the weighted input, previous state and bias, then applies tanh.",
        "The new hidden state becomes the previous state at the next time step.",
      ][i],
      duration: 3000,
    })),
  );
  if (gradients)
    scenes.push(
      ...states.map((_, i) => ({
        title: `Back through time ${states.length - i}`,
        explanation:
          "The sensitivity follows the recurrent connection backward. Repeated derivative factors can make it shrink or grow.",
        duration: 3000,
      })),
    );
  return {
    intro: gated
      ? "A GRU uses gates to choose how much old memory to keep."
      : "A recurrent network carries a hidden state from one observation to the next.",
    why: "Sequential predictions need information from earlier observations.",
    legend: [
      "Recurrent connection →",
      "Current input / state",
      "← Backward sensitivity",
    ],
    scenes,
    math: (
      <>
        {states.map((v, i) => (
          <Formula
            key={i}
            symbol={
              "candidate" in v
                ? "h = (1 − z) × previous h + z × candidate"
                : "h = tanh(Wx × x + Wh × previous h + b)"
            }
            substitution={
              "candidate" in v
                ? `z ${fmt(v.z)}; reset ${fmt(v.r)}; candidate ${fmt(v.candidate)}`
                : `Weighted sum ${fmt(v.z)}`
            }
            result={`Time ${i + 1}: previous ${fmt(v.previous)} → hidden ${fmt(v.h)}${gradients ? `; sensitivity ${fmt(gradients[i])}` : ""}`}
          />
        ))}
      </>
    ),
    render: (scene, p) => {
      const backward = scene >= states.length * 4,
        t = backward
          ? states.length - 1 - (scene - states.length * 4)
          : Math.floor(scene / 4),
        s = scene % 4,
        v = states[t];
      return (
        <Figure
          title={
            backward
              ? "Follow sensitivity backward through time"
              : "A hidden state connects consecutive observations"
          }
          height={410}
        >
          {states.map((a, i) => (
            <g key={i}>
              <text
                x={85 + i * 130}
                y="65"
                textAnchor="middle"
                fill="currentColor"
              >
                Time {i + 1}
              </text>
              <Reveal
                progress={i < t || backward ? 1 : i === t ? part(p, 0, 0.5) : 0}
              >
                <Node
                  at={[85 + i * 130, 235]}
                  value={i < t || backward || s >= 2 ? a.h : "?"}
                  label="Hidden state"
                />
              </Reveal>
              {i < states.length - 1 && (
                <Edge
                  from={[120 + i * 130, 235]}
                  to={[180 + i * 130, 235]}
                  progress={i < t || backward ? 1 : i === t && s === 3 ? p : 0}
                />
              )}
            </g>
          ))}
          {!backward && (
            <>
              <Node at={[85 + t * 130, 115]} value={v.x} label="Input" />
              <Signal
                from={[85 + t * 130, 150]}
                to={[85 + t * 130, 200]}
                progress={s === 0 ? p : 1}
                value={v.x}
              />
              {s === 1 && (
                <Signal
                  from={[Math.max(35, 85 + (t - 1) * 130), 235]}
                  to={[85 + t * 130, 235]}
                  progress={p}
                  value={v.previous}
                />
              )}
              {s === 3 && t < states.length - 1 && (
                <Signal
                  from={[120 + t * 130, 235]}
                  to={[180 + t * 130, 235]}
                  progress={p}
                  value={v.h}
                />
              )}
              <text x="360" y="355" textAnchor="middle" fill="currentColor">
                {s >= 2
                  ? "candidate" in v
                    ? `Reset ${fmt(v.r)} · Update ${fmt(v.z)} · New state ${fmt(v.h)}`
                    : `tanh(${fmt(v.z)}) = ${fmt(v.h)}`
                  : `Previous hidden state: ${fmt(v.previous)}`}
              </text>
            </>
          )}
          {backward && gradients && (
            <Signal
              from={[85 + t * 130, 235]}
              to={[Math.max(35, 85 + (t - 1) * 130), 235]}
              progress={p}
              value={gradients[t]}
              backward
            />
          )}
        </Figure>
      );
    },
  };
}
