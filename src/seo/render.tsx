import { renderToPipeableStream } from "react-dom/server";
import { PassThrough } from 'node:stream';
import App from "../App";
import { guides, pageMetadata } from "../config/seo";
import { BRAND } from "../config/brand";
import { topics } from '../visualizer/topics/registry';
export const routes = [
  "/",
  "/privacy",
  "/open-source",
  '/diagrams',
  '/visualizer',
  '/visualizer/models',
  ...topics.map(t=>`/visualizer/${t.id}`),
  ...guides.map((g) => `/${g.slug}`),
];
export const metadata = pageMetadata;
export const brand = BRAND;
export function renderPage(route: string) {
  return new Promise<string>((resolve,reject)=>{
    const output = new PassThrough();
    let html = '';
    output.on('data', chunk => { html += chunk.toString(); });
    output.on('end',()=>resolve(html));
    output.on('error',reject);
    const stream = renderToPipeableStream(<App initialPath={route} />, {
      onAllReady(){stream.pipe(output);},
      onError:reject,
    });
  });
}
