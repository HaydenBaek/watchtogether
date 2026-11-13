// Gets movies from the TMDB API.
import { config } from '../config.js';

const DISCOVER_URL = 'https://api.themoviedb.org/3/discover/movie';
const POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w342';

// Turns one TMDB movie into the small object we send to the client.
function formatMovie(movie) {
  return {
    id: movie.id,
    title: movie.title,
    year: movie.release_date ? movie.release_date.slice(0, 4) : '',
    overview: movie.overview,
    poster: movie.poster_path ? POSTER_BASE_URL + movie.poster_path : null,
  };
}

// likedIds: match ANY of these genres. avoidIds: match NONE of these.
export async function getMovies(likedIds, avoidIds) {
  const params = new URLSearchParams({
    with_genres: likedIds.join('|'),
    include_adult: 'false',
    sort_by: 'popularity.desc',
    'vote_count.gte': '50',
  });
  if (avoidIds.length > 0) {
    params.set('without_genres', avoidIds.join(','));
  }

  const response = await fetch(`${DISCOVER_URL}?${params}`, {
    headers: { Authorization: `Bearer ${config.tmdbToken}` },
    signal: AbortSignal.timeout(config.tmdbTimeoutMs), // gives up after 5 seconds
  });
  if (!response.ok) {
    throw new Error(`TMDB responded with status ${response.status}`);
  }

  const data = await response.json();
  return data.results.slice(0, config.movieCount).map(formatMovie);
}
