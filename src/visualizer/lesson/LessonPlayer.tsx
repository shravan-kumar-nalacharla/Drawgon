import { Component, useState, type ReactNode } from "react";
import { useLessonPlayer } from "./useLessonPlayer";
import type { Lesson } from "./timeline";
import { Legend } from "./primitives";

class LessonBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p role="alert">
        This lesson could not render. Switch to Playground to continue
        exploring.
      </p>
    ) : (
      this.props.children
    );
  }
}
export function LessonShell({
  lesson,
  children,
}: {
  lesson: Lesson;
  children: ReactNode;
}) {
  const [mode, setMode] = useState("Learn");
  return (
    <section className="vl-lesson">
      <div className="vl-modes" role="tablist" aria-label="Learning mode">
        {["Learn", "Playground", "Math"].map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={mode === name}
            onClick={() => setMode(name)}
          >
            {name}
          </button>
        ))}
      </div>
      {mode === "Learn" ? (
        <LessonBoundary>
          <Player lesson={lesson} changeMode={setMode} />
        </LessonBoundary>
      ) : mode === "Math" ? (
        <section className="vl-math">
          <h2>Follow the calculation</h2>
          {lesson.render(lesson.scenes.length - 1, 1)}
          {lesson.math}
          <button onClick={() => setMode("Playground")}>
            Change parameters in Playground →
          </button>
        </section>
      ) : (
        children
      )}
    </section>
  );
}
function Player({
  lesson,
  changeMode,
}: {
  lesson: Lesson;
  changeMode: (mode: string) => void;
}) {
  const [enlarged, setEnlarged] = useState(false);
  const player = useLessonPlayer(lesson.scenes),
    scene = lesson.scenes[player.index];
  return (
    <div
      tabIndex={0}
      className="vl-player"
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).closest("input,select,textarea,button"))
          return;
        if (e.key === " ") {
          e.preventDefault();
          player.toggle();
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          player.next();
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          player.previous();
        }
        if (e.key.toLowerCase() === "r") {
          e.preventDefault();
          if (e.shiftKey) player.restart();
          else player.replay();
        }
      }}
    >
      <p className="vl-intro">{lesson.intro}</p>
      <p>
        <strong>Why do we need this?</strong> {lesson.why}
      </p>
      <button className="vl-mobile-zoom" onClick={() => setEnlarged(!enlarged)}>{enlarged ? "Fit whole diagram" : "Enlarge diagram to read labels"}</button>
      <div
        className={`vl-lesson-stage${enlarged ? " vl-enlarged" : ""}`}
        data-scene={player.index}
        data-progress={player.progress}
      >
        {lesson.render(player.index, player.visualProgress)}
      </div>
      <Legend labels={lesson.legend} />
      <div className="vl-scene-explanation" aria-live="polite">
        <small>
          STEP {player.index + 1} OF {lesson.scenes.length}
        </small>
        <h2>{scene.title}</h2>
        <p>{scene.explanation}</p>
      </div>
      <div className="vl-lesson-controls">
        <button disabled={player.index === 0} onClick={player.previous}>
          Previous
        </button>
        <button onClick={player.toggle}>
          {player.playing ? "Pause" : "Play"}
        </button>
        <button
          disabled={player.index === lesson.scenes.length - 1}
          onClick={player.next}
        >
          Next
        </button>
        <button onClick={player.replay}>Replay step</button>
        <button onClick={player.restart}>Restart lesson</button>
        <label>
          Speed{" "}
          <select
            aria-label="Lesson speed"
            value={player.speed}
            onChange={(e) => player.setSpeed(+e.target.value)}
          >
            {[0.5, 1, 1.5, 2].map((v) => (
              <option key={v} value={v}>
                {v}×
              </option>
            ))}
          </select>
        </label>
      </div>
      <input
        className="vl-lesson-progress"
        aria-label="Lesson progress"
        type="range"
        min="0"
        max={player.total}
        step="1"
        value={player.elapsed}
        onChange={(e) => player.seek(+e.target.value)}
      />
      <div className="vl-scene-ticks">
        {lesson.scenes.map((s, i) => (
          <button
            key={i}
            aria-label={`Seek to ${s.title}`}
            aria-current={player.index === i ? "step" : undefined}
            onClick={() =>
              player.seek(
                lesson.scenes.slice(0, i).reduce((n, s) => n + s.duration, 0),
              )
            }
          >
            {i + 1}
          </button>
        ))}
      </div>
      <label>
        <input
          type="checkbox"
          checked={player.reduced}
          onChange={(e) => player.setReduced(e.target.checked)}
        />{" "}
        Reduce motion
      </label>
      {player.reduced && (
        <p>
          Reduced motion: each step shows its completed calculation. Play or
          step through at your own pace.
        </p>
      )}
      {player.elapsed === player.total && (
        <div className="vl-completed">
          <h2>✓ Concept completed</h2>
          <button onClick={() => changeMode("Playground")}>
            Try it yourself →
          </button>
          <button onClick={() => changeMode("Math")}>See the math →</button>
        </div>
      )}
    </div>
  );
}
