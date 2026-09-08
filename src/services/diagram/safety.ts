import DOMPurify from "dompurify";
import * as css from "css-tree";
import { canvases, type Settings } from "../../config/settings";
import type { ValidationResult } from "../../types";
import { normalizeSvg, type ExportBackground } from "./presentation";
export const PREVIEW_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; script-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'";
const tags = [
  "html",
  "head",
  "body",
  "meta",
  "title",
  "style",
  "main",
  "section",
  "header",
  "footer",
  "div",
  "p",
  "span",
  "h1",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "small",
  "br",
  "svg",
  "g",
  "rect",
  "line",
  "path",
  "polyline",
  "polygon",
  "circle",
  "ellipse",
  "text",
  "tspan",
  "defs",
  "marker",
  "clipPath",
  "pattern",
  "desc",
  "use",
];
const allowedProperties = new Set(
  "color background background-color fill fill-opacity stroke stroke-width stroke-opacity stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin opacity font font-family font-size font-weight font-style font-variant letter-spacing text-anchor dominant-baseline alignment-baseline text-transform text-decoration white-space line-height display visibility width height max-width min-width max-height margin margin-top margin-bottom margin-left margin-right padding padding-top padding-bottom padding-left padding-right border border-top border-bottom border-color border-width border-style border-radius box-sizing overflow overflow-x overflow-y text-align gap grid-template-columns align-items justify-content flex flex-direction flex-wrap clip-path marker marker-start marker-mid marker-end stop-color stop-opacity vector-effect paint-order".split(
    " ",
  ),
);
export function sanitizeCss(source: string, inline = false) {
  try {
    const ast = css.parse(source, {
      context: inline ? "declarationList" : "stylesheet",
    });
    css.walk(ast, {
      enter(
        node: css.CssNode,
        item: css.ListItem<css.CssNode>,
        list: css.List<css.CssNode>,
      ) {
        if (node.type === "Atrule" || node.type === "Raw") {
          if (item && list) list.remove(item);
          return;
        }
        if (node.type === "Declaration") {
          let safe =
            allowedProperties.has(node.property.toLowerCase()) ||
            /^--[\w-]+$/.test(node.property);
          const value = css.generate(node.value);
          if (
            /[\\<>]|expression|javascript|image-set|paint\(|attr\(/i.test(value)
          )
            safe = false;
          css.walk(node.value, (child) => {
            if (child.type === "Url" && !/^#[\w-]+$/.test(child.value))
              safe = false;
          });
          if (!safe && item && list) list.remove(item);
        }
      },
    });
    return css.generate(ast);
  } catch {
    return "";
  }
}
export function sanitizeDiagram(html: string): string {
  if (html.length > 500_000)
    throw new Error("Diagram exceeded the safe document size.");
  const clean = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    ALLOWED_TAGS: tags,
    ADD_ATTR: [
      "viewBox",
      "role",
      "aria-labelledby",
      "aria-describedby",
      "xmlns",
      "data-editor-only",
      "data-text-id",
      "data-role",
    ],
    FORBID_TAGS: [
      "script",
      "iframe",
      "object",
      "embed",
      "form",
      "foreignObject",
      "image",
      "a",
      "animate",
      "animateTransform",
      "set",
    ],
    FORBID_ATTR: ["src", "srcset", "action", "formaction", "target"],
    ALLOW_DATA_ATTR: false,
  });
  const doc = new DOMParser().parseFromString(clean, "text/html");
  doc.querySelectorAll("meta,link,base").forEach((el) => el.remove());
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of [...el.attributes]) {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
      else if (attr.name === "style")
        el.setAttribute("style", sanitizeCss(attr.value, true));
      else if (/href$/i.test(attr.name) && !/^#[\w-]+$/.test(attr.value))
        el.removeAttribute(attr.name);
      else if (
        /[\\]|url\s*\(/i.test(attr.value) &&
        !/^url\(\s*['"]?#[\w-]+['"]?\s*\)$/.test(attr.value)
      )
        el.removeAttribute(attr.name);
    }
  });
  doc.querySelectorAll("style").forEach((el) => {
    el.textContent = sanitizeCss(el.textContent || "");
  });
  const policy = doc.createElement("meta");
  policy.httpEquiv = "Content-Security-Policy";
  policy.content = PREVIEW_CSP;
  doc.head.prepend(policy);
  const charset = doc.createElement("meta");
  charset.setAttribute("charset", "utf-8");
  doc.head.prepend(charset);
  const viewport = doc.createElement("meta");
  viewport.name = "viewport";
  viewport.content = "width=device-width, initial-scale=1";
  doc.head.append(viewport);
  const fit = doc.createElement("style");
  fit.textContent =
    "svg{max-width:100%!important;min-width:0!important;height:auto!important}";
  doc.head.append(fit);
  return "<!doctype html>\n" + doc.documentElement.outerHTML;
}
export function validateDiagram(
  html: string,
  settings?: Settings,
): ValidationResult {
  const errors: string[] = [],
    warnings: string[] = [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (
    doc.querySelector(
      "script,iframe,object,embed,form,foreignObject,animate,animateTransform,set,image,link,base",
    )
  )
    errors.push("Remove active content and external embeds.");
  for (const el of doc.querySelectorAll("*"))
    for (const attr of el.attributes) {
      if (/^on/i.test(attr.name)) errors.push("Remove event handlers.");
      if (/href$/i.test(attr.name) && !/^#[\w-]+$/.test(attr.value))
        errors.push("Remove external links.");
    }
  for (const el of doc.querySelectorAll("style,[style]")) {
    const value =
      el.tagName.toLowerCase() === "style"
        ? el.textContent || ""
        : el.getAttribute("style") || "";
    if (
      /@import|@font-face|expression|javascript|url\(\s*['"]?(?!#)/i.test(value)
    )
      errors.push("Remove external or unsafe CSS resources.");
  }
  if (html.includes("```")) errors.push("Remove markdown fences.");
  if (
    /\b(lorem ipsum|placeholder|your title here)\b/i.test(
      doc.body.textContent || "",
    )
  )
    errors.push("Replace placeholder content.");
  const svgs = doc.querySelectorAll("svg");
  if (svgs.length !== 1) errors.push("Exactly one primary SVG is required.");
  const svg = svgs[0];
  if (svg) {
    const viewBox = (svg.getAttribute("viewBox") || "")
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (
      viewBox.length !== 4 ||
      viewBox.some((n) => !Number.isFinite(n)) ||
      viewBox[2] <= 0 ||
      viewBox[3] <= 0 ||
      viewBox[2] > 8192 ||
      viewBox[3] > 8192
    )
      errors.push("SVG needs a valid positive viewBox, maximum 8192 per side.");
    if (settings && canvases[settings.canvas]) {
      const [w, h] = canvases[settings.canvas]!;
      if (viewBox.join(" ") !== `0 0 ${w} ${h}`)
        errors.push(`Expected viewBox 0 0 ${w} ${h}.`);
    }
    const title = svg.querySelector("title"),
      desc = svg.querySelector("desc");
    if (!title?.textContent?.trim()) errors.push("SVG needs a nonempty title.");
    if (!desc?.textContent?.trim()) errors.push("SVG needs a nonempty desc.");
    if (svg.getAttribute("role") !== "img")
      errors.push('SVG needs role="img".');
    const labels = (svg.getAttribute("aria-labelledby") || "").split(/\s+/);
    if (
      !title?.id ||
      !desc?.id ||
      !labels.includes(title.id) ||
      !labels.includes(desc.id) ||
      labels.some((id) => !id || !svg.querySelector(`[id="${CSS.escape(id)}"]`))
    )
      errors.push(
        "aria-labelledby must resolve to the SVG title and desc IDs.",
      );
    if (svg.firstElementChild?.tagName.toLowerCase() !== "title")
      errors.push("SVG title must be the first child.");
    if (svg.querySelector("filter")) errors.push("Remove shadow/glow filters.");
    if (!svg.querySelector("text,path,rect,circle,line,polygon"))
      errors.push("SVG has no diagram content.");
    for (const text of svg.querySelectorAll("text")) {
      const size = parseFloat(text.getAttribute("font-size") || "");
      if (size && size < 8) warnings.push("Some text is smaller than 8px.");
    }
    if (svg.querySelectorAll("g[data-node],g.node").length > 12)
      warnings.push("High node density. Consider a simpler view.");
    for (const rect of svg.querySelectorAll("rect")) {
      if (rect.closest("defs") || rect.hasAttribute("transform")) continue;
      const x = Number(rect.getAttribute("x") || 0),
        y = Number(rect.getAttribute("y") || 0),
        w = Number(rect.getAttribute("width")),
        h = Number(rect.getAttribute("height"));
      if (
        Number.isFinite(w) &&
        Number.isFinite(h) &&
        (x < viewBox[0] ||
          y < viewBox[1] ||
          x + w > viewBox[0] + viewBox[2] + 1 ||
          y + h > viewBox[1] + viewBox[3] + 1)
      )
        warnings.push("A rectangle may extend beyond the canvas.");
    }
  }
  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
  };
}
export function extractSvg(html: string, background: ExportBackground = "diagram") {
  return normalizeSvg(sanitizeDiagram(html), background);
}
export function extractRawSvg(html: string) {
  const doc = new DOMParser().parseFromString(
    sanitizeDiagram(html),
    "text/html",
  );
  const svg = doc.querySelector("svg");
  if (!svg) throw new Error("No SVG found.");
  // Carry wrapper CSS into standalone SVG too; generated diagrams are prompted to keep SVG styles internal.
  const styles = [...doc.querySelectorAll("style")]
    .filter((s) => !svg.contains(s))
    .map((s) => s.textContent)
    .join("\n");
  if (styles) {
    const style = doc.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = styles;
    svg.append(style);
  }
  svg.setAttributeNS(
    "http://www.w3.org/2000/xmlns/",
    "xmlns",
    "http://www.w3.org/2000/svg",
  );
  const [, , w, h] = (svg.getAttribute("viewBox") || "0 0 960 600")
    .split(/[\s,]+/)
    .map(Number);
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));
  const result = new XMLSerializer().serializeToString(svg);
  if (
    new DOMParser()
      .parseFromString(result, "image/svg+xml")
      .querySelector("parsererror")
  )
    throw new Error("SVG could not be serialized as valid XML.");
  return result;
}
