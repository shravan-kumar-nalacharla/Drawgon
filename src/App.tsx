import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { BRAND } from "./config/brand";
import { flushSync } from "react-dom";
import { registerProjectTools, browserModelContext } from "./services/webmcp";
import { defaultSettings } from "./config/settings";
import { diagramTypes } from "./config/diagramTypes";
import type { Session } from "./types";
import {
  clearEntireSession,
  getGeminiApiKey,
  loadProjectSession,
  saveProjectSession,
} from "./services/session";

import { projectHash } from "./services/projectHash";
import { Home } from "./components/Home";
import { Guide } from "./components/Guide";
import { guides, pageMetadata } from "./config/seo";
const Connect = lazy(() =>
  import("./components/Connect").then((m) => ({ default: m.Connect })),
);
const Wizard = lazy(() =>
  import("./components/Wizard").then((m) => ({ default: m.Wizard })),
);
import type { Job } from "./components/Results";
const Results = lazy(() =>
  import("./components/Results").then((m) => ({ default: m.Results })),
);
import { Legal } from "./components/Legal";
import { ErrorBoundary, Modal } from "./components/Primitives";
const fresh = (): Session => ({
  project: {
    title: "",
    abstract: "",
    repositoryUrl: "",
    details: {},
    techStack: [],
  },
  settings: { ...defaultSettings },
  selected: ["architecture", "flowchart"],
  diagrams: [],
});
type Page =
  | "home"
  | "connect"
  | "wizard"
  | "results"
  | "privacy"
  | "open-source"
  | (typeof guides)[number]["slug"];
function currentPage(initialPath?: string): Page {
  const path = initialPath
    ? initialPath.replace(/^\/+|\/+$/g, "")
    : typeof location === "undefined"
      ? ""
      : location.hash.slice(1) || location.pathname.replace(/^\/+|\/+$/g, "");
  return ["privacy", "open-source", ...guides.map((g) => g.slug)].includes(
    path || "",
  )
    ? (path as Page)
    : "home";
}
export default function App({ initialPath }: { initialPath?: string } = {}) {
  const [session, setSession] = useState<Session>(() => {
    const saved = loadProjectSession();
    return saved?.project &&
      saved?.settings &&
      Array.isArray(saved?.selected) &&
      Array.isArray(saved?.diagrams)
      ? {
          ...saved,
          settings: {
            ...defaultSettings,
            ...saved.settings,
            ...(!saved.settings.palette
              ? { palette: "Monochrome", accent: "#111111" }
              : {}),
          },
        }
      : fresh();
  });
  const [page, setPage] = useState<Page>(() => currentPage(initialPath)),
    [step, setStep] = useState(1),
    [connected, setConnected] = useState(!!getGeminiApiKey()),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [repoError, setRepoError] = useState(""),
    [jobs, setJobs] = useState<Record<string, Job>>({}),
    [reset, setReset] = useState<"session" | "project" | null>(null),
    [disconnect, setDisconnect] = useState(false),
    [stale, setStale] = useState(false),
    [storageWarning, setStorageWarning] = useState(false);
  const controller = useRef<AbortController | null>(null),
    active = useRef(false);
  const update = (patch: Partial<Session>) =>
    setSession((old) => ({ ...old, ...patch }));
  function navigate(next: Page) {
    setPage(next);
    setError("");
    window.scrollTo({ top: 0 });
    const publicPage = [
      "privacy",
      "open-source",
      ...guides.map((g) => g.slug),
    ].includes(next);
    history.replaceState(null, "", publicPage ? `/${next}` : "/");
  }
  useEffect(() => {
    setStorageWarning(!saveProjectSession(session));
  }, [session]);
  useEffect(() => {
    const meta = pageMetadata(
      ["connect", "wizard", "results", "home"].includes(page)
        ? "/"
        : `/${page}`,
    );
    document.title = meta.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", meta.description);
    document
      .querySelector('link[rel="canonical"]')
      ?.setAttribute("href", meta.url);
  }, [page]);
  useEffect(() => {
    let live = true;
    projectHash(session.project, session.repository).then((hash) => {
      if (live) setStale(!!session.blueprint && hash !== session.blueprintHash);
    });
    return () => {
      live = false;
    };
  }, [
    session.project,
    session.repository,
    session.blueprint,
    session.blueprintHash,
  ]);
  useEffect(() => {
    const fn = () => setPage(currentPage());
    window.addEventListener("hashchange", fn);
    return () => {
      window.removeEventListener("hashchange", fn);
      controller.current?.abort();
    };
  }, []);
  useEffect(
    () =>
      registerProjectTools(browserModelContext(), (project) => {
        if (active.current)
          throw new Error(
            "Wait for generation to finish before changing the project.",
          );
        flushSync(() => {
          setSession((old) => ({
            ...old,
            project: {
              ...old.project,
              title: project.title,
              abstract: project.abstract,
            },
            selected: project.selected,
          }));
          setStep(1);
          setPage(getGeminiApiKey() ? "wizard" : "connect");
        });
      }),
    [],
  );
  function begin() {
    if (active.current) return null;
    active.current = true;
    const c = new AbortController();
    controller.current = c;
    setBusy(true);
    setError("");
    return c;
  }
  function finish(c: AbortController) {
    if (controller.current === c) {
      active.current = false;
      setBusy(false);
      controller.current = null;
    }
  }
  async function repository() {
    const c = begin();
    if (!c) return;
    setRepoError("");
    try {
      const { analyzeRepository } = await import("./services/github");
      const repository = await analyzeRepository(
        session.project.repositoryUrl,
        c.signal,
        setStatus,
      );
      c.signal.throwIfAborted();
      update({ repository });
    } catch (e) {
      if (!c.signal.aborted)
        setRepoError(
          e instanceof Error
            ? e.message
            : "Repository analysis failed. Continue manually.",
        );
    } finally {
      finish(c);
    }
  }
  async function blueprint(c: AbortController) {
    const hash = await projectHash(session.project, session.repository);
    if (session.blueprint && hash === session.blueprintHash)
      return session.blueprint;
    const { analyzeProject } = await import("./services/gemini/pipeline");
    const result = await analyzeProject(
      session.project,
      session.repository,
      session.settings,
      c.signal,
      setStatus,
    );
    c.signal.throwIfAborted();
    update({ blueprint: result, blueprintHash: hash });
    return result;
  }
  async function suggest() {
    const c = begin();
    if (!c) return;
    try {
      const bp = await blueprint(c);
      const choices = bp.recommendedDiagrams
        .map((d) => d.type)
        .filter((id) => diagramTypes.some((t) => t.id === id));
      update({ selected: choices.length ? choices : session.selected });
    } catch (e) {
      if (!c.signal.aborted)
        setError(
          e instanceof Error ? e.message : "Could not suggest diagrams.",
        );
    } finally {
      finish(c);
    }
  }
  async function generate(
    ids = session.selected,
    refinement?: string,
    detail?: string,
  ) {
    if (!getGeminiApiKey()) {
      navigate("connect");
      return;
    }
    const c = begin();
    if (!c) return;
    navigate("results");
    setJobs(
      Object.fromEntries([
        [
          "blueprint",
          { state: "running", message: "Understanding your project…" },
        ],
        ...ids.map((id) => [id, { state: "waiting", message: "Waiting" }]),
      ]) as Record<string, Job>,
    );
    const job = (id: string, value: Job) =>
      setJobs((old) => ({ ...old, [id]: value }));
    try {
      const bp = await blueprint(c);
      job("blueprint", {
        state: "done",
        message: "Project structure identified",
      });
      let cursor = 0;
      async function worker() {
        while (cursor < ids.length && !c!.signal.aborted) {
          const id = ids[cursor++];
          try {
            const { generateDiagram } =
              await import("./services/gemini/pipeline");
            const diagram = await generateDiagram(
              bp,
              id,
              { ...session.settings, ...(detail ? { detail } : {}) },
              c!.signal,
              (message) => job(id, { state: "running", message }),
              session.diagrams.find((d) => d.id === id),
              refinement,
            );
            c!.signal.throwIfAborted();
            setSession((old) => ({
              ...old,
              diagrams: [...old.diagrams.filter((d) => d.id !== id), diagram],
            }));
            job(id, { state: "done", message: "Complete — validated" });
          } catch (e) {
            job(id, {
              state: c!.signal.aborted ? "cancelled" : "error",
              message: c!.signal.aborted
                ? "Cancelled. Completed diagrams are kept."
                : e instanceof Error
                  ? e.message
                  : "Generation failed.",
            });
          }
        }
      }
      await Promise.all(
        Array.from(
          { length: Math.min(session.settings.concurrency, ids.length) },
          worker,
        ),
      );
    } catch (e) {
      if (!c.signal.aborted) {
        const message =
          e instanceof Error ? e.message : "Project analysis failed.";
        setError(message);
        job("blueprint", { state: "error", message });
      }
    } finally {
      setJobs((old) =>
        Object.fromEntries(
          Object.entries(old).map(([id, j]) => [
            id,
            ["waiting", "running"].includes(j.state)
              ? {
                  state: "cancelled",
                  message: "Not generated. Retry when ready.",
                }
              : j,
          ]),
        ),
      );
      finish(c);
    }
  }
  function resetAll() {
    controller.current?.abort();
    if (reset === "session" || disconnect) {
      clearEntireSession();
      setConnected(false);
    }
    setSession(fresh());
    setJobs({});
    setStep(1);
    setRepoError("");
    setReset(null);
    setDisconnect(false);
    navigate(
      reset === "session" ? "home" : getGeminiApiKey() ? "wizard" : "connect",
    );
  }
  const start = () =>
    navigate(
      connected ? (session.diagrams.length ? "results" : "wizard") : "connect",
    );
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <button
          className="brand"
          onClick={() => navigate("home")}
          aria-label={`${BRAND.name} home`}
        >
          <span className="brand-icon">
            <img
              src={`${import.meta.env.BASE_URL}drawgon-logo.png`}
              alt=""
              width="36"
              height="36"
            />
          </span>
          {BRAND.shortName}
          <span className="brand-beta">BETA</span>
        </button>
        <nav aria-label="Main navigation">
          <a href="#examples" onClick={() => setPage("home")}>
            Examples
          </a>
          <button onClick={() => navigate("open-source")}>
            Open source <ArrowUpRight size={13} />
          </button>
          {connected ? (
            <>
              <button
                className="connection-status"
                disabled={busy}
                onClick={() => navigate("connect")}
              >
                <span className="status-dot" />
                Gemini connected
              </button>
              <button disabled={busy} onClick={() => setReset("session")}>
                Clear Session
              </button>
            </>
          ) : (
            <button className="header-cta" onClick={start}>
              Start creating <ArrowUpRight size={15} />
            </button>
          )}
          {!connected && session.project.title && (
            <button disabled={busy} onClick={() => setReset("session")}>
              Clear Session
            </button>
          )}
        </nav>
      </header>
      <main id="main">
        {storageWarning && (
          <p role="status" className="notice">
            Browser session storage is full or unavailable. Your project remains
            in this tab, but may not survive refresh.
          </p>
        )}
        {error && (
          <p role="alert" className="notice error global-error">
            {error}
          </p>
        )}
        <ErrorBoundary>
          <Suspense
            fallback={<p className="notice">Opening your workspace…</p>}
          >
            {page === "home" && <Home start={start} />}{" "}
            {guides.some((g) => g.slug === page) && (
              <Guide
                slug={page}
                start={(type) => {
                  update({ selected: [type] });
                  navigate(connected ? "wizard" : "connect");
                }}
              />
            )}
            {page === "connect" && (
              <Connect
                model={session.settings.model}
                setModel={(model) =>
                  update({ settings: { ...session.settings, model } })
                }
                onConnection={setConnected}
                onContinue={() =>
                  navigate(session.diagrams.length ? "results" : "wizard")
                }
              />
            )}{" "}
            {page === "wizard" && (
              <Wizard
                session={session}
                update={update}
                step={step}
                setStep={(n) => {
                  if (n === 0) navigate("connect");
                  else {
                    setStep(n);
                    window.scrollTo({ top: 0 });
                  }
                }}
                onRepository={repository}
                onSuggest={suggest}
                onGenerate={() => generate()}
                busy={busy}
                status={status}
                repoError={repoError}
                stale={stale}
              />
            )}{" "}
            {page === "results" && (
              <ErrorBoundary>
                <Results
                  session={session}
                  update={update}
                  jobs={jobs}
                  busy={busy}
                  onCancel={() => controller.current?.abort()}
                  onRegenerate={(id, refinement, detail) =>
                    generate([id], refinement, detail)
                  }
                  onNew={() => setReset("project")}
                  onEdit={() => {
                    setStep(1);
                    navigate("wizard");
                  }}
                />
              </ErrorBoundary>
            )}{" "}
            {(page === "privacy" || page === "open-source") && (
              <Legal page={page} />
            )}
          </Suspense>
        </ErrorBoundary>
      </main>
      <footer className="site-footer">
        <span className="footer-brand">
          <img
            src={`${import.meta.env.BASE_URL}drawgon-logo.png`}
            alt=""
            width="23"
            height="23"
          />
          {BRAND.shortName}
        </span>
        <span>Understand. Draw. Explain.</span>
        <nav>
          <button onClick={() => navigate("privacy")}>
            <ShieldCheck size={13} />
            Privacy
          </button>
          <button onClick={() => navigate("open-source")}>Open source</button>
        </nav>
      </footer>
      {reset && (
        <Modal
          title={
            reset === "session" ? "Clear this session?" : "Start a new project?"
          }
          onClose={() => setReset(null)}
        >
          <p>
            {reset === "session"
              ? "Your Gemini key, project information, repository context and generated diagrams will be removed from this browser session."
              : "Current generated diagrams will be removed from this session. Download anything you want to keep first."}
          </p>
          {reset === "project" && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={disconnect}
                onChange={(e) => setDisconnect(e.target.checked)}
              />
              Also disconnect Gemini
            </label>
          )}
          <div className="button-row">
            <button onClick={() => setReset(null)}>Keep working</button>
            <button className="primary" onClick={resetAll}>
              {reset === "session" ? "Clear Session" : "New Project"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
