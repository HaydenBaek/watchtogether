// Starts the Express server.
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { messages } from './messages.js';
import { loadModel } from './services/aiModel.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { adminRouter } from './routes/admin.js';
import { recommendationsRouter } from './routes/recommendations.js';

const app = express();

// Only our frontend may call this API, and it may send cookies.
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/recommendations', recommendationsRouter);

// Unknown routes.
app.use((req, res) => {
  res.status(404).json({ error: messages.notFound });
});

// Catches anything else that went wrong (e.g. bad JSON in the request body).
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: status === 400 ? messages.badRequest : messages.serverError });
});

// Load the model first, then start listening.
async function start() {
  console.log('Loading AI model...');
  await loadModel();
  console.log('AI model ready.');
  app.listen(config.port, () => console.log(`Server running on port ${config.port}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
