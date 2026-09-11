# AI / ML Visualizer architecture

## Product boundaries

`/diagrams` retains the existing project-diagram workflow. `/visualizer` is a separate, key-free learning environment. Neither a database nor authentication was added. Lab calculations do not call Gemini. Direct visualizer visits do not load the existing Google Analytics tag; shared neuron state stays in the URL fragment.

## Implementation

- `topics/registry.ts` owns category, title, aliases, description, difficulty, family, related-topic IDs and export flags. The landing page progressively reveals categories and supports search.
- Topic families load using React.lazy. The global home does not load the math engine, model viewer or training worker. Vite emits a separate module-worker asset.
- `engine/math.ts` contains stable activations, forward/backprop, convolution, pooling, recurrent cells, PCA, clustering helpers and optimizer trajectories.
- `engine/classical.ts` contains regression, Gaussian naive Bayes, nearest neighbors, decision trees, bootstrap forests, bounded SMO-style SVM optimization and DBSCAN.
- `engine/training.ts` performs actual mini-batch gradients, seeded inverted dropout, L1/L2 gradients, freezing and Adam/SGD. `training.worker.ts` keeps repeated MLP work off the main thread. History is bounded, and training is capped.
- `engine/autoencoder.ts` implements an analytical VAE and a tiny 18-weight convolutional autoencoder using central-difference gradients. `engine/generative.ts` implements alternating gradients for a small affine GAN. These deliberately small models run on CPU; no TensorFlow.js or GPU dependency is needed.
- SVG renders inspectable networks, plots, sequences, matrices and architecture blocks. Native HTML provides controls, formulas and inspectors. Canvas is used for image decoding and PNG export.
- `export/index.ts` serializes computed SVG styles, supports current/full figures with formulas, 1–3× PNG and transparent/current/white backgrounds, revokes object URLs and limits raster size to 40 megapixels.
- `state/experiment.ts` validates restorable neuron experiments with Zod. Other topic state currently stays in React memory; their controls do not yet have full JSON round trips.
- The model viewer accepts Keras JSON configuration only, with a 5 MB/500-layer cap. It does not load external weight paths or execute imported code. It draws declared Keras inbound edges and Sequential connections, and exposes raw operator metadata. Nested groups and inferred tensor shapes are not expanded.

## Static hosting

The prerenderer waits for React lazy modules and writes HTML for each registered route. Vercel clean URLs serve these artifacts without functions. The production sitemap includes all topic routes. All models and datasets used by educational labs are generated locally.

## Current limits and unfinished specification details

The implemented labs are intentionally small. CNN inference uses fixed illustrative weights and does not claim to recognize MNIST. A pretrained digit recognizer, RGB channel tensor editor, detailed multi-layer CNN shape inspector, multi-dimensional LSTM gates, drag-to-move points, graph pan/group collapse, and general experiment import/export remain outstanding. Transfer learning uses a locally trained toy backbone, not downloaded pretrained weights. Some topic aliases share a parent lab. Explanation modes currently add guidance rather than providing separately authored content for every topic.

The model viewer does not support ONNX, TFLite, binary Keras or PyTorch exports. The UI states these limits. This document does not mark the full requested product specification complete.
