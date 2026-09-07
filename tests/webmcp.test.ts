import { it, expect, vi } from "vitest";
import { registerProjectTools } from "../src/services/webmcp";
it("registers catalog and staging tools, validates input and unregisters on abort", () => {
  const tools: Parameters<
    NonNullable<Parameters<typeof registerProjectTools>[0]>["registerTool"]
  >[0][] = [];
  const signals: AbortSignal[] = [];
  const stage = vi.fn();
  const cleanup = registerProjectTools(
    {
      registerTool(tool, options) {
        tools.push(tool);
        signals.push(options.signal);
      },
    },
    stage,
  );
  expect(tools.map((t) => t.name)).toEqual([
    "get_diagram_catalog",
    "stage_project",
  ]);
  expect(tools[0].execute({})).toHaveLength(41);
  expect(() =>
    tools[1].execute({ title: "x", abstract: "y", selected: ["unknown"] }),
  ).toThrow();
  expect(stage).not.toHaveBeenCalled();
  expect(
    tools[1].execute({
      title: "Library",
      abstract: "Loans",
      selected: ["architecture"],
    }),
  ).toEqual({
    status: "staged_for_review",
    title: "Library",
    selected: ["architecture"],
  });
  expect(stage).toHaveBeenCalledOnce();
  cleanup();
  expect(signals.every((s) => s.aborted)).toBe(true);
});
