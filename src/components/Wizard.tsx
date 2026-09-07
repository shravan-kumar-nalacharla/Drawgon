import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  GitBranch,
  Layers,
  Sparkles,
} from "lucide-react";
import type { Session } from "../types";
import { diagramTypes } from "../config/diagramTypes";
import { canvases } from "../config/settings";
import { Field } from "./Primitives";
const steps = [
  "Title",
  "Abstract",
  "Repository",
  "Details",
  "Diagrams",
  "Review",
];
const detailFields = [
  ["Architecture / System Structure", "How is the system structured?"],
  ["Major Modules / Features", "List the major features or modules."],
  [
    "Main Workflow",
    "Describe what happens from the user's first action to the final result.",
  ],
  [
    "Database / Entities",
    "Describe important tables, entities or data objects if you know them.",
  ],
  [
    "External Services / APIs",
    "Payment gateways, AI APIs, email, authentication providers…",
  ],
  ["Deployment", "How is the application deployed?"],
  ["Methodology / Project Process", "Describe development or research stages."],
  ["Additional Information", "Anything else Gemini should understand?"],
];
const suggestedTech = [
  "React",
  "Next.js",
  "Vue",
  "Angular",
  "Flutter",
  "Android",
  "Node.js",
  "Express",
  "FastAPI",
  "Django",
  "Spring Boot",
  ".NET",
  "Go",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Firebase",
  "Redis",
  "AWS",
  "GCP",
  "Azure",
  "Docker",
  "Kubernetes",
  "Vercel",
  "Gemini",
  "OpenAI",
  "TensorFlow",
  "PyTorch",
];
export function Wizard({
  session,
  update,
  step,
  setStep,
  onRepository,
  onSuggest,
  onGenerate,
  busy,
  status,
  repoError,
  stale,
}: {
  session: Session;
  update: (patch: Partial<Session>) => void;
  step: number;
  setStep: (n: number) => void;
  onRepository: () => void;
  onSuggest: () => void;
  onGenerate: () => void;
  busy: boolean;
  status: string;
  repoError: string;
  stale: boolean;
}) {
  const [tech, setTech] = useState(""),
    [advanced, setAdvanced] = useState(false),
    [search, setSearch] = useState("");
  const { project, settings } = session;
  const projectField = (
    key: "title" | "abstract" | "repositoryUrl",
    value: string,
  ) =>
    update({
      project: { ...project, [key]: value },
      ...(key === "repositoryUrl" ? { repository: undefined } : {}),
    });
  function addTech(value: string) {
    const clean = value.trim();
    if (clean && !project.techStack.includes(clean))
      update({
        project: { ...project, techStack: [...project.techStack, clean] },
      });
    setTech("");
  }
  const ready =
    step === 1
      ? !!project.title.trim()
      : step === 2
        ? !!project.abstract.trim()
        : step === 5
          ? session.selected.length > 0
          : true;
  return (
    <div className="wizard">
      <aside className="wizard-sidebar">
        <p className="eyebrow">YOUR PROJECT</p>
        <h2>{project.title || "A little context.\nA lot of clarity."}</h2>
        <nav aria-label="Project steps">
          {steps.map((label, index) => (
            <button
              key={label}
              disabled={
                busy ||
                (index + 1 > step &&
                  (!project.title.trim() ||
                    (index > 1 && !project.abstract.trim())))
              }
              className={step === index + 1 ? "active" : ""}
              aria-current={step === index + 1 ? "step" : undefined}
              onClick={() => setStep(index + 1)}
            >
              <span>
                {step > index + 1 ? (
                  <Check size={15} />
                ) : (
                  String(index + 1).padStart(2, "0")
                )}
              </span>
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <Layers size={19} />
          <p>
            Better context.
            <br />
            Better diagrams.
          </p>
          <small>
            Only your title and abstract are required. Everything else helps
            tell the story.
          </small>
        </div>
      </aside>
      <section className="wizard-content">
        <div className="step-heading">
          <span className="eyebrow">
            {step <= 5 ? `${step} OF 5` : "READY WHEN YOU ARE"}
          </span>
          <span>{step <= 5 ? "PROJECT SETUP" : "FINAL CHECK"}</span>
        </div>
        <progress
          aria-label="Project setup progress"
          value={Math.min(step, 5)}
          max={5}
        />
        {step === 1 && (
          <>
            <h1>
              What is your
              <br />
              project title?
            </h1>
            <p className="lede">
              Every great diagram starts with an idea. Give yours a name.
            </p>
            <Field label="Project title">
              <input
                className="large-input"
                autoFocus
                maxLength={180}
                placeholder="AI-Powered Smart Attendance System"
                value={project.title}
                onChange={(e) => projectField("title", e.target.value)}
                required
              />
            </Field>
            <p className="field-note">You can change this later.</p>
          </>
        )}
        {step === 2 && (
          <>
            <h1>
              Tell us about
              <br />
              your project.
            </h1>
            <p className="lede">
              What problem does it solve, who uses it, and how does it work?
            </p>
            <Field
              label="Project Abstract"
              hint="100–1,000 words is a useful starting point, but a short description works too."
            >
              <textarea
                autoFocus
                rows={9}
                maxLength={20000}
                value={project.abstract}
                onChange={(e) => projectField("abstract", e.target.value)}
                placeholder="Describe the problem your project solves, who uses it, its major features and how it works…"
                required
              />
            </Field>
            <div className="character-count">
              {project.abstract.length.toLocaleString()} / 20,000 characters
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h1>
              Got a GitHub
              <br />
              repository?
            </h1>
            <p className="lede">
              Let the code add context. We’ll read the relevant files in a
              public repository to understand your project.
            </p>
            <Field label="GitHub Repository URL">
              <input
                type="url"
                value={project.repositoryUrl}
                onChange={(e) => projectField("repositoryUrl", e.target.value)}
                placeholder="https://github.com/owner/project"
              />
            </Field>
            <button
              disabled={busy || !project.repositoryUrl.trim()}
              onClick={onRepository}
            >
              <GitBranch size={17} />
              {busy ? "Analyzing repository…" : "Analyze repository"}
            </button>
            {repoError && (
              <p role="alert" className="notice error">
                {repoError}
              </p>
            )}
            {session.repository ? (
              <div className="repository-result">
                <span className="success-text">
                  <Check size={16} />
                  Repository analyzed
                </span>
                <h3>{session.repository.name}</h3>
                <p>
                  {session.repository.language} · {session.repository.branch} ·{" "}
                  {session.repository.files.length} relevant files
                </p>
                {session.repository.warnings.map((w) => (
                  <p className="notice" key={w}>
                    {w}
                  </p>
                ))}
                <details>
                  <summary>Files analyzed</summary>
                  <ul>
                    {session.repository.files.map((f) => (
                      <li key={f}>
                        <code>{f}</code>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            ) : (
              <p className="field-note">
                Repository analysis is optional. Public repositories only. You
                can continue with your description.
              </p>
            )}
          </>
        )}
        {step === 4 && (
          <>
            <h1>
              A few more
              <br />
              useful details.
            </h1>
            <p className="lede">Add what you know. Leave the rest blank.</p>
            <Field label={detailFields[0][0]}>
              <textarea
                rows={3}
                maxLength={12000}
                placeholder="React frontend, Node.js API, Python recommendation service…"
                value={project.details[detailFields[0][0]] || ""}
                onChange={(e) =>
                  update({
                    project: {
                      ...project,
                      details: {
                        ...project.details,
                        [detailFields[0][0]]: e.target.value,
                      },
                    },
                  })
                }
              />
            </Field>
            <Field label="Tech Stack">
              <div className="chip-input">
                {project.techStack.map((t) => (
                  <button
                    type="button"
                    className="chip"
                    key={t}
                    aria-label={`Remove ${t}`}
                    onClick={() =>
                      update({
                        project: {
                          ...project,
                          techStack: project.techStack.filter((x) => x !== t),
                        },
                      })
                    }
                  >
                    {t} ×
                  </button>
                ))}
                <input
                  aria-label="Add technology"
                  value={tech}
                  maxLength={80}
                  onChange={(e) => setTech(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addTech(tech);
                    }
                  }}
                  placeholder="Type a technology and press Enter"
                />
                <button
                  type="button"
                  onClick={() => addTech(tech)}
                  disabled={!tech.trim()}
                >
                  Add
                </button>
              </div>
            </Field>
            <details>
              <summary>Suggested technologies</summary>
              <div className="suggested-chips">
                {suggestedTech
                  .filter((t) => !project.techStack.includes(t))
                  .map((t) => (
                    <button className="chip" key={t} onClick={() => addTech(t)}>
                      + {t}
                    </button>
                  ))}
              </div>
            </details>
            {detailFields.slice(1).map(([label, prompt]) => (
              <details
                className="detail-section"
                key={label}
                open={project.details[label] ? true : undefined}
              >
                <summary>
                  {label}
                  <span>OPTIONAL</span>
                </summary>
                <Field label={prompt}>
                  <textarea
                    rows={3}
                    maxLength={12000}
                    value={project.details[label] || ""}
                    onChange={(e) =>
                      update({
                        project: {
                          ...project,
                          details: {
                            ...project.details,
                            [label]: e.target.value,
                          },
                        },
                      })
                    }
                  />
                </Field>
              </details>
            ))}
          </>
        )}
        {step === 5 && (
          <>
            <h1>
              Which diagrams
              <br />
              do you need?
            </h1>
            <p className="lede">
              Choose your perspectives. Every diagram shares the same
              understanding of your project.
            </p>
            <div className="selection-actions">
              <button onClick={onSuggest} disabled={busy}>
                <Sparkles size={16} />
                Suggest diagrams for my project
              </button>
              <span>{session.selected.length} selected</span>
            </div>
            {session.blueprint && (
              <details>
                <summary>Gemini’s recommendations</summary>
                {session.blueprint.recommendedDiagrams.map((r) => (
                  <p key={r.type}>
                    <strong>
                      {diagramTypes.find((t) => t.id === r.type)?.displayName ||
                        r.type}
                    </strong>{" "}
                    — {r.reason}
                  </p>
                ))}
                {stale && (
                  <p className="notice">
                    Needs re-analysis. Your project information changed.
                  </p>
                )}
              </details>
            )}
            <div className="diagram-select-grid">
              {diagramTypes
                .filter((t) => t.category === "Essential")
                .map((t) => (
                  <button
                    key={t.id}
                    className={`diagram-option ${session.selected.includes(t.id) ? "selected" : ""}`}
                    aria-pressed={session.selected.includes(t.id)}
                    onClick={() =>
                      update({
                        selected: session.selected.includes(t.id)
                          ? session.selected.filter((x) => x !== t.id)
                          : [...session.selected, t.id],
                      })
                    }
                  >
                    <div>
                      <Layers size={20} />
                      <span className="selection-check">
                        {session.selected.includes(t.id) && <Check size={13} />}
                      </span>
                    </div>
                    <strong>{t.displayName}</strong>
                    <small>{t.description}</small>
                  </button>
                ))}
            </div>
            <button
              className="text-button"
              onClick={() => setAdvanced(!advanced)}
            >
              {advanced ? "Hide" : "More"} diagram types (
              {diagramTypes.filter((t) => t.category === "Advanced").length})
            </button>
            {advanced && (
              <>
                <input
                  aria-label="Search more diagram types"
                  placeholder="Search diagram types…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="advanced-types">
                  {diagramTypes
                    .filter(
                      (t) =>
                        t.category === "Advanced" &&
                        `${t.displayName} ${t.description}`
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                    )
                    .map((t) => (
                      <label key={t.id}>
                        <input
                          type="checkbox"
                          checked={session.selected.includes(t.id)}
                          onChange={() =>
                            update({
                              selected: session.selected.includes(t.id)
                                ? session.selected.filter((x) => x !== t.id)
                                : [...session.selected, t.id],
                            })
                          }
                        />
                        <span>
                          <strong>{t.displayName}</strong>
                          <small>{t.description}</small>
                        </span>
                      </label>
                    ))}
                </div>
              </>
            )}
            <details className="settings-panel">
              <summary>Diagram Settings</summary>
              <div className="settings-grid">
                {(
                  [
                    [
                      "Style",
                      "style",
                      ["Minimal Light", "Minimal Dark", "Full Editorial"],
                    ],
                    [
                      "Detail",
                      "detail",
                      ["Simplified", "Balanced", "Detailed/Faithful"],
                    ],
                    [
                      "Audience",
                      "audience",
                      ["Student / General", "Technical", "Executive"],
                    ],
                    ["Canvas", "canvas", Object.keys(canvases)],
                    ["Palette", "palette", ["Monochrome", "Accent"]],
                  ] as const
                ).map(([label, key, options]) => (
                  <Field key={key} label={label}>
                    <select
                      value={settings[key]}
                      onChange={(e) =>
                        update({
                          settings: { ...settings, [key]: e.target.value },
                        })
                      }
                    >
                      {options.map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </Field>
                ))}
                <Field label="Accent color">
                  <input
                    type="color"
                    disabled={settings.palette === "Monochrome"}
                    value={settings.accent}
                    onChange={(e) =>
                      update({
                        settings: { ...settings, accent: e.target.value },
                      })
                    }
                  />
                </Field>
                <Field label="PNG scale">
                  <select
                    value={settings.scale}
                    onChange={(e) =>
                      update({
                        settings: {
                          ...settings,
                          scale: Number(e.target.value),
                        },
                      })
                    }
                  >
                    {[1, 2, 3].map((v) => (
                      <option key={v} value={v}>
                        {v}×
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Concurrent diagrams">
                  <select
                    value={settings.concurrency}
                    onChange={(e) =>
                      update({
                        settings: {
                          ...settings,
                          concurrency: Number(e.target.value),
                        },
                      })
                    }
                  >
                    <option value={1}>1 — lower rate-limit risk</option>
                    <option value={2}>2 — faster generation</option>
                  </select>
                </Field>
              </div>
            </details>
          </>
        )}
        {step === 6 && (
          <>
            <h1>
              Let’s make
              <br />
              the big picture.
            </h1>
            <p className="lede">
              Review your project before sending it directly to Gemini. API
              usage is billed or limited by your Google project.
            </p>
            <div className="review-project">
              <p className="eyebrow">PROJECT</p>
              <h2>{project.title}</h2>
              <p>{project.abstract}</p>
              {session.repository && (
                <p>
                  <GitBranch size={16} /> {session.repository.name} ·{" "}
                  {session.repository.files.length} files analyzed
                </p>
              )}
              <div className="suggested-chips">
                {project.techStack.map((t) => (
                  <span className="chip" key={t}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <h3>{session.selected.length} diagrams to create</h3>
            <div className="review-diagrams">
              {session.selected.map((id) => (
                <span key={id}>
                  <Check size={15} />
                  {diagramTypes.find((t) => t.id === id)?.displayName}
                </span>
              ))}
            </div>
            <p className="field-note">
              {settings.style} · {settings.detail} · {settings.canvas}
              <br />
              Model: {settings.model}
            </p>
            <p className="privacy-note">
              Your project description and selected repository context will be
              sent directly to Google. Generated content may contain mistakes;
              review it before use.
            </p>
          </>
        )}
        {busy && (
          <p role="status" className="notice progress-notice">
            {status}
          </p>
        )}
        <div className="wizard-navigation">
          <button onClick={() => setStep(step - 1)} disabled={busy}>
            <ArrowLeft size={16} />
            Back
          </button>
          {step < 6 ? (
            <button
              className="primary"
              disabled={!ready || busy}
              onClick={() => setStep(step + 1)}
            >
              {step === 3 && !session.repository
                ? "Skip for now"
                : step === 5
                  ? "Review project"
                  : "Continue"}
              <ArrowRight size={17} />
            </button>
          ) : (
            <button
              className="primary"
              disabled={
                busy ||
                !project.title.trim() ||
                !project.abstract.trim() ||
                !session.selected.length
              }
              onClick={onGenerate}
            >
              Generate Diagrams <Sparkles size={17} />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
