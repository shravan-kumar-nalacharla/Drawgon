import { diagramTypes } from "../config/diagramTypes";

interface Tool {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown;
}
interface ModelContext {
  registerTool: (
    tool: Tool,
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
}
export interface StagedProject {
  title: string;
  abstract: string;
  selected: string[];
}
export function registerProjectTools(
  context: ModelContext | undefined,
  stage: (project: StagedProject) => void,
) {
  if (!context?.registerTool) return () => {};
  const lifecycle = new AbortController();
  const tools: Tool[] = [
    {
      name: "get_diagram_catalog",
      description:
        "List supported diagram choices. Does not access project content or API keys.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () =>
        diagramTypes.map(({ id, displayName, description }) => ({
          id,
          displayName,
          description,
        })),
    },
    {
      name: "stage_project",
      description:
        "Replace the project title, abstract and diagram selection in the visible wizard for review. Does not generate diagrams or send data to Google. API key entry and generation happen in the user interface.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 1, maxLength: 180 },
          abstract: { type: "string", minLength: 1, maxLength: 20000 },
          selected: {
            type: "array",
            items: { type: "string", enum: diagramTypes.map((t) => t.id) },
            minItems: 1,
          },
        },
        required: ["title", "abstract", "selected"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input: unknown) => {
        if (!input || typeof input !== "object")
          throw new Error(
            "Provide a project title, abstract and selected diagrams.",
          );
        const { title, abstract, selected } = input as Record<string, unknown>;
        if (
          typeof title !== "string" ||
          !title.trim() ||
          title.length > 180 ||
          typeof abstract !== "string" ||
          !abstract.trim() ||
          abstract.length > 20000 ||
          !Array.isArray(selected) ||
          !selected.length ||
          selected.some(
            (id) =>
              typeof id !== "string" || !diagramTypes.some((t) => t.id === id),
          )
        )
          throw new Error("Invalid project or diagram selection.");
        stage({
          title: title.trim(),
          abstract: abstract.trim(),
          selected: [...new Set(selected)],
        });
        return {
          status: "staged_for_review",
          title: title.trim(),
          selected: [...new Set(selected)],
        };
      },
    },
  ];
  for (const tool of tools) {
    try {
      void Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {
      /* Unsupported registration must not prevent the normal UI. */
    }
  }
  return () => lifecycle.abort();
}
export function browserModelContext() {
  return (document as Document & { modelContext?: ModelContext }).modelContext;
}
