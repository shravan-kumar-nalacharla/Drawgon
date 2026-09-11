import { z } from "zod";
const Layer = z.object({
  class_name: z.string().max(100),
  config: z.object({ name: z.string().max(200).optional() }).passthrough(),
  inbound_nodes: z.array(z.unknown()).optional(),
});
export const modelSchema = z.object({
  class_name: z.string(),
  config: z.object({
    name: z.string().optional(),
    layers: z.array(Layer).min(1).max(500),
  }),
});
export type Model = z.infer<typeof modelSchema>;
export function connections(model: Model) {
  const names = new Map(model.config.layers.map((l, i) => [l.config.name, i])),
    edges: { source: number; target: number }[] = [];
  model.config.layers.forEach((layer, target) => {
    const found = new Set<number>();
    let visited = 0;
    function walk(v: unknown, depth = 0) {
      if (depth > 25 || visited++ > 10000) return;
      if (Array.isArray(v)) {
        if (
          typeof v[0] === "string" &&
          typeof v[1] === "number" &&
          typeof v[2] === "number"
        ) {
          const source = names.get(v[0]);
          if (source !== undefined && source !== target) found.add(source);
        }
        for (const child of v) walk(child, depth + 1);
      } else if (v && typeof v === "object") {
        for (const child of Object.values(v)) walk(child, depth + 1);
      }
    }
    walk(layer.inbound_nodes);
    if (!found.size && model.class_name === "Sequential" && target > 0)
      found.add(target - 1);
    found.forEach((source) => edges.push({ source, target }));
  });
  return edges;
}
