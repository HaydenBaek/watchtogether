// Endpoint tests: runs the real App and Auth over HTTP, with small fakes for
// the database, the AI model and TMDB. No .env, Postgres, model files or TMDB token needed.
// Run with: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { App } from '../app.js';
import { Auth } from '../middleware/auth.js';
import { messages } from '../messages.js';

// Stands in for Database: same methods, but keeps everything in arrays.
class FakeDatabase {
  users = [];
  calls = [];
  failNextQuery = false; // lets a test simulate the database going down

  #check() {
    if (this.failNextQuery) {
      this.failNextQuery = false;
      throw new Error('database is down');
    }
  }

  async createUser(email, passwordHash, role) {
    this.#check();
    if (this.users.some((user) => user.email === email)) {
      return false;
    }
    this.users.push({ id: this.users.length + 1, email, password_hash: passwordHash, role, created_at: new Date() });
    return true;
  }

  async findUserByEmail(email) {
    this.#check();
    return this.users.find((user) => user.email === email);
  }

  async getProfile(userId) {
    this.#check();
    const user = this.users.find((u) => u.id === userId);
    if (!user) return undefined;
    return { email: user.email, role: user.role, apiCalls: this.#countCalls(userId) };
  }

  async listUsersWithUsage() {
    this.#check();
    return this.users.map((u) => ({
      id: u.id, email: u.email, role: u.role, created_at: u.created_at, api_calls: this.#countCalls(u.id),
    }));
  }

  async logApiCall(userId, method, endpoint) {
    this.#check();
    this.calls.push({ userId, method, endpoint });
  }

  async close() {}

  #countCalls(userId) {
    return this.calls.filter((call) => call.userId === userId).length;
  }
}

// Stands in for GenreClassifier: picks genres from simple keywords.
class FakeClassifier {
  async detectGenres(text, useTopFallback) {
    if (text.includes('break-model')) throw new Error('model crashed');
    const genres = [];
    if (text.includes('funny')) genres.push('comedy');
    if (text.includes('scary')) genres.push('horror');
    if (genres.length === 0 && useTopFallback) genres.push('drama');
    return genres;
  }
}

// Stands in for TmdbClient: remembers what it was asked and returns one movie.
class FakeTmdb {
  requests = [];
  fail = false;

  async getMovies(likedIds, avoidIds) {
    this.requests.push({ likedIds, avoidIds });
    if (this.fail) throw new Error('TMDB is down');
    return [{ id: 1, title: 'Test Movie', year: '2020', overview: 'A movie.', poster: null }];
  }
}

const db = new FakeDatabase();
const tmdb = new FakeTmdb();
const auth = new Auth({ jwtSecret: 'test-secret', sessionSeconds: 3600, bcryptRounds: 4, isProduction: false });
let server;
let baseUrl;

before(async () => {
  const app = new App(db, auth, new FakeClassifier(), tmdb);
  // Port 0 = any free port.
  server = app.app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

  // One admin account, created directly (there is no endpoint for it, same as the seed script).
  await db.createUser('admin@test.com', await auth.hashPassword('adminpass'), 'admin');
});

after(() => new Promise((resolve) => server.close(resolve)));

// Sends a request and returns { status, data, cookie }.
async function request(method, path, { body, cookie, rawBody } = {}) {
  const headers = {};
  if (body !== undefined || rawBody !== undefined) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;

  const response = await fetch(baseUrl + path, {
    method,
    headers,
    body: rawBody ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get('set-cookie'),
  };
}

// Logs in and returns the "token=..." part of the cookie, ready to send back.
async function logIn(email, password) {
  const result = await request('POST', '/auth/login', { body: { email, password } });
  assert.equal(result.status, 200);
  return result.cookie.split(';')[0];
}

test('health check and unknown routes', async () => {
  const health = await request('GET', '/health');
  assert.deepEqual([health.status, health.data], [200, { status: 'ok' }]);

  const missing = await request('GET', '/nope');
  assert.deepEqual([missing.status, missing.data.error], [404, messages.notFound]);
});

test('register validates input and rejects a taken email', async () => {
  let result = await request('POST', '/auth/register', { body: { email: 'not-an-email', password: 'x' } });
  assert.deepEqual([result.status, result.data.error], [400, messages.invalidEmail]);

  result = await request('POST', '/auth/register', { body: { email: 'user@test.com', password: '' } });
  assert.deepEqual([result.status, result.data.error], [400, messages.passwordRequired]);

  result = await request('POST', '/auth/register', { body: { email: 'user@test.com', password: 'userpass' } });
  assert.deepEqual([result.status, result.data.message], [201, messages.registered]);

  // Emails are stored in lowercase, so a different case is still the same account.
  result = await request('POST', '/auth/register', { body: { email: 'USER@test.com', password: 'other' } });
  assert.deepEqual([result.status, result.data.error], [409, messages.emailTaken]);
});

test('login sets an httpOnly cookie, and gives one message for any wrong login', async () => {
  for (const body of [
    { email: 'user@test.com', password: 'wrong' },
    { email: 'nobody@test.com', password: 'userpass' },
    { email: 'user@test.com' },
  ]) {
    const result = await request('POST', '/auth/login', { body });
    assert.ok([400, 401].includes(result.status));
    assert.equal(result.data.error, messages.badCredentials);
  }

  const result = await request('POST', '/auth/login', { body: { email: 'user@test.com', password: 'userpass' } });
  assert.equal(result.status, 200);
  assert.match(result.cookie, /^token=/);
  assert.match(result.cookie, /HttpOnly/);
  assert.match(result.cookie, /SameSite=Lax/);
  assert.match(result.cookie, /Max-Age=3600/);
});

test('/users/me needs a valid login and counts API calls', async () => {
  let result = await request('GET', '/users/me');
  assert.deepEqual([result.status, result.data.error], [401, messages.notLoggedIn]);

  result = await request('GET', '/users/me', { cookie: 'token=garbage' });
  assert.deepEqual([result.status, result.data.error], [401, messages.sessionExpired]);

  const cookie = await logIn('user@test.com', 'userpass');
  const first = await request('GET', '/users/me', { cookie });
  assert.equal(first.status, 200);
  assert.equal(first.data.email, 'user@test.com');
  assert.equal(first.data.role, 'user');

  const second = await request('GET', '/users/me', { cookie });
  assert.equal(second.data.apiCalls, first.data.apiCalls + 1);
});

test('only admins can list users, and password hashes are never sent', async () => {
  const userCookie = await logIn('user@test.com', 'userpass');
  let result = await request('GET', '/admin/users', { cookie: userCookie });
  assert.deepEqual([result.status, result.data.error], [403, messages.notAdmin]);

  const adminCookie = await logIn('admin@test.com', 'adminpass');
  result = await request('GET', '/admin/users', { cookie: adminCookie });
  assert.equal(result.status, 200);
  assert.deepEqual(result.data.map((u) => u.email).sort(), ['admin@test.com', 'user@test.com']);
  for (const user of result.data) {
    assert.equal(user.password_hash, undefined);
  }
});

test('recommendations: bad input gets a 400 and is not counted as an API call', async () => {
  const cookie = await logIn('user@test.com', 'userpass');
  const callsBefore = db.calls.length;

  const cases = [
    [{ likes: 42 }, messages.textMustBeString],
    [{ likes: '   ' }, messages.likesRequired],
    [{ likes: 'a'.repeat(301) }, messages.textTooLong],
    [{ likes: 'funny', avoid: 'a'.repeat(301) }, messages.textTooLong],
  ];
  for (const [body, error] of cases) {
    const result = await request('POST', '/recommendations', { body, cookie });
    assert.deepEqual([result.status, result.data.error], [400, error]);
  }
  assert.equal(db.calls.length, callsBefore);
});

test('recommendations: genres go to TMDB as IDs, and avoided genres win', async () => {
  const cookie = await logIn('user@test.com', 'userpass');

  let result = await request('POST', '/recommendations', { body: { likes: 'funny', avoid: 'scary' }, cookie });
  assert.equal(result.status, 200);
  assert.deepEqual(result.data.genres, ['comedy']);
  assert.equal(result.data.movies[0].title, 'Test Movie');
  assert.deepEqual(tmdb.requests.at(-1), { likedIds: [35], avoidIds: [27] });

  // Liked and avoided are the same genre: nothing is left, so TMDB is not called.
  const tmdbCallsBefore = tmdb.requests.length;
  result = await request('POST', '/recommendations', { body: { likes: 'scary', avoid: 'scary' }, cookie });
  assert.deepEqual([result.status, result.data], [200, { genres: [], movies: [] }]);
  assert.equal(tmdb.requests.length, tmdbCallsBefore);
});

test('recommendations: model and TMDB failures get their own messages', async (t) => {
  t.mock.method(console, 'error', () => {}); // the route logs these errors; keep the test output clean
  const cookie = await logIn('user@test.com', 'userpass');

  let result = await request('POST', '/recommendations', { body: { likes: 'break-model' }, cookie });
  assert.deepEqual([result.status, result.data.error], [500, messages.modelFailed]);

  tmdb.fail = true;
  result = await request('POST', '/recommendations', { body: { likes: 'funny' }, cookie });
  tmdb.fail = false;
  assert.deepEqual([result.status, result.data.error], [500, messages.tmdbFailed]);
});

test('bad requests and unexpected errors go through the error handler', async (t) => {
  t.mock.method(console, 'error', () => {});

  let result = await request('POST', '/auth/login', { rawBody: '{not json' });
  assert.deepEqual([result.status, result.data.error], [400, messages.badRequest]);

  // Over the 10kb body limit.
  result = await request('POST', '/auth/login', { body: { email: 'a@b.co', password: 'x'.repeat(20000) } });
  assert.deepEqual([result.status, result.data.error], [413, messages.badRequest]);

  // A thrown error in an async route becomes a 500, not a crash or a hanging request.
  db.failNextQuery = true;
  result = await request('POST', '/auth/login', { body: { email: 'user@test.com', password: 'userpass' } });
  assert.deepEqual([result.status, result.data.error], [500, messages.serverError]);
});

test('logout clears the cookie', async () => {
  const result = await request('POST', '/auth/logout');
  assert.deepEqual([result.status, result.data.message], [200, messages.loggedOut]);
  assert.match(result.cookie, /^token=;/);
  assert.match(result.cookie, /Expires=Thu, 01 Jan 1970/);
});
