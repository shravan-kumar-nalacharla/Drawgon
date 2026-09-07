import { BRAND } from "./brand";
export const guides = [
  {
    slug: "architecture-diagram-maker",
    type: "architecture",
    title: "AI Architecture Diagram Maker",
    description:
      "Create clear software architecture diagrams from a project description or public GitHub repository. Export black-and-white SVG, PNG and HTML with Drawgon.",
    intro:
      "Show how your system fits together: its applications, services, data stores and external integrations. Drawgon turns your project context into a readable architecture view, with black-and-white output by default.",
    input:
      "Describe your frontend, backend, database and external services. Include who uses the system, where requests enter and which component owns each responsibility. A public GitHub repository can provide additional evidence.",
    checklist: [
      "Group components by responsibility or trust boundary.",
      "Label connections with the data or operation they carry.",
      "Keep deployment details out of a logical overview unless they explain the architecture.",
      "Review every inferred component before including it in a project report.",
    ],
    example:
      "For a library management project, describe the reader interface, catalog service, loan rules and actual data store. Do not add a cloud platform or message queue unless the project uses one.",
    difference:
      "An architecture diagram explains the system’s structure. A deployment diagram explains where that software runs; a sequence diagram follows one interaction through it.",
    faq: [
      [
        "Can I generate an architecture diagram from GitHub?",
        "Yes. Drawgon reads selected files from a public GitHub repository and combines them with your description. Private repositories are not supported.",
      ],
      [
        "Is this a drag-and-drop architecture editor?",
        "No. Describe the project and refine the generated view in natural language. Export SVG for further editing in a vector tool.",
      ],
    ],
  },
  {
    slug: "uml-diagram-maker",
    type: "uml-class",
    title: "AI UML Diagram Maker",
    description:
      "Make UML class, sequence, activity and state diagrams from project details with Drawgon. No signup; bring your Gemini key and export SVG or PNG.",
    intro:
      "Use the right UML view for the question you need to answer. Drawgon supports class, sequence, activity and state diagrams, each generated from the same project blueprint so names stay consistent.",
    input:
      "Describe the domain concepts, actors, responsibilities and important workflows. For a class diagram, add attributes, methods and relationships that exist in your design. For a sequence diagram, describe one scenario in order.",
    checklist: [
      "Choose class diagrams for structural relationships.",
      "Choose sequence diagrams for time-ordered messages.",
      "Choose activity diagrams for actions, decisions and parallel responsibilities.",
      "Choose state diagrams for lifecycle states and guarded transitions.",
    ],
    example:
      "A student attendance project could use a class view for Student, Session and AttendanceRecord, a sequence view for recording attendance, and an activity view for review and approval. Supply actual project facts rather than asking the model to invent an implementation.",
    difference:
      "UML is a family of notations rather than one diagram. ER diagrams focus on logical data relationships; UML class diagrams can also show operations, inheritance and composition. Drawgon does not currently offer a dedicated use-case diagram type.",
    faq: [
      [
        "Which UML diagrams can I make?",
        "Class, sequence, activity and state diagrams are available. The catalog also includes architecture, deployment, ER and database schema views.",
      ],
      [
        "Can students use these diagrams in reports?",
        "Yes. Review the notation, project facts and assumptions, then download black-and-white SVG or PNG for a report or presentation.",
      ],
    ],
  },
  {
    slug: "class-diagram-maker",
    type: "uml-class",
    title: "UML Class Diagram Maker",
    description:
      "Generate UML class diagrams showing attributes, methods and relationships. Build from your project facts with Drawgon and download SVG, PNG or HTML.",
    intro:
      "Explain the structure of an object-oriented design with classes, attributes, operations and relationships. Drawgon uses evidence from your description and optional source files rather than filling a canvas with invented methods.",
    input:
      "List the classes or domain concepts, each class’s responsibility, important attributes, known operations and relationships. State whether a relationship is inheritance, composition or a simple association when you know.",
    checklist: [
      "Use singular class names that match your implementation.",
      "Include only members relevant to the view.",
      "Distinguish inheritance from composition and association.",
      "Review multiplicity and any conceptual assumptions.",
    ],
    example:
      "For a lending system, describe Book, Member and Loan with the actual attributes and operations your project contains. If no implementation exists, say that you want a conceptual domain model.",
    difference:
      "A class diagram describes software or domain structure. A database schema describes physical tables, SQL types, keys and constraints. The two views can be related without being identical.",
    faq: [
      [
        "What if my project has no class-level code yet?",
        "Drawgon can produce a conceptual domain class view from supported concepts. It records uncertainty instead of inventing a detailed implementation.",
      ],
      [
        "Can I simplify a generated class diagram?",
        "Yes. Use Refine or select a simpler detail level to regenerate only that diagram.",
      ],
    ],
  },
  {
    slug: "sequence-diagram-maker",
    type: "sequence",
    title: "AI Sequence Diagram Maker",
    description:
      "Turn a project workflow into a UML sequence diagram with Drawgon. Show actors and time-ordered messages, then export a crisp SVG or PNG.",
    intro:
      "Follow one scenario from its first request to its final response. A sequence diagram makes the order of messages between users, interfaces, services and data stores explicit.",
    input:
      "Name the participants and describe the messages in order. Include the triggering action, success response, important failure conditions and any asynchronous work. Keep the scenario bounded.",
    checklist: [
      "Reuse participant names from your architecture view.",
      "Put messages in chronological order.",
      "Distinguish requests from returns and asynchronous messages.",
      "Limit branches to the conditions needed to explain the scenario.",
    ],
    example:
      "For checkout, describe how the customer interface requests an order, which service validates it, how payment is requested and what confirmation returns. Include only services your project actually has.",
    difference:
      "A flowchart shows decision logic and steps. A sequence diagram emphasizes which participant sends each message and when. Use an activity diagram when the handoff of work matters more than individual messages.",
    faq: [
      [
        "Can I show alternate and failure paths?",
        "Describe the relevant conditions. Drawgon applies the sequence reference’s complexity limits so the main scenario remains readable.",
      ],
      [
        "Can I download a sequence diagram for a presentation?",
        "Yes. Choose the presentation canvas and export PNG at 2× or 3×, or keep an editable vector SVG.",
      ],
    ],
  },
  {
    slug: "er-diagram-maker",
    type: "er",
    title: "AI ER Diagram Maker",
    description:
      "Create entity relationship diagrams from your project’s entities and data relationships. Generate with Drawgon and export black-and-white SVG or PNG.",
    intro:
      "Make the relationships between your project’s entities easy to understand. An entity relationship diagram explains the logical data model before physical database details take over.",
    input:
      "List entities, important fields, identifiers and relationships. State whether relationships are one-to-one, one-to-many or many-to-many, and include optionality where known.",
    checklist: [
      "Identify entities from the actual project domain.",
      "Check primary identifiers and relationship cardinality.",
      "Separate logical relationships from implementation-specific SQL details.",
      "Review uncertain relationships in the assumptions panel.",
    ],
    example:
      "For course registration, explain Student, Course and Enrollment, including whether a student can enroll in several courses. The Enrollment relationship may carry fields such as registration date if your project requires them.",
    difference:
      "An ER diagram is a logical view of entities and relationships. Choose Database Schema when you need physical columns, SQL types, indexes, constraints and column-level foreign keys. Drawgon does not fabricate unknown SQL types.",
    faq: [
      [
        "Can Drawgon use an existing database schema?",
        "A public repository containing a schema or model files can provide evidence. You can also enter entities and fields manually.",
      ],
      [
        "Is an ER diagram the same as a class diagram?",
        "No. ER diagrams focus on data and cardinality; class diagrams can also include behavior, inheritance and composition.",
      ],
    ],
  },
  {
    slug: "flowchart-maker",
    type: "flowchart",
    title: "AI Flowchart Maker",
    description:
      "Generate project flowcharts from a workflow description with Drawgon. Show steps, decisions and outcomes, then download SVG, PNG or HTML.",
    intro:
      "Turn a written process into a clear flowchart. Show the main steps, decision points and outcomes without making readers untangle every edge case at once.",
    input:
      "Describe the first action, each step, decisions and final results. For every decision, explain where each outcome goes. Mention retries or loops explicitly.",
    checklist: [
      "Start with one coherent workflow.",
      "Use action labels for process steps.",
      "Give decision branches meaningful labels.",
      "Check that every path reaches an outcome or an intentional loop.",
    ],
    example:
      "For a document approval workflow, describe submission, validation, reviewer decision, revision and approval. Name what happens when a document is rejected or needs more information.",
    difference:
      "A flowchart emphasizes logic. A swimlane adds responsibility by actor; a UML activity view adds activity semantics such as start/end nodes and transitions. Drawgon includes all of these views.",
    faq: [
      [
        "Can I generate a flowchart from text?",
        "Yes. Enter your project abstract and main workflow, select Flowchart, review the project and generate using your Gemini key.",
      ],
      [
        "Can I refine only one workflow?",
        "Yes. Each diagram has its own Refine and Regenerate actions, so completed views remain available.",
      ],
    ],
  },
  {
    slug: "project-diagrams-for-students",
    type: "architecture",
    title: "Project Diagram Generator for Students",
    description:
      "Create architecture, UML, ER, flowchart and methodology diagrams for student projects with Drawgon. Explain your project and export documentation-ready files.",
    intro:
      "Build a set of project diagrams that tells one consistent story. Drawgon helps students move from an abstract and project details to architecture, UML, data and methodology views.",
    input:
      "Start with your project title and abstract. Add the technologies you actually use, major modules, the main user workflow and any known entities. A GitHub repository is optional.",
    checklist: [
      "Use architecture to explain the whole system.",
      "Add a flowchart or activity view for the main workflow.",
      "Use class or ER views when structure or data relationships matter.",
      "Use methodology for development or research stages supported by your project.",
    ],
    example:
      "For a final-year machine-learning project, describe data collection, preprocessing, model development, evaluation and application integration only if those stages are part of your work. Separate the research methodology from the software architecture.",
    difference:
      "More diagrams do not automatically make a better report. Choose the view that answers each question, review the shared blueprint, and use consistent terminology across every figure. Confirm your course’s notation and submission requirements.",
    faq: [
      [
        "Is Drawgon free to access?",
        "Drawgon requires no account or application subscription. Generation uses your own Gemini API key, so Google’s quota, pricing and terms apply.",
      ],
      [
        "Which download format should I use in a project report?",
        "Use SVG for a scalable vector figure, or PNG at 2× for broad compatibility with documents and slides. HTML preserves the standalone diagram page.",
      ],
    ],
  },
] as const;
export function pageMetadata(path: string) {
  const slug = path.replace(/^\/+|\/+$/g, "");
  const guide = guides.find((g) => g.slug === slug);
  return {
    title: guide
      ? `${guide.title} — ${BRAND.name}`
      : slug === "privacy"
        ? `Privacy — ${BRAND.name}`
        : slug === "open-source"
          ? `Open Source & Licenses — ${BRAND.name}`
          : `${BRAND.name} — AI Architecture & UML Diagram Maker`,
    description:
      guide?.description ??
      "Drawgon turns project descriptions and public GitHub repositories into architecture, UML, ER and flowchart diagrams. No signup. Export SVG, PNG and HTML.",
    url: BRAND.url + (slug ? `/${slug}` : "/"),
  };
}
