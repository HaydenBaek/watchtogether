// Talks to PostgreSQL. Every SQL query in the app lives in this class.
// All queries use parameters ($1, $2...), which prevents SQL injection.
import pg from 'pg';

export class Database {
  constructor(connectionString) {
    // One shared connection pool. A few connections are plenty for this app,
    // and each open connection costs memory on both the server and the database.
    this.pool = new pg.Pool({ connectionString, max: 5 });

    // Without this, a dropped idle connection (e.g. the database restarts) would crash the server.
    this.pool.on('error', (err) => console.error('Database connection error:', err.message));
  }

  // Returns true if the user was created, false if the email is already taken.
  async createUser(email, passwordHash, role) {
    const result = await this.pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING',
      [email, passwordHash, role]
    );
    return result.rowCount === 1;
  }

  // Returns { id, password_hash, role }, or undefined if there is no such user.
  async findUserByEmail(email) {
    const result = await this.pool.query(
      'SELECT id, password_hash, role FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  // Returns { email, role, apiCalls } for one user, or undefined if the user is gone.
  async getProfile(userId) {
    const result = await this.pool.query(
      `SELECT u.email, u.role, COUNT(a.id)::int AS "apiCalls"
       FROM users u LEFT JOIN api_usage a ON a.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    );
    return result.rows[0];
  }

  // Every user with their API call count.
  // password_hash is NOT selected, so it can never leak.
  async listUsersWithUsage() {
    const result = await this.pool.query(
      `SELECT u.id, u.email, u.role, u.created_at, COUNT(a.id)::int AS api_calls
       FROM users u LEFT JOIN api_usage a ON a.user_id = u.id
       GROUP BY u.id
       ORDER BY u.id`
    );
    return result.rows;
  }

  // Saves one row per API call (shown as "API calls" on the user and admin pages).
  async logApiCall(userId, method, endpoint) {
    await this.pool.query(
      'INSERT INTO api_usage (user_id, method, endpoint) VALUES ($1, $2, $3)',
      [userId, method, endpoint]
    );
  }

  // Runs the contents of sql/schema.sql.
  async runSchema(sql) {
    await this.pool.query(sql);
  }

  // Closes every connection (used on shutdown and at the end of scripts).
  async close() {
    await this.pool.end();
  }
}
