import { z } from "zod";
import type { FactualData } from "./freshness";
const strings = z.array(z.string());
const named = z.object({ name: z.string(), purpose: z.string() });
export const blueprintSchema = z.object({
  factualRequest: z
    .object({
      requiresExternalData: z.boolean(),
      userProvidedValues: z.boolean(),
      query: z.string(),
    })
    .optional(),
  title: z.string(),
  summary: z.string(),
  problem: z.string(),
  objectives: strings,
  actors: z.array(z.object({ name: z.string(), role: z.string() })),
  techStack: z.array(
    z.object({ name: z.string(), category: z.string(), evidence: strings }),
  ),
  components: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      purpose: z.string(),
      technology: z.string(),
      evidence: strings,
    }),
  ),
  componentGlossary: z.array(z.object({ id: z.string(), name: z.string() })),
  modules: z.array(named),
  dataStores: z.array(named.extend({ type: z.string() })),
  externalSystems: z.array(named),
  workflows: z.array(z.object({ name: z.string(), steps: strings })),
  dataFlows: z.array(
    z.object({ source: z.string(), target: z.string(), data: z.string() }),
  ),
  entities: z.array(
    z.object({ name: z.string(), fields: strings, relationships: strings }),
  ),
  classes: z.array(
    z.object({
      name: z.string(),
      attributes: strings,
      methods: strings,
      relationships: strings,
    }),
  ),
  deployment: z.object({
    description: z.string(),
    environments: strings,
    infrastructure: strings,
  }),
  methodology: z.object({ stages: strings }),
  assumptions: strings,
  sourceEvidence: z.array(z.object({ fact: z.string(), source: z.string() })),
  recommendedDiagrams: z.array(
    z.object({ type: z.string(), reason: z.string() }),
  ),
});
export type Blueprint = z.infer<typeof blueprintSchema> & {
  factualData?: FactualData;
};
export const planSchema = z.object({
  title: z.string(),
  focus: z.string(),
  nodes: strings,
  relationships: strings,
  layout: z.string(),
  omissions: strings,
  assumptions: strings,
});
export const diagramSchema = z.object({
  displayName: z.string(),
  canonicalType: z.string(),
  title: z.string(),
  summary: z.string(),
  html: z.string().max(500_000),
  assumptions: strings,
  fidelityNotes: strings,
});
