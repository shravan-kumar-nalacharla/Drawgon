import { useEffect, useState, type ReactNode } from "react";
import type { Matrix as Mat, Network, Point } from "../engine/math";
export const fmt = (n: number) =>
  Number.isFinite(n)
    ? Math.abs(n) > 1e5 || (Math.abs(n) < 0.0001 && n !== 0)
      ? n.toExponential(3)
      : Number(n.toFixed(4)).toString()
    : "Diverged";
export function Control({
  label,
  value,
  onChange,
  min = -3,
  max = 3,
  step = 0.05,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const change = (s: string) => {
    if (s.trim() && Number.isFinite(+s))
      onChange(Math.max(min, Math.min(max, step === 1 ? Math.round(+s) : +s)));
  };
  return (
    <label className="vl-control">
      <span>
        {label}
        <output>{fmt(value)}</output>
      </span>
      <div>
        <input
          aria-label={label}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => change(e.target.value)}
        />
        <input
          aria-label={`${label} value`}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => change(e.target.value)}
        />
      </div>
    </label>
  );
}
export function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="vl-control">
      <span>{label}</span>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
export function Formula({
  symbol,
  substitution,
  result,
}: {
  symbol: string;
  substitution?: string;
  result?: string;
}) {
  return (
    <section className="vl-formula" aria-label="Live calculation">
      <strong>{symbol}</strong>
      {substitution && <div>{substitution}</div>}
      {result && <output>{result}</output>}
    </section>
  );
}
export function Matrix({
  name,
  values,
  onChange,
  active = [],
}: {
  name: string;
  values: Mat;
  onChange?: (m: Mat) => void;
  active?: number[];
}) {
  return (
    <fieldset className="vl-matrix">
      <legend>
        {name} · {values.length} × {values[0]?.length ?? 0}
      </legend>
      <div
        style={{
          gridTemplateColumns: `repeat(${values[0]?.length ?? 1}, minmax(34px, 1fr))`,
        }}
      >
        {values.flatMap((row, r) =>
          row.map((v, c) =>
            onChange ? (
              <input
                key={`${r},${c}`}
                aria-label={`${name} row ${r + 1} column ${c + 1}`}
                className={active.includes(r * row.length + c) ? "active" : ""}
                type="number"
                min="-255"
                max="255"
                step="0.1"
                value={v}
                onChange={(e) => {
                  const n = +e.target.value;
                  if (
                    e.target.value &&
                    Number.isFinite(n) &&
                    Math.abs(n) <= 255
                  )
                    onChange(
                      values.map((row, i) =>
                        row.map((x, j) => (i === r && j === c ? n : x)),
                      ),
                    );
                }}
              />
            ) : (
              <button
                key={`${r},${c}`}
                className={active.includes(r * row.length + c) ? "active" : ""}
                title={`Row ${r + 1}, column ${c + 1}: ${v}`}
                onClick={(e) => {
                  e.currentTarget.classList.toggle("active");
                }}
              >
                {fmt(v)}
              </button>
            ),
          ),
        )}
      </div>
    </fieldset>
  );
}
export function Playback({
  step,
  setStep,
  max,
  label = "Next",
  onReset,
}: {
  step: number;
  setStep: (n: number) => void;
  max: number;
  label?: string;
  onReset?: () => void;
}) {
  const [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState("1");
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      if (step >= max) setPlaying(false);
      else setStep(step + 1);
    }, 800 / +speed);
    return () => clearInterval(timer);
  }, [playing, step, max, speed, setStep]);
  return (
    <div className="vl-playback">
      <button
        disabled={step === 0}
        onClick={() => {
          setPlaying(false);
          setStep(step - 1);
        }}
      >
        Previous
      </button>
      <button disabled={step >= max} onClick={() => setStep(step + 1)}>
        {label}
      </button>
      <button
        disabled={step >= max && !playing}
        onClick={() => setPlaying(!playing)}
      >
        {playing ? "Pause" : "Play"}
      </button>
      <button
        onClick={() => {
          setPlaying(false);
          setStep(0);
          onReset?.();
        }}
      >
        Reset
      </button>
      <label>
        Speed{" "}
        <select
          aria-label="Playback speed"
          value={speed}
          onChange={(e) => setSpeed(e.target.value)}
        >
          {["0.25", "0.5", "1", "2"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        ×
      </label>
      <output aria-live="polite">
        Step {step} / {max}
      </output>
    </div>
  );
}
export function Figure({
  title,
  children,
  height = 360,
}: {
  title: string;
  children: ReactNode;
  height?: number;
}) {
  return (
    <svg
      className="vl-figure"
      data-export="true"
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 720 ${height}`}
      role="img"
      aria-label={title}
      style={{
        fontFamily: "Arial, sans-serif",
        fontSize: 13,
        background: "var(--vl-paper)",
        color: "var(--vl-ink)",
      }}
    >
      <title>{title}</title>
      <text x="24" y="28" fill="currentColor" fontSize="17" fontWeight="bold">
        {title}
      </text>
      {children}
    </svg>
  );
}
export function NetworkView({
  net,
  values,
  gradients,
  onSelect,
  selected,
}: {
  net: Network;
  values: number[][];
  gradients?: number[][][];
  onSelect?: (l: number, j: number, i: number) => void;
  selected?: number[];
}) {
  const height = Math.max(
    360,
    Math.max(...values.map((v) => v.length)) * 65 + 100,
  );
  const xs = values.map((_, l) => 80 + (l * 560) / (values.length - 1)),
    ys = (l: number, i: number) =>
      90 + (i * (height - 150)) / Math.max(1, values[l].length - 1);
  return (
    <Figure title="Weighted neural network" height={height}>
      <g>
        {net.w.flatMap((layer, l) =>
          layer.flatMap((row, j) =>
            row.map((w, i) => (
              <g
                key={`${l}-${j}-${i}`}
                tabIndex={0}
                role="button"
                aria-label={`Weight ${l + 1}.${j + 1}.${i + 1}: ${fmt(w)}`}
                onClick={() => onSelect?.(l, j, i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onSelect?.(l, j, i);
                }}
              >
                <title>{`Weight ${fmt(w)}${gradients ? `; gradient ${fmt(gradients[l][j][i])}` : ""}`}</title>
                <line
                  x1={xs[l]}
                  y1={ys(l, i)}
                  x2={xs[l + 1]}
                  y2={ys(l + 1, j)}
                  stroke={
                    selected?.join() === [l, j, i].join()
                      ? "#b84b16"
                      : "currentColor"
                  }
                  strokeWidth={Math.min(6, 1 + Math.abs(w))}
                  strokeDasharray={w < 0 ? "5 4" : undefined}
                />
                {values.flat().length < 8 && (
                  <text
                    x={(xs[l] + xs[l + 1]) / 2}
                    y={(ys(l, i) + ys(l + 1, j)) / 2 - 6}
                    fill="currentColor"
                  >
                    {fmt(w)}
                  </text>
                )}
              </g>
            )),
          ),
        )}
      </g>
      {values.flatMap((row, l) =>
        row.map((v, i) => (
          <g key={`${l}-${i}`}>
            <circle
              cx={xs[l]}
              cy={ys(l, i)}
              r="25"
              fill="var(--vl-paper)"
              stroke="currentColor"
              strokeWidth="2"
            />
            <text
              x={xs[l]}
              y={ys(l, i) + 4}
              textAnchor="middle"
              fill="currentColor"
            >
              {fmt(v)}
            </text>
            <title>{`Layer ${l}, neuron ${i + 1}; activation ${v}; bias ${net.b[l - 1]?.[i] ?? 0}`}</title>
          </g>
        )),
      )}
      <text x="24" y={height - 15} fill="currentColor">
        Solid: positive · Dashed: negative · Width: |weight| · Select an edge to
        inspect
      </text>
    </Figure>
  );
}
export function Plot({
  title,
  points = [],
  lines = [],
  onPoint,
  xRange = [-3, 3],
  yRange = [-3, 3],
}: {
  title: string;
  points?: Point[];
  lines?: { points: number[][]; label: string }[];
  onPoint?: (x: number, y: number) => void;
  xRange?: number[];
  yRange?: number[];
}) {
  const X = (x: number) =>
      55 + ((x - xRange[0]) / (xRange[1] - xRange[0])) * 610,
    Y = (y: number) => 300 - ((y - yRange[0]) / (yRange[1] - yRange[0])) * 245;
  return (
    <Figure title={title}>
      <g
        onClick={(e) => {
          if (!onPoint) return;
          const svg = e.currentTarget.ownerSVGElement!,
            p = svg.createSVGPoint();
          p.x = e.clientX;
          p.y = e.clientY;
          const q = p.matrixTransform(svg.getScreenCTM()!.inverse());
          if (q.x >= 55 && q.x <= 665 && q.y >= 55 && q.y <= 300)
            onPoint(
              xRange[0] + ((q.x - 55) / 610) * (xRange[1] - xRange[0]),
              yRange[0] + ((300 - q.y) / 245) * (yRange[1] - yRange[0]),
            );
        }}
      >
        <rect
          x="55"
          y="55"
          width="610"
          height="245"
          fill="transparent"
          stroke="currentColor"
          opacity=".5"
        />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <text
              x={55 + t * 610}
              y="319"
              fill="currentColor"
              textAnchor="middle"
            >
              {fmt(xRange[0] + t * (xRange[1] - xRange[0]))}
            </text>
            <text x="48" y={304 - t * 245} fill="currentColor" textAnchor="end">
              {fmt(yRange[0] + t * (yRange[1] - yRange[0]))}
            </text>
          </g>
        ))}
        {lines.map((l, i) => (
          <g key={l.label}>
            <polyline
              points={l.points
                .filter((p) => p.every(Number.isFinite))
                .map((p) => `${X(p[0])},${Y(p[1])}`)
                .join(" ")}
              fill="none"
              stroke={["#326d96", "#a64727", "#647835", "#825694"][i % 4]}
              strokeWidth="2"
            />
            <text x={55 + i * 150} y="346" fill="currentColor">
              {l.label}
            </text>
          </g>
        ))}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={X(p.x)}
              cy={Y(p.y)}
              r="5"
              fill={
                ["#326d96", "#a64727", "#647835", "#825694", "#77604e"][
                  Math.max(0, p.label) % 5
                ]
              }
              stroke="currentColor"
              strokeDasharray={p.label < 0 ? "2 2" : undefined}
            />
            <title>{`Point ${i + 1}: (${fmt(p.x)}, ${fmt(p.y)}), class ${p.label}`}</title>
          </g>
        ))}
      </g>
    </Figure>
  );
}
export function LabLayout({
  children,
  controls,
  experiment,
}: {
  children: ReactNode;
  controls: ReactNode;
  experiment?: unknown;
}) {
  return (
    <div
      className="vl-lab-grid"
      data-experiment={experiment ? JSON.stringify(experiment) : undefined}
    >
      <div className="vl-stage">{children}</div>
      <aside
        className="vl-inspector"
        aria-label="Experiment controls and inspector"
      >
        {controls}
      </aside>
    </div>
  );
}
