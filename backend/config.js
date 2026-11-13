// Reads settings from the .env file and puts them in one place.
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  isProduction: process.env.NODE_ENV === 'production',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  tmdbToken: process.env.TMDB_TOKEN,
  clientOrigin: process.env.CLIENT_ORIGIN,
  allowModelDownload: process.env.ALLOW_MODEL_DOWNLOAD !== 'false',

  jwtExpiresIn: '1h',
  maxTextLength: 300,
  genreThreshold: 0.7, // labels scoring above this are kept
  movieCount: 5,
  tmdbTimeoutMs: 5000,
};
