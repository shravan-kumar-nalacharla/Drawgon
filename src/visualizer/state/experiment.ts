import { z } from "zod";
const triple = z.tuple([
  z.number().min(-3).max(3),
  z.number().min(-3).max(3),
  z.number().min(-3).max(3),
]);
export const neuronSchema = z.object({
  version: z.literal(1),
  topic: z.literal("neuron"),
  x: triple,
  w: triple,
  b: z.number().min(-3).max(3),
  act: z.enum([
    "Sigmoid",
    "Tanh",
    "ReLU",
    "Leaky ReLU",
    "Linear",
    "Binary step",
    "ELU",
    "Softplus",
    "GELU",
  ]),
  step: z.number().int().min(0).max(4),
});
export function readNeuron() {
  try {
    if (typeof location === "undefined" || location.hash.length > 5000)
      return null;
    const hash = new URLSearchParams(location.hash.slice(1)).get("experiment");
    if (!hash) return null;
    const result = neuronSchema.safeParse(JSON.parse(hash));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
