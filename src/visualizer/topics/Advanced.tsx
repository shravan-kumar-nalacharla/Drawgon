import { useState } from "react";
import { dot, softmax } from "../engine/math";
import {
  Control,
  Figure,
  Formula,
  LabLayout,
  Matrix,
  Select,
  fmt,
} from "../components/Primitives";
const architectures: Record<
  string,
  { idea: string; blocks: string[]; detail: string }
> = {
  LeNet: {
    idea: "Local filters, pooling and dense classification for handwritten digits.",
    blocks: [
      "32×32 input",
      "Conv 5×5, 6",
      "Average pool",
      "Conv 5×5, 16",
      "Average pool",
      "Dense 120 → 84",
      "10 outputs",
    ],
    detail:
      "Original LeNet-5 uses partially connected feature maps and trainable subsampling; this overview omits those connections.",
  },
  AlexNet: {
    idea: "A larger convolutional model trained with ReLU, dropout and GPUs.",
    blocks: [
      "Image",
      "Conv 11×11",
      "Max pool",
      "Conv 5×5",
      "Conv 3×3 ×3",
      "Dense ×2",
      "1000 outputs",
    ],
    detail:
      "Five convolutional and three fully connected learned layers; the original used grouped convolutions across GPUs.",
  },
  VGG: {
    idea: "Stack small 3×3 filters to build larger receptive fields.",
    blocks: [
      "Image",
      "2 convolutions",
      "Pool",
      "2 convolutions",
      "Pool",
      "3×3 blocks ×3",
      "Dense classifier",
    ],
    detail:
      "VGG-16 has 13 convolutional and 3 fully connected learned layers. Pooling and input are not counted in 16.",
  },
  Inception: {
    idea: "Parallel paths capture features at several scales.",
    blocks: [
      "Input",
      "1×1 path | 3×3 path",
      "5×5 path | pool path",
      "Concatenate channels",
      "Repeat modules",
      "Global average pool",
      "Classifier",
    ],
    detail:
      "1×1 bottlenecks reduce channel counts before expensive convolutions. Parallel branch outputs concatenate along channels.",
  },
  ResNet: {
    idea: "Learn a residual correction and add the original signal.",
    blocks: [
      "Input x",
      "Convolution",
      "ReLU",
      "Convolution F(x)",
      "Add F(x) + x",
      "ReLU",
      "Classifier",
    ],
    detail:
      "Identity shortcuts help gradients propagate. A projection shortcut is needed when tensor shapes differ.",
  },
  MobileNet: {
    idea: "Separate spatial filtering from channel mixing.",
    blocks: [
      "Input",
      "Depthwise 3×3",
      "Batch norm + ReLU",
      "Pointwise 1×1",
      "Batch norm + ReLU",
      "Repeat",
      "Classifier",
    ],
    detail:
      "MobileNet v1 uses depthwise separable convolutions. The 3×3 part filters each input channel independently.",
  },
};
export default function Advanced({ topic }: { topic: string }) {
  return topic === "attention" ? <Attention /> : <Architecture topic={topic} />;
}
function Architecture({ topic }: { topic: string }) {
  const selectedName =
      Object.keys(architectures).find((k) => k.toLowerCase() === topic) ||
      "ResNet",
    [name, setName] = useState(selectedName),
    [selected, setSelected] = useState(0),
    [channels, setChannels] = useState(16),
    [out, setOut] = useState(32);
  const a = architectures[name];
  return (
    <LabLayout
      controls={
        <>
          <Select
            label="Architecture"
            value={name}
            options={Object.keys(architectures)}
            onChange={(v) => {
              setName(v);
              setSelected(0);
            }}
          />
          <h2>{a.blocks[selected]}</h2>
          <p>{a.idea}</p>
          <p>{a.detail}</p>
          <Control
            label="Input channels"
            value={channels}
            min={1}
            max={128}
            step={1}
            onChange={setChannels}
          />
          <Control
            label="Output channels"
            value={out}
            min={1}
            max={128}
            step={1}
            onChange={setOut}
          />
          <Formula
            symbol="Standard 3×3 vs depthwise 3×3 + pointwise 1×1 (weights only)"
            result={`${9 * channels * out} vs ${9 * channels + channels * out} weights`}
          />
        </>
      }
    >
      <Figure title={`${name} · conceptual architecture`} height={500}>
        {a.blocks.map((b, i) => (
          <g
            key={i}
            tabIndex={0}
            role="button"
            aria-label={`Inspect ${b}`}
            onClick={() => setSelected(i)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSelected(i);
            }}
          >
            <rect
              x="145"
              y={50 + i * 60}
              width="430"
              height="43"
              rx="4"
              fill={i === selected ? "#326d9633" : "transparent"}
              stroke="currentColor"
            />
            <text
              x="360"
              y={77 + i * 60}
              textAnchor="middle"
              fill="currentColor"
            >
              {b}
            </text>
            {i < a.blocks.length - 1 && (
              <text x="355" y={105 + i * 60} fill="currentColor">
                ↓
              </text>
            )}
          </g>
        ))}
      </Figure>
      <p>
        Conceptual overview; select a block to inspect. Production architectures
        contain more operators than this summary.
      </p>
    </LabLayout>
  );
}
function Attention() {
  const [q, setQ] = useState([
      [1, 0],
      [0, 1],
      [1, 1],
    ]),
    [k, setK] = useState([
      [1, 0.5],
      [0.5, 1],
      [1, -1],
    ]),
    [v, setV] = useState([
      [1, 0],
      [0, 1],
      [0.5, 0.5],
    ]),
    [selected, setSelected] = useState(0);
  const scores = q.map((row) => k.map((key) => dot(row, key) / Math.sqrt(2))),
    weights = scores.map((row) => softmax(row)),
    output = weights.map((row) =>
      [0, 1].map((c) =>
        dot(
          row,
          v.map((r) => r[c]),
        ),
      ),
    );
  return (
    <LabLayout
      controls={
        <>
          <Matrix name="Q" values={q} onChange={setQ} />
          <Matrix name="K" values={k} onChange={setK} />
          <Matrix name="V" values={v} onChange={setV} />
          <Control
            label="Query token"
            value={selected}
            min={0}
            max={2}
            step={1}
            onChange={setSelected}
          />
          <p>
            Each query scores all keys. Softmax makes weights sum to one; these
            weights combine values. The three tokens use editable educational
            vectors, not a language model or a measure of human reasoning.
          </p>
        </>
      }
    >
      <Figure title="Scaled dot-product attention" height={300}>
        {["The", "cat", "sat"].map((token, i) => (
          <g key={token}>
            <line
              x1={120 + selected * 240}
              y1="90"
              x2={120 + i * 240}
              y2="200"
              stroke="currentColor"
              strokeWidth={1 + weights[selected][i] * 12}
            />
            <text
              x={120 + i * 240}
              y="72"
              textAnchor="middle"
              fill="currentColor"
            >
              Q: {token}
            </text>
            <text
              x={120 + i * 240}
              y="225"
              textAnchor="middle"
              fill="currentColor"
            >
              K: {token} · {fmt(weights[selected][i])}
            </text>
          </g>
        ))}
      </Figure>
      <Matrix name="QKᵀ / √d" values={scores} />
      <Matrix name="Attention weights (row softmax)" values={weights} />
      <Matrix name="Weighted values" values={output} />
      <Formula
        symbol="Attention(Q,K,V) = softmax(QKᵀ / √dₖ)V"
        result={`Query ${selected + 1} output = [${output[selected].map(fmt).join(", ")}]`}
      />
    </LabLayout>
  );
}
