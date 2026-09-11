import { lstm } from "../engine/math";
import { Figure, Formula, fmt } from "../components/Primitives";
import { Edge, Signal, Reveal, NumberText } from "./primitives";
import { part, type Lesson } from "./timeline";
export function memoryLesson(
  states: ReturnType<typeof lstm>,
  manual = false,
): Lesson {
  const names = [
    "Read the current input",
    "Receive the previous memory",
    "Forget what is not needed",
    "Write new information",
    "Update the memory",
    "Expose an output",
    "Carry memory to the next time step",
  ];
  const copy = [
    "A new number enters this scalar LSTM. This demonstration uses numeric observations, not a trained language model.",
    "The cell state carries information from the preceding time step.",
    "The forget gate scales the old memory. A value near zero removes most of it.",
    "The input gate controls how much of the new candidate is added.",
    "Retained memory and new information combine into the updated cell state.",
    "The output gate controls how much transformed memory becomes the hidden state.",
    "The updated memory and hidden state continue to the next input.",
  ];
  return {
    legend: ["Memory stream →", "Active gate / moving value"],
    intro:
      "An LSTM manages memory: keep some information, add new information, and expose an output.",
    why: "Gates help recurrent networks preserve useful information across a sequence.",
    scenes: states.flatMap((_, t) =>
      names.map((title, i) => ({
        title: `Time ${t + 1}: ${title}`,
        explanation: copy[i],
        duration: 3000,
      })),
    ),
    math: (
      <>
        {states.map((v, t) => (
          <section key={t}>
            <h3>Time {t + 1}</h3>
            <Formula
              symbol={
                manual
                  ? "Manual f, i, o override sigmoid gates; g = tanh(zg)"
                  : "f = σ(zf); i = σ(zi); g = tanh(zg); o = σ(zo)"
              }
              substitution={`Gate preactivations: ${v.z.map(fmt).join(", ")}`}
              result={`f ${fmt(v.f)}; i ${fmt(v.i)}; g ${fmt(v.g)}; o ${fmt(v.o)}`}
            />
            <Formula
              symbol="c = f × previous c + i × g; h = o × tanh(c)"
              substitution={`${fmt(v.f)} × ${fmt(v.previousC)} + ${fmt(v.i)} × ${fmt(v.g)}`}
              result={`Cell ${fmt(v.c)}; hidden ${fmt(v.h)}`}
            />
          </section>
        ))}
      </>
    ),
    render: (scene, p) => {
      const t = Math.floor(scene / 7),
        s = scene % 7,
        v = states[t],
        kept = v.f * v.previousC;
      return (
        <Figure
          title={`Memory through time · observation ${t + 1} of ${states.length}`}
          height={440}
        >
          {states.map((a, i) => (
            <g key={i}>
              <rect
                x={70 + i * 115}
                y="60"
                width="95"
                height="38"
                rx="5"
                fill="var(--vl-paper)"
                stroke={i === t ? "var(--vl-active)" : "var(--vl-line)"}
                strokeWidth={i === t ? 3 : 1}
              />
              <text
                x={117 + i * 115}
                y="84"
                textAnchor="middle"
                fill="currentColor"
              >
                x{i + 1}: {fmt(a.x)}
              </text>
            </g>
          ))}
          <Edge from={[65, 225]} to={[650, 225]} weight={3} />
          <text x="70" y="190" fill="currentColor">
            Memory stream →
          </text>
          <Reveal progress={s === 0 ? p : 0}>
            <Signal
              from={[117 + t * 115, 110]}
              to={[345, 300]}
              progress={s === 0 ? p : 1}
              value={v.x}
            />
          </Reveal>
          <Reveal progress={s === 1 ? 1 : 0}>
            <Signal
              from={[65, 225]}
              to={[200, 225]}
              progress={s === 1 ? p : 1}
              value={v.previousC}
            />
          </Reveal>
          <Reveal progress={s >= 2 ? 1 : 0}>
            <rect
              x="195"
              y="155"
              width="110"
              height="135"
              rx="8"
              fill="var(--vl-paper)"
              stroke="var(--vl-active)"
            />
            <text x="250" y="178" textAnchor="middle" fill="currentColor">
              Forget {fmt(v.f)}
            </text>
            <NumberText
              x={250}
              y={230}
              from={v.previousC}
              to={kept}
              progress={s === 2 ? p : 1}
            />
            <rect
              x="210"
              y="253"
              width={80 * (s === 2 ? 1 - part(p, 0, 1) * (1 - v.f) : v.f)}
              height="8"
              fill="var(--vl-active)"
            />
          </Reveal>
          <Reveal progress={s >= 3 ? 1 : 0}>
            <text x="365" y="335" textAnchor="middle" fill="currentColor">
              Input gate {fmt(v.i)} × candidate {fmt(v.g)}
            </text>
            {s === 3 && (
              <Signal
                from={[350, 300]}
                to={[390, 225]}
                progress={s === 3 ? p : 1}
                value={v.i * v.g}
              />
            )}
          </Reveal>
          <Reveal progress={s >= 4 ? 1 : 0}>
            <rect
              x="375"
              y="195"
              width="95"
              height="65"
              fill="var(--vl-paper)"
              stroke="currentColor"
            />
            <NumberText
              x={422}
              y={231}
              from={kept}
              to={v.c}
              progress={s === 4 ? p : 1}
            />
            <text x="422" y="285" textAnchor="middle" fill="currentColor">
              New memory
            </text>
          </Reveal>
          <Reveal progress={s >= 5 ? 1 : 0}>
            <text x="560" y="175" textAnchor="middle" fill="currentColor">
              Output gate {fmt(v.o)}
            </text>
            <Signal
              from={[470, 225]}
              to={[590, 310]}
              progress={s === 5 ? p : 1}
              value={v.h}
            />
            <text x="590" y="345" textAnchor="middle" fill="currentColor">
              Hidden state
            </text>
          </Reveal>
          {s === 6 && (
            <Signal
              from={[470, 225]}
              to={[650, 225]}
              progress={p}
              value={v.c}
            />
          )}
          <text x="360" y="403" textAnchor="middle" fill="currentColor">
            {v.previousC === 0 && s === 2
              ? "Previous memory is zero here. Try a nonzero initial cell state in Playground."
              : "One scalar memory cell · gates scale information rather than choosing literal words"}
          </text>
        </Figure>
      );
    },
  };
}
