import { convolve, type Matrix } from "../engine/math";
import { Figure, Formula, fmt } from "../components/Primitives";
import { Signal, Reveal } from "./primitives";
import { lerp, part, type Lesson } from "./timeline";
export function convolutionWindow(
  input: Matrix,
  kernel: Matrix,
  stride: number,
  pad: number,
  index: number,
) {
  const output = convolve(input, kernel, stride, pad),
    r = Math.floor(index / output.length),
    c = index % output.length;
  const terms = kernel.flatMap((row, i) =>
    row.map((w, j) => ({
      r: r * stride + i - pad,
      c: c * stride + j - pad,
      w,
      v: input[r * stride + i - pad]?.[c * stride + j - pad] ?? 0,
    })),
  );
  return { output, r, c, terms, result: output[r][c] };
}
export function convolutionLesson(
  input: Matrix,
  kernel: Matrix,
  stride: number,
  pad: number,
): Lesson {
  const first = convolutionWindow(input, kernel, stride, pad, 0),
    count = first.output.length ** 2;
  const base = [
    [
      "See the input image",
      "An image is a grid of numbers. Padding, when enabled, adds a border of zeroes.",
    ],
    [
      "Introduce a kernel",
      "A kernel is a small grid of weights used to look for a local pattern.",
    ],
    ["Cover the first window", "Align each kernel weight with one image cell."],
    [
      "Multiply matching cells",
      "Multiply every covered image value by its matching kernel weight.",
    ],
    [
      "Add the products",
      "These products combine to produce one response for this window.",
    ],
    [
      "Write the first output cell",
      "The response moves into its place in the feature map.",
    ],
  ];
  const scenes = [
    ...base.map(([title, explanation]) => ({
      title,
      explanation,
      duration: 4000,
    })),
    ...Array.from({ length: count - 1 }, (_, i) => ({
      title: `Scan window ${i + 2} of ${count}`,
      explanation: `Move ${stride} cell${stride === 1 ? "" : "s"} per stride, multiply, add, and write the next response.`,
      duration: 2600,
    })),
  ];
  return {
    legend: [
      "Input and output cells",
      "Active kernel / moving result",
      "Zero padding",
    ],
    intro:
      "Convolution scans an image with the same small pattern detector at every position.",
    why: "Local features such as edges can occur anywhere in an image.",
    scenes,
    math: (
      <>
        <Formula
          symbol="Output size = floor((N + 2P − K) / S) + 1"
          substitution={`floor((${input.length} + 2×${pad} − ${kernel.length}) / ${stride}) + 1`}
          result={`${first.output.length} × ${first.output.length}`}
        />
        {first.output.flatMap((row, r) =>
          row.map((v, c) => {
            const window = convolutionWindow(
              input,
              kernel,
              stride,
              pad,
              r * row.length + c,
            );
            return (
              <Formula
                key={`${r},${c}`}
                symbol={`Output [${r},${c}] = Σ image × kernel`}
                substitution={window.terms
                  .map((t) => `${fmt(t.v)}×${fmt(t.w)}`)
                  .join(" + ")}
                result={fmt(v)}
              />
            );
          }),
        )}
      </>
    ),
    render: (s, p) => {
      const index = s < 6 ? 0 : Math.min(count - 1, s - 5),
        now = convolutionWindow(input, kernel, stride, pad, index),
        previous = convolutionWindow(
          input,
          kernel,
          stride,
          pad,
          Math.max(0, index - 1),
        );
      const n = input.length + 2 * pad,
        cell = Math.min(38, 250 / n),
        ox = 35,
        oy = 110;
      const tx = ox + now.c * stride * cell,
        ty = oy + now.r * stride * cell;
      const kx =
        s < 2
          ? 350
          : s === 2
            ? lerp(350, tx, p)
            : s >= 6
              ? lerp(ox + previous.c * stride * cell, tx, part(p, 0, 0.35))
              : tx;
      const ky =
        s < 2
          ? 110
          : s === 2
            ? lerp(110, ty, p)
            : s >= 6
              ? lerp(oy + previous.r * stride * cell, ty, part(p, 0, 0.35))
              : ty;
      const products =
        s === 3
          ? Math.min(9, Math.floor(p * 9) + 1)
          : s >= 6
            ? Math.floor(part(p, 0.35, 0.65) * 9)
            : s >= 4
              ? 9
              : 0;
      const outCell = Math.min(34, 150 / now.output.length),
        dest: [number, number] = [
          540 + (now.c + 0.5) * outCell,
          110 + (now.r + 0.5) * outCell,
        ];
      return (
        <Figure title="Slide → multiply → add → write" height={470}>
          <text x="35" y="80" fill="currentColor">
            Input {pad ? `+ ${pad}-cell zero padding` : ""}
          </text>
          {Array.from({ length: n }, (_, r) =>
            Array.from({ length: n }, (_, c) => (
              <g key={`${r}${c}`}>
                <rect
                  x={ox + c * cell}
                  y={oy + r * cell}
                  width={cell}
                  height={cell}
                  fill="var(--vl-paper)"
                  stroke="var(--vl-line)"
                  strokeDasharray={
                    r < pad || c < pad || r >= n - pad || c >= n - pad
                      ? "3 3"
                      : undefined
                  }
                />
                <text
                  x={ox + (c + 0.5) * cell}
                  y={oy + (r + 0.65) * cell}
                  textAnchor="middle"
                  fill="currentColor"
                >
                  {fmt(input[r - pad]?.[c - pad] ?? 0)}
                </text>
              </g>
            )),
          )}
          <Reveal progress={s >= 1 ? 1 : 0}>
            <g data-kernel transform={`translate(${kx} ${ky})`}>
              <rect
                width={cell * 3}
                height={cell * 3}
                fill="var(--vl-active)"
                fillOpacity=".08"
                stroke="var(--vl-active)"
                strokeWidth="3"
              />
              {kernel.flatMap((row, r) =>
                row.map((w, c) => (
                  <g key={`${r}${c}`}>
                    <rect
                      x={c * cell}
                      y={r * cell}
                      width={cell}
                      height={cell}
                      fill="none"
                      stroke="var(--vl-active)"
                      strokeWidth={
                        (s === 3 || s >= 6) && r * 3 + c === products - 1
                          ? 3
                          : 1
                      }
                    />
                    <text
                      x={(c + 0.8) * cell}
                      y={(r + 0.3) * cell}
                      textAnchor="middle"
                      fontSize="10"
                      fill="var(--vl-active)"
                    >
                      {fmt(w)}
                    </text>
                  </g>
                )),
              )}
            </g>
          </Reveal>
          {s >= 1 && (
            <text x="350" y="80" fill="currentColor">
              Kernel weights
            </text>
          )}
          <Reveal progress={s >= 5 ? 1 : 0}>
            <text x="540" y="80" fill="currentColor">
              Feature map
            </text>
            {now.output.flatMap((row, r) =>
              row.map((v, c) => {
                const id = r * row.length + c,
                  done =
                    id < index ||
                    (id === index && (s === 5 ? p > 0.8 : s >= 6 && p > 0.85));
                return (
                  <g key={`${r}${c}`}>
                    <rect
                      x={540 + c * outCell}
                      y={110 + r * outCell}
                      width={outCell}
                      height={outCell}
                      fill="var(--vl-paper)"
                      stroke="currentColor"
                    />
                    {done && (
                      <text
                        x={540 + (c + 0.5) * outCell}
                        y={110 + (r + 0.65) * outCell}
                        textAnchor="middle"
                        fill="currentColor"
                        fontSize="12"
                      >
                        {fmt(v)}
                      </text>
                    )}
                  </g>
                );
              }),
            )}
          </Reveal>
          {s >= 3 &&
            now.terms.slice(0, products).map((t, i) => (
              <text
                key={i}
                x={40 + (i % 3) * 220}
                y={375 + Math.floor(i / 3) * 25}
                fill="currentColor"
              >
                {fmt(t.v)} × {fmt(t.w)} = {fmt(t.v * t.w)}
              </text>
            ))}
          {s >= 4 && (s < 6 || p >= 0.65) && (
            <text x="370" y="290" fill="currentColor" textAnchor="middle">
              Sum = {fmt(now.result)}
            </text>
          )}
          {(s === 5 || (s >= 6 && p > 0.7)) && (
            <Signal
              from={[370, 310]}
              to={dest}
              progress={s === 5 ? part(p, 0, 0.8) : part(p, 0.7, 0.85)}
              value={now.result}
            />
          )}
        </Figure>
      );
    },
  };
}
