// Turns "what I feel like watching" text into 5 movies.
import express from 'express';
import { pool } from '../db.js';
import { config } from '../config.js';
import { messages } from '../messages.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { detectGenres, genreIds } from '../services/aiModel.js';
import { getMovies } from '../services/tmdb.js';

export const recommendationsRouter = express.Router();

recommendationsRouter.post('/', requireAuth, async (req, res) => {
  try {
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

    // Log this call for Milestone 2.
    await pool.query(
      'INSERT INTO api_usage (user_id, method, endpoint) VALUES ($1, $2, $3)',
      [req.user.id, 'POST', '/recommendations']
    );

    // Step 1: the AI model finds the genres.
    let likedGenres;
    let avoidGenres = [];
    try {
      likedGenres = await detectGenres(likes, true);
      if (avoid.trim() !== '') {
        avoidGenres = await detectGenres(avoid, false);
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
      const likedIds = likedGenres.map((genre) => genreIds[genre]);
      const avoidIds = avoidGenres.map((genre) => genreIds[genre]);
      movies = await getMovies(likedIds, avoidIds);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: messages.tmdbFailed });
    }

    res.status(200).json({ genres: likedGenres, movies });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: messages.serverError });
  }
});
