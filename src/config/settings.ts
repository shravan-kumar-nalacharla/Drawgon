export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
export const canvases: Record<string, [number, number] | null> = {
  Document: [960, 600],
  Wide: [1280, 720],
  "Presentation 16:9": [1280, 720],
  Square: [1080, 1080],
  Social: [1200, 632],
  "Fit to content": null,
};
export const defaultSettings = {
  style: "Minimal Light",
  detail: "Balanced",
  audience: "Student / General",
  canvas: "Document",
  accent: "#111111",
  palette: "Monochrome",
  model: DEFAULT_GEMINI_MODEL,
  concurrency: 2,
  scale: 2,
};
export type Settings = typeof defaultSettings;
