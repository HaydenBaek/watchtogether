// Starts the server: checks the settings, builds the real objects, and listens.
// The app itself (routes, middleware) is in app.js.
import { config, checkRequiredConfig } from './config.js';
import { App } from './app.js';
import { Database } from './db.js';
import { Auth } from './middleware/auth.js';
import { GenreClassifier } from './services/aiModel.js';
import { TmdbClient } from './services/tmdb.js';

checkRequiredConfig();

const app = new App(
  new Database(config.databaseUrl),
  new Auth(config),
  new GenreClassifier(config.genreThreshold, config.allowModelDownload),
  new TmdbClient(config.tmdbToken, config.tmdbTimeoutMs, config.movieCount, config.tmdbCacheMs, config.tmdbCacheSize)
);

app.start(config.port).catch((err) => {
  console.error(err);
  process.exit(1);
});

// SIGTERM: the host is stopping us. SIGINT: Ctrl+C in the terminal.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`${signal} received, shutting down...`);
    app.stop()
      .then(() => process.exit(0))
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  });
}
