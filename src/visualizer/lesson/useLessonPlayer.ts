import { useEffect, useState } from "react";
import { locate, type Scene } from "./timeline";

export function useLessonPlayer(scenes: Scene[], revision?: string) {
  const [time, setTime] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1);
  const [reduced, setReduced] = useState(false);
  const state = locate(scenes, time);
  const running = playing && time < state.total;
  useEffect(() => {
    if (revision === undefined) return;
    setTime(0);
    setPlaying(true);
  }, [revision]);
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!running) return;
    let frame = 0,
      previous: number | undefined;
    const tick = (now: number) => {
      if (previous !== undefined) {
        const delta = (now - previous) * speed;
        setTime((t) => Math.min(state.total, t + delta));
      }
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, speed, state.total]);
  const go = (index: number) => {
    setPlaying(false);
    setTime(
      scenes
        .slice(0, Math.max(0, Math.min(scenes.length - 1, index)))
        .reduce((n, s) => n + s.duration, 0),
    );
  };
  return {
    ...state,
    playing: running,
    speed,
    setSpeed,
    reduced,
    setReduced,
    visualProgress: reduced ? 1 : state.progress,
    toggle: () => {
      if (time >= state.total) setTime(0);
      setPlaying(!running);
    },
    pause: () => setPlaying(false),
    next: () => go(state.index + 1),
    previous: () => go(state.index - 1),
    restart: () => go(0),
    replay: () => {
      go(state.index);
      setPlaying(true);
    },
    seek: (value: number) => {
      setPlaying(false);
      setTime(Math.max(0, Math.min(state.total, value)));
    },
  };
}
