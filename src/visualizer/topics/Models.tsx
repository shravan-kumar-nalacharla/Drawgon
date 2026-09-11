import { useState } from "react";
import {
  modelSchema as schema,
  connections,
  type Model,
} from "../engine/model";
import { Figure, Control } from "../components/Primitives";
export default function Models() {
  const [model, setModel] = useState<Model | null>(null),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState(0),
    [zoom, setZoom] = useState(1);
  const layers = model?.config.layers ?? [],
    shown = layers
      .map((l, i) => ({ l, i }))
      .filter(({ l }) =>
        JSON.stringify(l).toLowerCase().includes(query.toLowerCase()),
      ),
    node = layers[selected];
  return (
    <section className="vl-models">
      <h2>Open a local model</h2>
      <p>
        Your model is processed in your browser and is not uploaded to our
        servers.
      </p>
      <p>
        Supported: Keras JSON model configuration (Sequential or Functional, up
        to 500 layers / 5 MB). Weights, ONNX, TFLite and pickle files are not
        parsed by this viewer. Arrows show declared Functional inbound
        connections or Sequential layer order. Use the scroll area to pan
        through the graph.
      </p>
      <label>
        Model configuration (.json)
        <input
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              if (file.size > 5e6)
                throw new Error("Choose a JSON configuration under 5 MB.");
              const raw = JSON.parse(await file.text()),
                parsed = schema.safeParse(
                  raw.model_config ?? raw.modelTopology?.model_config ?? raw,
                );
              if (!parsed.success)
                throw new Error(
                  "Unsupported model. Export a Keras JSON configuration containing class_name and config.layers.",
                );
              setModel(parsed.data);
              setSelected(0);
              setError("");
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not read this file.",
              );
            }
          }}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      {model && (
        <>
          <label>
            Search layers
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name or operator"
            />
          </label>
          <Control
            label="Zoom"
            value={zoom}
            min={0.5}
            max={2}
            step={0.1}
            onChange={setZoom}
          />
          <button onClick={() => setZoom(1)}>Fit</button>
          <div className="vl-lab-grid">
            <div
              className="vl-model-scroll"
              style={{ maxHeight: 600, overflow: "auto" }}
            >
              <div style={{ width: `${zoom * 100}%`, minWidth: 320 }}>
                <Figure
                  title={`${model.config.name ?? model.class_name} · operator graph`}
                  height={Math.max(300, shown.length * 65 + 60)}
                >
                  {connections(model).map(({ source, target }, i) => {
                    const a = shown.findIndex((n) => n.i === source),
                      b = shown.findIndex((n) => n.i === target);
                    if (a < 0 || b < 0) return null;
                    const x = 75 - (i % 4) * 12;
                    return (
                      <g key={`edge-${i}`}>
                        <path
                          d={`M100 ${75 + a * 65} H${x} V${75 + b * 65} H100`}
                          fill="none"
                          stroke="currentColor"
                        />
                        <path
                          d={`M94 ${71 + b * 65} L100 ${75 + b * 65} L94 ${79 + b * 65}`}
                          fill="none"
                          stroke="currentColor"
                        />
                        <title>{`${layers[source].config.name} → ${layers[target].config.name}`}</title>
                      </g>
                    );
                  })}
                  {shown.map(({ l, i }, j) => (
                    <g
                      key={i}
                      tabIndex={0}
                      role="button"
                      aria-label={`Inspect layer ${l.config.name ?? i}`}
                      onClick={() => setSelected(i)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setSelected(i);
                      }}
                    >
                      <rect
                        x="100"
                        y={50 + j * 65}
                        width="520"
                        height="50"
                        fill={selected === i ? "#326d9633" : "transparent"}
                        stroke="currentColor"
                      />
                      <text x="120" y={72 + j * 65} fill="currentColor">
                        {l.config.name ?? `Layer ${i + 1}`} · {l.class_name}
                      </text>
                      <text
                        x="120"
                        y={89 + j * 65}
                        fill="currentColor"
                        fontSize="11"
                      >
                        {JSON.stringify(
                          l.config.batch_shape ??
                            l.config.batch_input_shape ??
                            l.config.units ??
                            "Shape depends on inputs",
                        )}
                      </text>
                    </g>
                  ))}
                </Figure>
              </div>
            </div>
            <aside className="vl-inspector">
              <h3>{node?.config.name}</h3>
              <p>Operator: {node?.class_name}</p>
              <p>
                Inputs:{" "}
                {connections(model)
                  .filter((e) => e.target === selected)
                  .map((e) => layers[e.source].config.name)
                  .join(", ") || "Model input / not declared"}
              </p>
              <p>
                Outputs to:{" "}
                {connections(model)
                  .filter((e) => e.source === selected)
                  .map((e) => layers[e.target].config.name)
                  .join(", ") || "Model output / not declared"}
              </p>
              <pre>{JSON.stringify(node, null, 2)}</pre>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
