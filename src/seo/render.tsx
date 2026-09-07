import { renderToString } from "react-dom/server";
import App from "../App";
import { guides, pageMetadata } from "../config/seo";
import { BRAND } from "../config/brand";
export const routes = [
  "/",
  "/privacy",
  "/open-source",
  ...guides.map((g) => `/${g.slug}`),
];
export const metadata = pageMetadata;
export const brand = BRAND;
export function renderPage(route: string) {
  return renderToString(<App initialPath={route} />);
}
