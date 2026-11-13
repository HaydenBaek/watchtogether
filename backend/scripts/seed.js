// Creates the demo accounts. Safe to run more than once.
import bcrypt from 'bcrypt';
import { pool } from '../db.js';

const demoUsers = [
  { email: 'john@john.com', password: '123', role: 'user' },
  { email: 'admin@admin.com', password: '111', role: 'admin' },
];

async function seed() {
  for (const user of demoUsers) {
    const hash = await bcrypt.hash(user.password, 10);
    // ON CONFLICT DO NOTHING skips accounts that already exist.
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING',
      [user.email, hash, user.role]
    );
    console.log(`${user.email}: ${result.rowCount ? 'created' : 'already exists'}`);
  }
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
