// Info about the logged-in user.
import express from 'express';
import { messages } from '../messages.js';

export class UserRoutes {
  constructor(db, auth) {
    this.db = db;

    // Unexpected errors are passed to next(), and the error handler in server.js answers with a 500.
    this.router = express.Router();
    this.router.get('/me', auth.requireAuth, (req, res, next) => this.getMe(req, res).catch(next));
  }

  async getMe(req, res) {
    // Log this call for the API usage stats.
    await this.db.logApiCall(req.user.id, 'GET', '/users/me');

    // Also counts how many API calls this user has made (shown on the user page).
    const profile = await this.db.getProfile(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: messages.userNotFound });
    }
    res.status(200).json(profile);
  }
}
