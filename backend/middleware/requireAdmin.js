// Use AFTER requireAuth. Blocks the request unless the user is an admin.
import { messages } from '../messages.js';

export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: messages.notAdmin });
  }
  next();
}
