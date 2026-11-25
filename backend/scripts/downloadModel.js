// Downloads the Hugging Face model into backend/models. Run once (or as a build step on the host).
// After this, start the server with ALLOW_MODEL_DOWNLOAD=false so it only uses the local files.
import { config } from '../config.js';
import { GenreClassifier, MODEL_NAME, MODELS_DIR } from '../services/aiModel.js';

// Downloads are always allowed here (true), whatever ALLOW_MODEL_DOWNLOAD says.
const classifier = new GenreClassifier(config.genreThreshold, true);

console.log(`Downloading ${MODEL_NAME} into ${MODELS_DIR} ...`);
await classifier.load();
console.log('Model downloaded.');
