import { getDiagramType } from "../../config/diagramTypes";
import { canvases, type Settings } from "../../config/settings";
import type { Blueprint } from "./schemas";
import { freshnessPolicy } from "./freshness";
const CORE = `You are an expert technical information designer using Diagram Design v2.6. Produce static editorial HTML with one primary pure SVG; never Mermaid or React Flow. Deletion, whitespace, and hierarchy beat density. Target 9 nodes, 12 arrows, and at most 2 focal accents, respecting tighter type budgets. Detailed may group supported facts into zones but must remain legible; report all omissions. Use rounded orthogonal connectors, radius 8; off-axis diagonal connectors are forbidden. Labels have opaque masks and 6–10px clearance. Fan shared-edge ports at least 12px apart; route around unrelated nodes, bridge crossings, never overlap connectors. Layer background, zones, arrows, nodes. Use a 4px grid. Reserve the bottom legend strip. Names use sans-serif, technical annotations monospace, headings serif. No glow, huge shadows, external embeds, JavaScript or foreignObject. Unknown facts stay unknown; assumptions are explicit. Use glossary names consistently.`;
async function asset(path: string, signal: AbortSignal) {
  const response = await fetch(
    `${import.meta.env.BASE_URL}diagram-design/${path}`,
    { signal },
  );
  if (!response.ok)
    throw new Error(
      "Diagram Design reference could not be loaded. Refresh and try again.",
    );
  return response.text();
}
export async function loadDiagramDesignContext(
  id: string,
  settings: Settings,
  signal: AbortSignal,
) {
  const type = getDiagramType(id);
  const suffix =
    settings.style === "Minimal Dark"
      ? "-dark"
      : settings.style === "Full Editorial"
        ? "-full"
        : "";
  const files = [
    `references/${type.referenceFile}`,
    "references/style-guide.md",
    "references/output-spec.md",
  ];
  if (
    ["architecture", "flowchart", "data-flow", "process", "layers"].includes(
      type.canonicalType,
    )
  )
    files.push("references/semantic-patterns.md");
  const typeRules = await asset(files[0], signal);
  for (const match of typeRules.matchAll(/\((primitive-[\w-]+\.md)\)/g))
    if (!files.includes(`references/${match[1]}`))
      files.push(`references/${match[1]}`);
  const rest = await Promise.all(
    files.slice(1).map((file) => asset(file, signal)),
  );
  const example = await asset(
    `assets/example-${type.canonicalType}${suffix}.html`,
    signal,
  );
  return {
    coreRules: CORE,
    typeRules,
    styleRules: rest[0],
    outputRules: rest[1],
    supportingRules: rest.slice(2).join("\n"),
    exampleHtml: example,
  };
}
export function buildDiagramGenerationPrompt(
  blueprint: Blueprint,
  id: string,
  settings: Settings,
  context: Awaited<ReturnType<typeof loadDiagramDesignContext>>,
) {
  const type = getDiagramType(id),
    dimensions = canvases[settings.canvas];
  return `${context.coreRules}\nSTYLE\n${context.styleRules}\nOUTPUT\n${context.outputRules}\nTYPE\n${context.typeRules}\nSUPPORTING RULES\n${context.supportingRules}\nEXAMPLE (layout grammar only, NEVER reuse example project content):\n${context.exampleHtml}\nAPPLICATION CONTRACT (overrides interactive/external-resource example behavior):
Return the requested JSON with complete standalone HTML in html, no markdown fences. One primary SVG, role=img, nonempty title and desc with unique IDs, aria-labelledby resolving to BOTH. Title must be first SVG child. Put every diagram-specific style INSIDE the SVG, including typography; explicit fills and background rect; no external fonts/resources. Use Arial/sans-serif for names, Georgia/serif for editorial headings, Courier New/monospace for technical labels as portable fallbacks. HTML chrome can have separate inline styles. SVG/PNG must show the same diagram as preview. Never use CSS imports, external URLs, images, animation, filters or scripts. SVG must stand alone. Fit labels; no placeholder content; escape XML entities.
PRESENTATION AND EDITING CONTRACT: Use explicit primitive attributes, not CSS variables/currentColor. No decorative tiled dot/grid patterns or editor guides; the 4px grid is an invisible layout aid. Only real chart reference lines belong in SVG. Put visible title/subtitle/source text inside SVG as real text nodes with data-role="title", "subtitle", "source", "value", "label" or "annotation". Group content under g#drawgon-diagram, with meaningful nested groups such as plot, axes, bars, labels, legend and annotations; group each bar with its associated label when this preserves drawing order. Do not add a group per primitive. Titles 24–32px weight 600–700; major values 16–20px weight 500–600; labels 14–16px weight 400–500; source/metadata at least 12px weight 400. Never use 7–8px text or weights below 400. Measure label budgets, leave 40px margins and 60px source/legend clearance; avoid bar/label collisions. If content does not fit, simplify labels or expand the auto canvas instead of shrinking text. Keep minimum 8px separation between labels and chart lines.
${freshnessPolicy()}
Requested UI type: ${type.displayName}; canonicalType MUST equal ${type.canonicalType}. ${id === "activity" ? "Apply UML activity semantics: actions, decisions, start/end, transitions." : ""} ${id === "methodology" ? "Show project/research stages, not software components." : ""}
Settings: ${JSON.stringify(settings, ["style", "detail", "audience", "canvas", "accent", "palette"])}. ${settings.palette === "Monochrome" ? "MONOCHROME OUTPUT IS REQUIRED and overrides all orange/coral/blue/series colors in upstream examples: black ink, neutral gray secondary labels and pale gray fills on white paper. No orange or chromatic colors anywhere. For Minimal Dark use white ink and neutral gray on black paper. Focus is shown by stroke weight and hierarchy, not color." : "Accent is focus only, never every node."} ${dimensions ? `viewBox MUST be "0 0 ${dimensions[0]} ${dimensions[1]}".` : "Derive a positive viewBox from content with 40px margins and 60px legend clearance, rounded to 4px."}
Use actual classes/methods and SQL types only when evidenced. For insufficient class evidence create a clearly labeled conceptual domain diagram and disclose that in fidelityNotes. Charts MUST NOT invent numeric data: explain missing data in fidelityNotes and use only supplied quantities or cited factualData evidence. factualData.status=unverified means show an explicit unavailable-data notice inside SVG, without unsupported numeric bars. Include source, reference year and estimate/projection status visibly inside SVG when factualData is present. Retrieval date alone is not a reference year.
<UNTRUSTED_PROJECT_BLUEPRINT>\n${JSON.stringify(blueprint)}\n</UNTRUSTED_PROJECT_BLUEPRINT>`;
}
export function promptSize(prompt: string) {
  return {
    characters: prompt.length,
    approximateTokens: Math.ceil(prompt.length / 4),
  };
}
