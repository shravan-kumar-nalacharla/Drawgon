const NS = "http://www.w3.org/2000/svg";
export type ExportBackground = "diagram" | "white" | "transparent";
const paints = [
  "fill",
  "stroke",
  "color",
  "fill-opacity",
  "stroke-opacity",
  "opacity",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-dashoffset",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "text-anchor",
  "dominant-baseline",
  "letter-spacing",
  "text-decoration",
  "clip-path",
  "marker-start",
  "marker-mid",
  "marker-end",
  "visibility",
  "display",
];

/** Render a sanitized clone in an isolated document so wrapper CSS and variables resolve.
 * Never attach model markup to the application's document or mutate the live preview. */
export function normalizeSvg(
  cleanHtml: string,
  background: ExportBackground = "diagram",
) {
  const frame = document.createElement("iframe");
  frame.setAttribute("sandbox", "allow-same-origin");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;left:-20000px;top:0;width:1200px;height:1000px;visibility:hidden;pointer-events:none";
  document.body.append(frame);
  try {
    const doc = frame.contentDocument!;
    doc.open();
    doc.write(cleanHtml);
    doc.close();
    const svg = doc.querySelector("svg");
    if (!svg) throw new Error("No SVG found.");
    const box = (svg.getAttribute("viewBox") || "")
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (
      box.length !== 4 ||
      box.some((n) => !Number.isFinite(n)) ||
      box[2] <= 0 ||
      box[3] <= 0
    )
      throw new Error("SVG needs valid canvas dimensions before export.");
    const [x, y, width, height] = box;
    frame.style.width = `${width}px`;
    frame.style.height = `${height}px`;
    const fullCanvas = (el: Element) =>
      !el.closest("defs") &&
      el.tagName.toLowerCase() === "rect" &&
      (el.getAttribute("width") === "100%" ||
        Number(el.getAttribute("width")) === width) &&
      (el.getAttribute("height") === "100%" ||
        Number(el.getAttribute("height")) === height) &&
      Number(el.getAttribute("x") || 0) === x &&
      Number(el.getAttribute("y") || 0) === y &&
      !el.hasAttribute("transform");
    svg
      .querySelectorAll(
        '[data-editor-only="true"],.editor-grid,.snap-guide,.selection-handle',
      )
      .forEach((el) => el.remove());
    // Only decorative whole-canvas dots/grids are UI chrome. Chart reference lines survive.
    for (const pattern of svg.querySelectorAll("pattern")) {
      if (!/dots?|editor|grid|paper/i.test(pattern.id)) continue;
      for (const el of svg.querySelectorAll("rect")) {
        if (
          fullCanvas(el) &&
          (
            el.getAttribute("fill") ||
            doc.defaultView!.getComputedStyle(el).fill
          ).includes(`#${pattern.id}`)
        )
          el.remove();
      }
    }
    const elements = [svg, ...svg.querySelectorAll("*")];
    const styles = elements.map((el) => {
      const computed = doc.defaultView!.getComputedStyle(el);
      return Object.fromEntries(
        paints.map((p) => [p, computed.getPropertyValue(p).trim()]),
      );
    });
    elements.forEach((el, index) => {
      if (["style", "title", "desc", "defs"].includes(el.tagName.toLowerCase()))
        return;
      for (const [property, raw] of Object.entries(styles[index])) {
        let value = raw || el.getAttribute(property) || "";
        if (
          !value ||
          value.includes("var(") ||
          (value === "normal" && property === "letter-spacing")
        )
          continue;
        // Browser computed fragment URLs can become absolute; keep references portable.
        value = value.replace(/url\(["']?[^)]*#([\w-]+)["']?\)/g, "url(#$1)");
        if (value === "currentcolor" || value === "currentColor")
          value = styles[index].color || "#111111";
        const rgba = value.match(
          /^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/,
        );
        if (rgba && ["fill", "stroke"].includes(property)) {
          value = `rgb(${rgba[1]},${rgba[2]},${rgba[3]})`;
          if (rgba[4])
            styles[index][`${property}-opacity`] = String(
              Number(rgba[4]) *
                Number(styles[index][`${property}-opacity`] || 1),
            );
        }
        if (property.endsWith("-opacity"))
          value = styles[index][property] || value;
        el.setAttribute(property, value);
      }
      el.removeAttribute("style");
      el.removeAttribute("class");
      for (const attr of [...el.attributes])
        if (attr.name.startsWith("data-editor")) el.removeAttribute(attr.name);
    });
    svg
      .querySelectorAll("style,filter,foreignObject")
      .forEach((el) => el.remove());
    svg
      .querySelectorAll('[display="none"],[visibility="hidden"],[opacity="0"]')
      .forEach((el) => el.remove());
    // Clean unused definitions, retaining referenced markers/clip paths and their dependencies.
    let changed = true;
    while (changed) {
      changed = false;
      for (const def of svg.querySelectorAll("defs > [id]")) {
        const used = [...svg.querySelectorAll("*")].some(
          (el) =>
            el !== def &&
            [...el.attributes].some(
              (a) =>
                a.value.includes(`url(#${def.id})`) || a.value === `#${def.id}`,
            ),
        );
        if (!used) {
          def.remove();
          changed = true;
        }
      }
    }
    svg.querySelectorAll("g,defs").forEach((el) => {
      if (!el.children.length && !el.textContent?.trim()) el.remove();
    });
    if (background !== "diagram")
      [...svg.querySelectorAll("rect")]
        .filter(fullCanvas)
        .forEach((el) => el.remove());
    const existingRoot = svg.querySelector(":scope > g#drawgon-diagram");
    const root = existingRoot || doc.createElementNS(NS, "g");
    root.id = "drawgon-diagram";
    const ordered = [...svg.children].filter(
      (el) => !["title", "desc", "defs"].includes(el.tagName.toLowerCase()),
    );
    const beforeRoot = doc.createDocumentFragment();
    let seenRoot = false;
    // Preserve painting order when a generated background sits before the existing root.
    if (existingRoot)
      for (const el of ordered) {
        if (el === root) {
          seenRoot = true;
          continue;
        }
        if (!seenRoot) beforeRoot.append(el);
        else root.append(el);
      }
    root.prepend(beforeRoot);
    for (const el of [...svg.children])
      if (
        el !== root &&
        !["title", "desc", "defs"].includes(el.tagName.toLowerCase())
      )
        root.append(el);
    const hasPaper = [...root.querySelectorAll("rect")].some(fullCanvas);
    if (background === "white" || (background === "diagram" && !hasPaper)) {
      const paper = doc.createElementNS(NS, "rect");
      const color = doc.defaultView!.getComputedStyle(doc.body).backgroundColor;
      for (const [k, v] of Object.entries({
        x,
        y,
        width,
        height,
        fill:
          background === "white" || !color || color === "rgba(0, 0, 0, 0)"
            ? "#ffffff"
            : color,
        stroke: "none",
      }))
        paper.setAttribute(k, String(v));
      paper.id = "drawgon-background";
      root.prepend(paper);
    }
    svg.append(root);
    svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns", NS);
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.removeAttribute("style");
    return new XMLSerializer().serializeToString(svg);
  } finally {
    frame.remove();
  }
}
