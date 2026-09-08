import type { Blueprint } from "../gemini/schemas";
import type { GeneratedDiagram } from "../../types";
import type { Settings } from "../../config/settings";
import { extractSvg, sanitizeDiagram } from "./safety";
import type { ExportBackground } from "./presentation";
export type Format = "html" | "svg" | "png" | "presentation";
export function safeFilename(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 90)
      .replace(/-$/, "") || "diagram"
  );
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportPng(html: string, scale = 2): Promise<Blob> {
  const svg = extractSvg(html),
    doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const [, , width, height] = doc.documentElement
    .getAttribute("viewBox")!
    .split(/[\s,]+/)
    .map(Number);
  if (width * height * scale * scale > 40_000_000)
    throw new Error(
      "PNG is too large for browser memory. Choose 1× or a smaller canvas.",
    );
  const url = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(
          new Error("The SVG could not be rasterized. Try regenerating it."),
        );
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("Canvas export is not available in this browser.");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("PNG export failed.")),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function diagramBlob(
  diagram: GeneratedDiagram,
  format: Format,
  scale: number,
  background: ExportBackground = "white",
) {
  if (format === "png") return exportPng(diagram.sanitizedHtml, scale);
  return new Blob(
    [
      format === "svg" || format === "presentation"
        ? extractSvg(
            diagram.sanitizedHtml,
            format === "presentation" ? background : "diagram",
          )
        : sanitizeDiagram(diagram.sanitizedHtml),
    ],
    {
      type:
        format === "svg" || format === "presentation"
          ? "image/svg+xml;charset=utf-8"
          : "text/html;charset=utf-8",
    },
  );
}
export async function buildZip(
  diagrams: GeneratedDiagram[],
  blueprint: Blueprint,
  settings: Settings,
  format: Format | "all",
  status: (s: string) => void,
  background: ExportBackground = "white",
) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const folder = zip.folder(`${safeFilename(blueprint.title)}-diagrams`)!;
  folder.file(
    "README.txt",
    `Project: ${blueprint.title}\nGenerated diagrams: ${diagrams.map((d) => d.title).join(", ")}\nSettings: ${JSON.stringify(settings)}\nGenerated in the browser using the user's Gemini API credentials. No API key is included.\nDiagram Design by Cathryn Lavery, MIT.\nReview assumptions and fidelity notes in project-summary.json.`,
  );
  folder.file(
    "project-summary.json",
    JSON.stringify(
      {
        blueprint,
        settings,
        diagrams: diagrams.map(
          ({
            title,
            requestedType,
            revision,
            assumptions,
            fidelityNotes,
            createdAt,
          }) => ({
            title,
            requestedType,
            revision,
            assumptions,
            fidelityNotes,
            createdAt,
          }),
        ),
      },
      null,
      2,
    ),
  );
  for (const diagram of diagrams)
    for (const f of format === "all"
      ? (["html", "svg", "presentation", "png"] as const)
      : [format]) {
      status(`Preparing ${diagram.title} (${f.toUpperCase()})…`);
      folder.file(
        `${f}/${safeFilename(diagram.requestedType)}.${f === "presentation" ? "svg" : f}`,
        await (
          await diagramBlob(diagram, f, settings.scale, background)
        ).arrayBuffer(),
      );
    }
  for (const name of ["LICENSE", "THIRD_PARTY_LICENSES.md"]) {
    const response = await fetch(
      `${import.meta.env.BASE_URL}diagram-design/${name}`,
    );
    if (!response.ok)
      throw new Error("License file could not be loaded. Retry download.");
    folder.file(
      `licenses/${name === "LICENSE" ? "DIAGRAM-DESIGN-LICENSE.txt" : name}`,
      await response.text(),
    );
  }
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}
