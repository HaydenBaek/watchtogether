// Admin-only routes.
import express from 'express';
import { pool } from '../db.js';
import { messages } from '../messages.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

export const adminRouter = express.Router();

adminRouter.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    // password_hash is NOT selected, so it can never leak.
    // api_calls is the start of the Milestone 2 API statistics dashboard.
    const result = await pool.query(
      `SELECT u.id, u.email, u.role, u.created_at, COUNT(a.id)::int AS api_calls
       FROM users u LEFT JOIN api_usage a ON a.user_id = u.id
       GROUP BY u.id
       ORDER BY u.id`
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: messages.serverError });
  }
});
