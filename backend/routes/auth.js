// Register, login and logout.
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { config } from '../config.js';
import { messages } from '../messages.js';

export const authRouter = express.Router();

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const oneHourInMs = 60 * 60 * 1000;

// Cookie settings: strict cross-site settings in production, relaxed locally.
function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? 'none' : 'lax',
    maxAge: oneHourInMs,
  };
}

authRouter.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || !emailPattern.test(email)) {
      return res.status(400).json({ error: messages.invalidEmail });
    }
    if (typeof password !== 'string' || password === '') {
      return res.status(400).json({ error: messages.passwordRequired });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)',
      [email.toLowerCase(), passwordHash, 'user']
    );
    res.status(201).json({ message: messages.registered });
  } catch (err) {
    // 23505 is PostgreSQL's "unique value already exists" error.
    if (err.code === '23505') {
      return res.status(409).json({ error: messages.emailTaken });
    }
    console.error(err);
    res.status(500).json({ error: messages.serverError });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: messages.badCredentials });
    }

    const result = await pool.query(
      'SELECT id, password_hash, role FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = result.rows[0];

    // Same message for "no such user" and "wrong password" on purpose.
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: messages.badCredentials });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });
    res.cookie('token', token, cookieOptions());
    res.status(200).json({ message: messages.loggedIn });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: messages.serverError });
  }
});

authRouter.post('/logout', (req, res) => {
  // maxAge is left out on purpose; clearCookie needs the other options to match.
  const { maxAge, ...options } = cookieOptions();
  res.clearCookie('token', options);
  res.status(200).json({ message: messages.loggedOut });
});
