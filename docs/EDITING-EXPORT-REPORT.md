# Drawgon editing and export implementation — 8 September 2026

## Summary

The existing React/Vite application and editorial UI remain. New code adds a lightweight local text/style editor, a shared browser SVG normalizer, Presentation SVG downloads, selective Google Search grounding, stronger generation typography instructions, source-year checks, an animated generation state, and Drawgon-first repository links. No database, account, backend, cloud project storage or permanent API-key storage was added.

## Audit and reproduced root causes

Before the change, `extractSvg` copied CSS from the generated document into the exported SVG and serialized it. It did not resolve CSS variables, inherited body colors or `currentColor`. LibreOffice does not resolve those browser styling dependencies consistently. A test background using `fill="var(--paper)"` reproduced the unexpected black fill in Impress. Baking the computed white fill into a real SVG attribute corrected it.

The upstream `public/diagram-design/assets/example-bar.html` includes a whole-canvas `pattern#dots` and a rectangle filled with that pattern, separately from its actual chart gridlines. The previous exporter retained this decoration. Our reproduction uses the same pattern mechanism. Impress Break expands its tiled decoration into individual vector objects: **1,449 shapes before the fix, 8 after** (excluding the slide's notes element). The four remaining text shapes retain real editable text. This diagnoses and reproduces the relevant pipeline defects; the user's exact failing downloaded SVG was not supplied, so it is not an assertion about every construct in that original file.

Evidence:

- `docs/verification/before-import.png`: black background reproduced in LibreOffice.
- `docs/verification/after-import.png`: corrected white paper, blue bars, dark readable text.
- `docs/verification/after-break.png`: appearance retained after Break.
- `docs/verification/impress-results.json`: UNO-reported object types, text and successful single-object movement before Break.

## Changed modules

| Area | Files |
|---|---|
| Export normalization | `src/services/diagram/presentation.ts`, `safety.ts`, `export.ts` |
| Structured local editor | `src/services/diagram/editor.ts`, `src/components/DiagramEditor.tsx`, `src/types.ts` |
| Workspace/download controls | `src/components/Results.tsx`, `src/styles.css` |
| Factual data and grounding | `src/services/gemini/freshness.ts`, `client.ts`, `pipeline.ts`, `schemas.ts`, `promptBuilder.ts`, `src/services/projectHash.ts`, `src/components/FactualSources.tsx` |
| Generation motion | `src/components/GenerationStatus.tsx`, `src/styles.css` |
| Branding/attribution | `public/drawgon-logo.png`, `index.html`, `docs/BRAND.md`, `src/config/brand.ts`, `src/App.tsx`, `src/components/Home.tsx`, `src/components/Legal.tsx`, `package.json` |
| Build/documentation | `scripts/prerender.mjs`, `README.md`, this report and verification evidence |
| Verification | `tests/e2e/editor-export.spec.ts`, `tests/freshness.test.ts`, `tests/freshness-pipeline.test.ts`, `tests/core.test.ts`, `scripts/check-impress.py` |

## How local editing works

Opening the editor normalizes an isolated copy of the existing diagram once. The editor stores that base SVG plus typed text objects with stable IDs, content, roles and font/color attributes. Positioned tspan lines remain separately editable, preserving their existing coordinates. Accessibility title and description can also be selected. It uses event delegation inside a sanitized, script-disabled iframe, not hundreds of node listeners or a canvas framework.

Click selects text; double-click focuses the text field. An accessible object selector provides keyboard access. Enter or blur commits; Escape cancels the draft. Font, size, weight, bold, italic, alignment, color, reset formatting and deletion are local. Undo/redo uses bounded 50-change snapshots of text objects, not copies of the whole SVG. Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z work outside native text-entry controls, which retain their native editing behavior.

Rendering clones the base DOM and applies object state through DOM attributes/textContent. It does not regex-rewrite an opaque SVG. Committed changes immediately update the diagram's sanitized HTML and session state, so SVG, Presentation SVG, PNG, HTML, clipboard and ZIP consume the same current edited result. Changes do not call Gemini or reset other edits. Regenerating explicitly creates a new AI revision; it is a separate action.

## Export behavior

The common export path creates an isolated sanitized document, reads computed SVG styles, writes explicit paint/font/opacity attributes, converts RGBA paints into RGB plus opacity, normalizes fragment references, removes stylesheet dependence, and serializes real SVG primitives. It strips editor-only nodes and recognizable decorative full-canvas dot/grid patterns while preserving chart gridlines. Unused definitions, empty groups and invisible helper content are removed. Existing drawing order, semantic groups, viewBox, dimensions, aspect ratio and vector text are retained under a root diagram group.

Standard SVG preserves the diagram's paper, including deliberately dark diagrams. Presentation SVG defaults to white and offers transparency. Users must choose a suitable background for light text from an intentionally dark diagram. PNG uses the normalized SVG, and HTML preserves the sanitized current edited state. No raster image is embedded inside SVG and text is not converted to paths.

Impress may flatten SVG groups during Break, as it did in our check. The exported hierarchy cannot force presentation applications to preserve grouping. The practical improvement is removal of decorative pattern tiles and retention of a small, meaningful set of primitives and text objects.

## Factual data freshness

The shared policy includes today's UTC date and distinguishes supplied values, requested historical years, latest supported observations, estimates and projections. It requires sources and reference years in the SVG, rejects silently relabeling older observations as the current year, and prohibits fabricated precision. Generation's repair checks require visible source/year text for grounded results and an unavailable-data notice for unverified requests.

Analysis classifies whether outside factual data is needed. A conservative keyword fallback supports common statistical prompts if a model omits the optional classification. Static UML and architecture prompts do not need search; supplied data is retained. Other factual requests use a separate `interactions.create` request with `tools: [{type: "google_search"}]`, `store: false`, and the user's existing browser key. The installed SDK and Google's current [grounding documentation](https://ai.google.dev/gemini-api/docs/google-search) support this tool. Grounding is separate from structured diagram generation so search is not repeated for each diagram or local edit.

Returned citation metadata, evidence text and search suggestions are retained in the blueprint and shown in the results panel. Source URLs are constrained to HTTP(S); suggestion HTML is sanitized and sandboxed. If search fails or supplies no citations, the result is explicitly unverified and must omit unsupported numerical bars. Cached blueprints expire at the next UTC date. Model interpretation and source quality still require review; the application cannot guarantee that a cited source supports every generated number.

## Branding and attribution

Prominent header/footer Open source links, the home-page repository link and the legal page's primary GitHub link now point to `https://github.com/shravan-kumar-nalacharla/Drawgon`. Package repository/issue/homepage metadata now identifies Drawgon. The footer says **Built on Diagram Design by Cathryn Lavery** and links to the original project. The legal page retains the original creator, pinned upstream commit and full license display.

`LICENSE` and `THIRD_PARTY_LICENSES.md`, including public copies, remain unchanged. Exact original notice: **Copyright (c) 2025 Cathryn Lavery**. Pinned upstream commit: `2724fd2efd8c6737f6fa704fbf5da52d67375497`, skill v2.6.

**New logo installed:** the subsequently supplied `ChatGPT Image Sep 8, 2026, 10_00_12 AM.png` is copied byte-for-byte to `public/drawgon-logo.png` (SHA-256 `c6273166ffaa354cd62f52f685d3d8b700faaed05f161751af4b18c2966e8b49`). It replaces the header/mobile header, footer, favicon and loading icon, and is used in OpenGraph/Twitter metadata. Aspect ratio is preserved. Multiply blending lets the original white paper blend into light UI backgrounds without redrawing the image. Versioned asset URLs refresh the previous icon cache. See `docs/BRAND.md`.

## Verification and limits

- `npm run test`: 37 tests passed, including current/explicit-year/supplied-value policies, grounding evidence retention, unavailable-grounding fallback and static technical requests.
- `npm run lint`: passed.
- `npm run build`: passed; Vercel output remains static `dist` with 10 pre-rendered routes. Static upstream marketing examples use the original serializer at build time because JSDOM does not provide real SVG computed styles; interactive user exports use the browser normalizer.
- `npm run test:e2e`: 8 browser tests passed, including edited title/axis/annotation, fonts, undo/redo/Escape, all current export formats, no editing API requests, mobile screenshots, vector export, five upstream diagram types, security repair and production SEO.
- Native LibreOffice Impress via UNO: imported SVG, moved it as one object, invoked `.uno:Break`, inspected real editable text objects, exported PDFs and visually compared rendered before/after results. The initial headless startup/close failures were handled separately and were not treated as passing tests.
- Dependency audit: zero reported vulnerabilities.

No real Gemini credential was supplied, so live data retrieval and actual model-produced statistical accuracy were not tested; Gemini requests in tests are mocked. PowerPoint and Google Slides were not run. Long edited labels can need manual font-size adjustment; automatic collision-free reflow, shape dragging and a full graphics editor are outside this implementation. Installed font availability can change rendering between applications. Grounding availability/quota depends on the user's key/model. These changes have not been deployed by this local implementation.
