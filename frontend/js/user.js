// Logic for user.html: show the email, find movies, log out.
import { getMe, getRecommendations, logoutUser } from './api.js';
import { messages } from './messages.js';

const emailSpan = document.getElementById('user-email');
const likesBox = document.getElementById('likes');
const avoidBox = document.getElementById('avoid');
const findButton = document.getElementById('find-button');
const statusText = document.getElementById('status');
const genresText = document.getElementById('genres');
const moviesDiv = document.getElementById('movies');

document.getElementById('attribution').textContent = messages.tmdbAttribution;

// Shows a message under the form. isError picks the color.
function showStatus(text, isError) {
  statusText.textContent = text;
  statusText.className = isError ? 'message error' : 'message';
}

// Builds one movie card. textContent is used so movie text can't inject HTML.
function makeMovieCard(movie) {
  const card = document.createElement('div');
  card.className = 'movie-card';

  if (movie.poster) {
    const image = document.createElement('img');
    image.src = movie.poster;
    image.alt = movie.title;
    card.appendChild(image);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'no-poster';
    placeholder.textContent = messages.noPoster;
    card.appendChild(placeholder);
  }

  const title = document.createElement('strong');
  title.textContent = `${movie.title} (${movie.year})`;
  card.appendChild(title);

  const overview = document.createElement('p');
  overview.textContent = movie.overview;
  card.appendChild(overview);

  return card;
}

// Shows the genres and movies from the server.
function showResults(data) {
  moviesDiv.textContent = ''; // clear old cards

  if (data.movies.length === 0) {
    showStatus(messages.noMovies, true);
    genresText.textContent = '';
    return;
  }

  genresText.textContent = messages.genresLabel + data.genres.join(', ');
  for (const movie of data.movies) {
    moviesDiv.appendChild(makeMovieCard(movie));
  }
}

// When the page opens, check who is logged in.
async function loadUser() {
  try {
    const result = await getMe();
    if (result.status !== 200) {
      alert(messages.notLoggedIn);
      window.location.href = 'index.html';
      return;
    }
    emailSpan.textContent = result.data.email;
  } catch (err) {
    showStatus(messages.networkError, true);
  }
}

findButton.addEventListener('click', async () => {
  const likes = likesBox.value.trim();
  if (likes === '') {
    showStatus(messages.needLikes, true);
    return;
  }

  findButton.disabled = true;
  showStatus(messages.loading, false);
  try {
    const result = await getRecommendations(likes, avoidBox.value.trim());
    if (result.status === 200) {
      showStatus('', false);
      showResults(result.data);
    } else {
      showStatus(result.data.error, true);
    }
  } catch (err) {
    showStatus(messages.networkError, true);
  }
  findButton.disabled = false;
});

document.getElementById('logout-button').addEventListener('click', async () => {
  try {
    await logoutUser();
  } catch (err) {
    // Even if this fails, send the user back to the login page.
  }
  window.location.href = 'index.html';
});

loadUser();
