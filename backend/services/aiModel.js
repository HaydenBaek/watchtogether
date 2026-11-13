// Turns free text into movie genres using a self-hosted Hugging Face model.
import { pipeline, env } from '@huggingface/transformers';
import { config } from '../config.js';

// Store model files in backend/models.
env.cacheDir = './models';

// If downloads are turned off, only the local files can be used.
if (!config.allowModelDownload) {
  env.allowRemoteModels = false;
}

const MODEL_NAME = 'MoritzLaurer/deberta-v3-xsmall-zeroshot-v1.1-all-33';

// Genre label -> TMDB genre ID.
export const genreIds = {
  comedy: 35,
  drama: 18,
  action: 28,
  horror: 27,
  romance: 10749,
  mystery: 9648,
  thriller: 53,
  'science fiction': 878,
  animation: 16,
  family: 10751,
  documentary: 99,
  adventure: 12,
  fantasy: 14,
  crime: 80,
};

const genreLabels = Object.keys(genreIds);

// Holds the loaded model so we only load it once.
let classifier = null;

// Call this once when the server starts.
export async function loadModel() {
  classifier = await pipeline('zero-shot-classification', MODEL_NAME);
}

// Returns genre names whose score is above the threshold.
// If none pass and useTopFallback is true, returns the single best genre.
export async function detectGenres(text, useTopFallback) {
  const result = await classifier(text, genreLabels, { multi_label: true });

  // result.labels and result.scores are sorted from best to worst.
  const passed = result.labels.filter((label, i) => result.scores[i] > config.genreThreshold);

  if (passed.length === 0 && useTopFallback) {
    return [result.labels[0]];
  }
  return passed;
}
