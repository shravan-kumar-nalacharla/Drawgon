import { afterEach, expect, test, vi } from "vitest";
import { act, render, renderHook, cleanup } from "@testing-library/react";
import { useLessonPlayer } from "../src/visualizer/lesson/useLessonPlayer";
import { locate } from "../src/visualizer/lesson/timeline";
import { neuronLesson } from "../src/visualizer/lesson/Neuron";
import { networkLesson } from "../src/visualizer/lesson/Network";
import { convolutionWindow } from "../src/visualizer/lesson/Convolution";
import { descentLesson } from "../src/visualizer/lesson/Descent";
import { memoryLesson } from "../src/visualizer/lesson/Memory";
import { lstm } from "../src/visualizer/engine/math";
import {
  neuron,
  network,
  backprop,
  convolve,
  optimize,
} from "../src/visualizer/engine/math";
import { fmt } from "../src/visualizer/components/Primitives";
const scenes = [
  { title: "Input", explanation: "", duration: 1000 },
  { title: "Output", explanation: "", duration: 2000 },
];
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
test("timeline seeks deterministically through boundaries", () => {
  expect(locate(scenes, 1500)).toMatchObject({ index: 1, progress: 0.25 });
  expect(locate(scenes, -1)).toMatchObject({ index: 0, progress: 0 });
  expect(locate(scenes, 4000)).toMatchObject({
    index: 1,
    progress: 1,
    elapsed: 3000,
  });
});
test.each([0.5, 1, 1.5, 2])("speed %s scales elapsed time", (speed) => {
  let frame: FrameRequestCallback | undefined;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frame = callback;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const { result } = renderHook(() => useLessonPlayer(scenes));
  act(() => {
    result.current.setSpeed(speed);
    result.current.toggle();
  });
  act(() => frame?.(100));
  act(() => frame?.(300));
  expect(result.current.elapsed).toBe(200 * speed);
});
test("LSTM lesson uses actual gates and describes manual overrides accurately", () => {
  const states = lstm([1, -0.5], undefined, 0.2, 0.8, [0.3, 0.4, 0.5]);
  const view = render(<>{memoryLesson(states, true).math}</>);
  expect(view.container.textContent).toContain("Manual f, i, o");
  states.forEach((s) => {
    expect(view.container.textContent).toContain(fmt(s.c));
    expect(view.container.textContent).toContain(fmt(s.h));
  });
});
test("player advances, pauses, navigates, changes speed, stops and cancels", () => {
  let frame: FrameRequestCallback | undefined;
  const cancel = vi.fn(() => {
    frame = undefined;
  });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frame = callback;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", cancel);
  const { result, unmount } = renderHook(() => useLessonPlayer(scenes));
  const tick = (time: number) => act(() => frame?.(time));
  act(() => result.current.toggle());
  tick(0);
  tick(400);
  expect(result.current.progress).toBe(0.4);
  act(() => result.current.pause());
  tick(800);
  expect(result.current.progress).toBe(0.4);
  act(() => result.current.next());
  expect(result.current.index).toBe(1);
  act(() => result.current.previous());
  expect(result.current.index).toBe(0);
  act(() => result.current.seek(1600));
  expect(result.current.progress).toBe(0.3);
  act(() => result.current.replay());
  expect(result.current.progress).toBe(0);
  act(() => result.current.setSpeed(2));
  tick(1000);
  tick(1250);
  expect(result.current.progress).toBe(0.25);
  tick(2500);
  expect(result.current.playing).toBe(false);
  expect(result.current.progress).toBe(1);
  act(() => result.current.restart());
  expect(result.current.elapsed).toBe(0);
  act(() => result.current.toggle());
  unmount();
  expect(cancel).toHaveBeenCalled();
});
test("reduced motion preserves the sequence and shows stable completed states", () => {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  const { result } = renderHook(() => useLessonPlayer(scenes));
  expect(result.current.visualProgress).toBe(1);
  act(() => result.current.next());
  expect(result.current.index).toBe(1);
});
test("neuron and network lessons expose actual engine values", () => {
  const x = [0.8, -0.2, 1],
    w = [0.4, 0.6, -0.1],
    n = neuron(x, w, 0.3, "Sigmoid"),
    lesson = neuronLesson(x, w, 0.3, "Sigmoid");
  const view = render(<>{lesson.math}</>);
  expect(view.container.textContent).toContain(`Output = ${fmt(n.a)}`);
  n.terms.forEach((t) => expect(view.container.textContent).toContain(fmt(t)));
  const net = network([2, 2, 1]),
    g = backprop(net, [0.7, 0.3], [1]);
  view.rerender(<>{networkLesson(net, [0.7, 0.3], 1, 0.1).math}</>);
  expect(view.container.textContent).toContain(fmt(g.loss));
  expect(view.container.textContent).toContain(fmt(g.gw[0][0][0]));
  expect(view.container.textContent).toContain(
    fmt(net.w[0][0][0] - 0.1 * g.gw[0][0][0]),
  );
});
test("convolution windows, products and destinations agree for stride and padding", () => {
  const input = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ],
    kernel = [
      [1, 0, -1],
      [1, 0, -1],
      [1, 0, -1],
    ];
  for (const stride of [1, 2])
    for (const pad of [0, 1]) {
      const out = convolve(input, kernel, stride, pad);
      out.flat().forEach((v, i) => {
        const state = convolutionWindow(input, kernel, stride, pad, i);
        expect(state.result).toBe(v);
        expect(state.terms.reduce((s, t) => s + t.v * t.w, 0)).toBe(v);
        expect(state.terms[0].r).toBe(state.r * stride - pad);
        expect(state.terms[0].c).toBe(state.c * stride - pad);
      });
    }
});
test("optimizer lesson math is sourced from the optimizer and handles large steps", () => {
  const view = render(<>{descentLesson("Adam", 2, 0.1, "Bowl", 0).math}</>);
  for (const h of optimize("Adam", [2], 0.1, 12).slice(1))
    expect(view.container.textContent).toContain(fmt(h.p[0]));
  for (const rate of [0.005, 0.15, 1.1]) {
    const lesson = descentLesson("Batch GD", 3, rate, "Bowl", 0);
    view.rerender(<>{lesson.render(6, 1)}</>);
    expect(view.container.innerHTML).not.toContain("NaN");
  }
});
