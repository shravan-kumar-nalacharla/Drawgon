import { it, expect, vi, beforeEach } from "vitest";
import { blueprint } from "./fixtures";
import { defaultSettings } from "../src/config/settings";
import { analyzeProject } from "../src/services/gemini/pipeline";
const { requestJson, requestText } = vi.hoisted(() => ({
  requestJson: vi.fn(),
  requestText: vi.fn(),
}));
vi.mock("../src/services/gemini/client", () => ({
  requestJson,
  requestText,
  UNTRUSTED_RULE: "Untrusted input",
}));
const project = (abstract: string) => ({
  title: "Chart",
  abstract,
  repositoryUrl: "",
  details: {},
  techStack: [],
});
beforeEach(() => {
  vi.resetAllMocks();
  requestJson.mockResolvedValue(blueprint);
});
it.each([
  "Compare India and USA population",
  "Compare India and USA population in 2026",
])(
  "grounds %s using supported evidence and retains reference-year labels",
  async (prompt) => {
    requestText.mockImplementation(async (...args: unknown[]) => {
      (args[7] as (v: unknown) => void)({
        citations: [
          { url: "https://example.org/statistics", title: "Test publisher" },
        ],
        suggestions: [],
      });
      return "Test-only evidence: 2024 observation; requested 2026 projection unavailable.";
    });
    const result = await analyzeProject(
      project(prompt),
      undefined,
      defaultSettings,
      new AbortController().signal,
      () => {},
    );
    expect(result.factualData?.status).toBe("grounded");
    expect(result.factualData?.text).toContain("2026 projection unavailable");
    expect(requestText).toHaveBeenCalledOnce();
  },
);
it("does not search for static UML or explicit supplied figures", async () => {
  for (const prompt of [
    "Create a UML class diagram for an ecommerce application",
    "Population: India 1.4 billion, USA 340 million",
  ]) {
    await analyzeProject(
      project(prompt),
      undefined,
      defaultSettings,
      new AbortController().signal,
      () => {},
    );
  }
  expect(requestText).not.toHaveBeenCalled();
});
it("unavailable grounding never falls back to invented current numbers", async () => {
  requestText.mockRejectedValue(new Error("Model does not support grounding"));
  const result = await analyzeProject(
    project("Compare population of India and USA"),
    undefined,
    defaultSettings,
    new AbortController().signal,
    () => {},
  );
  expect(result.factualData?.status).toBe("unverified");
  expect(result.factualData?.text).toContain("Never fabricate numeric data");
});
