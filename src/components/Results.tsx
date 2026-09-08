import { useState } from "react";
import {
  Download,
  Expand,
  Copy,
  RotateCw,
  SlidersHorizontal,
  Plus,
  Minus,
  X,
  Check,
  ArrowLeft,
} from "lucide-react";
import type { GeneratedDiagram, Session } from "../types";
import { diagramTypes } from "../config/diagramTypes";
import { extractSvg } from "../services/diagram/safety";
import {
  buildZip,
  diagramBlob,
  downloadBlob,
  safeFilename,
  type Format,
} from "../services/diagram/export";
import { blueprintSchema } from "../services/gemini/schemas";
import { ErrorBoundary, Field, Modal } from "./Primitives";
import { DiagramEditor } from "./DiagramEditor";
import { GenerationStatus } from "./GenerationStatus";
import { FactualSources } from "./FactualSources";
export type Job = {
  state: "waiting" | "running" | "done" | "error" | "cancelled";
  message: string;
};
function Preview({
  diagram,
  zoom = 1,
}: {
  diagram: GeneratedDiagram;
  zoom?: number;
}) {
  return (
    <iframe
      title={diagram.title}
      sandbox=""
      srcDoc={diagram.sanitizedHtml}
      className="diagram-frame"
      style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
    />
  );
}
export function Results({
  session,
  update,
  jobs,
  busy,
  onCancel,
  onRegenerate,
  onNew,
  onEdit,
}: {
  session: Session;
  update: (p: Partial<Session>) => void;
  jobs: Record<string, Job>;
  busy: boolean;
  onCancel: () => void;
  onRegenerate: (id: string, refinement?: string, detail?: string) => void;
  onNew: () => void;
  onEdit: () => void;
}) {
  const [tab, setTab] = useState("diagrams"),
    [view, setView] = useState<GeneratedDiagram>(),
    [zoom, setZoom] = useState(1),
    [refine, setRefine] = useState<GeneratedDiagram>(),
    [instruction, setInstruction] = useState(""),
    [detail, setDetail] = useState(session.settings.detail),
    [format, setFormat] = useState<Format | "all">("all"),
    [exporting, setExporting] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [editing, setEditing] = useState(false),
    [blueprintText, setBlueprintText] = useState("");
  const [textEditor, setTextEditor] = useState<string>();
  const [background, setBackground] = useState<"white" | "transparent">(
    "white",
  );
  const editedDiagram = session.diagrams.find((d) => d.id === textEditor);
  async function download(diagram: GeneratedDiagram, f: Format) {
    setExporting(true);
    setError("");
    setMessage(`Preparing ${f.toUpperCase()} download…`);
    try {
      downloadBlob(
        await diagramBlob(diagram, f, session.settings.scale, background),
        `${safeFilename(session.project.title)}-${safeFilename(diagram.requestedType)}${f === "presentation" ? "-presentation.svg" : `.${f}`}`,
      );
      setMessage("Download ready.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }
  async function all() {
    if (!session.blueprint) return;
    setExporting(true);
    setError("");
    try {
      const blob = await buildZip(
        session.diagrams,
        session.blueprint,
        session.settings,
        format,
        setMessage,
        background,
      );
      downloadBlob(blob, `${safeFilename(session.project.title)}-diagrams.zip`);
      setMessage("ZIP download ready.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ZIP export failed.");
    } finally {
      setExporting(false);
    }
  }
  async function copy(diagram: GeneratedDiagram) {
    try {
      await navigator.clipboard.writeText(extractSvg(diagram.sanitizedHtml));
      setMessage("SVG copied to clipboard.");
    } catch {
      setError("Clipboard access was unavailable. Download the SVG instead.");
    }
  }
  return (
    <section className="results">
      <div className="results-heading">
        <div>
          <p className="eyebrow">YOUR PROJECT, FROM EVERY ANGLE</p>
          <h1>{session.project.title}</h1>
          <p>
            {busy
              ? "Building a clearer picture…"
              : `${session.diagrams.length} diagrams, ready for your next chapter.`}
          </p>
        </div>
        <div className="button-row">
          <button disabled={busy || exporting} onClick={onEdit}>
            <ArrowLeft size={16} />
            Edit project
          </button>
          <button disabled={busy || exporting} onClick={onNew}>
            <Plus size={16} />
            New Project
          </button>
        </div>
      </div>
      {busy && (
        <GenerationStatus
          jobs={jobs}
          student={/student/i.test(session.settings.audience)}
        />
      )}
      {session.blueprint?.factualData && (
        <FactualSources data={session.blueprint.factualData} />
      )}
      <div className="results-toolbar">
        <div role="tablist" aria-label="Workspace views">
          <button
            role="tab"
            aria-selected={tab === "diagrams"}
            onClick={() => setTab("diagrams")}
          >
            Diagrams <span>{session.diagrams.length}</span>
          </button>
          <button
            role="tab"
            aria-selected={tab === "understanding"}
            onClick={() => setTab("understanding")}
          >
            Project Understanding
          </button>
        </div>
        <div className="button-row">
          {busy ? (
            <button onClick={onCancel}>
              <X size={16} />
              Cancel Generation
            </button>
          ) : (
            <>
              <select
                aria-label="ZIP formats"
                value={format}
                onChange={(e) => setFormat(e.target.value as Format | "all")}
              >
                <option value="all">Everything</option>
                <option value="svg">SVG only</option>
                <option value="presentation">Presentation SVG only</option>
                <option value="png">PNG only</option>
                <option value="html">HTML only</option>
              </select>
              <button
                className="primary"
                onClick={all}
                disabled={exporting || !session.diagrams.length}
              >
                <Download size={16} />
                {exporting ? "Preparing…" : "Download All"}
              </button>
            </>
          )}
        </div>
      </div>
      {(message || error) && (
        <p
          className={`notice ${error ? "error" : ""}`}
          role={error ? "alert" : "status"}
        >
          {error || message}
        </p>
      )}
      {Object.keys(jobs).length > 0 && (
        <div className="jobs" aria-live="polite">
          {Object.entries(jobs).map(([id, job]) => (
            <div key={id} className={`job ${job.state}`}>
              <span>
                {job.state === "done" ? (
                  <Check size={14} />
                ) : job.state === "error" ? (
                  "!"
                ) : job.state === "running" ? (
                  <span className="pulse-dot" />
                ) : (
                  "○"
                )}
              </span>
              <strong>
                {id === "blueprint"
                  ? "Project understanding"
                  : diagramTypes.find((t) => t.id === id)?.displayName}
              </strong>
              <small>{job.message}</small>
              {(job.state === "error" || job.state === "cancelled") &&
                id !== "blueprint" && (
                  <button disabled={busy} onClick={() => onRegenerate(id)}>
                    Regenerate
                  </button>
                )}
            </div>
          ))}
        </div>
      )}
      {tab === "diagrams" ? (
        <div className="results-grid">
          {session.diagrams.map((diagram) => (
            <ErrorBoundary key={`${diagram.id}-${diagram.revision}`}>
              <article className="result-card">
                <div className="result-card-heading">
                  <div>
                    <span className="eyebrow">
                      {
                        diagramTypes.find((t) => t.id === diagram.requestedType)
                          ?.displayName
                      }
                    </span>
                    <h2>{diagram.title}</h2>
                  </div>
                  <span className="revision">v{diagram.revision}</span>
                </div>
                <div className="preview-container">
                  <Preview diagram={diagram} />
                  <button
                    className="preview-expand"
                    onClick={() => {
                      setView(diagram);
                      setZoom(1);
                    }}
                    aria-label={`View ${diagram.title}`}
                  >
                    <Expand size={17} />
                    View
                  </button>
                </div>
                <p className="diagram-summary">{diagram.summary}</p>
                <div className="result-meta">
                  <span>
                    {diagram.settings?.detail || session.settings.detail} ·{" "}
                    {diagram.settings?.canvas || session.settings.canvas}
                  </span>
                  <span>SVG · HTML · PNG</span>
                </div>
                {(diagram.assumptions.length > 0 ||
                  diagram.fidelityNotes.length > 0 ||
                  diagram.validation.warnings.length > 0) && (
                  <details className="diagram-notes">
                    <summary>Assumptions & fidelity notes</summary>
                    <ul>
                      {[
                        ...diagram.assumptions,
                        ...diagram.fidelityNotes,
                        ...diagram.validation.warnings,
                      ].map((note, i) => (
                        <li key={i}>{note}</li>
                      ))}
                    </ul>
                  </details>
                )}
                <div className="result-actions">
                  <button
                    disabled={busy}
                    onClick={() => setTextEditor(diagram.id)}
                  >
                    Edit text & style
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => onRegenerate(diagram.id)}
                  >
                    <RotateCw size={15} />
                    Regenerate
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => {
                      setRefine(diagram);
                      setInstruction("");
                      setDetail(session.settings.detail);
                    }}
                  >
                    <SlidersHorizontal size={15} />
                    Refine
                  </button>
                  <button
                    aria-label={`Copy SVG for ${diagram.title}`}
                    onClick={() => copy(diagram)}
                  >
                    <Copy size={15} />
                  </button>
                  <details className="download-menu">
                    <summary>
                      <Download size={15} />
                      Download
                    </summary>
                    <div>
                      <label>
                        Presentation background
                        <select
                          aria-label="Presentation background"
                          value={background}
                          onChange={(e) =>
                            setBackground(
                              e.target.value as "white" | "transparent",
                            )
                          }
                        >
                          <option value="white">White</option>
                          <option value="transparent">Transparent</option>
                        </select>
                      </label>
                      {(["svg", "presentation", "png", "html"] as const).map(
                        (f) => (
                          <button
                            key={f}
                            disabled={exporting}
                            onClick={() => download(diagram, f)}
                          >
                            {f === "presentation"
                              ? "Presentation SVG"
                              : f.toUpperCase()}
                          </button>
                        ),
                      )}
                    </div>
                  </details>
                </div>
              </article>
            </ErrorBoundary>
          ))}
          {!session.diagrams.length && (
            <div className="empty-state">
              <div className="empty-shapes">
                <span />
                <span />
                <span />
              </div>
              <h2>Your diagrams will appear here.</h2>
              <p>
                {busy
                  ? "Gemini is understanding your project and designing the first view."
                  : "Edit your project or retry generation to get started."}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="understanding">
          {session.blueprint ? (
            <>
              <div className="section-heading">
                <h2>What Gemini understood</h2>
                <button
                  disabled={busy}
                  onClick={() => {
                    setBlueprintText(
                      JSON.stringify(session.blueprint, null, 2),
                    );
                    setEditing(true);
                  }}
                >
                  Edit project understanding
                </button>
              </div>
              <p className="lede">{session.blueprint.summary}</p>
              {Object.entries(session.blueprint)
                .filter(
                  ([key]) => !["title", "summary", "factualData"].includes(key),
                )
                .map(([key, value]) => (
                  <details
                    key={key}
                    open={key === "assumptions" || key === "components"}
                  >
                    <summary>
                      {key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (s) => s.toUpperCase())}
                    </summary>
                    {Array.isArray(value) ? (
                      value.length ? (
                        <ul>
                          {value.map((item, i) => (
                            <li key={i}>
                              {typeof item === "string" ? (
                                item
                              ) : (
                                <div>
                                  {Object.entries(item).map(([k, v]) => (
                                    <p key={k}>
                                      <strong>{k}: </strong>
                                      {Array.isArray(v)
                                        ? v.join(", ")
                                        : String(v)}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No information supplied or detected.</p>
                      )
                    ) : (
                      <pre>{JSON.stringify(value, null, 2)}</pre>
                    )}
                  </details>
                ))}
              {session.repository && (
                <details>
                  <summary>
                    Files analyzed ({session.repository.files.length})
                  </summary>
                  <ul>
                    {session.repository.files.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          ) : (
            <p>Your project blueprint will appear once analysis completes.</p>
          )}
        </div>
      )}
      {view && (
        <Modal title={view.title} onClose={() => setView(undefined)} wide>
          <div className="viewer-toolbar">
            <button
              aria-label="Zoom out"
              onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
            >
              <Minus size={16} />
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button
              aria-label="Zoom in"
              onClick={() => setZoom(Math.min(3, zoom + 0.25))}
            >
              <Plus size={16} />
            </button>
            <button onClick={() => setZoom(1)}>Fit / Reset</button>
            <button
              onClick={() =>
                document
                  .querySelector("dialog")
                  ?.requestFullscreen()
                  .catch(() =>
                    setError("Full screen is unavailable in this browser."),
                  )
              }
            >
              Full Screen
            </button>
            <button onClick={() => download(view, "svg")}>Download SVG</button>
          </div>
          <div className="viewer-viewport">
            <Preview diagram={view} zoom={zoom} />
          </div>
        </Modal>
      )}
      {editedDiagram && (
        <Modal
          title="Edit text & style"
          wide
          onClose={() => setTextEditor(undefined)}
        >
          <DiagramEditor
            key={`${editedDiagram.id}-${editedDiagram.revision}`}
            diagram={editedDiagram}
            onChange={(changed) =>
              update({
                diagrams: session.diagrams.map((d) =>
                  d.id === changed.id ? changed : d,
                ),
              })
            }
          />
          <div className="button-row">
            <button onClick={() => download(editedDiagram, "svg")}>
              Download SVG
            </button>
            <button onClick={() => download(editedDiagram, "presentation")}>
              Presentation SVG
            </button>
            <button onClick={() => setTextEditor(undefined)}>Done</button>
          </div>
        </Modal>
      )}
      {refine && (
        <Modal title="Refine this diagram" onClose={() => setRefine(undefined)}>
          <p>Keep the same project understanding and refine only this view.</p>
          <Field label="What would you like to change?">
            <textarea
              rows={5}
              value={instruction}
              maxLength={4000}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Make authentication more prominent. Remove deployment details…"
            />
          </Field>
          <Field label="Detail level">
            <select value={detail} onChange={(e) => setDetail(e.target.value)}>
              <option>Balanced</option>
              <option>Simplified</option>
              <option>Detailed/Faithful</option>
            </select>
          </Field>
          <button
            className="primary"
            onClick={() => {
              onRegenerate(refine.id, instruction, detail);
              setRefine(undefined);
            }}
          >
            Apply & regenerate
          </button>
        </Modal>
      )}
      {editing && (
        <Modal
          title="Edit project understanding"
          onClose={() => setEditing(false)}
          wide
        >
          <p>
            Correct names, evidence or assumptions. Existing diagrams keep their
            current revision; regenerate them to apply your changes.
          </p>
          <Field label="Project blueprint JSON">
            <textarea
              className="code-editor"
              rows={18}
              value={blueprintText}
              onChange={(e) => setBlueprintText(e.target.value)}
            />
          </Field>
          <button
            className="primary"
            onClick={() => {
              try {
                const blueprint = blueprintSchema.parse(
                  JSON.parse(blueprintText),
                );
                update({
                  blueprint: {
                    ...blueprint,
                    factualData: session.blueprint?.factualData,
                  },
                });
                setEditing(false);
                setMessage(
                  "Project understanding updated. Regenerate diagrams to use it.",
                );
                setError("");
              } catch {
                setError(
                  "The blueprint must be valid JSON and preserve its field structure.",
                );
              }
            }}
          >
            Save corrections
          </button>
          {error && (
            <p role="alert" className="notice error">
              {error}
            </p>
          )}
        </Modal>
      )}
    </section>
  );
}
