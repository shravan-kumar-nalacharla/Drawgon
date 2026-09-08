import type { Project } from "../../types";
export interface GroundingEvidence {
  citations: { url: string; title: string }[];
  suggestions: string[];
}
export interface FactualData extends GroundingEvidence {
  status: "grounded" | "unverified" | "user-provided";
  checkedAt: string;
  policy: string;
  text: string;
}
export function freshnessPolicy(now = new Date()) {
  return `FACTUAL DATA POLICY. Today's UTC date is ${now.toISOString().slice(0, 10)}. Preserve user-supplied values exactly, including their stated year. If a year is requested, use that year only when supported; otherwise state unavailable. With no requested year, prefer the latest authoritative observation or well-supported estimate. For latest/current/today/now, use retrieved evidence, never training-memory guesses. Distinguish observation, estimate and projection for EVERY value. Always show value, reference year, source name and estimate/projection status in the chart, plus a compact source line. Publication date is not the measurement year. Never relabel historical figures with the current year. Never invent precision, source URLs or current-year census values. If evidence is absent/conflicting, explicitly state unverified/data unavailable, omit unsupported quantitative bars, and request data. Prefer authoritative statistical agencies and original publishers, with comparable definitions and units. User values are labeled user-provided, not independently verified.`;
}
export function factualRequest(project: Project) {
  const text = [
    project.title,
    project.abstract,
    ...Object.values(project.details),
  ].join("\n");
  // Conservative prefilter: project structure is not a reason to send a search query.
  const technical =
    /\b(uml|class diagram|sequence diagram|architecture diagram|entity.relationship|er diagram)\b/i.test(
      text,
    );
  const external =
    /\b(population|gdp|gross domestic|inflation|unemployment|market cap|market value|country statistics|adoption rate|technology adoption|rankings?|current events|life expectancy|birth rate|mortality|election results|exchange rate|stock price|carbon emissions)\b/i.test(
      text,
    );
  const supplied =
    /\b\d[\d,.]*\s*(?:billion|million|trillion|[bBmM])\b/.test(text) ||
    /(?:^|\n|[,;])\s*[\w -]+\s*[:=]\s*\d/.test(text);
  return {
    needed: external && !technical && !supplied,
    supplied: external && supplied,
    text,
    technical,
  };
}
export function collectGrounding(value: unknown): GroundingEvidence {
  const citations = new Map<string, { url: string; title: string }>(),
    suggestions = new Set<string>();
  function walk(item: unknown) {
    if (!item || typeof item !== "object") return;
    if (Array.isArray(item)) {
      item.forEach(walk);
      return;
    }
    const object = item as Record<string, unknown>;
    if (
      object.type === "url_citation" &&
      typeof object.url === "string" &&
      /^https?:\/\//i.test(object.url)
    )
      citations.set(object.url, {
        url: object.url,
        title: typeof object.title === "string" ? object.title : object.url,
      });
    if (typeof object.search_suggestions === "string")
      suggestions.add(object.search_suggestions);
    Object.values(object).forEach(walk);
  }
  walk(value);
  return { citations: [...citations.values()], suggestions: [...suggestions] };
}
