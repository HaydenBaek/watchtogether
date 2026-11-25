// Admin-only routes.
import express from 'express';

export class AdminRoutes {
  constructor(db, auth) {
    this.db = db;

    // Unexpected errors are passed to next(), and the error handler in app.js answers with a 500.
    this.router = express.Router();
    this.router.get('/users', auth.requireAuth, auth.requireAdmin,
      (req, res, next) => this.listUsers(req, res).catch(next));
  }

  // Every user with their API call count (never their password hash).
  async listUsers(req, res) {
    const users = await this.db.listUsersWithUsage();
    res.status(200).json(users);
  }
}
