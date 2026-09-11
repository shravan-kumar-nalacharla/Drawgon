import { useState } from "react";
import {
  vaeInitial,
  vaeForward,
  vaeTrain,
  convAEInitial,
  convAEForward,
  convAETrain,
} from "../engine/autoencoder";
import {
  Control,
  Figure,
  Formula,
  LabLayout,
  Matrix,
  Plot,
  fmt,
} from "../components/Primitives";
const patterns = Array.from({ length: 8 }, (_, i) =>
  Array.from({ length: 8 }, (_, j) => +(j === i || j === (i + 1) % 8)),
);
export default function Variational({ topic }: { topic: string }) {
  return topic === "convolutional-autoencoder" ? (
    <Spatial />
  ) : (
    <VariationalLab />
  );
}
function VariationalLab() {
  const [model, setModel] = useState(vaeInitial),
    [sample, setSample] = useState(0),
    [seed, setSeed] = useState(42),
    [lr, setLr] = useState(0.1),
    [beta, setBeta] = useState(0.02),
    [steps, setSteps] = useState(0),
    [manual, setManual] = useState(false),
    [z, setZ] = useState([[0, 0]]);
  const f = vaeForward(
      model,
      patterns[sample],
      seed,
      manual ? z[0] : undefined,
    ),
    encoded = patterns.map((x, i) => {
      const f = vaeForward(model, x);
      return { x: f.mu[0], y: f.mu[1], label: i };
    });
  return (
    <LabLayout
      controls={
        <>
          <Control
            label="Pattern"
            value={sample}
            min={0}
            max={7}
            step={1}
            onChange={setSample}
          />
          <Control
            label="Learning rate"
            value={lr}
            min={0.01}
            max={0.5}
            onChange={setLr}
          />
          <Control
            label="KL weight β"
            value={beta}
            min={0}
            max={1}
            step={0.01}
            onChange={setBeta}
          />
          <Control
            label="Sampling seed"
            value={seed}
            min={1}
            max={9999}
            step={1}
            onChange={setSeed}
          />
          <label>
            <input
              type="checkbox"
              checked={manual}
              onChange={(e) => setManual(e.target.checked)}
            />{" "}
            Explore latent z manually
          </label>
          {manual && <Matrix name="Manual z" values={z} onChange={setZ} />}
          <button
            onClick={() => {
              let n = model;
              for (let i = 0; i < 10; i++)
                n = vaeTrain(n, patterns, lr, beta, seed + steps + i);
              setModel(n);
              setSteps(steps + 10);
            }}
          >
            Train 10 VAE steps
          </button>
          <button
            onClick={() => {
              setModel(vaeInitial());
              setSteps(0);
            }}
          >
            Reset
          </button>
          <p>
            This real 8 → (μ₂, log σ²₂) → 8 variational autoencoder uses seeded
            Gaussian noise and optimizes reconstruction MSE + β KL. Log variance
            is bounded to [−8,8] for stability. Manual latent exploration
            bypasses the encoder for display only.
          </p>
        </>
      }
    >
      <Figure
        title="Variational autoencoder · distribution to reconstruction"
        height={240}
      >
        {[
          ["Input", "8 values"],
          ["Encoder", "μ and log σ²"],
          ["Sample z", f.z.map(fmt).join(", ")],
          ["Decoder", "8 reconstructions"],
        ].map(([name, value], i) => (
          <g key={name}>
            <rect
              x={20 + i * 178}
              y="70"
              width="155"
              height="90"
              fill="transparent"
              stroke="currentColor"
            />
            <text
              x={97 + i * 178}
              y="97"
              textAnchor="middle"
              fill="currentColor"
            >
              {name}
            </text>
            <text
              x={97 + i * 178}
              y="129"
              textAnchor="middle"
              fill="currentColor"
              fontSize="11"
            >
              {value}
            </text>
          </g>
        ))}
      </Figure>
      <Matrix name="Input" values={[patterns[sample]]} />
      <Matrix name="Reconstruction" values={[f.output]} />
      <Matrix name="Mean μ / log variance" values={[f.mu, f.lv]} />
      <Formula
        symbol="z = μ + exp(½ log σ²) × ε"
        substitution={f.z
          .map(
            (v, i) =>
              `${fmt(f.mu[i])} + exp(${fmt(f.lv[i] / 2)}) × ${fmt(f.eps[i])} = ${fmt(v)}`,
          )
          .join("; ")}
        result={`MSE ${fmt(f.reconstruction)}; KL ${fmt(f.kl)}; total ${fmt(f.reconstruction + beta * f.kl)} · ${steps} updates`}
      />
      <Plot
        title="Latent means · click to decode a location"
        points={[...encoded, { x: f.z[0], y: f.z[1], label: 8 }]}
        onPoint={(x, y) => {
          setManual(true);
          setZ([[x, y]]);
        }}
      />
    </LabLayout>
  );
}
function Spatial() {
  const [model, setModel] = useState(convAEInitial),
    [lr, setLr] = useState(0.2),
    [steps, setSteps] = useState(0),
    [input, setInput] = useState([
      [0, 0, 1, 0],
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 1, 0],
    ]);
  const f = convAEForward(model, input);
  return (
    <LabLayout
      controls={
        <>
          <Matrix name="Input image" values={input} onChange={setInput} />
          <Matrix
            name="Encoder kernel"
            values={model.encoder}
            onChange={(encoder) => setModel({ ...model, encoder })}
          />
          <Matrix
            name="Decoder kernel"
            values={model.decoder}
            onChange={(decoder) => setModel({ ...model, decoder })}
          />
          <Control
            label="Learning rate"
            value={lr}
            min={0.01}
            max={1}
            onChange={setLr}
          />
          <button
            onClick={() => {
              setModel(convAETrain(model, input, lr));
              setSteps(steps + 1);
            }}
          >
            Train convolutional step
          </button>
          <button
            onClick={() => {
              setModel(convAEInitial());
              setSteps(0);
            }}
          >
            Reset
          </button>
          <p>
            18 shared kernel weights. Conv + tanh → average pool → nearest
            upsample → conv + sigmoid. Central finite differences compute
            gradients for this deliberately tiny 4×4 model.
          </p>
        </>
      }
    >
      <Figure title="Spatial autoencoder · learned shared filters" height={230}>
        {["4×4 image", "Conv + tanh", "2×2 latent", "Upsample + conv"].map(
          (name, i) => (
            <g key={name}>
              <rect
                x={20 + i * 178}
                y="70"
                width="155"
                height="65"
                fill="transparent"
                stroke="currentColor"
              />
              <text
                x={97 + i * 178}
                y="107"
                textAnchor="middle"
                fill="currentColor"
              >
                {name}
              </text>
            </g>
          ),
        )}
      </Figure>
      <Matrix name="Encoded feature map" values={f.encoded} />
      <Matrix name="Latent" values={f.latent} />
      <Matrix name="Reconstructed image" values={f.output} />
      <Formula
        symbol="MSE = mean((reconstruction − input)²)"
        result={`Loss ${fmt(f.loss)} · ${steps} updates`}
      />
    </LabLayout>
  );
}
