# Animation lessons

## Delivery and validation

Created the `src/visualizer/lesson/` timeline, player, primitives and topic lesson modules, this document, `tests/visualizer-lessons.test.tsx` and `tests/e2e/lessons.spec.ts`. Modified Visualizer, shared Primitives, Foundations, Convolution, Sequence, the topic registry, visualizer CSS, existing visualizer E2E tests, README and architecture documentation.

The five requested flagship lessons are implemented, plus Forward Propagation, RNN, GRU and BPTT. All shared network views now label input/hidden/output layers, offer signal playback, and show solid/dashed/color samples. Other catalog topics keep their existing Playground; this is not a claim that every catalog entry has a dedicated authored lesson.

Validation: `npm install` completed with no vulnerabilities; `npm run lint` passed; `npm run test` passed 66 tests; `npm run build` passed TypeScript and prerendered 70 routes. The full Playwright suite passed 33 tests; all three responsive Learn tests were rerun after the final mobile fit/enlarge change and passed. Browser inspection covered the flagship scenes, desktop/mobile, dark mode, reduced motion and playback speed. The LSTM token overlap and convolution calculation timing found during inspection were corrected.

Current constraints: recurrent models are scalar demonstrations, gradient-descent Learn uses a one-dimensional trajectory, and dense Playground signal displays limit simultaneous animated connections to the first eight neurons per layer. On small screens, use Enlarge diagram for readable labels and Fit whole diagram for the complete flow. No animation dependency, server or database was added.

The visualizer retains the existing math engines and topic components. A topic passes a `Lesson` to `LabLayout`; the layout exposes Learn, Playground and Math. Parameter state remains in the topic component, above the mode switch, so changing modes does not reset inputs, weights, kernels or gates. Neuron experiment JSON and fragment links continue to describe Playground parameters.

## Timeline

`lesson/timeline.ts` defines scenes with titles, explanations and millisecond durations. `locate` maps elapsed time to a scene and fractional progress. `useLessonPlayer` uses one timestamp-based requestAnimationFrame loop and cancels it on pause, speed change, completion and unmount. Navigation and seeking operate on elapsed time, not accumulated visual mutations. Rendering is a pure function of scene, progress and current engine results.

Only the local player rerenders on animation frames; training workers and the rest of the page are outside that loop. Playback supports 0.5×, 1×, 1.5× and 2×, scene selection, scrubbing, replay and restart. Focus the player to use Space, Left/Right, R and Shift+R. Form controls retain their normal keyboard behavior.

The system respects prefers-reduced-motion and offers an explicit local checkbox override. Reduced motion shows each scene's completed calculation while keeping the sequence and timings. Switching modes unmounts the player and cancels its animation; returning to Learn starts a fresh lesson. A render error is contained inside Learn, with Playground still available.

## Visuals and calculations

`lesson/primitives.tsx` supplies growing edges, moving value tokens, progressive reveals, interpolated numbers, nodes and line-sample legends. SVG frames use the existing Figure and SVG/PNG exporter. Export serializes the currently displayed frame; Math includes the completed figure and numerical derivation. Color uses semantic theme variables. Negative weights and backward tokens have dashed treatments so color is not the only distinction.

- Neuron: `neuron` supplies contributions, weighted sum with bias, and activation. The seven scenes construct the computation.
- Forward/backprop: `backprop` supplies forward activations, loss and derivatives; the update uses those exact weight and bias gradients, then evaluates the updated network.
- Descent: `optimize`, `objective` and `gradient` provide the actual one-dimensional trajectory, curve and tangent. Playground retains its original two-parameter trajectory.
- Convolution: `convolve` supplies every output; window coordinates and source values use the selected stride and padding. Each destination is written after its source operation.
- LSTM: `lstm` supplies the memory, forget/input/output gates and hidden state at every time step. This is explicitly a scalar numeric example, not a trained language model.
- RNN/GRU/BPTT: engine states drive recurrent value flow and backward sensitivity. Network playgrounds also expose a shared signal-flow player.

The large unrelated catalog remains usable. A dedicated lesson must explain its algorithm; a generic fade is not sufficient to call a topic converted. Convolution-related aliases currently share the convolution lesson.

## Add a lesson

Keep the engine as the only mathematical source. A small lesson can be authored next to its topic:

```tsx
const result = neuron(inputs, weights, bias, activation);
const lesson: Lesson = {
  intro: "A weighted input is one contribution to a neuron's response.",
  why: "Weights let different inputs have different influence.",
  scenes: [
    { title: "Read the value", explanation: "Start at the input.", duration: 2500 },
    { title: "Carry its contribution", explanation: "Multiply by the weight.", duration: 3500 },
  ],
  render: (scene, progress) => (
    <Figure title="One contribution">
      <Node at={[100, 180]} value={inputs[0]} />
      {scene === 1 && <Signal from={[140, 180]} to={[540, 180]}
        progress={progress} value={result.terms[0]} />}
    </Figure>
  ),
  math: <Formula symbol="x₁ × w₁" result={fmt(result.terms[0])} />,
};
return <LabLayout lesson={lesson} controls={controls}>{existingPlayground}</LabLayout>;
```

Test the timeline independently with controlled animation timestamps. Compare displayed calculations against engine outputs for non-default parameters. Test seeking without playing prior frames, pause stability, mode changes, and current-frame exports. Finally watch the full lesson in the browser at normal and slow speed, inspect mobile scrolling and dark mode, and test reduced motion. Existing tests live in `tests/visualizer-lessons.test.tsx` and `tests/e2e/lessons.spec.ts`.
