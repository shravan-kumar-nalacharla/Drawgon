import fs from "node:fs/promises";
import path from "node:path";
import { createServer } from "vite";
import { JSDOM } from "jsdom";

// Build-time only. Vercel serves the resulting HTML and assets without a server.
const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.DOMParser = dom.window.DOMParser;
globalThis.XMLSerializer = dom.window.XMLSerializer;
const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { renderPage, routes, metadata, brand } = await vite.ssrLoadModule(
    "/src/seo/render.tsx",
  );
  const { extractRawSvg: extractSvg } = await vite.ssrLoadModule(
    "/src/services/diagram/safety.ts",
  );
  const { applyMonochrome } = await vite.ssrLoadModule(
    "/src/services/diagram/palette.ts",
  );
  await fs.mkdir("dist/examples", { recursive: true });
  for (const type of [
    "architecture",
    "uml-class",
    "data-flow",
    "deployment",
    "sequence",
    "db-schema",
    "flowchart",
    "er",
  ]) {
    const source = await fs.readFile(
      `public/diagram-design/assets/example-${type}.html`,
      "utf8",
    );
    await fs.writeFile(
      `dist/examples/${type}.svg`,
      extractSvg(applyMonochrome(source)),
    );
  }
  const template = await fs.readFile("dist/index.html", "utf8");
  const escape = (value) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  for (const route of routes) {
    const meta = metadata(route);
    const structured = [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: brand.name,
        alternateName: "drawgon.in",
        url: brand.url,
      },
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: brand.name,
        url: brand.url,
        applicationCategory: "DesignApplication",
        operatingSystem: "Any modern web browser",
        description: meta.description,
        browserRequirements:
          route.startsWith('/visualizer') ? 'Requires JavaScript; simulations run locally without an API key' : "Requires JavaScript and a user-supplied Gemini API key for diagram generation",
        featureList: [
          "Architecture diagrams",
          "UML class and sequence diagrams",
          "Entity relationship diagrams",
          "Flowcharts",
          "Public GitHub context",
          "SVG, PNG and HTML export",
        ],
      },
    ];
    const html = template
      .replace(/<title>.*?<\/title>/s, `<title>${escape(meta.title)}</title>`)
      .replace(
        /<meta\s+name="description"[\s\S]*?\/>/,
        `<meta name="description" content="${escape(meta.description)}"/>`,
      )
      .replace(
        /<meta\s+property="og:title"[\s\S]*?\/>/,
        `<meta property="og:title" content="${escape(meta.title)}"/>`,
      )
      .replace(
        /<meta\s+property="og:description"[\s\S]*?\/>/,
        `<meta property="og:description" content="${escape(meta.description)}"/>`,
      )
      .replace(
        "</head>",
        `<link rel="canonical" href="${meta.url}"/><meta property="og:url" content="${meta.url}"/><meta property="og:site_name" content="Drawgon"/><meta name="twitter:card" content="summary"/><meta name="twitter:title" content="${escape(meta.title)}"/><meta name="twitter:description" content="${escape(meta.description)}"/><script type="application/ld+json">${JSON.stringify(structured).replace(/</g, "\\u003c")}</script></head>`,
      )
      .replace(
        '<div id="root"></div>',
        `<div id="root">${await renderPage(route)}</div>`,
      )
      .replaceAll("./assets/", "/assets/")
      .replaceAll("./drawgon-logo.png", "/drawgon-logo.png");
    const destination =
      route === "/" ? "dist/index.html" : `dist/${route.slice(1)}.html`;
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, html);
  }
  await fs.writeFile(
    "dist/sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((route) => `<url><loc>${brand.url}${route}</loc></url>`).join("")}</urlset>`,
  );
  await fs.writeFile(
    "dist/robots.txt",
    `User-agent: *\nAllow: /\nDisallow: /diagram-design/\nSitemap: ${brand.url}/sitemap.xml\n`,
  );
  console.log(`Pre-rendered ${routes.length} routes for ${brand.url}.`);
} finally {
  await vite.close();
  dom.window.close();
}
