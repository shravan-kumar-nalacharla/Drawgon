import { useState } from "react";
import { neuronLesson } from "../lesson/Neuron";
import { networkLesson } from "../lesson/Network";
import { descentLesson } from "../lesson/Descent";
import { readNeuron } from "../state/experiment";
import { scalarLoss } from "../engine/preprocessing";
import Preprocessing from "./Preprocessing";
import {
  activation,
  activations,
  backprop,
  derivative,
  forward,
  network,
  neuron,
  optimize,
  optimizers,
  softmax,
  sum,
  type Activation,
  type Optimizer,
} from "../engine/math";
import {
  Control,
  Figure,
  Formula,
  LabLayout,
  Matrix,
  NetworkView,
  Playback,
  Plot,
  Select,
  fmt,
} from "../components/Primitives";
export default function Foundations({ topic }: { topic: string }) {
  if (topic === "preprocessing") return <Preprocessing />;
  if (topic === "neuron") return <Neuron />;
  if (topic === "activations") return <Activations />;
  if (topic === "softmax" || topic === "losses")
    return <Losses soft={topic === "softmax"} />;
  if (["gradient-descent", "optimizers"].includes(topic)) return <Descent />;
  if (["gradient-flow", "initialization"].includes(topic))
    return <GradientFlow />;
  return <Backprop forwardOnly={topic === "forward"} />;
}
function Neuron() {
  const [saved] = useState(readNeuron);
  const [x, setX] = useState<number[]>(saved?.x ?? [1, 0.5, -0.2]),
    [w, setW] = useState<number[]>(saved?.w ?? [0.7, -0.3, 0.4]),
    [b, setB] = useState(saved?.b ?? 0.1),
    [act, setAct] = useState<Activation>(saved?.act ?? "Sigmoid"),
    [step, setStep] = useState(saved?.step ?? 0),
    [selected, select] = useState([0, 0, 0]);
  const n = neuron(x, w, b, act);
  return (
    <LabLayout
      experiment={{ version: 1, topic: "neuron", x, w, b, act, step }}
      lesson={neuronLesson(x, w, b, act)}
      controls={
        <>
          <h2>Give each input an importance</h2>
          {x.map((v, i) => (
            <Control
              key={i}
              label={`Input ${i + 1}`}
              value={v}
              onChange={(n) => setX(x.map((v, j) => (j === i ? n : v)))}
            />
          ))}
          {w.map((v, i) => (
            <Control
              key={i}
              label={`Weight ${i + 1}`}
              value={v}
              onChange={(n) => setW(w.map((v, j) => (j === i ? n : v)))}
            />
          ))}
          <Control label="Bias" value={b} onChange={setB} />
          <Select
            label="Activation"
            value={act}
            options={activations}
            onChange={(v) => setAct(v as Activation)}
          />
          <p>
            Selected contribution: x{selected[2] + 1} × w{selected[2] + 1} ={" "}
            {fmt(n.terms[selected[2]])}
          </p>
        </>
      }
    >
      <NetworkView
        animateChanges
        net={{ w: [[w]], b: [[b]], act }}
        values={[x, [n.a]]}
        onSelect={(...v) => select(v)}
        selected={selected}
      />
      <Formula
        symbol="z = Σ xᵢwᵢ + b; a = f(z)"
        substitution={`${x.map((v, i) => `(${fmt(v)} × ${fmt(w[i])})`).join(" + ")} + ${fmt(b)} = ${fmt(n.z)}`}
        result={`Output = ${fmt(n.a)}`}
      />
      <p className="vl-caption">
        {
          [
            "Input: three measured features enter the neuron.",
            "Multiply each input by its weight.",
            "Add the weighted contributions and bias.",
            "Apply the activation function.",
            "Output is ready for the next layer.",
          ][step]
        }
      </p>
      <Playback step={step} setStep={setStep} max={4} />
    </LabLayout>
  );
}
function Activations() {
  const [act, setAct] = useState<Activation>("Sigmoid"),
    [compare, setCompare] = useState<Activation>("ReLU"),
    [x, setX] = useState(0);
  const points = Array.from({ length: 161 }, (_, i) => i / 20 - 4);
  return (
    <LabLayout
      controls={
        <>
          <Select
            label="Function"
            value={act}
            options={activations}
            onChange={(v) => setAct(v as Activation)}
          />
          <Select
            label="Compare with"
            value={compare}
            options={activations}
            onChange={(v) => setCompare(v as Activation)}
          />
          <Control label="Input x" value={x} min={-4} max={4} onChange={setX} />
          <button
            onClick={() => {
              setAct("Sigmoid");
              setX(4);
            }}
          >
            Sigmoid saturation
          </button>
          <button
            onClick={() => {
              setAct("ReLU");
              setX(-2);
            }}
          >
            Dead ReLU
          </button>
          <p>
            Derivatives measure how much a small input change affects the
            output. Binary step is not differentiable at zero; its derivative is
            zero elsewhere. ReLU uses the conventional zero derivative at zero.
            GELU uses its tanh approximation.
          </p>
        </>
      }
    >
      <Plot
        title="Activation and derivative"
        xRange={[-4, 4]}
        yRange={[-4, 4]}
        lines={[
          { label: act, points: points.map((x) => [x, activation(x, act)]) },
          {
            label: `${act} derivative`,
            points: points.map((x) => [x, derivative(x, act)]),
          },
          {
            label: compare,
            points: points.map((x) => [x, activation(x, compare)]),
          },
        ]}
        points={[{ x, y: activation(x, act), label: 0 }]}
      />
      <Formula
        symbol="a = f(x); local gradient = f′(x)"
        substitution={`f(${fmt(x)}) = ${fmt(activation(x, act))}`}
        result={`f′(${fmt(x)}) = ${fmt(derivative(x, act))}`}
      />
    </LabLayout>
  );
}
function Backprop({ forwardOnly = false }: { forwardOnly?: boolean }) {
  const [net, setNet] = useState(() => network([2, 2, 1])),
    [x, setX] = useState([[0.7, 0.3]]),
    [target, setTarget] = useState(1),
    [lr, setLr] = useState(0.1),
    [phase, setPhase] = useState(0),
    [selected, select] = useState([0, 0, 0]);
  const g = backprop(net, x[0], [target]),
    [l, j, i] = selected,
    w = net.w[l][j][i],
    grad = g.gw[l][j][i];
  const phases = [
    "Inputs",
    "Hidden weighted sums and activations",
    "Output activation",
    "Loss",
    "Output derivative",
    "Hidden derivatives (chain rule)",
    "Weight update",
  ];
  return (
    <LabLayout
      lesson={networkLesson(net, x[0], target, lr, forwardOnly)}
      controls={
        <>
          <h2>Inspect a connection</h2>
          <Matrix name="Inputs" values={x} onChange={setX} />
          <Control
            label="Target"
            value={target}
            min={0}
            max={1}
            onChange={setTarget}
          />
          <Control
            label="Learning rate"
            value={lr}
            min={0.001}
            max={2}
            step={0.001}
            onChange={setLr}
          />
          <Control
            label="Selected weight"
            value={w}
            onChange={(v) =>
              setNet({
                ...net,
                w: net.w.map((layer, a) =>
                  layer.map((row, b) =>
                    row.map((n, c) => (a === l && b === j && c === i ? v : n)),
                  ),
                ),
              })
            }
          />
          <Formula
            symbol="∂L/∂w = δ × input activation"
            substitution={`${fmt(g.d[l][j])} × ${fmt(g.a[l][i])}`}
            result={`Gradient = ${fmt(grad)}`}
          />
          <p>
            Output δ = (a − target) × a(1 − a). A hidden δ sums downstream
            weighted errors and multiplies by its own activation derivative.
          </p>
        </>
      }
    >
      <NetworkView
        net={net}
        values={g.a}
        gradients={phase >= 4 ? g.gw : undefined}
        selected={selected}
        onSelect={(...v) => select(v)}
      />
      <Formula
        symbol="L = ½(a − target)²"
        substitution={`½(${fmt(g.a.at(-1)![0])} − ${target})²`}
        result={`Loss = ${fmt(g.loss)}`}
      />
      <h3 aria-live="polite">{phases[phase]}</h3>
      <Matrix name="Hidden z" values={[g.z[0]]} />
      <Formula
        symbol="w(new) = w − η ∂L/∂w"
        substitution={`${fmt(w)} − ${fmt(lr)} × ${fmt(grad)}`}
        result={`New weight = ${fmt(w - lr * grad)}`}
      />
      <Playback step={phase} setStep={setPhase} max={6} />
      <button
        onClick={() => {
          setNet({
            ...net,
            w: net.w.map((layer, l) =>
              layer.map((row, j) => row.map((w, i) => w - lr * g.gw[l][j][i])),
            ),
            b: net.b.map((row, l) => row.map((v, j) => v - lr * g.gb[l][j])),
          });
          setPhase(0);
        }}
      >
        Apply gradient update
      </button>
      <button
        onClick={() => {
          setNet(network([2, 2, 1]));
          setPhase(0);
        }}
      >
        Reset network
      </button>
    </LabLayout>
  );
}
function Losses({ soft }: { soft: boolean }) {
  const [logits, setLogits] = useState([[2, 1, -1]]),
    [temperature, setTemp] = useState(1),
    [target, setTarget] = useState(1),
    [p, setP] = useState(0.7),
    [kind, setKind] = useState("Binary cross entropy");
  const probs = softmax(logits[0], temperature),
    loss = (v: number) => scalarLoss(kind, v, target);
  return (
    <LabLayout
      controls={
        <>
          {soft ? (
            <>
              <Matrix name="Logits" values={logits} onChange={setLogits} />
              <Control
                label="Temperature"
                value={temperature}
                min={0.1}
                max={4}
                onChange={setTemp}
              />
              <Control
                label="Target class"
                value={target}
                min={0}
                max={2}
                step={1}
                onChange={setTarget}
              />
            </>
          ) : (
            <>
              <Select
                label="Loss function"
                value={kind}
                options={[
                  "MSE",
                  "MAE",
                  "Huber",
                  "Log-cosh",
                  "Binary cross entropy",
                  "Hinge",
                  "Focal",
                ]}
                onChange={setKind}
              />
              <Control
                label="Prediction"
                value={p}
                min={0.01}
                max={0.99}
                step={0.01}
                onChange={setP}
              />
              <Control
                label="Target"
                value={target}
                min={0}
                max={1}
                step={1}
                onChange={setTarget}
              />
            </>
          )}
          <p>
            Cross entropy penalizes confidently incorrect probabilities. Softmax
            converts all logits together; it is not an independent scalar
            activation.
          </p>
        </>
      }
    >
      {soft ? (
        <>
          <Figure title="Softmax probabilities">
            {probs.map((v, i) => (
              <g key={i}>
                <rect
                  x={120 + i * 190}
                  y={285 - v * 200}
                  width="80"
                  height={v * 200}
                  fill="#326d96"
                />
                <text
                  x={160 + i * 190}
                  y="315"
                  fill="currentColor"
                  textAnchor="middle"
                >
                  Class {i}: {fmt(v)}
                </text>
              </g>
            ))}
          </Figure>
          <Formula
            symbol="pᵢ = exp((zᵢ − max z)/T) / Σ exp((zⱼ − max z)/T)"
            result={`Σ p = ${fmt(sum(probs))}; categorical cross entropy = −log p[target] = ${fmt(-Math.log(Math.max(1e-12, probs[target])))}`}
          />
        </>
      ) : (
        <>
          <Plot
            title="Prediction versus loss"
            xRange={[0, 1]}
            yRange={[0, 5]}
            lines={[
              {
                label: kind,
                points: Array.from({ length: 99 }, (_, i) => [
                  (i + 1) / 100,
                  loss((i + 1) / 100),
                ]),
              },
            ]}
            points={[{ x: p, y: loss(p), label: 0 }]}
          />
          <Formula
            symbol={kind}
            result={`Loss = ${fmt(loss(p))}; derivative ≈ ${fmt((loss(p + 1e-5) - loss(p - 1e-5)) / 2e-5)}`}
          />
        </>
      )}
    </LabLayout>
  );
}
function Descent() {
  const [kind, setKind] = useState<Optimizer>("Batch GD"),
    [lr, setLr] = useState(0.1),
    [start, setStart] = useState(2),
    [step, setStep] = useState(0),
    [landscape, setLandscape] = useState("Bowl"),
    [decay, setDecay] = useState(0);
  const history = optimize(kind, [start, 1.5], lr, step, landscape, decay),
    other = optimize("Adam", [start, 1.5], lr, step, landscape, decay),
    now = history.at(-1)!;
  return (
    <LabLayout
      lesson={descentLesson(kind, start, lr, landscape, decay)}
      controls={
        <>
          <Select
            label="Optimizer"
            value={kind}
            options={optimizers}
            onChange={(v) => {
              setKind(v as Optimizer);
              setStep(0);
            }}
          />
          <Select
            label="Landscape"
            value={landscape}
            options={["Bowl", "Ripples"]}
            onChange={setLandscape}
          />
          <Control
            label="Learning rate"
            value={lr}
            min={0.001}
            max={1.1}
            step={0.001}
            onChange={setLr}
          />
          <Control label="Start x" value={start} onChange={setStart} />
          <Control
            label="Learning rate decay"
            value={decay}
            min={0}
            max={0.2}
            step={0.01}
            onChange={setDecay}
          />
          {[
            ["Too slow", 0.005],
            ["Good rate", 0.15],
            ["Overshooting", 0.5],
          ].map(([label, v]) => (
            <button
              key={label}
              onClick={() => {
                setLr(+v);
                setStep(0);
              }}
            >
              {label}
            </button>
          ))}
          <p>
            Both paths start at the same position. SGD uses seeded sample
            perturbations of the quadratic objective. Ripples illustrates local
            optima; it does not guarantee a global minimum.
          </p>
        </>
      }
    >
      <Plot
        title="Optimization trajectory · x and y parameters"
        lines={[
          { label: kind, points: history.map((h) => h.p) },
          { label: "Adam comparison", points: other.map((h) => h.p) },
        ]}
        points={[{ x: now.p[0], y: now.p[1], label: 0 }]}
        xRange={[-4, 4]}
        yRange={[-4, 4]}
      />
      <Formula
        symbol={
          landscape === "Bowl" ? "L = x² + 3y²" : "L = Σ (0.2p² + sin(3p))"
        }
        result={`Position (${now.p.map(fmt).join(", ")}); loss ${fmt(now.loss)}`}
      />
      {history.length < step + 1 && (
        <p role="alert">
          Training diverged beyond the educational limit. Reduce the learning
          rate.
        </p>
      )}
      <Playback step={step} setStep={setStep} max={100} />
      <Plot
        title="Calculated loss history"
        xRange={[0, Math.max(1, step)]}
        yRange={[0, Math.max(1, ...history.map((h) => h.loss))]}
        lines={[{ label: "Loss", points: history.map((h, i) => [i, h.loss]) }]}
      />
    </LabLayout>
  );
}
function GradientFlow() {
  const [depth, setDepth] = useState(5),
    [scale, setScale] = useState(1),
    [act, setAct] = useState<Activation>("Sigmoid"),
    [init, setInit] = useState("Xavier"),
    [seed, setSeed] = useState(42);
  const net = network([1, ...Array(depth).fill(1)], seed, act, init);
  net.w = net.w.map((l) => l.map((r) => r.map((w) => w * scale)));
  const f = forward(net, [1]);
  let gradient = 1;
  const grads = net.w.map(() => 0);
  for (let l = depth - 1; l >= 0; l--) {
    gradient *=
      net.w[l][0][0] * derivative(f.z[l][0], l === depth - 1 ? "Sigmoid" : act);
    grads[l] = gradient;
  }
  return (
    <LabLayout
      controls={
        <>
          <Control
            label="Depth"
            min={1}
            max={20}
            step={1}
            value={depth}
            onChange={setDepth}
          />
          <Control
            label="Weight scale"
            min={0.1}
            max={5}
            value={scale}
            onChange={setScale}
          />
          <Select
            label="Activation"
            options={activations}
            value={act}
            onChange={(v) => setAct(v as Activation)}
          />
          <Select
            label="Initialization"
            value={init}
            options={["Zeros", "Small", "Large", "Xavier", "He"]}
            onChange={setInit}
          />
          <Control
            label="Seed"
            value={seed}
            min={1}
            max={999}
            step={1}
            onChange={setSeed}
          />
          <p>
            This scalar chain exposes exact products through depth. Zero weights
            block input gradients. Sigmoid saturates; ReLU may become inactive.
            Xavier and He adjust variance to fan-in, not a guarantee of
            convergence.
          </p>
        </>
      }
    >
      <Plot
        title="Gradient magnitude through layers (log₁₀)"
        xRange={[0, depth]}
        yRange={[-16, 6]}
        lines={[
          {
            label: "log₁₀ |∂output/∂input|",
            points: grads.map((g, i) => [
              i,
              Math.log10(Math.max(1e-16, Math.abs(g))),
            ]),
          },
        ]}
      />
      <Matrix name="Activations" values={[f.a.slice(1).map((a) => a[0])]} />
      <Formula
        symbol="Chain rule: ∏ wₗ f′(zₗ)"
        result={`Input gradient = ${fmt(grads[0])}`}
      />
    </LabLayout>
  );
}
