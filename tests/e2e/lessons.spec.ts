import { test, expect } from "@playwright/test";

test("lesson constructs values, pauses, seeks and preserves parameters between modes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/visualizer/neuron");
  await expect(
    page.getByRole("tab", { name: "Learn", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const stage = page.locator(".vl-lesson-stage"),
    before = await stage.innerHTML();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => stage.getAttribute("data-progress")).not.toBe("0");
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const paused = await stage.innerHTML();
  expect(paused).not.toBe(before);
  await page.waitForTimeout(300);
  expect(await stage.innerHTML()).toBe(paused);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(stage).toHaveAttribute("data-scene", "1");
  await page.getByRole("tab", { name: "Playground", exact: true }).click();
  const old = await page.locator(".vl-formula output").textContent();
  await page
    .getByRole("spinbutton", { name: "Weight 1 value", exact: true })
    .fill("2");
  await expect(page.locator(".vl-formula output")).not.toHaveText(old!);
  const output = await page.locator(".vl-formula output").textContent();
  await page.getByRole("tab", { name: "Math", exact: true }).click();
  await expect(page.locator(".vl-math")).toContainText(output!);
  await page.getByRole("tab", { name: "Playground", exact: true }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Weight 1 value", exact: true }),
  ).toHaveValue("2");
  expect(errors).toEqual([]);
});

test("convolution moves the kernel and exports the current animation frame", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/visualizer/convolution");
  await page
    .getByRole("button", {
      name: "Seek to Cover the first window",
      exact: true,
    })
    .click();
  const kernel = page.locator("[data-kernel]"),
    before = await kernel.getAttribute("transform");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => kernel.getAttribute("transform")).not.toBe(before);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  for (const format of ["SVG", "PNG"]) {
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: `Download ${format}`, exact: true })
      .click();
    expect((await download).suggestedFilename()).toMatch(
      new RegExp(`\\.${format.toLowerCase()}$`),
    );
  }
});

for (const topic of [
  "neuron",
  "forward",
  "gradient-descent",
  "backprop",
  "convolution",
  "lstm",
  "rnn",
  "gru",
  "bptt",
]) {
  test(`${topic} timeline completes and all scenes are seekable`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/visualizer/${topic}`);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const timeline = page.getByRole("slider", {
      name: "Lesson progress",
      exact: true,
    });
    await timeline.focus();
    await timeline.press("End");
    await expect(
      page.getByRole("heading", { name: "✓ Concept completed" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Restart lesson", exact: true })
      .click();
    await expect(timeline).toHaveValue("0");
    for (const tick of await page.locator(".vl-scene-ticks button").all()) {
      await tick.click();
      await expect(page.locator("svg[data-export]")).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}
for (const width of [390, 820, 1440])
  test(`Learn layout and reduced motion fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/visualizer/backprop");
    await expect(
      page.getByRole("checkbox", { name: "Reduce motion" }),
    ).toBeChecked();
    await page
      .getByRole("button", {
        name: "Seek to Branch into hidden gradients",
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: "Dark theme" }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await expect(page.locator(".vl-legend .vl-current").first()).toBeVisible();
    await page
      .getByRole("button", { name: "Restart lesson", exact: true })
      .click();
    await expect(page.locator(".vl-lesson-stage")).toHaveAttribute(
      "data-scene",
      "0",
    );
  });
