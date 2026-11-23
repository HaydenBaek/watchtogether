// Downloads the Hugging Face model into backend/models. Run once (or as a build step on the host).
// After this, start the server with ALLOW_MODEL_DOWNLOAD=false so it only uses the local files.
process.env.ALLOW_MODEL_DOWNLOAD = 'true';

// Imported after the line above so aiModel.js sees downloads as allowed.
const { loadModel, MODEL_NAME, MODELS_DIR } = await import('../services/aiModel.js');

console.log(`Downloading ${MODEL_NAME} into ${MODELS_DIR} ...`);
await loadModel();
console.log('Model downloaded.');
