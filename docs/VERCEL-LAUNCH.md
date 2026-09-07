# Launch Drawgon on Vercel

The app is configured for **https://drawgon.in**. The repository is ready to import; no backend, database, serverless function or deployed Gemini key is needed.

1. Import this application's repository into Vercel. Keep the project root as the repository root.
2. Use Node.js 24, install command `npm ci`, build command `npm run build`, output directory `dist`. The included `vercel.json` enables clean URLs, trailing-slash normalization and strict security headers.
3. Deploy. Check the Vercel preview before attaching the production domain. Connect a real Gemini API key locally in your browser to verify live generation; automated tests intentionally use mocks.
4. Add `drawgon.in` in the Vercel project's Domains settings. Add `www.drawgon.in` if desired and redirect it to the apex domain. Use the exact DNS records Vercel displays at your domain registrar; do not guess records or replace unrelated mail records. Wait for Vercel's domain and HTTPS checks to pass.
5. Verify the production home page, `/architecture-diagram-maker`, `/uml-diagram-maker`, `/privacy`, `/open-source`, `/robots.txt` and `/sitemap.xml`.

## Search launch

The build pre-renders the homepage, seven useful diagram/student guide pages, privacy and licensing pages. Each route has a unique title, description and canonical URL. Website/application structured data identifies Drawgon without invented ratings, usage statistics or reviews. The sitemap contains these ten canonical pages; raw upstream reference pages are excluded from crawling.

After the domain is live:

- Verify ownership of `drawgon.in` in Google Search Console using the DNS verification value provided there.
- Submit `https://drawgon.in/sitemap.xml` and inspect the homepage and important guide URLs.
- Keep only `drawgon.in` as the preferred canonical domain. Do not independently index duplicate Vercel preview domains.
- Publish actual example walkthroughs and link Drawgon from relevant project documentation, student resources and your own profiles. Avoid paid link schemes, copied competitor text and keyword stuffing.
- Review Search Console query, indexing and performance reports after Google has had time to crawl. Improve pages based on real student questions and useful examples.

SEO makes the site crawlable and relevant; it cannot promise first-place rankings for “drawgon”, “architecture diagram maker” or “UML diagram maker”. A newly registered domain still needs discovery, indexing, useful content and legitimate references from other sites.

## Verification before launch

```sh
npm ci
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

Built assets are static. `scripts/prerender.mjs` runs only during the build; Vercel does not run it for visitors. Project data and Gemini keys are never included in pre-rendered pages. No deployment has been performed by the local build itself.

References: [Vercel custom domains](https://vercel.com/docs/domains/working-with-domains/add-a-domain), [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [Google site names](https://developers.google.com/search/docs/appearance/site-names).
