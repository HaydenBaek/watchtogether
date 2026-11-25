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

  sessionSeconds: 60 * 60, // a login lasts 1 hour (used by both the JWT and the cookie)
  bcryptRounds: 10,
  maxBodySize: '10kb', // inputs are at most 300 characters, so 10 KB is plenty
  maxTextLength: 300,
  genreThreshold: 0.7, // labels scoring above this are kept
  movieCount: 5,
  tmdbTimeoutMs: 5000,
  tmdbCacheMs: 10 * 60 * 1000, // TMDB answers are reused for 10 minutes
  tmdbCacheSize: 50, // at most 50 genre combinations are kept in memory
};

// The server can't work without these, so it stops right away if one is missing
// (instead of failing later, e.g. at the first login).
export function checkRequiredConfig() {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'TMDB_TOKEN', 'CLIENT_ORIGIN'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing settings in .env: ${missing.join(', ')}`);
  }
}
