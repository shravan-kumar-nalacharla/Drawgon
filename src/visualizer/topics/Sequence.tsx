import { useState } from "react";
import { defaultGates, gru, lstm, rnn, type GateWeights } from "../engine/math";
import {
  Control,
  Figure,
  Formula,
  LabLayout,
  Matrix,
  Playback,
  Plot,
  Select,
  fmt,
} from "../components/Primitives";
export default function Sequence({ topic }: { topic: string }) {
  const [xs, setXs] = useState([[1, 0, -1, 0.5, 0]]),
    [wx, setWx] = useState(0.8),
    [wh, setWh] = useState(0.5),
    [bias, setBias] = useState(0),
    [h0, setH0] = useState(0),
    [c0, setC0] = useState(0),
    [step, setStep] = useState(0),
    [view, setView] = useState("Unrolled"),
    [manual, setManual] = useState(false),
    [gates, setGates] = useState([0.9, 0.5, 0.5]),
    [weights, setWeights] = useState(defaultGates.map((g) => [g.w, g.u, g.b]));
  const rs = rnn(xs[0], wx, wh, bias, h0),
    ls = lstm(
      xs[0],
      weights.map((g) => ({ w: g[0], u: g[1], b: g[2] }) as GateWeights),
      h0,
      c0,
      manual ? gates : undefined,
    ),
    gs = gru(xs[0], wx, wh, bias, h0),
    backward = rnn([...xs[0]].reverse(), wx, wh, bias, h0).reverse(),
    states = topic === "lstm" ? ls : topic === "gru" ? gs : rs,
    now = states[step],
    L = ls[step],
    G = gs[step];
  let grad = 1;
  const gradients = rs.map(() => 0);
  for (let i = rs.length - 1; i >= 0; i--) {
    grad *= wh * rs[i].gradient;
    gradients[i] = grad;
  }
  return (
    <LabLayout
      controls={
        <>
          <Matrix name="Input sequence" values={xs} onChange={setXs} />
          <Control label="Initial hidden state" value={h0} onChange={setH0} />
          {topic === "lstm" ? (
            <>
              <Control label="Initial cell state" value={c0} onChange={setC0} />
              <Matrix
                name="Gates: rows f,i,g,o; columns Wx,Wh,b"
                values={weights}
                onChange={setWeights}
              />
              <label>
                <input
                  type="checkbox"
                  checked={manual}
                  onChange={(e) => setManual(e.target.checked)}
                />{" "}
                Manual gates
              </label>
              {manual &&
                gates.map((v, i) => (
                  <Control
                    key={i}
                    label={["Forget gate", "Input gate", "Output gate"][i]}
                    value={v}
                    min={0}
                    max={1}
                    onChange={(n) =>
                      setGates(gates.map((v, j) => (i === j ? n : v)))
                    }
                  />
                ))}
              <Select
                label="Memory preset"
                value="Choose"
                options={[
                  "Choose",
                  "Remember everything",
                  "Forget old memory",
                  "Write new information",
                  "Hide memory",
                ]}
                onChange={(v) => {
                  setManual(true);
                  setGates(
                    v === "Remember everything"
                      ? [1, 0, 1]
                      : v === "Forget old memory"
                        ? [0, 0, 1]
                        : v === "Write new information"
                          ? [0, 1, 1]
                          : [1, 1, 0],
                  );
                  setC0(1);
                }}
              />
            </>
          ) : (
            <>
              <Control label="Input weight" value={wx} onChange={setWx} />
              <Control label="Recurrent weight" value={wh} onChange={setWh} />
              <Control label="Bias" value={bias} onChange={setBias} />
            </>
          )}
          <Select
            label="Sequence view"
            value={view}
            options={["Unrolled", "Folded"]}
            onChange={setView}
          />
          <p>
            Small scalar cells expose each operation. All timestamps reuse the
            same parameters. Hidden state carries a compressed history; it is
            not a copy of every input.
          </p>
        </>
      }
    >
      <Figure
        title={`${topic.toUpperCase()} · ${view.toLowerCase()} through time`}
        height={250}
      >
        {(view === "Folded" ? [states[step]] : states).map((s, i) => (
          <g key={i}>
            <rect
              x={35 + i * 136}
              y="88"
              width="110"
              height="70"
              rx="4"
              stroke="currentColor"
              fill={s.t === step ? "#326d9633" : "transparent"}
              strokeWidth={s.t === step ? 3 : 1}
            />
            <text
              x={90 + i * 136}
              y="75"
              fill="currentColor"
              textAnchor="middle"
            >
              x{s.t + 1} = {fmt(s.x)}
            </text>
            <text
              x={90 + i * 136}
              y="115"
              fill="currentColor"
              textAnchor="middle"
            >
              t={s.t + 1}
            </text>
            <text
              x={90 + i * 136}
              y="140"
              fill="currentColor"
              textAnchor="middle"
            >
              h={fmt(s.h)}
            </text>
            {i < states.length - 1 && view === "Unrolled" && (
              <text x={151 + i * 136} y="127" fill="currentColor">
                →
              </text>
            )}
          </g>
        ))}
        <text x="30" y="205" fill="currentColor">
          Shared weights · h(t−1) → cell → h(t){" "}
          {view === "Folded" ? "↻ recurrence" : ""}
        </text>
      </Figure>
      <Playback
        step={step}
        setStep={setStep}
        max={xs[0].length - 1}
        label="Next timestep"
      />
      {topic === "lstm" ? (
        <>
          <Figure title="LSTM · cell state highway" height={300}>
            <line
              x1="30"
              y1="90"
              x2="690"
              y2="90"
              stroke="currentColor"
              strokeWidth="3"
            />
            {[
              ["c previous", L.previousC],
              ["× forget", L.f],
              ["+ input × candidate", L.i * L.g],
              ["c new", L.c],
            ].map(([label, v], i) => (
              <g key={label}>
                <rect
                  x={30 + i * 168}
                  y="60"
                  width="148"
                  height="65"
                  fill="var(--vl-paper)"
                  stroke="currentColor"
                />
                <text
                  x={104 + i * 168}
                  y="82"
                  fill="currentColor"
                  textAnchor="middle"
                  fontSize="11"
                >
                  {label}
                </text>
                <text
                  x={104 + i * 168}
                  y="108"
                  fill="currentColor"
                  textAnchor="middle"
                >
                  {fmt(+v)}
                </text>
              </g>
            ))}
            <text x="60" y="177" fill="currentColor">
              Input gate i={fmt(L.i)} · candidate g={fmt(L.g)}
            </text>
            <text x="60" y="213" fill="currentColor">
              Output gate o={fmt(L.o)} · h = o × tanh(c) = {fmt(L.h)}
            </text>
          </Figure>
          <Matrix name="Gate linear combinations z (f,i,g,o)" values={[L.z]} />
          <Formula
            symbol="f=σ(zf); i=σ(zi); g=tanh(zg); o=σ(zo)"
            result={
              manual
                ? "Manual gates override f, i and o; candidate still uses the weights."
                : `f=${fmt(L.f)}, i=${fmt(L.i)}, g=${fmt(L.g)}, o=${fmt(L.o)}`
            }
          />
          <Formula
            symbol="cₜ = fₜ cₜ₋₁ + iₜ gₜ; hₜ = oₜ tanh(cₜ)"
            substitution={`${fmt(L.f)} × ${fmt(L.previousC)} + ${fmt(L.i)} × ${fmt(L.g)}`}
            result={`Cell state = ${fmt(L.c)}; hidden state = ${fmt(L.h)}`}
          />
        </>
      ) : topic === "gru" ? (
        <>
          <Matrix
            name="GRU update, reset, candidate, hidden"
            values={[[G.z, G.r, G.candidate, G.h]]}
          />
          <Formula
            symbol="h = (1−z) × candidate + z × previous; candidate = tanh(Wx + U(r × previous) + b)"
            result={`(1−${fmt(G.z)})×${fmt(G.candidate)} + ${fmt(G.z)}×${fmt(G.previous)} = ${fmt(G.h)}`}
          />
          <p>
            LSTM separates cell memory from hidden output and has three gates.
            GRU combines memory with hidden state and uses two gates. Neither is
            universally better.
          </p>
        </>
      ) : (
        <Formula
          symbol="hₜ = tanh(Wx × xₜ + Wh × hₜ₋₁ + b)"
          substitution={`tanh(${fmt(wx)}×${fmt(now.x)} + ${fmt(wh)}×${fmt(rs[step].previous)} + ${fmt(bias)})`}
          result={`Hidden state = ${fmt(now.h)}`}
        />
      )}
      <Plot
        title="Memory over time"
        xRange={[0, 4]}
        yRange={[-2, 2]}
        lines={[
          { label: "Hidden", points: states.map((s) => [s.t, s.h]) },
          ...(topic === "lstm"
            ? [{ label: "Cell", points: ls.map((s) => [s.t, s.c]) }]
            : []),
          ...(topic === "bidirectional"
            ? [
                {
                  label: "Backward hidden",
                  points: backward.map((s, i) => [i, s.h]),
                },
              ]
            : []),
        ]}
      />
      {topic === "bptt" && (
        <>
          <Matrix
            name="Gradient of final hidden state to earlier hidden state"
            values={[gradients]}
          />
          <p>
            The product Wh × (1 − h²) propagates backward through shared
            recurrent steps. These are exact state derivatives, not randomly
            generated gradient magnitudes.
          </p>
        </>
      )}
      {topic === "seq2seq" && (
        <>
          <h2>Encoder context → decoder</h2>
          <p>
            The final encoder hidden state initializes this scalar decoder. Toy
            numeric sequence, not a trained translator.
          </p>
          <Matrix
            name="Decoder hidden states (zero input)"
            values={[
              rnn([0, 0, 0], wx, wh, bias, rs.at(-1)!.h).map((s) => s.h),
            ]}
          />
        </>
      )}
    </LabLayout>
  );
}
