import { extractSvg, sanitizeDiagram } from "./safety";
export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  textAnchor: string;
  fill: string;
}
export interface TextElement {
  id: string;
  text: string;
  role: string;
  style: TextStyle;
}
export interface DiagramEditorState {
  baseSvg: string;
  original: TextElement[];
  texts: TextElement[];
  past: TextElement[][];
  future: TextElement[][];
}
const attributes = {
  fontFamily: "font-family",
  fontSize: "font-size",
  fontWeight: "font-weight",
  fontStyle: "font-style",
  textAnchor: "text-anchor",
  fill: "fill",
} as const;
export function createEditor(html: string): DiagramEditorState {
  const doc = new DOMParser().parseFromString(
    extractSvg(html),
    "image/svg+xml",
  );
  const texts: TextElement[] = [];
  doc
    .querySelectorAll("text,tspan,svg > title,svg > desc")
    .forEach((node, i) => {
      // Edit individual positioned lines, preserving existing tspan geometry and groups.
      if (node.querySelector("tspan")) return;
      const id = `drawgon-text-${i}`;
      node.setAttribute("data-text-id", id);
      texts.push({
        id,
        text: node.textContent || "",
        role:
          node.tagName === "desc"
            ? "description"
            : node.tagName === "title"
              ? "accessible title"
              : node.getAttribute("data-role") || "label",
        style: {
          fontFamily: node.getAttribute("font-family") || "Arial, sans-serif",
          fontSize: parseFloat(node.getAttribute("font-size") || "16"),
          fontWeight: node.getAttribute("font-weight") || "400",
          fontStyle: node.getAttribute("font-style") || "normal",
          textAnchor: node.getAttribute("text-anchor") || "start",
          fill: node.getAttribute("fill") || "#111111",
        },
      });
    });
  return {
    baseSvg: new XMLSerializer().serializeToString(doc),
    original: structuredClone(texts),
    texts,
    past: [],
    future: [],
  };
}
export function editTexts(
  state: DiagramEditorState,
  texts: TextElement[],
): DiagramEditorState {
  if (JSON.stringify(state.texts) === JSON.stringify(texts)) return state;
  return {
    ...state,
    texts,
    past: [...state.past.slice(-49), state.texts],
    future: [],
  };
}
export function undoEdit(
  state: DiagramEditorState,
  redo = false,
): DiagramEditorState {
  const source = redo ? state.future : state.past;
  if (!source.length) return state;
  return {
    ...state,
    texts: source[source.length - 1],
    past: redo ? [...state.past, state.texts] : state.past.slice(0, -1),
    future: redo ? state.future.slice(0, -1) : [...state.future, state.texts],
  };
}
export function renderEditor(state: DiagramEditorState) {
  const doc = new DOMParser().parseFromString(state.baseSvg, "image/svg+xml");
  const byId = new Map(state.texts.map((t) => [t.id, t]));
  doc.querySelectorAll("[data-text-id]").forEach((node) => {
    const value = byId.get(node.getAttribute("data-text-id")!);
    if (!value) {
      node.remove();
      return;
    }
    node.textContent = value.text;
    for (const [key, attribute] of Object.entries(attributes))
      node.setAttribute(attribute, String(value.style[key as keyof TextStyle]));
  });
  return sanitizeDiagram(
    `<html><head><style>body{margin:0;background:transparent}svg{display:block;width:100%}</style></head><body>${new XMLSerializer().serializeToString(doc)}</body></html>`,
  );
}
