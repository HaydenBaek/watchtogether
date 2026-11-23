// Turns free text into movie genres using a self-hosted Hugging Face model.
import { pipeline, env } from '@huggingface/transformers';
import { fileURLToPath } from 'url';
import path from 'path';
import { config } from '../config.js';

// Store model files in backend/models (works no matter which folder you start node from).
export const MODELS_DIR = fileURLToPath(new URL('../models', import.meta.url));
env.cacheDir = MODELS_DIR;

// If downloads are turned off, only the local files can be used.
if (!config.allowModelDownload) {
  env.allowRemoteModels = false;
}

export const MODEL_NAME = 'MoritzLaurer/deberta-v3-xsmall-zeroshot-v1.1-all-33';

// 'q8' loads onnx/model_quantized.onnx (~87 MB) instead of the fp32 model.onnx (~280 MB),
// so the server fits in a 512 MB free hosting plan.
const MODEL_DTYPE = 'q8';

// The exact file the server runs (shown at startup so we can point to it when marked).
export const MODEL_FILE = path.join(MODELS_DIR, MODEL_NAME, 'onnx', 'model_quantized.onnx');

// ONNX Runtime's graph optimizations turn the 8-bit weights back into 32-bit copies,
// which costs ~100 MB of RAM. Turning them off keeps the server well under 512 MB
// (measured on Linux: ~345 MB vs ~437 MB) with the same genres, at ~0.3 s per call instead of ~0.1 s.
const SESSION_OPTIONS = { graphOptimizationLevel: 'disabled' };

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
  classifier = await pipeline('zero-shot-classification', MODEL_NAME, {
    dtype: MODEL_DTYPE,
    session_options: SESSION_OPTIONS,
  });
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
