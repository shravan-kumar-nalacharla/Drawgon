import { useEffect, useRef, useState } from "react";
import {
  createEditor,
  editTexts,
  renderEditor,
  undoEdit,
  type DiagramEditorState,
  type TextElement,
  type TextStyle,
} from "../services/diagram/editor";
import type { GeneratedDiagram } from "../types";
const fonts = [
  "Inter, Arial, sans-serif",
  "Arial, sans-serif",
  "Helvetica, Arial, sans-serif",
  "Georgia, serif",
  "Times New Roman, serif",
  "Courier New, monospace",
  "monospace",
  "system-ui, sans-serif",
];
export function DiagramEditor({
  diagram,
  onChange,
}: {
  diagram: GeneratedDiagram;
  onChange: (diagram: GeneratedDiagram) => void;
}) {
  const [state, setState] = useState(
    () => diagram.editor || createEditor(diagram.sanitizedHtml),
  );
  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
  const [warning, setWarning] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  const fontInput = useRef<HTMLInputElement>(null);
  const cancelBlur = useRef(false);
  const text = state.texts.find((t) => t.id === selected);
  const rgb = text?.style.fill.match(
    /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/,
  );
  const colorValue = rgb
    ? `#${rgb
        .slice(1)
        .map((n) => Number(n).toString(16).padStart(2, "0"))
        .join("")}`
    : text?.style.fill || "#111111";
  useEffect(() => {
    if (
      fontInput.current &&
      text &&
      document.activeElement !== fontInput.current
    )
      fontInput.current.value = String(text.style.fontSize);
  }, [text]);
  function save(next: DiagramEditorState) {
    if (next === state) return;
    setState(next);
    onChange({ ...diagram, editor: next, sanitizedHtml: renderEditor(next) });
  }
  function patch(value: Partial<TextElement>) {
    save(
      editTexts(
        state,
        state.texts.map((t) => (t.id === selected ? { ...t, ...value } : t)),
      ),
    );
  }
  function style(value: Partial<TextStyle>) {
    if (text) patch({ style: { ...text.style, ...value } });
  }
  function commit() {
    if (cancelBlur.current) {
      cancelBlur.current = false;
      return;
    }
    if (draft !== null && text && draft !== text.text) patch({ text: draft });
    setDraft(null);
  }
  function select(id: string, edit = false) {
    setSelected(id);
    setDraft(null);
    if (edit) {
      setDraft(state.texts.find((t) => t.id === id)?.text || "");
      requestAnimationFrame(() => input.current?.focus());
    }
  }
  function frameLoaded(frame: HTMLIFrameElement) {
    const doc = frame.contentDocument;
    if (!doc) return;
    const selectTarget = (event: MouseEvent, edit: boolean) => {
      const node = (event.target as Element)?.closest?.("[data-text-id]");
      if (node) select(node.getAttribute("data-text-id")!, edit);
    };
    doc.addEventListener("click", (event) => selectTarget(event, false));
    doc.addEventListener("dblclick", (event) => selectTarget(event, true));
    doc.addEventListener("keydown", keyboard);
    let overflow = false;
    doc
      .querySelectorAll<SVGGraphicsElement>("[data-text-id]")
      .forEach((node) => {
        node.style.cursor = "text";
        if (node.getAttribute("data-text-id") === selected) {
          node.style.outline = "1px dashed #888";
          node.style.outlineOffset = "3px";
        }
        const box = node.getBoundingClientRect(),
          canvas = node.ownerSVGElement?.getBoundingClientRect();
        if (
          canvas &&
          (box.right > canvas.right + 1 ||
            box.left < canvas.left - 1 ||
            box.bottom > canvas.bottom + 1)
        )
          overflow = true;
      });
    setWarning(
      overflow
        ? "Some text extends beyond the canvas. Shorten it or reduce its size before exporting."
        : "",
    );
  }
  function keyboard(event: KeyboardEvent | React.KeyboardEvent) {
    const tag = (event.target as Element)?.tagName?.toLowerCase();
    if (["input", "textarea", "select"].includes(tag)) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      save(undoEdit(state, event.shiftKey));
    }
    if (event.key === "Delete" && selected) {
      event.preventDefault();
      save(
        editTexts(
          state,
          state.texts.filter((t) => t.id !== selected),
        ),
      );
      setSelected("");
    }
    if (event.key === "Escape" && selected) {
      event.preventDefault();
      event.stopPropagation();
      setSelected("");
      setDraft(null);
    }
  }
  return (
    <div className="diagram-editor" onKeyDown={keyboard}>
      <p className="editor-hint">
        Click text to format it. Double-click to edit. Changes stay in this
        browser session and use no Gemini quota.
      </p>
      <div className="text-toolbar" aria-label="Text formatting">
        <label>
          Text object
          <select
            aria-label="Text object"
            value={selected}
            onChange={(e) => select(e.target.value)}
          >
            <option value="">Select text…</option>
            {state.texts.map((t) => (
              <option key={t.id} value={t.id}>
                {["description", "accessible title"].includes(t.role)
                  ? `${t.role}: `
                  : ""}
                {t.text.slice(0, 70) || "Empty text"}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={!state.past.length}
          onClick={() => save(undoEdit(state))}
          title="Undo (Ctrl/Cmd+Z)"
        >
          Undo
        </button>
        <button
          disabled={!state.future.length}
          onClick={() => save(undoEdit(state, true))}
          title="Redo (Ctrl/Cmd+Shift+Z)"
        >
          Redo
        </button>
      </div>
      {text && (
        <div className="text-properties">
          <label className="edit-copy">
            Text
            <textarea
              ref={input}
              aria-label="Edit selected text"
              value={draft ?? text.text}
              maxLength={2000}
              rows={2}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  commit();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  setDraft(null);
                  cancelBlur.current = true;
                  input.current?.blur();
                }
              }}
            />
          </label>
          <label>
            Font
            <select
              aria-label="Font family"
              value={text.style.fontFamily}
              onChange={(e) => style({ fontFamily: e.target.value })}
            >
              {!fonts.includes(text.style.fontFamily) && (
                <option>{text.style.fontFamily}</option>
              )}
              {fonts.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          <label>
            Size
            <input
              aria-label="Font size"
              type="number"
              min={8}
              max={160}
              key={text.id}
              ref={fontInput}
              defaultValue={text.style.fontSize}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (n >= 8 && n <= 160) style({ fontSize: n });
              }}
              onBlur={(e) => {
                const n = Number(e.target.value);
                if (n >= 8 && n <= 160) style({ fontSize: n });
                else e.currentTarget.value = String(text.style.fontSize);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
          </label>
          <label>
            Weight
            <select
              aria-label="Font weight"
              value={text.style.fontWeight}
              onChange={(e) => style({ fontWeight: e.target.value })}
            >
              {["400", "500", "600", "700"].map((w) => (
                <option key={w}>{w}</option>
              ))}
            </select>
          </label>
          <button
            aria-label="Bold"
            aria-pressed={Number(text.style.fontWeight) >= 700}
            onClick={() =>
              style({
                fontWeight:
                  Number(text.style.fontWeight) >= 700 ? "400" : "700",
              })
            }
          >
            <b>B</b>
          </button>
          <button
            aria-label="Italic"
            aria-pressed={text.style.fontStyle === "italic"}
            onClick={() =>
              style({
                fontStyle:
                  text.style.fontStyle === "italic" ? "normal" : "italic",
              })
            }
          >
            <i>I</i>
          </button>
          <label>
            Align
            <select
              aria-label="Text alignment"
              value={text.style.textAnchor}
              onChange={(e) => style({ textAnchor: e.target.value })}
            >
              <option value="start">Left</option>
              <option value="middle">Center</option>
              <option value="end">Right</option>
            </select>
          </label>
          <label>
            Color
            <input
              aria-label="Text color"
              type="color"
              value={/^#[\da-f]{6}$/i.test(colorValue) ? colorValue : "#111111"}
              onChange={(e) => style({ fill: e.target.value })}
            />
          </label>
          <button
            onClick={() => {
              const original = state.original.find((t) => t.id === selected);
              if (original) patch({ style: original.style });
            }}
          >
            Reset formatting
          </button>
          <button
            onClick={() => {
              save(
                editTexts(
                  state,
                  state.texts.filter((t) => t.id !== selected),
                ),
              );
              setSelected("");
            }}
          >
            Delete text
          </button>
        </div>
      )}
      {warning && (
        <p className="notice" role="status">
          {warning}
        </p>
      )}
      <div className="editor-canvas">
        <iframe
          key={selected}
          title="Editable diagram"
          sandbox="allow-same-origin"
          srcDoc={renderEditor(state)}
          onLoad={(e) => frameLoaded(e.currentTarget)}
        />
      </div>
      <small>
        Inter and other fonts use installed system fonts with fallbacks. Longer
        labels may need a smaller size. Text positions and shapes are preserved.
      </small>
    </div>
  );
}
