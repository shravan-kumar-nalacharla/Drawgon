import { test, expect } from "@playwright/test";
import { topics } from "../../src/visualizer/topics/registry";
test('dark lab exports readable white SVG and integer dimensions stay valid',async({page})=>{await page.goto('/visualizer/convolution');await page.getByRole('button',{name:'Dark theme'}).click();await page.getByLabel('Background',{exact:true}).selectOption('White');await page.getByRole('spinbutton',{name:'Stride value',exact:true}).fill('1.5');await expect(page.getByRole('spinbutton',{name:'Stride value',exact:true})).toHaveValue('2');const event=page.waitForEvent('download');await page.getByRole('button',{name:'Download SVG',exact:true}).click();const file=await event,stream=await file.createReadStream(),chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(chunk);const svg=Buffer.concat(chunks).toString();expect(svg).toContain('fill="white"');expect(svg).toContain('#22282d');expect(svg).not.toContain('fill="rgb(239, 238, 232)"');});
test("production visualizer is prerendered and does not load analytics", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("http://127.0.0.1:4173/visualizer/neuron");
  await expect(
    page.getByRole("heading", { name: "Artificial Neuron", exact: true }),
  ).toBeVisible();
  expect(
    requests.filter((u) =>
      /google-analytics|googletagmanager|generativelanguage/.test(u),
    ),
  ).toEqual([]);
});
test("shared neuron state restores and model configurations stay local", async ({
  page,
}) => {
  const state = {
    version: 1,
    topic: "neuron",
    x: [1, 0, 0],
    w: [2, 0, 0],
    b: 0,
    act: "Linear",
    step: 0,
  };
  await page.goto(
    "/visualizer/neuron#" +
      new URLSearchParams({ experiment: JSON.stringify(state) }),
  );
  await expect(page.locator(".vl-formula output")).toHaveText("Output = 2");
  await page.goto("/visualizer/models");
  await page.locator("input[type=file]").setInputFiles({
    name: "model.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        class_name: "Sequential",
        config: {
          name: "Local test",
          layers: [
            {
              class_name: "InputLayer",
              config: { name: "input", batch_shape: [null, 2] },
            },
            { class_name: "Dense", config: { name: "output", units: 1 } },
          ],
        },
      }),
    ),
  });
  await expect(
    page.getByRole("img", { name: "Local test · operator graph" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Inspect layer output" }).click();
  await expect(page.locator(".vl-inspector")).toContainText("Inputs: input");
});
test("visualizer opens without a key and search resolves aliases", async ({
  page,
}) => {
  await page.goto("/visualizer");
  await expect(
    page.getByRole("heading", { name: "Change the inputs." }),
  ).toBeVisible();
  await page.getByRole("searchbox").fill("forget gate");
  await expect(page.getByRole("link", { name: /LSTM/ }).last()).toBeVisible();
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("project_diagram_ai_gemini_key"),
    ),
  ).toBeNull();
});
test("all topic modules render without browser errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const topic of topics) {
    await page.goto(`/visualizer/${topic.id}`);
    await expect(page.locator("h1")).toHaveText(topic.title);
    await expect(page.locator("svg[data-export]").first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test("neuron controls change output and SVG/PNG downloads contain data", async ({
  page,
}) => {
  await page.goto("/visualizer/neuron");
  const output = page.locator(".vl-formula output"),
    before = await output.textContent();
  await page
    .getByRole("spinbutton", { name: "Weight 1 value", exact: true })
    .fill("2");
  await expect(output).not.toHaveText(before!);
  for (const format of ["SVG", "PNG"]) {
    const event = page.waitForEvent("download");
    await page
      .getByRole("button", { name: `Download ${format}`, exact: true })
      .click();
    const download = await event;
    expect(download.suggestedFilename()).toMatch(
      new RegExp(`\\.${format.toLowerCase()}$`),
    );
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(chunk);
    const data = Buffer.concat(chunks);
    expect(data.length).toBeGreaterThan(200);
    if (format === "SVG") {
      expect(data.toString()).toContain("viewBox");
      expect(data.toString()).toContain("Artificial Neuron");
      expect(data.toString()).not.toContain("<image");
    }
  }
});
test("convolution, backprop, clustering and LSTM steps update real state", async ({
  page,
}) => {
  await page.goto("/visualizer/convolution");
  const before = await page.locator(".vl-formula output").first().textContent();
  await page
    .getByRole("spinbutton", { name: "Kernel row 1 column 3", exact: true })
    .fill("4");
  await expect(page.locator(".vl-formula output").first()).not.toHaveText(
    before!,
  );
  await page
    .getByRole("spinbutton", { name: "Stride value", exact: true })
    .fill("2");
  await expect(page.locator(".vl-formula output").last()).toContainText("= 2");
  await page.goto("/visualizer/backprop");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Hidden weighted sums and activations" }),
  ).toBeVisible();
  await page.goto("/visualizer/kmeans");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator(".vl-formula output")).toContainText(
    "Next: move centers",
  );
  await page.goto("/visualizer/lstm");
  await page.getByRole("button", { name: "Next timestep" }).click();
  await expect(page.getByText("Step 1 / 4", { exact: true })).toBeVisible();
});
test("worker training runs and stays independent of Gemini", async ({
  page,
}) => {
  const api: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("generativelanguage")) api.push(r.url());
  });
  await page.goto("/visualizer/mlp");
  await page.getByRole("button", { name: "Train step", exact: true }).click();
  await expect(page.getByText("Epoch 1 / 2000", { exact: true })).toBeVisible();
  expect(api).toEqual([]);
});
for (const width of [1440, 820, 390])
  test(`fundamental labs fit ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/visualizer/lstm");
    await expect(page.locator("svg[data-export]").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Dark theme" }).click();
    await expect(page.locator(".visualizer")).toHaveClass(/vl-dark/);
  });
