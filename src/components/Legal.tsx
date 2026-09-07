import { useEffect, useState } from "react";
export function Legal({ page }: { page: "privacy" | "open-source" }) {
  const [licenses, setLicenses] = useState<string[]>([]);
  useEffect(() => {
    if (page === "open-source")
      Promise.all(
        ["LICENSE", "THIRD_PARTY_LICENSES.md"].map((f) =>
          fetch(`${import.meta.env.BASE_URL}diagram-design/${f}`).then((r) =>
            r.text(),
          ),
        ),
      )
        .then(setLicenses)
        .catch(() =>
          setLicenses(["License files could not load. Use the links below."]),
        );
  }, [page]);
  return (
    <article className="legal-page">
      <p className="eyebrow">TRANSPARENCY, BY DESIGN</p>
      <h1>{page === "privacy" ? "Your privacy." : "Built on open source."}</h1>
      {page === "privacy" ? (
        <>
          <h2>No database. No account.</h2>
          <p>
            We do not store your projects in an application database. No signup
            is required, and this application contains no analytics, advertising
            or tracking scripts.
          </p>
          <h2>Your Gemini API key</h2>
          <p>
            Your Gemini API key is stored only in this browser session and is
            never saved to our database — because this application has no
            database. The key is sent directly from your browser to Google’s
            Gemini API. Remove it using “Remove API key” or “Clear Session”.
            Browser session restoration may restore sessionStorage; Clear
            Session explicitly removes it.
          </p>
          <h2>Project information and Gemini</h2>
          <p>
            Project descriptions, selected repository files, blueprints,
            diagrams and refinement instructions are sent directly to Google
            when needed for analysis or generation. We use stateless
            interactions with store: false. Google’s own API terms and data
            policies govern their processing; we do not promise Google retains
            nothing.
          </p>
          <h2>Public GitHub repositories</h2>
          <p>
            Repository metadata and selected source files are fetched directly
            from GitHub’s public API. We do not require a GitHub token. GitHub
            receives requests from your browser and applies its own rate limits
            and policies.
          </p>
          <h2>Browser session and downloads</h2>
          <p>
            Project state and diagrams may be saved in sessionStorage to survive
            refreshes. They are not intentionally persisted beyond the browser
            session. Clear Session clears project state, generated diagrams,
            repository context and the API key. Downloads are created in browser
            memory and saved wherever you choose. Downloaded files remain until
            you delete them.
          </p>
          <h2>Hosting</h2>
          <p>
            The static hosting provider serves application files and may keep
            standard access logs, such as IP addresses. The application does not
            send your API key or project content to the hosting provider.
          </p>
          <a
            href="https://ai.google.dev/gemini-api/terms"
            target="_blank"
            rel="noreferrer"
          >
            Google Gemini API terms ↗
          </a>
        </>
      ) : (
        <>
          <p>
            Diagram generation design components include software from the
            Diagram Design project, used under the MIT License.
          </p>
          <p>
            <a
              href="https://github.com/cathrynlavery/diagram-design"
              target="_blank"
              rel="noreferrer"
            >
              Diagram Design by Cathryn Lavery ↗
            </a>
          </p>
          <p>
            Imported version 2.6, commit{" "}
            <code>2724fd2efd8c6737f6fa704fbf5da52d67375497</code>. The
            application adapts the upstream design knowledge base: style rules,
            type references, primitives, examples and export guidance. Upstream
            authorship is retained.
          </p>
          {licenses.map((text, i) => (
            <details key={i} open={i === 0}>
              <summary>
                {i === 0
                  ? "MIT License — Diagram Design"
                  : "Third-party attribution"}
              </summary>
              <pre>{text}</pre>
            </details>
          ))}
          <p>
            <a href={`${import.meta.env.BASE_URL}diagram-design/LICENSE`}>
              Download upstream license
            </a>{" "}
            ·{" "}
            <a
              href={`${import.meta.env.BASE_URL}diagram-design/THIRD_PARTY_LICENSES.md`}
            >
              Third-party licenses
            </a>
          </p>
          <h2>Application dependencies</h2>
          <p>
            React, Vite, TypeScript, Google GenAI SDK, DOMPurify, CSS Tree, Zod,
            Lucide and JSZip make this application possible. Their licenses are
            retained in the source distribution and dependency packages. Brand
            marks belong to their respective owners; inclusion does not imply
            endorsement.
          </p>
        </>
      )}
    </article>
  );
}
