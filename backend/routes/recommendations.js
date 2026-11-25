// Turns "what I feel like watching" text into 5 movies.
import express from 'express';
import { config } from '../config.js';
import { messages } from '../messages.js';
import { GenreClassifier } from '../services/aiModel.js';

export class RecommendationRoutes {
  constructor(db, auth, classifier, tmdb) {
    this.db = db;
    this.classifier = classifier;
    this.tmdb = tmdb;

    // Unexpected errors are passed to next(), and the error handler in server.js answers with a 500.
    this.router = express.Router();
    this.router.post('/', auth.requireAuth, (req, res, next) => this.recommend(req, res).catch(next));
  }

  async recommend(req, res) {
    const { likes, avoid = '' } = req.body;

    // Validate input.
    if (typeof likes !== 'string' || typeof avoid !== 'string') {
      return res.status(400).json({ error: messages.textMustBeString });
    }
    if (likes.trim() === '') {
      return res.status(400).json({ error: messages.likesRequired });
    }
    if (likes.length > config.maxTextLength || avoid.length > config.maxTextLength) {
      return res.status(400).json({ error: messages.textTooLong });
    }

    // Log this call for the API usage stats (only valid requests are counted).
    await this.db.logApiCall(req.user.id, 'POST', '/recommendations');

    // Step 1: the AI model finds the genres.
    let likedGenres;
    let avoidGenres = [];
    try {
      likedGenres = await this.classifier.detectGenres(likes, true);
      if (avoid.trim() !== '') {
        avoidGenres = await this.classifier.detectGenres(avoid, false);
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: messages.modelFailed });
    }

    // A genre can't be both liked and avoided, so avoiding wins.
    likedGenres = likedGenres.filter((genre) => !avoidGenres.includes(genre));
    if (likedGenres.length === 0) {
      return res.status(200).json({ genres: [], movies: [] });
    }

    // Step 2: TMDB finds the movies.
    let movies;
    try {
      const likedIds = GenreClassifier.toTmdbIds(likedGenres);
      const avoidIds = GenreClassifier.toTmdbIds(avoidGenres);
      movies = await this.tmdb.getMovies(likedIds, avoidIds);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: messages.tmdbFailed });
    }

    res.status(200).json({ genres: likedGenres, movies });
  }
}
