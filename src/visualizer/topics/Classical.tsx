import { useMemo, useState } from "react";
import {
  assign,
  centroids,
  dataset,
  distance,
  dot,
  metrics,
  pca,
  random,
  sigmoid,
  sum,
  type Point,
} from "../engine/math";
import {
  dbscan,
  forest,
  knn,
  logisticStep,
  naiveBayes,
  perceptronStep,
  polynomial,
  svm,
  tree,
  treePredict,
  type Tree,
} from "../engine/classical";
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
export default function Classical({ topic }: { topic: string }) {
  return ["kmeans", "dbscan", "pca"].includes(topic) ? (
    <Clustering topic={topic} />
  ) : ["linear-regression", "overfitting"].includes(topic) ? (
    <Regression topic={topic} />
  ) : topic === "metrics" ? (
    <Metrics />
  ) : (
    <Classifier topic={topic} />
  );
}
function Clustering({ topic }: { topic: string }) {
  const [kind, setKind] = useState("Blobs"),
    [seed, setSeed] = useState(42),
    [points, setPoints] = useState(() => dataset()),
    [k, setK] = useState(3),
    [step, setStep] = useState(0),
    [eps, setEps] = useState(0.45),
    [minPts, setMin] = useState(4);
  let centers = dataset("Blobs", seed, k).map((p, i) => ({ ...p, label: i })),
    ps = points.map((p) => ({ ...p, label: -1 }));
  for (let i = 0; i < step; i++) {
    if (i % 2 === 0) ps = assign(ps, centers);
    else centers = centroids(ps, centers);
  }
  const principal = pca(points),
    clustered = dbscan(points, eps, minPts);
  return (
    <LabLayout
      controls={
        <>
          <Select
            label="Dataset"
            value={kind}
            options={["Blobs", "Moons", "Circles", "XOR"]}
            onChange={(v) => {
              setKind(v);
              setPoints(dataset(v, seed));
              setStep(0);
            }}
          />
          <Control
            label="Seed"
            value={seed}
            min={1}
            max={999}
            step={1}
            onChange={(n) => {
              setSeed(n);
              setPoints(dataset(kind, n));
              setStep(0);
            }}
          />
          {topic === "kmeans" ? (
            <Control
              label="Clusters k"
              value={k}
              min={1}
              max={5}
              step={1}
              onChange={(n) => {
                setK(n);
                setStep(0);
              }}
            />
          ) : topic === "dbscan" ? (
            <>
              <Control
                label="Epsilon radius"
                value={eps}
                min={0.05}
                max={2}
                onChange={setEps}
              />
              <Control
                label="Minimum points"
                value={minPts}
                min={2}
                max={15}
                step={1}
                onChange={setMin}
              />
            </>
          ) : (
            <Matrix name="Covariance" values={principal.cov} />
          )}
          <p>
            Click the coordinate plot to add a point (up to 120).{" "}
            {topic === "kmeans"
              ? "Assignment finds the nearest center. Update moves each center to its assigned mean. Empty clusters retain their previous center."
              : topic === "pca"
                ? "PCA finds the axis with greatest variance after centering. The line below is the first principal component."
                : "Core points have enough neighbors within ε. Noise has label −1; border points touch a core region."}
          </p>
          <button
            onClick={() => {
              setPoints(dataset(kind, seed));
              setStep(0);
            }}
          >
            Reset data
          </button>
        </>
      }
    >
      <Plot
        title={
          topic === "pca"
            ? "PCA projection"
            : topic === "dbscan"
              ? "Density clusters"
              : "K-means · assignment and centroid update"
        }
        points={topic === "pca" ? points : topic === "dbscan" ? clustered : ps}
        onPoint={(x, y) => {
          if (points.length < 120) {
            setPoints([...points, { x, y, label: 0 }]);
            setStep(0);
          }
        }}
        lines={
          topic === "pca"
            ? [
                {
                  label: "Principal axis",
                  points: [-3, 3].map((t) => [
                    principal.mean.x + t * principal.e[0],
                    principal.mean.y + t * principal.e[1],
                  ]),
                },
              ]
            : centers.map((p, i) => ({
                label: `Center ${i + 1}`,
                points: [
                  [p.x - 0.1, p.y],
                  [p.x + 0.1, p.y],
                ],
              }))
        }
      />
      {topic === "kmeans" ? (
        <>
          <Formula
            symbol="SSE = Σ ‖point − assigned center‖²"
            result={`SSE = ${fmt(sum(ps.map((p) => (p.label < 0 ? 0 : distance(p, centers[p.label]) ** 2))))} · ${step % 2 ? "Next: move centers" : "Next: assign points"}`}
          />
          <Playback step={step} setStep={setStep} max={30} />
          <Matrix
            name="Centroids (x,y)"
            values={centers.map((p) => [p.x, p.y])}
          />
        </>
      ) : topic === "pca" ? (
        <>
          <Plot
            title="Points projected onto PC1"
            points={principal.projected}
          />
          <Formula
            symbol="Covariance eigenvalues → explained variance"
            result={`λ = ${principal.values.map(fmt).join(", ")}; PC1 explains ${fmt((principal.values[0] / Math.max(1e-12, sum(principal.values))) * 100)}%`}
          />
        </>
      ) : (
        <Formula
          symbol="Neighborhood includes the point itself"
          result={`${clustered.filter((p) => p.core).length} core points; ${clustered.filter((p) => p.label === -1).length} noise points`}
        />
      )}
    </LabLayout>
  );
}
function Regression({ topic }: { topic: string }) {
  const [seed, setSeed] = useState(42),
    [noise, setNoise] = useState(0.5),
    [degree, setDegree] = useState(3),
    [slope, setSlope] = useState(0.5),
    [bias, setBias] = useState(0),
    [lr, setLr] = useState(0.05),
    [extra, setExtra] = useState<Point[]>([]);
  const rng = random(seed),
    points = Array.from({ length: 18 }, (_, i) => {
      const x = i / 3 - 3;
      return {
        x,
        y:
          topic === "overfitting"
            ? Math.sin(x * 1.5) + (rng() - 0.5) * noise
            : 0.7 * x + 0.2 + (rng() - 0.5) * noise,
        label: 0,
      };
    }).concat(extra),
    fit = polynomial(points, degree),
    predict = (x: number) =>
      topic === "overfitting" ? fit.predict(x) : slope * x + bias,
    loss = sum(points.map((p) => (predict(p.x) - p.y) ** 2)) / points.length,
    validation =
      sum(
        Array.from({ length: 40 }, (_, i) => {
          const x = i * 0.15 - 3;
          return (
            (predict(x) -
              (topic === "overfitting" ? Math.sin(x * 1.5) : 0.7 * x + 0.2)) **
            2
          );
        }),
      ) / 40;
  return (
    <LabLayout
      controls={
        <>
          {topic === "overfitting" ? (
            <Control
              label="Polynomial degree"
              value={degree}
              min={1}
              max={12}
              step={1}
              onChange={setDegree}
            />
          ) : (
            <>
              <Control label="Slope" value={slope} onChange={setSlope} />
              <Control label="Intercept" value={bias} onChange={setBias} />
              <Control
                label="Learning rate"
                value={lr}
                min={0.001}
                max={0.2}
                step={0.001}
                onChange={setLr}
              />
              <button
                onClick={() => {
                  setSlope(
                    slope -
                      (lr *
                        sum(
                          points.map((p) => 2 * (predict(p.x) - p.y) * p.x),
                        )) /
                        points.length,
                  );
                  setBias(
                    bias -
                      (lr * sum(points.map((p) => 2 * (predict(p.x) - p.y)))) /
                        points.length,
                  );
                }}
              >
                Gradient step
              </button>
            </>
          )}
          <Control
            label="Noise"
            value={noise}
            min={0}
            max={2}
            onChange={setNoise}
          />
          <Control
            label="Seed"
            value={seed}
            min={1}
            max={999}
            step={1}
            onChange={setSeed}
          />
          <button
            onClick={() => {
              setSlope(0.5);
              setBias(0);
              setDegree(3);
              setExtra([]);
            }}
          >
            Reset
          </button>
          <p>
            Click to add points. Training error measures the shown samples.
            Validation measures the underlying noiseless curve at 40 held-out
            positions.
          </p>
        </>
      }
    >
      <Plot
        title={
          topic === "overfitting"
            ? "Model complexity and generalization"
            : "Linear regression and residuals"
        }
        points={points}
        onPoint={(x, y) => {
          if (extra.length < 40) setExtra([...extra, { x, y, label: 0 }]);
        }}
        lines={[
          {
            label: "Fit",
            points: Array.from({ length: 121 }, (_, i) => {
              const x = i / 20 - 3;
              return [x, predict(x)];
            }),
          },
        ]}
      />
      <Formula
        symbol="MSE = Σ(prediction − target)² / N"
        result={`Training MSE ${fmt(loss)} · validation MSE ${fmt(validation)}`}
      />
    </LabLayout>
  );
}
function TreeView({ node }: { node: Tree }) {
  const items: { t: Tree; x: number; y: number; parent?: number[] }[] = [];
  function visit(
    t: Tree,
    x: number,
    y: number,
    span: number,
    parent?: number[],
  ) {
    items.push({ t, x, y, parent });
    if (t.left && y < 250) {
      visit(t.left, x - span, y + 65, span / 2, [x, y]);
      visit(t.right!, x + span, y + 65, span / 2, [x, y]);
    }
  }
  visit(node, 360, 65, 160);
  return (
    <Figure title="Decision rules · inspect node labels" height={390}>
      {items.map(({ t, x, y, parent }, i) => (
        <g key={i}>
          {parent && (
            <line
              x1={parent[0]}
              y1={parent[1]}
              x2={x}
              y2={y}
              stroke="currentColor"
            />
          )}
          <rect
            x={x - 52}
            y={y - 15}
            width="104"
            height="36"
            rx="4"
            fill="var(--vl-paper)"
            stroke="currentColor"
          />
          <text
            x={x}
            y={y}
            fill="currentColor"
            textAnchor="middle"
            fontSize="11"
          >
            {t.feature
              ? `${t.feature} ≤ ${fmt(t.threshold!)}`
              : `p(1)=${fmt(t.prob)}`}
          </text>
          <text
            x={x}
            y={y + 14}
            fill="currentColor"
            textAnchor="middle"
            fontSize="10"
          >
            n={t.n}, impurity={fmt(t.impurity)}
          </text>
          <title>
            {JSON.stringify({
              samples: t.n,
              probability: t.prob,
              impurity: t.impurity,
            })}
          </title>
        </g>
      ))}
    </Figure>
  );
}
function Classifier({ topic }: { topic: string }) {
  const [kind, setKind] = useState("Blobs"),
    [points, setPoints] = useState(() => dataset()),
    [k, setK] = useState(5),
    [q, setQ] = useState<Point>({ x: 0, y: 0, label: 0 }),
    [mode, setMode] = useState("Query"),
    [metric, setMetric] = useState("Euclidean"),
    [w, setW] = useState([0.5, 0.2, 0]),
    [lr, setLr] = useState(0.1),
    [step, setStep] = useState(0),
    [depth, setDepth] = useState(3),
    [criterion, setCriterion] = useState("Gini"),
    [kernel, setKernel] = useState("Linear"),
    [C, setC] = useState(1);
  const dt = useMemo(
      () => tree(points, depth, criterion),
      [points, depth, criterion],
    ),
    trees = useMemo(() => forest(points, k, 42), [points, k]),
    support = useMemo(
      () => (topic === "svm" ? svm(points, C, kernel) : null),
      [points, C, kernel, topic],
    );
  const predict = (p: Point) =>
    topic === "knn"
      ? knn(points, p, k, metric).probability
      : topic === "naive-bayes"
        ? naiveBayes(points, p)
        : topic === "decision-tree"
          ? treePredict(dt, p)
          : topic === "random-forest"
            ? sum(trees.map((t) => treePredict(t, p))) / trees.length
            : topic === "svm"
              ? sigmoid(support!.predict(p))
              : topic === "perceptron"
                ? +(dot(w, [p.x, p.y, 1]) >= 0)
                : sigmoid(dot(w, [p.x, p.y, 1]));
  const probability = predict(q),
    cells = Array.from({ length: 24 * 24 }, (_, i) => {
      const x = (i % 24) / 4 - 3,
        y = Math.floor(i / 24) / 4 - 3;
      return { x, y, p: predict({ x, y, label: 0 }) };
    });
  return (
    <LabLayout
      controls={
        <>
          <Select
            label="Dataset"
            value={kind}
            options={["Blobs", "XOR", "Moons", "Circles"]}
            onChange={(v) => {
              setKind(v);
              setPoints(dataset(v));
              setStep(0);
            }}
          />
          <Select
            label="Click action"
            value={mode}
            options={["Query", "Add class 0", "Add class 1"]}
            onChange={setMode}
          />
          {["knn", "random-forest"].includes(topic) && (
            <Control
              label={topic === "knn" ? "Neighbors k" : "Trees"}
              min={1}
              max={15}
              step={1}
              value={k}
              onChange={setK}
            />
          )}{" "}
          {topic === "knn" && (
            <Select
              label="Distance"
              value={metric}
              options={["Euclidean", "Manhattan"]}
              onChange={setMetric}
            />
          )}{" "}
          {["perceptron", "logistic-regression"].includes(topic) && (
            <>
              <Matrix
                name="Weights (x, y, bias)"
                values={[w]}
                onChange={(v) => setW(v[0])}
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
                  setW(
                    topic === "perceptron"
                      ? perceptronStep(points, w, lr, step).w
                      : logisticStep(points, w, lr),
                  );
                  setStep(step + 1);
                }}
              >
                Training step
              </button>
              <output>Training steps: {step}</output>
            </>
          )}
          {topic === "decision-tree" && (
            <>
              <Control
                label="Tree depth"
                value={depth}
                min={1}
                max={4}
                step={1}
                onChange={setDepth}
              />
              <Select
                label="Split criterion"
                value={criterion}
                options={["Gini", "Entropy"]}
                onChange={setCriterion}
              />
            </>
          )}
          {topic === "svm" && (
            <>
              <Select
                label="Kernel"
                value={kernel}
                options={["Linear", "RBF"]}
                onChange={setKernel}
              />
              <Control
                label="Soft margin C"
                value={C}
                min={0.1}
                max={5}
                onChange={setC}
              />
              <p>
                {support!.a.filter((v) => v > 1e-5).length} support vectors.
                Bounded dual optimization: 30 passes.
              </p>
            </>
          )}
          <button
            onClick={() => {
              setPoints(dataset(kind));
              setW([0.5, 0.2, 0]);
              setStep(0);
            }}
          >
            Reset
          </button>
          <p>
            Class 0: blue circles. Class 1: rust squares. Background intensity
            is the calculated prediction. Select a query location below.
          </p>
        </>
      }
    >
      <Figure title={`${topic} · calculated decision surface`}>
        {cells.map((c, i) => (
          <rect
            key={i}
            x={55 + (c.x + 3) * 100}
            y={60 + (c.y + 3) * 40}
            width="25"
            height="10"
            fill={c.p >= 0.5 ? "#a64727" : "#326d96"}
            opacity={0.12 + 0.4 * Math.abs(c.p - 0.5) * 2}
          />
        ))}
        {points.map((p, i) =>
          p.label ? (
            <rect
              key={i}
              x={55 + (p.x + 3) * 100 - 3}
              y={60 + (p.y + 3) * 40 - 3}
              width="6"
              height="6"
              fill="#a64727"
            />
          ) : (
            <circle
              key={i}
              cx={55 + (p.x + 3) * 100}
              cy={60 + (p.y + 3) * 40}
              r="3"
              fill="#326d96"
            />
          ),
        )}
        <text x="30" y="337" fill="currentColor">
          Query ({fmt(q.x)}, {fmt(q.y)}) · prediction {+(probability >= 0.5)} ·
          score {fmt(probability)}
        </text>
      </Figure>
      <Plot
        title="Edit data / place query"
        points={[...points, q]}
        onPoint={(x, y) => {
          if (mode === "Query") setQ({ x, y, label: 2 });
          else if (points.length < 100)
            setPoints([
              ...points,
              { x, y, label: mode === "Add class 1" ? 1 : 0 },
            ]);
        }}
      />
      <Formula
        symbol="Predicted class = score ≥ 0.5"
        result={`Score = ${fmt(probability)} · training accuracy ${fmt((sum(points.map((p) => +(+(predict(p) >= 0.5) === p.label))) / points.length) * 100)}%`}
      />
      {topic === "knn" && (
        <Matrix
          name="Nearest neighbors: distance, class"
          values={knn(points, q, k, metric).neighbors.map((n) => [
            n.d,
            n.p.label,
          ])}
        />
      )}{" "}
      {topic === "naive-bayes" && (
        <p>
          Gaussian class-conditional likelihoods are multiplied with class
          priors in log space, then normalized. The model assumes x and y are
          independent given the class.
        </p>
      )}
      {topic === "decision-tree" && <TreeView node={dt} />}{" "}
      {topic === "random-forest" && (
        <Matrix
          name="Bootstrap tree votes at query"
          values={[trees.map((t) => treePredict(t, q))]}
        />
      )}
    </LabLayout>
  );
}
function Metrics() {
  const [threshold, setThreshold] = useState(0.5),
    [scores, setScores] = useState([[0.9, 0.7, 0.8, 0.4, 0.3, 0.6, 0.1, 0.2]]),
    [truth, setTruth] = useState([[1, 1, 0, 1, 0, 1, 0, 0]]);
  const labels = truth[0].map((v) => +(v >= 0.5)),
    m = metrics(labels, scores[0], threshold),
    roc = [
      Infinity,
      ...[...new Set(scores[0])].sort((a, b) => b - a),
      -Infinity,
    ].map((t) => metrics(labels, scores[0], t)),
    auc = sum(
      roc
        .slice(1)
        .map(
          (p, i) =>
            ((1 - p.specificity - (1 - roc[i].specificity)) *
              (p.recall + roc[i].recall)) /
            2,
        ),
    );
  return (
    <LabLayout
      controls={
        <>
          <Control
            label="Decision threshold"
            value={threshold}
            min={0}
            max={1}
            step={0.01}
            onChange={setThreshold}
          />
          <Matrix name="Scores" values={scores} onChange={setScores} />
          <Matrix
            name="Targets (≥0.5 is class 1)"
            values={truth}
            onChange={setTruth}
          />
          <p>
            Rows: actual class 1, class 0. Columns: predicted class 1, class 0.
            A metric with a zero denominator is displayed as zero.
          </p>
        </>
      }
    >
      <Plot
        title="ROC curve"
        xRange={[0, 1]}
        yRange={[0, 1]}
        lines={[
          {
            label: `ROC · AUC ${fmt(auc)}`,
            points: roc.map((p) => [1 - p.specificity, p.recall]),
          },
        ]}
        points={[{ x: 1 - m.specificity, y: m.recall, label: 1 }]}
      />
      <Matrix
        name="Confusion matrix"
        values={[
          [m.tp, m.fn],
          [m.fp, m.tn],
        ]}
      />
      <Formula
        symbol="Precision = TP/(TP+FP); Recall = TP/(TP+FN)"
        result={`Accuracy ${fmt(m.accuracy)} · precision ${fmt(m.precision)} · recall ${fmt(m.recall)} · specificity ${fmt(m.specificity)} · F1 ${fmt(m.f1)}`}
      />
    </LabLayout>
  );
}
