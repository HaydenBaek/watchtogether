// Blocks the request unless the user has a valid login cookie.
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { messages } from '../messages.js';

export function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: messages.notLoggedIn });
  }

  try {
    // Saves { id, role } on the request for later steps to use.
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch (err) {
    res.status(401).json({ error: messages.sessionExpired });
  }
}
