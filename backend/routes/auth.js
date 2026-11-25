// Register, login and logout.
import express from 'express';
import { messages } from '../messages.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AuthRoutes {
  constructor(db, auth) {
    this.db = db;
    this.auth = auth;

    // Unexpected errors are passed to next(), and the error handler in server.js answers with a 500.
    this.router = express.Router();
    this.router.post('/register', (req, res, next) => this.register(req, res).catch(next));
    this.router.post('/login', (req, res, next) => this.login(req, res).catch(next));
    this.router.post('/logout', (req, res) => this.logout(res));
  }

  async register(req, res) {
    const { email, password } = req.body;

    if (typeof email !== 'string' || !emailPattern.test(email)) {
      return res.status(400).json({ error: messages.invalidEmail });
    }
    if (typeof password !== 'string' || password === '') {
      return res.status(400).json({ error: messages.passwordRequired });
    }

    const passwordHash = await this.auth.hashPassword(password);
    const created = await this.db.createUser(email.toLowerCase(), passwordHash, 'user');
    if (!created) {
      return res.status(409).json({ error: messages.emailTaken });
    }
    res.status(201).json({ message: messages.registered });
  }

  async login(req, res) {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: messages.badCredentials });
    }

    const user = await this.db.findUserByEmail(email.toLowerCase());

    // Same message for "no such user" and "wrong password" on purpose.
    if (!user || !(await this.auth.checkPassword(password, user.password_hash))) {
      return res.status(401).json({ error: messages.badCredentials });
    }

    this.auth.logIn(res, user);
    res.status(200).json({ message: messages.loggedIn });
  }

  logout(res) {
    this.auth.logOut(res);
    res.status(200).json({ message: messages.loggedOut });
  }
}
