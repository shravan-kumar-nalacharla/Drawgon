import { useState } from "react";
import { convolutionLesson } from "../lesson/Convolution";
import {
  convolve,
  pool,
  softmax,
  sum,
  type Matrix as Mat,
} from "../engine/math";
import {
  Control,
  Figure,
  Formula,
  LabLayout,
  Matrix,
  Playback,
  Select,
  fmt,
} from "../components/Primitives";
const inputDefault = [
  [0, 0, 1, 0, 0],
  [0, 1, 1, 1, 0],
  [1, 1, 1, 1, 1],
  [0, 1, 1, 1, 0],
  [0, 0, 1, 0, 0],
];
const kernels: Record<string, Mat> = {
  Identity: [
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 0],
  ],
  "Vertical edge": [
    [1, 0, -1],
    [1, 0, -1],
    [1, 0, -1],
  ],
  "Horizontal edge": [
    [1, 1, 1],
    [0, 0, 0],
    [-1, -1, -1],
  ],
  Sharpen: [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0],
  ],
  Blur: Array.from({ length: 3 }, () => [1 / 9, 1 / 9, 1 / 9]),
  Emboss: [
    [-2, -1, 0],
    [-1, 1, 1],
    [0, 1, 2],
  ],
};
function Tensor({
  title,
  values,
  x,
  y,
  active = [],
}: {
  title: string;
  values: Mat;
  x: number;
  y: number;
  active?: number[];
}) {
  const size = Math.min(32, 180 / values.length),
    m = Math.max(1, ...values.flat().map(Math.abs));
  return (
    <g>
      <text x={x} y={y - 12} fill="currentColor">
        {title} · {values.length}×{values[0].length}
      </text>
      {values.flatMap((row, r) =>
        row.map((v, c) => (
          <g key={`${r},${c}`}>
            <rect
              x={x + c * size}
              y={y + r * size}
              width={size}
              height={size}
              fill={v < 0 ? "#a64727" : "#326d96"}
              fillOpacity={0.1 + (0.7 * Math.abs(v)) / m}
              stroke={
                active.includes(r * row.length + c) ? "#b84b16" : "currentColor"
              }
              strokeWidth={active.includes(r * row.length + c) ? 3 : 0.5}
            />
            <text
              x={x + (c + 0.5) * size}
              y={y + (r + 0.6) * size}
              fill="currentColor"
              textAnchor="middle"
              fontSize="10"
            >
              {fmt(v)}
            </text>
            <title>{`[${r},${c}] = ${v}`}</title>
          </g>
        )),
      )}
    </g>
  );
}
export default function Convolution({ topic }: { topic: string }) {
  const [input, setInput] = useState(inputDefault),
    [kernel, setKernel] = useState(kernels["Vertical edge"]),
    [preset, setPreset] = useState("Vertical edge"),
    [stride, setStride] = useState(1),
    [padding, setPadding] = useState(0),
    [step, setStep] = useState(0),
    [mode, setMode] = useState("Max"),
    [size, setSize] = useState(2),
    [channels, setChannels] = useState(1),
    [filters, setFilters] = useState(8),
    [error, setError] = useState("");
  const pooling = topic === "pooling",
    output = pooling
      ? pool(input, size, stride, mode)
      : convolve(input, kernel, stride, padding),
    index = Math.min(step, output.length ** 2 - 1),
    r = Math.floor(index / output.length),
    c = index % output.length,
    ks = pooling ? size : 3,
    terms = Array.from({ length: ks }, (_, i) =>
      Array.from({ length: ks }, (_, j) => {
        const v =
          input[r * stride + i - (pooling ? 0 : padding)]?.[
            c * stride + j - (pooling ? 0 : padding)
          ] ?? 0;
        return { v, w: pooling ? 1 : kernel[i][j] };
      }),
    ).flat(),
    active = terms.map(
      (_, i) =>
        (r * stride + Math.floor(i / ks) - (pooling ? 0 : padding)) *
          input.length +
        c * stride +
        (i % ks) -
        (pooling ? 0 : padding),
    ),
    padded = Array.from({ length: input.length + padding * 2 }, (_, r) =>
      Array.from(
        { length: input.length + padding * 2 },
        (_, c) => input[r - padding]?.[c - padding] ?? 0,
      ),
    );
  const conv = convolve(input, kernel, 1, 1),
    relu = conv.map((row) => row.map((v) => Math.max(0, v))),
    pooled = pool(relu, 2, 2),
    flat = pooled.flat(),
    logits = [
      sum(flat),
      sum(flat.map((v, i) => v * (i % 2 ? 1 : -1))),
      -sum(flat),
    ],
    probs = softmax(logits);
  return (
    <LabLayout
      lesson={
        pooling ? undefined : convolutionLesson(input, kernel, stride, padding)
      }
      controls={
        <>
          <h2>
            {pooling
              ? "Keep a summary of each region"
              : "Slide the same filter across the image"}
          </h2>
          <Control
            label="Stride"
            value={stride}
            min={1}
            max={3}
            step={1}
            onChange={(n) => {
              setStride(n);
              setStep(0);
            }}
          />
          {pooling ? (
            <>
              <Select
                label="Pooling operation"
                value={mode}
                options={["Max", "Average", "Min"]}
                onChange={setMode}
              />
              <Control
                label="Window size"
                value={size}
                min={2}
                max={3}
                step={1}
                onChange={setSize}
              />
            </>
          ) : (
            <>
              <Control
                label="Padding"
                value={padding}
                min={0}
                max={2}
                step={1}
                onChange={(n) => {
                  setPadding(n);
                  setStep(0);
                }}
              />
              <Select
                label="Filter preset"
                value={preset}
                options={Object.keys(kernels)}
                onChange={(v) => {
                  setPreset(v);
                  setKernel(kernels[v]);
                  setStep(0);
                }}
              />
              <Matrix name="Kernel" values={kernel} onChange={setKernel} />
            </>
          )}
          <Matrix name="Input pixels" values={input} onChange={setInput} />
          <label>
            Local image (PNG/JPEG, up to 5 MB)
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 5e6) {
                  setError("Choose an image under 5 MB.");
                  return;
                }
                const url = URL.createObjectURL(file);
                try {
                  const image = new Image();
                  image.src = url;
                  await image.decode();
                  const canvas = document.createElement("canvas");
                  canvas.width = canvas.height = 5;
                  const ctx = canvas.getContext("2d")!;
                  ctx.drawImage(image, 0, 0, 5, 5);
                  const data = ctx.getImageData(0, 0, 5, 5).data;
                  setInput(
                    Array.from({ length: 5 }, (_, r) =>
                      Array.from({ length: 5 }, (_, c) => {
                        const i = (r * 5 + c) * 4;
                        return +(
                          (data[i] + data[i + 1] + data[i + 2]) /
                          765
                        ).toFixed(2);
                      }),
                    ),
                  );
                  setError("");
                } catch {
                  setError("This image could not be decoded.");
                } finally {
                  URL.revokeObjectURL(url);
                }
              }}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <button
            onClick={() => {
              setInput(inputDefault);
              setKernel(kernels["Vertical edge"]);
              setPreset("Vertical edge");
              setStride(1);
              setPadding(0);
              setStep(0);
            }}
          >
            Reset experiment
          </button>
          <p>
            Images stay in this browser. This 5×5 grayscale example uses
            cross-correlation, the operation commonly called convolution in CNN
            libraries.
          </p>
        </>
      }
    >
      <Figure
        title={
          pooling
            ? "Pooling window and output"
            : "Convolution · input × kernel → output"
        }
        height={360}
      >
        <Tensor title="Input" values={input} x={30} y={75} active={active} />
        {!pooling && <Tensor title="Kernel" values={kernel} x={285} y={75} />}
        <Tensor
          title="Output"
          values={output}
          x={475}
          y={75}
          active={[index]}
        />
        <text x="30" y="325" fill="currentColor">
          Output [{r},{c}] = {fmt(output[r][c])} · orange border marks the
          current operation
        </text>
      </Figure>
      <Formula
        symbol={
          pooling
            ? `${mode} of the selected window`
            : "y[r,c] = Σ input[r×stride+i−pad,c×stride+j−pad] × kernel[i,j]"
        }
        substitution={terms
          .map((t) => (pooling ? fmt(t.v) : `${fmt(t.v)}×${fmt(t.w)}`))
          .join(pooling ? ", " : " + ")}
        result={`Output = ${fmt(output[r][c])}`}
      />
      <Formula
        symbol="Output size = floor((input + 2×padding − kernel) / stride) + 1"
        result={`floor((${input.length} + 2×${pooling ? 0 : padding} − ${ks}) / ${stride}) + 1 = ${output.length}`}
      />
      <Playback step={index} setStep={setStep} max={output.length ** 2 - 1} />
      {padding > 0 && !pooling && (
        <Matrix name="Zero-padded input" values={padded} />
      )}{" "}
      {["cnn", "feature-maps"].includes(topic) && (
        <>
          <h2>End-to-end toy CNN</h2>
          <p>
            Fixed educational filters and dense weights, not a pretrained
            recognizer. Its three scores demonstrate the calculation only.
          </p>
          <Figure
            title="Feature extraction → pooling → classification"
            height={320}
          >
            <Tensor title="Convolution" values={conv} x={25} y={70} />
            <Tensor title="ReLU" values={relu} x={260} y={70} />
            <Tensor title="Max pool" values={pooled} x={500} y={70} />
          </Figure>
          <Matrix name="Flattened features" values={[flat]} />
          <Matrix name="Dense logits" values={[logits]} />
          <Matrix name="Softmax outputs" values={[probs]} />
        </>
      )}
      {["cnn-vs-dense", "image-tensor"].includes(topic) && (
        <>
          <Control
            label="Input channels"
            value={channels}
            min={1}
            max={3}
            step={1}
            onChange={setChannels}
          />
          <Control
            label="Output filters"
            value={filters}
            min={1}
            max={32}
            step={1}
            onChange={setFilters}
          />
          <Formula
            symbol="Conv parameters = (K² × Cin + 1) × Cout"
            result={`CNN: ${(9 * channels + 1) * filters} parameters; dense to same ${output.length}×${output.length}×${filters} output: ${(25 * channels + 1) * output.length ** 2 * filters} parameters`}
          />
          <p>
            Channels are tensor depth (for example R, G and B). A 2D convolution
            sums across channels; an RGB image does not require a spatial 3D
            convolution.
          </p>
        </>
      )}
    </LabLayout>
  );
}
