import { test, expect, type Page } from "@playwright/test";
import { blueprint, validHtml } from "../fixtures";
import fs from "node:fs/promises";
import JSZip from "jszip";
async function mockGemini(page: Page, malicious = false) {
  let repairs = 0;
  const requests: Record<string, unknown>[] = [];
  await page.route(
    "https://generativelanguage.googleapis.com/**",
    async (route) => {
      const body = route.request().postDataJSON();
      requests.push(body);
      expect(body.store).toBe(false);
      expect(route.request().url()).not.toContain("test-key");
      const schema = body.response_format?.schema;
      let value: unknown = "OK";
      if (schema?.properties?.components) value = blueprint;
      else if (schema?.properties?.focus)
        value = {
          title: "Library Architecture",
          focus: "Borrowing",
          nodes: ["Reader", "Catalog"],
          relationships: ["Reader uses Catalog"],
          layout: "Left to right",
          omissions: [],
          assumptions: [],
        };
      else if (schema?.properties?.html) {
        const repairing = String(body.input).includes("Repair this diagram");
        if (repairing) repairs++;
        value = {
          displayName: "Architecture",
          canonicalType: "architecture",
          title: "Library Architecture",
          summary: "Reader and catalog.",
          html:
            malicious && !repairing
              ? validHtml.replace(
                  "<svg ",
                  '<script>alert("bad")</script><svg onclick="steal()" ',
                )
              : validHtml,
          assumptions: [],
          fidelityNotes: [],
        };
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "mock-interaction",
          status: "completed",
          steps: [
            {
              type: "model_output",
              content: [
                {
                  type: "text",
                  text:
                    typeof value === "string" ? value : JSON.stringify(value),
                },
              ],
            },
          ],
        }),
      });
    },
  );
  return {
    requests,
    get repairs() {
      return repairs;
    },
  };
}
async function wizard(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Generate Diagrams", exact: true })
    .click();
  await page
    .getByLabel("Gemini API key", { exact: true })
    .fill("test-key-for-ci-only");
  await page.getByRole("button", { name: "Validate Key", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Gemini connected");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Project title", { exact: true })
    .fill("Library System");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Project Abstract", { exact: true })
    .fill(
      "Readers browse a catalog and borrow books. Librarians manage books and loans.",
    );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Skip for now", exact: true }).click();
  await page.getByLabel("Add technology").fill("React");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: /Flowchart/ }).click();
  await page
    .getByRole("button", { name: "Review project", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate Diagrams", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Library Architecture", exact: true }),
  ).toBeVisible();
}
test("complete wizard, real SDK wire contract, repair, previews, downloads, refinement and clear session", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const mocked = await mockGemini(page, true);
  await wizard(page);
  expect(mocked.repairs).toBe(1);
  await expect(page.locator(".diagram-frame")).toHaveAttribute("sandbox", "");
  await expect(
    page.frameLocator(".diagram-frame").getByText("Catalog", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/workspace-desktop.png",
    fullPage: true,
  });
  await page.locator(".download-menu summary").click();
  const svgDownload = page.waitForEvent("download");
  await page
    .locator(".download-menu")
    .getByRole("button", { name: "SVG", exact: true })
    .click();
  const svg = await svgDownload;
  expect(svg.suggestedFilename()).toBe("library-system-architecture.svg");
  const svgPath = await svg.path();
  expect(await fs.readFile(svgPath!, "utf8")).toContain(
    'xmlns="http://www.w3.org/2000/svg"',
  );
  const pngDownload = page.waitForEvent("download");
  await page
    .locator(".download-menu")
    .getByRole("button", { name: "PNG", exact: true })
    .click();
  const png = await pngDownload;
  const pngBytes = await fs.readFile((await png.path())!);
  expect(pngBytes.readUInt32BE(16)).toBe(1920);
  expect(pngBytes.readUInt32BE(20)).toBe(1200);
  const zipDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download All", exact: true }).click();
  const zip = await JSZip.loadAsync(
    await fs.readFile((await (await zipDownload).path())!),
  );
  for (const ext of ["html", "svg", "png"])
    expect(
      zip.file(`library-system-diagrams/${ext}/architecture.${ext}`),
    ).toBeTruthy();
  expect(zip.file("library-system-diagrams/presentation/architecture.svg")).toBeTruthy();
  expect(
    await zip
      .file("library-system-diagrams/project-summary.json")!
      .async("string"),
  ).not.toContain("test-key");
  await page
    .getByRole("button", { name: "View Library Architecture", exact: true })
    .click();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.getByText("125%", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Refine", exact: true }).click();
  await page
    .getByLabel("What would you like to change?")
    .fill("Make the catalog more prominent.");
  await page.getByRole("button", { name: "Apply & regenerate" }).click();
  await expect(page.getByText("v2", { exact: true })).toBeVisible();
  expect(
    mocked.requests.filter((r) =>
      JSON.stringify(r.response_format ?? {}).includes("componentGlossary"),
    ),
  ).toHaveLength(1);
  await page.getByRole("tab", { name: "Project Understanding" }).click();
  await expect(page.getByText("What Gemini understood")).toBeVisible();
  await page
    .getByRole("button", { name: "Clear Session", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Clear Session", exact: true })
    .click();
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("project_diagram_ai_gemini_key"),
    ),
  ).toBeNull();
  expect(errors).toEqual([]);
});
test("mobile wizard fits viewport, required fields and privacy route", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockGemini(page);
  await page.goto("/");
  await page.screenshot({
    path: "test-results/landing-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await wizard(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/workspace-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Privacy", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your privacy." }),
  ).toBeVisible();
});
test("landing examples load and legal attribution is available", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your project. Clearly drawn." }),
  ).toBeVisible();
  await expect(page.locator(".hero-art img")).toBeVisible();
  await page.screenshot({
    path: "test-results/landing-desktop.png",
    fullPage: true,
  });
  await page.goto("/open-source");
  await expect(
    page.getByText("Copyright (c) 2025 Cathryn Lavery", { exact: false }),
  ).toBeVisible();
});
