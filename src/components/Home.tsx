import {
  ArrowRight,
  ArrowUpRight,
  Braces,
  GitBranch,
  ShieldCheck,
  Download,
  Layers,
  Check,
} from "lucide-react";
import { guides } from "../config/seo";
const examples = [
  ["architecture", "Architecture", "A clear view of the whole system."],
  ["uml-class", "UML class", "Structure, behavior, relationships."],
  ["data-flow", "Data flow", "Follow the information."],
  ["deployment", "Deployment", "From software to infrastructure."],
  ["sequence", "Sequence", "Every interaction, in order."],
  ["db-schema", "Database schema", "The shape of your data."],
];
export function Example({
  type,
  title,
  priority = false,
}: {
  type: string;
  title: string;
  priority?: boolean;
}) {
  return (
    <img
      className="example-frame example-poster"
      src={`${import.meta.env.BASE_URL}examples/${type}.svg`}
      alt={`${title} — adapted Diagram Design example`}
      width="960"
      height="600"
      loading={priority ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
export function Home({ start }: { start: () => void }) {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="status-dot" /> FROM COMPLEX IDEAS TO CLEAR DIAGRAMS
          </div>
          <h1>
            Your project.
            <br />
            Clearly <em>drawn.</em>
          </h1>
          <p className="hero-description">
            Drawgon turns your project into clear architecture, UML, ER and
            flowchart diagrams. Describe what you’re building. See how it all
            fits together.
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={start}>
              Generate Diagrams <ArrowRight size={18} />
            </button>
            <a className="text-link" href="#examples">
              View examples <ArrowUpRight size={16} />
            </a>
          </div>
          <p className="microcopy">
            <Check size={14} /> No signup <span>·</span> Your Gemini key{" "}
            <span>·</span> No database
          </p>
        </div>
        <div className="hero-art">
          <div className="art-toolbar">
            <span>
              <i /> PROJECT BLUEPRINT
            </span>
            <span>01 / ARCHITECTURE</span>
          </div>
          <Example type="architecture" title="Architecture" priority />
          <div className="art-footer">
            <span>Less complexity. More clarity.</span>
            <span className="sample-label">BUNDLED EXAMPLE</span>
          </div>
          <div className="floating-label">
            <Layers size={17} />
            <span>One project. Every perspective.</span>
          </div>
        </div>
      </section>
      <div className="format-strip">
        <span>BUILT FOR YOUR NEXT</span>
        <span>Project report</span>
        <span>Technical docs</span>
        <span>Research paper</span>
        <span>Team presentation</span>
      </div>
      <section className="how-section">
        <div>
          <p className="eyebrow">THE BIG PICTURE, WITHOUT THE BUSYWORK</p>
          <h2>
            From an idea to
            <br />
            “now I get it.”
          </h2>
        </div>
        <div className="how-grid">
          {[
            [
              Braces,
              "01",
              "Describe your project",
              "Start with a title and abstract. Add the details that matter.",
            ],
            [
              GitBranch,
              "02",
              "Connect the dots",
              "Optionally analyze a public GitHub repository for real context.",
            ],
            [
              Download,
              "03",
              "Make it yours",
              "Choose from 39 diagram types. Refine, then export SVG, PNG or HTML.",
            ],
          ].map(([Icon, n, title, text]) => {
            const I = Icon as typeof Braces;
            return (
              <article key={String(n)}>
                <div className="how-top">
                  <I size={23} />
                  <span>{String(n)}</span>
                </div>
                <h3>{String(title)}</h3>
                <p>{String(text)}</p>
              </article>
            );
          })}
        </div>
      </section>
      <section id="examples" className="examples-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A DIFFERENT VIEW FOR EVERY QUESTION</p>
            <h2>Designed to explain.</h2>
          </div>
          <p>
            Editorial diagrams, built in the open.
            <br />
            <a
              href="https://github.com/shravan-kumar-nalacharla/Drawgon"
              target="_blank"
              rel="noreferrer"
            >
              Explore Drawgon on GitHub ↗
            </a>
          </p>
        </div>
        <div className="examples-grid">
          {examples.map(([id, title, description]) => (
            <article className="example-card" key={id}>
              <Example type={id} title={title} />
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
                <span>UPSTREAM EXAMPLE</span>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="home-guides">
        <p className="eyebrow">FIND THE RIGHT VIEW</p>
        <h2>A diagram maker for your next project.</h2>
        <p>
          Explore practical guidance for student reports, software documentation
          and system design.
        </p>
        <div>
          {guides.map((guide) => (
            <a key={guide.slug} href={`/${guide.slug}`}>
              {guide.title}
              <ArrowRight size={16} />
            </a>
          ))}
        </div>
      </section>
      <section className="privacy-banner">
        <ShieldCheck size={32} />
        <div>
          <h3>Your project is yours.</h3>
          <p>
            No account. No database. Your key stays in this browser session.
            Project information goes directly to Gemini when you generate.
          </p>
        </div>
        <button onClick={start}>
          Start creating <ArrowRight size={17} />
        </button>
      </section>
    </>
  );
}
