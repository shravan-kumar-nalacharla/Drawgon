import {
  epoch,
  type TrainOptions,
  type TrainState,
  type Sample,
} from "./training";
self.onmessage = (
  event: MessageEvent<{
    state: TrainState;
    samples: Sample[];
    validation: Sample[];
    options: TrainOptions;
    steps: number;
    revision: number;
  }>,
) => {
  try {
    let state = event.data.state;
    for (let i = 0; i < Math.min(20, event.data.steps); i++)
      state = epoch(
        state,
        event.data.samples,
        event.data.validation,
        event.data.options,
      );
    self.postMessage({ state, revision: event.data.revision });
  } catch (error) {
    self.postMessage({
      revision: event.data.revision,
      error: error instanceof Error ? error.message : "Training failed.",
    });
  }
};
