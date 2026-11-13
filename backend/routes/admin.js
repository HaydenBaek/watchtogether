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
    const result = await pool.query(
      'SELECT id, email, role, created_at FROM users ORDER BY id'
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: messages.serverError });
  }
});
