// Gets movies from the TMDB API.
const DISCOVER_URL = 'https://api.themoviedb.org/3/discover/movie';
const POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w342';

export class TmdbClient {
  constructor(token, timeoutMs, movieCount, cacheMs, cacheSize) {
    this.token = token;
    this.timeoutMs = timeoutMs;
    this.movieCount = movieCount;
    this.cacheMs = cacheMs;
    this.cacheSize = cacheSize;

    // Small in-memory cache: request URL -> { movies, expiresAt }.
    // There are only so many genre combinations, so the same request often comes back.
    // Reusing the answer is faster and saves a call to TMDB.
    this.cache = new Map();
  }

  // likedIds: match ANY of these genres. avoidIds: match NONE of these.
  async getMovies(likedIds, avoidIds) {
    const url = this.#buildUrl(likedIds, avoidIds);

    const cached = this.cache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.movies;
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.token}` },
      signal: AbortSignal.timeout(this.timeoutMs), // gives up after 5 seconds
    });
    if (!response.ok) {
      throw new Error(`TMDB responded with status ${response.status}`);
    }

    const data = await response.json();
    const movies = data.results.slice(0, this.movieCount).map((movie) => this.#formatMovie(movie));
    this.#remember(url, movies);
    return movies;
  }

  // Methods starting with # are private: only this class can call them.

  #buildUrl(likedIds, avoidIds) {
    const params = new URLSearchParams({
      with_genres: likedIds.join('|'),
      include_adult: 'false',
      sort_by: 'popularity.desc',
      'vote_count.gte': '50',
    });
    if (avoidIds.length > 0) {
      params.set('without_genres', avoidIds.join(','));
    }
    return `${DISCOVER_URL}?${params}`;
  }

  // Turns one TMDB movie into the small object we send to the client.
  #formatMovie(movie) {
    return {
      id: movie.id,
      title: movie.title,
      year: movie.release_date ? movie.release_date.slice(0, 4) : '',
      overview: movie.overview,
      poster: movie.poster_path ? POSTER_BASE_URL + movie.poster_path : null,
    };
  }

  // Saves an answer in the cache. When the cache is full, the oldest entry is removed
  // (a Map keeps keys in the order they were added, so the first key is the oldest).
  #remember(url, movies) {
    this.cache.delete(url);
    if (this.cache.size >= this.cacheSize) {
      this.cache.delete(this.cache.keys().next().value);
    }
    this.cache.set(url, { movies, expiresAt: Date.now() + this.cacheMs });
  }
}
