// TmdbClient tests: fetch is replaced with a fake, so no TMDB token or network is needed.
// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TmdbClient } from '../services/tmdb.js';
import { GenreClassifier } from '../services/aiModel.js';

// A fake TMDB answer with 6 movies (the client should keep only movieCount of them).
const tmdbAnswer = {
  results: [
    { id: 1, title: 'First', release_date: '2020-05-01', overview: 'One.', poster_path: '/one.jpg' },
    { id: 2, title: 'Second', release_date: '', overview: 'Two.', poster_path: null },
    { id: 3, title: 'Third', release_date: '2018-01-01', overview: '', poster_path: null },
    { id: 4, title: 'Fourth', release_date: '2017-01-01', overview: '', poster_path: null },
    { id: 5, title: 'Fifth', release_date: '2016-01-01', overview: '', poster_path: null },
    { id: 6, title: 'Sixth', release_date: '2015-01-01', overview: '', poster_path: null },
  ],
};

// Replaces fetch for one test. Returns the list of requests that were made.
function fakeFetch(t, { ok = true, status = 200 } = {}) {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, options });
    return { ok, status, json: async () => tmdbAnswer };
  });
  return requests;
}

function makeClient({ cacheMs = 60000, cacheSize = 50 } = {}) {
  return new TmdbClient('test-token', 5000, 5, cacheMs, cacheSize);
}

test('toTmdbIds turns genre names into TMDB IDs', () => {
  assert.deepEqual(GenreClassifier.toTmdbIds(['comedy', 'science fiction', 'horror']), [35, 878, 27]);
});

test('builds the discover URL and formats the movies', async (t) => {
  const requests = fakeFetch(t);
  const movies = await makeClient().getMovies([35, 18], [27]);

  const url = new URL(requests[0].url);
  assert.equal(url.origin + url.pathname, 'https://api.themoviedb.org/3/discover/movie');
  assert.equal(url.searchParams.get('with_genres'), '35|18'); // any of the liked genres
  assert.equal(url.searchParams.get('without_genres'), '27'); // none of the avoided ones
  assert.equal(url.searchParams.get('include_adult'), 'false');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer test-token');

  assert.equal(movies.length, 5);
  assert.deepEqual(movies[0], {
    id: 1, title: 'First', year: '2020', overview: 'One.', poster: 'https://image.tmdb.org/t/p/w342/one.jpg',
  });
  assert.equal(movies[1].year, '');
  assert.equal(movies[1].poster, null);
});

test('leaves out without_genres when nothing is avoided', async (t) => {
  const requests = fakeFetch(t);
  await makeClient().getMovies([35], []);
  assert.equal(new URL(requests[0].url).searchParams.has('without_genres'), false);
});

test('cache: the same request is answered from memory', async (t) => {
  const requests = fakeFetch(t);
  const client = makeClient();

  const first = await client.getMovies([35], []);
  const second = await client.getMovies([35], []);
  assert.equal(requests.length, 1);
  assert.deepEqual(second, first);

  await client.getMovies([18], []); // a different request still goes to TMDB
  assert.equal(requests.length, 2);
});

test('cache: expired entries are fetched again', async (t) => {
  const requests = fakeFetch(t);
  const client = makeClient();

  await client.getMovies([35], []);
  for (const entry of client.cache.values()) entry.expiresAt = Date.now() - 1; // pretend time passed
  await client.getMovies([35], []);
  assert.equal(requests.length, 2);
});

test('cache: when full, the oldest entry is dropped', async (t) => {
  const requests = fakeFetch(t);
  const client = makeClient({ cacheSize: 2 });

  await client.getMovies([35], []);
  await client.getMovies([18], []);
  await client.getMovies([28], []); // cache is full, so [35] is dropped
  assert.equal(client.cache.size, 2);

  await client.getMovies([18], []); // still cached
  assert.equal(requests.length, 3);
  await client.getMovies([35], []); // was dropped, so fetched again
  assert.equal(requests.length, 4);
});

test('a failed TMDB call throws and is not cached', async (t) => {
  fakeFetch(t, { ok: false, status: 401 });
  const client = makeClient();

  await assert.rejects(client.getMovies([35], []), /status 401/);
  assert.equal(client.cache.size, 0);
});
