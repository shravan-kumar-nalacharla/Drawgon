import { it, expect } from "vitest";
import {
  factualRequest,
  freshnessPolicy,
  collectGrounding,
} from "../src/services/gemini/freshness";
const project = (abstract: string) => ({
  title: "Diagram",
  abstract,
  details: {},
  techStack: [],
  repositoryUrl: "",
});
it("looks up undated and explicit-year population requests but not UML or supplied values", () => {
  expect(
    factualRequest(
      project(
        "Create a bar chart comparing the population of India and the United States.",
      ),
    ).needed,
  ).toBe(true);
  expect(
    factualRequest(
      project("Compare the population of India and the United States in 2026."),
    ).needed,
  ).toBe(true);
  expect(
    factualRequest(
      project("Create a UML class diagram for an ecommerce application."),
    ).needed,
  ).toBe(false);
  expect(
    factualRequest(project("Population India 1.4 billion; USA 340 million"))
      .needed,
  ).toBe(false);
  const policy = freshnessPolicy(new Date("2026-09-08T00:00:00Z"));
  expect(policy).toContain("2026-09-08");
  expect(policy).toContain("Never relabel historical figures");
  expect(policy).toContain("observation, estimate and projection");
});
it("keeps actual citation metadata and rejects unsafe source links", () => {
  const data = collectGrounding({
    steps: [
      {
        content: [
          {
            annotations: [
              {
                type: "url_citation",
                url: "https://example.org/stats",
                title: "Official statistics",
              },
              { type: "url_citation", url: "javascript:bad()" },
            ],
          },
        ],
      },
      { result: [{ search_suggestions: "<div>Google Search</div>" }] },
    ],
  });
  expect(data.citations).toEqual([
    { url: "https://example.org/stats", title: "Official statistics" },
  ]);
  expect(data.suggestions).toHaveLength(1);
});
