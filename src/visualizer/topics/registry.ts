export type Family =
  | "Foundations"
  | "Classical"
  | "Convolution"
  | "Sequence"
  | "Training"
  | "Generative"
  | "Advanced";
export type Topic = {
  id: string;
  title: string;
  category: string;
  family: Family;
  description: string;
  aliases: string[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  related: string[];
  exports: { svg: boolean; png: boolean; state: boolean };
};
const groups: [string, Family, [string, string, string, string?][]][] = [
  [
    "Data Preparation",
    "Foundations",
    [
      [
        "preprocessing",
        "Data Preprocessing",
        "Impute missing values and compare normalization and discretization.",
        "cleaning integration normalization z score min max preprocessing",
      ],
    ],
  ],
  [
    "Foundations",
    "Foundations",
    [
      [
        "neuron",
        "Artificial Neuron",
        "Change inputs, weights and bias to see a neuron respond.",
        "artificial neuron building block biological neuron",
      ],
      [
        "activations",
        "Activation Functions",
        "Compare activation curves and their local derivatives.",
        "relu sigmoid tanh gelu activation",
      ],
      [
        "forward",
        "Forward Propagation",
        "Follow weighted sums and activations through a 2–2–1 network.",
        "forward pass layers",
      ],
      [
        "backprop",
        "Backpropagation",
        "Inspect the chain rule and apply a real gradient update.",
        "backward pass back propagation derivatives",
      ],
      [
        "losses",
        "Loss Functions",
        "Compare the cost of an incorrect prediction.",
        "cross entropy mse mae hinge",
      ],
      [
        "softmax",
        "Softmax",
        "Turn logits into normalized class probabilities.",
        "categorical cross entropy logits",
      ],
    ],
  ],
  [
    "Training & Optimization",
    "Foundations",
    [
      [
        "gradient-descent",
        "Gradient Descent",
        "Follow actual optimization steps across a loss landscape.",
        "learning rate decay local spurious optima convergence",
      ],
      [
        "optimizers",
        "Optimizer Comparison",
        "Compare SGD, momentum, Nesterov and adaptive updates.",
        "adam rmsprop adagrad batch optimizer trainer",
      ],
      [
        "gradient-flow",
        "Vanishing & Exploding Gradients",
        "See how repeated derivatives shrink or amplify a signal.",
        "vanishing exploding gradients",
      ],
      [
        "initialization",
        "Weight Initialization",
        "Compare zero, small, large, Xavier and He initialization.",
        "weight variance saturation",
      ],
    ],
  ],
  [
    "Neural Networks",
    "Training",
    [
      [
        "mlp",
        "ANN / MLP Playground",
        "Train a small network on nonlinear data in your browser.",
        "multilayer perceptron ann neural network class trainer",
      ],
      [
        "xor",
        "XOR",
        "Explore why nonlinear problems need hidden representations.",
        "exclusive or linear separability",
      ],
      [
        "regularization",
        "Regularization",
        "Change L1, L2 and early stopping while watching validation loss.",
        "penalty overfit early stopping",
      ],
      [
        "dropout",
        "Dropout",
        "Train with seeded neuron masks and compare generalization.",
        "inverted dropout",
      ],
    ],
  ],
  [
    "Classical Machine Learning",
    "Classical",
    [
      [
        "perceptron",
        "Perceptron",
        "Update a linear classifier one example at a time.",
        "rosenblatt linear classifier",
      ],
      [
        "linear-regression",
        "Linear Regression",
        "Fit a line and measure the residual error.",
        "least squares slope intercept",
      ],
      [
        "logistic-regression",
        "Logistic Regression",
        "Train a probabilistic classifier and inspect its boundary.",
        "binary sigmoid classification",
      ],
      [
        "knn",
        "K-Nearest Neighbors",
        "Move a query point and inspect its neighbors and votes.",
        "knn k nearest euclidean manhattan",
      ],
      [
        "naive-bayes",
        "Gaussian Naive Bayes",
        "Combine class priors with feature likelihoods.",
        "bayes posterior probability",
      ],
      [
        "decision-tree",
        "Decision Tree",
        "Inspect splits chosen by Gini impurity or entropy.",
        "cart split tree",
      ],
      [
        "random-forest",
        "Random Forest",
        "Combine bootstrap trees and inspect their votes.",
        "ensemble bagging",
      ],
      [
        "svm",
        "Support Vector Machine",
        "Explore soft margins and linear or RBF kernels.",
        "svm support vectors",
      ],
      [
        "kmeans",
        "K-Means",
        "Alternate nearest-center assignment with centroid updates.",
        "k-means clustering sse",
      ],
      [
        "dbscan",
        "DBSCAN",
        "Discover density clusters, core points and noise.",
        "density clustering epsilon",
      ],
      [
        "pca",
        "Principal Component Analysis",
        "Project data onto its greatest-variance axis.",
        "pca eigenvectors covariance preprocessing",
      ],
      [
        "metrics",
        "Classification Metrics",
        "Change a threshold to explore confusion matrices and ROC.",
        "accuracy precision recall f1 auc",
      ],
      [
        "overfitting",
        "Overfitting & Underfitting",
        "Compare training and validation error as complexity changes.",
        "bias variance polynomial generalization",
      ],
    ],
  ],
  [
    "Convolutional Networks",
    "Convolution",
    [
      [
        "image-tensor",
        "Image Tensors",
        "Inspect pixels, spatial dimensions and channel counts.",
        "rgb grayscale tensor channels",
      ],
      [
        "convolution",
        "Convolution",
        "Multiply an editable kernel with each image window.",
        "cnn convolution kernel",
      ],
      [
        "filters",
        "Image Filters",
        "Try edge detection, blur, sharpening and embossing.",
        "filter edge detection",
      ],
      [
        "stride",
        "Stride",
        "Change the movement of the kernel and output dimensions.",
        "stride striding",
      ],
      [
        "padding",
        "Padding",
        "Keep a visible zero border and calculate the resulting shape.",
        "same valid padding",
      ],
      [
        "pooling",
        "Pooling",
        "Compare max, average and min pooling on real values.",
        "downsampling max pooling",
      ],
      [
        "cnn",
        "CNN Explorer",
        "Follow a small image through convolution, ReLU, pooling and scores.",
        "convnet mnist flatten prediction",
      ],
      [
        "feature-maps",
        "Feature Maps",
        "Inspect intermediate spatial activations.",
        "features channels relu",
      ],
      [
        "cnn-vs-dense",
        "CNN vs Fully Connected",
        "Compare shared filters with independent dense weights.",
        "parameter sharing sparsity fully connected",
      ],
    ],
  ],
  [
    "CNN Architectures",
    "Advanced",
    [
      [
        "lenet",
        "LeNet",
        "Inspect the early convolutional architecture for digits.",
      ],
      [
        "alexnet",
        "AlexNet",
        "Explore the model’s convolutional and dense stages.",
      ],
      ["vgg", "VGG", "Inspect repeated small convolution blocks."],
      [
        "inception",
        "Inception",
        "Explore parallel filters and channel concatenation.",
        "googlenet googlenet inception",
      ],
      [
        "resnet",
        "ResNet",
        "Follow a residual block and its identity shortcut.",
      ],
      [
        "mobilenet",
        "MobileNet",
        "Compare depthwise and pointwise parameter counts.",
      ],
    ],
  ],
  [
    "Sequence Models",
    "Sequence",
    [
      [
        "rnn",
        "Vanilla RNN",
        "Watch shared weights update hidden memory through time.",
        "rnn recurrent unrolling memory handling branches layers nodes",
      ],
      [
        "bptt",
        "Backpropagation Through Time",
        "Inspect exact recurrent state derivatives backward through time.",
        "bptt unrolling gradients",
      ],
      [
        "lstm",
        "LSTM",
        "Inspect forget, input and output gates along the cell-state highway.",
        "lstm forget gate long short term memory",
      ],
      [
        "gru",
        "GRU",
        "Change reset and update behavior in a gated recurrent unit.",
        "gated recurrent unit",
      ],
      [
        "bidirectional",
        "Bidirectional RNN",
        "Compare forward and backward sequence context.",
        "bidirectional",
      ],
      [
        "seq2seq",
        "Encoder–Decoder",
        "Pass an encoder context into a small recurrent decoder.",
        "sequence to sequence seq2seq translation",
      ],
    ],
  ],
  [
    "Representation Learning",
    "Generative",
    [
      [
        "autoencoder",
        "Autoencoder",
        "Train a bottleneck to reconstruct simple patterns.",
        "deep autoencoder representation",
      ],
      [
        "denoising-autoencoder",
        "Denoising Autoencoder",
        "Reconstruct clean patterns from locally generated noisy inputs.",
      ],
      [
        "sparse-autoencoder",
        "Sparse Autoencoder",
        "Train with an actual activation sparsity penalty.",
      ],
      [
        "convolutional-autoencoder",
        "Convolutional Autoencoder",
        "Explore a spatial bottleneck and reconstruction.",
      ],
      [
        "vae",
        "Variational Autoencoder",
        "Explore mean, variance, reparameterization and the Gaussian KL term.",
        "variational autoencoder vae",
      ],
    ],
  ],
  [
    "Generative Models",
    "Generative",
    [
      [
        "gan",
        "GAN",
        "Alternate real discriminator and generator gradient steps on 2D data.",
        "generative adversarial network mode collapse",
      ],
    ],
  ],
  [
    "Transfer Learning",
    "Training",
    [
      [
        "transfer-learning",
        "Transfer Learning",
        "Freeze a locally trained backbone and adapt it to another toy domain.",
        "fine tune domain shift pretrained transfer types methodologies challenges",
      ],
    ],
  ],
  [
    "Advanced",
    "Advanced",
    [
      [
        "attention",
        "Attention",
        "Inspect QKᵀ, scaled softmax and weighted value vectors.",
        "self attention transformer queries keys values",
      ],
    ],
  ],
];
export const topics: Topic[] = groups.flatMap(([category, family, items]) =>
  items.map(([id, title, description, aliases]) => ({
    id,
    title,
    category,
    family,
    description,
    aliases: (aliases ?? title.toLowerCase()).split(" "),
    difficulty:
      category === "Foundations"
        ? "Beginner"
        : category === "Advanced"
          ? "Advanced"
          : "Intermediate",
    related: items
      .filter((t) => t[0] !== id)
      .slice(0, 3)
      .map((t) => t[0]),
    exports: { svg: true, png: true, state: false },
  })),
);
export const categories = [...new Set(topics.map((t) => t.category))];
