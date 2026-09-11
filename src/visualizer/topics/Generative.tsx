import { useEffect, useState } from "react";
import Variational from "./Variational";
import {
  backprop,
  convolve,
  forward,
  network,
  pool,
  random,
  sigmoid,
  sum,
  train,
  type Network,
} from "../engine/math";
import {
  discriminate,
  ganInitial,
  ganSamples,
  ganStep,
  generate,
  type Gan,
} from "../engine/generative";
import {
  Control,
  Figure,
  Formula,
  LabLayout,
  Matrix,
  NetworkView,
  Plot,
  Select,
  fmt,
} from "../components/Primitives";
export default function Generative({ topic }: { topic: string }) {
  if (topic === "vae" || topic === "convolutional-autoencoder")
    return <Variational topic={topic} />;
  return topic === "gan" ? <GAN /> : <Autoencoder topic={topic} />;
}
function Autoencoder({ topic }: { topic: string }) {
  const [width, setWidth] = useState(2),
    [noise, setNoise] = useState(0.2),
    [lambda, setLambda] = useState(0.02),
    [lr, setLr] = useState(0.2),
    [steps, setSteps] = useState(0),
    [net, setNet] = useState<Network>(() => network([8, 2, 8], 42, "Sigmoid")),
    [sample, setSample] = useState(0),
    [z, setZ] = useState([[0, 0]]),
    [logvar, setLogvar] = useState(0),
    [seed, setSeed] = useState(42);
  const data = Array.from({ length: 8 }, (_, i) =>
      Array.from({ length: 8 }, (_, j) => +(j === i || j === (i + 1) % 8)),
    ),
    rng = random(seed),
    noisy = data.map((row) =>
      row.map((v) => Math.max(0, Math.min(1, v + (rng() - 0.5) * noise * 2))),
    ),
    input = topic === "denoising-autoencoder" ? noisy[sample] : data[sample],
    f = forward(net, input),
    output = f.a.at(-1)!,
    mse = sum(output.map((v, i) => (v - data[sample][i]) ** 2)) / 8,
    sparse = lambda * sum(f.a[1].map(Math.abs)),
    eps = z[0].map(
      () =>
        Math.sqrt(-2 * Math.log(Math.max(1e-9, rng()))) *
        Math.cos(2 * Math.PI * rng()),
    ),
    latent = z[0].map((v, i) => v + Math.exp(logvar / 2) * eps[i]),
    decoded = net.w
      .at(-1)!
      .map((w, j) =>
        sigmoid(sum(w.map((v, i) => v * (latent[i] ?? 0))) + net.b.at(-1)![j]),
      ),
    kl = 0.5 * sum(z[0].map((v) => v * v + Math.exp(logvar) - 1 - logvar));
  const image = Array.from({ length: 4 }, (_, i) =>
      data[sample].slice((i % 2) * 4, (i % 2) * 4 + 4),
    ),
    encoded = pool(
      convolve(
        image,
        [
          [0, 0, 0],
          [0, 1, 0],
          [0, 0, 0],
        ],
        1,
        1,
      ),
      2,
      2,
      "Average",
    ),
    up = Array.from({ length: 4 }, (_, r) =>
      Array.from(
        { length: 4 },
        (_, c) => encoded[Math.floor(r / 2)][Math.floor(c / 2)],
      ),
    );
  function trainStep() {
    let next = net;
    for (let iteration = 0; iteration < 10; iteration++) {
      const samples = data.map((row, i) => ({
        x: topic === "denoising-autoencoder" ? noisy[i] : row,
        y: row,
      }));
      if (topic === "sparse-autoencoder") {
        const gs = samples.map((s) => backprop(next, s.x, s.y)),
          base = train(next, samples, lr);
        base.w[0] = base.w[0].map((row, j) =>
          row.map(
            (v, i) =>
              v -
              (lr *
                lambda *
                sum(gs.map((g) => g.a[1][j] * (1 - g.a[1][j]) * g.a[0][i]))) /
                gs.length,
          ),
        );
        base.b[0] = base.b[0].map(
          (v, j) =>
            v -
            (lr * lambda * sum(gs.map((g) => g.a[1][j] * (1 - g.a[1][j])))) /
              gs.length,
        );
        next = base;
      } else next = train(next, samples, lr);
    }
    setNet(next);
    setSteps(steps + 10);
  }
  return (
    <LabLayout
      controls={
        <>
          <Control
            label="Bottleneck width"
            value={width}
            min={1}
            max={4}
            step={1}
            onChange={(n) => {
              setWidth(n);
              setNet(network([8, n, 8], 42, "Sigmoid"));
              setSteps(0);
            }}
          />
          <Control
            label="Example pattern"
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
            max={1}
            onChange={setLr}
          />
          <Control
            label="Noise"
            value={noise}
            min={0}
            max={1}
            onChange={setNoise}
          />
          {topic === "sparse-autoencoder" && (
            <Control
              label="Activation sparsity penalty"
              value={lambda}
              min={0}
              max={0.2}
              step={0.005}
              onChange={setLambda}
            />
          )}{" "}
          {topic === "vae" && (
            <>
              <Matrix name="Latent means μ" values={z} onChange={setZ} />
              <Control
                label="Log variance"
                value={logvar}
                min={-3}
                max={2}
                onChange={setLogvar}
              />
              <Control
                label="Sampling seed"
                value={seed}
                min={1}
                max={999}
                step={1}
                onChange={setSeed}
              />
            </>
          )}
          <button onClick={trainStep}>Train 10 steps</button>
          <button
            onClick={() => {
              setNet(network([8, width, 8], 42, "Sigmoid"));
              setSteps(0);
            }}
          >
            Reset
          </button>
          <p>
            Eight synthetic binary patterns, eight input/output units. The
            encoder compresses the input; the decoder reconstructs it. This
            educational model starts untrained.
          </p>
        </>
      }
    >
      <NetworkView net={net} values={f.a} />
      <Matrix name="Original" values={[data[sample]]} />
      {topic === "denoising-autoencoder" && (
        <Matrix name="Noisy input" values={[input]} />
      )}
      <Matrix name="Reconstruction" values={[output]} />
      <Formula
        symbol="Reconstruction MSE = Σ(x − reconstructed x)² / 8"
        result={`MSE ${fmt(mse)} · training steps ${steps}${topic === "sparse-autoencoder" ? ` · activation L1 penalty ${fmt(sparse)}` : ""}`}
      />
      {topic === "vae" && (
        <>
          <h2>Reparameterization experiment</h2>
          <p>
            This sampling lab uses the trained decoder above. It exposes VAE
            sampling and the exact Gaussian KL term; the encoder above is a
            deterministic autoencoder, not a full variational training model.
          </p>
          <Matrix name="Sampled z = μ + σ ε" values={[latent]} />
          <Matrix name="Decoded sample" values={[decoded]} />
          <Formula
            symbol="KL(q(z|x) || N(0,I)) = ½ Σ(μ² + σ² − 1 − log σ²)"
            result={`KL = ${fmt(kl)}; seeded ε = ${eps.map(fmt).join(", ")}`}
          />
        </>
      )}
      {topic === "convolutional-autoencoder" && (
        <>
          <h2>Spatial bottleneck</h2>
          <p>
            Fixed identity convolution, average downsampling and
            nearest-neighbor upsampling expose spatial information loss. This
            separate path has no learned convolution weights.
          </p>
          <Matrix name="Image" values={image} />
          <Matrix name="Spatial latent" values={encoded} />
          <Matrix name="Upsampled reconstruction" values={up} />
        </>
      )}
    </LabLayout>
  );
}
function GAN() {
  const [state, setState] = useState<Gan>(ganInitial),
    [lrD, setD] = useState(0.03),
    [lrG, setG] = useState(0.03),
    [run, setRun] = useState(false),
    [error, setError] = useState("");
  function step(which: "D" | "G") {
    try {
      setState(ganStep(state, which, which === "D" ? lrD : lrG));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Training error");
      setRun(false);
    }
  }
  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => {
      if (state.step >= 1000) setRun(false);
      else step(state.step % 2 ? "G" : "D");
    }, 100);
    return () => clearInterval(id);
  });
  const data = ganSamples(),
    generated = data.map(({ z }) => generate(state.g, z)),
    surface = Array.from({ length: 400 }, (_, i) => {
      const x = (i % 20) / 4 - 2.5,
        y = Math.floor(i / 20) / 4 - 2.5;
      return { x, y, p: discriminate(state.d, [x, y]) };
    });
  return (
    <LabLayout
      controls={
        <>
          <Control
            label="Discriminator learning rate"
            value={lrD}
            min={0.001}
            max={0.2}
            step={0.001}
            onChange={setD}
          />
          <Control
            label="Generator learning rate"
            value={lrG}
            min={0.001}
            max={0.2}
            step={0.001}
            onChange={setG}
          />
          <Select
            label="Training preset"
            value="Choose"
            options={[
              "Choose",
              "Balanced",
              "Strong discriminator",
              "Strong generator",
              "Collapsed generator",
            ]}
            onChange={(v) => {
              setRun(false);
              setState(
                v === "Collapsed generator"
                  ? { ...ganInitial(), g: [0.001, 0, 0, 0.001, 0, 0] }
                  : ganInitial(),
              );
              setD(v === "Strong discriminator" ? 0.15 : 0.03);
              setG(v === "Strong generator" ? 0.15 : 0.03);
            }}
          />
          <p>
            An affine generator maps uniform 2D noise to samples. A logistic
            discriminator uses x, y, x², y² features. Alternating gradients are
            real; this limited model cannot represent every target distribution.
            Presets illustrate configurations, not guaranteed GAN behavior.
          </p>
          <Matrix name="Generator weights" values={[state.g]} />
          <Matrix name="Discriminator weights" values={[state.d]} />
        </>
      }
    >
      <Figure title="GAN · discriminator probability of real" height={350}>
        {surface.map((p, i) => (
          <rect
            key={i}
            x={100 + (p.x + 2.5) * 100}
            y={50 + (p.y + 2.5) * 45}
            width="25"
            height="12"
            fill="#326d96"
            opacity={p.p * 0.7}
          />
        ))}
        {generated.map((p, i) => (
          <circle
            key={i}
            cx={100 + (p[0] + 2.5) * 100}
            cy={50 + (p[1] + 2.5) * 45}
            r="3"
            fill="#a64727"
          />
        ))}
        {data.map(({ real: p }, i) => (
          <rect
            key={i}
            x={100 + (p[0] + 2.5) * 100}
            y={50 + (p[1] + 2.5) * 45}
            width="4"
            height="4"
            fill="currentColor"
          />
        ))}
        <text x="30" y="320" fill="currentColor">
          Squares: real · rust circles: generated · blue intensity: D(real |
          location)
        </text>
      </Figure>
      <div className="vl-playback">
        <button onClick={() => step("D")}>Step D</button>
        <button onClick={() => step("G")}>Step G</button>
        <button onClick={() => setRun(!run)}>{run ? "Pause" : "Train"}</button>
        <button
          onClick={() => {
            setRun(false);
            setState(ganInitial());
            setError("");
          }}
        >
          Reset
        </button>
        <output>Step {state.step}</output>
      </div>
      {error && <p role="alert">{error}</p>}
      <Formula
        symbol="LD = −E log D(real) − E log(1−D(G(z))); LG = −E log D(G(z))"
        result={
          state.history.length
            ? `D loss ${fmt(state.history.at(-1)![1])}; G loss ${fmt(state.history.at(-1)![2])}`
            : "Press Step D or Step G to calculate an update."
        }
      />
      <Plot
        title="Adversarial losses"
        xRange={[0, Math.max(1, state.step)]}
        yRange={[0, 3]}
        lines={[
          {
            label: "Discriminator",
            points: state.history.map((h) => [h[0], h[1]]),
          },
          {
            label: "Generator",
            points: state.history.map((h) => [h[0], h[2]]),
          },
        ]}
      />
    </LabLayout>
  );
}
