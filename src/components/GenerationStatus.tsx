import { useEffect, useState } from "react";
import type { Job } from "./Results";
import { BRAND } from "../config/brand";
const messages = [
  "Turning your idea into something clear…",
  "Connecting the dots…",
  "Making complexity look simple…",
  "Giving every box a reason to exist…",
  "Making the relationships make sense…",
  "Building something your team can understand at a glance…",
];
export function GenerationStatus({
  jobs,
  student,
}: {
  jobs: Record<string, Job>;
  student: boolean;
}) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const rotation = student
    ? [...messages, "Making a diagram your teacher can actually follow."]
    : messages;
  const active = Object.values(jobs)
    .filter((j) => j.state === "running")
    .map((j) => j.message);
  return (
    <div className="generation-status">
      <img
        src={BRAND.logo}
        alt=""
        width="32"
        height="32"
        style={{ objectFit: "contain", mixBlendMode: "multiply" }}
      />
      <div>
        <strong className="generation-message" key={Math.floor(seconds / 3)}>
          {rotation[Math.floor(seconds / 3) % rotation.length]}
        </strong>
        <small>{active.join(" · ") || "Preparing your diagram…"}</small>
      </div>
      <span className="elapsed">
        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
      </span>
      <div
        className="generation-track"
        role="progressbar"
        aria-label="Generating diagrams"
      >
        <span />
      </div>
    </div>
  );
}
