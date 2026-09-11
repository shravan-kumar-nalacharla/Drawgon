import type { ReactNode } from "react";

export type Scene = { title: string; explanation: string; duration: number };
export type Lesson = {
  legend?: string[];
  intro: string;
  why: string;
  scenes: Scene[];
  render: (scene: number, progress: number) => ReactNode;
  math: ReactNode;
};
export const clamp = (p: number) => Math.max(0, Math.min(1, p));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * clamp(p);
export const ease = (p: number) => {
  const t = clamp(p);
  return t * t * (3 - 2 * t);
};
export const part = (p: number, start = 0, end = 1) =>
  clamp((p - start) / (end - start));
export const revealed = (scene: number, at: number, p: number) =>
  scene > at ? 1 : scene === at ? p : 0;
export function locate(scenes: Scene[], time: number) {
  const total = scenes.reduce((n, s) => n + s.duration, 0);
  const elapsed = Math.max(0, Math.min(total, time));
  let start = 0;
  for (let i = 0; i < scenes.length; i++) {
    if (elapsed < start + scenes[i].duration || i === scenes.length - 1)
      return {
        index: i,
        progress: clamp((elapsed - start) / scenes[i].duration),
        total,
        elapsed,
      };
    start += scenes[i].duration;
  }
  throw new Error("A lesson needs at least one scene.");
}
