import { it, expect } from "vitest";
import { applyMonochrome } from "../src/services/diagram/palette";
import { defaultSettings } from "../src/config/settings";
import { guides, pageMetadata } from "../src/config/seo";
it("defaults to black and removes upstream orange from paints without changing text", () => {
  expect(defaultSettings.palette).toBe("Monochrome");
  expect(defaultSettings.accent).toBe("#111111");
  const html = applyMonochrome(
    '<svg><style>.focal{stroke:#eb6c36;fill:rgba(235,108,54,0.08)}</style><rect fill="#eb6c36"/><text>Orange workflow</text></svg>',
  );
  expect(html).not.toContain("#eb6c36");
  expect(html).not.toContain("235,108,54");
  expect(html).toContain("#111111");
  expect(html).toContain("Orange workflow");
});
it("keeps monochrome dark diagrams readable", () =>
  expect(
    applyMonochrome('<svg><path stroke="#eb6c36"/></svg>', true),
  ).toContain("#eeeeee"));
it("has distinct canonical pages and meaningful descriptions for each diagram task", () => {
  expect(guides).toHaveLength(7);
  const titles = guides.map((g) => pageMetadata(`/${g.slug}`).title);
  expect(new Set(titles).size).toBe(7);
  for (const guide of guides) {
    const meta = pageMetadata(`/${guide.slug}`);
    expect(meta.url).toBe(`https://drawgon.in/${guide.slug}`);
    expect(meta.title).toContain("Drawgon");
    expect(guide.checklist.length).toBeGreaterThan(2);
  }
});

it("neutralizes CSS color formats while retaining fragment references", () => {
  const result = applyMonochrome(
    '<svg><path fill="url(#ffa)" stroke="rebeccapurple"/><style>.a{fill:hsl(20 80% 50%);stroke:oklch(60% .2 40)}</style></svg>',
  );
  expect(result).toContain("url(#ffa)");
  expect(result).not.toContain("rebeccapurple");
  expect(result).not.toContain("oklch");
  expect(result).not.toContain("hsl");
});
