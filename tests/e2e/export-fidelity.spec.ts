import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
test("five upstream types export visible SVG and 2x PNG with correct dimensions", async ({
  page,
}) => {
  await page.goto("/");
  for (const type of [
    "architecture",
    "flowchart",
    "uml-class",
    "er",
    "sequence",
  ]) {
    const result = await page.evaluate(async (type) => {
      // Test the same browser export implementation against licensed, diverse upstream fixtures.
      const servicePath = "/src/services/diagram";
      const safety = await import(`${servicePath}/safety.ts`);
      const exporter = await import(`${servicePath}/export.ts`);
      const palette = await import(`${servicePath}/palette.ts`);
      const original = await (
        await fetch(`/diagram-design/assets/example-${type}.html`)
      ).text();
      const html = palette.applyMonochrome(safety.sanitizeDiagram(original));
      const svg = safety.extractSvg(html);
      const png = await exporter.exportPng(html, 2);
      const bytes = new Uint8Array(await png.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return { svg, png: btoa(binary) };
    }, type);
    const png = Buffer.from(result.png, "base64");
    expect(png.length).toBeGreaterThan(10000);
    const viewBox = result.svg
      .match(/viewBox="([^"]+)"/)![1]
      .split(/\s+/)
      .map(Number);
    expect(png.readUInt32BE(16)).toBe(viewBox[2] * 2);
    expect(png.readUInt32BE(20)).toBe(viewBox[3] * 2);
    const dir = path.join("test-results", "export-fidelity");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${type}.svg`), result.svg);
    await fs.writeFile(path.join(dir, `${type}.png`), png);
    await page.route(`**/verify-${type}.png`, (route) =>
      route.fulfill({ contentType: "image/png", body: png }),
    );
    await page.goto(`/verify-${type}.png`);
    await expect(page.locator("img")).toBeVisible();
    await page.goto("/");
  }
});
