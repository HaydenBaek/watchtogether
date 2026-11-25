// Creates the demo accounts. Safe to run more than once.
import { config } from '../config.js';
import { Database } from '../db.js';
import { Auth } from '../middleware/auth.js';

const demoUsers = [
  { email: 'john@john.com', password: '123', role: 'user' },
  { email: 'admin@admin.com', password: '111', role: 'admin' },
];

async function seed() {
  const db = new Database(config.databaseUrl);
  const auth = new Auth(config); // same password hashing as /auth/register

  for (const user of demoUsers) {
    const hash = await auth.hashPassword(user.password);
    // Accounts that already exist are skipped.
    const created = await db.createUser(user.email, hash, user.role);
    console.log(`${user.email}: ${created ? 'created' : 'already exists'}`);
  }
  await db.close();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
