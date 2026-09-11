import type { ReactNode } from "react";
import { fmt } from "../components/Primitives";
import { lerp, clamp } from "./timeline";
export type Point = [number, number];
export function Reveal({
  progress,
  children,
}: {
  progress: number;
  children: ReactNode;
}) {
  return (
    <g
      opacity={clamp(progress)}
      visibility={progress <= 0 ? "hidden" : undefined}
    >
      {children}
    </g>
  );
}
export function Edge({
  from,
  to,
  progress = 1,
  weight = 1,
  active = false,
}: {
  from: Point;
  to: Point;
  progress?: number;
  weight?: number;
  active?: boolean;
}) {
  return (
    <line
      x1={from[0]}
      y1={from[1]}
      x2={lerp(from[0], to[0], progress)}
      y2={lerp(from[1], to[1], progress)}
      stroke={active ? "var(--vl-active)" : "currentColor"}
      strokeWidth={Math.min(5, 1 + Math.abs(weight))}
      strokeDasharray={weight < 0 ? "6 4" : undefined}
      opacity={progress > 0 ? 1 : 0}
    />
  );
}
export function Signal({
  from,
  to,
  progress,
  value,
  backward = false,
}: {
  from: Point;
  to: Point;
  progress: number;
  value: number;
  backward?: boolean;
}) {
  return (
    <g
      className="vl-signal"
      transform={`translate(${lerp(from[0], to[0], progress)} ${lerp(from[1], to[1], progress)})`}
    >
      <rect
        x="-33"
        y="-14"
        width="66"
        height="28"
        rx="7"
        fill="var(--vl-paper)"
        stroke="var(--vl-active)"
        strokeWidth="2"
        strokeDasharray={backward ? "4 3" : undefined}
      />
      <text textAnchor="middle" y="5" fill="var(--vl-ink)" fontSize="13">
        {backward ? "‹ " : ""}
        {fmt(value)}
        {backward ? "" : " ›"}
      </text>
    </g>
  );
}
export function NumberText({
  from,
  to,
  progress,
  x,
  y,
}: {
  from: number;
  to: number;
  progress: number;
  x: number;
  y: number;
}) {
  return (
    <text x={x} y={y} textAnchor="middle" fill="currentColor">
      {fmt(lerp(from, to, progress))}
    </text>
  );
}
export function Node({
  at,
  value,
  label,
  active = false,
}: {
  at: Point;
  value: number | string;
  label?: string;
  active?: boolean;
}) {
  return (
    <g>
      <circle
        cx={at[0]}
        cy={at[1]}
        r="34"
        fill="var(--vl-paper)"
        stroke={active ? "var(--vl-active)" : "currentColor"}
        strokeWidth={active ? 3 : 1.5}
      />
      <text x={at[0]} y={at[1] + 5} textAnchor="middle" fill="currentColor">
        {typeof value === "number" ? fmt(value) : value}
      </text>
      {label && (
        <text x={at[0]} y={at[1] + 56} textAnchor="middle" fill="currentColor">
          {label}
        </text>
      )}
    </g>
  );
}
export function Legend({ labels }: { labels?: string[] }) {
  if (labels)
    return (
      <div className="vl-legend" aria-label="Visual legend">
        {labels.map((label, i) => (
          <span key={label}>
            <i
              className={`vl-sample${i === 1 ? " vl-current" : ""}${i === 2 ? " vl-negative" : ""}`}
            />
            {label}
          </span>
        ))}
      </div>
    );
  return (
    <div className="vl-legend" aria-label="Connection legend">
      <span>
        <i className="vl-sample" />
        Positive weight
      </span>
      <span>
        <i className="vl-sample vl-negative" />
        Negative weight
      </span>
      <span>
        <i className="vl-sample vl-current" />
        Active signal →
      </span>
      <span>
        <i className="vl-sample vl-current vl-negative" />← Backward gradient
      </span>
    </div>
  );
}
