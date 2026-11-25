// The Express app: middleware, routes and error handling.
// Importing this file does nothing on its own (no config check, no model, no port),
// so tests can build an App with fake objects. server.js is what actually starts it.
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { messages } from './messages.js';
import { MODEL_FILE } from './services/aiModel.js';
import { AuthRoutes } from './routes/auth.js';
import { UserRoutes } from './routes/users.js';
import { AdminRoutes } from './routes/admin.js';
import { RecommendationRoutes } from './routes/recommendations.js';

// Wires everything into one Express app, and starts/stops the server.
export class App {
  constructor(db, auth, classifier, tmdb) {
    this.db = db;
    this.classifier = classifier;
    this.server = null; // set by start()
    this.app = express();

    // Only our frontend may call this API, and it may send cookies.
    this.app.use(cors({ origin: config.clientOrigin, credentials: true }));
    // Bodies bigger than the limit are rejected before they are read into memory.
    this.app.use(express.json({ limit: config.maxBodySize }));
    this.app.use(cookieParser());

    // Lets the host (and us) check that the server is up.
    this.app.get('/api/v1/health', (req, res) => {
      res.status(200).json({ status: 'ok' });
    });

    // Each route group gets only the objects it needs.
    this.app.use('/api/v1/auth', new AuthRoutes(db, auth).router);
    this.app.use('/api/v1/users', new UserRoutes(db, auth).router);
    this.app.use('/api/v1/admin', new AdminRoutes(db, auth).router);
    this.app.use('/api/v1/recommendations', new RecommendationRoutes(db, auth, classifier, tmdb).router);

    // Unknown routes.
    this.app.use((req, res) => {
      res.status(404).json({ error: messages.notFound });
    });

    // Catches anything else that went wrong.
    // 4xx: the request itself was bad (e.g. broken JSON, body too large). 5xx: our fault, so log it.
    this.app.use((err, req, res, next) => {
      const status = err.status || 500;
      if (status >= 500) {
        console.error(err);
      }
      res.status(status).json({ error: status < 500 ? messages.badRequest : messages.serverError });
    });
  }

  // Load the model first, then start listening. So a request can never arrive before the model is ready.
  async start(port) {
    console.log('Loading AI model...');
    await this.classifier.load();
    console.log(`AI model ready. Running local file: ${MODEL_FILE}`);
    this.server = this.app.listen(port, () => console.log(`Server running on port ${port}`));
  }

  // Stops taking new requests, lets the open ones finish, then closes the database connections.
  // The host sends SIGTERM on every redeploy, so this avoids cutting requests off halfway.
  async stop() {
    if (this.server) {
      await new Promise((resolve) => this.server.close(resolve));
    }
    await this.db.close();
  }
}
