# Curriculum coverage audit

Sources: `Deep learning Syllabus.txt`, `DeepLearning_Unit-I.pptx` (191 slides), and `DeepLearning_Unit-II.pptx` (79 slides), supplied by the user. Slide text was extracted from the original PPTX XML. Image-only slides require a further visual audit; this table does not claim their embedded text was fully extracted.

The product is organized by concepts, not curriculum units. “Implemented” means an interactive parent lab exists, not that every requested subfeature is finished.

| Source topics | Canonical topic / category | Module | Coverage |
| --- | --- | --- | --- |
| Fundamentals, introduction, biological/artificial neuron, building blocks, nodes, weights, bias | Artificial Neuron / Foundations | neuron | Implemented |
| Layers, MLP, ANN, class, trainer, learning process | Neural Networks | mlp, forward, backprop | Implemented; classification toy datasets |
| Forward pass, backward pass, chain rule | Foundations | forward, backprop | Implemented; exact gradients |
| Step, linear, sigmoid, tanh, ReLU, leaky ReLU, ELU, activation choice | Activation Functions | activations | Implemented; also Softplus and GELU |
| Softmax, multiclass, categorical cross entropy | Softmax | softmax | Implemented |
| MSE, MAE, BCE, hinge | Loss Functions | losses | Implemented |
| Huber, log-cosh, focal | Loss Functions | losses | Implemented |
| Dice, IoU, triplet, contrastive, sparse categorical CE | Loss Functions | losses | Additional source topics not yet implemented |
| Vanishing/exploding gradients, saturation, dead neurons | Training & Optimization | gradient-flow, activations | Implemented |
| Convergence difficulties, local/global/spurious optima | Training & Optimization | gradient-descent, mlp | Bowl/ripple landscape and training controls implemented |
| GD, SGD, mini-batch, momentum, Nesterov, AdaGrad, RMSProp, Adam | Optimizers | optimizers, mlp | Implemented |
| AdaDelta | Optimizers | optimizers | Not yet implemented |
| Learning-rate decay | Training & Optimization | gradient-descent | Inverse-time decay implemented; other schedules outstanding |
| Zero, random, Xavier, He initialization | Training & Optimization | initialization, mlp | Implemented |
| L1, L2, dropout, early stopping | Regularization | regularization, dropout | Implemented |
| Overfitting, underfitting, bias/variance | Classical ML | overfitting | Polynomial train/validation comparison implemented |
| Preprocessing: cleaning, integration, normalization, aggregation, discretization, subset selection | Preprocessing | preprocessing, pca | Mean imputation, min-max, z-score, decimal scaling and discretization implemented; integration/aggregation/selection explanatory context |
| CNN introduction, structure, feature maps, convolution, filters | Convolutional Networks | cnn, convolution, filters, feature-maps | Computed toy pipeline implemented |
| Striding, valid/same padding, pooling, min/max/average | Convolutional Networks | stride, padding, pooling | Implemented |
| Flattening, fully connected, softmax prediction | CNN Explorer | cnn | Fixed-weight illustrative output; not a trained recognizer |
| Parameter sharing, sparse connectivity, CNN vs FC | Convolutional Networks | cnn-vs-dense | Live parameter comparison implemented |
| Grayscale, RGB, channel dimensions | Image Tensors | image-tensor | Grayscale editable; RGB channel editing outstanding |
| LeNet, AlexNet, VGG, GoogLeNet/Inception, ResNet | CNN Architectures | lenet, alexnet, vgg, inception, resnet | Inspectable overviews; MobileNet added |
| MNIST, CIFAR-10, IMDB case studies, Keras training/evaluation | CNN Explorer | cnn | Case-study trained inference not implemented |
| Vanilla RNN, branches, layers, nodes, unrolling, hidden memory | Sequence Models | rnn | Scalar recurrence implemented |
| BPTT and recurrent gradients | Sequence Models | bptt | Exact state-gradient products implemented; full parameter-gradient training outstanding |
| GRU, LSTM | Sequence Models | gru, lstm | Scalar gates, state equations and stepping implemented; vector gates outstanding |
| Bidirectional and encoder–decoder context | Sequence Models | bidirectional, seq2seq | Toy computed recurrence implemented |
| Deep, denoising, sparse autoencoders | Representation Learning | autoencoder, denoising-autoencoder, sparse-autoencoder | Actual tiny model training implemented |
| Convolutional autoencoder | Representation Learning | convolutional-autoencoder | Trainable 18-weight spatial model implemented |
| Variational autoencoder | Representation Learning | vae | Analytical reconstruction + KL training implemented |
| GAN | Generative Models | gan | Alternating affine generator/quadratic discriminator training implemented |
| Transfer types, methodologies, fine-tuning, challenges/domain shift | Transfer Learning | transfer-learning | Toy locally trained backbone freezing; expanded explanations outstanding |
| Face recognition, vehicles, medical images, voice, recommendation, translation, fraud, agriculture, manufacturing, security, spam, OCR, captioning, generative AI | Applications / relevant parent topics | cnn, seq2seq, metrics, gan | Illustrative application context; no claim of production systems |
| Revisions | Learning paths | visualizer landing | Cross-topic navigation implemented |

Additional implemented classical topics: perceptron, linear/logistic regression, KNN, Gaussian naive Bayes, decision tree, random forest, SVM, K-means, DBSCAN, PCA and classification metrics. Advanced attention computes editable Q/K/V operations.

## Corrections to source claims

- Pooling does not always halve spatial dimensions; output depends on window and stride.
- RGB convolution is ordinarily spatial Conv2D with input channels, not necessarily Conv3D.
- Linear activations can be differentiated and trained; stacked linear layers cannot represent nonlinear functions.
- ReLU does not guarantee convergence to a global minimum.
- VGG-16 counts learned convolutional/dense layers, not the input layer.
- CIFAR 32×32 images have 1024 spatial pixels, not 784.

These corrections are reflected where relevant rather than repeating misleading slide statements.
