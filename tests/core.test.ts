import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  parseGithubUrl,
  scoreFile,
  analyzeRepository,
} from "../src/services/github";
import {
  clearEntireSession,
  getGeminiApiKey,
  setGeminiApiKey,
  removeGeminiApiKey,
  saveProjectSession,
  loadProjectSession,
} from "../src/services/session";
import {
  sanitizeDiagram,
  validateDiagram,
  sanitizeCss,
} from "../src/services/diagram/safety";
import { safeFilename, buildZip } from "../src/services/diagram/export";
import { defaultSettings } from "../src/config/settings";
import { validHtml, blueprint } from "./fixtures";
import { diagramTypes } from "../src/config/diagramTypes";
import { safeApiError } from "../src/services/gemini/client";
import JSZip from "jszip";
describe("GitHub context", () => {
  it.each([
    "https://github.com/a/b",
    "https://github.com/a/b/",
    "https://github.com/a/b.git",
  ])("parses %s", (url) =>
    expect(parseGithubUrl(url)).toEqual({
      owner: "a",
      repo: "b",
      treePath: "",
    }),
  );
  it.each([
    "bad",
    "https://evil.com/a/b",
    "http://github.com/a/b",
    "https://github.com/a",
    "https://github.com/a/b/issues",
    "https://github.com.evil.com/a/b",
  ])("rejects %s", (url) => expect(() => parseGithubUrl(url)).toThrow());
  it("keeps tree refs for resolution", () =>
    expect(
      parseGithubUrl("https://github.com/a/b/tree/feature/test/src").treePath,
    ).toBe("feature/test/src"));
  it("prioritizes relevant files and skips secrets, binaries and lockfiles", () => {
    expect(scoreFile("README.md")).toBeGreaterThan(
      scoreFile("src/components/Button.tsx"),
    );
    expect(scoreFile("src/services/auth.ts")).toBeGreaterThan(0);
    for (const p of [
      "node_modules/a.ts",
      "dist/index.js",
      "package-lock.json",
      "a.png",
      ".env",
      ".env.local",
    ])
      expect(scoreFile(p)).toBe(-1);
    expect(scoreFile(".env.example")).toBe(100);
  });
  it("uses default branch and reads only valuable files", async () => {
    const paths: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        paths.push(url);
        return new Response(
          JSON.stringify(
            url.endsWith("/repos/a/b")
              ? {
                  full_name: "a/b",
                  default_branch: "develop",
                  language: "TypeScript",
                }
              : url.includes("/git/trees/")
                ? {
                    truncated: true,
                    tree: [
                      { path: "README.md", type: "blob", sha: "abc", size: 10 },
                      { path: "node_modules/a.js", type: "blob", sha: "bad" },
                    ],
                  }
                : { encoding: "base64", content: btoa("Project readme") },
          ),
          { status: 200 },
        );
      }),
    );
    const result = await analyzeRepository(
      "https://github.com/a/b",
      new AbortController().signal,
      () => {},
    );
    expect(paths[1]).toContain("develop?recursive=1");
    expect(result.files).toEqual(["README.md"]);
    expect(result.warnings).toHaveLength(1);
    expect(result.text).toContain("===== FILE: README.md =====");
    vi.unstubAllGlobals();
  });
});
describe("session privacy", () => {
  beforeEach(() => sessionStorage.clear());
  it("saves and removes key only in sessionStorage", () => {
    setGeminiApiKey("test-session-key");
    expect(getGeminiApiKey()).toBe("test-session-key");
    expect(localStorage.length).toBe(0);
    removeGeminiApiKey();
    expect(getGeminiApiKey()).toBe("");
  });
  it("clears app session while preserving unrelated storage", () => {
    sessionStorage.setItem("unrelated", "keep");
    setGeminiApiKey("test-key");
    saveProjectSession({
      project: {
        title: "x",
        abstract: "y",
        repositoryUrl: "",
        details: {},
        techStack: [],
      },
      settings: defaultSettings,
      selected: ["architecture"],
      diagrams: [],
    });
    expect(loadProjectSession()?.project.title).toBe("x");
    clearEntireSession();
    expect(loadProjectSession()).toBeNull();
    expect(getGeminiApiKey()).toBe("");
    expect(sessionStorage.getItem("unrelated")).toBe("keep");
  });
});
describe("static diagram security", () => {
  it("strips mandatory malicious fixture, preserving SVG", () => {
    const dirty = validHtml
      .replace("<svg ", '<script>alert("bad")</script><svg onclick="steal()" ')
      .replace(
        "</svg>",
        '<foreignObject><iframe src="https://evil.com"></iframe></foreignObject></svg>',
      );
    const result = sanitizeDiagram(dirty);
    expect(result).not.toMatch(/<script|onclick|foreignObject|<iframe/);
    expect(result).toContain("<svg");
    expect(result).toContain("script-src 'none'");
    expect(validateDiagram(result).valid).toBe(true);
  });
  it("blocks CSS exfiltration, escaped URLs and imports", () => {
    const safe = sanitizeCss(
      '@import "https://evil.com"; text{fill:url(https://evil.com/x);color:red;stroke:url(#arrow)}',
    );
    expect(safe).not.toContain("evil.com");
    expect(safe).toContain("stroke:url(#arrow)");
    expect(
      sanitizeCss("background: u\\72l(https://evil.com)", true),
    ).not.toContain("evil.com");
  });
  it("rejects scripts, missing SVG, viewBox and desc", () => {
    expect(validateDiagram("<div/>").valid).toBe(false);
    expect(
      validateDiagram(
        validHtml.replace('viewBox="0 0 960 600"', ""),
      ).errors.join(),
    ).toContain("viewBox");
    expect(
      validateDiagram(validHtml.replace(/<desc.*?<\/desc>/, "")).errors.join(),
    ).toContain("desc");
    expect(validateDiagram("<script>bad()</script>" + validHtml).valid).toBe(
      false,
    );
  });
  it("preserves accessible valid SVG with XML namespace, CSS and markers", async () => {
    // JSDOM has no SVG computed-style engine. Browser tests cover presentation normalization.
    const { extractRawSvg } = await import("../src/services/diagram/safety");
    const svg = extractRawSvg(validHtml);
    const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(parsed.querySelector("parsererror")).toBeNull();
    expect(parsed.documentElement.getAttribute("xmlns")).toBe(
      "http://www.w3.org/2000/svg",
    );
    expect(parsed.documentElement.getAttribute("viewBox")).toBe("0 0 960 600");
    expect(parsed.querySelector("desc")?.textContent).toContain("Reader");
    expect(svg).toContain('marker-end="url(#arrow)"');
    expect(validateDiagram(validHtml, defaultSettings).valid).toBe(true);
  });
  it("does not expose credential-shaped SDK errors", () => {
    expect(
      safeApiError({ status: 403, message: "test-secret-key" }),
    ).not.toContain("test-secret");
    expect(safeApiError({ status: 429 })).toContain("rate limit");
  });
});
describe("exports and catalog", () => {
  it("creates safe predictable filenames", () => {
    expect(safeFilename("../../My Project: Café!")).toBe("my-project-cafe");
    expect(safeFilename("///")).toBe("diagram");
  });
  it("retains 39 canonical types and two aliases", () => {
    expect(new Set(diagramTypes.map((t) => t.canonicalType)).size).toBe(39);
    expect(diagramTypes).toHaveLength(41);
  });
  it("ZIP contains individual format folders, project summary and licenses but no key", async () => {
    setGeminiApiKey("secret-never-export");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("MIT copyright license")),
    );
    const blob = await buildZip(
      [
        {
          id: "architecture",
          requestedType: "architecture",
          canonicalType: "architecture",
          title: "Library Architecture",
          summary: "Library",
          html: validHtml,
          sanitizedHtml: sanitizeDiagram(validHtml),
          validation: validateDiagram(validHtml),
          createdAt: 0,
          revision: 1,
          assumptions: [],
          fidelityNotes: [],
        },
      ],
      blueprint,
      defaultSettings,
      "svg",
      () => {},
    );
    const bytes = await new Promise<ArrayBuffer>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as ArrayBuffer);
      r.readAsArrayBuffer(blob);
    });
    const zip = await JSZip.loadAsync(bytes);
    expect(Object.keys(zip.files)).toContain(
      "library-system-diagrams/svg/architecture.svg",
    );
    expect(Object.keys(zip.files)).toContain(
      "library-system-diagrams/licenses/DIAGRAM-DESIGN-LICENSE.txt",
    );
    for (const file of Object.values(zip.files))
      if (!file.dir)
        expect(await file.async("string")).not.toContain("secret-never-export");
    vi.unstubAllGlobals();
  });
});
