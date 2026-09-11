# Visualizer validation

Validation run: 11 September 2026, Windows, Node 24, local Chromium.

- Lint passes.
- TypeScript checking and Vite production build pass; 70 static routes are prerendered.
- 55 unit/integration tests pass, including every weight/bias in the backprop finite-difference check, VAE gradient checks, convolution/pooling fixtures, recurrent states, clustering, SVM, worker engine updates, GAN player isolation, model/experiment validation and bounded numeric controls.
- The complete 16-test browser suite passed before the latest additions, including the existing Gemini wizard wire-contract mock, local diagram editing, PNG/SVG/HTML exports and SEO routes.
- The expanded visualizer suite additionally verifies production analytics isolation, neuron shared-state restoration and local Keras model import. Topic smoke checks cover every registered lab; interactive assertions cover neuron, convolution, backprop, K-means, LSTM and MLP worker training.
- Desktop 1440px, tablet 820px and mobile 390px checks verify basic lab fit and theme switching.
- The final expanded visualizer/SEO run passed 12 tests; a separate added dark-to-white SVG export and integer-dimension test passed after explicit control labels were added. The latest runs cover all 57 registered concepts.
- LSTM and VAE layouts were visually inspected in the in-app browser. This is not a claim that every requested lab has undergone the full manual review checklist.

The tests establish the implemented toy calculations and workflows. They do not establish full specification completion, pretrained model accuracy, or exhaustive correctness of every optimizer/kernel configuration. Remaining feature and source-audit gaps are recorded in the architecture and coverage documents.
