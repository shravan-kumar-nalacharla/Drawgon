# Drawgon

Drawgon (https://drawgon.in) is a browser-only application that turns project descriptions and optional public GitHub repositories into editorial architecture, UML, flow, database, activity and methodology diagrams using the user's Gemini API key.

No account, backend, database or shared API key. The production output is static files.

## Run locally

Use Node.js 22.12+ (development verified on Node 24) and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Connect a Gemini API key, validate it, then complete title → abstract → optional repository → details → diagram selection → review. Model availability, quota and billing are controlled by your Google API project.

```sh
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run preview` serves the production build locally. No `.env` file is needed. Never add a Gemini API key to source, deployment settings or the build environment.

## Screenshots

Playwright captures desktop/mobile landing and results screenshots under `test-results/`. That directory is ignored because it contains temporary test artifacts. Screenshots show mocked test output or explicitly labeled upstream examples, not evidence of a real Gemini generation.

## Architecture

- **React + TypeScript + Vite:** a guided intake wizard, project understanding panel and results workspace. Marketing and diagram guide pages are pre-rendered at build time for search engines. Native HTML controls and modal dialogs support keyboard use. Large screens and service modules are loaded on demand.
- **Gemini:** `src/services/gemini/` lazily creates the official `@google/genai` client. The installed SDK uses `interactions.create`, a typed text/JSON response format, `output_text`, request abort signals and `store: false`. SDK types were inspected against [Google's Interactions documentation](https://ai.google.dev/gemini-api/docs/interactions-overview). The default available stable model is centralized as `gemini-3.5-flash` in `src/config/settings.ts`; Advanced Settings allows an override.
- **Shared understanding:** analysis produces a Zod-validated blueprint, evidence, component glossary, assumptions and diagram recommendations. A SHA-256 hash of intake and repository context allows reuse within the session. Important input changes invalidate the cached blueprint. Users can correct blueprint JSON before regenerating individual diagrams.
- **Generation:** selected type rules + style guide + output specification + relevant primitives/semantic rules + one example → diagram-specific plan → structured HTML/SVG response → sanitization and validation → at most two repairs. Generation concurrency is 1 or 2; 429, transient network and server failures get bounded 2/5/10-second retries. Cancelling preserves successful diagrams.
- **Design adapter:** `src/services/gemini/promptBuilder.ts` loads the selected upstream references from static assets. `promptSize()` reports character and approximate token counts when explicitly called; nothing automatically logs prompts or keys. It does not send the whole catalog for every diagram.
- **GitHub:** `src/services/github/` validates URLs, detects the default branch, resolves tree links including slash-containing branch names, ranks files and fetches selected blobs. Limits: 24 files, 16,000 characters per file, 120,000 total context characters. Binaries, build artifacts, dependencies, lockfiles and actual `.env` files are excluded. `.env.example` is allowed. File paths and truncation notices are preserved. Missing/private repositories, partial trees and anonymous rate limits do not prevent manual generation.
- **Static previews:** DOMPurify allowlists HTML/SVG; CSS Tree removes unsafe CSS and external URLs. Preview documents have their own restrictive CSP and `sandbox=""` frames without scripts or same-origin permission. Original invalid output triggers repair and is never previewed. No Mermaid, React Flow, generated JavaScript, foreignObject or external embedded resources.
- **Exports:** SVG remains vector and is XML-serialized with namespaces, style rules, accessibility metadata and definitions. Native browser SVG-to-canvas rasterization produces PNG at 1×/2×/3×. JSZip runs only on demand. ZIP includes HTML/SVG/PNG folders, project summary, generation notes and upstream licenses. Keys are never part of the export data model. Blob URLs are revoked.

## Privacy and security

The only key storage is `sessionStorage["project_diagram_ai_gemini_key"]`. Project data, blueprint and diagrams also use sessionStorage when capacity permits; React state remains usable if project storage fills. Browser session restoration can restore sessionStorage. **Clear Session** explicitly removes the key, project state, blueprint, repository context and generated diagrams. New Project retains the key unless the user chooses to disconnect.

The key goes directly to Google's API in its request header. Project content and selected repository context also go to Google for analysis/generation. GitHub requests go directly to GitHub. There is no application database, authentication service, telemetry or analytics. Static hosts may maintain ordinary access logs.

`store: false` opts out of stored Interactions resources, not all processing or retention under Google's API policies. The Privacy page makes this distinction. The hosting provider never receives keys or project content through application requests. SDK error objects are deliberately not logged or retained as error causes, because they may include request metadata.

The application ships CSP in `index.html`, plus strict response headers for Netlify/Cloudflare Pages and Vercel. Generated documents use a separate `default-src 'none'` policy. Diagram fonts use disclosed system fallbacks (Arial/Georgia/Courier New) so offline exports do not need external font requests. The upstream hierarchy, typography roles, palettes and layout grammar are preserved.

Prompt-injection defenses identify project/repository contents as untrusted evidence in both analysis and generation. These instructions reduce instruction-following risk; generated output is additionally treated as untrusted and constrained in the browser. Automated validation checks structure, accessibility, dimensions, unsafe markup, missing content and simple overflow heuristics. It cannot prove every connector is correct or that the model's project interpretation is factual; review diagrams and assumptions before publication.

## Static deployment

Build command: **`npm run build`**. Output directory: **`dist`**.

- **Vercel:** import the repository; `vercel.json` selects the static output, clean URLs and security headers. See `docs/VERCEL-LAUNCH.md` for drawgon.in domain and search launch steps. No functions or secrets required.
- **Netlify:** build with `npm run build`, publish `dist`. Included `_headers` and `_redirects` provide security headers and direct legal-page routes.
- **Cloudflare Pages:** build `npm run build`, output `dist`; no Workers, D1, bindings or runtime secrets.
- **GitHub Pages:** publish the contents of `dist`. The current build targets the root of drawgon.in; for a GitHub project subpath, adjust Vite base and the pre-rendered asset/route paths. Use `#privacy` and `#open-source` links where the host does not support rewrites. The in-app footer uses these portable routes. CSP is provided through HTML; configure response headers where your host supports them.
- **Any static server:** serve `dist` over HTTPS (or localhost for development). Apply equivalent security headers. Do not disable CSP to make an integration work.

## Upstream integration and licenses

Diagram Design is an AI/agent design knowledge base, not a React rendering library. This application converts that methodology into a Gemini-driven browser workflow.

Upstream: [cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design), skill v2.6, commit **2724fd2efd8c6737f6fa704fbf5da52d67375497**.

Original `LICENSE` and `THIRD_PARTY_LICENSES.md` remain intact. Copies, `SKILL.md`, references and assets are under `public/diagram-design/`. The original README is retained at `docs/UPSTREAM-README.md`. Provenance and adaptation details are in `src/vendor/diagram-design/UPSTREAM.md`. The Open Source page credits Cathryn Lavery and displays licenses. The catalog is derived from the pinned SKILL.md's 39-type selection table; Activity and Methodology are two extra UI aliases.

The original upstream source and scripts remain in the checkout. App code does not claim authorship of that project. Upstream material is MIT, Copyright (c) 2025 Cathryn Lavery. Applicable third-party icon attribution is preserved; trademarks remain with their owners. Application dependency licenses remain in their packages and lockfile-resolved distribution.

## Testing and limits

Vitest and React Testing Library cover URL validation, prioritization, repository context, key/session clearing, malicious markup/CSS, accessible SVG extraction, safe filenames, ZIP contents and required fields. Playwright intercepts the actual Google SDK HTTP boundary, so tests require no real key and never submit their test credential to Google. It covers the wizard, repair, preview, SVG/PNG/ZIP downloads, refinement, blueprint reuse, responsive layout and privacy/licensing views.

Real Gemini output quality and credential acceptance must be checked with a user's valid API key; the automated suite does not claim to verify a live paid request. Other practical limits are anonymous GitHub rate limits, browser sessionStorage capacity, and a 40-million-pixel PNG memory guard. Fonts can differ across operating systems; previews and exported rasters use the same browser font fallback. Local text editing is supported; shape dragging, cloud save, private repository support, PDF export and collaboration are not provided.

## Local text editing and presentation export

Choose **Edit text & style** on a result. Click SVG text or choose it in the accessible object selector; double-click opens the text field. Enter/blur commits, Escape cancels a draft. Font, size, weight, bold, italic, alignment and color controls update local structured text state; Delete, reset formatting and a 50-change undo/redo history are supported. Positioned tspan lines remain individually editable. SVG accessibility title/description are also listed. Text edits use no Gemini requests, persist with the browser session and feed every export format. Long replacements may require smaller text; this is not a shape/layout editor.

SVG and PNG now resolve generated CSS inside an isolated, script-disabled clone, bake portable presentation attributes, remove decorative full-canvas dot/grid patterns and editor-only nodes, preserve chart reference lines, and retain text and logical groups. **Presentation SVG** additionally offers white (default) or transparent paper. Standard SVG preserves the diagram's own background, including explicitly selected dark diagrams. Choose a suitable background for dark/white text. Imports remain vector. PowerPoint and LibreOffice control how much grouping they preserve after Break/Ungroup; Drawgon cannot force those applications to preserve groups.

## Real-world data freshness

Analysis classifies external factual/statistical requests. UML/architecture/project-structure requests and supplied values do not need Google Search. Other factual requests run a separate stateless Gemini Interactions request with `tools: [{type: 'google_search'}]`, then carry its text, citation metadata and search suggestions into the blueprint. Grounding may have Google quota/billing implications. The results panel displays the evidence and suggestions. Blueprint caching expires at the next UTC date.

Prompts require the reference year, source, and observed/estimate/projection status visibly inside the chart. A requested year is not a license to fabricate that year's figures. Missing support produces an explicit unavailable-data notice instead of invented values. Grounding errors or missing citations are surfaced as unverified data; no claim of live verification is made from model memory. Source quality, definitions, comparability and numeric accuracy still require human review. No server, database or account service was added.

See `docs/EDITING-EXPORT-REPORT.md` for implementation details, test results and compatibility limitations. The optional `scripts/check-impress.py` integration check uses LibreOffice's bundled Python and a dedicated headless UNO listener; it imports browser-test fixtures, moves the SVG, dispatches Break and exports PDFs/ODPs for inspection.

## Drawgon branding assets

The central brand is Drawgon at https://drawgon.in. `public/drawgon-logo.png` is the exact user-supplied dragon and pen logo, with unchanged pixels. It appears in the header, footer, loading state, favicon and social metadata. Diagrams default to a monochrome palette, enforced after sanitization; optional accent mode must be selected explicitly. Original upstream examples remain unchanged, while adapted static monochrome previews are under `public/examples/`.

The build emits 10 pre-rendered pages, including seven distinct diagram/student guides, plus canonical tags, titles, descriptions, WebSite/WebApplication JSON-LD, robots.txt and sitemap.xml. No fake ratings or unsupported feature claims are used. See `docs/BRAND.md` for the logo brief and `docs/VERCEL-LAUNCH.md` for deployment and Google Search Console steps.
