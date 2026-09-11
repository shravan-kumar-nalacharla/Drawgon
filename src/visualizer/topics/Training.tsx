import { useEffect, useMemo, useRef, useState } from "react";
import {
  dataset,
  forward,
  network,
  random,
  type Activation,
} from "../engine/math";
import { evaluate, type TrainState } from "../engine/training";
import {
  Control,
  Formula,
  LabLayout,
  NetworkView,
  Plot,
  Select,
  fmt,
} from "../components/Primitives";
const initial = (
  width: number,
  depth: number,
  seed: number,
  act: Activation,
  init: string,
): TrainState => ({
  net: network([2, ...Array(depth).fill(width), 1], seed, act, init),
  epoch: 0,
  loss: 0,
  validation: 0,
  history: [],
  velocity: [],
  variance: [],
});
export default function Training({ topic }: { topic: string }) {
  const [width, setWidth] = useState(4),
    [depth, setDepth] = useState(1),
    [seed, setSeed] = useState(42),
    [kind, setKind] = useState(topic === "xor" ? "XOR" : "Moons"),
    [noise, setNoise] = useState(0.15),
    [lr, setLr] = useState(0.05),
    [act, setAct] = useState<Activation>("Tanh"),
    [init, setInit] = useState("Xavier"),
    [penalty, setPenalty] = useState("None"),
    [lambda, setLambda] = useState(0.01),
    [dropout, setDropout] = useState(topic === "dropout" ? 0.3 : 0),
    [batch, setBatch] = useState(16),
    [optimizer, setOptimizer] = useState("Adam"),
    [freeze, setFreeze] = useState("Train head"),
    [early, setEarly] = useState(false),
    [running, setRunning] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [state, setState] = useState(() => initial(4, 1, 42, "Tanh", "Xavier"));
  const worker = useRef<Worker | null>(null),
    revision = useRef(0),
    runRef = useRef(false),
    history = useRef<TrainState[]>([]);
  const points = useMemo(
      () => dataset(kind, seed, 80, noise),
      [kind, seed, noise],
    ),
    samples = useMemo(
      () => points.slice(0, 60).map((p) => ({ x: [p.x, p.y], y: [p.label] })),
      [points],
    ),
    validation = useMemo(
      () => points.slice(60).map((p) => ({ x: [p.x, p.y], y: [p.label] })),
      [points],
    );
  useEffect(() => {
    const w = new Worker(
      new URL("../engine/training.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.current = w;
    w.onmessage = (e) => {
      if (e.data.revision !== revision.current) return;
      setBusy(false);
      if (e.data.error) {
        setError(e.data.error);
        setRunning(false);
      } else setState(e.data.state);
    };
    w.onerror = () => {
      setError("The training worker could not start. Reload the page.");
      setBusy(false);
      setRunning(false);
    };
    return () => {
      runRef.current = false;
      w.terminate();
      worker.current = null;
    };
  }, []);
  const options = {
    lr,
    lambda,
    penalty,
    dropout,
    seed,
    freeze:
      topic === "transfer-learning"
        ? freeze === "Train head"
          ? Math.max(0, state.net.w.length - 1)
          : freeze === "Fine-tune last layers"
            ? Math.max(0, state.net.w.length - 2)
            : 0
        : 0,
    batch,
    optimizer,
  };
  function train() {
    if (busy || state.epoch >= 2000) return;
    history.current = [...history.current, state].slice(-30);
    setBusy(true);
    worker.current?.postMessage({
      state,
      samples,
      validation,
      options,
      steps: 1,
      revision: revision.current,
    });
  }
  useEffect(() => {
    runRef.current = running;
    if (!running || busy) return;
    if (
      state.epoch >= 2000 ||
      (early &&
        state.history.length > 20 &&
        state.validation >
          Math.min(...state.history.slice(-20).map((h) => h[2])) * 1.05)
    ) {
      const timer = setTimeout(() => setRunning(false), 0);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(train, 30);
    return () => clearTimeout(timer);
  });
  function reset(
    w = width,
    d = depth,
    a = act,
    initialization = init,
    s = seed,
  ) {
    revision.current++;
    setBusy(false);
    setRunning(false);
    setError("");
    history.current = [];
    setState(initial(w, d, s, a, initialization));
  }
  const current = forward(state.net, [0.5, -0.5]),
    accuracy = evaluate(state.net, validation),
    boundary = Array.from({ length: 100 }, (_, i) => {
      const rng = random(i + 5),
        x = rng() * 6 - 3,
        y = rng() * 6 - 3;
      return { x, y, label: +(forward(state.net, [x, y]).a.at(-1)![0] >= 0.5) };
    });
  return (
    <LabLayout
      controls={
        <>
          <Select
            label="Dataset"
            value={kind}
            options={["Blobs", "XOR", "Circles", "Moons", "Spirals"]}
            onChange={(v) => {
              setKind(v);
              reset();
            }}
          />
          <Control
            label="Hidden layers"
            value={depth}
            min={0}
            max={3}
            step={1}
            onChange={(n) => {
              setDepth(n);
              reset(width, n);
            }}
          />
          <Control
            label="Neurons per hidden layer"
            value={width}
            min={1}
            max={6}
            step={1}
            onChange={(n) => {
              setWidth(n);
              reset(n);
            }}
          />
          <Select
            label="Hidden activation"
            value={act}
            options={["Tanh", "Sigmoid", "ReLU", "Leaky ReLU"]}
            onChange={(v) => {
              setAct(v as Activation);
              reset(width, depth, v as Activation);
            }}
          />
          <Select
            label="Initialization"
            value={init}
            options={["Xavier", "He", "Zeros", "Small", "Large"]}
            onChange={(v) => {
              setInit(v);
              reset(width, depth, act, v);
            }}
          />
          <Select
            label="Optimizer"
            value={optimizer}
            options={["Adam", "SGD"]}
            onChange={setOptimizer}
          />
          <Control
            label="Learning rate"
            value={lr}
            min={0.001}
            max={0.5}
            step={0.001}
            onChange={setLr}
          />
          <Control
            label="Batch size"
            value={batch}
            min={1}
            max={60}
            step={1}
            onChange={setBatch}
          />
          <Control
            label="Noise"
            value={noise}
            min={0}
            max={1}
            onChange={setNoise}
          />
          <Control
            label="Seed"
            value={seed}
            min={1}
            max={999}
            step={1}
            onChange={(n) => {
              setSeed(n);
              reset(width, depth, act, init, n);
            }}
          />
          <Select
            label="Regularization"
            value={penalty}
            options={["None", "L1", "L2"]}
            onChange={setPenalty}
          />
          <Control
            label="Penalty strength"
            value={lambda}
            min={0}
            max={0.2}
            step={0.001}
            onChange={setLambda}
          />
          <Control
            label="Dropout probability"
            value={dropout}
            min={0}
            max={0.8}
            onChange={setDropout}
          />
          <label>
            <input
              type="checkbox"
              checked={early}
              onChange={(e) => setEarly(e.target.checked)}
            />{" "}
            Early stopping on validation deterioration
          </label>
          {topic === "transfer-learning" && (
            <>
              <Select
                label="Fine tuning"
                value={freeze}
                options={[
                  "Train head",
                  "Fine-tune last layers",
                  "Fine-tune all",
                ]}
                onChange={setFreeze}
              />
              <p>
                This is a locally trained toy backbone. First select “Fine-tune
                all” to learn the source dataset, then switch the dataset
                without resetting weights using the button below and freeze
                layers.
              </p>
              <button
                disabled={busy}
                onClick={() => setKind(kind === "Moons" ? "Circles" : "Moons")}
              >
                Change target domain, keep weights
              </button>
              <p>
                {state.net.w.slice(options.freeze).flat(2).length +
                  state.net.b.slice(options.freeze).flat().length}{" "}
                trainable parameters; {options.freeze} frozen layers.
              </p>
            </>
          )}
        </>
      }
    >
      <NetworkView net={state.net} values={current.a} />
      <div className="vl-playback">
        <button disabled={busy || state.epoch >= 2000} onClick={train}>
          Train step
        </button>
        <button onClick={() => setRunning(!running)}>
          {running ? "Pause" : "Train"}
        </button>
        <button disabled={busy} onClick={() => reset()}>
          Reset
        </button>
        <button
          disabled={busy || !history.current.length}
          onClick={() => {
            setRunning(false);
            setState(history.current.pop()!);
          }}
        >
          Previous step
        </button>
        <output>Epoch {state.epoch} / 2000</output>
      </div>
      {error && <p role="alert">{error}</p>}
      <Formula
        symbol="Loss = mean ½(prediction − target)²"
        result={
          state.epoch
            ? `Train ${fmt(state.loss)} · validation ${fmt(state.validation)} · validation accuracy ${fmt(accuracy * 100)}%`
            : "Press Train step to calculate the first training update."
        }
      />
      <Plot
        title="Predicted classes on a fixed sample grid"
        points={boundary}
      />
      <Plot
        title="Train and validation loss"
        xRange={[0, Math.max(1, state.epoch)]}
        yRange={[0, 0.5]}
        lines={[
          { label: "Train", points: state.history.map((h) => [h[0], h[1]]) },
          {
            label: "Validation",
            points: state.history.map((h) => [h[0], h[2]]),
          },
        ]}
      />
      <p className="vl-caption">
        60 training and 20 validation points. Inverted dropout applies a seeded
        mask during training; the network above shows inference, with all units
        enabled. Each step is one mini-batch update. Numerical work runs in a
        worker.
      </p>
      {topic === "xor" && (
        <p>
          XOR has no single straight separating boundary. Set hidden layers to
          zero to see the linear limitation, then restore a hidden layer and
          train.
        </p>
      )}
    </LabLayout>
  );
}
