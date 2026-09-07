import { ArrowRight, Check } from "lucide-react";
import { guides } from "../config/seo";
import { Example } from "./Home";
export function Guide({
  slug,
  start,
}: {
  slug: string;
  start: (type: string) => void;
}) {
  const guide = guides.find((g) => g.slug === slug);
  if (!guide) return null;
  return (
    <article className="guide-page">
      <nav className="breadcrumbs">
        <a href="/">Drawgon</a>
        <span>/</span>
        <span>{guide.title}</span>
      </nav>
      <section className="guide-hero">
        <div>
          <p className="eyebrow">CLEAR DIAGRAMS. REAL PROJECT CONTEXT.</p>
          <h1>{guide.title}</h1>
          <p className="lede">{guide.intro}</p>
          <button className="primary" onClick={() => start(guide.type)}>
            Create your diagram <ArrowRight size={17} />
          </button>
          <p className="microcopy">
            <Check size={14} />
            No signup · Your Gemini key · SVG / PNG / HTML
          </p>
        </div>
        <div className="guide-example">
          <Example type={guide.type} title={guide.title} />
          <small>
            Adapted Diagram Design example · not generated project output
          </small>
        </div>
      </section>
      <div className="guide-body">
        <section>
          <h2>What to include in your description</h2>
          <p>{guide.input}</p>
          <h3>A practical starting point</h3>
          <p>{guide.example}</p>
        </section>
        <section>
          <h2>Make a diagram in four steps</h2>
          <ol>
            <li>Connect and validate your own Gemini API key.</li>
            <li>
              Enter a project title and abstract, then optionally add a public
              GitHub repository.
            </li>
            <li>
              Add relevant details, choose your diagram types and review the
              project.
            </li>
            <li>
              Check the generated blueprint and assumptions, refine the diagram
              and download.
            </li>
          </ol>
        </section>
        <section>
          <h2>What to check before you export</h2>
          <ul>
            {guide.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Choose the view that answers your question</h2>
          <p>{guide.difference}</p>
          <p>
            Diagrams use a monochrome palette by default. SVG stays vector; PNG
            exports at 1×, 2× or 3×. Use Download All for a ZIP containing your
            selected formats and project summary.
          </p>
        </section>
        <section>
          <h2>Common questions</h2>
          {guide.faq.map(([q, a]) => (
            <details key={q} open>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </section>
      </div>
      <section className="related-guides">
        <h2>Explore other project diagrams</h2>
        <div>
          {guides
            .filter((g) => g.slug !== slug)
            .map((g) => (
              <a key={g.slug} href={`/${g.slug}`}>
                {g.title}
                <ArrowRight size={14} />
              </a>
            ))}
        </div>
      </section>
    </article>
  );
}
