// Info about the logged-in user.
import express from 'express';
import { pool } from '../db.js';
import { messages } from '../messages.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const usersRouter = express.Router();

usersRouter.get('/me', requireAuth, async (req, res) => {
  try {
    // Log this call for Milestone 2.
    await pool.query(
      'INSERT INTO api_usage (user_id, method, endpoint) VALUES ($1, $2, $3)',
      [req.user.id, 'GET', '/users/me']
    );

    const result = await pool.query('SELECT email, role FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: messages.userNotFound });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: messages.serverError });
  }
});
