import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import { blueprint } from "../fixtures";
import { defaultSettings } from "../../src/config/settings";
const html = `<!doctype html><html><head><style>:root{--ink:#111111;--paper:#ffffff}body{margin:0;color:var(--ink);background:var(--paper)}svg text{font-family:Arial;font-size:16px;fill:currentColor}.title{font-size:28px;font-weight:600}.bar{fill:rgb(30,90,150)}</style></head><body><svg viewBox="0 0 960 600" role="img" aria-labelledby="t d"><title id="t">Comparison</title><desc id="d">Test values, not factual population data.</desc><defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#ccc"/></pattern></defs><rect width="960" height="600" fill="var(--paper)"/><rect width="100%" height="100%" fill="url(#dots)"/><g data-editor-only="true"><rect x="10" y="10" width="10" height="10"/></g><g id="chart"><g id="axes"><line x1="90" y1="400" x2="850" y2="400" stroke="#999"/></g><g id="bars"><rect class="bar" x="180" y="200" width="160" height="200"/><rect class="bar" x="480" y="240" width="160" height="160"/></g><g id="labels"><text class="title" x="80" y="70">Population Comparison: India vs. United States</text><text x="80" y="470">Country</text><text x="80" y="520">Annotation</text><text x="80" y="560">Source: user-provided test values, 2024 estimates</text></g></g></svg></body></html>`;
test("presentation SVG resolves paints, excludes only decorative grid, preserves vector groups", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async (html) => {
    const p = "/src/services/diagram/safety.ts";
    const m = await import(p);
    return {
      before: m.extractRawSvg(html),
      after: m.extractSvg(html, "white"),
      transparent: m.extractSvg(html, "transparent"),
      dark: m.extractSvg(
        html
          .replace("--paper:#ffffff", "--paper:#181818")
          .replace("--ink:#111111", "--ink:#ffffff"),
      ),
      grouped: m.extractSvg(html.replace('id="chart"', 'id="drawgon-diagram"')),
    };
  }, html);
  expect(result.after).not.toMatch(
    /var\(|currentColor|<style|<pattern|data-editor-only/,
  );
  expect(result.after).toContain('id="drawgon-diagram"');
  expect(result.after).toContain('id="axes"');
  expect(result.after).toContain('fill="rgb(30,90,150)"');
  expect(result.after).toContain('font-weight="600"');
  expect(result.after).toContain('fill="#ffffff"');
  expect(result.after.match(/<line\b/g)).toHaveLength(1);
  expect(result.transparent).not.toContain('id="drawgon-background"');
  expect(result.dark).toContain('fill="rgb(24,24,24)"');
  expect(result.dark).toContain('fill="rgb(255,255,255)"');
  expect(result.grouped.match(/id="drawgon-diagram"/g)).toHaveLength(1);
  const first = await page.evaluate(
    (svg) =>
      new DOMParser()
        .parseFromString(svg, "image/svg+xml")
        .querySelector("#drawgon-diagram")
        ?.firstElementChild?.getAttribute("width"),
    result.grouped,
  );
  expect(first).toBe("960");
  await fs.mkdir("test-results/presentation", { recursive: true });
  await fs.writeFile("test-results/presentation/before.svg", result.before);
  await fs.writeFile("test-results/presentation/after.svg", result.after);
  await page.route("**/check.svg", (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: result.after }),
  );
  await page.goto("/check.svg");
  await page.screenshot({ path: "test-results/presentation/browser.png" });
});
test("local title, label, annotation and font edits survive SVG PNG HTML and undo without network", async ({
  page,
}) => {
  let calls = 0;
  await page.route("https://generativelanguage.googleapis.com/**", (route) => {
    calls++;
    return route.abort();
  });
  const diagram = {
    id: "bar",
    requestedType: "bar",
    canonicalType: "bar",
    title: "Population chart",
    summary: "Test fixture",
    html,
    sanitizedHtml: html,
    validation: { valid: true, errors: [], warnings: [] },
    createdAt: 1,
    revision: 1,
    assumptions: [],
    fidelityNotes: [],
    settings: defaultSettings,
  };
  await page.addInitScript(
    ({ diagram, blueprint, settings }) => {
      if (window.top !== window) return;
      sessionStorage.setItem(
        "project_diagram_ai_gemini_key",
        "test-key-not-sent",
      );
      sessionStorage.setItem(
        "project_diagram_ai_session",
        JSON.stringify({
          project: {
            title: "Population chart",
            abstract: "Test chart",
            repositoryUrl: "",
            details: {},
            techStack: [],
          },
          settings,
          selected: ["bar"],
          diagrams: [diagram],
          blueprint,
        }),
      );
    },
    { diagram, blueprint, settings: defaultSettings },
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Generate Diagrams", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit text & style", exact: true })
    .click();
  await page
    .frameLocator('iframe[title="Editable diagram"]')
    .getByText("Population Comparison: India vs. United States", {
      exact: true,
    })
    .dblclick();
  const field = page.getByLabel("Edit selected text");
  await field.fill("India vs USA Population");
  await field.press("Enter");
  await page.getByLabel("Font family").selectOption("Arial, sans-serif");
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await page.getByLabel("Font size").fill("32");
  await page.getByLabel("Text object").selectOption({ label: "Country" });
  await field.fill("Countries compared");
  await field.press("Enter");
  await page.getByLabel("Text object").selectOption({ label: "Annotation" });
  await field.fill("Local annotation");
  await field.press("Enter");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(field).toHaveValue("Annotation");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(field).toHaveValue("Local annotation");
  await field.fill("Cancelled text");
  await field.press("Escape");
  await expect(field).toHaveValue("Local annotation");
  const output = await page.evaluate(async () => {
    const p = "/src/services/diagram/export.ts";
    const m = await import(p);
    const d = JSON.parse(sessionStorage.getItem("project_diagram_ai_session")!)
      .diagrams[0];
    return {
      svg: await (await m.diagramBlob(d, "svg", 2)).text(),
      presentation: await (await m.diagramBlob(d, "presentation", 2)).text(),
      html: await (await m.diagramBlob(d, "html", 2)).text(),
      png: (await m.diagramBlob(d, "png", 2)).size,
    };
  });
  for (const text of [output.svg, output.presentation, output.html]) {
    expect(text).toContain("India vs USA Population");
    expect(text).toContain("Countries compared");
    expect(text).toContain("Local annotation");
    expect(text).toContain('font-weight="700"');
    expect(text).toContain('font-size="32');
  }
  expect(output.png).toBeGreaterThan(10000);
  expect(calls).toBe(0);
  await page.screenshot({
    path: "test-results/presentation/editor-desktop.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/presentation/editor-mobile.png",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
