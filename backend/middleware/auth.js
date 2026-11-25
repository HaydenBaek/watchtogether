// Everything about logins: password hashing, the JWT login cookie, and the two route guards.
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { messages } from '../messages.js';

const COOKIE_NAME = 'token';

export class Auth {
  constructor(config) {
    this.jwtSecret = config.jwtSecret;
    this.sessionSeconds = config.sessionSeconds;
    this.bcryptRounds = config.bcryptRounds;

    // Cookie settings: strict cross-site settings in production, relaxed locally.
    this.cookieOptions = {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: config.isProduction ? 'none' : 'lax',
    };
  }

  hashPassword(password) {
    return bcrypt.hash(password, this.bcryptRounds);
  }

  checkPassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
  }

  // Signs { id, role } into a JWT and stores it in an httpOnly cookie.
  logIn(res, user) {
    const token = jwt.sign({ id: user.id, role: user.role }, this.jwtSecret, {
      expiresIn: this.sessionSeconds,
    });
    res.cookie(COOKIE_NAME, token, { ...this.cookieOptions, maxAge: this.sessionSeconds * 1000 });
  }

  // clearCookie needs the same options the cookie was set with (maxAge left out), or the browser ignores it.
  logOut(res) {
    res.clearCookie(COOKIE_NAME, this.cookieOptions);
  }

  // The guards below are arrow functions so `this` still works when Express calls them.

  // Blocks the request unless the user has a valid login cookie.
  requireAuth = (req, res, next) => {
    const token = req.cookies[COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ error: messages.notLoggedIn });
    }

    try {
      // Saves { id, role } on the request for later steps to use.
      req.user = jwt.verify(token, this.jwtSecret);
      next();
    } catch (err) {
      res.status(401).json({ error: messages.sessionExpired });
    }
  };

  // Use AFTER requireAuth. Blocks the request unless the user is an admin.
  requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: messages.notAdmin });
    }
    next();
  };
}
