# Drawgon open-source notices

The original Diagram Design assets remain governed by the notices in `LICENSE`, `THIRD_PARTY_LICENSES.md` and `src/vendor/diagram-design/UPSTREAM.md`.

The AI / ML Visualizer uses original TypeScript implementations of standard mathematical algorithms. No source, pretrained weights, screenshots or illustrations were copied from the research references below. **Design reference only — no source copied.**

| Reference | Reviewed revision | License reported by repository | Interaction studied |
| --- | --- | --- | --- |
| [NeuralNetworkVisualizer](https://github.com/sebastiantramontana/NeuralNetworkVisualizer) | 6c097e25a18477cdbd2bb35bd28f32b736faebed | MIT | Weighted edges, selection, bias and labels; deprecated WinForms implementation not reused |
| [NeuralNetwork.Visualizer](https://github.com/sebastiantramontana/NeuralNetwork.Visualizer) | 78801373441c14737d3d6285981441c5e2705c25 | MIT | Successor's network inspection conventions |
| [Netron](https://github.com/lutzroeder/netron) | e4d7f9b95752ff28471022e70272bc680827fde6 | MIT | Operator graph versus neuron graph; Keras configuration and metadata inspection |
| [TensorFlow Playground](https://github.com/tensorflow/playground) | 02469bd3751764b20486015d4202b792af5362a6 | Apache-2.0 | Dataset controls, training and decision surfaces |
| [CNN Explainer](https://github.com/poloclub/cnn-explainer) | d0971f9447ed9806022a3d47587b62394682bc51 | MIT | Overview/detail, kernel multiplication and feature maps |
| [GAN Lab](https://github.com/poloclub/ganlab) | 09073e8d8c05ff572e287ba5e69007b3fb9101cd | Apache-2.0 | Alternating training and 2D discriminator surface |

Additional reading: [Understanding LSTM Networks](https://colah.github.io/posts/2015-08-Understanding-LSTMs/), [Visualizing memorization in RNNs](https://distill.pub/2019/memorization-in-rnns/), and [Anomagram](https://github.com/victordibia/anomagram). These informed explanatory structure only; no code or artwork was copied. Anomagram reports MIT licensing. No rights to these projects' trademarks are implied.

Existing npm dependencies retain their individual licenses. No new runtime dependency was added for the visualizer. React renders the interface; Zod validates imported model and experiment data. No TensorFlow.js, Netron bundle, external model runtime or remote iframe is included.
