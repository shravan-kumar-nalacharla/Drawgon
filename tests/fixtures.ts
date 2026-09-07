import { blueprintSchema } from "../src/services/gemini/schemas";
export const blueprint = blueprintSchema.parse({
  title: "Library System",
  summary: "Readers borrow books through a catalog.",
  problem: "Track books and loans.",
  objectives: ["Manage loans"],
  actors: [{ name: "Reader", role: "Borrows books" }],
  techStack: [
    { name: "React", category: "Frontend", evidence: ["Project details"] },
  ],
  components: [
    {
      id: "catalog",
      name: "Catalog",
      purpose: "Browse books",
      technology: "React",
      evidence: ["Project details"],
    },
  ],
  componentGlossary: [{ id: "catalog", name: "Catalog" }],
  modules: [],
  dataStores: [],
  externalSystems: [],
  workflows: [{ name: "Borrow", steps: ["Choose book", "Request loan"] }],
  dataFlows: [],
  entities: [],
  classes: [],
  deployment: { description: "", environments: [], infrastructure: [] },
  methodology: { stages: [] },
  assumptions: ["Detailed class structure was not provided."],
  sourceEvidence: [{ fact: "Readers borrow books", source: "abstract" }],
  recommendedDiagrams: [
    { type: "architecture", reason: "Show catalog and reader." },
  ],
});
export const validHtml =
  '<!doctype html><html><head><meta charset="utf-8"/></head><body><svg viewBox="0 0 960 600" role="img" aria-labelledby="lib-title lib-desc"><title id="lib-title">Library Architecture</title><desc id="lib-desc">Reader connects to the catalog.</desc><style>text{font-family:Arial,sans-serif;font-size:20px;fill:#292d31}.focus{fill:#f8eee6;stroke:#bd4825}</style><defs><marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0 0L8 3L0 6Z" fill="#555"/></marker></defs><rect width="960" height="600" fill="#faf9f6"/><path d="M300 280H600" fill="none" stroke="#555" marker-end="url(#arrow)"/><rect x="100" y="220" width="200" height="120" fill="#fff" stroke="#555"/><rect class="focus" x="600" y="220" width="240" height="120"/><text x="155" y="287">Reader</text><text x="670" y="287">Catalog</text></svg></body></html>';
