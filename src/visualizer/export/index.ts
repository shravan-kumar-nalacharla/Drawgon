import { safeFilename, downloadBlob } from "../../services/diagram/export";
export function svgSource(
  element: SVGSVGElement,
  title: string,
  background = "white",
) {
  const clone = element.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(element.viewBox.baseVal.width));
  clone.setAttribute("height", String(element.viewBox.baseVal.height));
  const originals = [element, ...element.querySelectorAll("*")],
    copies = [clone, ...clone.querySelectorAll("*")];
  const ink = getComputedStyle(element).color;
  const paper = getComputedStyle(element).backgroundColor;
  copies.forEach((node, i) => {
    const style = getComputedStyle(originals[i]);
    for (const p of [
      "fill",
      "stroke",
      "color",
      "font-family",
      "font-size",
      "font-weight",
      "stroke-width",
      "stroke-dasharray",
    ]) {
      let value = style.getPropertyValue(p);
      if (background === "white" && ["fill", "stroke", "color"].includes(p)) {
        if (value === ink) value = "#22282d";
        else if (value === paper) value = "white";
      }
      node.setAttribute(p, value);
    }
    node.removeAttribute("tabindex");
    node.removeAttribute("role");
    node.removeAttribute("class");
  });
  clone.style.cssText = `background:${background};font-family:Arial,sans-serif`;
  clone.querySelector("title")!.textContent = title;
  if (background !== "transparent") {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
    rect.setAttribute("fill", background);
    clone.insertBefore(rect, clone.firstChild);
  }
  return new XMLSerializer().serializeToString(clone);
}
export async function exportFigure(
  element: SVGSVGElement,
  title: string,
  format: "svg" | "png",
  scale = 2,
  background = "white",
  fullView?: HTMLElement,
) {
  let source = svgSource(element, title, background);
  if (fullView) {
    const ns = "http://www.w3.org/2000/svg",
      root = document.createElementNS(ns, "svg");
    root.setAttribute("xmlns", ns);
    const heading = document.createElementNS(ns, "title");
    heading.textContent = title;
    root.append(heading);
    let y = 0;
    for (const figure of fullView.querySelectorAll<SVGSVGElement>(
      "svg[data-export]",
    )) {
      const parsed = new DOMParser().parseFromString(
        svgSource(figure, title, background),
        "image/svg+xml",
      ).documentElement;
      parsed.setAttribute("x", "0");
      parsed.setAttribute("y", String(y));
      root.append(document.importNode(parsed, true));
      y += figure.viewBox.baseVal.height + 16;
    }
    for (const formula of fullView.querySelectorAll(".vl-formula")) {
      const raw = formula.textContent ?? "";
      const chunks = raw.match(/.{1,85}(?:\s|$)|.{1,85}/g) ?? [];
      for (const chunk of chunks) {
        const text = document.createElementNS(ns, "text");
        text.setAttribute("x", "20");
        text.setAttribute("y", String(y + 20));
        text.setAttribute(
          "fill",
          background === "#1b1d20" ? "#efeee8" : "#22282d",
        );
        text.setAttribute("font-size", "13");
        text.setAttribute("font-family", "Arial, sans-serif");
        text.textContent = chunk;
        root.append(text);
        y += 23;
      }
      y += 15;
    }
    root.setAttribute("viewBox", `0 0 720 ${y}`);
    root.setAttribute("width", "720");
    root.setAttribute("height", String(y));
    root.style.background = background;
    source = new XMLSerializer().serializeToString(root);
  }
  const blob = new Blob([source], { type: "image/svg+xml" });
  if (format === "svg") {
    downloadBlob(blob, `${safeFilename(title)}.svg`);
    return;
  }
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.width * image.height * scale * scale > 40_000_000)
      throw new Error(
        "This full view exceeds the 40-megapixel limit. Choose 1× or export SVG.",
      );
    const canvas = document.createElement("canvas");
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable. Use SVG instead.");
    if (background !== "transparent") {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG export failed."))),
        "image/png",
      ),
    );
    downloadBlob(png, `${safeFilename(title)}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}
