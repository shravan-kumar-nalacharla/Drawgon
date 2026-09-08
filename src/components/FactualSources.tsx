import DOMPurify from "dompurify";
import type { FactualData } from "../services/gemini/freshness";
import { sanitizeCss } from "../services/diagram/safety";
function suggestionsHtml(html: string) {
  const safe = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    FORBID_TAGS: [
      "script",
      "iframe",
      "img",
      "form",
      "object",
      "embed",
      "link",
      "base",
    ],
    ADD_ATTR: ["target"],
    FORBID_ATTR: ["src", "srcset"],
  });
  const doc = new DOMParser().parseFromString(safe, "text/html");
  doc
    .querySelectorAll("style")
    .forEach((el) => (el.textContent = sanitizeCss(el.textContent || "")));
  doc
    .querySelectorAll("[style]")
    .forEach((el) =>
      el.setAttribute(
        "style",
        sanitizeCss(el.getAttribute("style") || "", true),
      ),
    );
  doc.querySelectorAll("a").forEach((el) => {
    if (!/^https?:\/\//i.test(el.href)) el.removeAttribute("href");
    el.target = "_blank";
    el.rel = "noreferrer noopener";
  });
  return `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'none'">${doc.documentElement.outerHTML}`;
}
export function FactualSources({ data }: { data: FactualData }) {
  return (
    <details className="factual-sources" open={data.status === "unverified"}>
      <summary>
        {data.status === "grounded"
          ? "Sources & reference years"
          : data.status === "user-provided"
            ? "Using your supplied values"
            : "Current data could not be verified"}
      </summary>
      <p>
        {data.status === "grounded"
          ? "Google Search supplied the following evidence. Check the publisher, reference year, and estimate/projection status before sharing."
          : data.status === "user-provided"
            ? "Your values are preserved and are not independently verified."
            : "This key/model could not return cited current data. Supply values and a source or retry analysis; unsupported values must not be plotted."}
      </p>
      <small>Checked {new Date(data.checkedAt).toLocaleString()}</small>
      <pre style={{ whiteSpace: "pre-wrap" }}>{data.text}</pre>
      <ul>
        {data.citations.map((c) => (
          <li key={c.url}>
            <a href={c.url} target="_blank" rel="noreferrer">
              {c.title}
            </a>
          </li>
        ))}
      </ul>
      {data.suggestions.map((html, i) => (
        <iframe
          key={i}
          title={`Google Search suggestions ${i + 1}`}
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          srcDoc={suggestionsHtml(html)}
          style={{ border: 0, width: "100%", height: 180 }}
        />
      ))}
    </details>
  );
}
