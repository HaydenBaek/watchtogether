// Logic for user.html: show the email, find movies, log out.
import { Page } from './page.js';
import { messages } from './messages.js';

class UserPage extends Page {
  constructor() {
    super();
    this.emailSpan = document.getElementById('user-email');
    this.apiCallsSpan = document.getElementById('api-calls');
    this.likesBox = document.getElementById('likes');
    this.avoidBox = document.getElementById('avoid');
    this.findButton = document.getElementById('find-button');
    this.statusText = document.getElementById('status');
    this.genresText = document.getElementById('genres');
    this.moviesDiv = document.getElementById('movies');
  }

  init() {
    document.getElementById('attribution').textContent = messages.tmdbAttribution;
    this.findButton.addEventListener('click', () => this.findMovies());
    this.setUpLogoutButton();
    this.loadUser();
  }

  // Shows a message under the form. isError picks the color.
  showStatus(text, isError) {
    this.showMessage(this.statusText, text, isError ? 'error' : '');
  }

  // When the page opens, check who is logged in.
  async loadUser() {
    try {
      const result = await this.api.getMe();
      if (result.status !== 200) {
        alert(messages.notLoggedIn);
        this.goTo('index.html');
        return;
      }
      this.emailSpan.textContent = result.data.email;
      this.apiCallsSpan.textContent = messages.apiCallsLabel + result.data.apiCalls;
    } catch (err) {
      this.showStatus(messages.networkError, true);
    }
  }

  async findMovies() {
    const likes = this.likesBox.value.trim();
    if (likes === '') {
      this.showStatus(messages.needLikes, true);
      return;
    }

    this.findButton.disabled = true;
    this.showStatus(messages.loading, false);
    try {
      const result = await this.api.getRecommendations(likes, this.avoidBox.value.trim());
      if (result.status === 200) {
        this.showStatus('', false);
        this.showResults(result.data);
      } else {
        this.showStatus(result.data.error, true);
      }
    } catch (err) {
      this.showStatus(messages.networkError, true);
    }
    this.findButton.disabled = false;
  }

  // Shows the genres and movies from the server.
  showResults(data) {
    this.moviesDiv.textContent = ''; // clear old cards

    if (data.movies.length === 0) {
      this.showStatus(messages.noMovies, true);
      this.genresText.textContent = '';
      return;
    }

    this.genresText.textContent = messages.genresLabel + data.genres.join(', ');
    for (const movie of data.movies) {
      this.moviesDiv.appendChild(this.makeMovieCard(movie));
    }
  }

  // Builds one movie card. textContent is used so movie text can't inject HTML.
  makeMovieCard(movie) {
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
}

new UserPage().init();
