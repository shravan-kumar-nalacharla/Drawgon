import { lazy, Suspense, useRef, useState } from "react";
import { categories, topics, type Family } from "./topics/registry";
import "./visualizer.css";
const modules: Record<Family, ReturnType<typeof lazy>> = {
  Foundations: lazy(() => import("./topics/Foundations")),
  Classical: lazy(() => import("./topics/Classical")),
  Convolution: lazy(() => import("./topics/Convolution")),
  Sequence: lazy(() => import("./topics/Sequence")),
  Training: lazy(() => import("./topics/Training")),
  Generative: lazy(() => import("./topics/Generative")),
  Advanced: lazy(() => import("./topics/Advanced")),
};
const Models = lazy(() => import("./topics/Models"));
export default function Visualizer({ path }: { path: string }) {
  const id = path.split("/")[1],
    topic = topics.find((t) => t.id === id),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All topics"),
    [dark, setDark] = useState(false),
    [scale, setScale] = useState("2"),
    [background, setBackground] = useState("Current theme"),
    [extent, setExtent] = useState("Full visualization"),
    [error, setError] = useState(""),
    [level, setLevel] = useState("Intuition");
  const content = useRef<HTMLDivElement>(null),
    Module = topic ? modules[topic.family] : null;
  async function download(format: "svg" | "png") {
    try {
      const figure =
        content.current?.querySelector<SVGSVGElement>("svg[data-export]");
      if (!figure) throw new Error("Open a visualization first.");
      const { exportFigure } = await import("./export");
      await exportFigure(
        figure,
        topic?.title ?? "Model graph",
        format,
        +scale,
        background === "Transparent"
          ? "transparent"
          : background === "Current theme" && dark
            ? "#1b1d20"
            : "white",
        extent === "Full visualization"
          ? (content.current ?? undefined)
          : undefined,
      );
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    }
  }
  async function experimentDownload(link = false) {
    try {
      const raw =
        content.current?.querySelector<HTMLElement>("[data-experiment]")
          ?.dataset.experiment;
      if (!raw)
        throw new Error(
          "This lab does not yet provide a restorable experiment.",
        );
      if (link) {
        const url = new URL(location.href);
        url.hash = new URLSearchParams({ experiment: raw }).toString();
        await navigator.clipboard.writeText(url.href);
        setError("Experiment link copied.");
      } else {
        const { downloadBlob } = await import("../services/diagram/export");
        downloadBlob(
          new Blob([raw], { type: "application/json" }),
          `${id}-experiment.json`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Experiment export failed.");
    }
  }
  return (
    <div className={`visualizer${dark ? " vl-dark" : ""}`}>
      <div className="vl-topbar">
        <a href="/visualizer">AI / ML Visualizer</a>
        <span>Runs in your browser · No API key</span>
        <button onClick={() => setDark(!dark)}>
          {dark ? "Light theme" : "Dark theme"}
        </button>
        <a href="/visualizer/models">Open Model</a>
      </div>
      {!id ? (
        <>
          <section className="vl-hero">
            <p className="eyebrow">AN INTERACTIVE MACHINE LEARNING LAB</p>
            <h1>
              Change the inputs.
              <br />
              <em>See the mathematics.</em>
            </h1>
            <p>
              Explore neural networks, image filters and learning algorithms
              through small, real experiments. No account. No experiment
              database.
            </p>
            <a className="primary" href="/visualizer/neuron">
              Start with a Neuron →
            </a>
          </section>
          <section className="vl-paths">
            <h2>Choose a learning path</h2>
            {[
              [
                "Neural network basics",
                "neuron",
                "activations",
                "forward",
                "backprop",
                "gradient-descent",
              ],
              [
                "Computer vision",
                "image-tensor",
                "convolution",
                "pooling",
                "cnn",
                "resnet",
              ],
              ["Sequence memory", "rnn", "bptt", "lstm", "gru", "seq2seq"],
            ].map(([name, ...ids]) => (
              <div key={name}>
                <strong>{name}</strong>
                <p>
                  {ids.map((id, i) => (
                    <span key={id}>
                      {i > 0 ? " → " : ""}
                      <a href={`/visualizer/${id}`}>
                        {topics.find((t) => t.id === id)?.title}
                      </a>
                    </span>
                  ))}
                </p>
              </div>
            ))}
          </section>
          <section className="vl-catalog" id="topics">
            <h2>Explore topics</h2>
            <div className="vl-search">
              <label>
                Find a concept
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Try backprop, forget gate, CNN, Adam…"
                />
              </label>
              <label>
                Category
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {["All topics", ...categories].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            {categories
              .filter((c) => category === "All topics" || c === category)
              .map((c) => {
                const found = topics.filter(
                  (t) =>
                    t.category === c &&
                    `${t.title} ${t.aliases.join(" ")} ${t.description}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                );
                return found.length ? (
                  <details
                    key={c}
                    open={
                      !!query ||
                      category !== "All topics" ||
                      ["Foundations", "Neural Networks"].includes(c)
                    }
                  >
                    <summary>
                      {c} <span>{found.length} labs</span>
                    </summary>
                    <div className="vl-cards">
                      {found.map((t) => (
                        <a href={`/visualizer/${t.id}`} key={t.id}>
                          <small>{t.difficulty}</small>
                          <h3>{t.title} ↗</h3>
                          <p>{t.description}</p>
                        </a>
                      ))}
                    </div>
                  </details>
                ) : null;
              })}
            {!topics.some(
              (t) =>
                `${t.title} ${t.aliases.join(" ")} ${t.description}`
                  .toLowerCase()
                  .includes(query.toLowerCase()) &&
                (category === "All topics" || t.category === category),
            ) && (
              <p>No matching topic. Try a broader term or another category.</p>
            )}
          </section>
        </>
      ) : (
        <>
          <div className="vl-heading">
            <a href="/visualizer">← All topics</a>
            <p className="eyebrow">{topic?.category ?? "MODEL EXPLORER"}</p>
            <h1>
              {topic?.title ??
                (id === "models" ? "Model Explorer" : "Topic not found")}
            </h1>
            <p>{topic?.description}</p>
          </div>
          {(topic || id === "models") && (
            <>
              <div className="vl-toolbar">
                <label>
                  Explanation
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                  >
                    {["Intuition", "Math", "Technical"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Export view
                  <select
                    value={extent}
                    onChange={(e) => setExtent(e.target.value)}
                  >
                    <option>Full visualization</option>
                    <option>Current view</option>
                  </select>
                </label>
                <label>
                  PNG scale
                  <select
                    value={scale}
                    onChange={(e) => setScale(e.target.value)}
                  >
                    {["1", "2", "3"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                  ×
                </label>
                <label>
                  Background
                  <select
                    aria-label="Background"
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                  >
                    <option>White</option>
                    <option>Current theme</option>
                    <option>Transparent</option>
                  </select>
                </label>
                <button onClick={() => download("svg")}>Download SVG</button>
                <button onClick={() => download("png")}>Download PNG</button>
                {id === "neuron" && (
                  <>
                    <button onClick={() => experimentDownload()}>
                      Download Experiment JSON
                    </button>
                    <button onClick={() => experimentDownload(true)}>
                      Copy Experiment Link
                    </button>
                  </>
                )}
              </div>
              {level === "Technical" && (
                <p className="vl-caption">
                  Browser-only TypeScript calculations. Small models and bounded
                  data keep experiments inspectable. Training loss, gradients
                  and displayed values are calculated from the active
                  parameters.
                </p>
              )}
              {level === "Math" && (
                <p className="vl-caption">
                  The live formula panels show the operation, substituted values
                  and result. Change a parameter to recompute.
                </p>
              )}
              {error && <p role="alert">{error}</p>}
              <div ref={content}>
                <Suspense
                  fallback={<p className="notice">Opening this lab…</p>}
                >
                  {id === "models" ? (
                    <Models />
                  ) : (
                    Module && <Module key={id} topic={id} />
                  )}
                </Suspense>
              </div>
              {topic && (
                <section className="vl-related">
                  <h2>Continue exploring</h2>
                  {topic.related.map((id) => (
                    <a key={id} href={`/visualizer/${id}`}>
                      {topics.find((t) => t.id === id)?.title} →
                    </a>
                  ))}
                </section>
              )}
            </>
          )}
        </>
      )}
      <p className="vl-privacy">
        No account required. Local images and model files stay in your browser.
        Educational models demonstrate mechanisms; they are not production
        predictors.
      </p>
    </div>
  );
}
